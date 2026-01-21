import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import AttendanceNotifications from '../admin/AttendanceNotifications';

const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
};

export default function AdminLayout() {
    const { userData, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { username } = useParams<{ username: string }>();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Dynamic nav items based on username
    const navItems = [
        { path: `/${username}/admin`, icon: '📊', label: 'Dashboard', end: true },
        { path: `/${username}/admin/insights`, icon: '🧠', label: 'Insights & AI', end: false },
        { path: `/${username}/admin/operations`, icon: '⚙️', label: 'Operations', end: false },
    ];

    const handleLogout = async () => {
        await logout();
        navigate('/', { replace: true });
    };

    // Close sidebar when navigating on mobile
    const handleNavClick = () => {
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    };

    // Generate initials from display name or email
    const getInitials = () => {
        if (userData?.displayName) {
            return userData.displayName
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        if (userData?.email) {
            return userData.email.slice(0, 2).toUpperCase();
        }
        return 'A';
    };

    const getFormattedName = () => {
        if (userData?.displayName) return userData.displayName;
        const fallback = userData?.email?.split('@')[0] || 'Admin';
        return fallback
            .split(/[._]/)
            .filter(part => isNaN(Number(part)))
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    };

    const finalDisplayName = getFormattedName();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Header with Hamburger */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-[#0d2137] text-white">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="AnnaData" className="h-8 w-8 object-contain" />
                    <span className="font-bold">AnnaData Admin</span>
                </div>
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10"
                >
                    {sidebarOpen ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Fixed on desktop, slide-in on mobile */}
            <aside className={`
                fixed h-full z-50 flex flex-col transition-transform duration-300
                w-56 lg:translate-x-0 bg-[#0d2137] text-white
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Logo - Hidden on mobile (shown in header) */}
                <div className="hidden lg:flex p-5 items-center gap-3 border-b border-white/10">
                    <img src="/logo.png" alt="AnnaData" className="w-9 h-9 object-contain" />
                    <div>
                        <span className="font-bold text-lg block">AnnaData</span>
                        <span className="text-xs text-teal-400 uppercase tracking-wide">Admin</span>
                    </div>
                </div>

                {/* Mobile top spacing */}
                <div className="lg:hidden h-16" />

                {/* Navigation */}
                <nav className="flex-1 py-4 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            onClick={handleNavClick}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-5 py-3 text-sm transition-all ${isActive
                                    ? 'bg-teal-600 text-white border-l-4 border-teal-400'
                                    : 'text-gray-300 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                                }`
                            }
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
                {/* User Profile */}
                <div className="mt-auto p-6 border-t border-white/10">
                    <div className="flex flex-col items-center text-center">
                        <div className="relative group mb-3">
                            <div className="w-20 h-20 rounded-full bg-teal-600 flex items-center justify-center text-3xl text-white font-bold shadow-xl transition-transform group-hover:scale-105">
                                {getInitials()}
                                <div className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-lg border border-gray-100 text-gray-900 text-xs">
                                    📷
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1 mb-4">
                            <p className="text-xl font-bold text-white">{finalDisplayName}</p>
                            <p className="text-sm text-gray-400 truncate max-w-full">{userData?.email}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full py-2 px-4 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                            <span>🚪</span> Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-56 pt-16 lg:pt-0 min-h-screen">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ type: 'tween', ease: 'easeOut', duration: 0.15 }}
                        className="min-h-screen"
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Real-time Attendance Notifications */}
            <AttendanceNotifications />
        </div>
    );
}
