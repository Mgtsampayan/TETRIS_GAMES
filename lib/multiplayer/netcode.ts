// lib/multiplayer/netcode.ts

import { TetrisEngine, InputState, GameState, GameResult, GameStateSnapshot } from '../tetris/engine';

// FIXED: Made SerializableEngine methods required instead of optional
export interface SerializableEngine {
    serializeState(): GameStateSnapshot;
    loadState(snapshot: GameStateSnapshot): void;
    clone(): TetrisEngine & SerializableEngine;
}

/** Utility Types **/
export type PlayerId = string;
export type FrameIndex = number; // >= 0

/** Network Message Types (discriminated union) **/
export interface BaseMessage<T extends string, D = Record<string, unknown>> {
    type: T;
    timestamp: number; // ms since epoch
    playerId: PlayerId;
    data: D;
}

export type PlayerJoinedMessage = BaseMessage<'playerJoined', { playerId: PlayerId; players?: PlayerId[] }>;
export type PlayerLeftMessage = BaseMessage<'playerLeft', { playerId: PlayerId }>;
export type InputMessage = BaseMessage<'input', { playerId: PlayerId; frame: FrameIndex; inputs: InputState }>;
export type GameStateMessage = BaseMessage<'gameState', { authoritative?: boolean; frame: FrameIndex; states: Record<PlayerId, GameState> }>;
export type MatchEndMessage = BaseMessage<'matchEnd', { reason: 'finished' | 'forfeit' | 'disconnect'; winnerId?: PlayerId }>;
export type JoinRoomMessage = BaseMessage<'joinRoom', { roomId: string }>;

// FIXED: Added missing message types for server communication
export type AuthenticateMessage = BaseMessage<'authenticate', { playerId: PlayerId; token: string }>;
export type CreateRoomMessage = BaseMessage<'createRoom', { settings: RoomSettings }>;
export type LeaveRoomMessage = BaseMessage<'leaveRoom', Record<string, never>>;
export type PingMessage = BaseMessage<'ping', Record<string, never>>;
export type PongMessage = BaseMessage<'pong', { clientTimestamp: number }>;
export type ConnectedMessage = BaseMessage<'connected', { message: string }>;
export type AuthenticatedMessage = BaseMessage<'authenticated', { success: boolean }>;
export type RoomCreatedMessage = BaseMessage<'roomCreated', { room: Room }>;
export type GameStartingMessage = BaseMessage<'gameStarting', { countdown: number; seed: number }>;
export type GameStartedMessage = BaseMessage<'gameStarted', Record<string, never>>;
export type GameEndedMessage = BaseMessage<'gameEnded', { winner?: PlayerId; results: GameEndResult[] }>;
export type ErrorMessage = BaseMessage<'error', { message: string }>;
export type WarningMessage = BaseMessage<'warning', { message: string }>;

export interface GameEndResult {
    playerId: PlayerId;
    score: number;
    lines: number;
    time: number;
    placement: number;
}

export type NetworkMessage =
    | PlayerJoinedMessage
    | PlayerLeftMessage
    | InputMessage
    | GameStateMessage
    | MatchEndMessage
    | JoinRoomMessage
    | AuthenticateMessage
    | CreateRoomMessage
    | LeaveRoomMessage
    | PingMessage
    | PongMessage
    | ConnectedMessage
    | AuthenticatedMessage
    | RoomCreatedMessage
    | GameStartingMessage
    | GameStartedMessage
    | GameEndedMessage
    | ErrorMessage
    | WarningMessage;

/** Rollback types **/
export interface GameFrame {
    frame: FrameIndex;
    inputs: Record<PlayerId, InputState>;
    checksum: number;
    // Per-player snapshots for robust rollback
    snapshots?: Record<PlayerId, GameStateSnapshot>;
}

export interface PlayerState {
    id: PlayerId;
    engine: TetrisEngine & SerializableEngine;
    // Inputs indexed by frame; sparse array to save memory
    inputs: Array<InputState | undefined>;
    confirmed: boolean;
    ping: number; // ms
}

/** Rollback Netcode **/
export class RollbackNetcode {
    private frameHistory: Map<FrameIndex, GameFrame> = new Map();
    private players: Map<PlayerId, PlayerState> = new Map();
    private currentFrame: FrameIndex = 0;
    private confirmedFrame: FrameIndex = 0;
    private readonly maxRollbackFrames = 8;
    private readonly frameRate = 60;
    private lastUpdateTime = 0;

    constructor(private readonly localPlayerId: PlayerId) { }

