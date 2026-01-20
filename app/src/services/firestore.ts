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

// ============== Types ==============

export interface MealFeedback {
    id?: string;
    userId: string;
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
}

export interface AISummary {
    range: string;
    type: string;
    content: string;
    generatedAt: Date;
}

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

        // Award points for submitting feedback
        await addUserPoints(feedback.userId, 10, 'feedback_submission');

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
            };
        }

        return {
            points: 0,
            level: 'Bronze',
            totalFeedbacks: 0,
            streakDays: 0,
        };
    } catch (error) {
        console.error('Error fetching user points:', error);
        return {
            points: 0,
            level: 'Bronze',
            totalFeedbacks: 0,
            streakDays: 0,
        };
    }
}

/**
 * Add points to user account
 */
export async function addUserPoints(userId: string, points: number, reason: string): Promise<void> {
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
        }
    } catch (error) {
        console.error('Error adding points:', error);
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
        const dateStr = date.toISOString().split('T')[0];
        // DEMO MODE: Use timestamp to allow multiple scans
        const docId = `${userId}_${mealType}_${dateStr}_${Date.now()}`;

        // DEMO MODE: Skip duplicate check
        // const existing = await checkMealAttendance(userId, mealType, date);
        // if (existing) {
        //     return { success: false, error: 'Already checked in for this meal' };
        // }

        // DEMO MODE: Skip intent check
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

        // Record attendance
        await setDoc(doc(db, 'mealAttendance', docId), {
            userId,
            userName: finalName || 'Unknown',
            userEmail: finalEmail || '',
            date: Timestamp.fromDate(date),
            mealType,
            scannedAt: serverTimestamp(),
            scannedBy,
        });

        // Award bonus points for actually showing up
        await addUserPoints(userId, 5, 'meal_attendance');

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

// ============== Leave Request Functions ==============

export interface LeaveRequest {
    id?: string;
    userId: string;
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

        // TEMPORARILY DISABLED: Check for duplicate attendance today
        // Will add back later for one-time scanning
        const docId = `${userId}_${mealType}_${date}`;
        // const existingDoc = await getDoc(doc(db, 'mealAttendance', docId));
        // if (existingDoc.exists()) {
        //     return { success: false, error: 'You have already marked attendance for this meal' };
        // }

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

        // Record attendance
        await setDoc(doc(db, 'mealAttendance', docId), {
            userId,
            userName: finalName || 'Unknown Student',
            userEmail: finalEmail || '',
            date: Timestamp.fromDate(parsedDate),
            mealType,
            scannedAt: serverTimestamp(),
            scanType: 'student_scan', // Indicates student scanned admin QR
        });

        // Award points for attendance
        await addUserPoints(userId, 5, 'meal_attendance');

        return { success: true, mealType };
    } catch (error) {
        console.error('Error marking attendance from student scan:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to mark attendance';
        return { success: false, error: errorMessage };
    }
}
