/**
 * QR API Service
 * Frontend service for calling backend QR code endpoints
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface QRResponse {
    success: boolean;
    qr_data?: string;
    meal_type?: string;
    date?: string;
    error?: string;
}

/**
 * Generate or get existing QR code for a meal
 */
export async function generateQR(
    mealType: 'breakfast' | 'lunch' | 'dinner',
    forceRefresh: boolean = false
): Promise<{ success: boolean; qrData?: string; error?: string }> {
    try {
        const response = await fetch(`${API_URL}/qr/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                meal_type: mealType,
                force_refresh: forceRefresh,
            }),
        });

        const data: QRResponse = await response.json();

        if (data.success && data.qr_data) {
            return { success: true, qrData: data.qr_data };
        } else {
            return { success: false, error: data.error || 'Failed to generate QR' };
        }
    } catch (error) {
        console.error('[QR API] Error:', error);
        return { success: false, error: 'Failed to connect to server' };
    }
}

/**
 * Get current QR code for a meal
 */
export async function getQR(
    mealType: 'breakfast' | 'lunch' | 'dinner'
): Promise<{ success: boolean; qrData?: string; error?: string }> {
    try {
        const response = await fetch(`${API_URL}/qr/${mealType}`);
        const data: QRResponse = await response.json();

        if (data.success && data.qr_data) {
            return { success: true, qrData: data.qr_data };
        } else {
            return { success: false, error: data.error || 'No QR found' };
        }
    } catch (error) {
        console.error('[QR API] Error:', error);
        return { success: false, error: 'Failed to connect to server' };
    }
}

/**
 * Get current meal type based on time
 */
export function getCurrentMealType(): 'breakfast' | 'lunch' | 'dinner' {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 10) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    return 'dinner';
}
