import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeProvider';

type MealType = 'breakfast' | 'lunch' | 'dinner';

interface MealCardProps {
    type: MealType;
    cutoffTime: Date;
    menu?: string;
    isEating: boolean;
    onToggle: (type: MealType, value: boolean) => void;
    onScanClick?: () => void;
}

export default function MealCard({ 
    type, 
    cutoffTime, 
    menu = 'Menu not available', 
    isEating,
    onToggle,
    onScanClick
}: MealCardProps) {
    const { theme } = useTheme();
    const [timeRemaining, setTimeRemaining] = useState('');
    // DEMO MODE: Never lock the toggle
    const locked = false;

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const diff = cutoffTime.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeRemaining('Always Open');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (hours > 0) {
                setTimeRemaining(`${hours}h ${minutes}m`);
            } else {
                setTimeRemaining(`${minutes}m`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000);

        return () => clearInterval(interval);
    }, [cutoffTime]);

    const handleToggle = () => {
        onToggle(type, !isEating);
    };

    const mealIcons: Record<MealType, string> = {
        breakfast: '🍳',
        lunch: '🍛',
        dinner: '🍽️',
    };

    const mealLabels: Record<MealType, string> = {
        breakfast: 'Breakfast Today',
        lunch: 'Lunch Today',
        dinner: 'Dinner Today',
    };

    return (
        <div className={`rounded-2xl p-5 ${theme === 'dark'
                ? 'bg-[#151d17] border border-green-900/30'
                : 'bg-white border border-gray-200 shadow-sm'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-green-900/50' : 'bg-green-100'
                        }`}>
                        <span className="text-xl">{mealIcons[type]}</span>
                    </div>
                    <div>
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {mealLabels[type]}
                        </h3>
                        <p className={`text-sm flex items-center gap-1 ${locked
                                ? theme === 'dark' ? 'text-red-400' : 'text-red-500'
                                : theme === 'dark' ? 'text-green-500' : 'text-green-600'
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${locked ? 'bg-red-500' : 'bg-green-500'}`} />
                            {locked ? 'Locked' : `Orders close in ${timeRemaining}`}
                        </p>
                    </div>
                </div>

                {/* Toggle Switch */}
                <button
                    onClick={handleToggle}
                    disabled={locked}
                    className={`relative w-14 h-8 rounded-full transition-all duration-300 ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        } ${isEating
                            ? 'bg-green-500'
                            : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                        }`}
                >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${isEating ? 'left-7' : 'left-1'
                        }`} />
                </button>
            </div>

            {/* Status, Scan Icon, and Menu */}
            <div className={`flex gap-4 pt-4 border-t ${theme === 'dark' ? 'border-green-900/30' : 'border-gray-100'
                }`}>
                {/* Status */}
                <div className="flex-1">
                    <p className={`text-xs uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                        STATUS
                    </p>
                    <p className={`font-semibold ${isEating
                            ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                            : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        {isEating ? 'Eating' : 'Skipped'}
                    </p>
                </div>

                {/* Scan QR Icon - Shows when Eating */}
                {isEating && onScanClick && (
                    <button
                        onClick={onScanClick}
                        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            theme === 'dark'
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                        title="Scan QR for Attendance"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" 
                            />
                        </svg>
                    </button>
                )}

                {/* Menu */}
                <div className="flex-1">
                    <p className={`text-xs uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                        MENU
                    </p>
                    <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                        {menu}
                    </p>
                </div>
            </div>
        </div>
    );
}
