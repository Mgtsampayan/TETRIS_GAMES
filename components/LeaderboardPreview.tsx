/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect } from 'react';
import { cn, getRankColor } from '@/lib/utils';

interface LeaderboardEntry {
    rank: number;
    username: string;
    rating: number;
    tier: string;
    winRate: number;
}

export const LeaderboardPreview: React.FC = () => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data loading
        setTimeout(() => {
            setEntries([
                {
                    rank: 1,
                    username: 'TetrisGod',
                    rating: 2450,
                    tier: 'Grandmaster',
                    winRate: 89
                },
                {
                    rank: 2,
                    username: 'BlockMaster',
                    rating: 2380,
                    tier: 'Master',
                    winRate: 85
                },
                {
                    rank: 3,
                    username: 'LineClearer',
                    rating: 2290,
                    tier: 'Master',
                    winRate: 82
                },
                {
                    rank: 4,
                    username: 'SpeedDemon',
                    rating: 2180,
                    tier: 'Diamond',
                    winRate: 78
                },
                {
                    rank: 5,
                    username: 'PerfectClear',
                    rating: 2120,
                    tier: 'Diamond',
                    winRate: 75
                }
            ]);
            setLoading(false);
        }, 500);
    }, []);

    if (loading) {
        return (
            <div className="bg-gray-800/50 rounded-lg p-6">
                <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-gray-700 rounded"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-700 rounded w-1/3"></div>
                                <div className="h-3 bg-gray-700 rounded w-1/4"></div>
                            </div>
                            <div className="w-16 h-4 bg-gray-700 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 rounded-lg p-6">
            <div className="space-y-4">
                {entries.map((entry, index) => (
                    <div
                        key={entry.username}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700/75 transition-colors"
                    >
                        <div className="flex items-center space-x-4">
                            <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                                entry.rank === 1 ? 'bg-yellow-500 text-black' :
                                    entry.rank === 2 ? 'bg-gray-400 text-black' :
                                        entry.rank === 3 ? 'bg-orange-500 text-white' :
                                            'bg-gray-600 text-white'
                            )}>
                                {entry.rank}
                            </div>

                            <div>
                                <div className="text-white font-medium">{entry.username}</div>
                                <div className={cn('text-sm', getRankColor(entry.tier))}>
                                    {entry.tier}
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-white font-bold">{entry.rating.toLocaleString()}</div>
                            <div className="text-sm text-gray-400">{entry.winRate}% WR</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};