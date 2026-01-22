
/**
 * Global Configuration for the application
 * 
 * Frontend: Vercel
 * Backend: Render
 */

// Use environment variable for API URL, fallback to Render backend
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://anna-data-j7mt.onrender.com').replace(/\/$/, '');

export const CONFIG = {
    API_BASE_URL,
    ENDPOINTS: {
        ANALYZE: `${API_BASE_URL}/analyze`,
        GENERATE_AI_INSIGHTS: `${API_BASE_URL}/generate-ai-insights`,
        GENERATE_QR: `${API_BASE_URL}/qr/generate`,
        GET_QR: (mealType: string) => `${API_BASE_URL}/qr/${mealType}`,
    }
};
