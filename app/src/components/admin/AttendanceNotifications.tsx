/**
 * AttendanceNotifications Component
 * Real-time notifications when students mark attendance
 */

import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTheme } from '../../context/ThemeProvider';

interface AttendanceNotification {
    id: string;
    userName: string;
    mealType: string;
    timestamp: Date;
}

export default function AttendanceNotifications() {
    const { theme } = useTheme();
    const [notifications, setNotifications] = useState<AttendanceNotification[]>([]);
    const lastTimestampRef = useRef<Date>(new Date());
    const isFirstLoadRef = useRef(true);

    useEffect(() => {
        // Query for today's attendance, ordered by scannedAt
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        const q = query(
            collection(db, 'mealAttendance'),
            where('date', '>=', todayTimestamp),
            where('scanType', '==', 'student_scan'),
            orderBy('date', 'desc'),
            orderBy('scannedAt', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Skip first load to avoid showing old notifications
            if (isFirstLoadRef.current) {
                isFirstLoadRef.current = false;
                lastTimestampRef.current = new Date();
                return;
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const scannedAt = data.scannedAt?.toDate() || new Date();
                    
                    // Only show if it's newer than our last check
                    if (scannedAt > lastTimestampRef.current) {
                        const notification: AttendanceNotification = {
                            id: change.doc.id,
                            userName: data.userName || 'Student',
                            mealType: data.mealType || 'meal',
                            timestamp: scannedAt,
                        };

                        setNotifications(prev => [notification, ...prev].slice(0, 5));
                        lastTimestampRef.current = scannedAt;

                        // Auto-remove after 5 seconds
                        setTimeout(() => {
                            setNotifications(prev => prev.filter(n => n.id !== notification.id));
                        }, 5000);
                    }
                }
            });
        }, (error) => {
            console.error('Notification listener error:', error);
        });

        return () => unsubscribe();
    }, []);

    if (notifications.length === 0) return null;

    const getMealEmoji = (type: string) => {
        switch (type) {
            case 'breakfast': return '🍳';
            case 'lunch': return '🍛';
            case 'dinner': return '🍽️';
            default: return '🍴';
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {notifications.map((notification, index) => (
                <div
                    key={notification.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transform transition-all duration-300 animate-slide-in ${
                        theme === 'dark'
                            ? 'bg-green-900/90 text-white border border-green-700'
                            : 'bg-green-500 text-white'
                    }`}
                    style={{ 
                        animationDelay: `${index * 100}ms`,
                        opacity: 1 - (index * 0.15)
                    }}
                >
                    <span className="text-2xl">{getMealEmoji(notification.mealType)}</span>
                    <div>
                        <p className="font-semibold text-sm">
                            {notification.userName}
                        </p>
                        <p className="text-xs opacity-80">
                            marked {notification.mealType} attendance
                        </p>
                    </div>
                    <span className="ml-2 text-green-200">✓</span>
                </div>
            ))}
        </div>
    );
}
