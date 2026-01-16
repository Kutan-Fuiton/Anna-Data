import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type UserRole = 'student' | 'admin';

export default function Login() {
    const navigate = useNavigate();
    const [role, setRole] = useState<UserRole>('student');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // TODO: Implement actual authentication
        console.log('Login attempt:', { role, email, password });

        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            // Navigate based on role
            if (role === 'student') {
                navigate('/student');
            } else {
                navigate('/admin');
            }
        }, 1000);
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4">
            {/* Background Image with Overlay */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: 'url(/mess_bg.png)' }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-orange-900/40" />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md">
                {/* Glass Card */}
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8 space-y-6">
                    {/* Logo & Title */}
                    <div className="text-center space-y-3">
                        <div className="flex justify-center">
                            <img
                                src="/logo.png"
                                alt="AnnaData Logo"
                                className="h-20 w-auto drop-shadow-lg"
                            />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            AnnaData
                        </h1>
                        <p className="text-white/70 text-sm">
                            Smart meal management for your hostel
                        </p>
                    </div>

                    {/* Role Toggle */}
                    <div className="flex bg-white/10 rounded-xl p-1 gap-1">
                        <button
                            type="button"
                            onClick={() => setRole('student')}
                            className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${role === 'student'
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            🎓 Student
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('admin')}
                            className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${role === 'admin'
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            🛡️ Admin
                        </button>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Input */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-white/80">
                                {role === 'student' ? 'College Email' : 'Employee Email'}
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
                                    ✉️
                                </span>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={role === 'student' ? 'student@college.edu' : 'admin@college.edu'}
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-sm font-medium text-white/80">
                                Password
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
                                    🔒
                                </span>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300"
                                />
                            </div>
                        </div>

                        {/* Forgot Password Link */}
                        <div className="flex justify-end">
                            <a
                                href="#forgot"
                                className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
                            >
                                Forgot password?
                            </a>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                `Sign in as ${role === 'student' ? 'Student' : 'Admin'}`
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="pt-4 border-t border-white/10">
                        <p className="text-center text-white/50 text-xs">
                            By signing in, you agree to our Terms of Service and Privacy Policy
                        </p>
                    </div>
                </div>

                {/* Bottom Attribution */}
                <p className="text-center text-white/40 text-xs mt-6">
                    © 2026 AnnaData • Reducing food waste, one meal at a time
                </p>
            </div>
        </div>
    );
}
