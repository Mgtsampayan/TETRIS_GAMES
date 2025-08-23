import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
    children,
    className,
    variant = 'default',
    size = 'md',
    ...props
}) => {
    const variants = {
        default: `
        relative bg-gradient-to-r from-blue-600 to-blue-500 text-white 
        shadow-[0_0_10px_rgba(0,242,255,0.6)]
        hover:shadow-[0_0_20px_rgba(0,242,255,0.9)]
        hover:from-blue-500 hover:to-blue-400
        active:scale-95
    `,
        outline: `
        relative border-2 border-cyan-400 text-cyan-300
        hover:bg-cyan-400/20 
        shadow-[0_0_6px_rgba(0,242,255,0.5)]
        hover:shadow-[0_0_15px_rgba(0,242,255,0.8)]
        active:scale-95
    `,
        ghost: `
        relative text-gray-300 hover:text-white 
        hover:bg-white/10
        active:scale-95
    `,
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm rounded-lg',
        md: 'px-5 py-2.5 text-base rounded-xl',
        lg: 'px-6 py-3 text-lg rounded-2xl',
    };

    return (
        <button
            className={cn(
                'font-game transition-all duration-200 ease-out select-none',
                'focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};