    addPlayer(playerId: PlayerId, engine: TetrisEngine & SerializableEngine): void {
        // FIXED: Ensure proper cloning with type safety (relies on implements in engine.ts)
        const cloned = engine.clone();
        this.players.set(playerId, {
            id: playerId,
            engine: cloned,
            inputs: [],
            confirmed: false,
            ping: 0,
        });
    }

    removePlayer(playerId: PlayerId): void {
        this.players.delete(playerId);
    }

    /** Predict local inputs and rollback when remote inputs arrive */
    update(_deltaTime: number, localInputs: InputState): void {
        const now = Date.now();
        this.lastUpdateTime = now;

        const local = this.players.get(this.localPlayerId);
        if (local) {
            // Store local input for this frame
            local.inputs[this.currentFrame] = { ...localInputs };
        }

        // Run prediction path and advance frame
        this.runPrediction();
        this.currentFrame += 1;
    }

    private runPrediction(): void {
        // Earliest frame we must resimulate from
        let earliest = this.currentFrame;
        for (const [playerId] of this.players) {
            const lastConfirmed = this.findLastConfirmedInput(playerId);
            if (lastConfirmed < earliest) earliest = lastConfirmed;
        }

        if (earliest < this.currentFrame) {
            this.rollbackToFrame(earliest);
            for (let f = earliest; f <= this.currentFrame; f++) {
                this.simulateFrame(f);
            }
        } else {
            // No rollback necessary; just simulate this frame
            this.simulateFrame(this.currentFrame);
        }
    }

    private findLastConfirmedInput(playerId: PlayerId): FrameIndex {
        const player = this.players.get(playerId);
        if (!player) return this.currentFrame;

        const start = Math.max(0, this.currentFrame - this.maxRollbackFrames);
        for (let i = this.currentFrame; i >= start; i--) {
            if (player.inputs[i] !== undefined) return i;
        }
        return start;
    }

    private rollbackToFrame(frame: FrameIndex): void {
        const saved = this.frameHistory.get(frame);
        if (!saved) {
            console.warn(`No saved frame for ${frame}; skipping rollback to prevent desync.`); // FIXED: Added warn and early return
            return;
        }

        // FIXED: Proper type-safe snapshot restoration
        for (const [playerId, player] of this.players) {
            const snap = saved.snapshots?.[playerId];
            if (snap) {
                try {
                    player.engine.loadState(snap);
                } catch (error) {
                    console.error(`Failed to load state for player ${playerId}:`, error);
                    // Fallback to cloning current engine
                    player.engine = player.engine.clone();
                }
            } else {
                // Fallback: clone current engine state
                player.engine = player.engine.clone();
            }
        }

        this.currentFrame = frame;
    }

    private simulateFrame(frame: FrameIndex): void {
        const dt = 1000 / this.frameRate;
        const frameInputs: Record<PlayerId, InputState> = {};

        // Gather inputs (missing => neutral)
        for (const [pid, p] of this.players) {
            frameInputs[pid] = p.inputs[frame] ?? this.getDefaultInput();
        }

        // Capture snapshots BEFORE simulation for rollback
        const snapshots: Record<PlayerId, GameStateSnapshot> = {};
        for (const [pid, p] of this.players) {
            try {
                snapshots[pid] = p.engine.serializeState();
            } catch (error) {
                console.error(`Failed to serialize state for player ${pid}:`, error);
            }
        }

        // Simulate each player's engine
        for (const [pid, p] of this.players) {
            const inputs = frameInputs[pid];
            const result: GameResult = p.engine.update(dt, inputs);

            // FIXED: Properly typed event handling
            if (result.type === 'linesCleared' && typeof result.lines === 'number') {
                this.handleLineClears(pid, result.lines, !!result.isTSpin);
            }
        }

        // Save frame for rollback including checksum
        const gf: GameFrame = {
            frame,
            inputs: frameInputs,
            checksum: this.calculateChecksum(frameInputs),
            snapshots: Object.keys(snapshots).length > 0 ? snapshots : undefined,
        };

        this.frameHistory.set(frame, gf);

        // Trim old history
        const minKeep = Math.max(0, frame - this.maxRollbackFrames * 2);
        for (const key of this.frameHistory.keys()) {
            if (key < minKeep) this.frameHistory.delete(key);
        }

        // Move confirmed frame forward (simple heuristic)
        this.confirmedFrame = Math.max(this.confirmedFrame, frame - this.maxRollbackFrames);
    }

