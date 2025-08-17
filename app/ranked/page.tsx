'use client';

import { JSX, useState } from 'react';
import GameClient from '@/components/GameClient';
import { RankDisplay } from '@/components/RankDisplay';
import { MatchmakingQueue } from '@/components/MatchmakingQueue';
import { Button } from '@/components/ui/Button';

// Props na ipapasa kay RankDisplay
export interface RankData {
    tier: string;
    division: number;
    stars: number;
    maxStars: number;
    mmr: number;
    winRate: number;
    gamesPlayed: number;
}

export default function RankedPage(): JSX.Element {
    const [isQueuing, setIsQueuing] = useState<boolean>(false);
    const [inGame, setInGame] = useState<boolean>(false);
    const [rankData] = useState<RankData>({
        tier: 'Bronze',
        division: 3,
        stars: 2,
        maxStars: 3,
        mmr: 1200,
        winRate: 65,
        gamesPlayed: 47,
    });

    if (inGame) {
        return <GameClient isMultiplayer={true} playerId="player1" />;
    }

    if (isQueuing) {
        return (
            <MatchmakingQueue
                onMatchFound={() => setInGame(true)}
                onCancel={() => setIsQueuing(false)}
                estimatedWait={30}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-8 text-center">
                    Ranked Mode
                </h1>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Rank Display */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <RankDisplay {...rankData} />

                        <div className="mt-6 text-white">
                            <h3 className="text-xl font-bold mb-4">Season Progress</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Games Played</span>
                                    <span>{rankData.gamesPlayed}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Win Rate</span>
                                    <span>{rankData.winRate}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Current MMR</span>
                                    <span>{rankData.mmr}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Queue Controls */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Find Match</h3>
                        <p className="text-gray-300 mb-6">
                            Battle against players of similar skill level to climb the ranked
                            ladder.
                        </p>

                        <Button
                            onClick={() => setIsQueuing(true)}
                            className="w-full bg-red-600 hover:bg-red-700 text-lg py-3"
                        >
                            Find Ranked Match
                        </Button>

                        <div className="mt-6 text-sm text-gray-400">
                            <h4 className="font-bold mb-2">Ranked Rules:</h4>
                            <ul className="space-y-1">
                                <li>• First to 5 KOs wins</li>
                                <li>• Guideline rules with 7-bag randomizer</li>
                                <li>• Garbage multiplier: Standard</li>
                                <li>• No pause allowed</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Recent Matches */}
                <div className="mt-8 bg-gray-800 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Recent Matches</h3>
                    <div className="space-y-2">
                        {/* Match history would go here */}
                        <div className="flex justify-between items-center py-2 border-b border-gray-700">
                            <span className="text-green-400">Victory</span>
                            <span className="text-white">vs. Player123</span>
                            <span className="text-gray-400">+15 MMR</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-700">
                            <span className="text-red-400">Defeat</span>
                            <span className="text-white">vs. ProGamer</span>
                            <span className="text-gray-400">-12 MMR</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-green-400">Victory</span>
                            <span className="text-white">vs. Speedster</span>
                            <span className="text-gray-400">+18 MMR</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
