import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getUpcomingLeaves, deleteLeaveRequest, type LeaveRequest } from '../../services/firestore';

interface UpcomingLeavesProps {
    refreshTrigger?: number;
}

export default function UpcomingLeaves({ refreshTrigger }: UpcomingLeavesProps) {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Fetch leaves on mount and when refreshTrigger changes
    useEffect(() => {
        async function fetchLeaves() {
            if (!user) return;
            setIsLoading(true);
            const data = await getUpcomingLeaves(user.uid);
            setLeaves(data);
            setIsLoading(false);
        }
        fetchLeaves();
    }, [user, refreshTrigger]);

    const formatDate = (date: Date) => {
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        return {
            month: months[date.getMonth()],
            day: date.getDate()
        };
    };

    const calculateDays = (start: Date, end: Date): number => {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    // Check if leave can be deleted (must be more than 24 hours before start)
    const canDelete = (leave: LeaveRequest): boolean => {
        const now = new Date();
        const hoursUntilLeave = (leave.startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntilLeave > 24; // Can only delete if more than 24 hours away
    };

    const handleDelete = async (leave: LeaveRequest) => {
        if (!leave.id) return;
        
        if (!canDelete(leave)) {
            showToast('Cannot cancel leave within 24 hours of start date. Contact admin.', 'error');
            return;
        }
        
        setDeletingId(leave.id);
        
        const result = await deleteLeaveRequest(leave.id);
        
        if (result.success) {
            setLeaves(leaves.filter(l => l.id !== leave.id));
            showToast('Leave cancelled successfully', 'success');
        } else {
            showToast('Failed to cancel leave: ' + result.error, 'error');
        }
        
        setDeletingId(null);
    };


    const totalDays = leaves.reduce((sum, leave) => sum + calculateDays(leave.startDate, leave.endDate), 0);

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
                {isLoading ? (
                    <div className="py-8 text-center">
                        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                            Loading...
                        </p>
                    </div>
                ) : leaves.length > 0 ? (
                    leaves.map((leave) => {
                        const { month, day } = formatDate(leave.startDate);
                        const days = calculateDays(leave.startDate, leave.endDate);
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
                                        {leave.reason || 'Planned Leave'}
                                    </p>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {days === 1 ? 'Single day' : `${days} days`}
                                    </p>
                                </div>

                                {/* Delete Button */}
                                <button
                                    onClick={() => handleDelete(leave)}
                                    disabled={deletingId === leave.id || !canDelete(leave)}
                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                                        ? 'text-red-400 hover:bg-red-500/10'
                                        : 'text-red-500 hover:bg-red-50'
                                        } ${deletingId === leave.id || !canDelete(leave) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title={!canDelete(leave) ? 'Cannot cancel within 24 hours of start' : 'Cancel leave'}
                                >
                                    {deletingId === leave.id ? '...' : '✕'}
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-8 text-center">
                        <span className="text-4xl mb-3 block">🎉</span>
                        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                            No upcoming leaves planned.
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            Use the calendar to plan leaves!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
