import React from 'react';

interface LeaderboardEntry {
    rank: number;
    username: string;
    rating: number;
    gamesPlayed: number;
    winRate: number;
    tier: string;
    avatar?: string;
}

interface LeaderboardTableProps {
    entries: LeaderboardEntry[];
    loading: boolean;
    type: string;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
    entries,
    loading,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type
}) => {
    if (loading) {
        return (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading leaderboard...</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="px-6 py-4 text-left text-white font-bold">Rank</th>
                            <th className="px-6 py-4 text-left text-white font-bold">Player</th>
                            <th className="px-6 py-4 text-left text-white font-bold">Rating</th>
                            <th className="px-6 py-4 text-left text-white font-bold">Games</th>
                            <th className="px-6 py-4 text-left text-white font-bold">Win Rate</th>
                            <th className="px-6 py-4 text-left text-white font-bold">Tier</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry, index) => (
                            <tr
                                key={entry.username}
                                className={`${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'} hover:bg-gray-700 transition-colors`}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <span className={`text-lg font-bold ${entry.rank === 1 ? 'text-yellow-400' :
                                            entry.rank === 2 ? 'text-gray-300' :
                                                entry.rank === 3 ? 'text-orange-400' :
                                                    'text-white'
                                            }`}>
                                            #{entry.rank}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                            {entry.username[0].toUpperCase()}
                                        </div>
                                        <span className="text-white font-medium">{entry.username}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-white font-bold">{entry.rating}</td>
                                <td className="px-6 py-4 text-gray-300">{entry.gamesPlayed}</td>
                                <td className="px-6 py-4">
                                    <span className={`font-medium ${entry.winRate >= 70 ? 'text-green-400' :
                                        entry.winRate >= 50 ? 'text-yellow-400' :
                                            'text-red-400'
                                        }`}>
                                        {entry.winRate}%
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded text-sm font-medium bg-gray-700 text-white">
                                        {entry.tier}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};