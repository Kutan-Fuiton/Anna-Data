/**
 * Firestore Service
 * Helper functions for Firestore data operations
 */

import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { API_BASE_URL } from '../config/apiConfig';

// ============== Types ==============

export interface MealFeedback {
    id?: string;
    userId: string;
    userName?: string;
    mealType: 'breakfast' | 'lunch' | 'dinner';
    date: Date;
    ratings: {
        taste: number;
        oil: number;
        quantity: number;
        hygiene: number;
    };
    comment?: string;
    imageUrl?: string;
    wasteAnalysis?: {
        wasteLevel: string;
        coveragePercent: number;
        foodItems: Record<string, number>;
    };
    createdAt?: Date;
}

export interface MealIntent {
    id?: string;
    userId: string;
    date: Date;
    meals: {
        breakfast: boolean;
        lunch: boolean;
        dinner: boolean;
    };
    createdAt?: Date;
}

export interface UserPoints {
    points: number;
    level: string;
    totalFeedbacks: number;
    streakDays: number;
    bestStreak: number;
    lastAttendanceDate?: string;
}

export interface AISummary {
    range: string;
    type: string;
    content: string;
    generatedAt: Date;
}

export interface PointTransaction {
    id: string;
    userId: string;
    type: 'earned' | 'lost';
    amount: number;
    reason: string;
    sourceType?: 'meal_review' | 'attendance' | 'bonus' | 'penalty' | 'redemption' | 'adjustment';
    sourceId?: string;
    date: Date;
    createdAt: Date;
}

export interface LeaderboardEntry {
    uid: string;
    rank: number;
    name: string;
    room: string;
    points: number;
    isCurrentUser: boolean;
}

export interface Reward {
    id: string;
    name: string;
    cost: number;
    icon: string;
    available: boolean;
}

export interface MealTimeWindow {
    toggleStart: string;  // HH:mm format
    toggleEnd: string;
    scanStart: string;
    scanEnd: string;
}

export interface MealTimeSettings {
    breakfast: MealTimeWindow;
    lunch: MealTimeWindow;
    dinner: MealTimeWindow;
    updatedAt?: Date;
    updatedBy?: string;
}

// Default meal time settings
export const DEFAULT_MEAL_TIME_SETTINGS: MealTimeSettings = {
    breakfast: {
        toggleStart: '18:00',  // 6 PM previous day
        toggleEnd: '08:00',    // 8 AM
        scanStart: '07:00',
        scanEnd: '10:00'
    },
    lunch: {
        toggleStart: '08:00',
        toggleEnd: '11:00',
        scanStart: '12:00',
        scanEnd: '14:30'
    },
    dinner: {
        toggleStart: '11:00',
        toggleEnd: '18:00',
        scanStart: '19:00',
        scanEnd: '21:30'
    }
};

// ============== Feedback Operations ==============

/**
 * Submit meal feedback to Firestore
 */
export async function submitMealFeedback(feedback: Omit<MealFeedback, 'id' | 'createdAt'>): Promise<string> {
    try {
        const feedbackData = {
            ...feedback,
            date: Timestamp.fromDate(feedback.date),
            createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'mealFeedback'), feedbackData);

        // --- NEW POINT SYSTEM LOGIC ---
        // 1. Base points for feedback submission (+10)
        await addUserPoints(feedback.userId, 10, 'feedback_submission', 'meal_review', docRef.id);

        // 2. Photo upload bonus (+10)
        if (feedback.imageUrl) {
            await addUserPoints(feedback.userId, 10, 'photo_upload_bonus', 'meal_review', docRef.id);
        }

        // 3. Consistent ratings check (Bonus +10 if feedback for last 5 meals)
        try {
            const lastFiveFeedback = await getUserFeedbackHistory(feedback.userId, 5);
            if (lastFiveFeedback.length === 5) {
                await addUserPoints(feedback.userId, 10, 'consistent_ratings_bonus', 'bonus', `feedback_streak_${docRef.id}`);
            }
        } catch (e) {
            console.error('Error checking consistent ratings:', e);
        }

        return docRef.id;
    } catch (error) {
        console.error('Error submitting feedback:', error);
        throw error;
    }
}

/**
 * Get user's feedback history
 */
export async function getUserFeedbackHistory(userId: string, limitCount = 10): Promise<MealFeedback[]> {
    try {
        const q = query(
            collection(db, 'mealFeedback'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate(),
            createdAt: doc.data().createdAt?.toDate(),
        })) as MealFeedback[];
    } catch (error) {
        console.error('Error fetching feedback history:', error);
        return [];
    }
}

// ============== Meal Intent Operations ==============

/**
 * Submit or update meal intent (attending/skipping meals)
 */
export async function submitMealIntent(intent: Omit<MealIntent, 'id' | 'createdAt'>): Promise<void> {
    try {
        // Create a unique document ID based on user and date
        const dateStr = intent.date.toISOString().split('T')[0];
        const docId = `${intent.userId}_${dateStr}`;

        await setDoc(doc(db, 'mealIntents', docId), {
            ...intent,
            date: Timestamp.fromDate(intent.date),
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error submitting meal intent:', error);
        throw error;
    }
}

/**
 * Get meal intents for a date range
 */
export async function getMealIntents(userId: string, startDate: Date, endDate: Date): Promise<MealIntent[]> {
    try {
        const q = query(
            collection(db, 'mealIntents'),
            where('userId', '==', userId),
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<=', Timestamp.fromDate(endDate))
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate(),
            createdAt: doc.data().createdAt?.toDate(),
        })) as MealIntent[];
    } catch (error) {
        console.error('Error fetching meal intents:', error);
        return [];
    }
}

