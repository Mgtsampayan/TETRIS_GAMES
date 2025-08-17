'use client';

import { useState, useEffect, JSX } from 'react';
import { Room, RoomSettings } from '@/lib/multiplayer/netcode';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RoomCard } from '@/components/RoomCard';
import { CreateRoomModal } from '@/components/CreateRoomModal';

export default function RoomsPage(): JSX.Element {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');

    useEffect(() => {
        // Mock room data - would fetch from API
        const mockRooms: Room[] = [
            {
                id: 'room1',
                name: 'Casual Battle',
                players: ['player1', 'player2'],
                maxPlayers: 4,
                gameMode: 'battle',
                settings: {
                    preset: 'guideline',
                    private: false,
                    spectators: true,
                } as RoomSettings,
                state: 'waiting',
                createdAt: new Date(),
            },
            {
                id: 'room2',
                name: 'Speed Run Challenge',
                players: ['speedmaster'],
                maxPlayers: 6,
                gameMode: 'sprint',
                settings: {
                    preset: 'guideline',
                    targetLines: 40,
                    private: false,
                    spectators: true,
                } as RoomSettings,
                state: 'waiting',
                createdAt: new Date(),
            },
        ];

        setRooms(mockRooms);
    }, []);

    const filteredRooms = rooms.filter((room) =>
        room.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-white">Game Rooms</h1>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        Create Room
                    </Button>
                </div>

                {/* Search and Filter */}
                <div className="mb-6">
                    <Input
                        type="text"
                        placeholder="Search rooms..."
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        className="max-w-md"
                    />
                </div>

                {/* Room List */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRooms.map((room) => (
                        <RoomCard key={room.id} room={room} />
                    ))}
                </div>

                {filteredRooms.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-400 text-lg">No rooms found</p>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 bg-blue-600 hover:bg-blue-700"
                        >
                            Create the first room
                        </Button>
                    </div>
                )}

                {showCreateModal && (
                    <CreateRoomModal
                        onClose={() => setShowCreateModal(false)}
                        onCreateRoom={(settings: RoomSettings) => {
                            // Handle room creation
                            console.log('Creating room with settings:', settings);
                            setShowCreateModal(false);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
