import React from 'react';

interface RankDisplayProps {
    tier: string;
    division: number;
    stars: number;
    maxStars: number;
    mmr: number;
    winRate: number;
    gamesPlayed: number;
}

const TIER_COLORS = {
    Bronze: 'from-orange-600 to-orange-800',
    Silver: 'from-gray-400 to-gray-600',
    Gold: 'from-yellow-400 to-yellow-600',
    Platinum: 'from-cyan-400 to-cyan-600',
    Diamond: 'from-blue-400 to-blue-600',
    Master: 'from-purple-400 to-purple-600',
    Grandmaster: 'from-red-400 to-red-600'
};

export const RankDisplay: React.FC<RankDisplayProps> = ({
    tier,
    division,
    stars,
    maxStars,
    // mmr,
    // winRate,
    // gamesPlayed
}) => {
    const tierColor = TIER_COLORS[tier as keyof typeof TIER_COLORS] || TIER_COLORS.Bronze;

    return (
        <div className="text-center">
            {/* Rank Badge */}
            <div className={`mx-auto w-32 h-32 rounded-full bg-gradient-to-br ${tierColor} flex items-center justify-center mb-4 shadow-lg`}>
                <div className="text-white text-center">
                    <div className="text-2xl font-bold">{tier}</div>
                    <div className="text-lg">{division}</div>
                </div>
            </div>

            {/* Stars */}
            <div className="flex justify-center mb-4 space-x-1">
                {[...Array(maxStars)].map((_, i) => (
                    <div
                        key={i}
                        className={`w-6 h-6 ${i < stars
                            ? 'text-yellow-400'
                            : 'text-gray-600'
                            }`}
                    >
                        ★
                    </div>
                ))}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(stars / maxStars) * 100}%` }}
                ></div>
            </div>

            <p className="text-gray-300 text-sm">
                {stars}/{maxStars} stars to next division
            </p>
        </div>
    );
};