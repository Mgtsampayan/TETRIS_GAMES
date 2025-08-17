'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import GameClient from '@/components/GameClient';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Gamepad2, Keyboard, ArrowDown, ArrowUp, ArrowLeft, ArrowRight, Space } from 'lucide-react';

export default function PlayPage() {
    const [gameStarted, setGameStarted] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState('guideline');

    if (gameStarted) {
        return <GameClient isMultiplayer={false} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-tetris-purple via-gray-900 to-tetris-blue flex items-center justify-center relative overflow-hidden">
            {/* Background grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 animate-pulse-slow" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="relative z-10 bg-white/10 backdrop-blur-xl rounded-2xl p-10 shadow-2xl max-w-md w-full border border-white/20 animate-fade-in"
            >
                <h1 className="text-4xl font-extrabold text-tetris-cyan mb-6 text-center font-game tracking-wide drop-shadow-lg flex items-center justify-center gap-2">
                    <Gamepad2 size={32} className="text-tetris-cyan" /> Single Player
                </h1>

                <div className="space-y-6">
                    {/* Game Mode Selection */}
                    <div className="animate-slide-up">
                        <label className="block text-white text-sm font-semibold mb-2">
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

                    {/* Controls */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-white text-sm"
                    >
                        <h3 className="font-semibold mb-3 flex items-center gap-2 text-tetris-yellow font-game">
                            <Keyboard size={18} /> Controls
                        </h3>
                        <ul className="space-y-2 text-gray-300">
                            <li className="flex items-center gap-2"><ArrowLeft size={16} /> <ArrowRight size={16} /> <span>- Move</span></li>
                            <li className="flex items-center gap-2"><ArrowUp size={16} /> <span>- Rotate</span></li>
                            <li className="flex items-center gap-2"><ArrowDown size={16} /> <span>- Soft Drop</span></li>
                            <li className="flex items-center gap-2"><Space size={16} /> <span>- Hard Drop</span></li>
                            <li className="flex items-center gap-2">C / Shift <span>- Hold</span></li>
                        </ul>
                    </motion.div>

                    {/* Start Button */}
                    <motion.div
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        className="animate-slide-up"
                    >
                        <Button
                            onClick={() => setGameStarted(true)}
                            className="w-full bg-tetris-cyan hover:bg-cyan-400 text-lg font-bold py-3 rounded-xl shadow-lg shadow-tetris-cyan/40 font-game animate-pulse-slow"
                        >
                            Start Game 🚀
                        </Button>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
