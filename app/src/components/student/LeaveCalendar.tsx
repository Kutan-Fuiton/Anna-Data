import { useState } from 'react';
import { useTheme } from '../../context/ThemeProvider';

export default function LeaveCalendar() {
    const { theme } = useTheme();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [selectionStart, setSelectionStart] = useState<Date | null>(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday start

        return { daysInMonth, startingDay, year, month };
    };

    const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentDate);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const isSelected = (day: number) => {
        const checkDate = new Date(year, month, day);
        return selectedDates.some(d =>
            d.getFullYear() === checkDate.getFullYear() &&
            d.getMonth() === checkDate.getMonth() &&
            d.getDate() === checkDate.getDate()
        );
    };

    const isToday = (day: number) => {
        return (
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day
        );
    };

    const isPast = (day: number) => {
        const checkDate = new Date(year, month, day);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate < today;
    };

    const handleDateClick = (day: number) => {
        if (isPast(day)) return;

        const clickedDate = new Date(year, month, day);

        if (!selectionStart) {
            setSelectionStart(clickedDate);
            setSelectedDates([clickedDate]);
        } else {
            // Create range
            const start = selectionStart < clickedDate ? selectionStart : clickedDate;
            const end = selectionStart < clickedDate ? clickedDate : selectionStart;

            const range: Date[] = [];
            const current = new Date(start);
            while (current <= end) {
                if (current >= today) {
                    range.push(new Date(current));
                }
                current.setDate(current.getDate() + 1);
            }

            setSelectedDates(range);
            setSelectionStart(null);
        }
    };

    const handleApplyLeave = () => {
        if (selectedDates.length > 0) {
            console.log('Applying leave for:', selectedDates);
            // TODO: API call to save leave
            alert(`Leave applied for ${selectedDates.length} day(s)`);
            setSelectedDates([]);
        }
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

    return (
        <div className={`rounded-2xl p-5 ${theme === 'dark'
            ? 'bg-[#151d17] border border-green-900/30'
            : 'bg-white border border-gray-200 shadow-sm'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Leave Planner
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        Select dates to mark as 'On Leave'
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={prevMonth}
                        className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                            ? 'hover:bg-white/10 text-gray-400'
                            : 'hover:bg-gray-100 text-gray-600'
                            }`}
                    >
                        ‹
                    </button>
                    <span className={`font-medium min-w-[140px] text-center ${theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        }`}>
                        {monthNames[month]} {year}
                    </span>
                    <button
                        onClick={nextMonth}
                        className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                            ? 'hover:bg-white/10 text-gray-400'
                            : 'hover:bg-gray-100 text-gray-600'
                            }`}
                    >
                        ›
                    </button>
                </div>
            </div>

            {/* Week Days Header */}
            <div className={`grid grid-cols-7 border-b ${theme === 'dark' ? 'border-green-900/40' : 'border-gray-200'
                }`}>
                {weekDays.map(day => (
                    <div key={day} className={`text-center text-xs font-semibold py-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className={`grid grid-cols-7 border-l ${theme === 'dark' ? 'border-green-900/40' : 'border-gray-200'
                }`}>
                {calendarDays.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => item.isCurrentMonth && handleDateClick(item.day)}
                        disabled={!item.isCurrentMonth || isPast(item.day)}
                        className={`
                            relative h-10 flex items-center justify-center text-sm font-semibold
                            transition-all duration-200 border-r border-b
                            ${theme === 'dark' ? 'border-green-900/40' : 'border-gray-200'}
                            ${!item.isCurrentMonth
                                ? theme === 'dark' ? 'text-gray-700 bg-transparent' : 'text-gray-300 bg-gray-50/50'
                                : isPast(item.day)
                                    ? theme === 'dark' ? 'text-gray-600' : 'text-gray-300'
                                    : isToday(item.day)
                                        ? 'bg-green-600 text-white font-bold'
                                        : isSelected(item.day)
                                            ? theme === 'dark'
                                                ? 'bg-green-800/60 text-green-300 font-bold'
                                                : 'bg-green-100 text-green-800 font-bold'
                                            : theme === 'dark'
                                                ? 'text-white hover:bg-green-900/30'
                                                : 'text-gray-800 hover:bg-gray-100'
                            }
                            ${!item.isCurrentMonth || isPast(item.day) ? 'cursor-default' : 'cursor-pointer'}
                        `}
                    >
                        {item.day}
                        {isToday(item.day) && (
                            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-medium">
                                Today
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Legend and Action */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-green-900/30">
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500" />
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Eating</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-green-900' : 'bg-green-200'
                            }`} />
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>On Leave</span>
                    </div>
                </div>
                <button
                    onClick={handleApplyLeave}
                    disabled={selectedDates.length === 0}
                    className={`text-sm font-medium transition-colors ${selectedDates.length > 0
                        ? 'text-green-500 hover:text-green-400'
                        : theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                        }`}
                >
                    Apply for Range
                </button>
            </div>
        </div>
    );
}
