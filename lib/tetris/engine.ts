// lib/tetris/engine.ts

import { SerializableEngine } from '../multiplayer/netcode';

export interface Vec2 {
    x: number;
    y: number;
}

export interface PieceData {
    type: number;
    x: number;
    y: number;
    rotation: number;
}

export interface GameState {
    playfield: Uint32Array; // Bitboard representation (32 bits per row)
    currentPiece: PieceData | null;
    nextQueue: number[];
    holdPiece: number | null;
    canHold: boolean;
    score: number;
    lines: number;
    level: number;
    combo: number;
    b2b: number; // Back-to-back counter
    garbageQueue: number[];
    lockTimer: number;
    dropTimer: number;
    dasTimer: number;
    arrTimer: number;
    dasDirection: number; // -1, 0, 1
    gameOver: boolean;
    time: number;
    seed: number;
    rng: SeededRNG;
    preset: GamePreset;
}

export interface GamePreset {
    name: string;
    gravity: number[];
    lockDelay: number;
    das: number;
    arr: number;
    lineClearDelay: number;
    entryDelay: number;
    scoreTable: number[];
    garbageTable: number[];
}

export class SeededRNG {
    private state: number;

    constructor(seed: number) {
        this.state = seed;
    }

    next(): number {
        // Linear congruential generator
        this.state = (this.state * 1664525 + 1013904223) % 0x100000000;
        return this.state;
    }

    nextFloat(): number {
        return this.next() / 0x100000000;
    }

    nextInt(max: number): number {
        return Math.floor(this.nextFloat() * max);
    }

    clone(): SeededRNG {
        const rng = new SeededRNG(0);
        rng.state = this.state;
        return rng;
    }

    // FIXED: Added serialization methods directly (removed broken declare module)
    getState(): number {
        return this.state;
    }

    setState(state: number): void {
        this.state = state;
    }
}

