import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import StudentLayout from './components/layout/StudentLayout';
import StudentHome from './pages/student/StudentHome';
import MealReview from './pages/student/MealReview';
import MessPoints from './pages/student/MessPoints';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminInsights from './pages/admin/AdminInsights';
import AdminOperations from './pages/admin/AdminOperations';
import { ProtectedRoute, PublicRoute } from './components/RouteGuards';

export const router = createBrowserRouter([
    // Login page
    {
        path: '/',
        element: (
            <PublicRoute>
                <Login />
            </PublicRoute>
        ),
    },
    // Unauthorized access page
    {
        path: '/unauthorized',
        element: <Unauthorized />,
    },
    // Legacy routes - redirect to login (for bookmarks)
    {
        path: '/student',
        element: <Navigate to="/" replace />,
    },
    {
        path: '/admin',
        element: <Navigate to="/" replace />,
    },
    // Student routes: /:username/*
    {
        path: '/:username',
        element: (
            <ProtectedRoute requiredRole="student">
                <StudentLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <StudentHome />,
            },
            {
                path: 'meal-review',
                element: <MealReview />,
            },
            {
                path: 'mess-points',
                element: <MessPoints />,
            },
        ],
    },
    // Admin routes: /:username/admin/*
    {
        path: '/:username/admin',
        element: (
            <ProtectedRoute requiredRole="admin">
                <AdminLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <AdminDashboard />,
            },
            {
                path: 'insights',
                element: <AdminInsights />,
            },
            {
                path: 'operations',
                element: <AdminOperations />,
            },
        ],
    },
]);
