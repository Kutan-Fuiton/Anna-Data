/**
 * Protected Route Component
 * Redirects unauthenticated users to login
 * Optionally restricts access by role
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: UserRole;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { user, userData, loading } = useAuth();
    const location = useLocation();

    // Show loading state while checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Check role if required
    if (requiredRole && userData?.role !== requiredRole) {
        // Redirect to appropriate dashboard based on actual role
        const redirectPath = userData?.role === 'admin' ? '/admin' : '/student';
        return <Navigate to={redirectPath} replace />;
    }

    return <>{children}</>;
}
