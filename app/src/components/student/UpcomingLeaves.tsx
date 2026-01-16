import { useState } from 'react';
import { useTheme } from '../../context/ThemeProvider';

interface Leave {
    id: string;
    startDate: Date;
    endDate: Date;
    days: number;
}

export default function UpcomingLeaves() {
    const { theme } = useTheme();

    // Mock data - replace with actual data from API
    const [leaves, setLeaves] = useState<Leave[]>([
        {
            id: '1',
            startDate: new Date(2026, 0, 20),
            endDate: new Date(2026, 0, 20),
            days: 1
        },
        {
            id: '2',
            startDate: new Date(2026, 0, 25),
            endDate: new Date(2026, 0, 27),
            days: 3
        }
    ]);

    const formatDate = (date: Date) => {
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        return {
            month: months[date.getMonth()],
            day: date.getDate()
        };
    };

    const handleDelete = (id: string) => {
        setLeaves(leaves.filter(l => l.id !== id));
    };

    const handlePlanNew = () => {
        // Scroll to calendar or open modal
        console.log('Plan new leave');
    };

    const totalDays = leaves.reduce((sum, leave) => sum + leave.days, 0);

    return (
        <div className={`rounded-2xl p-5 ${theme === 'dark'
            ? 'bg-[#151d17] border border-green-900/30'
            : 'bg-white border border-gray-200 shadow-sm'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Upcoming Leaves
                </h3>
                <span className={`text-sm px-2 py-1 rounded-full ${theme === 'dark'
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-green-100 text-green-600'
                    }`}>
                    {totalDays} Days
                </span>
            </div>

            {/* Leave List */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
                {leaves.length > 0 ? (
                    leaves.map((leave) => {
                        const { month, day } = formatDate(leave.startDate);
                        return (
                            <div
                                key={leave.id}
                                className={`flex items-center gap-3 p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
                                    }`}
                            >
                                {/* Date Badge */}
                                <div className={`w-12 h-14 rounded-lg flex flex-col items-center justify-center ${theme === 'dark'
                                    ? 'bg-green-900/30 text-green-400'
                                    : 'bg-green-100 text-green-700'
                                    }`}>
                                    <span className="text-xs font-medium">{month}</span>
                                    <span className="text-xl font-bold">{day}</span>
                                </div>

                                {/* Leave Info */}
                                <div className="flex-1">
                                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        Planned Leave
                                    </p>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {leave.days === 1 ? 'Single day' : `${leave.days} days`}
                                    </p>
                                </div>

                                {/* Delete Button */}
                                <button
                                    onClick={() => handleDelete(leave.id)}
                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                                        ? 'text-red-400 hover:bg-red-500/10'
                                        : 'text-red-500 hover:bg-red-50'
                                        }`}
                                >
                                    ✕
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-8 text-center">
                        <span className="text-4xl mb-3 block">🎉</span>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            No other leaves planned.
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            Keep up the streak!
                        </p>
                    </div>
                )}
            </div>

            {/* Plan New Leave Button */}
            <button
                onClick={handlePlanNew}
                className={`w-full mt-4 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${theme === 'dark'
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
            >
                <span>+</span>
                Plan New Leave
            </button>
        </div>
    );
}
