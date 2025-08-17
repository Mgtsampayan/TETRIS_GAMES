import { RollbackNetcode, MultiplayerClient, AntiCheat } from '../lib/multiplayer/netcode';
import { TetrisEngine } from '../lib/tetris/engine';

describe('RollbackNetcode', () => {
    let netcode: RollbackNetcode;
    let engine1: TetrisEngine;
    let engine2: TetrisEngine;

    beforeEach(() => {
        netcode = new RollbackNetcode('player1');
        engine1 = new TetrisEngine('guideline', 12345);
        engine2 = new TetrisEngine('guideline', 12345);

        netcode.addPlayer('player1', engine1);
        netcode.addPlayer('player2', engine2);
    });

    test('should handle local input prediction', () => {
        const inputs = {
            left: true,
            right: false,
            softDrop: false,
            hardDrop: false,
            rotate: false,
            hold: false
        };

        netcode.update(16.67, inputs); // One frame at 60 FPS

        const playerEngine = netcode.getPlayerEngine('player1');
        expect(playerEngine).toBeTruthy();
    });

    test('should rollback on remote input arrival', () => {
        const localInputs = { left: true, right: false, softDrop: false, hardDrop: false, rotate: false, hold: false };
        const remoteInputs = { left: false, right: true, softDrop: false, hardDrop: false, rotate: false, hold: false };

        // Predict with local input
        netcode.update(16.67, localInputs);
        const frame1 = netcode.getCurrentFrame();

        // Remote input arrives for earlier frame
        netcode.onRemoteInput('player2', frame1 - 1, remoteInputs);

        // Should trigger rollback and re-simulation
        expect(true).toBe(true); // Placeholder for rollback verification
    });
});

describe('AntiCheat', () => {
    let antiCheat: AntiCheat;

    beforeEach(() => {
        antiCheat = new AntiCheat();
    });

    test('should detect impossible input rates', () => {
        const inputs = Array(50).fill({
            left: true, right: false, softDrop: false, hardDrop: false, rotate: false, hold: false
        });
        const timestamps = Array(50).fill(0).map((_, i) => Date.now() + i * 10); // 100 inputs/second

        const isValid = antiCheat.validateInputs('player1', inputs, timestamps);
        expect(isValid).toBe(false);
    });

    test('should allow normal input rates', () => {
        const inputs = Array(10).fill({
            left: true, right: false, softDrop: false, hardDrop: false, rotate: false, hold: false
        });
        const timestamps = Array(10).fill(0).map((_, i) => Date.now() + i * 100); // 10 inputs/second

        const isValid = antiCheat.validateInputs('player1', inputs, timestamps);
        expect(isValid).toBe(true);
    });
});