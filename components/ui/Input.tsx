import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
}

export const Input: React.FC<InputProps> = ({
    className,
    error,
    ...props
}) => {
    return (
        <div className="w-full">
            <input
                className={cn(
                    'w-full px-3 py-2 border rounded-md shadow-sm',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    'disabled:bg-gray-50 disabled:text-gray-500',
                    error ? 'border-red-500' : 'border-gray-300',
                    className
                )}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
};