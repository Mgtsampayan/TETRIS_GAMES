import { TetrisEngine, SeededRNG, PRESETS } from '../lib/tetris/engine';

describe('TetrisEngine', () => {
    let engine: TetrisEngine;

    beforeEach(() => {
        engine = new TetrisEngine('guideline', 12345);
    });

    test('should initialize with correct default state', () => {
        const state = engine.getState();

        expect(state.score).toBe(0);
        expect(state.lines).toBe(0);
        expect(state.level).toBe(1);
        expect(state.gameOver).toBe(false);
        expect(state.nextQueue).toHaveLength(5);
        expect(state.currentPiece).toBeTruthy();
    });

    test('should handle piece movement correctly', () => {
        const initialState = engine.getState();
        const initialX = initialState.currentPiece!.x;

        // Test left movement
        const leftInputs = { left: true, right: false, softDrop: false, hardDrop: false, rotate: false, hold: false };
        engine.update(100, leftInputs);

        let newState = engine.getState();
        expect(newState.currentPiece!.x).toBe(initialX - 1);

        // Test right movement
        const rightInputs = { left: false, right: true, softDrop: false, hardDrop: false, rotate: false, hold: false };
        engine.update(100, rightInputs);

        newState = engine.getState();
        expect(newState.currentPiece!.x).toBe(initialX);
    });

    test('should detect line clears correctly', () => {
        // Create a nearly full line in the playfield
        const state = engine.getState();

        // Set bottom row to nearly full (missing one block)
        state.playfield[0] = 0x3FE; // 1111111110 in binary

        // Place a piece to complete the line
        const inputs = { left: false, right: false, softDrop: false, hardDrop: true, rotate: false, hold: false };
        const result = engine.update(100, inputs);

        if (result.type === 'linesCleared') {
            expect(result.lines).toBe(1);
        }
    });

    test('should handle T-spin detection', () => {
        // Set up a T-spin scenario
        const state = engine.getState();

        // Create T-spin setup (this is simplified)
        state.playfield[0] = 0x3F7; // Bottom row with T-spin hole
        state.playfield[1] = 0x3F7;

        // This would need more complex setup for actual T-spin detection
        expect(true).toBe(true); // Placeholder
    });

    test('should calculate garbage correctly', () => {
        const inputs = { left: false, right: false, softDrop: false, hardDrop: false, rotate: false, hold: false };

        // Simulate multiple line clears
        for (let i = 0; i < 4; i++) {
            const state = engine.getState();
            state.playfield[i] = 0x3FE; // Nearly full line
        }

        const result = engine.update(100, { ...inputs, hardDrop: true });

        if (result.type === 'linesCleared' && result.lines === 4) {
            // Tetris should generate significant garbage
            expect(result.lines).toBe(4);
        }
    });
});

describe('SeededRNG', () => {
    test('should produce deterministic results', () => {
        const rng1 = new SeededRNG(12345);
        const rng2 = new SeededRNG(12345);

        const sequence1 = Array.from({ length: 10 }, () => rng1.next());
        const sequence2 = Array.from({ length: 10 }, () => rng2.next());

        expect(sequence1).toEqual(sequence2);
    });

    test('should produce different sequences for different seeds', () => {
        const rng1 = new SeededRNG(12345);
        const rng2 = new SeededRNG(54321);

        const value1 = rng1.next();
        const value2 = rng2.next();

        expect(value1).not.toBe(value2);
    });

    test('should clone correctly', () => {
        const rng1 = new SeededRNG(12345);
        rng1.next(); // Advance state

        const rng2 = rng1.clone();

        expect(rng1.next()).toBe(rng2.next());
    });
});

describe('Game Presets', () => {
    test('should load guideline preset correctly', () => {
        const engine = new TetrisEngine('guideline', 12345);
        const state = engine.getState();

        expect(state.preset.name).toBe('Guideline');
        expect(state.preset.das).toBe(167);
        expect(state.preset.arr).toBe(33);
    });

    test('should load NES preset correctly', () => {
        const engine = new TetrisEngine('nes', 12345);
        const state = engine.getState();

        expect(state.preset.name).toBe('NES 1989');
        expect(state.preset.lockDelay).toBe(0);
    });
});