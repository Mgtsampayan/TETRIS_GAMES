// server/websocket-server.ts

import { WebSocket, WebSocketServer } from 'ws';
import { Room, RoomManager, RoomSettings, NetworkMessage, InputMessage } from '../lib/multiplayer/netcode';  // FIXED: Typed imports
import { TetrisEngine, GameState } from '../lib/tetris/engine';

interface ClientConnection {
    ws: WebSocket;
    playerId: string;
    roomId?: string;
    lastPing: number;
    authenticated: boolean;
}

interface GameLoopState {
    engines: Map<string, TetrisEngine>;
    startTime: number;
    frameCount: number;
    inputQueue: Map<string, InputMessage[]>;  // FIXED: Added queue for inputs per player
}

export class GameServer {
    private wss: WebSocketServer;
    private clients: Map<string, ClientConnection> = new Map();
    private roomManager: RoomManager;
    private gameLoops: Map<string, NodeJS.Timeout> = new Map();
    private gameStates: Map<string, GameLoopState> = new Map();  // FIXED: Added missing property for gameStates

    constructor(port: number = 8080) {
        this.wss = new WebSocketServer({ port });
        this.roomManager = new RoomManager();
        this.setupWebSocketHandlers();

        // Start server heartbeat
        setInterval(() => this.heartbeat(), 30000); // 30 second ping

        console.log(`Game server started on port ${port}`);
    }

