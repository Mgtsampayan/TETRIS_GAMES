'use client';

import { useState, useEffect } from 'react';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { Button } from '@/components/ui/Button';

type LeaderboardType = 'global' | 'friends' | 'sprint' | 'ultra';

interface LeaderboardEntry {
    rank: number;
    username: string;
    rating: number;
    gamesPlayed: number;
    winRate: number;
    tier: string;
    avatar?: string;
}

export default function LeaderboardsPage() {
    const [activeTab, setActiveTab] = useState<LeaderboardType>('global');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock leaderboard data
        setLoading(true);
        setTimeout(() => {
            setLeaderboard([
                {
                    rank: 1,
                    username: 'TetrisGod',
                    rating: 2450,
                    gamesPlayed: 1250,
                    winRate: 89,
                    tier: 'Grandmaster'
                },
                {
                    rank: 2,
                    username: 'BlockMaster',
                    rating: 2380,
                    gamesPlayed: 890,
                    winRate: 85,
                    tier: 'Master'
                },
                {
                    rank: 3,
                    username: 'LineClearer',
                    rating: 2290,
                    gamesPlayed: 670,
                    winRate: 82,
                    tier: 'Master'
                },
                // ... more entries
            ]);
            setLoading(false);
        }, 500);
    }, [activeTab]);

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-8 text-center">
                    Leaderboards
                </h1>

                {/* Tab Navigation */}
                <div className="flex justify-center mb-8">
                    <div className="bg-gray-800 rounded-lg p-1 flex">
                        {[
                            { key: 'global', label: 'Global' },
                            { key: 'friends', label: 'Friends' },
                            { key: 'sprint', label: 'Sprint' },
                            { key: 'ultra', label: 'Ultra' }
                        ].map(({ key, label }) => (
                            <Button
                                key={key}
                                variant={activeTab === key ? 'default' : 'ghost'}
                                onClick={() => setActiveTab(key as LeaderboardType)}
                                className={`mx-1 ${activeTab === key ? 'bg-blue-600' : 'text-gray-300'}`}
                            >
                                {label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Leaderboard Table */}
                <LeaderboardTable
                    entries={leaderboard}
                    loading={loading}
                    type={activeTab}
                />
            </div>
        </div>
    );
}