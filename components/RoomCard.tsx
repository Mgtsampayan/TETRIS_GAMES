'use client';

import { Room } from '@/lib/multiplayer/netcode';

interface RoomCardProps {
    room: Room;
}

export function RoomCard({ room }: RoomCardProps) {
    return (
        <div className="bg-gray-800 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold text-white mb-2">{room.name}</h2>
            <p className="text-gray-300 mb-1">
                Players: {room.players.length} / {room.maxPlayers}
            </p>
            <p className="text-gray-300 mb-1">Mode: {room.gameMode}</p>
            <p className="text-gray-400 text-sm">
                {room.settings.private ? 'Private Room' : 'Public Room'}
            </p>
            <p className="text-gray-400 text-sm">
                Spectators: {room.settings.spectators ? 'Allowed' : 'Not allowed'}
            </p>
            <p className="text-gray-500 text-xs mt-4">
                Created at: {room.createdAt.toLocaleDateString()} {room.createdAt.toLocaleTimeString()}
            </p>
        </div>
    );
}