// ============== Points Operations ==============

/**
 * Get user points and stats
 */
export async function getUserPoints(userId: string): Promise<UserPoints> {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));

        if (userDoc.exists()) {
            const data = userDoc.data();
            return {
                points: data.points || 0,
                level: calculateLevel(data.points || 0),
                totalFeedbacks: data.totalFeedbacks || 0,
                streakDays: data.streakDays || 0,
                bestStreak: data.bestStreak || 0,
                lastAttendanceDate: data.lastAttendanceDate,
            };
        }

        return {
            points: 0,
            level: 'Bronze',
            totalFeedbacks: 0,
            streakDays: 0,
            bestStreak: 0,
        };
    } catch (error) {
        console.error('Error fetching user points:', error);
        return {
            points: 0,
            level: 'Bronze',
            totalFeedbacks: 0,
            streakDays: 0,
            bestStreak: 0,
        };
    }
}

/**
 * Add points to user account and record transaction
 */
export async function addUserPoints(
    userId: string,
    points: number,
    reason: string,
    sourceType?: PointTransaction['sourceType'],
    sourceId?: string
): Promise<void> {
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const currentPoints = userDoc.data().points || 0;
            const totalFeedbacks = userDoc.data().totalFeedbacks || 0;

            await updateDoc(userRef, {
                points: currentPoints + points,
                totalFeedbacks: reason === 'feedback_submission' ? totalFeedbacks + 1 : totalFeedbacks,
                lastPointsUpdate: serverTimestamp(),
            });

            // Map internal reasons to human-readable strings
            const reasonMap: { [key: string]: string } = {
                'feedback_submission': 'Meal Feedback',
                'photo_upload_bonus': 'Photo Upload Bonus',
                'consistent_ratings_bonus': 'Consistent Ratings Reward',
                'consistent_marking_bonus': '1-Week Consistency Reward',
                'long_leave_bonus': 'Approved Long Leave Bonus',
                'no_show_penalty': 'Attendance marked but did not eat',
                'invalid_submission_penalty': 'Invalid Submission Deduction',
                'meal_attendance': 'Meal Attendance',
                'admin_adjustment': 'Admin Adjustment',
            };

            const displayReason = reasonMap[reason] ||
                reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            // Record transaction
            await addDoc(collection(db, 'messPoints'), {
                userId,
                type: points >= 0 ? 'earned' : 'lost',
                amount: Math.abs(points),
                reason: displayReason,
                sourceType: sourceType || 'adjustment',
                sourceId: sourceId || null,
                date: serverTimestamp(),
                createdAt: serverTimestamp(),
            });
        }
    } catch (error) {
        console.error('Error adding points:', error);
    }
}

export interface UserUsageStats {
    mealsEaten: number;
    mealsSkipped: number;
    intentAccuracy: number;
}

/**
 * Calculate logical usage stats for a user
 */
export async function getUserUsageStats(userId: string): Promise<UserUsageStats> {
    try {
        // 1. Fetch all intents for this user
        const qIntents = query(
            collection(db, 'mealIntents'),
            where('userId', '==', userId)
        );
        const intentSnap = await getDocs(qIntents);

        // 2. Fetch all attendance for this user
        const qAttendance = query(
            collection(db, 'mealAttendance'),
            where('userId', '==', userId)
        );
        const attendanceSnap = await getDocs(qAttendance);

        // 3. Process attendance into a searchable format: Set<"YYYY-MM-DD_mealType">
        const attendanceSet = new Set<string>();
        attendanceSnap.docs.forEach(doc => {
            const data = doc.data();
            const date = data.date instanceof Timestamp ? data.date.toDate() : (data.date?.toDate ? data.date.toDate() : new Date(data.date));
            if (date) {
                const dateStr = date.toISOString().split('T')[0];
                attendanceSet.add(`${dateStr}_${data.mealType}`);
            }
        });

        const mealsEaten = attendanceSet.size;
        let totalIntentedMeals = 0;
        let attendedIntents = 0;

        // 4. Analyze intents
        intentSnap.docs.forEach(doc => {
            const data = doc.data() as MealIntent;
            const date = data.date instanceof Timestamp ? data.date.toDate() : (data.date as any);
            if (!date) return;

            const dateStr = date.toISOString().split('T')[0];

            // Check each meal type in the intent
            const mealTypes: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];
            mealTypes.forEach(type => {
                const meals = data.meals as any;
                if (meals && meals[type]) {
                    totalIntentedMeals++;
                    if (attendanceSet.has(`${dateStr}_${type}`)) {
                        attendedIntents++;
                    }
                }
            });
        });

        const mealsSkipped = Math.max(0, totalIntentedMeals - attendedIntents);
        const intentAccuracy = totalIntentedMeals > 0
            ? Math.round((attendedIntents / totalIntentedMeals) * 100)
            : 100;

        return {
            mealsEaten,
            mealsSkipped,
            intentAccuracy
        };
    } catch (error) {
        console.error('Error calculating usage stats:', error);
        return { mealsEaten: 0, mealsSkipped: 0, intentAccuracy: 100 };
    }
}

