/**
 * API Service for Mess-O-Meter Backend
 * Handles communication with the food waste analysis API
 */

const API_BASE_URL = 'http://localhost:8000';

export interface FoodDetail {
    item: string;
    confidence: number;
    portion_size: string;
    dimensions: {
        width: number;
        height: number;
    };
}

export interface WasteAnalysis {
    plate_detected: boolean;
    coverage_percent: number;
    waste_level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
    waste_description: string;
    food_items_detected: number;
    total_food_area_px: number;
    plate_area_px: number;
}

export interface AdminInsight {
    waste_level: string;
    coverage_percent: number;
    items_left: Record<string, number>;
    most_wasted_item: string | null;
    total_items_remaining: number;
    recommendations: string[];
    action_required: boolean;
    ai_summary: string | null;
}

export interface AnalysisResponse {
    success: boolean;
    timestamp: string;
    image_size: {
        width: number;
        height: number;
    };
    food_summary: Record<string, number>;
    food_details: FoodDetail[];
    waste_analysis: WasteAnalysis;
    user_insight: string;
    admin_insight: AdminInsight;
}

export interface AnalysisError {
    success: false;
    error: string;
}

/**
 * Analyze a plate image for food waste
 * @param imageFile - The image file to analyze
 * @returns Analysis results with waste metrics and AI insights
 */
export async function analyzeImage(imageFile: File): Promise<AnalysisResponse> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Analysis failed' }));
        throw new Error(errorData.detail || 'Failed to analyze image');
    }

    return response.json();
}

/**
 * Check if the backend API is available
 */
export async function checkApiHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/`);
        const data = await response.json();
        return data.status === 'ok';
    } catch {
        return false;
    }
}
