'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { TetrisEngine, InputState, GameState } from '../lib/tetris/engine';
import { MultiplayerClient } from '../lib/multiplayer/netcode';
import { Button } from '@/components/ui/Button';
import { Wifi, WifiOff, Gauge, Clock4, Pause, Play, RotateCcw } from 'lucide-react';

/** ---------- CONFIG / CONSTANTS ---------- */

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
const TOTAL_ROWS = 40; // 20 hidden + 20 visible if engine uses that
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

/** ---------- COMPONENT ---------- */

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
    const [paused, setPaused] = useState<boolean>(false);

    // Touch controls state
    const [touchControls, setTouchControls] = useState({
        left: false,
        right: false,
        softDrop: false,
        rotate: false,
        hold: false,
        hardDrop: false,
    });

    /** ---------- INIT: ENGINE + NETCODE ---------- */
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

    /** ---------- CANVAS SCALING (HiDPI) ---------- */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const width = BOARD_WIDTH * CELL_SIZE + BOARD_OFFSET_X * 2; // 400
        const height = BOARD_HEIGHT * CELL_SIZE + BOARD_OFFSET_Y * 2; // 600
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }, []);

    /** ---------- INPUT (KEYBOARD) ---------- */
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
            info.processed = false;
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
        window.addEventListener('keydown', handleKeyDown, { passive: false });
        window.addEventListener('keyup', handleKeyUp, { passive: false });
        return () => {
            window.removeEventListener('keydown', handleKeyDown as EventListener);
            window.removeEventListener('keyup', handleKeyUp as EventListener);
        };
    }, [handleKeyDown, handleKeyUp]);

    /** ---------- MERGE INPUTS (KEYBOARD + TOUCH) ---------- */
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

    /** ---------- RENDER HELPERS (CANVAS) ---------- */

    const drawBoardBackground = (ctx: CanvasRenderingContext2D) => {
        // Subtle grid with neon edges
        ctx.fillStyle = '#0b0b0f';
        ctx.fillRect(BOARD_OFFSET_X, BOARD_OFFSET_Y, BOARD_WIDTH * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);

        // Border glow
        const grad = ctx.createLinearGradient(
            BOARD_OFFSET_X, BOARD_OFFSET_Y, BOARD_OFFSET_X + BOARD_WIDTH * CELL_SIZE, BOARD_OFFSET_Y + BOARD_HEIGHT * CELL_SIZE
        );
        grad.addColorStop(0, 'rgba(0,240,240,0.35)');
        grad.addColorStop(1, 'rgba(160,0,240,0.35)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.strokeRect(BOARD_OFFSET_X - 1.5, BOARD_OFFSET_Y - 1.5, BOARD_WIDTH * CELL_SIZE + 3, BOARD_HEIGHT * CELL_SIZE + 3);

        // Light grid lines
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#3b3f55';
        ctx.lineWidth = 1;
        for (let x = 1; x < BOARD_WIDTH; x++) {
            const px = BOARD_OFFSET_X + x * CELL_SIZE;
            ctx.beginPath();
            ctx.moveTo(px, BOARD_OFFSET_Y);
            ctx.lineTo(px, BOARD_OFFSET_Y + BOARD_HEIGHT * CELL_SIZE);
            ctx.stroke();
        }
        for (let y = 1; y < BOARD_HEIGHT; y++) {
            const py = BOARD_OFFSET_Y + y * CELL_SIZE;
            ctx.beginPath();
            ctx.moveTo(BOARD_OFFSET_X, py);
            ctx.lineTo(BOARD_OFFSET_X + BOARD_WIDTH * CELL_SIZE, py);
            ctx.stroke();
        }
        ctx.restore();
    };

    const drawCell = (
        ctx: CanvasRenderingContext2D,
        px: number,
        py: number,
        size: number,
        color: string
    ) => {
        // Glossy block with inner shadow
        const grad = ctx.createLinearGradient(px, py, px, py + size);
        grad.addColorStop(0, '#ffffff22');
        grad.addColorStop(0.3, color);
        grad.addColorStop(1, '#00000055');
        ctx.fillStyle = grad;
        ctx.fillRect(px, py, size - 1, size - 1);

        // Inner stroke
        ctx.strokeStyle = '#00000066';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, size - 2, size - 2);
    };

    const renderGame = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
        const dirtyRows: ReadonlySet<number> =
            (engineRef.current && (engineRef.current).getDirtyRows?.()) || new Set<number>();

        const hasDirty = dirtyRows.size > 0;
        if (!hasDirty) {
            drawBoardBackground(ctx);
        } else {
            // Clear only dirty visible rows
            ctx.fillStyle = '#0b0b0f';
            for (const row of dirtyRows) {
                if (row >= BOARD_HEIGHT && row < TOTAL_ROWS) {
                    const y = BOARD_OFFSET_Y + (TOTAL_ROWS - 1 - row) * CELL_SIZE;
                    ctx.fillRect(BOARD_OFFSET_X, y, BOARD_WIDTH * CELL_SIZE, CELL_SIZE);
                }
            }
        }

        // Draw locked cells
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
                    // Use a neutral steel color for locked blocks (keeps active piece vivid)
                    drawCell(ctx, px, py, CELL_SIZE, '#6b7280');
                }
            }
        }

        // Draw current piece (rotation 0 preview styling)
        const piece = state.currentPiece ?? null;
        if (piece) {
            const color = colorForPiece((piece).type);
            const shape = PIECES[clampIndex((piece).type, PIECES.length) ?? 0];

            // Soft drop shadow
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = color;
            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 4; x++) {
                    if (shape[y]?.[x]) {
                        const bx = (piece).x + x;
                        const by = (piece).y + y;
                        if (bx >= 0 && bx < BOARD_WIDTH && by >= BOARD_HEIGHT && by < TOTAL_ROWS) {
                            const px = BOARD_OFFSET_X + bx * CELL_SIZE + 2;
                            const py = BOARD_OFFSET_Y + (TOTAL_ROWS - 1 - by) * CELL_SIZE + 2;
                            ctx.fillRect(px, py, CELL_SIZE - 5, CELL_SIZE - 5);
                        }
                    }
                }
            }
            ctx.restore();

            // Actual piece
            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 4; x++) {
                    if (shape[y]?.[x]) {
                        const bx = (piece).x + x;
                        const by = (piece).y + y;
                        if (bx >= 0 && bx < BOARD_WIDTH && by >= BOARD_HEIGHT && by < TOTAL_ROWS) {
                            const px = BOARD_OFFSET_X + bx * CELL_SIZE;
                            const py = BOARD_OFFSET_Y + (TOTAL_ROWS - 1 - by) * CELL_SIZE;
                            drawCell(ctx, px, py, CELL_SIZE, color);
                        }
                    }
                }
            }
        }

        // Ghost piece (simple projection)
        const calculateGhostY = (s: GameState, shape: ReadonlyArray<ReadonlyArray<number>>): number => {
            const p = s.currentPiece;
            if (!p) return 0;
            let gy = p.y;
            while (gy > 0 && canPlace(s, p.x, gy - 1, shape)) {
                gy -= 1;
            }
            return gy;
        };

        if (piece) {
            const shape = PIECES[clampIndex((piece).type, PIECES.length) ?? 0];
            const ghostY = calculateGhostY(state, shape);
            const color = colorForPiece((piece).type);
            const ghostColor = `${color}88`;

            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = ghostColor;
            ctx.setLineDash([4, 3]);
            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 4; x++) {
                    if (shape[y]?.[x]) {
                        const bx = (piece).x + x;
                        const by = ghostY + y;
                        if (bx >= 0 && bx < BOARD_WIDTH && by >= BOARD_HEIGHT && by < TOTAL_ROWS) {
                            const px = BOARD_OFFSET_X + bx * CELL_SIZE;
                            const py = BOARD_OFFSET_Y + (TOTAL_ROWS - 1 - by) * CELL_SIZE;
                            ctx.strokeRect(px + 0.5, py + 0.5, CELL_SIZE - 2, CELL_SIZE - 2);
                        }
                    }
                }
            }
            ctx.restore();
        }
    }, []);

    const canPlace = (
        state: GameState,
        x: number,
        y: number,
        shape: ReadonlyArray<ReadonlyArray<number>>
    ): boolean => {
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

    /** ---------- GAME LOOP ---------- */
    const gameLoop = useCallback((currentTime: number) => {
        const deltaTime = currentTime - lastFrameTime.current;
        lastFrameTime.current = currentTime;

        const startTime = performance.now();

        // If paused, don't run engine updates but keep animating overlay fade
        if (paused) {
            animationRef.current = requestAnimationFrame(gameLoop);
            return;
        }

        const engine = engineRef.current;

        // Inputs
        const inputs = processInputs();

        // Update state
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
            // Render
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) renderGame(ctx, newState);
        }

        // Perf
        const frameTime = performance.now() - startTime;
        if (frameTime > frameBudget.current) {
            console.warn(`Frame budget exceeded: ${frameTime.toFixed(2)}ms`);
        }

        if (deltaTime > 0) setFps(Math.round(1000 / deltaTime));

        animationRef.current = requestAnimationFrame(gameLoop);
    }, [isMultiplayer, playerId, processInputs, renderGame, paused]);

    useEffect(() => {
        animationRef.current = requestAnimationFrame(gameLoop);
        return () => {
            if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
        };
    }, [gameLoop]);

    /** ---------- TOUCH CONTROLS ---------- */
    const handleTouchStart = useCallback((control: keyof typeof touchControls) => {
        setTouchControls((prev) => ({ ...prev, [control]: true }));
    }, []);

    const handleTouchEnd = useCallback((control: keyof typeof touchControls) => {
        setTouchControls((prev) => ({ ...prev, [control]: false }));
    }, []);

    /** ---------- UI HELPERS ---------- */
    const StatChip: React.FC<{ label: string; value: React.ReactNode; tone?: 'cyan' | 'purple' | 'green' | 'yellow' | 'red' | 'indigo' }> = ({
        label, value, tone = 'cyan'
    }) => {
        const toneMap: Record<string, string> = {
            cyan: 'text-tetris-cyan',
            purple: 'text-tetris-purple',
            green: 'text-tetris-green',
            yellow: 'text-tetris-yellow',
            red: 'text-tetris-red',
            indigo: 'text-indigo-400',
        };
        return (
            <div className="rounded-xl bg-white/5 backdrop-blur border border-white/10 p-3">
                <div className={`text-xl md:text-2xl font-bold ${toneMap[tone]}`}>{value}</div>
                <div className="text-xs md:text-sm text-gray-400">{label}</div>
            </div>
        );
    };

    const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <div className="w-32 bg-white/10 border border-white/10 rounded-2xl p-4 backdrop-blur">
            <h3 className="text-sm font-semibold text-tetris-yellow mb-3">{title}</h3>
            {children}
        </div>
    );

    const renderMiniPiece = (type: number) => {
        const shape = PIECES[clampIndex(type, PIECES.length) ?? 0];
        const color = colorForPiece(type);
        // Render 4x4 grid miniature
        return (
            <div className="grid grid-cols-4 gap-[2px] p-[2px] bg-black/40 rounded">
                {shape.flat().map((cell, i) => (
                    <div
                        key={i}
                        className="w-4 h-4 rounded-[2px]"
                        style={{ background: cell ? color : 'transparent' }}
                    />
                ))}
            </div>
        );
    };

    /** ---------- RENDER ---------- */
    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
            {/* HUD */}
            <header className="w-full border-b border-white/10 bg-white/5 backdrop-blur sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    {/* Left stats */}
                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="text-sm md:text-base">
                            <div className="text-gray-400">Score</div>
                            <div className="text-tetris-cyan font-bold">{gameState?.score?.toLocaleString?.() ?? 0}</div>
                        </div>
                        <div className="text-sm md:text-base">
                            <div className="text-gray-400">Lines</div>
                            <div className="text-tetris-yellow font-bold">{gameState?.lines ?? 0}</div>
                        </div>
                        <div className="text-sm md:text-base">
                            <div className="text-gray-400">Level</div>
                            <div className="text-tetris-purple font-bold">{gameState?.level ?? 1}</div>
                        </div>
                    </div>

                    {/* Center controls */}
                    <div className="hidden md:flex items-center gap-2">
                        <Button
                            onClick={() => setPaused((p) => !p)}
                            className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 font-game"
                        >
                            {paused ? <Play size={16} className="inline mr-2" /> : <Pause size={16} className="inline mr-2" />}
                            {paused ? 'Resume' : 'Pause'}
                        </Button>
                        <Button
                            onClick={() => window.location.reload()}
                            className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 font-game"
                        >
                            <RotateCcw size={16} className="inline mr-2" />
                            Restart
                        </Button>
                    </div>

                    {/* Right diagnostics */}
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-300">
                            <Gauge size={16} /> <span>{fps} FPS</span>
                        </div>
                        {isMultiplayer && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    {connected ? <Wifi size={16} className="text-green-400" /> : <WifiOff size={16} className="text-red-400" />}
                                    <span className="text-gray-300">{connected ? 'Online' : 'Offline'}</span>
                                </div>
                                <div className="text-gray-400 hidden sm:block">|</div>
                                <div className="hidden sm:flex items-center gap-1 text-gray-300">
                                    <Clock4 size={16} /> <span>{ping}ms</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Game Area */}
            <main className="flex-1 flex items-center justify-center px-4 py-6">
                <div className="flex items-start gap-6 md:gap-8">
                    {/* Hold */}
                    <Panel title="Hold">
                        <div className="w-24 h-24 bg-black/50 rounded-xl flex items-center justify-center">
                            {gameState?.holdPiece !== null && gameState?.holdPiece !== undefined ? (
                                renderMiniPiece(gameState.holdPiece as unknown as number)
                            ) : (
                                <div className="text-gray-600 text-xs">Empty</div>
                            )}
                        </div>
                    </Panel>

                    {/* Board */}
                    <div className="relative">
                        <canvas
                            ref={canvasRef}
                            width={BOARD_WIDTH * CELL_SIZE + BOARD_OFFSET_X * 2}   // 400
                            height={BOARD_HEIGHT * CELL_SIZE + BOARD_OFFSET_Y * 2} // 600
                            className="rounded-2xl border border-white/10 bg-black shadow-[0_0_40px_0_rgba(0,240,240,0.15)]"
                        />
                        {(paused || gameState?.gameOver) && (
                            <div className="absolute inset-0 rounded-2xl bg-black/70 backdrop-blur flex items-center justify-center">
                                <div className="text-center px-6">
                                    <h2 className="text-3xl md:text-4xl font-bold mb-2">
                                        {gameState?.gameOver ? 'Game Over' : 'Paused'}
                                    </h2>
                                    <p className="text-sm md:text-base text-gray-300">
                                        {gameState?.gameOver
                                            ? `Final Score: ${gameState.score?.toLocaleString?.() ?? 0}`
                                            : 'Press Resume to continue'}
                                    </p>
                                    <div className="mt-4 flex items-center justify-center gap-3">
                                        {!gameState?.gameOver && (
                                            <Button
                                                onClick={() => setPaused(false)}
                                                className="bg-tetris-cyan hover:bg-cyan-400 text-black font-bold rounded-xl px-5 py-2"
                                            >
                                                <Play size={16} className="inline mr-2" />
                                                Resume
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() => window.location.reload()}
                                            className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-5 py-2"
                                        >
                                            <RotateCcw size={16} className="inline mr-2" />
                                            Play Again
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Next */}
                    <Panel title="Next">
                        <div className="space-y-3">
                            {(gameState?.nextQueue?.slice(0, 5) ?? []).map((pieceType, i) => (
                                <div key={i} className="w-24 h-14 bg-black/50 rounded-xl flex items-center justify-center">
                                    {renderMiniPiece(pieceType as unknown as number)}
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            </main>

            {/* Touch Controls (Mobile) */}
            <section className="md:hidden w-full border-t border-white/10 bg-white/5 backdrop-blur px-4 py-4">
                <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
                    <button
                        className="col-span-2 py-3 rounded-xl font-bold bg-tetris-purple/80 hover:bg-tetris-purple text-white"
                        onTouchStart={() => handleTouchStart('rotate')}
                        onTouchEnd={() => handleTouchEnd('rotate')}
                        onMouseDown={() => handleTouchStart('rotate')}
                        onMouseUp={() => handleTouchEnd('rotate')}
                    >
                        Rotate
                    </button>
                    <button
                        className="py-3 rounded-xl font-bold bg-tetris-yellow/80 hover:bg-tetris-yellow text-black"
                        onTouchStart={() => handleTouchStart('hold')}
                        onTouchEnd={() => handleTouchEnd('hold')}
                        onMouseDown={() => handleTouchStart('hold')}
                        onMouseUp={() => handleTouchEnd('hold')}
                    >
                        Hold
                    </button>
                    <button
                        className="py-3 rounded-xl font-bold bg-tetris-red/80 hover:bg-tetris-red text-white"
                        onTouchStart={() => handleTouchStart('hardDrop')}
                        onTouchEnd={() => handleTouchEnd('hardDrop')}
                        onMouseDown={() => handleTouchStart('hardDrop')}
                        onMouseUp={() => handleTouchEnd('hardDrop')}
                    >
                        Drop
                    </button>

                    <button
                        className="py-4 rounded-xl text-2xl bg-white/10 hover:bg-white/20 border border-white/10"
                        onTouchStart={() => handleTouchStart('left')}
                        onTouchEnd={() => handleTouchEnd('left')}
                        onMouseDown={() => handleTouchStart('left')}
                        onMouseUp={() => handleTouchEnd('left')}
                    >
                        ←
                    </button>
                    <button
                        className="py-4 rounded-xl text-2xl bg-white/10 hover:bg-white/20 border border-white/10"
                        onTouchStart={() => handleTouchStart('softDrop')}
                        onTouchEnd={() => handleTouchEnd('softDrop')}
                        onMouseDown={() => handleTouchStart('softDrop')}
                        onMouseUp={() => handleTouchEnd('softDrop')}
                    >
                        ↓
                    </button>
                    <button
                        className="py-4 rounded-xl text-2xl bg-white/10 hover:bg-white/20 border border-white/10"
                        onTouchStart={() => handleTouchStart('right')}
                        onTouchEnd={() => handleTouchEnd('right')}
                        onMouseDown={() => handleTouchStart('right')}
                        onMouseUp={() => handleTouchEnd('right')}
                    >
                        →
                    </button>
                    <div />
                </div>

                <div className="mt-3 text-center text-xs text-gray-400">
                    Desktop: Arrow keys / WASD to move • Space = Hard Drop • C / Shift = Hold
                </div>
            </section>

            {/* Bottom Stats */}
            {gameState && (
                <footer className="w-full border-t border-white/10 bg-white/5 backdrop-blur">
                    <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 text-center">
                        <StatChip label="Combo" value={gameState.combo ?? 0} tone="cyan" />
                        <StatChip label="B2B" value={gameState.b2b ?? 0} tone="purple" />
                        <StatChip label="Time" value={formatTime(gameState.time ?? 0)} tone="green" />
                        <StatChip
                            label="Score/Line"
                            value={
                                gameState.lines && gameState.lines > 0
                                    ? Math.round((gameState.score ?? 0) / gameState.lines)
                                    : '0'
                            }
                            tone="yellow"
                        />
                        <StatChip
                            label="SPM"
                            value={
                                gameState.lines && gameState.lines > 0
                                    ? (((gameState.time ?? 0) / 1000) / gameState.lines * 60).toFixed(1)
                                    : '0'
                            }
                            tone="red"
                        />
                        <StatChip label="Garbage" value={gameState.garbageQueue?.length ?? 0} tone="indigo" />
                    </div>
                </footer>
            )}
        </div>
    );
};

export default GameClient;
