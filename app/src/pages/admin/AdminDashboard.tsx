import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type TimeRange = 'daily' | 'weekly' | 'monthly';

interface Complaint {
    id: string;
    dishName: string;
    complaintType: string;
    frequency: number;
    sentiment: 'critical' | 'warning' | 'moderate' | 'good';
}

export default function AdminDashboard() {
    const [timeRange, setTimeRange] = useState<TimeRange>('daily');

    // Mock data
    const lastUpdated = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const kpis = {
        predicted: 850,
        actual: 820,
        accuracy: 96,
        tomorrowForecast: 890,
        forecastChange: 8,
        predictionError: 5,
        errorImprovement: 1,
        wastageTrend: -12,
        goalMet: true,
    };

    const attendanceData = [
        { day: 'Mon', predicted: 820, actual: 790 },
        { day: 'Tue', predicted: 850, actual: 830 },
        { day: 'Wed', predicted: 840, actual: 820 },
        { day: 'Thu', predicted: 870, actual: 890 },
        { day: 'Fri', predicted: 900, actual: 870 },
        { day: 'Sat', predicted: 780, actual: 760 },
        { day: 'Sun', predicted: 820, actual: 800 },
    ];

    const wastageByCategory = [
        { category: 'Vegetables', percentage: 45 },
        { category: 'Grains/Rice', percentage: 30 },
        { category: 'Dairy', percentage: 15 },
        { category: 'Proteins', percentage: 10 },
    ];

    const complaints: Complaint[] = [
        { id: '1', dishName: 'Paneer Butter Masala', complaintType: 'Texture (Too oily)', frequency: 12, sentiment: 'critical' },
        { id: '2', dishName: 'Steamed Rice', complaintType: 'Undercooked', frequency: 8, sentiment: 'warning' },
        { id: '3', dishName: 'Mixed Vegetable Curry', complaintType: 'Spiciness (High)', frequency: 5, sentiment: 'moderate' },
        { id: '4', dishName: 'Dal Tadka', complaintType: 'Temperature (Cold)', frequency: 2, sentiment: 'good' },
    ];

    const getSentimentStyle = (sentiment: Complaint['sentiment']) => {
        switch (sentiment) {
            case 'critical': return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
            case 'warning': return { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' };
            case 'moderate': return { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' };
            case 'good': return { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' };
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Operational Dashboard</h1>
                    <p className="text-sm text-gray-500">Overview of operational efficiency and feedback metrics</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">Last updated: Today, {lastUpdated}</span>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
                        <span>↓</span> Download Report
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#0d2137] text-white text-sm font-medium hover:bg-[#152d4a] transition-colors">
                        <span>+</span> New Entry
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {/* Predicted vs Actual */}
                <div className="bg-white border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Predicted vs Actual</p>
                        <span className="text-gray-400">👥</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                        {kpis.predicted} <span className="text-lg font-normal text-gray-400">/ {kpis.actual}</span>
                    </p>
                    <p className="text-sm text-teal-600 mt-1">↗ +{kpis.accuracy}% Accuracy</p>
                </div>

                {/* Tomorrow's Forecast */}
                <div className="bg-white border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tomorrow's Forecast</p>
                        <span className="text-gray-400">📅</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                        {kpis.tomorrowForecast} <span className="text-lg font-normal text-gray-400">Students</span>
                    </p>
                    <p className="text-sm text-teal-600 mt-1">↗ +{kpis.forecastChange}% vs Today</p>
                </div>

                {/* Prediction Error */}
                <div className="bg-white border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prediction Error</p>
                        <span className="text-gray-400">📊</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{kpis.predictionError}%</p>
                    <p className="text-sm text-teal-600 mt-1">↘ -{kpis.errorImprovement}% Improved</p>
                </div>

                {/* Wastage Trend */}
                <div className="bg-white border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Wastage Trend</p>
                        <span className="text-gray-400">🗑️</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{kpis.wastageTrend}kg</p>
                    <p className={`text-sm mt-1 ${kpis.goalMet ? 'text-teal-600' : 'text-orange-600'}`}>
                        {kpis.goalMet ? '✓ Goal Met' : '○ In Progress'}
                    </p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Attendance Accuracy Chart */}
                <div className="col-span-2 bg-white border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Attendance Accuracy</h3>
                        <div className="flex border border-gray-200">
                            {(['daily', 'weekly', 'monthly'] as TimeRange[]).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-4 py-1.5 text-sm font-medium capitalize transition-colors ${timeRange === range
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={attendanceData} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 0, boxShadow: 'none' }}
                            />
                            <Legend
                                wrapperStyle={{ paddingTop: 10 }}
                                iconType="square"
                            />
                            <Bar dataKey="predicted" fill="#94a3b8" name="Predicted" />
                            <Bar dataKey="actual" fill="#0d9488" name="Actual" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Wastage by Category */}
                <div className="bg-white border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-4">Wastage by Category</h3>
                    <div className="space-y-4">
                        {wastageByCategory.map((item) => (
                            <div key={item.category}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">{item.category}</span>
                                    <span className="font-medium text-gray-900">{item.percentage}%</span>
                                </div>
                                <div className="h-3 bg-gray-100">
                                    <div
                                        className="h-3 bg-teal-600 transition-all"
                                        style={{ width: `${item.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Dish Complaint Frequency Table */}
            <div className="bg-white border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Dish Complaint Frequency</h3>
                    <button className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                        View All Feedback
                    </button>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            <th className="pb-3">Dish Name</th>
                            <th className="pb-3">Complaint Type</th>
                            <th className="pb-3">Frequency</th>
                            <th className="pb-3">Sentiment Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {complaints.map((complaint) => {
                            const style = getSentimentStyle(complaint.sentiment);
                            return (
                                <tr key={complaint.id} className="border-t border-gray-100">
                                    <td className="py-3 text-gray-900 font-medium">{complaint.dishName}</td>
                                    <td className="py-3 text-gray-500">{complaint.complaintType}</td>
                                    <td className="py-3 text-gray-900 font-semibold">{complaint.frequency}</td>
                                    <td className="py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium uppercase ${style.bg} ${style.text}`}>
                                            <span className={`w-2 h-2 ${style.dot}`}></span>
                                            {complaint.sentiment}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
