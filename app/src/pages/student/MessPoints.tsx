import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import type { PointTransaction, LeaderboardEntry, Reward, UserUsageStats } from '../../services/firestore';
import * as firestore from '../../services/firestore';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function MessPoints() {
    const { theme } = useTheme();
    const { userData, user } = useAuth();
    const [activeTab, setActiveTab] = useState<'history' | 'leaderboard' | 'rewards'>('history');
    const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
    const [loading, setLoading] = useState(true);
    const [redeeming, setRedeeming] = useState<string | null>(null);

    // Dynamic data state
    const [transactions, setTransactions] = useState<PointTransaction[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [usageStats, setUsageStats] = useState<UserUsageStats>({ mealsEaten: 0, mealsSkipped: 0, intentAccuracy: 100 });

    const currentPoints = userData?.points || 0;

    // Calculated from transactions for the UI
    const totalEarned = transactions
        .filter(t => t.type === 'earned')
        .reduce((sum, t) => sum + t.amount, 0);
    const totalLost = transactions
        .filter(t => t.type === 'lost')
        .reduce((sum, t) => sum + t.amount, 0);

    const stats = {
        daysEaten: usageStats.mealsEaten,
        daysSkipped: usageStats.mealsSkipped,
        intentAccuracy: usageStats.intentAccuracy,
        currentStreak: userData?.streakDays || 0,
        longestStreak: userData?.bestStreak || 0,
    };

    useEffect(() => {
        if (!user) return;

        setLoading(true);
        // Safety timeout to prevent infinite loading
        const timeout = setTimeout(() => setLoading(false), 5000);

        // 1. Listen to Transactions
        const qTx = query(
            collection(db, 'messPoints'),
            where('userId', '==', user.uid)
        );
        const unsubscribeTx = onSnapshot(qTx, (snapshot) => {
            const txData = snapshot.docs.map(doc => {
                const data = doc.data();

                // Handle legacy schema (points instead of amount/type)
                let amount = data.amount;
                let type = data.type;

                if (amount === undefined && data.points !== undefined) {
                    amount = Math.abs(data.points);
                    type = data.points >= 0 ? 'earned' : 'lost';
                }

                return {
                    id: doc.id,
                    ...data,
                    amount: amount || 0,
                    type: type || 'earned',
                    date: data.date?.toDate?.() || data.createdAt?.toDate?.() || (data.date ? new Date(data.date) : new Date()),
                    createdAt: data.createdAt?.toDate?.() || new Date(),
                };
            }) as PointTransaction[];

            // Sort in-memory
            setTransactions(txData.sort((a, b) => {
                const dateA = a.date instanceof Date ? a.date.getTime() : 0;
                const dateB = b.date instanceof Date ? b.date.getTime() : 0;
                return dateB - dateA;
            }));
            setLoading(false);
            clearTimeout(timeout);
        },
            (error) => {
                console.error('Transactions listener error:', error);
                setLoading(false);
                clearTimeout(timeout);
            }
        );

        // 2. Listen to Leaders
        // Note: For a real huge leaderboard, we'd use a cloud function or better query
        const qLb = query(
            collection(db, 'users'),
            where('role', '==', 'student')
        );
        const unsubscribeLb = onSnapshot(qLb,
            (snapshot) => {
                try {
                    const lbData = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            uid: doc.id,
                            name: data.displayName || data.name || 'Student',
                            room: data.room || 'N/A',
                            points: data.points || 0,
                            isCurrentUser: doc.id === user.uid,
                        };
                    }).sort((a, b) => b.points - a.points)
                        .slice(0, 50)
                        .map((s, index) => ({ ...s, rank: index + 1 }));

                    setLeaderboard(lbData);
                } catch (err) {
                    console.error('Leaderboard parsing error:', err);
                }
            },
            (error) => {
                console.error('Leaderboard listener error:', error);
            }
        );

        // 3. One-time fetch for rewards and usage stats
        firestore.getRewards().then(setRewards).catch(console.error);
        firestore.getUserUsageStats(user.uid).then(setUsageStats).catch(console.error);

        return () => {
            unsubscribeTx();
            unsubscribeLb();
            clearTimeout(timeout);
        };
    }, [user]);

    const handleRedeem = async (reward: Reward) => {
        if (!user) return;
        setRedeeming(reward.id);
        try {
            const result = await firestore.redeemReward(user.uid, reward);
            if (result.success) {
                // Refresh data
                const txData = await firestore.getPointTransactions(user.uid);
                setTransactions(txData);
                // userData will be updated by AuthContext when points change in Firestore
            } else {
                alert(result.error || 'Failed to redeem reward');
            }
        } catch (error) {
            console.error('Redemption error:', error);
        } finally {
            setRedeeming(null);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    if (loading && transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Loading your points data...</p>
            </div>
        );
    }

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
                                    style={{ width: `${(stats.daysEaten + stats.daysSkipped) === 0 ? 0 : (stats.daysEaten / (stats.daysEaten + stats.daysSkipped)) * 100}%` }}
                                />
                            </div>
                            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                {(stats.daysEaten + stats.daysSkipped) === 0 ? 0 : Math.round((stats.daysEaten / (stats.daysEaten + stats.daysSkipped)) * 100)}% attendance rate
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
                            {transactions.length > 0 ? (
                                transactions.map((tx) => (
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
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        No transactions yet. Start participating in mess activities to earn points!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'leaderboard' && (
                        <div className="space-y-2">
                            {leaderboard.length > 0 ? (
                                <>
                                    {(showAllLeaderboard ? leaderboard : leaderboard.slice(0, 5)).map((entry) => (
                                        <div key={entry.uid} className={`flex items-center justify-between p-3 rounded-xl ${entry.isCurrentUser
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
                                </>
                            ) : (
                                <div className="text-center py-10">
                                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Leaderboard is currently empty.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'rewards' && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {rewards.length > 0 ? (
                                rewards.map((reward) => (
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
                                            onClick={() => handleRedeem(reward)}
                                            disabled={currentPoints < reward.cost || !reward.available || redeeming === reward.id}
                                            className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${currentPoints >= reward.cost && reward.available
                                                ? 'bg-green-600 hover:bg-green-500 text-white'
                                                : theme === 'dark'
                                                    ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                        >
                                            {redeeming === reward.id ? 'Redeeming...' :
                                                !reward.available ? 'Unavailable' :
                                                    currentPoints < reward.cost ? 'Not enough' : 'Redeem'}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-10">
                                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        No rewards available at the moment.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
