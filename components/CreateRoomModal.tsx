'use client';

import { useState } from 'react';
import { RoomSettings } from '@/lib/multiplayer/netcode';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CreateRoomModalProps {
    onClose: () => void;
    onCreateRoom: (settings: RoomSettings) => void;
}

export function CreateRoomModal({ onClose, onCreateRoom }: CreateRoomModalProps) {
    const [name, setName] = useState('');
    const [maxPlayers, setMaxPlayers] = useState(4);
    const [gameMode, setGameMode] = useState('battle');
    const [preset, setPreset] = useState('guideline');
    const [privateRoom, setPrivateRoom] = useState(false);
    const [spectators, setSpectators] = useState(true);
    const [targetLines, setTargetLines] = useState<number | ''>('');

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!name.trim()) {
            alert('Please enter a room name');
            return;
        }

        const settings: RoomSettings = {
            preset,
            private: privateRoom,
            spectators,
            ...(preset === 'guideline' && targetLines ? { targetLines: Number(targetLines) } : {}),
        };

        onCreateRoom(settings);
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-8 w-full max-w-md text-white">
                <h2 className="text-2xl mb-6">Create a New Room</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-1 font-semibold">Room Name</label>
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter room name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block mb-1 font-semibold">Max Players</label>
                        <Input
                            type="number"
                            min={2}
                            max={12}
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(Number(e.target.value))}
                        />
                    </div>

                    <div>
                        <label className="block mb-1 font-semibold">Game Mode</label>
                        <select
                            className="w-full rounded px-3 py-2 bg-gray-700 text-white"
                            value={gameMode}
                            onChange={(e) => setGameMode(e.target.value)}
                        >
                            <option value="battle">Battle</option>
                            <option value="sprint">Sprint</option>
                            <option value="marathon">Marathon</option>
                        </select>
                    </div>

                    <div>
                        <label className="block mb-1 font-semibold">Preset</label>
                        <select
                            className="w-full rounded px-3 py-2 bg-gray-700 text-white"
                            value={preset}
                            onChange={(e) => setPreset(e.target.value)}
                        >
                            <option value="guideline">Guideline</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>

                    {preset === 'guideline' && (
                        <div>
                            <label className="block mb-1 font-semibold">Target Lines (optional)</label>
                            <Input
                                type="number"
                                min={1}
                                value={targetLines}
                                onChange={(e) => setTargetLines(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="e.g., 40"
                            />
                        </div>
                    )}

                    <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={privateRoom}
                                onChange={(e) => setPrivateRoom(e.target.checked)}
                                className="form-checkbox"
                            />
                            <span>Private Room</span>
                        </label>

                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={spectators}
                                onChange={(e) => setSpectators(e.target.checked)}
                                className="form-checkbox"
                            />
                            <span>Allow Spectators</span>
                        </label>
                    </div>

                    <div className="flex justify-end space-x-4 mt-6">
                        <Button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700">
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-green-600 hover:bg-green-700">
                            Create
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
