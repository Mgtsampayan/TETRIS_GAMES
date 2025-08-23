import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export const Select: React.FC<SelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    disabled = false,
    className
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(option => option.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={selectRef} className={cn('relative w-full', className)}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    'w-full px-4 py-2 rounded-xl bg-gray-900 text-gray-100 border',
                    'border-gray-700 shadow-inner text-left font-mono relative',
                    'focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    isOpen && 'ring-2 ring-cyan-400 border-cyan-400'
                )}
            >
                <span className="block truncate">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className="absolute inset-y-0 right-3 flex items-center">
                    <svg
                        className={cn(
                            'w-5 h-5 text-cyan-300 transition-transform duration-200',
                            isOpen && 'rotate-180'
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full rounded-xl bg-gray-900 border border-cyan-400 shadow-lg overflow-hidden animate-slide-up">
                    <ul className="max-h-60 overflow-auto">
                        {options.map((option) => (
                            <li
                                key={option.value}
                                role="option"
                                aria-selected={option.value === value}
                                className={cn(
                                    'px-4 py-2 cursor-pointer transition-colors',
                                    option.value === value
                                        ? 'bg-cyan-500/20 text-cyan-300'
                                        : 'hover:bg-cyan-400/10 text-gray-200'
                                )}
                                onClick={() => handleSelect(option.value)}
                            >
                                {option.label}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