// Tetris piece definitions (Standard Rotation System)
const PIECES: readonly (readonly (readonly number[][])[])[] = [  // FIXED: Made readonly
    // I piece
    [
        [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
        [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
        [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]]
    ],
    // O piece
    [
        [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
    ],
    // T piece
    [
        [[0, 1, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        [[0, 1, 0, 0], [0, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
        [[0, 0, 0, 0], [1, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
        [[0, 1, 0, 0], [1, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]]
    ],
    // S piece
    [
        [[0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        [[0, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 0], [0, 0, 0, 0]],
        [[0, 0, 0, 0], [0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0]],
        [[1, 0, 0, 0], [1, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]]
    ],
    // Z piece
    [
        [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        [[0, 0, 1, 0], [0, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
        [[0, 0, 0, 0], [1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
        [[0, 1, 0, 0], [1, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0]]
    ],
    // J piece
    [
        [[1, 0, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        [[0, 1, 1, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
        [[0, 0, 0, 0], [1, 1, 1, 0], [0, 0, 1, 0], [0, 0, 0, 0]],
        [[0, 1, 0, 0], [0, 1, 0, 0], [1, 1, 0, 0], [0, 0, 0, 0]]
    ],
    // L piece
    [
        [[0, 0, 1, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
        [[0, 0, 0, 0], [1, 1, 1, 0], [1, 0, 0, 0], [0, 0, 0, 0]],
        [[1, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]]
    ]
];

// SRS kick tables
const SRS_KICKS: readonly (readonly (readonly number[][])[])[] = [  // FIXED: Made readonly
    // I piece kicks
    [
        [[0, 0], [-1, 0], [2, 0], [-1, 0], [2, 0]], // 0->1
        [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], // 1->2
        [[0, 0], [1, 0], [-2, 0], [1, 0], [-2, 0]], // 2->3
        [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]] // 3->0
    ],
    // JLSTZ pieces kicks
    [
        [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], // 0->1
        [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], // 1->2
        [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], // 2->3
        [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]] // 3->0
    ]
];

export const PRESETS: { [key: string]: GamePreset } = {
    guideline: {
        name: 'Guideline',
        gravity: [1000, 793, 618, 473, 355, 262, 190, 135, 94, 64, 43, 28, 18, 11, 7, 4, 2, 1],
        lockDelay: 500,
        das: 167,
        arr: 33,
        lineClearDelay: 400,
        entryDelay: 183,
        scoreTable: [100, 300, 500, 800, 1200, 1600] as number[],  // FIXED: Explicit number[] to aid type inference
        garbageTable: [0, 0, 1, 2, 4, 0] as number[]  // FIXED: Explicit number[] to prevent index errors
    },
    nes: {
        name: 'NES 1989',
        gravity: [48, 43, 38, 33, 28, 23, 18, 13, 8, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
        lockDelay: 0,
        das: 267,
        arr: 100,
        lineClearDelay: 600,
        entryDelay: 100,
        scoreTable: [40, 100, 300, 1200] as number[],
        garbageTable: [0, 0, 0, 0] as number[]
    }
};

export class TetrisEngine implements SerializableEngine {  // FIXED: Added implements SerializableEngine
    private state: GameState;
    private bag: number[] = [];
    private dirtyRows: Set<number> = new Set();

    constructor(preset: string = 'guideline', seed: number = Date.now()) {
        this.state = this.createInitialState(preset, seed);
        this.fillBag();
        this.spawnPiece();
    }

    private createInitialState(presetName: string, seed: number): GameState {
        const preset = PRESETS[presetName] || PRESETS.guideline;
        return {
            playfield: new Uint32Array(40), // 20 visible + 20 buffer
            currentPiece: null,
            nextQueue: [],
            holdPiece: null,
            canHold: true,
            score: 0,
            lines: 0,
            level: 1,
            combo: 0,
            b2b: 0,
            garbageQueue: [],
            lockTimer: 0,
            dropTimer: 0,
            dasTimer: 0,
            arrTimer: 0,
            dasDirection: 0,
            gameOver: false,
            time: 0,
            seed,
            rng: new SeededRNG(seed),
            preset
        };
    }

    private fillBag(): void {
        if (this.bag.length === 0) {
            this.bag = [0, 1, 2, 3, 4, 5, 6];
            // Fisher-Yates shuffle
            for (let i = this.bag.length - 1; i > 0; i--) {
                const j = this.state.rng.nextInt(i + 1);
                [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
            }
        }
    }

    private getNextPiece(): number {
        this.fillBag();
        return this.bag.pop()!;
    }

    private spawnPiece(): boolean {
        if (this.state.nextQueue.length < 5) {
            while (this.state.nextQueue.length < 5) {
                this.state.nextQueue.push(this.getNextPiece());
            }
        }

        const pieceType = this.state.nextQueue.shift()!;
        this.state.nextQueue.push(this.getNextPiece());

        const piece: PieceData = {
            type: pieceType,
            x: 3,
            y: 20,
            rotation: 0
        };

        if (!this.canPlace(piece)) {
            this.state.gameOver = true;
            return false;
        }

        this.state.currentPiece = piece;
        this.state.canHold = true;
        this.state.lockTimer = 0;
        return true;
    }

    private canPlace(piece: PieceData): boolean {
        const shape = PIECES[piece.type][piece.rotation];
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                if (shape[y][x]) {
                    const boardX = piece.x + x;
                    const boardY = piece.y + y;

                    if (boardX < 0 || boardX >= 10 || boardY < 0) return false;
                    if (boardY < 40 && (this.state.playfield[boardY] & (1 << boardX))) return false;
                }
            }
        }
        return true;
    }

    private tryKick(piece: PieceData, newRotation: number): PieceData | null {
        const kickTable = piece.type === 0 ? SRS_KICKS[0] : SRS_KICKS[1];
        const kicks = kickTable[piece.rotation];

        for (const [dx, dy] of kicks) {
            const testPiece: PieceData = {
                ...piece,
                x: piece.x + dx,
                y: piece.y - dy,
                rotation: newRotation
            };

            if (this.canPlace(testPiece)) {
                return testPiece;
            }
        }

        return null;
    }

    private placePiece(piece: PieceData): void {
        const shape = PIECES[piece.type][piece.rotation];
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                if (shape[y][x]) {
                    const boardY = piece.y + y;
                    const boardX = piece.x + x;
                    if (boardY >= 0 && boardY < 40) {
                        this.state.playfield[boardY] |= (1 << boardX);
                        this.dirtyRows.add(boardY);
                    }
                }
            }
        }
    }

    private clearLines(): number {
        const linesToClear: number[] = [];

        for (let y = 0; y < 40; y++) {
            if (this.state.playfield[y] === 0x3FF) { // Full line (10 bits set)
                linesToClear.push(y);
            }
        }

        if (linesToClear.length === 0) return 0;

        // Remove cleared lines and shift down
        for (const line of linesToClear.reverse()) {
            for (let y = line; y < 39; y++) {
                this.state.playfield[y] = this.state.playfield[y + 1];
                this.dirtyRows.add(y);
            }
            this.state.playfield[39] = 0;
            this.dirtyRows.add(39);
        }

        return linesToClear.length;
    }

    private checkTSpin(piece: PieceData): boolean {
        if (piece.type !== 2) return false; // Only T pieces

        const corners = [
            [piece.x, piece.y],
            [piece.x + 2, piece.y],
            [piece.x, piece.y + 2],
            [piece.x + 2, piece.y + 2]
        ];

        let filledCorners = 0;
        for (const [x, y] of corners) {
            if (x < 0 || x >= 10 || y < 0 || (y < 40 && (this.state.playfield[y] & (1 << x)))) {
                filledCorners++;
            }
        }

        return filledCorners >= 3;
    }

    private updateScore(linesCleared: number, isTSpin: boolean): void {
        if (linesCleared === 0) {
            this.state.combo = 0;
            return;
        }

        let baseScore = 0;
        const level = this.state.level;

        if (isTSpin) {
            const tSpinScores: number[] = [0, 800, 1200, 1600];  // FIXED: Explicit number[] to prevent index errors
            baseScore = (tSpinScores[Math.min(linesCleared, 3)] ?? 0) * level;  // FIXED: Added fallback

            if (this.state.b2b > 0) {
                baseScore = Math.floor(baseScore * 1.5);
            }
            this.state.b2b++;
        } else {
            baseScore = (this.state.preset.scoreTable[linesCleared] ?? 0) * level;  // FIXED: Added fallback

            if (linesCleared === 4) { // Tetris
                if (this.state.b2b > 0) {
                    baseScore = Math.floor(baseScore * 1.5);
                }
                this.state.b2b++;
            } else {
                this.state.b2b = 0;
            }
        }

        // Combo bonus
        if (this.state.combo > 0) {
            baseScore += 50 * this.state.combo * level;
        }
        this.state.combo++;

        this.state.score += baseScore;
        this.state.lines += linesCleared;
        this.state.level = Math.min(Math.floor(this.state.lines / 10) + 1, 15);
    }

    // Public interface
    getState(): Readonly<GameState> {
        return this.state;
    }

    getDirtyRows(): Set<number> {
        const dirty = new Set(this.dirtyRows);
        this.dirtyRows.clear();
        return dirty;
    }

    clone(): TetrisEngine & SerializableEngine {
        const cloned = new TetrisEngine();
        cloned.state = {
            ...this.state,
            playfield: new Uint32Array(this.state.playfield),
            nextQueue: [...this.state.nextQueue],
            garbageQueue: [...this.state.garbageQueue],
            currentPiece: this.state.currentPiece ? { ...this.state.currentPiece } : null,
            rng: this.state.rng.clone()
        };
        cloned.bag = [...this.bag];
        cloned.dirtyRows = new Set(Array.from(this.dirtyRows));  // FIXED: Deep clone Set
        return cloned;
    }

    // Serialization methods for rollback netcode
    serializeState(): GameStateSnapshot {
        return {
            playfield: Array.from(this.state.playfield),
            currentPiece: this.state.currentPiece ? { ...this.state.currentPiece } : null,
            nextQueue: [...this.state.nextQueue],
            holdPiece: this.state.holdPiece,
            canHold: this.state.canHold,
            score: this.state.score,
            lines: this.state.lines,
            level: this.state.level,
            combo: this.state.combo,
            b2b: this.state.b2b,
            garbageQueue: [...this.state.garbageQueue],
            lockTimer: this.state.lockTimer,
            dropTimer: this.state.dropTimer,
            dasTimer: this.state.dasTimer,
            arrTimer: this.state.arrTimer,
            dasDirection: this.state.dasDirection,
            gameOver: this.state.gameOver,
            time: this.state.time,
            rngState: this.state.rng.getState(),
            bag: [...this.bag]
        };
    }

    loadState(snapshot: GameStateSnapshot): void {
        this.state.playfield = new Uint32Array(snapshot.playfield);
        this.state.currentPiece = snapshot.currentPiece ? { ...snapshot.currentPiece } : null;
        this.state.nextQueue = [...snapshot.nextQueue];
        this.state.holdPiece = snapshot.holdPiece;
        this.state.canHold = snapshot.canHold;
        this.state.score = snapshot.score;
        this.state.lines = snapshot.lines;
        this.state.level = snapshot.level;
        this.state.combo = snapshot.combo;
        this.state.b2b = snapshot.b2b;
        this.state.garbageQueue = [...snapshot.garbageQueue];
        this.state.lockTimer = snapshot.lockTimer;
        this.state.dropTimer = snapshot.dropTimer;
        this.state.dasTimer = snapshot.dasTimer;
        this.state.arrTimer = snapshot.arrTimer;
        this.state.dasDirection = snapshot.dasDirection;
        this.state.gameOver = snapshot.gameOver;
        this.state.time = snapshot.time;
        this.state.rng.setState(snapshot.rngState);
        this.bag = [...snapshot.bag];
    }

    update(deltaTime: number, inputs: InputState): GameResult {
        if (this.state.gameOver) return { type: 'gameOver' };

        this.state.time += deltaTime;
        const result: GameResult = { type: 'continue' };

        if (!this.state.currentPiece) {
            if (!this.spawnPiece()) {
                return { type: 'gameOver' };
            }
        }

        const piece = this.state.currentPiece!;
        let moved = false;

        // Handle input
        if (inputs.rotate) {
            const newRotation = (piece.rotation + 1) % 4;
            const kicked = this.tryKick(piece, newRotation);
            if (kicked) {
                this.state.currentPiece = kicked;
                moved = true;
            }
        }

        if (inputs.hold && this.state.canHold) {
            if (this.state.holdPiece === null) {
                this.state.holdPiece = piece.type;
                this.state.currentPiece = null;
                this.state.canHold = false;
                this.spawnPiece();
            } else {
                const temp = this.state.holdPiece;
                this.state.holdPiece = piece.type;
                this.state.currentPiece = {
                    type: temp,
                    x: 3,
                    y: 20,
                    rotation: 0
                };
                this.state.canHold = false;
            }
            moved = true;
        }

        // DAS/ARR handling
        if (inputs.left || inputs.right) {
            const direction = inputs.left ? -1 : 1;

            if (this.state.dasDirection !== direction) {
                this.state.dasDirection = direction;
                this.state.dasTimer = 0;
                this.state.arrTimer = 0;

                // Try immediate move
                const newPiece = { ...piece, x: piece.x + direction };
                if (this.canPlace(newPiece)) {
                    this.state.currentPiece = newPiece;
                    moved = true;
                }
            } else {
                this.state.dasTimer += deltaTime;

                if (this.state.dasTimer >= this.state.preset.das) {
                    this.state.arrTimer += deltaTime;

                    if (this.state.arrTimer >= this.state.preset.arr) {
                        const newPiece = { ...piece, x: piece.x + direction };
                        if (this.canPlace(newPiece)) {
                            this.state.currentPiece = newPiece;
                            moved = true;
                        }
                        this.state.arrTimer = 0;
                    }
                }
            }
        } else {
            this.state.dasDirection = 0;
            this.state.dasTimer = 0;
            this.state.arrTimer = 0;
        }

        // Soft drop
        if (inputs.softDrop) {
            const newPiece = { ...piece, y: piece.y - 1 };
            if (this.canPlace(newPiece)) {
                this.state.currentPiece = newPiece;
                this.state.score += 1;
                moved = true;
            }
        }

        // Hard drop
        if (inputs.hardDrop) {
            let dropDistance = 0;
            while (this.canPlace({ ...piece, y: piece.y - dropDistance - 1 })) {
                dropDistance++;
            }

            this.state.currentPiece = { ...piece, y: piece.y - dropDistance };
            this.state.score += dropDistance * 2;
            this.state.lockTimer = this.state.preset.lockDelay; // Force lock
            moved = true;
        }

        // Gravity
        this.state.dropTimer += deltaTime;
        const gravity = this.state.preset.gravity[Math.min(this.state.level - 1, this.state.preset.gravity.length - 1)];

        if (this.state.dropTimer >= gravity) {
            const newPiece = { ...piece, y: piece.y - 1 };
            if (this.canPlace(newPiece)) {
                this.state.currentPiece = newPiece;
            }
            this.state.dropTimer = 0;
        }

        // Lock delay
        if (!this.canPlace({ ...piece, y: piece.y - 1 })) {
            this.state.lockTimer += deltaTime;

            if (this.state.lockTimer >= this.state.preset.lockDelay || inputs.hardDrop) {
                const isTSpin = this.checkTSpin(piece);
                this.placePiece(piece);

                const linesCleared = this.clearLines();
                this.updateScore(linesCleared, isTSpin);

                this.state.currentPiece = null;

                if (linesCleared > 0) {
                    result.type = 'linesCleared';
                    result.lines = linesCleared;
                    result.isTSpin = isTSpin;
                }
            }
        } else if (moved) {
            this.state.lockTimer = 0;
        }

        return result;
    }
}

export interface GameStateSnapshot {
    playfield: number[];
    currentPiece: PieceData | null;
    nextQueue: number[];
    holdPiece: number | null;
    canHold: boolean;
    score: number;
    lines: number;
    level: number;
    combo: number;
    b2b: number;
    garbageQueue: number[];
    lockTimer: number;
    dropTimer: number;
    dasTimer: number;
    arrTimer: number;
    dasDirection: number;
    gameOver: boolean;
    time: number;
    rngState: number;
    bag: number[];
}

export interface InputState {
    left: boolean;
    right: boolean;
    softDrop: boolean;
    hardDrop: boolean;
    rotate: boolean;
    hold: boolean;
}

export interface GameResult {
    type: 'continue' | 'linesCleared' | 'gameOver';
    lines?: number;
    isTSpin?: boolean;
    garbage?: number[];
}

// Replay system
export interface ReplayFrame {
    frame: number;
    inputs: InputState;
}

export class ReplayRecorder {
    private frames: ReplayFrame[] = [];
    private frameCount = 0;

    record(inputs: InputState): void {
        this.frames.push({
            frame: this.frameCount,
            inputs: { ...inputs }
        });
        this.frameCount++;
    }

    getReplay(): { seed: number; frames: ReplayFrame[] } {
        return {
            seed: 0, // Will be set by game
            frames: [...this.frames]
        };
    }

    clear(): void {
        this.frames = [];
        this.frameCount = 0;
    }
}

export class ReplayPlayer {
    private frames: ReplayFrame[];
    private currentFrame = 0;

    constructor(frames: ReplayFrame[]) {
        this.frames = frames;
    }

    getInputsForFrame(frame: number): InputState {
        const defaultInputs: InputState = {
            left: false,
            right: false,
            softDrop: false,
            hardDrop: false,
            rotate: false,
            hold: false
        };

        if (this.currentFrame < this.frames.length && this.frames[this.currentFrame].frame === frame) {
            const inputs = { ...this.frames[this.currentFrame].inputs };
            this.currentFrame++;
            return inputs;
        }

        return defaultInputs;
    }
}