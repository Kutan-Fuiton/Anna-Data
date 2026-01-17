import { useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeProvider';

type MealType = 'lunch' | 'dinner';

interface FeedbackRatings {
    taste: number;
    oil: number;
    quantity: number;
    hygiene: number;
}

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                setPlateImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setPlateImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        console.log('Submitting feedback:', { meal: selectedMeal, ratings, comment, hasImage: !!plateImage });
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

            {/* Main 2-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left Column - Ratings */}
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

                {/* Right Column - Comment & Image */}
                <div className="space-y-5">
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
                            rows={4}
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

                    {/* Image Upload */}
                    <div className={`rounded-2xl p-5 ${theme === 'dark'
                            ? 'bg-[#151d17] border border-green-900/30'
                            : 'bg-white border border-gray-200 shadow-sm'
                        }`}>
                        <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                            Plate Photo
                            <span className={`text-sm font-normal ml-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                (Optional)
                            </span>
                        </h3>

                        {!plateImage ? (
                            <label className={`flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed cursor-pointer transition-all ${theme === 'dark'
                                    ? 'border-green-900/50 hover:border-green-500/50 bg-white/5 hover:bg-white/10'
                                    : 'border-gray-300 hover:border-green-500 bg-gray-50 hover:bg-gray-100'
                                }`}>
                                <span className="text-3xl mb-1">📷</span>
                                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Click to upload • Max 5MB
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
                                <img
                                    src={plateImage}
                                    alt="Plate"
                                    className="w-full h-32 object-cover rounded-xl"
                                />
                                <button
                                    onClick={removeImage}
                                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors text-sm"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Submit Button - Full Width */}
            <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${isSubmitting
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
