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

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (disabled) return;

        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                setIsOpen(!isOpen);
                break;
            case 'Escape':
                setIsOpen(false);
                break;
            case 'ArrowDown':
                event.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                } else {
                    // Focus next option (simplified)
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (isOpen) {
                    // Focus previous option (simplified)
                }
                break;
        }
    };

    return (
        <div ref={selectRef} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className={cn(
                    'w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
                    isOpen && 'ring-2 ring-blue-500 border-blue-500'
                )}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-labelledby="select-label"
            >
                <span className="block truncate">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg
                        className={cn(
                            'w-5 h-5 text-gray-400 transition-transform',
                            isOpen && 'transform rotate-180'
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
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    <ul role="listbox" className="py-1">
                        {options.map((option) => (
                            <li
                                key={option.value}
                                role="option"
                                aria-selected={option.value === value}
                                className={cn(
                                    'px-3 py-2 cursor-pointer select-none hover:bg-blue-50',
                                    option.value === value && 'bg-blue-100 text-blue-900'
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