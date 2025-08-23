import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
}

export const Input: React.FC<InputProps> = ({ className, error, ...props }) => {
    return (
        <div className="w-full">
            <input
                className={cn(
                    'w-full px-4 py-2 rounded-xl bg-gray-900 text-gray-100',
                    'border border-gray-700 shadow-inner',
                    'focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400',
                    'placeholder-gray-500 font-mono',
                    error && 'border-red-500 ring-red-400 focus:ring-red-400',
                    className
                )}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-red-400 animate-pulse">{error}</p>
            )}
        </div>
    );
};