    private setupWebSocketHandlers(): void {
        this.wss.on('connection', (ws: WebSocket) => {
            console.log('New client connected');

            ws.on('message', (data: Buffer) => {
                try {
                    const message: NetworkMessage = JSON.parse(data.toString());
                    this.handleMessage(ws, message);
                } catch (error) {
                    console.error('Invalid message format:', error);
                    ws.close(1002, 'Invalid message format');
                }
            });

            ws.on('close', () => {
                this.handleDisconnect(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });

            // Send connection acknowledgment
            this.sendToClient(ws, {
                type: 'connected',
                timestamp: Date.now(),
                playerId: 'server',
                data: { message: 'Connected to game server' }
            });
        });
    }

    private handleMessage(ws: WebSocket, message: NetworkMessage): void {
        const client = this.findClientByWebSocket(ws);

        switch (message.type) {
            case 'authenticate':
                this.handleAuthentication(ws, message);
                break;

            case 'joinRoom':
                if (client?.authenticated && 'roomId' in message.data) {
                    this.handleJoinRoom(client, message.data.roomId);
                }
                break;

            case 'createRoom':
                if (client?.authenticated && 'settings' in message.data) {
                    this.handleCreateRoom(client, message.data.settings);
                }
                break;

            case 'leaveRoom':
                if (client?.authenticated) {
                    this.handleLeaveRoom(client);
                }
                break;

            case 'input':
                if (client?.authenticated && 'playerId' in message.data && 'frame' in message.data && 'inputs' in message.data) {  // FIXED: Added validation
                    this.handleGameInput(client, message as InputMessage);  // FIXED: Typed as InputMessage
                }
                break;

            case 'ping':
                this.handlePing(client, message);
                break;

            default:
                console.warn('Unknown message type:', (message).type);
        }
    }

    private handleAuthentication(ws: WebSocket, message: NetworkMessage): void {
        if (!('playerId' in message.data) || !('token' in message.data)) {
            ws.close(1008, 'Invalid authentication data');
            return;
        }

        const { playerId, token } = message.data as { playerId: string; token: string };

        // In a real implementation, validate the auth token
        const isValid = this.validateAuthToken(playerId, token);

        if (isValid) {
            const client: ClientConnection = {
                ws,
                playerId,
                lastPing: Date.now(),
                authenticated: true
            };

            this.clients.set(playerId, client);

            this.sendToClient(ws, {
                type: 'authenticated',
                timestamp: Date.now(),
                playerId: 'server',
                data: { success: true }
            });
        } else {
            ws.close(1008, 'Authentication failed');
        }
    }

    private validateAuthToken(playerId: string, token: string): boolean {
        // Mock authentication - in reality, validate JWT or similar (FIXED: Note for security)
        return token === 'valid_token_' + playerId;  // TODO: Replace with secure validation (e.g., JWT verify)
    }

    private handleJoinRoom(client: ClientConnection, roomId: string): void {
        const room = this.roomManager.joinRoom(roomId, client.playerId);

        if (room) {
            client.roomId = roomId;

            // Notify all players in room
            this.broadcastToRoom(roomId, {
                type: 'playerJoined',
                timestamp: Date.now(),
                playerId: 'server',
                data: {
                    playerId: client.playerId,
                    players: room.players
                }
            });

            // Start game if room is full
            if (room.players.length >= 2 && room.state === 'waiting') {
                this.startGame(room);
            }
        } else {
            this.sendToClient(client.ws, {
                type: 'error',
                timestamp: Date.now(),
                playerId: 'server',
                data: { message: 'Failed to join room' }
            });
        }
    }

    private handleCreateRoom(client: ClientConnection, settings: RoomSettings): void {  // FIXED: Typed settings
        const room = this.roomManager.createRoom(client.playerId, settings);
        client.roomId = room.id;

        this.sendToClient(client.ws, {
            type: 'roomCreated',
            timestamp: Date.now(),
            playerId: 'server',
            data: { room }
        });
    }

    private handleLeaveRoom(client: ClientConnection): void {
        if (client.roomId) {
            this.roomManager.leaveRoom(client.roomId, client.playerId);

            this.broadcastToRoom(client.roomId, {
                type: 'playerLeft',
                timestamp: Date.now(),
                playerId: 'server',
                data: { playerId: client.playerId }
            });

            client.roomId = undefined;
        }
    }

    private handleGameInput(client: ClientConnection, inputMessage: InputMessage): void {  // FIXED: Typed inputData, queue inputs
        if (!client.roomId) return;

        // Queue input for server simulation
        const gameLoopState = this.gameStates.get(client.roomId);  // FIXED: Use this.gameStates
        if (gameLoopState) {
            const queue = gameLoopState.inputQueue.get(client.playerId) || [];
            queue.push(inputMessage);
            gameLoopState.inputQueue.set(client.playerId, queue);
        }

        // Broadcast input to all other players in room
        this.broadcastToRoom(client.roomId, inputMessage, client.playerId);
    }

    private handlePing(client: ClientConnection | undefined, message: NetworkMessage): void {
        if (!client) return;

        client.lastPing = Date.now();

        this.sendToClient(client.ws, {
            type: 'pong',
            timestamp: Date.now(),
            playerId: 'server',
            data: { clientTimestamp: message.timestamp }
        });
    }

    private startGame(room: Room): void {
        room.state = 'starting';

        // Initialize game engines for each player
        const gameState: GameLoopState = {
            engines: new Map<string, TetrisEngine>(),
            startTime: Date.now(),
            frameCount: 0,
            inputQueue: new Map<string, InputMessage[]>()
        };

        for (const playerId of room.players) {
            gameState.engines.set(playerId, new TetrisEngine(room.settings.preset || 'guideline'));
            gameState.inputQueue.set(playerId, []);
        }

        this.gameStates.set(room.id, gameState);  // FIXED: Store in this.gameStates

        // Get seed from one of the engines
        const firstEngine = Array.from(gameState.engines.values())[0];
        const seed = firstEngine?.getState().seed;

        // Notify players game is starting
        this.broadcastToRoom(room.id, {
            type: 'gameStarting',
            timestamp: Date.now(),
            playerId: 'server',
            data: {
                countdown: 3,
                seed: seed
            }
        });

        // Start countdown
        setTimeout(() => {
            room.state = 'playing';
            this.broadcastToRoom(room.id, {
                type: 'gameStarted',
                timestamp: Date.now(),
                playerId: 'server',
                data: {}
            });

            // Start game loop
            this.startGameLoop(room, gameState);
        }, 3000);
    }

    private startGameLoop(room: Room, gameState: GameLoopState): void {
        const gameLoop = setInterval(() => {
            // FIXED: Process queued inputs and simulate engines (makes anti-cheat effective)
            for (const [playerId, engine] of gameState.engines) {
                const queue = gameState.inputQueue.get(playerId) || [];
                while (queue.length > 0) {
                    const inputMsg = queue.shift();
                    if (inputMsg) {
                        const dt = 16.67;  // Fixed dt for 60 FPS
                        engine.update(dt, inputMsg.data.inputs);
                    }
                }
            }

            // Server-side validation and anti-cheat
            this.validateGameState(room, gameState);

            // Broadcast authoritative state every 10 frames
            if (gameState.frameCount % 10 === 0) {
                const states: Record<string, GameState> = {};
                for (const [playerId, engine] of gameState.engines) {
                    states[playerId] = engine.getState();
                }
                this.broadcastToRoom(room.id, {
                    type: 'gameState',
                    timestamp: Date.now(),
                    playerId: 'server',
                    data: { authoritative: true, frame: gameState.frameCount, states }
                });
            }

            gameState.frameCount++;

            // Check for game end conditions
            const alivePlayers = room.players.filter(playerId => {
                const engine = gameState.engines.get(playerId);
                return engine && !engine.getState().gameOver;
            });

            if (alivePlayers.length <= 1) {
                this.endGame(room, gameState, alivePlayers[0]);
                clearInterval(gameLoop);
                this.gameStates.delete(room.id);  // FIXED: Clean up state
            }
        }, 16.67); // 60 FPS

        this.gameLoops.set(room.id, gameLoop);
    }

    private validateGameState(room: Room, gameState: GameLoopState): void {
        // Perform server-side validation to prevent cheating
        for (const playerId of room.players) {
            const engine = gameState.engines.get(playerId);
            if (!engine) continue;

            const state = engine.getState();

            // Validate score progression
            if (state.score < 0 || state.lines < 0) {
                this.flagSuspiciousActivity(playerId, 'invalid_stats');
            }

            // Check for impossible PPS (pieces per second)
            const gameTime = (Date.now() - gameState.startTime) / 1000;
            const maxPossiblePieces = gameTime * 15; // 15 PPS is extremely high

            if (state.lines > maxPossiblePieces) {
                this.flagSuspiciousActivity(playerId, 'impossible_speed');
            }
        }
    }

    private flagSuspiciousActivity(playerId: string, reason: string): void {
        console.warn(`Suspicious activity: ${playerId} - ${reason}`);

        const client = this.clients.get(playerId);
        if (client) {
            this.sendToClient(client.ws, {
                type: 'warning',
                timestamp: Date.now(),
                playerId: 'server',
                data: { message: 'Suspicious activity detected' }
            });
        }
    }

    private endGame(room: Room, gameState: GameLoopState, winnerId?: string): void {
        room.state = 'finished';

        const results = room.players.map(playerId => {
            const engine = gameState.engines.get(playerId);
            const state = engine?.getState();

            return {
                playerId,
                score: state?.score || 0,
                lines: state?.lines || 0,
                time: Date.now() - gameState.startTime,
                placement: playerId === winnerId ? 1 : 2
            };
        });

        this.broadcastToRoom(room.id, {
            type: 'gameEnded',
            timestamp: Date.now(),
            playerId: 'server',
            data: {
                winner: winnerId,
                results
            }
        });

        // Clean up
        const gameLoop = this.gameLoops.get(room.id);
        if (gameLoop) {
            clearInterval(gameLoop);
            this.gameLoops.delete(room.id);
        }
    }

    private findClientByWebSocket(ws: WebSocket): ClientConnection | undefined {
        for (const client of this.clients.values()) {
            if (client.ws === ws) return client;
        }
        return undefined;
    }

    private broadcastToRoom(roomId: string, message: NetworkMessage, excludePlayerId?: string): void {
        const room = this.roomManager.getRoom(roomId);  // FIXED: Use public getter (no private access)
        if (!room) return;

        for (const playerId of room.players) {
            if (playerId === excludePlayerId) continue;

            const client = this.clients.get(playerId);
            if (client) {
                this.sendToClient(client.ws, message);
            }
        }
    }

    private sendToClient(ws: WebSocket, message: NetworkMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    private handleDisconnect(ws: WebSocket): void {
        const client = this.findClientByWebSocket(ws);
        if (!client) return;

        console.log(`Client disconnected: ${client.playerId}`);

        if (client.roomId) {
            this.handleLeaveRoom(client);
        }

        this.clients.delete(client.playerId);
    }

    private heartbeat(): void {
        const now = Date.now();

        for (const [playerId, client] of this.clients) {
            if (now - client.lastPing > 60000) { // 1 minute timeout
                console.log(`Client timeout: ${playerId}`);
                client.ws.close(1000, 'Timeout');
                this.clients.delete(playerId);
            } else {
                // Send ping
                this.sendToClient(client.ws, {
                    type: 'ping',
                    timestamp: now,
                    playerId: 'server',
                    data: {}
                });
            }
        }
    }
}

// Start server if this file is run directly
if (require.main === module) {
    new GameServer(process.env.PORT ? parseInt(process.env.PORT) : 8080);
}