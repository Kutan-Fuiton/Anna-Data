import { useTheme } from '../../context/ThemeProvider';
import MealCard from '../../components/student/MealCard';
import LeaveCalendar from '../../components/student/LeaveCalendar';
import UpcomingLeaves from '../../components/student/UpcomingLeaves';

export default function StudentHome() {
    const { theme } = useTheme();

    // Get current date
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const formattedDate = today.toLocaleDateString('en-IN', options);

    // Calculate cutoff times (example: lunch at 10 AM, dinner at 5 PM)
    const lunchCutoff = new Date();
    lunchCutoff.setHours(10, 0, 0, 0);

    const dinnerCutoff = new Date();
    dinnerCutoff.setHours(17, 0, 0, 0);

    // Determine if mess is currently open (example: 7 AM - 10 PM)
    const currentHour = today.getHours();
    const isMessOpen = currentHour >= 7 && currentHour < 22;

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className={`text-sm font-medium uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-green-500' : 'text-green-600'
                        }`}>
                        WELCOME BACK
                    </p>
                    <h1 className={`text-4xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                        Ready for lunch, Rahul?
                    </h1>
                    <p className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
                        {formattedDate}
                    </p>
                </div>

                {/* Mess Status */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'
                    }`}>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${isMessOpen ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Mess is currently
                    </span>
                    <span className={`font-medium ${isMessOpen
                            ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                            : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                        }`}>
                        {isMessOpen ? 'Open' : 'Closed'}
                    </span>
                </div>
            </div>

            {/* Meal Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MealCard
                    type="lunch"
                    cutoffTime={lunchCutoff}
                    menu="Rajma Chawal, Roti, Salad"
                />
                <MealCard
                    type="dinner"
                    cutoffTime={dinnerCutoff}
                    menu="Paneer Butter Masala, Rice"
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
