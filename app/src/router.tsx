import { createBrowserRouter } from 'react-router-dom';
import Login from './pages/Login';
import StudentLayout from './components/layout/StudentLayout';
import StudentHome from './pages/student/StudentHome';
import MealReview from './pages/student/MealReview';
import MessPoints from './pages/student/MessPoints';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminInsights from './pages/admin/AdminInsights';
import AdminOperations from './pages/admin/AdminOperations';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Login />,
    },
    {
        path: '/student',
        element: <StudentLayout />,
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
    {
        path: '/admin',
        element: <AdminLayout />,
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
