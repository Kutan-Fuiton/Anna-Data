import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { createLeaveRequest, getUserLeaves, type LeaveRequest } from '../../services/firestore';

interface LeaveCalendarProps {
    onLeaveCreated?: () => void;
}

// Quick-select leave types with emojis
const LEAVE_TYPES = [
    { label: 'Home Visit', emoji: '🏠' },
    { label: 'Medical', emoji: '🏥' },
    { label: 'Festival', emoji: '🎉' },
    { label: 'Travel', emoji: '✈️' },
    { label: 'Family Event', emoji: '👨‍👩‍👧' },
    { label: 'Academic', emoji: '📚' },
];

export default function LeaveCalendar({ onLeaveCreated }: LeaveCalendarProps) {
    const { theme } = useTheme();
    const { user, userData } = useAuth();
    const { showToast } = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [selectionStart, setSelectionStart] = useState<Date | null>(null);
    const [existingLeaves, setExistingLeaves] = useState<LeaveRequest[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // New states for leave reason modal
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [leaveTitle, setLeaveTitle] = useState('');
    const [selectedType, setSelectedType] = useState<string | null>(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch existing leaves on mount
    useEffect(() => {
        async function fetchLeaves() {
            if (!user) return;
            const leaves = await getUserLeaves(user.uid);
            setExistingLeaves(leaves);
        }
        fetchLeaves();
    }, [user]);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        return { daysInMonth, startingDay, year, month };
    };

    const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentDate);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const isSelected = (day: number) => {
        const checkDate = new Date(year, month, day);
        return selectedDates.some(d =>
            d.getFullYear() === checkDate.getFullYear() &&
            d.getMonth() === checkDate.getMonth() &&
            d.getDate() === checkDate.getDate()
        );
    };

    const isOnLeave = (day: number) => {
        const checkDate = new Date(year, month, day);
        checkDate.setHours(0, 0, 0, 0);
        return existingLeaves.some(leave => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return checkDate >= start && checkDate <= end;
        });
    };

    const isToday = (day: number) => {
        return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    };

    const isPast = (day: number) => {
        const checkDate = new Date(year, month, day);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate < today;
    };

    const handleDateClick = (day: number) => {
        if (isPast(day) || isOnLeave(day)) return;

        const clickedDate = new Date(year, month, day);

        if (!selectionStart) {
            setSelectionStart(clickedDate);
            setSelectedDates([clickedDate]);
        } else {
            const start = selectionStart < clickedDate ? selectionStart : clickedDate;
            const end = selectionStart < clickedDate ? clickedDate : selectionStart;

            const range: Date[] = [];
            const current = new Date(start);
            while (current <= end) {
                if (current >= today && !isOnLeave(current.getDate())) {
                    range.push(new Date(current));
                }
                current.setDate(current.getDate() + 1);
            }

            setSelectedDates(range);
            setSelectionStart(null);
        }
    };

    const handleApplyClick = () => {
        if (selectedDates.length === 0) return;
        setShowReasonModal(true);
    };

    const handleTypeSelect = (type: string) => {
        setSelectedType(type);
        setLeaveTitle(type);
    };

    const handleSubmitLeave = async () => {
        if (selectedDates.length === 0 || !user) return;

        setIsSubmitting(true);
        
        const startDate = selectedDates[0];
        const endDate = selectedDates[selectedDates.length - 1];
        const reason = leaveTitle.trim() || 'Personal leave';
        // Use userData from Firestore (has displayName) instead of user from Firebase Auth
        const userName = userData?.displayName || user.displayName || 'Unknown';

        const result = await createLeaveRequest(user.uid, startDate, endDate, reason, userName);
        
        if (result.success) {
            showToast(`Leave applied: ${reason} (${selectedDates.length} days)`, 'success');
            const leaves = await getUserLeaves(user.uid);
            setExistingLeaves(leaves);
            setSelectedDates([]);
            setShowReasonModal(false);
            setLeaveTitle('');
            setSelectedType(null);
            onLeaveCreated?.();
        } else {
            showToast('Failed to apply leave: ' + result.error, 'error');
        }

        setIsSubmitting(false);
    };

    const handleCloseModal = () => {
        setShowReasonModal(false);
        setLeaveTitle('');
        setSelectedType(null);
    };

    // Generate calendar grid
    const calendarDays = [];
    for (let i = 0; i < startingDay; i++) {
        const prevMonthDay = new Date(year, month, 0).getDate() - startingDay + i + 1;
        calendarDays.push({ day: prevMonthDay, isCurrentMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push({ day, isCurrentMonth: true });
    }

    // Format date range for display
    const formatDateRange = () => {
        if (selectedDates.length === 0) return '';
        const start = selectedDates[0];
        const end = selectedDates[selectedDates.length - 1];
        const formatDate = (d: Date) => `${d.getDate()} ${monthNames[d.getMonth()].slice(0, 3)}`;
        if (selectedDates.length === 1) return formatDate(start);
        return `${formatDate(start)} - ${formatDate(end)}`;
    };

    return (
        <div className={`rounded-xl p-4 relative overflow-hidden ${theme === 'dark'
            ? 'bg-gradient-to-br from-[#151d17] to-[#0f1410] border border-green-900/30'
            : 'bg-white border border-gray-200 shadow-lg'
            }`}>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Leave Planner
                    </h3>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        Select dates to plan your leave
                    </p>
                </div>
                
                {/* Month Navigation */}
                <div className={`flex items-center gap-0.5 rounded-lg p-0.5 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}>
                    <button
                        onClick={prevMonth}
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-sm transition-all ${theme === 'dark'
                            ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                            : 'hover:bg-white text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        ‹
                    </button>
                    <span className={`font-medium text-xs min-w-[90px] text-center ${theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        }`}>
                        {monthNames[month].slice(0, 3)} {year}
                    </span>
                    <button
                        onClick={nextMonth}
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-sm transition-all ${theme === 'dark'
                            ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                            : 'hover:bg-white text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        ›
                    </button>
                </div>
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 mb-1">
                {weekDays.map(day => (
                    <div key={day} className={`text-center text-[10px] font-medium py-1 ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                        {day.charAt(0)}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((item, index) => {
                    const isCurrentDay = item.isCurrentMonth && isToday(item.day);
                    const isSelectedDay = item.isCurrentMonth && isSelected(item.day);
                    const isOnLeaveDay = item.isCurrentMonth && isOnLeave(item.day);
                    const isPastDay = item.isCurrentMonth && isPast(item.day);
                    
                    return (
                        <button
                            key={index}
                            onClick={() => item.isCurrentMonth && handleDateClick(item.day)}
                            disabled={!item.isCurrentMonth || isPastDay || isOnLeaveDay}
                            className={`
                                relative h-8 flex items-center justify-center
                                rounded-lg text-xs font-medium transition-all duration-200
                                ${!item.isCurrentMonth
                                    ? 'opacity-0 pointer-events-none'
                                    : isPastDay
                                        ? theme === 'dark' ? 'text-gray-700' : 'text-gray-300'
                                        : isCurrentDay
                                            ? 'bg-green-500 text-white shadow-md shadow-green-500/30'
                                            : isOnLeaveDay
                                                ? theme === 'dark'
                                                    ? 'bg-orange-500/20 text-orange-400'
                                                    : 'bg-orange-100 text-orange-600'
                                                : isSelectedDay
                                                    ? theme === 'dark'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-green-100 text-green-700'
                                                    : theme === 'dark'
                                                        ? 'text-gray-300 hover:bg-white/5'
                                                        : 'text-gray-700 hover:bg-gray-50'
                                }
                                ${!item.isCurrentMonth || isPastDay || isOnLeaveDay ? 'cursor-default' : 'cursor-pointer'}
                            `}
                        >
                            <span className={isCurrentDay ? 'font-bold text-[11px]' : ''}>{item.day}</span>
                            
                            {/* Today indicator - small dot */}
                            {isCurrentDay && (
                                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-white" />
                            )}
                            
                            {/* On Leave indicator dot */}
                            {isOnLeaveDay && !isCurrentDay && (
                                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-500" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legend and Action */}
            <div className={`flex items-center justify-between mt-4 pt-3 border-t ${
                theme === 'dark' ? 'border-white/10' : 'border-gray-100'
            }`}>
                <div className="flex items-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded ${theme === 'dark' ? 'bg-green-500/40' : 'bg-green-200'}`} />
                        <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>Selected</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded ${theme === 'dark' ? 'bg-orange-500/40' : 'bg-orange-200'}`} />
                        <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>On Leave</span>
                    </div>
                </div>
                
                <button
                    onClick={handleApplyClick}
                    disabled={selectedDates.length === 0}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedDates.length > 0
                            ? 'bg-green-500 text-white hover:bg-green-400 shadow-sm'
                            : theme === 'dark' 
                                ? 'bg-white/5 text-gray-600' 
                                : 'bg-gray-100 text-gray-400'
                    }`}
                >
                    {selectedDates.length > 0 
                        ? `Apply ${selectedDates.length}d` 
                        : 'Select'
                    }
                </button>
            </div>

            {/* Leave Reason Modal */}
            {showReasonModal && (
                <div className="absolute inset-0 flex items-end justify-center rounded-2xl overflow-hidden z-10">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={handleCloseModal}
                    />
                    
                    {/* Modal Content */}
                    <div 
                        className={`relative w-full rounded-t-2xl p-5 transform transition-transform duration-300 ${
                            theme === 'dark' 
                                ? 'bg-[#1a241c] border-t border-green-900/50' 
                                : 'bg-white border-t border-gray-200'
                        }`}
                        style={{ animation: 'slideUp 0.3s ease-out' }}
                    >
                        {/* Handle bar */}
                        <div className="flex justify-center mb-4">
                            <div className={`w-10 h-1 rounded-full ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`} />
                        </div>

                        {/* Date Summary */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className={`text-xs uppercase tracking-wide ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Selected Period
                                </p>
                                <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {formatDateRange()} • {selectedDates.length} day{selectedDates.length > 1 ? 's' : ''}
                                </p>
                            </div>
                            <button 
                                onClick={handleCloseModal}
                                className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Quick Select Chips */}
                        <div className="mb-4">
                            <p className={`text-xs uppercase tracking-wide mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                Quick Select
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {LEAVE_TYPES.map((type) => (
                                    <button
                                        key={type.label}
                                        onClick={() => handleTypeSelect(type.label)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                            selectedType === type.label
                                                ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                                                : theme === 'dark'
                                                    ? 'bg-white/10 text-gray-300 hover:bg-white/20'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {type.emoji} {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Title Input */}
                        <div className="mb-4">
                            <p className={`text-xs uppercase tracking-wide mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                Leave Title
                            </p>
                            <input
                                type="text"
                                value={leaveTitle}
                                onChange={(e) => {
                                    setLeaveTitle(e.target.value);
                                    setSelectedType(null);
                                }}
                                placeholder="Enter a custom title..."
                                className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                                    theme === 'dark'
                                        ? 'bg-white/5 border border-green-900/30 text-white placeholder-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500/30'
                                        : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-200'
                                } outline-none`}
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmitLeave}
                            disabled={isSubmitting}
                            className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all ${
                                isSubmitting
                                    ? 'bg-green-700 opacity-70'
                                    : 'bg-green-500 hover:bg-green-400 shadow-lg shadow-green-500/20'
                            }`}
                        >
                            {isSubmitting ? 'Applying...' : `Apply for Leave`}
                        </button>
                    </div>

                    {/* Animation */}
                    <style>{`
                        @keyframes slideUp {
                            from {
                                transform: translateY(100%);
                            }
                            to {
                                transform: translateY(0);
                            }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
