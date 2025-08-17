import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface GameModeCardProps {
    title: string;
    description: string;
    icon: string;
    href: string;
    gradient: string;
    disabled?: boolean;
}

export const GameModeCard: React.FC<GameModeCardProps> = ({
    title,
    description,
    icon,
    href,
    gradient,
    disabled = false
}) => {
    const CardContent = () => (
        <div className={cn(
            'relative overflow-hidden rounded-lg p-6 h-48 transition-transform duration-200',
            'hover:scale-105 hover:shadow-xl',
            `bg-gradient-to-br ${gradient}`,
            disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
        )}>
            <div className="relative z-10 h-full flex flex-col">
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-white/90 text-sm flex-1">{description}</p>

                {disabled && (
                    <div className="absolute top-2 right-2 bg-gray-800/80 text-white px-2 py-1 rounded text-xs">
                        Coming Soon
                    </div>
                )}
            </div>

            {/* Animated background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-10 -translate-x-10"></div>
        </div>
    );

    if (disabled) {
        return <CardContent />;
    }

    return (
        <Link href={href}>
            <CardContent />
        </Link>
    );
};