/**
 * Get user's point transactions
 */
export async function getPointTransactions(userId: string, limitCount = 10): Promise<PointTransaction[]> {
    try {
        // Fetch without orderBy to avoid composite index requirements
        const q = query(
            collection(db, 'messPoints'),
            where('userId', '==', userId),
            limit(limitCount * 2) // Fetch a bit more to sort and slice
        );

        const snapshot = await getDocs(q);
        const transactions = snapshot.docs.map(doc => {
            const data = doc.data();

            // Handle legacy schema (points instead of amount/type)
            let amount = data.amount;
            let type = data.type;

            if (amount === undefined && data.points !== undefined) {
                amount = Math.abs(data.points);
                type = data.points >= 0 ? 'earned' : 'lost';
            }

            return {
                id: doc.id,
                ...data,
                amount: amount || 0,
                type: type || 'earned',
                date: data.date?.toDate?.() || data.createdAt?.toDate?.() || (data.date ? new Date(data.date) : new Date()),
                createdAt: data.createdAt?.toDate?.() || new Date(),
            };
        }) as PointTransaction[];

        // Sort descending by date/createdAt in-memory
        return transactions
            .sort((a, b) => {
                const dateA = a.date?.getTime() || 0;
                const dateB = b.date?.getTime() || 0;
                return dateB - dateA;
            })
            .slice(0, limitCount);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

/**
 * Get leaderboard data (resilient to missing indexes)
 */
export async function getLeaderboard(currentUserId: string, limitCount = 10): Promise<LeaderboardEntry[]> {
    try {
        // Fetch all students and sort in-memory to avoid composite index requirements
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'student')
        );

        const snapshot = await getDocs(q);
        const students = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                name: data.displayName || 'Student',
                room: data.room || 'N/A',
                points: data.points || 0,
                isCurrentUser: doc.id === currentUserId,
            };
        });

        // Sort descending by points
        return students
            .sort((a, b) => b.points - a.points)
            .slice(0, limitCount)
            .map((s, index) => ({ ...s, rank: index + 1 }));
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
}

/**
 * Get available rewards
 */
const DEFAULT_REWARDS: Reward[] = [
    { id: '1', name: 'Extra Dessert', cost: 100, icon: '🍮', available: true },
    { id: '2', name: 'Fast Pass', cost: 200, icon: '⚡', available: true },
    { id: '3', name: 'Special Menu Item', cost: 500, icon: '🍕', available: true },
    { id: '4', name: 'Free Meal Day', cost: 1000, icon: '🎉', available: false },
];

export async function getRewards(): Promise<Reward[]> {
    try {
        const snapshot = await getDocs(collection(db, 'rewards'));
        if (snapshot.empty) {
            return DEFAULT_REWARDS;
        }
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Reward[];
    } catch (error) {
        console.error('Error fetching rewards (using defaults):', error);
        return DEFAULT_REWARDS;
    }
}

/**
 * Redeem a reward
 */
export async function redeemReward(userId: string, reward: Reward): Promise<{ success: boolean; error?: string }> {
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) return { success: false, error: 'User not found' };

        const currentPoints = userDoc.data().points || 0;
        if (currentPoints < reward.cost) return { success: false, error: 'Not enough points' };

        // Deduct points and record transaction
        await updateDoc(userRef, {
            points: currentPoints - reward.cost,
        });

        await addDoc(collection(db, 'pointTransactions'), {
            userId,
            type: 'lost',
            amount: reward.cost,
            reason: `Redeemed ${reward.name}`,
            date: serverTimestamp(),
            createdAt: serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error('Error redeeming reward:', error);
        return { success: false, error: 'Redemption failed' };
    }
}

/**
 * Calculate user level based on points
 */
function calculateLevel(points: number): string {
    if (points >= 1000) return 'Platinum';
    if (points >= 500) return 'Gold';
    if (points >= 200) return 'Silver';
    return 'Bronze';
}

// ============== AI Summary Operations ==============

/**
 * Fetch the latest AI summary
 */
