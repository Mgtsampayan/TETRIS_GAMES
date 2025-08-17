'use client';

import { useState } from 'react';
import GameClient from '@/components/GameClient';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
// import { PRESETS } from '@/lib/tetris/engine';

export default function PlayPage() {
    const [gameStarted, setGameStarted] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState('guideline');

    if (gameStarted) {
        return <GameClient isMultiplayer={false} />;
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
                <h1 className="text-3xl font-bold text-white mb-6 text-center">
                    Single Player
                </h1>

                <div className="space-y-4">
                    <div>
                        <label className="block text-white text-sm font-bold mb-2">
                            Game Mode
                        </label>
                        <Select
                            value={selectedPreset}
                            onChange={setSelectedPreset}
                            options={[
                                { value: 'guideline', label: 'Modern Guideline' },
                                { value: 'nes', label: 'Classic NES' },
                            ]}
                        />
                    </div>

                    <div className="text-white text-sm">
                        <h3 className="font-bold mb-2">Controls:</h3>
                        <ul className="space-y-1 text-gray-300">
                            <li>Arrow Keys / WASD - Move</li>
                            <li>Space - Hard Drop</li>
                            <li>Up Arrow / W - Rotate</li>
                            <li>C / Left Shift - Hold</li>
                            <li>Down Arrow / S - Soft Drop</li>
                        </ul>
                    </div>

                    <Button
                        onClick={() => setGameStarted(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        Start Game
                    </Button>
                </div>
            </div>
        </div>
    );
}