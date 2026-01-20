/**
 * Unauthorized Access Page
 * Shown when user tries to access another user's URL
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStudentUrl, getAdminUrl } from '../utils/urlUtils';

export default function Unauthorized() {
    const navigate = useNavigate();
    const { user, userData, loading } = useAuth();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (loading) return;

        // If not logged in, go to login
        if (!user || !userData) {
            navigate('/', { replace: true });
            return;
        }

        // Countdown timer
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Redirect to user's correct URL based on role
                    const correctUrl = userData.role === 'admin' 
                        ? getAdminUrl(userData.displayName)
                        : getStudentUrl(userData.displayName);
                    navigate(correctUrl, { replace: true });
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [user, userData, loading, navigate]);

    const handleGoToMyPanel = () => {
        if (!userData) return;
        const correctUrl = userData.role === 'admin'
            ? getAdminUrl(userData.displayName)
            : getStudentUrl(userData.displayName);
        navigate(correctUrl, { replace: true });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
                <div className="text-6xl mb-4">🚫</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Access Denied
                </h1>
                <p className="text-gray-600 mb-6">
                    You don't have permission to access this page. 
                    This URL belongs to a different user.
                </p>
                
                <p className="text-sm text-gray-500 mb-4">
                    Redirecting to your panel in <span className="font-bold text-green-600">{countdown}</span> seconds...
                </p>

                <button
                    onClick={handleGoToMyPanel}
                    className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-500 transition-colors"
                >
                    Go to My Panel Now
                </button>
            </div>
        </div>
    );
}