export async function fetchWeeklyAISummary(): Promise<AISummary | null> {
    try {
        const docRef = doc(db, 'aiSummaries', 'weekly_summary');
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            const data = snapshot.data();
            return {
                range: data.range,
                type: data.type,
                content: data.content,
                generatedAt: data.generatedAt?.toDate(),
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching AI summary:', error);
        return null;
    }
}

// ============== Structured AI Insights ==============

export interface AIInsightItem {
    id: string;
    title: string;
    description: string;
    frequency?: number;
    trend?: 'up' | 'down' | 'stable';
}

export interface StructuredAIInsights {
    issues: AIInsightItem[];
    improvements: AIInsightItem[];
    wellPerforming: AIInsightItem[];
    summary: string;
    generatedAt?: Date;
    meta?: {
        totalFeedback: number;
        wasteAnalyses: number;
        timeRange: string;
    };
}

export type TimeRange = 'daily' | 'weekly' | 'monthly';

/**
 * Fetch structured AI insights from Firestore
 */
export async function fetchAIInsights(timeRange: TimeRange = 'weekly'): Promise<StructuredAIInsights | null> {
    try {
        const docId = `insights_${timeRange}`;
        const docRef = doc(db, 'aiSummaries', docId);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            const data = snapshot.data();
            const insights = data.insights || {};

            return {
                issues: insights.issues || [],
                improvements: insights.improvements || [],
                wellPerforming: insights.wellPerforming || [],
                summary: insights.summary || '',
                generatedAt: data.generatedAt?.toDate(),
                meta: {
                    totalFeedback: data.aggregatedData?.totalFeedback || 0,
                    wasteAnalyses: data.aggregatedData?.wasteAnalyses || 0,
                    timeRange: data.timeRange || timeRange
                }
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching AI insights:', error);
        return null;
    }
}

/**
 * Trigger AI insights regeneration via backend API
 */
export async function regenerateAIInsights(timeRange: TimeRange = 'weekly'): Promise<StructuredAIInsights | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/generate-ai-insights`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ time_range: timeRange }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.insights) {
            return {
                issues: data.insights.issues || [],
                improvements: data.insights.improvements || [],
                wellPerforming: data.insights.wellPerforming || [],
                summary: data.insights.summary || '',
                generatedAt: data.generatedAt ? new Date(data.generatedAt) : new Date(),
                meta: data.meta
            };
        }

        return null;
    } catch (error) {
        console.error('Error regenerating AI insights:', error);
        return null;
    }
}

// ============== Admin Operations ==============

/**
 * Get all feedback for admin dashboard (last N days)
 */
export async function getAllFeedback(days = 7): Promise<MealFeedback[]> {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const q = query(
            collection(db, 'mealFeedback'),
            where('createdAt', '>=', Timestamp.fromDate(startDate)),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate(),
            createdAt: doc.data().createdAt?.toDate(),
        })) as MealFeedback[];
    } catch (error) {
        console.error('Error fetching all feedback:', error);
        return [];
    }
}

/**
 * Get feedback statistics for admin
 */
export async function getFeedbackStats(): Promise<{
    totalToday: number;
    averageRatings: Record<string, number>;
    mealCounts: Record<string, number>;
}> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, 'mealFeedback'),
            where('createdAt', '>=', Timestamp.fromDate(today))
        );

        const snapshot = await getDocs(q);
        const feedbacks = snapshot.docs.map(doc => doc.data());

        // Calculate stats
        const totalToday = feedbacks.length;

        const ratingsSums: Record<string, number> = { taste: 0, oil: 0, quantity: 0, hygiene: 0 };
        const mealCounts: Record<string, number> = { breakfast: 0, lunch: 0, dinner: 0 };

        feedbacks.forEach(fb => {
            if (fb.ratings) {
                Object.keys(ratingsSums).forEach(key => {
                    ratingsSums[key] += fb.ratings[key] || 0;
                });
            }
            if (fb.mealType) {
                mealCounts[fb.mealType] = (mealCounts[fb.mealType] || 0) + 1;
            }
        });

        const averageRatings: Record<string, number> = {};
        if (totalToday > 0) {
            Object.keys(ratingsSums).forEach(key => {
                averageRatings[key] = Math.round((ratingsSums[key] / totalToday) * 10) / 10;
            });
        }

        return { totalToday, averageRatings, mealCounts };
    } catch (error) {
        console.error('Error fetching feedback stats:', error);
        return {
            totalToday: 0,
            averageRatings: {},
            mealCounts: {},
        };
    }
}
/**
 * Get all meal intents for all users in a date range (for admins)
 */
export async function getAllMealIntents(startDate: Date, endDate: Date): Promise<MealIntent[]> {
    try {
        const q = query(
            collection(db, 'mealIntents'),
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<=', Timestamp.fromDate(endDate))
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate(),
            createdAt: doc.data().createdAt?.toDate(),
        })) as MealIntent[];
    } catch (error) {
        console.error('Error fetching all meal intents:', error);
        return [];
    }
}

// ============== QR Attendance Operations ==============

export interface MealAttendance {
    id?: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    date: Date;
    mealType: 'breakfast' | 'lunch' | 'dinner';
    scannedAt: Date;
    scannedBy: string; // Admin UID who scanned
}

export interface QRPayload {
    uid: string;
    meal: 'breakfast' | 'lunch' | 'dinner';
    date: string; // ISO date string (YYYY-MM-DD)
    ts: number; // Timestamp when QR was generated
    hash: string; // Simple checksum for validation
}

/**
 * Generate a simple hash for QR validation
 */
export function generateQRHash(uid: string, meal: string, date: string, ts: number): string {
    const data = `${uid}-${meal}-${date}-${ts}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Validate QR hash
 */
export function validateQRHash(payload: QRPayload): boolean {
    const expectedHash = generateQRHash(payload.uid, payload.meal, payload.date, payload.ts);
    return payload.hash === expectedHash;
}

/**
 * Check if a student has already been marked for a meal today
 */
export async function checkMealAttendance(
    userId: string,
    mealType: 'breakfast' | 'lunch' | 'dinner',
    date: Date
): Promise<boolean> {
    try {
        const dateStr = date.toISOString().split('T')[0];
        const docId = `${userId}_${mealType}_${dateStr}`;

        const docRef = doc(db, 'mealAttendance', docId);
        const docSnap = await getDoc(docRef);

        return docSnap.exists();
    } catch (error) {
        console.error('Error checking meal attendance:', error);
        return false;
    }
}

/**
 * Check if student had intent to eat this meal
 */
export async function checkMealIntent(
    userId: string,
    mealType: 'breakfast' | 'lunch' | 'dinner',
    date: Date
): Promise<boolean> {
    try {
        const dateStr = date.toISOString().split('T')[0];
        const docId = `${userId}_${dateStr}`;

        const docRef = doc(db, 'mealIntents', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.meals?.[mealType] === true;
        }

        return false;
    } catch (error) {
        console.error('Error checking meal intent:', error);
        return false;
    }
}

/**
 * Mark a student as attended for a meal
 * Returns error message if duplicate or other issue
 */
export async function markMealAttendance(
    userId: string,
    userName: string | undefined,
    userEmail: string | undefined,
    mealType: 'breakfast' | 'lunch' | 'dinner',
    date: Date,
    scannedBy: string
): Promise<{ success: boolean; error?: string; userName?: string; userEmail?: string }> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateStr = formatLocalDate(today);
        const docId = `${userId}_${mealType}_${dateStr}`;

        // Check if already scanned for this meal today
        const existing = await checkMealAttendance(userId, mealType, date);
        if (existing) {
            return { success: false, error: 'Already checked in for this meal' };
        }

        // Skip intent check for now - can be enabled later
        // const hadIntent = await checkMealIntent(userId, mealType, date);
        // if (!hadIntent) {
        //     return { success: false, error: 'Student did not mark intent to eat this meal' };
        // }


        // Fetch student details if not provided
        let finalName = userName;
        let finalEmail = userEmail;

        if (!finalName || !finalEmail) {
            try {
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    finalName = finalName || data.displayName;
                    finalEmail = finalEmail || data.email;
                }
            } catch (err) {
                console.warn('Could not fetch user details for attendance:', err);
            }
        }

        // Normalize date to midnight local for consistent querying
        const normalizedDate = new Date(date);
        normalizedDate.setHours(0, 0, 0, 0);

        // Record attendance
        await setDoc(doc(db, 'mealAttendance', docId), {
            userId,
            userName: finalName || 'Unknown',
            userEmail: finalEmail || '',
            date: Timestamp.fromDate(normalizedDate),
            mealType,
            scannedAt: serverTimestamp(),
            scannedBy,
        });

        // Award bonus points for actually showing up
        await addUserPoints(userId, 5, 'meal_attendance', 'attendance', docId);

        // Update logical streaks
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                let streakDays = userData.streakDays || 0;
                let bestStreak = userData.bestStreak || 0;
                const lastDate = userData.lastAttendanceDate; // YYYY-MM-DD

                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                if (lastDate !== todayStr) {
                    if (lastDate === yesterdayStr) {
                        streakDays += 1;
                    } else {
                        streakDays = 1;
                    }

                    if (streakDays > bestStreak) {
                        bestStreak = streakDays;
                    }

                    await updateDoc(userRef, {
                        streakDays,
                        bestStreak,
                        lastAttendanceDate: todayStr
                    });

                    // Award bonus for hitting 7-day milestones
                    if (streakDays > 0 && streakDays % 7 === 0) {
                        await addUserPoints(userId, 10, 'consistent_marking_bonus', 'bonus', `streak_${streakDays}_${todayStr}`);
                    }
                }
            }
        } catch (e) {
            console.error('Error updating streak:', e);
        }

        return {
            success: true,
            userName: finalName || undefined,
            userEmail: finalEmail || undefined
        };
    } catch (error) {
        console.error('Error marking meal attendance:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to record attendance';
        return { success: false, error: errorMessage };
    }
}