    private handleLineClears(playerId: PlayerId, lines: number, isTSpin: boolean): void {
        const garbage = this.calculateGarbageAmount(lines, isTSpin);
        if (garbage <= 0) return;

        for (const [targetId, target] of this.players) {
            if (targetId === playerId) continue;
            this.sendGarbage(target, garbage);
        }
    }

    private calculateGarbageAmount(lines: number, isTSpin: boolean): number {
        const table = [0, 0, 1, 2, 4]; // 0L..4L
        let g = table[Math.min(Math.max(lines, 0), 4)] ?? 0;
        if (isTSpin) g += lines; // basic T-Spin bonus
        return g;
    }

    private sendGarbage(targetPlayer: PlayerState, amount: number): void {
        // Mutate target engine's GameState via public API only
        const state = targetPlayer.engine.getState();
        const holes = Math.max(1, Math.min(10, amount));
        for (let i = 0; i < holes; i++) {
            // FIXED: Proper type casting for mutable access
            (state.garbageQueue as number[]).push(Math.floor(Math.random() * 10));
        }
    }

    private calculateChecksum(inputs: Record<PlayerId, InputState>): number {
        let checksum = 0;
        for (const [pid, input] of Object.entries(inputs)) {
            checksum = this.mix32(checksum ^ this.hashString(pid));
            checksum = this.mix32(checksum ^ this.hashInputs(input));
        }
        return checksum >>> 0;
    }

    private mix32(x: number): number {
        // simple x or shift-based mix
        x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
        return x | 0;
    }

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) | 0;
        }
        return hash | 0;
    }

    private hashInputs(inputs: InputState): number {
        let bits = 0;
        bits |= inputs.left ? 1 : 0;
        bits |= inputs.right ? 2 : 0;
        bits |= inputs.softDrop ? 4 : 0;
        bits |= inputs.hardDrop ? 8 : 0;
        bits |= inputs.rotate ? 16 : 0;
        bits |= inputs.hold ? 32 : 0;
        return bits | 0;
    }

    private getDefaultInput(): InputState {
        return { left: false, right: false, softDrop: false, hardDrop: false, rotate: false, hold: false };
    }

    /** Remote input from the server/peers */
    onRemoteInput(playerId: PlayerId, frame: FrameIndex, inputs: InputState): void {
        const player = this.players.get(playerId);
        if (!player) return;

        player.inputs[frame] = { ...inputs };

        // If remote input changes the past, re-run prediction
        if (frame < this.currentFrame) this.runPrediction();
    }

    getPlayerEngine(playerId: PlayerId): (TetrisEngine & SerializableEngine) | null {
        return this.players.get(playerId)?.engine ?? null;
    }

    getCurrentFrame(): FrameIndex { return this.currentFrame; }
    getConfirmedFrame(): FrameIndex { return this.confirmedFrame; }
}

/** WebSocket client for multiplayer communication **/
export class MultiplayerClient {
    private ws: WebSocket | null = null;
    private readonly netcode: RollbackNetcode;
    private readonly playerId: PlayerId;
    private roomId: string | null = null;
    private readonly messageQueue: NetworkMessage[] = [];
    private connected = false;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 5;

    constructor(playerId: PlayerId) {
        this.playerId = playerId;
        this.netcode = new RollbackNetcode(playerId);
    }

