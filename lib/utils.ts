import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatTime(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);

    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

export function formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
}

export function calculatePPS(lines: number, timeMs: number): number {
    if (timeMs === 0) return 0;
    return (lines * 1000) / timeMs;
}

export function getRankColor(tier: string): string {
    const colors = {
        Bronze: 'text-orange-500',
        Silver: 'text-gray-400',
        Gold: 'text-yellow-400',
        Platinum: 'text-cyan-400',
        Diamond: 'text-blue-400',
        Master: 'text-purple-400',
        Grandmaster: 'text-red-400'
    };
    return colors[tier as keyof typeof colors] || 'text-gray-400';
}

export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}