/**
 * Get today's attendance for a specific meal (admin view)
 */
export async function getTodayAttendance(
    mealType?: 'breakfast' | 'lunch' | 'dinner'
): Promise<MealAttendance[]> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let q;
        if (mealType) {
            q = query(
                collection(db, 'mealAttendance'),
                where('date', '>=', Timestamp.fromDate(today)),
                where('date', '<', Timestamp.fromDate(tomorrow)),
                where('mealType', '==', mealType),
                orderBy('date', 'desc'),
                orderBy('scannedAt', 'desc'),
                limit(100)
            );
        } else {
            q = query(
                collection(db, 'mealAttendance'),
                where('date', '>=', Timestamp.fromDate(today)),
                where('date', '<', Timestamp.fromDate(tomorrow)),
                orderBy('date', 'desc'),
                orderBy('scannedAt', 'desc'),
                limit(100)
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate(),
            scannedAt: doc.data().scannedAt?.toDate(),
        })) as MealAttendance[];
    } catch (error) {
        console.error('Error fetching today attendance:', error);
        return [];
    }
}

/**
 * Get attendance stats for today
 */
export async function getTodayAttendanceStats(): Promise<{
    breakfast: number;
    lunch: number;
    dinner: number;
    total: number;
}> {
    try {
        const attendance = await getTodayAttendance();

        const stats = {
            breakfast: 0,
            lunch: 0,
            dinner: 0,
            total: attendance.length,
        };

        attendance.forEach(a => {
            if (a.mealType in stats) {
                stats[a.mealType]++;
            }
        });

        return stats;
    } catch (error) {
        console.error('Error fetching attendance stats:', error);
        return { breakfast: 0, lunch: 0, dinner: 0, total: 0 };
    }
}

