import { NavLink, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../context/AuthContext';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
};

export default function StudentLayout() {
    const { theme, toggleTheme } = useTheme();
    const { userData, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { username } = useParams<{ username: string }>();

    // Dynamic nav items based on username
    const navItems = [
        { path: `/${username}`, icon: '📊', label: 'Dashboard', end: true },
        { path: `/${username}/meal-review`, icon: '🍽️', label: 'Meal Review', end: false },
        { path: `/${username}/mess-points`, icon: '⭐', label: 'Mess Points', end: false },
    ];

    const handleLogout = async () => {
        await logout();
        navigate('/', { replace: true });
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
        return 'U';
    };

    const getFormattedName = () => {
        if (userData?.displayName) return userData.displayName;
        const fallback = userData?.email?.split('@')[0] || 'Student';
        return fallback
            .split(/[._]/)
            .filter(part => isNaN(Number(part)))
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    };

    const finalDisplayName = getFormattedName();

    return (
        <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-[#0a0f0a]' : 'bg-gray-50'}`}>
            {/* Sidebar */}
            <aside className={`w-64 flex flex-col fixed h-full ${theme === 'dark'
                ? 'bg-[#0d1410] border-r border-green-900/30'
                : 'bg-white border-r border-gray-200'
                }`}>
                {/* Logo */}
                <div className="p-6 flex items-center gap-3">
                    <img src="/logo.png" alt="AnnaData" className="h-10 w-10 object-contain" />
                    <div>
                        <h1 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            AnnaData
                        </h1>
                        <p className={`text-xs ${theme === 'dark' ? 'text-green-500' : 'text-green-600'}`}>
                            STUDENT PORTAL
                        </p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                    ? theme === 'dark'
                                        ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                                        : 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                                    : theme === 'dark'
                                        ? 'text-gray-400 hover:text-white hover:bg-white/5'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`
                            }
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Theme Toggle */}
                <div className="px-4 py-3">
                    <button
                        onClick={toggleTheme}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${theme === 'dark'
                            ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                            : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                            }`}
                    >
                        <span className="text-xl">{theme === 'dark' ? '☀️' : '🌙'}</span>
                        <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                </div>

                {/* User Profile */}
                <div className={`mt-auto p-6 border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
                    <div className="flex flex-col items-center text-center">
                        <div className="relative group mb-3">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl text-white font-bold shadow-xl transition-transform group-hover:scale-105 ${theme === 'dark' ? 'bg-green-600' : 'bg-green-500'
                                }`}>
                                {getInitials()}
                                <div className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-lg border border-gray-100 text-gray-900 text-xs">
                                    📷
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1 mb-4">
                            <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {finalDisplayName}
                            </p>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                {userData?.email}
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className={`w-full py-2 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${theme === 'dark'
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white'
                                : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white'
                                }`}
                        >
                            <span>🚪</span> Logout Session
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content with Page Transitions */}
            <main className="flex-1 ml-64 p-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
