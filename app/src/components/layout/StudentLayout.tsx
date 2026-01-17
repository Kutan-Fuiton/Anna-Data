import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeProvider';

const navItems = [
    { path: '/student', icon: '📊', label: 'Dashboard', end: true },
    { path: '/student/meal-review', icon: '🍽️', label: 'Meal Review', end: false },
    { path: '/student/mess-points', icon: '⭐', label: 'Mess Points', end: false },
];

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
};

export default function StudentLayout() {
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        // TODO: Clear auth state
        navigate('/');
    };

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
                <div className={`p-4 m-4 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${theme === 'dark' ? 'bg-green-600' : 'bg-green-500'
                            }`}>
                            RS
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Rahul Sharma
                            </p>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                Room 304-B
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                                ? 'text-gray-500 hover:text-red-400 hover:bg-white/5'
                                : 'text-gray-400 hover:text-red-500 hover:bg-gray-200'
                                }`}
                            title="Logout"
                        >
                            🚪
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