export interface DayAttendanceStats {
    date: string;       // YYYY-MM-DD
    dayName: string;    // Mon, Tue, etc.
    displayDate: string; // "Jan 17", "Today"
    breakfast: number;
    lunch: number;
    dinner: number;
    total: number;
}

/**
 * Get attendance stats for the past 7 days (including today)
 * Data resets daily at midnight based on the `date` field
 */
export async function get7DayAttendance(): Promise<DayAttendanceStats[]> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Start from 6 days ago to include today as day 7
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6);

        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 1); // End of today

        const q = query(
            collection(db, 'mealAttendance'),
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<', Timestamp.fromDate(endDate)),
            orderBy('date', 'asc')
        );

        const snapshot = await getDocs(q);

        // Group attendance by date
        const attendanceByDate = new Map<string, { breakfast: number; lunch: number; dinner: number }>();

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
            const dateStr = formatLocalDate(date);

            if (!attendanceByDate.has(dateStr)) {
                attendanceByDate.set(dateStr, { breakfast: 0, lunch: 0, dinner: 0 });
            }

            const stats = attendanceByDate.get(dateStr)!;
            const mealType = data.mealType as 'breakfast' | 'lunch' | 'dinner';
            if (mealType in stats) {
                stats[mealType]++;
            }
        });

        // Build result array for all 7 days
        const result: DayAttendanceStats[] = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayStr = today.toISOString().split('T')[0];

        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const stats = attendanceByDate.get(dateStr) || { breakfast: 0, lunch: 0, dinner: 0 };

            result.push({
                date: dateStr,
                dayName: dayNames[date.getDay()],
                displayDate: dateStr === todayStr
                    ? 'Today'
                    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                breakfast: stats.breakfast,
                lunch: stats.lunch,
                dinner: stats.dinner,
                total: stats.breakfast + stats.lunch + stats.dinner,
            });
        }

        return result;
    } catch (error) {
        console.error('Error fetching 7-day attendance:', error);
        return [];
    }
}

// ============== Leave Request Functions ==============

export interface LeaveRequest {
    id?: string;
    userId: string;
    userName?: string;
    startDate: Date;
    endDate: Date;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt?: Date;
}

/**
 * Helper to format date as YYYY-MM-DD in local timezone
 */
function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Create a new leave request
 */
export async function createLeaveRequest(
    userId: string,
    startDate: Date,
    endDate: Date,
    reason?: string,
    userName?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        // Use local date format to avoid timezone issues
        const docRef = await addDoc(collection(db, 'leaveRequests'), {
            userId,
            userName: userName || 'Unknown',
            startDate: formatLocalDate(startDate),
            endDate: formatLocalDate(endDate),
            reason: reason || 'Personal leave',
            status: 'approved',
            createdAt: serverTimestamp(),
        });

        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating leave request:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create leave request';
        return { success: false, error: errorMessage };
    }
}

/**
 * Helper to parse YYYY-MM-DD string as local date (not UTC)
 */
function parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // Month is 0-indexed
}

/**
 * Get all leaves for a user
 */
export async function getUserLeaves(userId: string): Promise<LeaveRequest[]> {
    try {
        const q = query(
            collection(db, 'leaveRequests'),
            where('userId', '==', userId),
            orderBy('startDate', 'asc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                userId: data.userId,
                userName: data.userName || 'Unknown',
                startDate: parseLocalDate(data.startDate),
                endDate: parseLocalDate(data.endDate),
                reason: data.reason,
                status: data.status,
                createdAt: data.createdAt?.toDate(),
            };
        });
    } catch (error) {
        console.error('Error fetching user leaves:', error);
        return [];
    }
}

/**
 * Get all leaves (for admin view)
 */
export async function getAllLeaves(): Promise<LeaveRequest[]> {
    try {
        const q = query(
            collection(db, 'leaveRequests'),
            orderBy('startDate', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                userId: data.userId,
                userName: data.userName || 'Unknown',
                startDate: parseLocalDate(data.startDate),
                endDate: parseLocalDate(data.endDate),
                reason: data.reason,
                status: data.status,
                createdAt: data.createdAt?.toDate(),
            };
        });
    } catch (error) {
        console.error('Error fetching all leaves:', error);
        return [];
    }
}

/**
 * Get upcoming leaves (future dates only)
 */
export async function getUpcomingLeaves(userId: string): Promise<LeaveRequest[]> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Simple query - just filter by userId, filter dates in code
        const q = query(
            collection(db, 'leaveRequests'),
            where('userId', '==', userId)
        );


        const snapshot = await getDocs(q);
        const leaves = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                userId: data.userId,
                userName: data.userName || 'Unknown',
                startDate: parseLocalDate(data.startDate),
                endDate: parseLocalDate(data.endDate),
                reason: data.reason,
                status: data.status,
                createdAt: data.createdAt?.toDate(),
            };
        });

        // Filter to only future leaves and sort by date
        return leaves
            .filter(leave => leave.startDate >= today)
            .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    } catch (error) {
        console.error('Error fetching upcoming leaves:', error);
        return [];
    }
}

/**
 * Delete a leave request
 */
export async function deleteLeaveRequest(leaveId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await deleteDoc(doc(db, 'leaveRequests', leaveId));
        return { success: true };
    } catch (error) {
        console.error('Error deleting leave request:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete leave request';
        return { success: false, error: errorMessage };
    }
}

