import { useState } from 'react';
import { useTheme } from '../../context/ThemeProvider';

interface PointTransaction {
    id: string;
    type: 'earned' | 'lost';
    amount: number;
    reason: string;
    date: Date;
}

interface LeaderboardEntry {
    rank: number;
    name: string;
    room: string;
    points: number;
    isCurrentUser: boolean;
}

interface Reward {
    id: string;
    name: string;
    cost: number;
    icon: string;
    available: boolean;
}

export default function MessPoints() {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<'history' | 'leaderboard' | 'rewards'>('history');
    const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);

    // Mock data
    const currentPoints = 850;
    const totalEarned = 1200;
    const totalLost = 350;

    const stats = {
        daysEaten: 45,
        daysSkipped: 5,
        intentAccuracy: 92,
        currentStreak: 12,
        longestStreak: 18,
    };

    const transactions: PointTransaction[] = [
        { id: '1', type: 'earned', amount: 10, reason: 'Meal attendance - Lunch', date: new Date(2026, 0, 16) },
        { id: '2', type: 'earned', amount: 10, reason: 'Meal attendance - Dinner', date: new Date(2026, 0, 16) },
        { id: '3', type: 'lost', amount: 50, reason: 'No-show penalty', date: new Date(2026, 0, 15) },
        { id: '4', type: 'earned', amount: 10, reason: 'Meal attendance - Lunch', date: new Date(2026, 0, 15) },
        { id: '5', type: 'earned', amount: 25, reason: 'Weekly feedback bonus', date: new Date(2026, 0, 14) },
        { id: '6', type: 'lost', amount: 30, reason: 'Late leave cancellation', date: new Date(2026, 0, 12) },
    ];

    const leaderboard: LeaderboardEntry[] = [
        { rank: 1, name: 'Priya Sharma', room: '201-A', points: 1250, isCurrentUser: false },
        { rank: 2, name: 'Amit Kumar', room: '305-C', points: 1180, isCurrentUser: false },
        { rank: 3, name: 'Sneha Patel', room: '102-B', points: 1050, isCurrentUser: false },
        { rank: 4, name: 'Rahul Sharma', room: '304-B', points: 850, isCurrentUser: true },
        { rank: 5, name: 'Vikram Singh', room: '408-A', points: 820, isCurrentUser: false },
        { rank: 6, name: 'Ananya Gupta', room: '203-C', points: 780, isCurrentUser: false },
        { rank: 7, name: 'Neha Verma', room: '105-D', points: 750, isCurrentUser: false },
        { rank: 8, name: 'Arjun Reddy', room: '402-B', points: 720, isCurrentUser: false },
        { rank: 9, name: 'Kavita Nair', room: '301-A', points: 690, isCurrentUser: false },
        { rank: 10, name: 'Ravi Mehta', room: '207-C', points: 650, isCurrentUser: false },
    ];

    const rewards: Reward[] = [
        { id: '1', name: 'Extra Dessert', cost: 100, icon: '🍮', available: true },
        { id: '2', name: 'Fast Pass', cost: 200, icon: '⚡', available: true },
        { id: '3', name: 'Special Menu Item', cost: 500, icon: '🍕', available: true },
        { id: '4', name: 'Free Meal Day', cost: 1000, icon: '🎉', available: false },
    ];

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <p className={`text-sm font-medium uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-green-500' : 'text-green-600'
                    }`}>
                    ACCOUNTABILITY
                </p>
                <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                    Your Mess Points
                </h1>
            </div>

            {/* Top Row - Points Summary & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Points Card - Large */}
                <div className={`rounded-2xl p-6 ${theme === 'dark'
                    ? 'bg-gradient-to-br from-green-900/50 to-[#151d17] border border-green-900/30'
                    : 'bg-gradient-to-br from-green-50 to-white border border-green-200 shadow-sm'
                    }`}>
                    <div className="text-center mb-4">
                        <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'
                            }`}>
                            Current Balance
                        </p>
                        <p className={`text-5xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                            {currentPoints}
                        </p>
                        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                            mess points
                        </p>
                    </div>

                    <div className="flex justify-center gap-6 pt-4 border-t border-green-900/30">
                        <div className="text-center">
                            <p className="text-green-500 font-bold text-lg">+{totalEarned}</p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Earned</p>
                        </div>
                        <div className="text-center">
                            <p className="text-red-500 font-bold text-lg">-{totalLost}</p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Lost</p>
                        </div>
                    </div>
                </div>

                {/* Usage Analytics */}
                <div className={`rounded-2xl p-5 ${theme === 'dark'
                    ? 'bg-[#151d17] border border-green-900/30'
                    : 'bg-white border border-gray-200 shadow-sm'
                    }`}>
                    <h3 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                        Usage Analytics
                    </h3>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Days Eaten</span>
                            <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {stats.daysEaten} days
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Days Skipped</span>
                            <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {stats.daysSkipped} days
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Intent Accuracy</span>
                            <span className={`font-semibold ${stats.intentAccuracy >= 90 ? 'text-green-500' :
                                stats.intentAccuracy >= 70 ? 'text-yellow-500' : 'text-red-500'
                                }`}>
                                {stats.intentAccuracy}%
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="pt-2">
                            <div className={`h-2 rounded-full ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'
                                }`}>
                                <div
                                    className="h-2 rounded-full bg-green-500 transition-all"
                                    style={{ width: `${(stats.daysEaten / (stats.daysEaten + stats.daysSkipped)) * 100}%` }}
                                />
                            </div>
                            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                {Math.round((stats.daysEaten / (stats.daysEaten + stats.daysSkipped)) * 100)}% attendance rate
                            </p>
                        </div>
                    </div>
                </div>

                {/* Streaks */}
                <div className={`rounded-2xl p-5 ${theme === 'dark'
                    ? 'bg-[#151d17] border border-green-900/30'
                    : 'bg-white border border-gray-200 shadow-sm'
                    }`}>
                    <h3 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                        Consistency Streaks
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
                            }`}>
                            <span className="text-3xl">🔥</span>
                            <p className={`text-2xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}>
                                {stats.currentStreak}
                            </p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                Current Streak
                            </p>
                        </div>
                        <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
                            }`}>
                            <span className="text-3xl">🏆</span>
                            <p className={`text-2xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}>
                                {stats.longestStreak}
                            </p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                Best Streak
                            </p>
                        </div>
                    </div>

                    <p className={`text-sm mt-4 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        {stats.longestStreak - stats.currentStreak === 0
                            ? "🎉 You're at your best streak!"
                            : `${stats.longestStreak - stats.currentStreak} more days to beat your record!`
                        }
                    </p>
                </div>
            </div>

            {/* Bottom Section - Tabs */}
            <div className={`rounded-2xl ${theme === 'dark'
                ? 'bg-[#151d17] border border-green-900/30'
                : 'bg-white border border-gray-200 shadow-sm'
                }`}>
                {/* Tab Headers */}
                <div className={`flex border-b ${theme === 'dark' ? 'border-green-900/30' : 'border-gray-200'
                    }`}>
                    {[
                        { key: 'history', label: 'Transaction History', icon: '📋' },
                        { key: 'leaderboard', label: 'Leaderboard', icon: '🏅' },
                        { key: 'rewards', label: 'Redeem Rewards', icon: '🎁' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as typeof activeTab)}
                            className={`flex-1 py-4 px-4 font-medium transition-all flex items-center justify-center gap-2 ${activeTab === tab.key
                                ? theme === 'dark'
                                    ? 'text-green-400 border-b-2 border-green-500 bg-green-900/10'
                                    : 'text-green-600 border-b-2 border-green-500 bg-green-50'
                                : theme === 'dark'
                                    ? 'text-gray-500 hover:text-gray-300'
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-5">
                    {activeTab === 'history' && (
                        <div className="space-y-3">
                            {transactions.map((tx) => (
                                <div key={tx.id} className={`flex items-center justify-between p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'earned'
                                            ? 'bg-green-500/20 text-green-500'
                                            : 'bg-red-500/20 text-red-500'
                                            }`}>
                                            {tx.type === 'earned' ? '↑' : '↓'}
                                        </div>
                                        <div>
                                            <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                {tx.reason}
                                            </p>
                                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {formatDate(tx.date)}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`font-bold ${tx.type === 'earned' ? 'text-green-500' : 'text-red-500'
                                        }`}>
                                        {tx.type === 'earned' ? '+' : '-'}{tx.amount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'leaderboard' && (
                        <div className="space-y-2">
                            {(showAllLeaderboard ? leaderboard : leaderboard.slice(0, 5)).map((entry) => (
                                <div key={entry.rank} className={`flex items-center justify-between p-3 rounded-xl ${entry.isCurrentUser
                                    ? theme === 'dark'
                                        ? 'bg-green-900/30 border border-green-500/30'
                                        : 'bg-green-50 border border-green-200'
                                    : theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${entry.rank === 1 ? 'bg-yellow-500 text-white' :
                                            entry.rank === 2 ? 'bg-gray-400 text-white' :
                                                entry.rank === 3 ? 'bg-orange-600 text-white' :
                                                    theme === 'dark' ? 'bg-white/10 text-gray-400' : 'bg-gray-200 text-gray-500'
                                            }`}>
                                            {entry.rank}
                                        </div>
                                        <div>
                                            <p className={`font-medium ${entry.isCurrentUser
                                                ? 'text-green-500'
                                                : theme === 'dark' ? 'text-white' : 'text-gray-900'
                                                }`}>
                                                {entry.name} {entry.isCurrentUser && '(You)'}
                                            </p>
                                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                Room {entry.room}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {entry.points} pts
                                    </span>
                                </div>
                            ))}
                            {leaderboard.length > 5 && (
                                <button
                                    onClick={() => setShowAllLeaderboard(!showAllLeaderboard)}
                                    className={`w-full py-3 mt-2 rounded-xl font-medium transition-all ${theme === 'dark'
                                            ? 'bg-white/5 text-green-400 hover:bg-white/10'
                                            : 'bg-gray-100 text-green-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {showAllLeaderboard ? 'Show Less ↑' : `Show More (${leaderboard.length - 5} more) ↓`}
                                </button>
                            )}
                        </div>
                    )}

                    {activeTab === 'rewards' && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {rewards.map((reward) => (
                                <div key={reward.id} className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
                                    }`}>
                                    <span className="text-4xl block mb-2">{reward.icon}</span>
                                    <p className={`font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {reward.name}
                                    </p>
                                    <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {reward.cost} points
                                    </p>
                                    <button
                                        disabled={currentPoints < reward.cost || !reward.available}
                                        className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${currentPoints >= reward.cost && reward.available
                                            ? 'bg-green-600 hover:bg-green-500 text-white'
                                            : theme === 'dark'
                                                ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {!reward.available ? 'Unavailable' :
                                            currentPoints < reward.cost ? 'Not enough' : 'Redeem'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
