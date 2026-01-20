/**
 * AdminQRDisplay Component
 * Shows QR icon that expands to full-screen QR for student scanning
 */

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../../context/ThemeProvider';
import { generateQR, getCurrentMealType } from '../../services/qrApi';

interface AdminQRDisplayProps {
    className?: string;
}

export default function AdminQRDisplay({ className = '' }: AdminQRDisplayProps) {
    const { theme } = useTheme();
    const [isExpanded, setIsExpanded] = useState(false);
    const [qrData, setQrData] = useState<string | null>(null);
    const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Generate QR on mount
    useEffect(() => {
        async function loadQR() {
            setIsLoading(true);
            setError(null);
            
            const currentMeal = getCurrentMealType();
            setMealType(currentMeal);

            const result = await generateQR(currentMeal, false);
            
            if (result.success && result.qrData) {
                setQrData(result.qrData);
            } else {
                setError(result.error || 'Failed to generate QR');
            }
            
            setIsLoading(false);
        }
        loadQR();
    }, []);

    const handleMealChange = async (meal: 'breakfast' | 'lunch' | 'dinner') => {
        setMealType(meal);
        setIsLoading(true);
        setError(null);

        const result = await generateQR(meal, false);
        
        if (result.success && result.qrData) {
            setQrData(result.qrData);
        } else {
            setError(result.error || 'Failed to generate QR');
        }
        
        setIsLoading(false);
    };

    // Force refresh QR (generate a new one with different ID)
    const handleRefreshQR = async () => {
        setIsLoading(true);
        setError(null);

        const result = await generateQR(mealType, true); // forceRefresh = true
        
        if (result.success && result.qrData) {
            setQrData(result.qrData);
        } else {
            setError(result.error || 'Failed to refresh QR');
        }
        
        setIsLoading(false);
    };

    const formatMealName = (meal: string) => {
        return meal.charAt(0).toUpperCase() + meal.slice(1);
    };

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });

    return (
        <>
            {/* QR Icon Button */}
            <button
                onClick={() => setIsExpanded(true)}
                className={`relative p-2 rounded-xl transition-all hover:scale-105 ${
                    theme === 'dark'
                        ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                        : 'bg-green-100 hover:bg-green-200 text-green-600'
                } ${className}`}
                title="Show Attendance QR"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" 
                    />
                </svg>
                {/* Pulse indicator */}
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </button>

            {/* Full-screen Modal */}
            {isExpanded && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsExpanded(false)}
                    />

                    {/* Modal Content */}
                    <div className={`relative z-10 w-full max-w-md mx-4 rounded-2xl p-6 ${
                        theme === 'dark' 
                            ? 'bg-gradient-to-br from-[#1a241c] to-[#0f1410] border border-green-900/50' 
                            : 'bg-white shadow-2xl'
                    }`}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    Attendance QR
                                </h2>
                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {today}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className={`p-2 rounded-lg transition-colors ${
                                    theme === 'dark' 
                                        ? 'hover:bg-white/10 text-gray-400' 
                                        : 'hover:bg-gray-100 text-gray-500'
                                }`}
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Meal Type Selector */}
                        <div className="flex gap-2 mb-6">
                            {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                                <button
                                    key={meal}
                                    onClick={() => handleMealChange(meal)}
                                    disabled={isLoading}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                        mealType === meal
                                            ? 'bg-green-500 text-white'
                                            : theme === 'dark'
                                                ? 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {formatMealName(meal)}
                                </button>
                            ))}
                        </div>

                        {/* QR Code */}
                        <div className={`flex items-center justify-center p-6 rounded-xl ${
                            theme === 'dark' ? 'bg-white' : 'bg-gray-50'
                        }`}>
                            {isLoading ? (
                                <div className="w-64 h-64 flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : error ? (
                                <div className="w-64 h-64 flex flex-col items-center justify-center">
                                    <span className="text-red-500 text-4xl mb-2">⚠️</span>
                                    <p className="text-red-500 text-sm text-center">{error}</p>
                                </div>
                            ) : qrData ? (
                                <QRCodeSVG
                                    value={qrData}
                                    size={256}
                                    level="H"
                                    includeMargin={false}
                                    bgColor="transparent"
                                    fgColor="#000000"
                                />
                            ) : null}
                        </div>

                        {/* Instructions */}
                        <div className={`mt-4 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <p className="text-sm">
                                📱 Students scan this QR to mark their <span className="font-semibold text-green-500">{formatMealName(mealType)}</span> attendance
                            </p>
                        </div>

                        {/* Refresh Button */}
                        <button
                            onClick={handleRefreshQR}
                            disabled={isLoading}
                            className={`mt-4 w-full py-2 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                                theme === 'dark'
                                    ? 'bg-white/10 text-gray-300 hover:bg-white/20 disabled:opacity-50'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'
                            }`}
                        >
                            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isLoading ? 'Refreshing...' : 'Refresh QR (New Code)'}
                        </button>

                        {/* Active Status */}
                        <div className="mt-4 flex items-center justify-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                QR is active and ready for scanning
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