// ============== Admin QR Code System ==============

export interface AdminQRPayload {
    type: 'admin_attendance';
    mealType: 'breakfast' | 'lunch' | 'dinner';
    date: string; // YYYY-MM-DD
    qrId: string; // Unique ID for validation
    generatedAt: number; // Timestamp
}

/**
 * Generate or get existing admin QR for a meal
 * @param forceRefresh - If true, deletes existing QR and generates a new one
 */
export async function generateAdminMealQR(
    mealType: 'breakfast' | 'lunch' | 'dinner',
    date: Date,
    forceRefresh: boolean = false
): Promise<{ success: boolean; qrData?: string; error?: string }> {
    try {
        const dateStr = formatLocalDate(date);
        const docId = `${mealType}_${dateStr}`;
        console.log('[Admin QR] Checking for existing QR:', docId, 'forceRefresh:', forceRefresh);

        const docRef = doc(db, 'adminAttendanceQR', docId);

        // If force refresh, delete existing QR first
        if (forceRefresh) {
            console.log('[Admin QR] Force refresh - deleting existing QR');
            await deleteDoc(docRef);
        } else {
            // Check if QR already exists for this meal/date
            const existingDoc = await getDoc(docRef);

            if (existingDoc.exists()) {
                const data = existingDoc.data();
                console.log('[Admin QR] Found existing QR, reusing');
                return { success: true, qrData: data.qrData };
            }
        }

        console.log('[Admin QR] Generating new QR');
        // Generate new QR payload
        const qrPayload: AdminQRPayload = {
            type: 'admin_attendance',
            mealType,
            date: dateStr,
            qrId: `${docId}_${Date.now()}`,
            generatedAt: Date.now(),
        };

        const qrData = JSON.stringify(qrPayload);
        console.log('[Admin QR] Generated payload:', qrPayload);

        // Save to Firestore
        await setDoc(docRef, {
            mealType,
            date: dateStr,
            qrData,
            qrId: qrPayload.qrId,
            createdAt: serverTimestamp(),
        });
        console.log('[Admin QR] Saved to Firestore');

        return { success: true, qrData };
    } catch (error) {
        console.error('[Admin QR] Error generating:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate QR code';
        return { success: false, error: errorMessage };
    }
}

/**
 * Get current meal type based on time
 */
export function getCurrentMealType(): 'breakfast' | 'lunch' | 'dinner' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 16) return 'lunch';
    return 'dinner';
}

/**
 * Validate admin QR payload
 */
export function validateAdminQR(qrData: string): { valid: boolean; payload?: AdminQRPayload; error?: string } {
    console.log('[Student Scan] Validating QR data:', qrData?.substring(0, 50) + '...');
    try {
        const payload = JSON.parse(qrData) as AdminQRPayload;
        console.log('[Student Scan] Parsed payload:', payload);

        // Check type
        if (payload.type !== 'admin_attendance') {
            console.log('[Student Scan] Invalid type:', payload.type);
            return { valid: false, error: 'Invalid QR type - not an attendance QR' };
        }

        // Check required fields
        if (!payload.mealType || !payload.date || !payload.qrId) {
            console.log('[Student Scan] Missing fields');
            return { valid: false, error: 'Invalid QR format' };
        }

        // Check if date is today
        const today = formatLocalDate(new Date());
        console.log('[Student Scan] QR date:', payload.date, 'Today:', today);
        if (payload.date !== today) {
            return { valid: false, error: `QR is for ${payload.date}, but today is ${today}` };
        }

        console.log('[Student Scan] QR is valid!');
        return { valid: true, payload };
    } catch (err) {
        console.error('[Student Scan] Parse error:', err);
        return { valid: false, error: 'Could not read QR code' };
    }
}

/**
 * Mark attendance when student scans admin's QR
 */
export async function markAttendanceFromStudentScan(
    userId: string,
    userName: string | undefined,
    userEmail: string | undefined,
    qrData: string
): Promise<{ success: boolean; mealType?: string; error?: string }> {
    try {
        // Validate QR
        const validation = validateAdminQR(qrData);
        if (!validation.valid || !validation.payload) {
            return { success: false, error: validation.error };
        }

        const { mealType, date } = validation.payload;
        const parsedDate = parseLocalDate(date);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateStr = formatLocalDate(today);
        const docId = `${userId}_${mealType}_${dateStr}`;

        // Check for duplicate attendance today
        const existingDoc = await getDoc(doc(db, 'mealAttendance', docId));
        if (existingDoc.exists()) {
            return { success: false, error: 'You have already marked attendance for this meal' };
        }

        // Fetch user details if not provided
        let finalName = userName;
        let finalEmail = userEmail;

        if (!finalName || !finalEmail) {
            try {
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    finalName = finalName || data.displayName || data.name;
                    finalEmail = finalEmail || data.email;
                }
            } catch (err) {
                console.warn('Could not fetch user details:', err);
            }
        }

        // Normalize date to midnight local
        const normalizedDate = new Date(parsedDate);
        normalizedDate.setHours(0, 0, 0, 0);

        // Record attendance
        await setDoc(doc(db, 'mealAttendance', docId), {
            userId,
            userName: finalName || 'Unknown Student',
            userEmail: finalEmail || '',
            date: Timestamp.fromDate(normalizedDate),
            mealType,
            scannedAt: serverTimestamp(),
            scanType: 'student_scan', // Indicates student scanned admin QR
        });

        // Award points for attendance
        await addUserPoints(userId, 5, 'meal_attendance');

        // Check for 1-week consistency bonus
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const streakDays = userDoc.data().streakDays || 0;
                if (streakDays > 0 && streakDays % 7 === 0) {
                    await addUserPoints(userId, 10, 'consistent_marking_bonus');
                }
            }
        } catch (e) {
            console.error('Error checking streak bonus:', e);
        }

        return { success: true, mealType };
    } catch (error) {
        console.error('Error marking attendance from student scan:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to mark attendance';
        return { success: false, error: errorMessage };
    }
}

