import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const navItems = [
    { path: '/admin', icon: '📊', label: 'Dashboard', end: true },
    { path: '/admin/insights', icon: '🧠', label: 'Insights & AI', end: false },
    { path: '/admin/operations', icon: '⚙️', label: 'Operations', end: false },
];

const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
};

export default function AdminLayout() {
    const { userData, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/');
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
        <div className="min-h-screen flex bg-gray-50">
            {/* Sidebar */}
            <aside className="w-56 flex flex-col fixed h-full bg-[#0d2137] text-white">
                {/* Logo */}
                <div className="p-5 flex items-center gap-3 border-b border-white/10">
                    <img src="/logo.png" alt="AnnaData" className="w-9 h-9 object-contain" />
                    <div>
                        <span className="font-bold text-lg block">AnnaData</span>
                        <span className="text-xs text-teal-400 uppercase tracking-wide">Admin</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
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
                            <p className="text-sm text-gray-400">{userData?.email}</p>
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
            <main className="flex-1 ml-56">
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
        </div>
    );
}
