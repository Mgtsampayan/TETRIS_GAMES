/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    rank: {
        tier: string;
        division: number;
        stars: number;
        mmr: number;
    };
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    register: (username: string, email: string, password: string) => Promise<boolean>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        const savedUser = localStorage.getItem('tetris_user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (error) {
                console.error('Error parsing saved user:', error);
                localStorage.removeItem('tetris_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            // Mock authentication - in a real app, call your API
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

            const mockUser: User = {
                id: 'user_123',
                username: 'Player',
                email,
                rank: {
                    tier: 'Bronze',
                    division: 3,
                    stars: 2,
                    mmr: 1200
                }
            };

            setUser(mockUser);
            localStorage.setItem('tetris_user', JSON.stringify(mockUser));
            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (username: string, email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            // Mock registration
            await new Promise(resolve => setTimeout(resolve, 1000));

            const newUser: User = {
                id: 'user_' + Date.now(),
                username,
                email,
                rank: {
                    tier: 'Bronze',
                    division: 5,
                    stars: 0,
                    mmr: 1000
                }
            };

            setUser(newUser);
            localStorage.setItem('tetris_user', JSON.stringify(newUser));
            return true;
        } catch (error) {
            console.error('Registration error:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('tetris_user');
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            register,
            isLoading
        }}>
            {children}
        </AuthContext.Provider>
    );
}