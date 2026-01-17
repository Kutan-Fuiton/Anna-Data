import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeProvider';

interface MealCardProps {
    type: 'lunch' | 'dinner';
    cutoffTime: Date;
    menu?: string;
    isLocked?: boolean;
}

export default function MealCard({ type, cutoffTime, menu = 'Menu not available', isLocked = false }: MealCardProps) {
    const { theme } = useTheme();
    const [isEating, setIsEating] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [locked, setLocked] = useState(isLocked);

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const diff = cutoffTime.getTime() - now.getTime();

            if (diff <= 0) {
                setLocked(true);
                setTimeRemaining('Cutoff passed');
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
        const interval = setInterval(updateTimer, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [cutoffTime]);

    const handleToggle = () => {
        if (!locked) {
            setIsEating(!isEating);
        }
    };

    const mealIcon = type === 'lunch' ? '🍛' : '🍽️';
    const mealLabel = type === 'lunch' ? 'Lunch Today' : 'Dinner Today';

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
                        <span className="text-xl">{mealIcon}</span>
                    </div>
                    <div>
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {mealLabel}
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

            {/* Status and Menu */}
            <div className={`flex gap-4 pt-4 border-t ${theme === 'dark' ? 'border-green-900/30' : 'border-gray-100'
                }`}>
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