// ============== Admin Management & Penalties ==============

/**
 * Approve a leave request and award points if long leave
 */
export async function approveLeaveRequest(leaveId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const leaveRef = doc(db, 'leaves', leaveId);
        const leaveSnap = await getDoc(leaveRef);

        if (!leaveSnap.exists()) {
            return { success: false, error: 'Leave request not found' };
        }

        const data = leaveSnap.data();
        await updateDoc(leaveRef, { status: 'approved' });

        // Award +10 points if the leave is > 3 days
        const start = data.startDate.toDate();
        const end = data.endDate.toDate();
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 3) {
            await addUserPoints(data.userId, 10, 'long_leave_bonus');
        }

        return { success: true };
    } catch (error) {
        console.error('Error approving leave:', error);
        return { success: false, error: 'Failed to approve leave' };
    }
}

/**
 * Flag a student for "Attendance marked but did not eat" (-10 pts)
 */
export async function flagNoShow(userId: string): Promise<void> {
    await addUserPoints(userId, -10, 'no_show_penalty');
}

/**
 * Reject a meal feedback for being invalid/fake (-10 pts)
 */
export async function rejectMealFeedback(feedbackId: string, userId: string): Promise<void> {
    try {
        await updateDoc(doc(db, 'mealFeedback', feedbackId), { status: 'rejected' });
        await addUserPoints(userId, -10, 'invalid_submission_penalty');
    } catch (error) {
        console.error('Error rejecting feedback:', error);
    }
}

// ============== Meal Time Settings Operations ==============

/**
 * Get meal time settings from Firestore (or return defaults)
 */
export async function getMealTimeSettings(): Promise<MealTimeSettings> {
    try {
        const docRef = doc(db, 'settings', 'mealTimeWindows');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                breakfast: data.breakfast || DEFAULT_MEAL_TIME_SETTINGS.breakfast,
                lunch: data.lunch || DEFAULT_MEAL_TIME_SETTINGS.lunch,
                dinner: data.dinner || DEFAULT_MEAL_TIME_SETTINGS.dinner,
                updatedAt: data.updatedAt?.toDate(),
                updatedBy: data.updatedBy,
            };
        }

        return DEFAULT_MEAL_TIME_SETTINGS;
    } catch (error) {
        console.error('Error fetching meal time settings:', error);
        return DEFAULT_MEAL_TIME_SETTINGS;
    }
}

/**
 * Update meal time settings (admin only)
 */
export async function updateMealTimeSettings(
    settings: MealTimeSettings,
    adminId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = doc(db, 'settings', 'mealTimeWindows');
        await setDoc(docRef, {
            breakfast: settings.breakfast,
            lunch: settings.lunch,
            dinner: settings.dinner,
            updatedAt: serverTimestamp(),
            updatedBy: adminId,
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating meal time settings:', error);
        return { success: false, error: 'Failed to update settings' };
    }
}

/**
 * Get user's meals that have been scanned today
 */
export async function getUserTodayScans(userId: string): Promise<{
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
}> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const q = query(
            collection(db, 'mealAttendance'),
            where('userId', '==', userId),
            where('date', '>=', Timestamp.fromDate(today)),
            where('date', '<', Timestamp.fromDate(tomorrow))
        );

        const snapshot = await getDocs(q);
        const scans = { breakfast: false, lunch: false, dinner: false };

        snapshot.docs.forEach(doc => {
            const mealType = doc.data().mealType as 'breakfast' | 'lunch' | 'dinner';
            if (mealType in scans) {
                scans[mealType] = true;
            }
        });

        return scans;
    } catch (error) {
        console.error('Error fetching user scans:', error);
        return { breakfast: false, lunch: false, dinner: false };
    }
}

/**
 * Check if a time window is currently open
 * Handles overnight windows (e.g., 18:00 to 08:00)
 */
export function isTimeWindowOpen(startTime: string, endTime: string): boolean {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Handle overnight window (e.g., 18:00 to 08:00)
    if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    // Normal window (e.g., 08:00 to 11:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if meal toggle is currently allowed
 */
export function isMealToggleOpen(
    mealType: 'breakfast' | 'lunch' | 'dinner',
    settings: MealTimeSettings
): boolean {
    const window = settings[mealType];
    return isTimeWindowOpen(window.toggleStart, window.toggleEnd);
}

/**
 * Check if meal scan is currently allowed
 */
export function isMealScanOpen(
    mealType: 'breakfast' | 'lunch' | 'dinner',
    settings: MealTimeSettings
): boolean {
    const window = settings[mealType];
    return isTimeWindowOpen(window.scanStart, window.scanEnd);
}

