import { useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeProvider';
import { analyzeImage, type AnalysisResponse, type WasteAnalysis } from '../../api';

type MealType = 'lunch' | 'dinner';

interface FeedbackRatings {
    taste: number;
    oil: number;
    quantity: number;
    hygiene: number;
}

// Waste level styling configuration
const wasteStyles = {
    NONE: {
        bg: 'bg-green-500/20',
        border: 'border-green-500/50',
        text: 'text-green-400',
        icon: '🌟',
        darkBg: 'bg-green-500/10',
    },
    LOW: {
        bg: 'bg-lime-500/20',
        border: 'border-lime-500/50',
        text: 'text-lime-400',
        icon: '👍',
        darkBg: 'bg-lime-500/10',
    },
    MEDIUM: {
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/50',
        text: 'text-yellow-400',
        icon: '⚠️',
        darkBg: 'bg-yellow-500/10',
    },
    HIGH: {
        bg: 'bg-red-500/20',
        border: 'border-red-500/50',
        text: 'text-red-400',
        icon: '🚨',
        darkBg: 'bg-red-500/10',
    },
};

export default function MealReview() {
    const { theme } = useTheme();

    // Auto-select meal based on current time
    const getDefaultMeal = (): MealType => {
        const hour = new Date().getHours();
        return hour < 15 ? 'lunch' : 'dinner';
    };

    const [selectedMeal, setSelectedMeal] = useState<MealType>(getDefaultMeal());
    const [ratings, setRatings] = useState<FeedbackRatings>({
        taste: 3,
        oil: 3,
        quantity: 3,
        hygiene: 3,
    });
    const [comment, setComment] = useState('');
    const [plateImage, setPlateImage] = useState<string | null>(null);
    const [plateFile, setPlateFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const handleRatingChange = (category: keyof FeedbackRatings, value: number) => {
        setRatings(prev => ({ ...prev, [category]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }
            
            // Store the file for API submission
            setPlateFile(file);
            
            // Create preview
            const reader = new FileReader();
            reader.onload = () => {
                setPlateImage(reader.result as string);
            };
            reader.readAsDataURL(file);
            
            // Analyze the image
            setIsAnalyzing(true);
            setAnalysisError(null);
            setAnalysisResult(null);
            
            try {
                const result = await analyzeImage(file);
                setAnalysisResult(result);
            } catch (err) {
                console.error('Analysis failed:', err);
                setAnalysisError(err instanceof Error ? err.message : 'Failed to analyze image. Is the backend running?');
            } finally {
                setIsAnalyzing(false);
            }
        }
    };

    const removeImage = () => {
        setPlateImage(null);
        setPlateFile(null);
        setAnalysisResult(null);
        setAnalysisError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        console.log('Submitting feedback:', { 
            meal: selectedMeal, 
            ratings, 
            comment, 
            hasImage: !!plateImage,
            analysis: analysisResult 
        });
        setTimeout(() => {
            setIsSubmitting(false);
            setSubmitted(true);
        }, 1500);
    };

    const ratingLabels = ['Poor', 'Below Avg', 'Average', 'Good', 'Excellent'];
    const ratingColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];

    const feedbackCategories: { key: keyof FeedbackRatings; label: string; icon: string }[] = [
        { key: 'taste', label: 'Taste', icon: '😋' },
        { key: 'oil', label: 'Oil Level', icon: '🫒' },
        { key: 'quantity', label: 'Quantity', icon: '📏' },
        { key: 'hygiene', label: 'Hygiene', icon: '✨' },
    ];

    // Insight Card Component - Wastage-Focused Version
    const InsightCard = ({ analysis, insight, foodSummary }: { analysis: WasteAnalysis; insight: string; foodSummary?: Record<string, number> }) => {
        const style = wasteStyles[analysis.waste_level];
        
        // Calculate wastage (food left = waste, so coverage_percent IS the waste percentage)
        const wastePercent = analysis.coverage_percent;
        const totalWastedItems = foodSummary ? Object.values(foodSummary).reduce((a, b) => a + b, 0) : 0;
        
        // Gradient backgrounds for each waste level
        const gradients = {
            NONE: 'from-green-500/30 via-emerald-500/20 to-teal-500/10',
            LOW: 'from-lime-500/30 via-green-500/20 to-emerald-500/10',
            MEDIUM: 'from-yellow-500/30 via-amber-500/20 to-orange-500/10',
            HIGH: 'from-red-500/30 via-rose-500/20 to-pink-500/10',
        };
        
        const progressColors = {
            NONE: 'bg-gradient-to-r from-green-400 to-emerald-500',
            LOW: 'bg-gradient-to-r from-lime-400 to-green-500',
            MEDIUM: 'bg-gradient-to-r from-yellow-400 to-amber-500',
            HIGH: 'bg-gradient-to-r from-red-400 to-rose-500',
        };

        // Wastage descriptions
        const wastageTitle = {
            NONE: '🎉 Zero Waste!',
            LOW: '👏 Minimal Waste',
            MEDIUM: '⚠️ Moderate Waste',
            HIGH: '🚨 High Waste Alert',
        };

        const wastageSubtitle = {
            NONE: 'You finished everything!',
            LOW: 'Almost clean plate',
            MEDIUM: 'Some food left behind',
            HIGH: 'Significant food wasted',
        };
        
        return (
            <div className={`mt-4 rounded-2xl overflow-hidden border-2 ${style.border} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}>
                {/* Gradient Header - Wastage Focused */}
                <div className={`bg-gradient-to-r ${gradients[analysis.waste_level]} p-4`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Animated Icon */}
                            <span className="text-3xl animate-bounce">{style.icon}</span>
                            <div>
                                <h4 className={`font-bold text-lg ${style.text}`}>
                                    {wastageTitle[analysis.waste_level]}
                                </h4>
                                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {wastageSubtitle[analysis.waste_level]}
                                </p>
                            </div>
                        </div>
                        {/* Wastage Percentage Badge */}
                        <div className={`text-center px-4 py-2 rounded-xl ${
                            theme === 'dark' ? 'bg-black/30' : 'bg-white/70'
                        } backdrop-blur-sm shadow-inner`}>
                            <div className={`font-bold text-xl ${style.text}`}>
                                {wastePercent}%
                            </div>
                            <div className={`text-[10px] uppercase tracking-wide ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Wasted
                            </div>
                        </div>
                    </div>
                    
                    {/* Wastage Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between mb-1">
                            <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                Food Wastage Level
                            </span>
                            <span className={`text-xs font-bold ${style.text}`}>
                                {wastePercent}% of plate
                            </span>
                        </div>
                        <div className={`h-3 rounded-full ${theme === 'dark' ? 'bg-black/30' : 'bg-white/50'} overflow-hidden`}>
                            <div 
                                className={`h-full rounded-full ${progressColors[analysis.waste_level]} transition-all duration-1000 ease-out`}
                                style={{ width: `${Math.min(wastePercent, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className={`text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>✨ Clean</span>
                            <span className={`text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Full Waste 🚫</span>
                        </div>
                    </div>
                </div>
                
                {/* AI Message Body */}
                <div className={`p-4 ${theme === 'dark' ? 'bg-[#0d1410]' : 'bg-white'}`}>
                    {/* Gemini Insight with quote styling */}
                    <div className={`relative pl-4 border-l-4 ${style.border}`}>
                        <span className={`absolute -left-2 -top-1 text-2xl ${style.text} opacity-50`}>"</span>
                        <p className={`text-base leading-relaxed italic ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                        }`}>
                            {insight}
                        </p>
                        <span className={`absolute -right-1 bottom-0 text-2xl ${style.text} opacity-50`}>"</span>
                    </div>
                    
                    {/* Wasted Food Items */}
                    {foodSummary && Object.keys(foodSummary).length > 0 && (
                        <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <p className={`text-xs font-semibold uppercase tracking-wider ${
                                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                    🗑️ Wasted Items
                                </p>
                                <span className={`text-xs px-2 py-1 rounded-full ${style.bg} ${style.text} font-bold`}>
                                    {totalWastedItems} item{totalWastedItems > 1 ? 's' : ''} wasted
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(foodSummary).map(([item, count]) => (
                                    <span 
                                        key={item}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105 cursor-default border ${
                                            theme === 'dark' 
                                                ? `bg-white/5 text-gray-300 hover:bg-white/10 ${style.border}` 
                                                : `bg-gray-50 text-gray-700 hover:bg-gray-100 ${style.border}`
                                        }`}
                                    >
                                        {item} 
                                        {count > 1 && (
                                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${style.bg} ${style.text} font-bold`}>
                                                ×{count}
                                            </span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Footer with waste level indicator */}
                    <div className={`mt-4 flex items-center justify-between`}>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                            theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${style.text.replace('text-', 'bg-')} animate-pulse`}></span>
                            <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                Waste Level: <span className={`font-bold ${style.text}`}>{analysis.waste_level}</span>
                            </span>
                        </div>
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                            Powered by Gemini AI ✨
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="text-6xl mb-6">🎉</div>
                <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Thank you for your feedback!
                </h2>
                <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Your response helps us improve the mess experience.
                </p>
                <button
                    onClick={() => {
                        setSubmitted(false);
                        setRatings({ taste: 3, oil: 3, quantity: 3, hygiene: 3 });
                        setComment('');
                        setPlateImage(null);
                        setPlateFile(null);
                        setAnalysisResult(null);
                        setAnalysisError(null);
                    }}
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors"
                >
                    Submit Another Review
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header Row */}
            <div className="flex items-start justify-between">
                <div>
                    <p className={`text-sm font-medium uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-green-500' : 'text-green-600'
                        }`}>
                        MEAL FEEDBACK
                    </p>
                    <h1 className={`text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                        How was your meal?
                    </h1>
                    <p className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
                        {formattedDate}
                    </p>
                </div>

                {/* Meal Selector */}
                <div className="flex gap-2">
                    {(['lunch', 'dinner'] as MealType[]).map((meal) => (
                        <button
                            key={meal}
                            onClick={() => setSelectedMeal(meal)}
                            className={`py-3 px-5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${selectedMeal === meal
                                    ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                                    : theme === 'dark'
                                        ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-green-900/30'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                                }`}
                        >
                            <span className="text-xl">{meal === 'lunch' ? '🍛' : '🍽️'}</span>
                            <span className="capitalize">{meal}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main 2-Column Layout - Reorganized */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* LEFT Column - Ratings + Comments */}
                <div className="space-y-5">
                    {/* Ratings Section */}
                    <div className={`rounded-2xl p-5 ${theme === 'dark'
                            ? 'bg-[#151d17] border border-green-900/30'
                            : 'bg-white border border-gray-200 shadow-sm'
                        }`}>
                        <h3 className={`font-semibold text-lg mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                            Rate Your Experience
                        </h3>

                        {/* 2x2 Grid for Ratings */}
                        <div className="grid grid-cols-2 gap-4">
                            {feedbackCategories.map((category) => (
                                <div key={category.key} className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
                                    }`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{category.icon}</span>
                                            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                                                }`}>
                                                {category.label}
                                            </span>
                                        </div>
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${ratingColors[ratings[category.key] - 1]
                                            } text-white`}>
                                            {ratingLabels[ratings[category.key] - 1]}
                                        </span>
                                    </div>

                                    {/* Rating Buttons */}
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <button
                                                key={value}
                                                onClick={() => handleRatingChange(category.key, value)}
                                                className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${ratings[category.key] >= value
                                                        ? `${ratingColors[value - 1]} text-white`
                                                        : theme === 'dark'
                                                            ? 'bg-white/10 text-gray-500 hover:bg-white/15'
                                                            : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                                    }`}
                                            >
                                                {value}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Comment Section */}
                    <div className={`rounded-2xl p-5 ${theme === 'dark'
                            ? 'bg-[#151d17] border border-green-900/30'
                            : 'bg-white border border-gray-200 shadow-sm'
                        }`}>
                        <h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                            Additional Comments
                            <span className={`text-sm font-normal ml-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                (Optional)
                            </span>
                        </h3>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Any specific feedback? (e.g., dal was too salty...)"
                            maxLength={500}
                            rows={5}
                            className={`w-full p-3 rounded-xl resize-none text-sm transition-all ${theme === 'dark'
                                    ? 'bg-white/5 border border-green-900/30 text-white placeholder-gray-500 focus:border-green-500'
                                    : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-green-500'
                                } focus:outline-none focus:ring-2 focus:ring-green-500/20`}
                        />
                        <p className={`text-xs mt-1 text-right ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                            {comment.length}/500
                        </p>
                    </div>
                </div>

                {/* RIGHT Column - Full Plate Photo Section */}
                <div className={`rounded-2xl p-5 h-fit ${theme === 'dark'
                        ? 'bg-[#151d17] border border-green-900/30'
                        : 'bg-white border border-gray-200 shadow-sm'
                    }`}>
                    <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                        📷 Plate Photo
                        <span className={`text-sm font-normal ml-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                            (AI Analysis)
                        </span>
                    </h3>
                    <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        Upload a photo of your plate for instant waste analysis powered by AI
                    </p>

                    {!plateImage ? (
                        <label className={`flex flex-col items-center justify-center min-h-[280px] rounded-xl border-2 border-dashed cursor-pointer transition-all ${theme === 'dark'
                                ? 'border-green-900/50 hover:border-green-500/50 bg-white/5 hover:bg-white/10'
                                : 'border-gray-300 hover:border-green-500 bg-gray-50 hover:bg-gray-100'
                            }`}>
                            <div className="text-6xl mb-3 opacity-70">🍽️</div>
                            <span className={`text-lg font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                Click to upload plate photo
                            </span>
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                JPG or PNG • Max 5MB
                            </span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </label>
                    ) : (
                        <div className="relative">
                            {/* Full size image display */}
                            <img
                                src={plateImage}
                                alt="Plate"
                                className="w-full rounded-xl object-contain max-h-[400px] bg-black/20"
                            />
                            <button
                                onClick={removeImage}
                                className="absolute top-3 right-3 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                            >
                                ✕
                            </button>
                            
                            {/* Analyzing Spinner Overlay */}
                            {isAnalyzing && (
                                <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-3 text-white">
                                        <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span className="text-sm font-medium">Analyzing your plate...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Analysis Error */}
                    {analysisError && (
                        <div className="mt-4 p-4 rounded-xl bg-red-500/20 border border-red-500/50">
                            <p className="text-red-400 text-sm">⚠️ {analysisError}</p>
                        </div>
                    )}
                    
                    {/* Analysis Result Card */}
                    {analysisResult && (
                        <InsightCard 
                            analysis={analysisResult.waste_analysis} 
                            insight={analysisResult.user_insight}
                            foodSummary={analysisResult.food_summary}
                        />
                    )}
                </div>
            </div>

            {/* Submit Button - Full Width */}
            <button
                onClick={handleSubmit}
                disabled={isSubmitting || isAnalyzing}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${isSubmitting || isAnalyzing
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/20 hover:shadow-green-500/30'
                    } text-white`}
            >
                {isSubmitting ? (
                    <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Submitting...
                    </>
                ) : (
                    <>
                        Submit Feedback
                        <span>→</span>
                    </>
                )}
            </button>
        </div>
    );
}
