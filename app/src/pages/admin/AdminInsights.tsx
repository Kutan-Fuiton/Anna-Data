import { useState, useEffect } from 'react';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';
import { 
    getAnalytics, getLastUpdatedTimestamp, 
    type TimeRange, type AnalyticsSummary, type WasteLevel 
} from '../../services/analyticsService';

interface AIInsight {
    id: string;
    type: 'issue' | 'improvement' | 'stable';
    title: string;
    description: string;
    frequency?: number;
    trend?: 'up' | 'down' | 'stable';
}

export default function AdminInsights() {
    const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
    const [activeSection, setActiveSection] = useState<'ai' | 'wastage'>('ai');
    const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
    const [lastGenerated, setLastGenerated] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    // Load analytics data when time range changes
    useEffect(() => {
        setIsLoading(true);
        // Simulate API delay
        const timer = setTimeout(() => {
            setAnalytics(getAnalytics(timeRange));
            setLastGenerated(getLastUpdatedTimestamp());
            setIsLoading(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [timeRange]);

    // AI-Generated Insights (simulated cached data from Gemini)
    const aiInsights: AIInsight[] = [
        {
            id: '1',
            type: 'issue',
            title: 'Paneer dishes consistently too oily',
            description: 'Students have reported oily texture in Paneer Butter Masala and Shahi Paneer for 3 consecutive weeks. Consider reducing oil/butter by 15-20%.',
            frequency: 47,
            trend: 'up',
        },
        {
            id: '2',
            type: 'issue',
            title: 'Rice undercooked on weekends',
            description: 'Weekend batches of rice (Saturday lunch, Sunday dinner) show higher complaint rates. May be related to different cooking staff or timing.',
            frequency: 23,
            trend: 'stable',
        },
        {
            id: '3',
            type: 'issue',
            title: 'Dal temperature inconsistent',
            description: 'Dal Tadka and Dal Makhani served cold in late servings. Consider better thermal containers or staggered preparation.',
            frequency: 18,
            trend: 'down',
        },
        {
            id: '4',
            type: 'improvement',
            title: 'Roti quality improved significantly',
            description: 'Complaints about hard/stale rotis dropped by 65% after switching to the new atta supplier last month.',
            frequency: 5,
            trend: 'down',
        },
        {
            id: '5',
            type: 'stable',
            title: 'Chole Bhature remains top-rated',
            description: 'Consistently high ratings (4.5+) for the past 8 weeks. Consider featuring it more frequently in the weekly menu.',
            frequency: 2,
            trend: 'stable',
        },
        {
            id: '6',
            type: 'stable',
            title: 'Breakfast items performing well',
            description: 'Poha, Upma, and Idli-Sambar maintain steady satisfaction scores. No action needed.',
            frequency: 3,
            trend: 'stable',
        },
    ];

    // Color schemes
    const WASTE_LEVEL_COLORS: Record<WasteLevel, string> = {
        NONE: '#22c55e',   // green
        LOW: '#84cc16',    // lime
        MEDIUM: '#f59e0b', // amber
        HIGH: '#ef4444',   // red
    };

    const CATEGORY_COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];

    const getInsightIcon = (type: AIInsight['type']) => {
        switch (type) {
            case 'issue': return { icon: '⚠️', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' };
            case 'improvement': return { icon: '📈', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' };
            case 'stable': return { icon: '✓', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' };
        }
    };

    const getTrendIcon = (trend?: AIInsight['trend']) => {
        switch (trend) {
            case 'up': return '↑';
            case 'down': return '↓';
            default: return '→';
        }
    };

    // Prepare pie chart data from waste level distribution
    const getPieChartData = () => {
        if (!analytics) return [];
        return Object.entries(analytics.wasteLevelDistribution).map(([level, count]) => ({
            name: level,
            value: count,
            color: WASTE_LEVEL_COLORS[level as WasteLevel],
        }));
    };

    // Time range labels for display
    const timeRangeLabels: Record<TimeRange, string> = {
        daily: 'Today',
        weekly: 'This Week',
        monthly: 'This Month',
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Insights & AI Analysis</h1>
                    <p className="text-sm text-gray-500">AI-powered feedback analysis and wastage trends</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-xs text-gray-400">AI Analysis last generated</p>
                        <p className="text-sm text-gray-600 font-medium">{lastGenerated}</p>
                    </div>
                    <button 
                        onClick={() => {
                            setAnalytics(getAnalytics(timeRange));
                            setLastGenerated(getLastUpdatedTimestamp());
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0d2137] text-white text-sm font-medium hover:bg-[#152d4a] transition-colors"
                    >
                        <span>🔄</span> Regenerate
                    </button>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setActiveSection('ai')}
                    className={`px-5 py-2.5 text-sm font-medium transition-colors ${activeSection === 'ai'
                        ? 'bg-[#0d2137] text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    🧠 AI Summary & Insights
                </button>
                <button
                    onClick={() => setActiveSection('wastage')}
                    className={`px-5 py-2.5 text-sm font-medium transition-colors ${activeSection === 'wastage'
                        ? 'bg-[#0d2137] text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    📊 Wastage Trends
                </button>
            </div>

            {/* AI Insights Section */}
            {activeSection === 'ai' && (
                <div className="space-y-6">
                    {/* Time Filter */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {timeRange === 'daily' ? 'Daily' : timeRange === 'weekly' ? 'Weekly' : 'Monthly'} Analysis Summary
                        </h2>
                        <div className="flex border border-gray-200 bg-white">
                            {(['daily', 'weekly', 'monthly'] as TimeRange[]).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setTimeRange(filter)}
                                    className={`px-4 py-1.5 text-sm font-medium capitalize transition-colors ${timeRange === filter
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* AI Powered Badge */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 p-4 flex items-center gap-3">
                        <span className="text-2xl">🤖</span>
                        <div>
                            <p className="font-medium text-gray-900">Powered by Gemini AI</p>
                            <p className="text-sm text-gray-500">Analysis is cached and regenerated {timeRange}. Shows relative trends, not absolute predictions.</p>
                        </div>
                    </div>

                    {/* Insights Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Top Issues */}
                        <div className="bg-white border border-gray-200 p-5">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-red-500">⚠️</span> Top Issues {timeRangeLabels[timeRange]}
                            </h3>
                            <div className="space-y-3">
                                {aiInsights.filter(i => i.type === 'issue').map((insight) => {
                                    const style = getInsightIcon(insight.type);
                                    return (
                                        <div key={insight.id} className={`p-4 ${style.bg} border ${style.border}`}>
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className={`font-medium ${style.text}`}>{insight.title}</h4>
                                                <span className="text-xs bg-white px-2 py-0.5 border border-gray-200">
                                                    {insight.frequency} mentions {getTrendIcon(insight.trend)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">{insight.description}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            {/* Improvements */}
                            <div className="bg-white border border-gray-200 p-5">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-green-500">📈</span> Recent Improvements
                                </h3>
                                {aiInsights.filter(i => i.type === 'improvement').map((insight) => {
                                    const style = getInsightIcon(insight.type);
                                    return (
                                        <div key={insight.id} className={`p-4 ${style.bg} border ${style.border}`}>
                                            <h4 className={`font-medium ${style.text} mb-1`}>{insight.title}</h4>
                                            <p className="text-sm text-gray-600">{insight.description}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Stable Items */}
                            <div className="bg-white border border-gray-200 p-5">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-blue-500">✓</span> Well-Performing Dishes
                                </h3>
                                <div className="space-y-3">
                                    {aiInsights.filter(i => i.type === 'stable').map((insight) => {
                                        const style = getInsightIcon(insight.type);
                                        return (
                                            <div key={insight.id} className={`p-3 ${style.bg} border ${style.border}`}>
                                                <h4 className={`font-medium text-sm ${style.text}`}>{insight.title}</h4>
                                                <p className="text-xs text-gray-500 mt-1">{insight.description}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Wastage Trends Section */}
            {activeSection === 'wastage' && (
                <div className="space-y-6">
                    {/* Time Filter for Wastage */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Wastage Analytics</h2>
                        <div className="flex border border-gray-200 bg-white">
                            {(['daily', 'weekly', 'monthly'] as TimeRange[]).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setTimeRange(filter)}
                                    className={`px-4 py-1.5 text-sm font-medium capitalize transition-colors ${timeRange === filter
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Summary Statistics Cards */}
                    {isLoading ? (
                        <div className="grid grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-white border border-gray-200 p-5 animate-pulse">
                                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                                </div>
                            ))}
                        </div>
                    ) : analytics && (
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-white border border-gray-200 p-5">
                                <p className="text-sm text-gray-500 mb-1">Total Analyses</p>
                                <p className="text-2xl font-bold text-gray-900">{analytics.totalAnalyses.toLocaleString()}</p>
                                <p className={`text-xs mt-1 ${analytics.comparisonToPrevious.analysisCountChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {analytics.comparisonToPrevious.analysisCountChange >= 0 ? '+' : ''}{analytics.comparisonToPrevious.analysisCountChange} vs previous
                                </p>
                            </div>
                            <div className="bg-white border border-gray-200 p-5">
                                <p className="text-sm text-gray-500 mb-1">Avg Waste %</p>
                                <p className="text-2xl font-bold text-amber-600">{analytics.averageWastePercent}%</p>
                                <p className={`text-xs mt-1 ${analytics.comparisonToPrevious.wasteChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {analytics.comparisonToPrevious.wasteChange >= 0 ? '+' : ''}{analytics.comparisonToPrevious.wasteChange}% vs previous
                                </p>
                            </div>
                            <div className="bg-white border border-gray-200 p-5">
                                <p className="text-sm text-gray-500 mb-1">Most Wasted Item</p>
                                <p className="text-2xl font-bold text-gray-900">{analytics.topWastedItems[0]?.item || 'N/A'}</p>
                                <p className="text-xs text-gray-400 mt-1">{analytics.topWastedItems[0]?.count || 0} instances</p>
                            </div>
                            <div className="bg-white border border-gray-200 p-5">
                                <p className="text-sm text-gray-500 mb-1">Clean Plates</p>
                                <p className="text-2xl font-bold text-green-600">{analytics.wasteLevelDistribution.NONE}</p>
                                <p className="text-xs text-gray-400 mt-1">Zero waste analyses</p>
                            </div>
                        </div>
                    )}

                    {/* Charts Grid */}
                    {!isLoading && analytics && (
                        <div className="grid grid-cols-3 gap-4">
                            {/* Line Chart - Trend over time */}
                            <div className="col-span-2 bg-white border border-gray-200 p-5">
                                <h3 className="font-semibold text-gray-900 mb-4">Wastage Trend by Category (kg)</h3>
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={analytics.trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <Tooltip contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 0, boxShadow: 'none' }} />
                                        <Legend />
                                        <Line type="monotone" dataKey="vegetables" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Vegetables" />
                                        <Line type="monotone" dataKey="grains" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Grains" />
                                        <Line type="monotone" dataKey="dairy" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Dairy" />
                                        <Line type="monotone" dataKey="proteins" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Proteins" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Pie Chart - Waste Level Distribution */}
                            <div className="bg-white border border-gray-200 p-5">
                                <h3 className="font-semibold text-gray-900 mb-4">Waste Level Distribution</h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={getPieChartData()}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {getPieChartData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap justify-center gap-3 mt-2">
                                    {Object.entries(WASTE_LEVEL_COLORS).map(([level, color]) => (
                                        <div key={level} className="flex items-center gap-1.5">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                                            <span className="text-xs text-gray-600">{level}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bar Chart - Top Wasted Items */}
                    {!isLoading && analytics && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white border border-gray-200 p-5">
                                <h3 className="font-semibold text-gray-900 mb-4">Top Wasted Food Items</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={analytics.topWastedItems} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <YAxis type="category" dataKey="item" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} width={80} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Waste Count" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* AI Recommendations */}
                            <div className="bg-white border border-gray-200 p-5">
                                <h3 className="font-semibold text-gray-900 mb-4">AI Recommendations</h3>
                                <div className="space-y-3">
                                    <div className="p-4 bg-teal-50 border border-teal-200">
                                        <p className="font-medium text-teal-800 mb-2">📉 Reduce Portion Sizes</p>
                                        <p className="text-sm text-teal-700">
                                            {analytics.topWastedItems[0]?.item || 'Top item'} shows high wastage. Consider smaller default portions with refill option.
                                        </p>
                                    </div>
                                    <div className="p-4 bg-blue-50 border border-blue-200">
                                        <p className="font-medium text-blue-800 mb-2">🕐 Adjust Preparation Timing</p>
                                        <p className="text-sm text-blue-700">Rice wastage peaks at dinner. Prepare 15% less for weekday dinners based on intent data.</p>
                                    </div>
                                    <div className="p-4 bg-purple-50 border border-purple-200">
                                        <p className="font-medium text-purple-800 mb-2">📋 Menu Optimization</p>
                                        <p className="text-sm text-purple-700">Rotate unpopular sabzis less frequently. Consider student preferences from feedback.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
