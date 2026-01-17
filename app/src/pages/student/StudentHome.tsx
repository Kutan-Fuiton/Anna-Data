import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { submitMealIntent, getMealIntents } from '../../services/firestore';
import MealCard from '../../components/student/MealCard';
import LeaveCalendar from '../../components/student/LeaveCalendar';
import UpcomingLeaves from '../../components/student/UpcomingLeaves';

export default function StudentHome() {
    const { theme } = useTheme();
    const { user, userData } = useAuth();
    const [mealIntents, setMealIntents] = useState({
        breakfast: true,
        lunch: true,
        dinner: true
    });
    const [isLoading, setIsLoading] = useState(true);

    // Get current date
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const formattedDate = today.toLocaleDateString('en-IN', options);

    // Fetch existing intent on mount
    useEffect(() => {
        async function fetchIntents() {
            if (!user) return;
            setIsLoading(true);
            try {
                const start = new Date(today);
                start.setHours(0, 0, 0, 0);
                const end = new Date(today);
                end.setHours(23, 59, 59, 999);

                const intents = await getMealIntents(user.uid, start, end);
                if (intents.length > 0) {
                    setMealIntents(intents[0].meals);
                }
            } catch (error) {
                console.error('Error fetching meal intents:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchIntents();
    }, [user]);

    const handleToggleIntent = async (type: 'breakfast' | 'lunch' | 'dinner', value: boolean) => {
        if (!user) return;

        const newIntents = { ...mealIntents, [type]: value };
        setMealIntents(newIntents);

        try {
            await submitMealIntent({
                userId: user.uid,
                date: today,
                meals: newIntents
            });
        } catch (error) {
            console.error('Error saving meal intent:', error);
            setMealIntents(mealIntents);
            alert('Failed to save choice. Please try again.');
        }
    };

    // Dynamic greeting based on time of day
    const getGreeting = () => {
        const hour = today.getHours();
        if (hour < 12) return 'Ready for breakfast';
        if (hour < 17) return 'Ready for lunch';
        return 'Ready for dinner';
    };

    const getFormattedName = () => {
        if (userData?.displayName) return userData.displayName;
        const fallback = userData?.email?.split('@')[0] || user?.email?.split('@')[0] || 'Student';
        return fallback
            .split(/[._]/)
            .filter(part => isNaN(Number(part)))
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    };

    const userName = getFormattedName();

    // Calculate cutoff times
    const breakfastCutoff = new Date(today);
    breakfastCutoff.setHours(7, 30, 0, 0);

    const lunchCutoff = new Date(today);
    lunchCutoff.setHours(10, 30, 0, 0);

    const dinnerCutoff = new Date(today);
    dinnerCutoff.setHours(17, 30, 0, 0);

    const isMessOpen = today.getHours() >= 7 && today.getHours() < 22;

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className={`text-sm font-medium uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-green-500' : 'text-green-600'}`}>
                        WELCOME BACK
                    </p>
                    <h1 className={`text-4xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {getGreeting()}, {userName}?
                    </h1>
                    <p className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
                        {formattedDate}
                    </p>
                </div>

                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${isMessOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Mess is {isMessOpen ? 'Open' : 'Closed'}
                    </span>
                </div>
            </div>

            {/* Meal Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MealCard
                    type="breakfast"
                    cutoffTime={breakfastCutoff}
                    menu="Aloo Paratha, Curd, Tea"
                    isEating={mealIntents.breakfast}
                    onToggle={handleToggleIntent}
                />
                <MealCard
                    type="lunch"
                    cutoffTime={lunchCutoff}
                    menu="Rajma Chawal, Roti, Salad"
                    isEating={mealIntents.lunch}
                    onToggle={handleToggleIntent}
                />
                <MealCard
                    type="dinner"
                    cutoffTime={dinnerCutoff}
                    menu="Paneer Butter Masala, Rice"
                    isEating={mealIntents.dinner}
                    onToggle={handleToggleIntent}
                />
            </div>

            {/* Leave Planner Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <LeaveCalendar />
                </div>
                <div>
                    <UpcomingLeaves />
                </div>
            </div>
        </div>
    );
}
