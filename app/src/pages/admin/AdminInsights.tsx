import { useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

type TimeFilter = 'week' | 'month' | 'quarter';

interface AIInsight {
    id: string;
    type: 'issue' | 'improvement' | 'stable';
    title: string;
    description: string;
    frequency?: number;
    trend?: 'up' | 'down' | 'stable';
}

interface WastageTrend {
    date: string;
    vegetables: number;
    grains: number;
    dairy: number;
    proteins: number;
}

export default function AdminInsights() {
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
    const [activeSection, setActiveSection] = useState<'ai' | 'wastage'>('ai');

    // Last updated timestamp
    const lastGenerated = 'January 15, 2026 at 11:30 PM';

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

    // Wastage trend data (aggregated, no individual data)
    const wastageTrendData: WastageTrend[] = [
        { date: 'Week 1', vegetables: 42, grains: 28, dairy: 15, proteins: 12 },
        { date: 'Week 2', vegetables: 38, grains: 32, dairy: 18, proteins: 10 },
        { date: 'Week 3', vegetables: 45, grains: 25, dairy: 14, proteins: 15 },
        { date: 'Week 4', vegetables: 35, grains: 30, dairy: 20, proteins: 11 },
    ];

    const categoryWastage = [
        { category: 'Sabzi / Vegetables', amount: 38, change: -8, examples: 'Mixed Veg, Bhindi, Baingan' },
        { category: 'Dal / Lentils', amount: 22, change: -12, examples: 'Dal Tadka, Chana Dal, Rajma' },
        { category: 'Rice / Grains', amount: 28, change: +5, examples: 'Jeera Rice, Pulao, Plain Rice' },
        { category: 'Roti / Breads', amount: 12, change: -15, examples: 'Chapati, Paratha, Naan' },
    ];

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
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#0d2137] text-white text-sm font-medium hover:bg-[#152d4a] transition-colors">
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
                    📊 Wastage Trends (Experimental)
                </button>
            </div>

            {/* AI Insights Section */}
            {activeSection === 'ai' && (
                <div className="space-y-6">
                    {/* Time Filter */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Weekly Analysis Summary</h2>
                        <div className="flex border border-gray-200 bg-white">
                            {(['week', 'month', 'quarter'] as TimeFilter[]).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setTimeFilter(filter)}
                                    className={`px-4 py-1.5 text-sm font-medium capitalize transition-colors ${timeFilter === filter
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
                            <p className="text-sm text-gray-500">Analysis is cached and regenerated weekly. Shows relative trends, not absolute predictions.</p>
                        </div>
                    </div>

                    {/* Insights Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Top Issues */}
                        <div className="bg-white border border-gray-200 p-5">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-red-500">⚠️</span> Top Issues This Week
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
                    {/* Disclaimer */}
                    <div className="bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                        <span className="text-xl">⚠️</span>
                        <div>
                            <p className="font-medium text-amber-800">Experimental Feature</p>
                            <p className="text-sm text-amber-700">This data shows aggregated wastage trends only. No individual student data or images are used. Results are for relative comparison, not absolute measurement.</p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-3 gap-4">
                        {/* Trend Chart */}
                        <div className="col-span-2 bg-white border border-gray-200 p-5">
                            <h3 className="font-semibold text-gray-900 mb-4">Wastage Trend by Category (kg, aggregated)</h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={wastageTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <Tooltip contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 0, boxShadow: 'none' }} />
                                    <Line type="monotone" dataKey="vegetables" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Vegetables" />
                                    <Line type="monotone" dataKey="grains" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Grains" />
                                    <Line type="monotone" dataKey="dairy" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Dairy" />
                                    <Line type="monotone" dataKey="proteins" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Proteins" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Category Breakdown */}
                        <div className="bg-white border border-gray-200 p-5">
                            <h3 className="font-semibold text-gray-900 mb-4">This Week's Breakdown</h3>
                            <div className="space-y-4">
                                {categoryWastage.map((item) => (
                                    <div key={item.category}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-700 font-medium">{item.category}</span>
                                            <span className={`font-semibold ${item.change < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {item.change > 0 ? '+' : ''}{item.change}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-100 mb-1">
                                            <div
                                                className="h-2 bg-teal-600 transition-all"
                                                style={{ width: `${item.amount}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400">{item.examples}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-white border border-gray-200 p-5">
                        <h3 className="font-semibold text-gray-900 mb-4">AI Recommendations for Reducing Wastage</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-teal-50 border border-teal-200">
                                <p className="font-medium text-teal-800 mb-2">📉 Reduce Portion Sizes</p>
                                <p className="text-sm text-teal-700">Mixed Vegetable Curry shows 40% wastage. Consider smaller default portions with refill option.</p>
                            </div>
                            <div className="p-4 bg-blue-50 border border-blue-200">
                                <p className="font-medium text-blue-800 mb-2">🕐 Adjust Preparation Timing</p>
                                <p className="text-sm text-blue-700">Rice wastage peaks at dinner. Prepare 15% less for weekday dinners based on intent data.</p>
                            </div>
                            <div className="p-4 bg-purple-50 border border-purple-200">
                                <p className="font-medium text-purple-800 mb-2">📋 Menu Optimization</p>
                                <p className="text-sm text-purple-700">Rotate unpopular sabzis less frequently. Baingan Bharta has 3x higher wastage than average.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
