import React, { useRef, useEffect, useCallback, useState } from 'react';
import { TetrisEngine, InputState, GameState } from '../lib/tetris/engine';
import { MultiplayerClient } from '../lib/multiplayer/netcode';

interface GameClientProps {
    isMultiplayer?: boolean;
    roomId?: string;
    playerId?: string;
}

interface KeyInfo {
    pressed: boolean;
    timestamp: number;
    processed: boolean;
}

type KeyState = Record<string, KeyInfo>;

// 7 standard Tetris colors (I, O, T, S, Z, J, L)
const PIECE_COLORS = [
    '#00f0f0', // I - Cyan
    '#f0f000', // O - Yellow
    '#a000f0', // T - Purple
    '#00f000', // S - Green
    '#f00000', // Z - Red
    '#0000f0', // J - Blue
    '#f0a000', // L - Orange
] as const;

// Simple shape definitions for rotation index 0 (4x4)
// Each entry is a 4x4 grid represented as number[][]
const PIECES: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>> = [
    // I
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    // O
    [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    // T
    [
        [0, 1, 0, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    // S
    [
        [0, 1, 1, 0],
        [1, 1, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    // Z
    [
        [1, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    // J
    [
        [1, 0, 0, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    // L
    [
        [0, 0, 1, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
] as const;

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20; // visible rows
const TOTAL_ROWS = 40; // if your engine uses a 20-hidden + 20-visible scheme
const CELL_SIZE = 30;
const BOARD_OFFSET_X = 50;
const BOARD_OFFSET_Y = 50;

function clampIndex(i: number, len: number): number | null {
    return Number.isInteger(i) && i >= 0 && i < len ? i : null;
}

function colorForPiece(type: number | undefined | null): string {
    if (typeof type !== 'number') return '#888';
    const idx = clampIndex(type, PIECE_COLORS.length);
    return idx === null ? '#888' : PIECE_COLORS[idx];
}

function formatTime(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0) return '0:00.0';
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const tenths = Math.floor((totalSeconds * 10) % 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}

const GameClient: React.FC<GameClientProps> = ({
    isMultiplayer = false,
    roomId,
    playerId = 'local',
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const engineRef = useRef<TetrisEngine | null>(null);
    const multiplayerRef = useRef<MultiplayerClient | null>(null);
    const keyStateRef = useRef<KeyState>({});
    const lastFrameTime = useRef<number>(performance.now());
    const frameBudget = useRef<number>(16.67); // 60 FPS

    const [gameState, setGameState] = useState<GameState | null>(null);
    const [fps, setFps] = useState<number>(60);
    const [ping] = useState<number>(0);
    const [connected, setConnected] = useState<boolean>(false);

    // Touch controls state
    const [touchControls, setTouchControls] = useState({
        left: false,
        right: false,
        softDrop: false,
        rotate: false,
        hold: false,
        hardDrop: false,
    });

    // Initialize game engine & multiplayer
    useEffect(() => {
        engineRef.current = new TetrisEngine('guideline', Date.now());

        let cancelled = false;

        const initializeMultiplayer = async () => {
            if (!isMultiplayer) return;
            if (!multiplayerRef.current) {
                multiplayerRef.current = new MultiplayerClient(playerId);
            }
            try {
                await multiplayerRef.current.connect('ws://localhost:8080');
                if (roomId) {
                    multiplayerRef.current.joinRoom(roomId);
                }
                if (!cancelled) setConnected(true);
            } catch (error) {
                console.error('Failed to connect to multiplayer server:', error);
                if (!cancelled) setConnected(false);
            }
        };

        void initializeMultiplayer();

        return () => {
            cancelled = true;
            if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
            if (multiplayerRef.current) multiplayerRef.current.disconnect();
        };
    }, [isMultiplayer, playerId, roomId]);

    // Canvas HiDPI scaling (optional but crisp)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const width = 400;
        const height = 600;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }, []);

    // Custom keyboard handling (no OS repeat)
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        const key = event.code;
        const now = performance.now();

        const current = keyStateRef.current[key];
        if (!current || !current.pressed) {
            keyStateRef.current[key] = {
                pressed: true,
                timestamp: now,
                processed: false,
            };
        }
        // Prevent page scrolling while playing
        if (
            key === 'ArrowUp' ||
            key === 'ArrowDown' ||
            key === 'ArrowLeft' ||
            key === 'ArrowRight' ||
            key === 'Space'
        ) {
            event.preventDefault();
        }
    }, []);

    const handleKeyUp = useCallback((event: KeyboardEvent) => {
        const key = event.code;
        const info = keyStateRef.current[key];
        if (info) {
            info.pressed = false;
            info.processed = false; // allow single-press actions again
        }
        if (
            key === 'ArrowUp' ||
            key === 'ArrowDown' ||
            key === 'ArrowLeft' ||
            key === 'ArrowRight' ||
            key === 'Space'
        ) {
            event.preventDefault();
        }
    }, []);

    useEffect(() => {
        // passive: false so preventDefault works on some browsers
        window.addEventListener('keydown', handleKeyDown, { passive: false });
        window.addEventListener('keyup', handleKeyUp, { passive: false });
        return () => {
            window.removeEventListener('keydown', handleKeyDown as EventListener);
            window.removeEventListener('keyup', handleKeyUp as EventListener);
        };
    }, [handleKeyDown, handleKeyUp]);

    // Build InputState from keyboard + touch
    const processInputs = useCallback((): InputState => {
        const ks = keyStateRef.current;

        const keyboard: InputState = {
            left: !!(ks.ArrowLeft?.pressed || ks.KeyA?.pressed),
            right: !!(ks.ArrowRight?.pressed || ks.KeyD?.pressed),
            softDrop: !!(ks.ArrowDown?.pressed || ks.KeyS?.pressed),
            hardDrop: !!(ks.Space?.pressed && !ks.Space?.processed),
            rotate:
                !!((ks.ArrowUp?.pressed && !ks.ArrowUp?.processed) ||
                    (ks.KeyW?.pressed && !ks.KeyW?.processed)),
            hold:
                !!((ks.KeyC?.pressed && !ks.KeyC?.processed) ||
                    (ks.ShiftLeft?.pressed && !ks.ShiftLeft?.processed)),
        };

        // Mark single-press keys as processed
        if (keyboard.hardDrop && ks.Space) ks.Space.processed = true;
        if (keyboard.rotate) {
            if (ks.ArrowUp) ks.ArrowUp.processed = true;
            if (ks.KeyW) ks.KeyW.processed = true;
        }
        if (keyboard.hold) {
            if (ks.KeyC) ks.KeyC.processed = true;
            if (ks.ShiftLeft) ks.ShiftLeft.processed = true;
        }

        // Merge with touch
        return {
            left: keyboard.left || touchControls.left,
            right: keyboard.right || touchControls.right,
            softDrop: keyboard.softDrop || touchControls.softDrop,
            hardDrop: keyboard.hardDrop || touchControls.hardDrop,
            rotate: keyboard.rotate || touchControls.rotate,
            hold: keyboard.hold || touchControls.hold,
        };
    }, [touchControls]);

    // Helpers for rendering
    const drawBoardBackground = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = '#000';
        ctx.fillRect(BOARD_OFFSET_X, BOARD_OFFSET_Y, BOARD_WIDTH * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);
    };

    const renderGame = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
        // Try to use dirty rows from engine if available; otherwise full redraw
        const dirtyRows: ReadonlySet<number> =
            (engineRef.current && (engineRef.current).getDirtyRows?.()) || new Set<number>();

        const hasDirty = dirtyRows.size > 0;
        if (!hasDirty) {
            drawBoardBackground(ctx);
        } else {
            // Clear only dirty visible rows
            ctx.fillStyle = '#000';
            for (const row of dirtyRows) {
                if (row >= BOARD_HEIGHT && row < TOTAL_ROWS) {
                    const y = BOARD_OFFSET_Y + (TOTAL_ROWS - 1 - row) * CELL_SIZE;
                    ctx.fillRect(BOARD_OFFSET_X, y, BOARD_WIDTH * CELL_SIZE, CELL_SIZE);
                }
            }
        }

        // Draw locked cells for dirty rows or full board
        const rowsToDraw: number[] = hasDirty
            ? [...dirtyRows].filter((r) => r >= BOARD_HEIGHT && r < TOTAL_ROWS)
            : Array.from({ length: BOARD_HEIGHT }, (_, i) => i + BOARD_HEIGHT);

        for (const absRow of rowsToDraw) {
            const boardRow = TOTAL_ROWS - 1 - absRow; // 0..19 visible
            const rowData = state.playfield?.[absRow];
            if (typeof rowData !== 'number') continue;
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if ((rowData & (1 << x)) !== 0) {
                    const px = BOARD_OFFSET_X + x * CELL_SIZE;
                    const py = BOARD_OFFSET_Y + boardRow * CELL_SIZE;
                    ctx.fillStyle = '#666';
                    ctx.fillRect(px, py, CELL_SIZE - 1, CELL_SIZE - 1);
                }
            }
        }

        // Draw current piece (rotation 0 only for now)
        const piece = state.currentPiece ?? null;
        if (piece) {
            const color = colorForPiece((piece).type);
            const shape = PIECES[clampIndex((piece).type, PIECES.length) ?? 0];
            ctx.fillStyle = color;

            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 4; x++) {
                    if (shape[y]?.[x]) {
                        const bx = (piece).x + x;
                        const by = (piece).y + y;
                        if (bx >= 0 && bx < BOARD_WIDTH && by >= BOARD_HEIGHT && by < TOTAL_ROWS) {
                            const px = BOARD_OFFSET_X + bx * CELL_SIZE;
                            const py = BOARD_OFFSET_Y + (TOTAL_ROWS - 1 - by) * CELL_SIZE;
                            ctx.fillRect(px, py, CELL_SIZE - 1, CELL_SIZE - 1);
                        }
                    }
                }
            }
        }

        const calculateGhostY = (state: GameState, shape: ReadonlyArray<ReadonlyArray<number>>): number => {
            const p = state.currentPiece;
            if (!p) return 0;
            let gy = p.y;
            while (gy > 0 && canPlace(state, p.x, gy - 1, shape)) {
                gy -= 1;
            }
            return gy;
        };

        // Ghost piece (simple projection)
        if (piece) {
            const shape = PIECES[clampIndex((piece).type, PIECES.length) ?? 0];
            const ghostY = calculateGhostY(state, shape);
            const color = colorForPiece((piece).type);
            ctx.strokeStyle = color;

            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 4; x++) {
                    if (shape[y]?.[x]) {
                        const bx = (piece).x + x;
                        const by = ghostY + y;
                        if (bx >= 0 && bx < BOARD_WIDTH && by >= BOARD_HEIGHT && by < TOTAL_ROWS) {
                            const px = BOARD_OFFSET_X + bx * CELL_SIZE;
                            const py = BOARD_OFFSET_Y + (TOTAL_ROWS - 1 - by) * CELL_SIZE;
                            ctx.strokeRect(px, py, CELL_SIZE - 1, CELL_SIZE - 1);
                        }
                    }
                }
            }
        }
    }, []);

    const canPlace = (state: GameState, x: number, y: number, shape: ReadonlyArray<ReadonlyArray<number>>): boolean => {
        for (let sy = 0; sy < 4; sy++) {
            for (let sx = 0; sx < 4; sx++) {
                if (!shape[sy]?.[sx]) continue;
                const bx = x + sx;
                const by = y + sy;
                if (bx < 0 || bx >= BOARD_WIDTH || by < 0 || by >= TOTAL_ROWS) return false;
                if (by >= 0) {
                    const rowData = state.playfield?.[by];
                    if (typeof rowData === 'number' && (rowData & (1 << bx)) !== 0) return false;
                }
            }
        }
        return true;
    };

    // Main game loop with frame budget management
    const gameLoop = useCallback((currentTime: number) => {
        const deltaTime = currentTime - lastFrameTime.current;
        lastFrameTime.current = currentTime;

        const startTime = performance.now();
        const engine = engineRef.current;

        // Process inputs
        const inputs = processInputs();

        // Update game state (single source of truth per frame)
        let newState: GameState | null = null;

        if (isMultiplayer && multiplayerRef.current) {
            multiplayerRef.current.update(deltaTime, inputs);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const netcode: any = multiplayerRef.current.getNetcode?.();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const localEngine: any = netcode?.getPlayerEngine?.(playerId);
            if (localEngine) {
                newState = localEngine.getState();
            }
        } else if (engine) {
            engine.update(deltaTime, inputs);
            newState = engine.getState();
        }

        if (newState) {
            setGameState(newState);
            // Render immediately with fresh state
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) {
                renderGame(ctx, newState);
            }
        }

        // Performance monitoring
        const frameTime = performance.now() - startTime;
        if (frameTime > frameBudget.current) {
            console.warn(`Frame budget exceeded: ${frameTime.toFixed(2)}ms`);
        }

        // FPS counter (avoid divide-by-zero)
        if (deltaTime > 0) setFps(Math.round(1000 / deltaTime));

        animationRef.current = requestAnimationFrame(gameLoop);
    }, [isMultiplayer, playerId, processInputs, renderGame]);

    // Start/stop game loop
    useEffect(() => {
        animationRef.current = requestAnimationFrame(gameLoop);
        return () => {
            if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
        };
    }, [gameLoop]);

    // Touch controls
    const handleTouchStart = useCallback((control: keyof typeof touchControls) => {
        setTouchControls((prev) => ({ ...prev, [control]: true }));
    }, []);

    const handleTouchEnd = useCallback((control: keyof typeof touchControls) => {
        setTouchControls((prev) => ({ ...prev, [control]: false }));
    }, []);

    return (
        <div className="flex flex-col items-center bg-gray-900 min-h-screen text-white">
            {/* HUD */}
            <div className="w-full bg-gray-800 p-4 flex justify-between items-center">
                <div className="flex space-x-6">
                    <div>Score: {gameState?.score?.toLocaleString?.() ?? 0}</div>
                    <div>Lines: {gameState?.lines ?? 0}</div>
                    <div>Level: {gameState?.level ?? 1}</div>
                </div>

                <div className="flex space-x-4 text-sm">
                    <div>FPS: {fps}</div>
                    {isMultiplayer && (
                        <>
                            <div>Ping: {ping}ms</div>
                            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        </>
                    )}
                </div>
            </div>

            {/* Game Area */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="flex space-x-8">
                    {/* Hold Area */}
                    <div className="w-32 bg-gray-800 rounded p-4">
                        <h3 className="text-lg font-bold mb-4">Hold</h3>
                        <div className="w-20 h-20 bg-gray-700 rounded flex items-center justify-center">
                            {gameState?.holdPiece !== null && gameState?.holdPiece !== undefined && (
                                <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: colorForPiece(gameState.holdPiece as unknown as number) }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Main Game Board */}
                    <div className="relative">
                        <canvas
                            ref={canvasRef}
                            // Logical size; actual backing store is scaled in useEffect
                            width={400}
                            height={600}
                            className="border-2 border-gray-600 bg-black"
                        />

                        {gameState?.gameOver && (
                            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                                <div className="text-center">
                                    <h2 className="text-4xl font-bold mb-4">Game Over</h2>
                                    <p className="text-xl">Final Score: {gameState.score?.toLocaleString?.() ?? 0}</p>
                                    <button
                                        className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                                        onClick={() => window.location.reload()}
                                    >
                                        Play Again
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Next Pieces */}
                    <div className="w-32 bg-gray-800 rounded p-4">
                        <h3 className="text-lg font-bold mb-4">Next</h3>
                        <div className="space-y-2">
                            {(gameState?.nextQueue?.slice(0, 5) ?? []).map((pieceType, index) => (
                                <div key={index} className="w-20 h-12 bg-gray-700 rounded flex items-center justify-center">
                                    <div
                                        className="w-3 h-3 rounded"
                                        style={{ backgroundColor: colorForPiece(pieceType as unknown as number) }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Touch Controls (Mobile) */}
            <div className="md:hidden w-full bg-gray-800 p-4">
                <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
                    <button
                        className="col-span-2 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded text-lg font-bold"
                        onTouchStart={() => handleTouchStart('rotate')}
                        onTouchEnd={() => handleTouchEnd('rotate')}
                        onMouseDown={() => handleTouchStart('rotate')}
                        onMouseUp={() => handleTouchEnd('rotate')}
                    >
                        Rotate
                    </button>
                    <button
                        className="py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded font-bold"
                        onTouchStart={() => handleTouchStart('hold')}
                        onTouchEnd={() => handleTouchEnd('hold')}
                        onMouseDown={() => handleTouchStart('hold')}
                        onMouseUp={() => handleTouchEnd('hold')}
                    >
                        Hold
                    </button>
                    <button
                        className="py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 rounded font-bold"
                        onTouchStart={() => handleTouchStart('hardDrop')}
                        onTouchEnd={() => handleTouchEnd('hardDrop')}
                        onMouseDown={() => handleTouchStart('hardDrop')}
                        onMouseUp={() => handleTouchEnd('hardDrop')}
                    >
                        Drop
                    </button>

                    <button
                        className="py-4 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 rounded text-2xl"
                        onTouchStart={() => handleTouchStart('left')}
                        onTouchEnd={() => handleTouchEnd('left')}
                        onMouseDown={() => handleTouchStart('left')}
                        onMouseUp={() => handleTouchEnd('left')}
                    >
                        ←
                    </button>
                    <button
                        className="py-4 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 rounded text-2xl"
                        onTouchStart={() => handleTouchStart('softDrop')}
                        onTouchEnd={() => handleTouchEnd('softDrop')}
                        onMouseDown={() => handleTouchStart('softDrop')}
                        onMouseUp={() => handleTouchEnd('softDrop')}
                    >
                        ↓
                    </button>
                    <button
                        className="py-4 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 rounded text-2xl"
                        onTouchStart={() => handleTouchStart('right')}
                        onTouchEnd={() => handleTouchEnd('right')}
                        onMouseDown={() => handleTouchStart('right')}
                        onMouseUp={() => handleTouchEnd('right')}
                    >
                        →
                    </button>
                    <div></div>
                </div>

                {/* Control Instructions */}
                <div className="mt-4 text-center text-sm text-gray-400">
                    <p>Desktop: Arrow keys or WASD to move, Space for hard drop, C for hold</p>
                </div>
            </div>

            {/* Statistics Panel */}
            {gameState && (
                <div className="w-full bg-gray-800 p-4 border-t border-gray-700">
                    <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-blue-400">{gameState.combo ?? 0}</div>
                            <div className="text-sm text-gray-400">Combo</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-purple-400">{gameState.b2b ?? 0}</div>
                            <div className="text-sm text-gray-400">B2B</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-400">{formatTime(gameState.time ?? 0)}</div>
                            <div className="text-sm text-gray-400">Time</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-yellow-400">
                                {gameState.lines && gameState.lines > 0 ? Math.round((gameState.score ?? 0) / gameState.lines) : '0'}
                            </div>
                            <div className="text-sm text-gray-400">Score/Line</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-red-400">
                                {gameState.lines && gameState.lines > 0
                                    ? (((gameState.time ?? 0) / 1000) / gameState.lines * 60).toFixed(1)
                                    : '0'}
                            </div>
                            <div className="text-sm text-gray-400">SPM</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-indigo-400">{gameState.garbageQueue?.length ?? 0}</div>
                            <div className="text-sm text-gray-400">Garbage</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameClient;
