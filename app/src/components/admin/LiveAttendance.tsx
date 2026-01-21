/**
 * LiveAttendance Component
 * Shows real-time attendance stats with live updates when students scan QR
 */

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface AttendanceStats {
    breakfast: number;
    lunch: number;
    dinner: number;
    total: number;
}

interface RecentScan {
    id: string;
    userName: string;
    mealType: string;
    scannedAt: Date;
}

export default function LiveAttendance() {
    const [stats, setStats] = useState<AttendanceStats>({ breakfast: 0, lunch: 0, dinner: 0, total: 0 });
    const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayTimestamp = Timestamp.fromDate(today);
        const tomorrowTimestamp = Timestamp.fromDate(tomorrow);

        // Real-time listener for today's attendance
        const q = query(
            collection(db, 'mealAttendance'),
            where('date', '>=', todayTimestamp),
            where('date', '<', tomorrowTimestamp)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const counts = { breakfast: 0, lunch: 0, dinner: 0 };
            const scans: RecentScan[] = [];

            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                const mealType = data.mealType as 'breakfast' | 'lunch' | 'dinner';

                if (counts[mealType] !== undefined) {
                    counts[mealType]++;
                }

                scans.push({
                    id: doc.id,
                    userName: data.userName || 'Student',
                    mealType: mealType,
                    scannedAt: data.scannedAt?.toDate() || new Date(),
                });
            });

            // Sort by most recent first
            scans.sort((a, b) => b.scannedAt.getTime() - a.scannedAt.getTime());

            setStats({
                breakfast: counts.breakfast,
                lunch: counts.lunch,
                dinner: counts.dinner,
                total: counts.breakfast + counts.lunch + counts.dinner,
            });
            setRecentScans(scans.slice(0, 10)); // Show last 10
            setIsLoading(false);
        }, (error) => {
            console.error('LiveAttendance listener error:', error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getMealIcon = (meal: string) => {
        switch (meal) {
            case 'breakfast': return '🌅';
            case 'lunch': return '☀️';
            case 'dinner': return '🌙';
            default: return '🍽️';
        }
    };

    return (
        <div className="space-y-4">
            {/* Stats Cards */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-4 sm:p-5 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold mb-1">Today's Attendance</h2>
                        <p className="text-teal-100 text-sm">Students checked in via QR</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                            <span className="text-xs text-teal-100">Live updates</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4 sm:gap-6">
                        <div className="text-center">
                            <p className="text-2xl sm:text-3xl font-bold">{isLoading ? '-' : stats.breakfast}</p>
                            <p className="text-xs text-teal-100">Breakfast</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl sm:text-3xl font-bold">{isLoading ? '-' : stats.lunch}</p>
                            <p className="text-xs text-teal-100">Lunch</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl sm:text-3xl font-bold">{isLoading ? '-' : stats.dinner}</p>
                            <p className="text-xs text-teal-100">Dinner</p>
                        </div>
                        <div className="text-center border-l border-teal-400 pl-4 sm:pl-6">
                            <p className="text-2xl sm:text-3xl font-bold">{isLoading ? '-' : stats.total}</p>
                            <p className="text-xs text-teal-100">Total</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Scans */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Recent Check-ins</h3>
                </div>
                <div className="max-h-64 overflow-y-auto overflow-x-auto">
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-400">Loading...</div>
                    ) : recentScans.length === 0 ? (
                        <div className="p-4 text-center text-gray-400">No check-ins yet today</div>
                    ) : (
                        <table className="w-full min-w-[400px]">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-2 text-left">Student</th>
                                    <th className="px-4 py-2 text-left">Meal</th>
                                    <th className="px-4 py-2 text-left">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentScans.map((scan) => (
                                    <tr key={scan.id} className="text-sm hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium text-gray-900">{scan.userName}</td>
                                        <td className="px-4 py-2">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
                                                {getMealIcon(scan.mealType)} {scan.mealType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-500">{formatTime(scan.scannedAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
