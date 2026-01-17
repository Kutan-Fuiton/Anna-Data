import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

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
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        navigate('/');
    };

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
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-600 flex items-center justify-center text-white font-bold">
                            PV
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-white truncate">Priya Verma</p>
                            <p className="text-xs text-gray-400">Mess Manager</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                            title="Logout"
                        >
                            🚪
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
