import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';

interface MatchmakingQueueProps {
    onMatchFound: () => void;
    onCancel: () => void;
    estimatedWait: number;
}

export const MatchmakingQueue: React.FC<MatchmakingQueueProps> = ({
    onMatchFound,
    onCancel,
    estimatedWait
}) => {
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [dots, setDots] = useState('');

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeElapsed(prev => prev + 1);
        }, 1000);

        const dotTimer = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);

        // Simulate match found after random time
        const matchTimer = setTimeout(() => {
            onMatchFound();
        }, Math.random() * 30000 + 10000); // 10-40 seconds

        return () => {
            clearInterval(timer);
            clearInterval(dotTimer);
            clearTimeout(matchTimer);
        };
    }, [onMatchFound]);

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
                <div className="mb-8">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Finding Match{dots}
                    </h2>
                    <p className="text-gray-400">
                        Searching for opponents of similar skill level
                    </p>
                </div>

                <div className="mb-8 text-white">
                    <div className="flex justify-between mb-2">
                        <span>Time Elapsed:</span>
                        <span>{Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Estimated Wait:</span>
                        <span>{Math.floor(estimatedWait / 60)}:{(estimatedWait % 60).toString().padStart(2, '0')}</span>
                    </div>
                </div>

                <Button
                    onClick={onCancel}
                    variant="outline"
                    className="w-full"
                >
                    Cancel Queue
                </Button>
            </div>
        </div>
    );
};