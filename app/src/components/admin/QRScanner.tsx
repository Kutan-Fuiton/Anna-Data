/**
 * QRScanner Component for Admin
 * Uses device camera OR image upload to scan student meal QR codes and record attendance
 */

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../context/AuthContext';
import {
    validateQRHash,
    markMealAttendance,
    type QRPayload,
} from '../../services/firestore';

interface ScanResult {
    success: boolean;
    message: string;
    studentName?: string;
    mealType?: string;
}

interface QRScannerProps {
    onClose: () => void;
    onScanSuccess?: () => void;
}

type ScanMode = 'camera' | 'upload';

export default function QRScanner({ onClose, onScanSuccess }: QRScannerProps) {
    const { user } = useAuth();
    const [scanMode, setScanMode] = useState<ScanMode>('camera');
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize scanner for camera mode
    useEffect(() => {
        if (scanMode !== 'camera' || scanResult) return;

        const scannerId = 'qr-scanner-container';

        const initScanner = async () => {
            try {
                scannerRef.current = new Html5Qrcode(scannerId);
                setIsScanning(true);

                await scannerRef.current.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                    },
                    handleScan,
                    () => { } // Ignore errors during scanning
                );
            } catch (err) {
                console.error('Failed to start scanner:', err);
                setError('Camera access denied or not available. Try uploading an image instead.');
            }
        };

        initScanner();

        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [scanMode, scanResult]);

    const handleScan = async (decodedText: string) => {
        // Stop scanner immediately after successful scan
        if (scannerRef.current?.isScanning) {
            await scannerRef.current.stop();
            setIsScanning(false);
        }

        await processQRData(decodedText);
    };

    const processQRData = async (decodedText: string) => {
        try {
            console.log('Decoded QR Text:', decodedText);

            // Parse QR data
            let payload: QRPayload;
            try {
                payload = JSON.parse(decodedText.trim());
            } catch (pErr) {
                console.error('JSON parsing failed:', pErr);
                setScanResult({
                    success: false,
                    message: 'Could not read data from QR. Invalid format.',
                });
                return;
            }

            // Validate hash
            if (!validateQRHash(payload)) {
                setScanResult({
                    success: false,
                    message: 'Security Check Failed: QR signature is invalid.',
                });
                return;
            }

            // Check if QR is recent (allows +/- 24h window for meal times across days)
            const qrDate = new Date(payload.date);
            const now = new Date();
            const diffInHours = Math.abs(now.getTime() - qrDate.getTime()) / (1000 * 60 * 60);

            if (diffInHours > 48) { // Generous 48-hour window for demo
                setScanResult({
                    success: false,
                    message: `Expired: This QR code is from ${payload.date}.`,
                });
                return;
            }

            setIsProcessing(true);

            // Mark attendance
            const result = await markMealAttendance(
                payload.uid,
                undefined,
                undefined,
                payload.meal,
                new Date(),
                user?.uid || 'unknown'
            );

            if (result.success) {
                setScanResult({
                    success: true,
                    message: 'Attendance recorded successfully!',
                    studentName: result.userName,
                    mealType: payload.meal,
                });
                onScanSuccess?.();
            } else {
                setScanResult({
                    success: false,
                    message: result.error || 'Database error: Could not save attendance.',
                });
            }
        } catch (err) {
            console.error('Error processing QR:', err);
            setScanResult({
                success: false,
                message: 'Internal Error: Processing failed.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        try {
            // Create a temporary Html5Qrcode instance for file scanning
            const html5Qrcode = new Html5Qrcode('qr-upload-temp');

            const result = await html5Qrcode.scanFile(file, true);
            await processQRData(result);

            html5Qrcode.clear();
        } catch (err) {
            console.error('Error scanning uploaded image:', err);
            setScanResult({
                success: false,
                message: 'Could not read QR code from image. Make sure the QR is clear and visible.',
            });
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRescan = async () => {
        setScanResult(null);
        setError(null);

        if (scanMode === 'camera' && scannerRef.current && !scannerRef.current.isScanning) {
            try {
                setIsScanning(true);
                await scannerRef.current.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                    },
                    handleScan,
                    () => { }
                );
            } catch (err) {
                console.error('Failed to restart scanner:', err);
                setError('Failed to restart camera');
            }
        }
    };

    const switchMode = async (mode: ScanMode) => {
        // Stop camera if switching away
        if (scanMode === 'camera' && scannerRef.current?.isScanning) {
            await scannerRef.current.stop();
            setIsScanning(false);
        }
        setScanMode(mode);
        setScanResult(null);
        setError(null);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Scan Student QR</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Mode Tabs */}
                {!scanResult && (
                    <div className="flex border-b">
                        <button
                            onClick={() => switchMode('camera')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${scanMode === 'camera'
                                ? 'text-teal-600 border-b-2 border-teal-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            📷 Camera
                        </button>
                        <button
                            onClick={() => switchMode('upload')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${scanMode === 'upload'
                                ? 'text-teal-600 border-b-2 border-teal-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            🖼️ Upload Image
                        </button>
                    </div>
                )}

                {/* Scanner Area */}
                <div className="p-4">
                    {/* Hidden temp element for file scanning */}
                    <div id="qr-upload-temp" style={{ display: 'none' }}></div>

                    {error ? (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-4">📷</div>
                            <p className="text-red-600 mb-4">{error}</p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => switchMode('upload')}
                                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors"
                                >
                                    Upload Image Instead
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    ) : scanResult ? (
                        <div className="text-center py-6">
                            {/* Result Icon */}
                            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${scanResult.success ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                <span className="text-4xl">
                                    {scanResult.success ? '✓' : '✕'}
                                </span>
                            </div>

                            {/* Result Message */}
                            <p className={`text-lg font-semibold mb-2 ${scanResult.success ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {scanResult.success ? 'Success!' : 'Error'}
                            </p>
                            <p className="text-gray-600 mb-4">{scanResult.message}</p>

                            {scanResult.studentName && (
                                <p className="text-sm font-medium text-teal-600 mb-1">
                                    Student: {scanResult.studentName}
                                </p>
                            )}

                            {scanResult.mealType && (
                                <p className="text-sm text-gray-500 mb-4">
                                    Meal: <span className="capitalize font-medium">{scanResult.mealType}</span>
                                </p>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={handleRescan}
                                    className="px-4 py-2 bg-[#0d2137] text-white rounded-lg hover:bg-[#152d4a] transition-colors"
                                >
                                    Scan Another
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    ) : scanMode === 'camera' ? (
                        <div>
                            {/* Camera View */}
                            <div
                                id="qr-scanner-container"
                                ref={containerRef}
                                className="rounded-lg overflow-hidden"
                            />

                            {/* Scanning indicator */}
                            {isScanning && (
                                <div className="text-center mt-4">
                                    <p className="text-sm text-gray-500">
                                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                                        Scanning... Point camera at student's QR code
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            {/* Upload Area */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="qr-image-upload"
                            />

                            {isProcessing ? (
                                <div>
                                    <div className="text-4xl mb-4 animate-pulse">🔍</div>
                                    <p className="text-gray-600">Processing image...</p>
                                </div>
                            ) : (
                                <label
                                    htmlFor="qr-image-upload"
                                    className="cursor-pointer block"
                                >
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-teal-500 hover:bg-teal-50 transition-colors">
                                        <div className="text-5xl mb-4">🖼️</div>
                                        <p className="text-gray-700 font-medium mb-1">
                                            Click to upload QR image
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Select a screenshot or photo of the QR code
                                        </p>
                                    </div>
                                </label>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
