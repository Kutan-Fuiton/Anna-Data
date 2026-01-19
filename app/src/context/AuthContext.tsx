/**
 * Authentication Context
 * Provides Firebase authentication state and methods throughout the app
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
    type User,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// User role type
export type UserRole = 'student' | 'admin';

// Extended user data from Firestore
export interface UserData {
    uid: string;
    email: string;
    displayName: string | null;
    role: UserRole;
    points?: number;
    createdAt?: Date;
}

// Auth context type
interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string, role: UserRole) => Promise<boolean>;
    logout: () => Promise<void>;
    updateUserDisplayName: (name: string) => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch user data from Firestore
    const fetchUserData = async (firebaseUser: User): Promise<UserData | null> => {
        try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

            if (userDoc.exists()) {
                const data = userDoc.data();
                let displayName = data.displayName || firebaseUser.displayName;

                // Sync calculated name to backend if missing
                if (!displayName && firebaseUser.email) {
                    displayName = firebaseUser.email.split('@')[0]
                        .split(/[._]/)
                        .filter(part => isNaN(Number(part)))
                        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                        .join(' ');

                    // Save the calculated name to backend
                    await setDoc(doc(db, 'users', firebaseUser.uid), { displayName }, { merge: true });
                }

                return {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    displayName: displayName,
                    role: data.role || 'student',
                    points: data.points || 0,
                    createdAt: data.createdAt?.toDate(),
                };
            }

            // Calculate initial display name from email
            const fallbackName = firebaseUser.email
                ? firebaseUser.email.split('@')[0]
                    .split(/[._]/)
                    .filter(part => isNaN(Number(part)))
                    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                    .join(' ')
                : 'User';

            // If no user doc exists, create one with default role
            const newUserData: UserData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || fallbackName,
                role: 'student',
                points: 0,
            };

            await setDoc(doc(db, 'users', firebaseUser.uid), {
                ...newUserData,
                createdAt: new Date(),
            });

            return newUserData;
        } catch (err) {
            console.error('Error fetching user data:', err);
            return null;
        }
    };

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                const data = await fetchUserData(firebaseUser);
                setUserData(data);
            } else {
                setUserData(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Login function
    const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const result = await signInWithEmailAndPassword(auth, email, password);

            // Fetch or create user data
            const data = await fetchUserData(result.user);

            // Validate role: prevent students from logging in as admin and vice versa
            if (data && data.role !== role) {
                const message = role === 'admin'
                    ? "This account does not have Admin privileges. Please sign in as a Student."
                    : "Admin accounts must sign in using the Admin portal toggle.";
                setError(message);
                await firebaseSignOut(auth);
                setUser(null);
                setUserData(null);
                setLoading(false);
                return false;
            }

            setUserData(data);
            setLoading(false);
            return true;
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Login failed';

            // Friendly error messages
            if (errorMessage.includes('user-not-found')) {
                setError('No account found with this email');
            } else if (errorMessage.includes('wrong-password')) {
                setError('Incorrect password');
            } else if (errorMessage.includes('invalid-email')) {
                setError('Invalid email address');
            } else if (errorMessage.includes('too-many-requests')) {
                setError('Too many attempts. Please try again later');
            } else {
                setError('Login failed. Please check your credentials');
            }

            setLoading(false);
            return false;
        }
    };

    // Logout function
    const logout = async (): Promise<void> => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
            setUserData(null);
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    // Update display name
    const updateUserDisplayName = async (name: string): Promise<void> => {
        if (!user) return;

        try {
            await updateProfile(user, { displayName: name });
            await setDoc(doc(db, 'users', user.uid), { displayName: name }, { merge: true });

            setUserData(prev => prev ? { ...prev, displayName: name } : null);
        } catch (err) {
            console.error('Error updating display name:', err);
            throw err;
        }
    };

    const clearError = () => setError(null);

    return (
        <AuthContext.Provider
            value={{
                user,
                userData,
                loading,
                error,
                login,
                logout,
                updateUserDisplayName,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