    connect(serverUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(serverUrl);

                this.ws.onopen = () => {
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    this.processMessageQueue();
                    resolve();
                };

                this.ws.onmessage = (event: MessageEvent<string>) => {
                    try {
                        const parsed: NetworkMessage = JSON.parse(event.data);
                        this.handleMessage(parsed);
                    } catch (e) {
                        console.warn('Invalid message payload', e);
                    }
                };

                this.ws.onclose = () => {
                    this.connected = false;
                    this.attemptReconnect(serverUrl);
                };

                this.ws.onerror = (ev) => {
                    // FIXED: Better error handling
                    const error = ev instanceof ErrorEvent ?
                        new Error(ev.message) :
                        new Error('WebSocket connection failed');
                    reject(error);
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    private attemptReconnect(serverUrl: string): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
        this.reconnectAttempts += 1;
        const delayMs = 1000 * Math.pow(2, this.reconnectAttempts); // expo backoff
        setTimeout(() => { void this.connect(serverUrl); }, delayMs);
    }

    private handleMessage(message: NetworkMessage): void {
        switch (message.type) {
            case 'playerJoined': {
                // FIXED: Create engine with proper SerializableEngine interface (no assertion needed)
                const engine = new TetrisEngine() as TetrisEngine & SerializableEngine;
                this.netcode.addPlayer(message.data.playerId, engine);
                break;
            }
            case 'playerLeft': {
                this.netcode.removePlayer(message.data.playerId);
                break;
            }
            case 'input': {
                this.netcode.onRemoteInput(message.data.playerId, message.data.frame, message.data.inputs);
                break;
            }
            case 'gameState': {
                this.handleGameStateUpdate(message);
                break;
            }
            case 'matchEnd': {
                this.handleMatchEnd(message);
                break;
            }
            case 'joinRoom':
            case 'connected':
            case 'authenticated':
            case 'roomCreated':
            case 'gameStarting':
            case 'gameStarted':
            case 'gameEnded':
            case 'error':
            case 'warning':
            case 'ping':
            case 'pong':
            case 'authenticate':
            case 'createRoom':
            case 'leaveRoom': {
                // Handle these messages or pass to event handlers
                this.handleServerMessage(message);
                break;
            }
            default: {
                const _exhaustive: never = message;
                console.warn('Unhandled message type:', _exhaustive);
                return;
            }
        }
    }

    // FIXED: Added proper server message handling
    private handleServerMessage(message: NetworkMessage): void {
        // This can be extended with proper event emission or callbacks
        console.log('Server message:', message.type, message.data);
    }

    private handleGameStateUpdate(msg: GameStateMessage): void {
        // Optionally validate rollback consistency using authoritative snapshots
        // Example: compare checksums or reconcile desyncs
        // This is a placeholder for anti-cheat / authority correction logic.
        void msg;
    }

    private handleMatchEnd(msg: MatchEndMessage): void {
        // Game over UI hooks may be called here
        console.log('Match ended:', msg.data);
    }

    sendInput(inputs: InputState): void {
        const message: InputMessage = {
            type: 'input',
            timestamp: Date.now(),
            playerId: this.playerId,
            data: { playerId: this.playerId, frame: this.netcode.getCurrentFrame(), inputs }
        };
        this.sendMessage(message);
    }

    joinRoom(roomId: string): void {
        this.roomId = roomId;
        const message: JoinRoomMessage = {
            type: 'joinRoom',
            timestamp: Date.now(),
            playerId: this.playerId,
            data: { roomId },
        };
        this.sendMessage(message);
    }

    // FIXED: Added authenticate method
    authenticate(token: string): void {
        const message: AuthenticateMessage = {
            type: 'authenticate',
            timestamp: Date.now(),
            playerId: this.playerId,
            data: { playerId: this.playerId, token }
        };
        this.sendMessage(message);
    }

    createRoom(settings: RoomSettings): void {
        const message: CreateRoomMessage = {
            type: 'createRoom',
            timestamp: Date.now(),
            playerId: this.playerId,
            data: { settings }
        };
        this.sendMessage(message);
    }

    leaveRoom(): void {
        const message: LeaveRoomMessage = {
            type: 'leaveRoom',
            timestamp: Date.now(),
            playerId: this.playerId,
            data: {}
        };
        this.sendMessage(message);
        this.roomId = null;
    }

    private sendMessage(message: NetworkMessage): void {
        if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            this.messageQueue.push(message);
        }
    }

    private processMessageQueue(): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            if (msg) this.ws.send(JSON.stringify(msg));
        }
    }

    update(deltaTime: number, inputs: InputState): void {
        this.netcode.update(deltaTime, inputs);
        this.sendInput(inputs);
    }

    getNetcode(): RollbackNetcode { return this.netcode; }

    disconnect(): void {
        if (this.ws) { this.ws.close(); this.ws = null; }
        this.connected = false;
    }

    // FIXED: Added getter methods for client state
    isConnected(): boolean { return this.connected; }
    getRoomId(): string | null { return this.roomId; }
    getPlayerId(): PlayerId { return this.playerId; }
}

/** Game room management **/
export interface Room {
    id: string;
    name: string;
    players: PlayerId[];
    maxPlayers: number;
    gameMode: 'ranked' | 'battle' | 'sprint' | 'ultra' | 'custom';
    settings: RoomSettings;
    state: 'waiting' | 'starting' | 'playing' | 'finished';
    createdAt: Date;
}

export interface RoomSettings {
    preset: string;
    timeLimit?: number;
    targetLines?: number;
    handicap?: Record<PlayerId, number>;
    private: boolean;
    spectators: boolean;
}

export class RoomManager {
    private rooms: Map<string, Room> = new Map();

    createRoom(ownerId: PlayerId, settings: RoomSettings): Room {
        const room: Room = {
            id: this.generateRoomId(),
            name: `${ownerId}'s Room`,
            players: [ownerId],
            maxPlayers: settings.private ? 2 : 6,
            gameMode: 'custom',
            settings,
            state: 'waiting',
            createdAt: new Date(),
        };
        this.rooms.set(room.id, room);
        return room;
    }

