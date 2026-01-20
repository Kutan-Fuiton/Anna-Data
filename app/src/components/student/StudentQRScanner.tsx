/**
 * StudentQRScanner Component
 * Uses jsQR for reliable QR code detection from images
 */

import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
    markAttendanceFromStudentScan,
    validateAdminQR,
} from '../../services/firestore';

interface StudentQRScannerProps {
    isOpen: boolean;
    onClose: () => void;
    expectedMealType?: 'breakfast' | 'lunch' | 'dinner'; // Which meal card was clicked
}

export default function StudentQRScanner({ isOpen, onClose, expectedMealType }: StudentQRScannerProps) {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setResult(null);
            setIsProcessing(false);
        }
    }, [isOpen]);

    const processQRData = async (qrData: string) => {
        if (!user) {
            setResult({ success: false, message: 'You must be logged in' });
            return;
        }

        console.log('[Student] Processing QR:', qrData.substring(0, 50));

        // Validate QR first
        const validation = validateAdminQR(qrData);
        if (!validation.valid) {
            setResult({ success: false, message: validation.error || 'Invalid QR' });
            setIsProcessing(false);
            return;
        }

        // Check if QR meal type matches expected meal type from clicked card
        if (expectedMealType && validation.payload?.mealType !== expectedMealType) {
            const scannedMeal = validation.payload?.mealType || 'unknown';
            setResult({ 
                success: false, 
                message: `This is a ${scannedMeal} QR. Please scan the ${expectedMealType} QR instead.` 
            });
            setIsProcessing(false);
            return;
        }

        // Mark attendance
        const res = await markAttendanceFromStudentScan(
            user.uid,
            user.displayName || undefined,
            user.email || undefined,
            qrData
        );

        if (res.success) {
            const mealName = res.mealType ? res.mealType.charAt(0).toUpperCase() + res.mealType.slice(1) : 'Meal';
            setResult({ success: true, message: `✓ ${mealName} attendance marked!` });
            showToast(`${mealName} attendance marked!`, 'success');
        } else {
            setResult({ success: false, message: res.error || 'Failed to mark attendance' });
        }

        setIsProcessing(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || isProcessing) return;

        setIsProcessing(true);
        setResult(null);

        try {
            // Read image
            const image = new Image();
            const imageUrl = URL.createObjectURL(file);
            
            image.onload = async () => {
                URL.revokeObjectURL(imageUrl);
                
                // Draw to canvas
                const canvas = canvasRef.current;
                if (!canvas) {
                    setResult({ success: false, message: 'Canvas error' });
                    setIsProcessing(false);
                    return;
                }

                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    setResult({ success: false, message: 'Canvas context error' });
                    setIsProcessing(false);
                    return;
                }

                ctx.drawImage(image, 0, 0);
                
                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Scan with jsQR
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                
                if (code && code.data) {
                    console.log('[Student] QR detected:', code.data.substring(0, 50));
                    await processQRData(code.data);
                } else {
                    setResult({ success: false, message: 'No QR code found in image. Please upload a clear photo of the QR.' });
                    setIsProcessing(false);
                }
            };

            image.onerror = () => {
                URL.revokeObjectURL(imageUrl);
                setResult({ success: false, message: 'Could not load image' });
                setIsProcessing(false);
            };

            image.src = imageUrl;
        } catch (err) {
            console.error('Scan error:', err);
            setResult({ success: false, message: 'Error processing image' });
            setIsProcessing(false);
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClose = () => {
        setResult(null);
        setIsProcessing(false);
        onClose();
    };

    const handleRetry = () => {
        setResult(null);
        fileInputRef.current?.click();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Hidden canvas for image processing */}
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className={`relative z-10 w-full max-w-sm mx-4 rounded-2xl overflow-hidden ${
                theme === 'dark' 
                    ? 'bg-gradient-to-br from-[#1a241c] to-[#0f1410] border border-green-900/50' 
                    : 'bg-white shadow-2xl'
            }`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div>
                        <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            Mark Attendance
                        </h3>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            Upload photo of admin's QR
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className={`p-2 rounded-lg transition-colors ${
                            theme === 'dark' 
                                ? 'hover:bg-white/10 text-gray-400' 
                                : 'hover:bg-gray-100 text-gray-500'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {result ? (
                        // Result
                        <div className={`py-12 flex flex-col items-center justify-center rounded-xl ${
                            result.success
                                ? theme === 'dark' ? 'bg-green-500/10' : 'bg-green-50'
                                : theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'
                        }`}>
                            <span className="text-5xl mb-4">
                                {result.success ? '✅' : '❌'}
                            </span>
                            <p className={`text-center font-medium px-4 ${
                                result.success
                                    ? theme === 'dark' ? 'text-green-400' : 'text-green-700'
                                    : theme === 'dark' ? 'text-red-400' : 'text-red-700'
                            }`}>
                                {result.message}
                            </p>
                            <div className="flex gap-3 mt-6">
                                {!result.success && (
                                    <button
                                        onClick={handleRetry}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                            theme === 'dark'
                                                ? 'bg-white/10 text-white hover:bg-white/20'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        Try Again
                                    </button>
                                )}
                                <button
                                    onClick={handleClose}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-400"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Upload
                        <div 
                            onClick={() => !isProcessing && fileInputRef.current?.click()}
                            className={`py-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                                theme === 'dark'
                                    ? 'border-green-900/50 hover:border-green-500/50 bg-white/5 hover:bg-white/10'
                                    : 'border-gray-300 hover:border-green-500 bg-gray-50 hover:bg-gray-100'
                            } ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
                                    <p className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Scanning QR...
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ${
                                        theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100'
                                    }`}>
                                        <svg className={`w-10 h-10 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" 
                                            />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <p className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        Take Photo of QR
                                    </p>
                                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        or select from gallery
                                    </p>
                                </>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={isProcessing}
                            />
                        </div>
                    )}
                </div>

                {/* Tips */}
                {!result && !isProcessing && (
                    <div className={`px-4 pb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        <p className="text-xs text-center">
                            💡 Make sure the QR code is clearly visible and in focus
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
