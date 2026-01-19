/**
 * Analytics Service for Mess-O-Meter
 * Provides mock data for daily, weekly, and monthly analytics
 * 
 * In production, this would fetch from Firestore/backend API
 */

export type TimeRange = 'daily' | 'weekly' | 'monthly';
export type WasteLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface WasteLevelDistribution {
    NONE: number;
    LOW: number;
    MEDIUM: number;
    HIGH: number;
}

export interface FoodItemStat {
    item: string;
    count: number;
    totalWastePercent: number;
}

export interface TrendDataPoint {
    date: string;
    vegetables: number;
    grains: number;
    dairy: number;
    proteins: number;
    avgWastePercent: number;
    analysisCount: number;
}

export interface AnalyticsSummary {
    totalAnalyses: number;
    averageWastePercent: number;
    wasteLevelDistribution: WasteLevelDistribution;
    topWastedItems: FoodItemStat[];
    trendData: TrendDataPoint[];
    comparisonToPrevious: {
        wasteChange: number; // positive = more waste, negative = less waste
        analysisCountChange: number;
    };
}

// Common Indian mess food items
const FOOD_ITEMS = [
    'Rice', 'Roti', 'Dal', 'Sabzi', 'Paneer', 'Chole',
    'Rajma', 'Aloo', 'Salad', 'Curd', 'Pulao', 'Kheer'
];

// Generate random number within range
function randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate random float within range
function randomFloatInRange(min: number, max: number): number {
    return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

// Generate mock daily trend data
function generateDailyTrendData(days: number): TrendDataPoint[] {
    const data: TrendDataPoint[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        data.push({
            date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            vegetables: randomInRange(25, 50),
            grains: randomInRange(20, 40),
            dairy: randomInRange(10, 25),
            proteins: randomInRange(8, 20),
            avgWastePercent: randomFloatInRange(15, 45),
            analysisCount: randomInRange(80, 200),
        });
    }

    return data;
}

// Generate mock weekly trend data
function generateWeeklyTrendData(weeks: number): TrendDataPoint[] {
    const data: TrendDataPoint[] = [];
    const today = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - (i * 7));

        data.push({
            date: `Week ${weeks - i}`,
            vegetables: randomInRange(180, 350),
            grains: randomInRange(140, 280),
            dairy: randomInRange(70, 175),
            proteins: randomInRange(56, 140),
            avgWastePercent: randomFloatInRange(18, 42),
            analysisCount: randomInRange(560, 1400),
        });
    }

    return data;
}

// Generate mock monthly trend data
function generateMonthlyTrendData(months: number): TrendDataPoint[] {
    const data: TrendDataPoint[] = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);

        data.push({
            date: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
            vegetables: randomInRange(720, 1400),
            grains: randomInRange(560, 1120),
            dairy: randomInRange(280, 700),
            proteins: randomInRange(224, 560),
            avgWastePercent: randomFloatInRange(20, 40),
            analysisCount: randomInRange(2400, 6000),
        });
    }

    return data;
}

// Generate waste level distribution
function generateWasteLevelDistribution(timeRange: TimeRange): WasteLevelDistribution {
    // Adjust base values based on time range
    const multiplier = timeRange === 'daily' ? 1 : timeRange === 'weekly' ? 7 : 30;

    return {
        NONE: randomInRange(15 * multiplier, 25 * multiplier),
        LOW: randomInRange(30 * multiplier, 45 * multiplier),
        MEDIUM: randomInRange(20 * multiplier, 35 * multiplier),
        HIGH: randomInRange(10 * multiplier, 20 * multiplier),
    };
}

// Generate top wasted food items
function generateTopWastedItems(): FoodItemStat[] {
    // Shuffle and take top 6
    const shuffled = [...FOOD_ITEMS].sort(() => Math.random() - 0.5);

    return shuffled.slice(0, 6).map((item, index) => ({
        item,
        count: randomInRange(50 - index * 5, 100 - index * 8),
        totalWastePercent: randomFloatInRange(20 - index * 2, 45 - index * 3),
    })).sort((a, b) => b.count - a.count);
}

/**
 * Get analytics data for the specified time range
 */
export function getAnalytics(timeRange: TimeRange): AnalyticsSummary {
    let trendData: TrendDataPoint[];
    let totalAnalyses: number;

    switch (timeRange) {
        case 'daily':
            trendData = generateDailyTrendData(7); // Last 7 days
            totalAnalyses = randomInRange(120, 200);
            break;
        case 'weekly':
            trendData = generateWeeklyTrendData(4); // Last 4 weeks
            totalAnalyses = randomInRange(800, 1400);
            break;
        case 'monthly':
            trendData = generateMonthlyTrendData(6); // Last 6 months
            totalAnalyses = randomInRange(3500, 6000);
            break;
    }

    const wasteLevelDistribution = generateWasteLevelDistribution(timeRange);
    const topWastedItems = generateTopWastedItems();

    // Calculate average waste percent from trend data
    const averageWastePercent = Math.round(
        trendData.reduce((sum, d) => sum + d.avgWastePercent, 0) / trendData.length * 10
    ) / 10;

    return {
        totalAnalyses,
        averageWastePercent,
        wasteLevelDistribution,
        topWastedItems,
        trendData,
        comparisonToPrevious: {
            wasteChange: randomFloatInRange(-15, 10),
            analysisCountChange: randomInRange(-50, 100),
        },
    };
}

/**
 * Format timestamp for display
 */
export function getLastUpdatedTimestamp(): string {
    return new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}