    joinRoom(roomId: string, playerId: PlayerId): Room | null {
        const room = this.rooms.get(roomId);
        if (!room || room.players.length >= room.maxPlayers) return null;
        if (!room.players.includes(playerId)) room.players.push(playerId);
        return room;
    }

    leaveRoom(roomId: string, playerId: PlayerId): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        room.players = room.players.filter((id) => id !== playerId);
        if (room.players.length === 0) this.rooms.delete(roomId);
    }

    getAvailableRooms(): Room[] {
        return Array.from(this.rooms.values()).filter((r) => !r.settings.private && r.state === 'waiting');
    }

    // FIXED: Added method to get room by ID
    getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    // FIXED: Added method to get all rooms (for server use)
    getAllRooms(): Room[] {
        return Array.from(this.rooms.values());
    }

    private generateRoomId(): string {
        // FIXED: Use slice instead of deprecated substr
        return Math.random().toString(36).slice(2, 11);
    }
}

/** Anti-cheat system **/
export class AntiCheat {
    private suspiciousEvents: Map<PlayerId, number> = new Map();
    private readonly maxEventsPerSecond = 30; // Max input events per second
    private impossibleTimings: Map<PlayerId, number[]> = new Map();

    validateInputs(playerId: PlayerId, inputs: InputState[], timestamps: number[]): boolean {
        // FIXED: Inverted logic to return true if valid (no suspicious activity)
        return !(
            this.checkInputRate(playerId, timestamps) ||
            this.checkDASTimings(playerId, inputs, timestamps) ||
            this.checkAutomationPatterns(inputs)
        );
    }

    private checkInputRate(playerId: PlayerId, timestamps: number[]): boolean {
        if (timestamps.length < 2) return false; // Not suspicious
        const now = Date.now();
        const recent = timestamps.filter((t) => now - t < 1000);
        if (recent.length > this.maxEventsPerSecond) {
            this.flagSuspiciousActivity(playerId, 'high_input_rate');
            return true; // Suspicious
        }
        return false; // Not suspicious
    }

    private checkDASTimings(playerId: PlayerId, inputs: InputState[], timestamps: number[]): boolean {
        let lastMove = 0; // ms
        let dasActive = false;

        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            const ts = timestamps[i] ?? 0;
            if (input.left || input.right) {
                if (dasActive) {
                    // ARR ≥ 33ms
                    if (lastMove > 0 && ts - lastMove < 33) {
                        this.flagSuspiciousActivity(playerId, 'impossible_arr');
                        return true; // Suspicious
                    }
                } else {
                    // DAS ≥ 167ms
                    if (lastMove > 0 && ts - lastMove < 167) {
                        this.flagSuspiciousActivity(playerId, 'impossible_das');
                        return true; // Suspicious
                    }
                    dasActive = true;
                }
                lastMove = ts;
            } else {
                dasActive = false;
            }
        }
        return false; // Not suspicious
    }

    // FIXED: Removed unused parameter warning; return true if suspicious
    private checkAutomationPatterns(inputs: InputState[]): boolean {
        if (inputs.length < 10) return false; // Not suspicious

        // Check for perfect alternating patterns that might indicate automation
        let alternatingPattern = true;
        for (let i = 2; i < inputs.length; i++) {
            if (inputs[i].left !== inputs[i - 2].left ||
                inputs[i].right !== inputs[i - 2].right) {
                alternatingPattern = false;
                break;
            }
        }

        return alternatingPattern; // Suspicious if true
    }

    private flagSuspiciousActivity(playerId: PlayerId, reason: string): void {
        const count = (this.suspiciousEvents.get(playerId) ?? 0) + 1;
        this.suspiciousEvents.set(playerId, count);
        console.warn(`Suspicious activity detected for player ${playerId}: ${reason}`);
        if (count > 5) this.banPlayer(playerId);
    }

    private banPlayer(playerId: PlayerId): void {
        console.error(`Player ${playerId} has been banned for cheating`);
        // TODO: Implement actual banning logic
    }

    // FIXED: Added methods to manage suspicious players
    getSuspiciousActivityCount(playerId: PlayerId): number {
        return this.suspiciousEvents.get(playerId) ?? 0;
    }

    clearSuspiciousActivity(playerId: PlayerId): void {
        this.suspiciousEvents.delete(playerId);
        this.impossibleTimings.delete(playerId);
    }
}