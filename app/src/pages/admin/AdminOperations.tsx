import { useState, useEffect } from 'react';
import AdminQRDisplay from '../../components/admin/AdminQRDisplay';
import LiveAttendance from '../../components/admin/LiveAttendance';
import { useAuth } from '../../context/AuthContext';
import * as firestore from '../../services/firestore';
import type { DayAttendanceStats, MealTimeSettings } from '../../services/firestore';

const { getAllLeaves, get7DayAttendance, getMealTimeSettings, updateMealTimeSettings, DEFAULT_MEAL_TIME_SETTINGS } = firestore;

type ActiveTab = 'attendance' | 'points' | 'reports';

interface AdminLeaveDisplay {
    id: string;
    studentName: string;
    reason: string;
    startDate: string;
    endDate: string;
    days: number;
    status: 'active' | 'upcoming';
}

interface NoShowStudent {
    id: string;
    name: string;
    room: string;
    noShowCount: number;
    lastNoShow: string;
    pointsDeducted: number;
}

interface Reward {
    id: string;
    name: string;
    cost: number;
    available: boolean;
    redeemed: number;
}

export default function AdminOperations() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<ActiveTab>('attendance');
    const [activeLeaves, setActiveLeaves] = useState<AdminLeaveDisplay[]>([]);
    const [forecast, setForecast] = useState<DayAttendanceStats[]>([]);
    const [mealTimeSettings, setMealTimeSettings] = useState<MealTimeSettings>(DEFAULT_MEAL_TIME_SETTINGS);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [settingsSaved, setSettingsSaved] = useState(false);
    const [isRefreshingForecast, setIsRefreshingForecast] = useState(false);

    const fetchForecast = async () => {
        setIsRefreshingForecast(true);
        try {
            const data = await get7DayAttendance();
            setForecast(data);
        } catch (error) {
            console.error('Error fetching forecast:', error);
        } finally {
            setIsRefreshingForecast(false);
        }
    };

    // Fetch 7-day attendance forecast
    useEffect(() => {
        fetchForecast();
    }, []);

    // Fetch meal time settings
    useEffect(() => {
        async function fetchSettings() {
            try {
                const settings = await getMealTimeSettings();
                setMealTimeSettings(settings);
            } catch (error) {
                console.error('Error fetching meal time settings:', error);
            }
        }
        fetchSettings();
    }, []);

    // Fetch leaves from Firestore
    useEffect(() => {
        async function fetchLeaves() {
            try {
                const leaves = await getAllLeaves();
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const formatted: AdminLeaveDisplay[] = leaves
                    .filter(leave => leave.id) // Only include leaves with valid ID
                    .map((leave) => {
                        const startDate = new Date(leave.startDate);
                        const endDate = new Date(leave.endDate);
                        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                        // Determine status: active if today is between start and end, upcoming if in future
                        let status: 'active' | 'upcoming' = 'upcoming';
                        if (today >= startDate && today <= endDate) {
                            status = 'active';
                        }

                        // Get userName from the leave data (stored as reason or name field)
                        const studentName = leave.userName || 'Unknown';

                        return {
                            id: leave.id!,
                            studentName,
                            reason: leave.reason || 'Personal leave',
                            startDate: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            endDate: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            days,
                            status,
                        };
                    })
                    .filter(l => {
                        // Filter to only show active and upcoming (not past)
                        const leave = leaves.find(x => x.id === l.id);
                        if (!leave) return false;
                        const endDate = new Date(leave.endDate);
                        return endDate >= today;
                    });

                setActiveLeaves(formatted);
            } catch (error) {
                console.error('Error fetching leaves:', error);
            }
        }
        fetchLeaves();
    }, []);

    // No-Show Students
    const noShowStudents: NoShowStudent[] = [
        { id: '1', name: 'Rajesh Kumar', room: '301-A', noShowCount: 5, lastNoShow: 'Jan 15', pointsDeducted: 250 },
        { id: '2', name: 'Anita Sharma', room: '207-B', noShowCount: 3, lastNoShow: 'Jan 14', pointsDeducted: 150 },
        { id: '3', name: 'Suresh Patel', room: '405-C', noShowCount: 2, lastNoShow: 'Jan 16', pointsDeducted: 100 },
    ];

    // Point Rules
    const pointRules = [
        { action: 'Meal Attendance', points: '+10', editable: true },
        { action: 'No-Show Penalty', points: '-50', editable: true },
        { action: 'Late Leave Cancel', points: '-30', editable: true },
        { action: 'Weekly Feedback Bonus', points: '+25', editable: true },
        { action: 'Streak Bonus (7 days)', points: '+50', editable: true },
    ];

    // Rewards
    const rewards: Reward[] = [
        { id: '1', name: 'Extra Dessert', cost: 100, available: true, redeemed: 45 },
        { id: '2', name: 'Fast Pass', cost: 200, available: true, redeemed: 23 },
        { id: '3', name: 'Special Menu Item', cost: 500, available: true, redeemed: 8 },
        { id: '4', name: 'Free Meal Day', cost: 1000, available: false, redeemed: 2 },
    ];

    const handleApproveLeave = async (leaveId: string) => {
        try {
            await firestore.approveLeaveRequest(leaveId);
            alert('Leave approved and points awarded!');
        } catch (error) {
            console.error('Error approving leave:', error);
        }
    };

    const handleNoShowPenalty = async (userId: string) => {
        if (confirm('Deduct 10 points for no-show?')) {
            try {
                await firestore.flagNoShow(userId);
                alert('Points deducted successfully');
            } catch (error) {
                console.error('Error deducting points:', error);
            }
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Operations & Control</h1>
                        <p className="text-sm text-gray-500">Manage attendance, points, and generate reports</p>
                    </div>
                    {/* QR Code Display for Attendance - Hidden on mobile, shown in its own section below */}
                    <div className="hidden sm:block">
                        <AdminQRDisplay />
                    </div>
                </div>
                {/* QR Code Display - Centered on mobile */}
                <div className="sm:hidden flex justify-center">
                    <AdminQRDisplay className="w-full max-w-xs" />
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-1 mb-6 bg-white border border-gray-200 p-1 w-fit">
                {[
                    { key: 'attendance', label: '📅 Attendance & Leaves', },
                    { key: 'points', label: '⭐ Points & Rewards', },
                    { key: 'reports', label: '📊 Reports & Export', },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as ActiveTab)}
                        className={`px-5 py-2.5 text-sm font-medium transition-colors ${activeTab === tab.key
                            ? 'bg-[#0d2137] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Attendance & Leaves Tab */}
            {activeTab === 'attendance' && (
                <div className="space-y-6">
                    {/* Real-time Attendance */}
                    <LiveAttendance />

                    {/* Forecast Table */}
                    <div className="bg-white border border-gray-200 p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">7-Day Attendance History</h3>
                            <button
                                onClick={fetchForecast}
                                disabled={isRefreshingForecast}
                                className={`text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                                    isRefreshingForecast 
                                        ? 'bg-gray-100 text-gray-400' 
                                        : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                                }`}
                            >
                                <svg 
                                    className={`w-3.5 h-3.5 ${isRefreshingForecast ? 'animate-spin' : ''}`} 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {isRefreshingForecast ? 'Refreshing...' : 'Refresh History'}
                            </button>
                        </div>
                        <div className="overflow-x-auto -mx-4 sm:mx-0 pb-2">
                            <div className="grid grid-cols-7 gap-2 min-w-[650px]">
                                {forecast.map((day) => {
                                    const isToday = day.displayDate === 'Today';
                                    return (
                                        <div key={day.date} className={`p-3 text-center border ${isToday ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                                            }`}>
                                            <p className={`text-xs font-medium ${isToday ? 'text-teal-600' : 'text-gray-500'}`}>
                                                {day.dayName}
                                            </p>
                                            <p className="text-sm font-semibold text-gray-900">{day.displayDate}</p>
                                            <div className="mt-2 space-y-1">
                                                <p className="text-xs text-gray-500">🍳 {day.breakfast}</p>
                                                <p className="text-xs text-gray-500">🍛 {day.lunch}</p>
                                                <p className="text-xs text-gray-500">🍽️ {day.dinner}</p>
                                            </div>
                                            <p className="mt-1 text-xs font-medium text-gray-700">Total: {day.total}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Active Leaves */}
                        <div className="bg-white border border-gray-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900">Active & Upcoming Leaves</h3>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1">{activeLeaves.length} total</span>
                            </div>
                            <div className="space-y-2">
                                {activeLeaves.map((leave) => (
                                    <div key={leave.id} className="flex items-center justify-between p-3 border border-gray-100 hover:bg-gray-50">
                                        <div>
                                            <p className="font-medium text-gray-900">{leave.studentName}</p>
                                            <p className="text-xs text-gray-500">{leave.reason} • {leave.startDate} - {leave.endDate}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-0.5 ${leave.status === 'active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {leave.days}d • {leave.status}
                                            </span>
                                            <button
                                                onClick={() => handleApproveLeave(leave.id)}
                                                className="text-xs text-green-600 hover:text-green-700 font-medium"
                                            >
                                                Approve
                                            </button>
                                            <button className="text-xs text-red-600 hover:text-red-700">Cancel</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* No-Show Detection */}
                        <div className="bg-white border border-gray-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900">No-Show Detection</h3>
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1">{noShowStudents.length} flagged</span>
                            </div>
                            <div className="space-y-2">
                                {noShowStudents.map((student) => (
                                    <div key={student.id} className="flex items-center justify-between p-3 border border-red-100 bg-red-50">
                                        <div>
                                            <p className="font-medium text-gray-900">{student.name}</p>
                                            <p className="text-xs text-gray-500">Room {student.room} • Last: {student.lastNoShow}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-red-600">{student.noShowCount}x no-shows</p>
                                                <p className="text-xs text-gray-500">-{student.pointsDeducted} pts</p>
                                            </div>
                                            <button
                                                onClick={() => handleNoShowPenalty(student.id)}
                                                className="text-xs bg-red-500 text-white border border-red-600 px-2 py-1 hover:bg-red-600"
                                            >
                                                Deduct 10
                                            </button>
                                            <button className="text-xs bg-white border border-gray-200 px-2 py-1 hover:bg-gray-50">
                                                Override
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Points & Rewards Tab */}
            {activeTab === 'points' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Point Rules */}
                    <div className="bg-white border border-gray-200 p-5">
                        <h3 className="font-semibold text-gray-900 mb-4">Point Rules Configuration</h3>
                        <div className="space-y-3">
                            {pointRules.map((rule, i) => (
                                <div key={i} className="flex items-center justify-between p-3 border border-gray-100">
                                    <span className="text-gray-700">{rule.action}</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            defaultValue={rule.points}
                                            className={`w-20 text-center text-sm font-semibold p-1 border border-gray-200 ${rule.points.startsWith('+') ? 'text-green-600' : 'text-red-600'
                                                }`}
                                        />
                                        <button className="text-xs text-teal-600 hover:text-teal-700">Save</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="mt-4 text-sm text-teal-600 hover:text-teal-700 font-medium">
                            + Add New Rule
                        </button>
                    </div>

                    {/* Manage Rewards */}
                    <div className="bg-white border border-gray-200 p-5">
                        <h3 className="font-semibold text-gray-900 mb-4">Manage Rewards</h3>
                        <div className="space-y-3">
                            {rewards.map((reward) => (
                                <div key={reward.id} className="flex items-center justify-between p-3 border border-gray-100">
                                    <div>
                                        <p className="font-medium text-gray-900">{reward.name}</p>
                                        <p className="text-xs text-gray-500">{reward.cost} pts • {reward.redeemed} redeemed</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className={`text-xs px-3 py-1 ${reward.available
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {reward.available ? 'Active' : 'Disabled'}
                                        </button>
                                        <button className="text-xs text-gray-500 hover:text-gray-700">Edit</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="mt-4 text-sm text-teal-600 hover:text-teal-700 font-medium">
                            + Add New Reward
                        </button>
                    </div>

                    {/* Repeat No-Shows */}
                    <div className="lg:col-span-2 bg-white border border-gray-200 p-4 sm:p-5">
                        <h3 className="font-semibold text-gray-900 mb-4">Repeat Offenders (3+ No-Shows This Month)</h3>
                        <div className="overflow-x-auto -mx-4 sm:mx-0">
                            <table className="w-full min-w-[500px]">
                                <thead>
                                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        <th className="pb-3">Student</th>
                                        <th className="pb-3">Room</th>
                                        <th className="pb-3">No-Shows</th>
                                        <th className="pb-3">Points Lost</th>
                                        <th className="pb-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {noShowStudents.map((student) => (
                                        <tr key={student.id} className="border-t border-gray-100">
                                            <td className="py-3 font-medium text-gray-900">{student.name}</td>
                                            <td className="py-3 text-gray-500">{student.room}</td>
                                            <td className="py-3 text-red-600 font-semibold">{student.noShowCount}</td>
                                            <td className="py-3 text-gray-500">-{student.pointsDeducted}</td>
                                            <td className="py-3">
                                                <button className="text-xs bg-amber-100 text-amber-700 px-2 py-1 mr-2">Warn</button>
                                                <button className="text-xs bg-white border border-gray-200 px-2 py-1">Adjust</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Meal Time Windows */}
                    <div className="lg:col-span-2 bg-white border border-gray-200 p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-gray-900">⏰ Meal Time Windows</h3>
                                <p className="text-xs text-gray-500">Configure when students can toggle intent and scan QR</p>
                            </div>
                            <button
                                onClick={async () => {
                                    if (!user) return;
                                    setIsSavingSettings(true);
                                    const result = await updateMealTimeSettings(mealTimeSettings, user.uid);
                                    setIsSavingSettings(false);
                                    if (result.success) {
                                        setSettingsSaved(true);
                                        setTimeout(() => setSettingsSaved(false), 2000);
                                    }
                                }}
                                disabled={isSavingSettings}
                                className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                                    settingsSaved
                                        ? 'bg-green-500 text-white'
                                        : 'bg-[#0d2137] text-white hover:bg-[#152d4a]'
                                } ${isSavingSettings ? 'opacity-50' : ''}`}
                            >
                                {settingsSaved ? '✓ Saved' : isSavingSettings ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                        <div className="space-y-4">
                            {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                                <div key={meal} className="p-4 border border-gray-100 rounded-lg">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xl">{meal === 'breakfast' ? '🍳' : meal === 'lunch' ? '🍛' : '🍽️'}</span>
                                        <h4 className="font-medium text-gray-900 capitalize">{meal}</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-2">Intent Toggle Window</p>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="time"
                                                    value={mealTimeSettings[meal].toggleStart}
                                                    onChange={(e) => setMealTimeSettings(prev => ({
                                                        ...prev,
                                                        [meal]: { ...prev[meal], toggleStart: e.target.value }
                                                    }))}
                                                    className="px-2 py-1 border border-gray-200 rounded text-sm"
                                                />
                                                <span className="text-gray-400">→</span>
                                                <input
                                                    type="time"
                                                    value={mealTimeSettings[meal].toggleEnd}
                                                    onChange={(e) => setMealTimeSettings(prev => ({
                                                        ...prev,
                                                        [meal]: { ...prev[meal], toggleEnd: e.target.value }
                                                    }))}
                                                    className="px-2 py-1 border border-gray-200 rounded text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-2">QR Scan Window</p>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="time"
                                                    value={mealTimeSettings[meal].scanStart}
                                                    onChange={(e) => setMealTimeSettings(prev => ({
                                                        ...prev,
                                                        [meal]: { ...prev[meal], scanStart: e.target.value }
                                                    }))}
                                                    className="px-2 py-1 border border-gray-200 rounded text-sm"
                                                />
                                                <span className="text-gray-400">→</span>
                                                <input
                                                    type="time"
                                                    value={mealTimeSettings[meal].scanEnd}
                                                    onChange={(e) => setMealTimeSettings(prev => ({
                                                        ...prev,
                                                        [meal]: { ...prev[meal], scanEnd: e.target.value }
                                                    }))}
                                                    className="px-2 py-1 border border-gray-200 rounded text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Reports & Export Tab */}
            {activeTab === 'reports' && (
                <div className="space-y-6">
                    {/* Export Options */}
                    <div className="bg-white border border-gray-200 p-5">
                        <h3 className="font-semibold text-gray-900 mb-4">Export Data</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Attendance Report', icon: '📅', desc: 'Daily/weekly attendance data' },
                                { label: 'Wastage Trends', icon: '📊', desc: 'Category-wise wastage analysis' },
                                { label: 'Feedback Summary', icon: '💬', desc: 'Dish ratings and complaints' },
                                { label: 'Points Ledger', icon: '⭐', desc: 'Student points transactions' },
                            ].map((item, i) => (
                                <div key={i} className="p-4 border border-gray-200 hover:border-teal-500 cursor-pointer transition-colors">
                                    <span className="text-2xl mb-2 block">{item.icon}</span>
                                    <p className="font-medium text-gray-900">{item.label}</p>
                                    <p className="text-xs text-gray-500 mb-3">{item.desc}</p>
                                    <div className="flex gap-2">
                                        <button className="text-xs bg-gray-100 text-gray-700 px-2 py-1 hover:bg-gray-200">CSV</button>
                                        <button className="text-xs bg-gray-100 text-gray-700 px-2 py-1 hover:bg-gray-200">Excel</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Generate Weekly Report */}
                    <div className="bg-white border border-gray-200 p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-semibold text-gray-900">Generate Weekly Report</h3>
                                <p className="text-sm text-gray-500">Comprehensive summary of all metrics for the week</p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                                <select className="text-sm border border-gray-200 p-2 rounded">
                                    <option>This Week (Jan 10-16)</option>
                                    <option>Last Week (Jan 3-9)</option>
                                    <option>2 Weeks Ago (Dec 27-Jan 2)</option>
                                </select>
                                <button className="px-4 py-2 bg-[#0d2137] text-white text-sm font-medium hover:bg-[#152d4a] transition-colors rounded whitespace-nowrap">
                                    📄 Generate PDF
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Recent Exports */}
                    <div className="bg-white border border-gray-200 p-4 sm:p-5">
                        <h3 className="font-semibold text-gray-900 mb-4">Recent Exports</h3>
                        <div className="space-y-2">
                            {[
                                { name: 'Weekly_Report_Jan10-16.pdf', date: 'Jan 16, 2026', size: '2.4 MB' },
                                { name: 'Attendance_Jan2026.csv', date: 'Jan 15, 2026', size: '156 KB' },
                                { name: 'Feedback_Summary_Week2.xlsx', date: 'Jan 14, 2026', size: '89 KB' },
                            ].map((file, i) => (
                                <div key={i} className="flex items-center justify-between gap-2 p-3 border border-gray-100 hover:bg-gray-50">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <span className="text-xl flex-shrink-0">📁</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-gray-900 truncate">{file.name}</p>
                                            <p className="text-xs text-gray-500">{file.date} • {file.size}</p>
                                        </div>
                                    </div>
                                    <button className="text-sm text-teal-600 hover:text-teal-700 flex-shrink-0">Download</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
