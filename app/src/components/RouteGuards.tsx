/**
 * Route Guards
 * Protect routes and validate username in URL matches logged-in user
 */

import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { nameToSlug } from '../utils/urlUtils';

interface RouteGuardProps {
    children: React.ReactNode;
    requiredRole?: 'student' | 'admin';
}

/**
 * Protected Route Guard
 * - Checks if user is authenticated
 * - Validates URL username matches logged-in user
 * - For admin routes: only admins can access
 * - For student routes: both students AND admins can access
 */
export function ProtectedRoute({ children, requiredRole }: RouteGuardProps) {
    const { user, userData, loading } = useAuth();
    const { username } = useParams<{ username: string }>();

    // Still loading auth state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Not logged in
    if (!user || !userData) {
        return <Navigate to="/" replace />;
    }

    // Check if URL username matches logged-in user
    const expectedSlug = nameToSlug(userData.displayName);
    if (username && username !== expectedSlug) {
        return <Navigate to="/unauthorized" replace />;
    }

    // For admin routes: only admins can access
    // For student routes: both students AND admins can access (admins can view student panel)
    if (requiredRole === 'admin' && userData.role !== 'admin') {
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
}

/**
 * Public Route Guard
 * Redirects authenticated users to their panel
 */
export function PublicRoute({ children }: { children: React.ReactNode }) {
    const { user, userData, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // If already logged in, redirect to their panel
    if (user && userData) {
        const slug = nameToSlug(userData.displayName);
        const redirectUrl = userData.role === 'admin' ? `/${slug}/admin` : `/${slug}`;
        return <Navigate to={redirectUrl} replace />;
    }

    return <>{children}</>;
}
