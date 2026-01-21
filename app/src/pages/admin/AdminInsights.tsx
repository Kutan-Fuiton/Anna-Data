import { useState, useEffect } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import {
    getAnalytics,
    type AnalyticsSummary, type WasteLevel
} from '../../services/analyticsService';
import {
    fetchAIInsights,
    regenerateAIInsights,
    type StructuredAIInsights,
    type AIInsightItem,
    type TimeRange
} from '../../services/firestore';

export default function AdminInsights() {
    const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
    const [activeSection, setActiveSection] = useState<'ai' | 'wastage'>('ai');
    const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
    const [lastGenerated, setLastGenerated] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    // Real AI insights state
    const [aiInsights, setAiInsights] = useState<StructuredAIInsights | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(true);
    const [isRegenerating, setIsRegenerating] = useState(false);

    // Load analytics data when time range changes
    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            setAnalytics(getAnalytics(timeRange));
            setIsLoading(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [timeRange]);

    // Load AI insights when time range changes
    useEffect(() => {
        loadAIInsights();
    }, [timeRange]);

    const loadAIInsights = async () => {
        setIsLoadingAI(true);
        try {
            const insights = await fetchAIInsights(timeRange);
            setAiInsights(insights);
            if (insights?.generatedAt) {
                setLastGenerated(formatDate(insights.generatedAt));
            } else {
                setLastGenerated('Never');
            }
        } catch (error) {
            console.error('Failed to load AI insights:', error);
        } finally {
            setIsLoadingAI(false);
        }
    };

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        try {
            const insights = await regenerateAIInsights(timeRange);
            if (insights) {
                setAiInsights(insights);
                setLastGenerated(formatDate(new Date()));
            }
        } catch (error) {
            console.error('Failed to regenerate AI insights:', error);
        } finally {
            setIsRegenerating(false);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    // Color schemes
    const WASTE_LEVEL_COLORS: Record<WasteLevel, string> = {
        NONE: '#22c55e',   // green
        LOW: '#84cc16',    // lime
        MEDIUM: '#f59e0b', // amber
        HIGH: '#ef4444',   // red
    };

    const getInsightStyle = (type: 'issue' | 'improvement' | 'stable') => {
        switch (type) {
            case 'issue': return { icon: '⚠️', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' };
            case 'improvement': return { icon: '📈', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' };
            case 'stable': return { icon: '✓', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' };
        }
    };

    const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
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

    // Transform AI insights for display
    const issueInsights: AIInsightItem[] = aiInsights?.issues || [];
    const improvementInsights: AIInsightItem[] = aiInsights?.improvements || [];
    const stableInsights: AIInsightItem[] = aiInsights?.wellPerforming || [];

    const hasNoInsights = !isLoadingAI && (!aiInsights ||
        (issueInsights.length === 0 && improvementInsights.length === 0 && stableInsights.length === 0));

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Insights & AI Analysis</h1>
                    <p className="text-sm text-gray-500">AI-powered feedback analysis and wastage trends</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <div className="text-left sm:text-right">
                        <p className="text-xs text-gray-400">AI Analysis last generated</p>
                        <p className="text-sm text-gray-600 font-medium">{lastGenerated || 'Loading...'}</p>
                    </div>
                    <button
                        onClick={handleRegenerate}
                        disabled={isRegenerating}
                        className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium transition-colors ${isRegenerating
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-[#0d2137] hover:bg-[#152d4a]'
                            }`}
                    >
                        {isRegenerating ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span>Analyzing...</span>
                            </>
                        ) : (
                            <>
                                <span>🔄</span> Regenerate
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex flex-wrap gap-2 sm:gap-4 mb-6">
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
                            <p className="text-sm text-gray-500">
                                Analysis is generated from real student feedback. Shows patterns and trends from actual submissions.
                                {aiInsights?.meta && (
                                    <span className="ml-2 text-purple-600">
                                        ({aiInsights.meta.totalFeedback} feedback entries analyzed)
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Loading State */}
                    {isLoadingAI && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {[1, 2].map(i => (
                                <div key={i} className="bg-white border border-gray-200 p-5 animate-pulse">
                                    <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(j => (
                                            <div key={j} className="h-24 bg-gray-100 rounded"></div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No Data State */}
                    {hasNoInsights && (
                        <div className="bg-white border border-gray-200 p-8 text-center">
                            <span className="text-4xl mb-4 block">📊</span>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No AI Insights Available</h3>
                            <p className="text-gray-500 mb-4">
                                {aiInsights?.summary || `No student feedback has been submitted for the ${timeRange} period yet.`}
                            </p>
                            <button
                                onClick={handleRegenerate}
                                disabled={isRegenerating}
                                className="px-4 py-2 bg-[#0d2137] text-white text-sm font-medium hover:bg-[#152d4a] transition-colors"
                            >
                                Generate Insights from Current Data
                            </button>
                        </div>
                    )}

                    {/* Insights Grid */}
                    {!isLoadingAI && !hasNoInsights && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Top Issues */}
                            <div className="bg-white border border-gray-200 p-5">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-red-500">⚠️</span> Top Issues {timeRangeLabels[timeRange]}
                                </h3>
                                {issueInsights.length === 0 ? (
                                    <p className="text-gray-500 text-sm p-4 bg-gray-50 rounded">
                                        No significant issues detected in the current period. 🎉
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {issueInsights.map((insight) => {
                                            const style = getInsightStyle('issue');
                                            return (
                                                <div key={insight.id} className={`p-4 ${style.bg} border ${style.border}`}>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h4 className={`font-medium ${style.text}`}>{insight.title}</h4>
                                                        {insight.frequency && (
                                                            <span className="text-xs bg-white px-2 py-0.5 border border-gray-200">
                                                                {insight.frequency} mentions {getTrendIcon(insight.trend)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600">{insight.description}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Right Column */}
                            <div className="space-y-4">
                                {/* Improvements */}
                                <div className="bg-white border border-gray-200 p-5">
                                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <span className="text-green-500">📈</span> Recent Improvements
                                    </h3>
                                    {improvementInsights.length === 0 ? (
                                        <p className="text-gray-500 text-sm p-4 bg-gray-50 rounded">
                                            No specific improvements noted yet.
                                        </p>
                                    ) : (
                                        improvementInsights.map((insight) => {
                                            const style = getInsightStyle('improvement');
                                            return (
                                                <div key={insight.id} className={`p-4 ${style.bg} border ${style.border} mb-3`}>
                                                    <h4 className={`font-medium ${style.text} mb-1`}>{insight.title}</h4>
                                                    <p className="text-sm text-gray-600">{insight.description}</p>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Stable Items */}
                                <div className="bg-white border border-gray-200 p-5">
                                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <span className="text-blue-500">✓</span> Well-Performing Dishes
                                    </h3>
                                    {stableInsights.length === 0 ? (
                                        <p className="text-gray-500 text-sm p-4 bg-gray-50 rounded">
                                            More feedback needed to identify top performers.
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {stableInsights.map((insight) => {
                                                const style = getInsightStyle('stable');
                                                return (
                                                    <div key={insight.id} className={`p-3 ${style.bg} border ${style.border}`}>
                                                        <h4 className={`font-medium text-sm ${style.text}`}>{insight.title}</h4>
                                                        <p className="text-xs text-gray-500 mt-1">{insight.description}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Summary */}
                    {!isLoadingAI && aiInsights?.summary && !hasNoInsights && (
                        <div className="bg-white border border-gray-200 p-5">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span>📝</span> Executive Summary
                            </h3>
                            <p className="text-gray-700 leading-relaxed">{aiInsights.summary}</p>
                        </div>
                    )}
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-white border border-gray-200 p-5 animate-pulse">
                                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                                </div>
                            ))}
                        </div>
                    ) : analytics && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Line Chart - Trend over time */}
                            <div className="lg:col-span-2 bg-white border border-gray-200 p-4 sm:p-5">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
