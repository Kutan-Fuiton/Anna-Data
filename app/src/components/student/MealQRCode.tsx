/**
 * MealQRCode Component
 * Displays a QR code for the current meal when student has marked intent to eat
 */

import { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { generateQRHash, type QRPayload } from '../../services/firestore';

type MealType = 'breakfast' | 'lunch' | 'dinner';

interface MealQRCodeProps {
    mealType: MealType;
    isEating: boolean;
}

export default function MealQRCode({ mealType, isEating }: MealQRCodeProps) {
    const { theme } = useTheme();
    const { user } = useAuth();
    
    const now = new Date();
    
    // Generate QR payload
    const qrData = useMemo(() => {
        if (!user || !isEating) return null;
        
        const dateStr = now.toISOString().split('T')[0];
        const timestamp = Date.now();
        const hash = generateQRHash(user.uid, mealType, dateStr, timestamp);
        
        const payload: QRPayload = {
            uid: user.uid,
            meal: mealType,
            date: dateStr,
            ts: timestamp,
            hash,
        };
        
        return JSON.stringify(payload);
    }, [user, mealType, isEating]);
    
    // Don't show if not eating
    if (!isEating || !user) {
        return null;
    }
    
    // Meal icons
    const mealIcons: Record<MealType, string> = {
        breakfast: '🍳',
        lunch: '🍛',
        dinner: '🍽️',
    };
    
    return (
        <div className={`rounded-2xl p-5 ${
            theme === 'dark'
                ? 'bg-[#151d17] border border-green-900/30'
                : 'bg-white border border-gray-200 shadow-sm'
        }`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{mealIcons[mealType]}</span>
                    <div>
                        <h3 className={`font-semibold capitalize ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                            Your {mealType} QR
                        </h3>
                        <p className={`text-xs ${
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                            Show this to mess staff
                        </p>
                    </div>
                </div>
                
                {/* Status badge - Always Active */}
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Active
                </span>
            </div>
            
            {/* QR Code */}
            <div className={`flex justify-center p-4 rounded-xl ${
                theme === 'dark' ? 'bg-white' : 'bg-white border-2 border-green-500'
            }`}>
                {qrData && (
                    <QRCodeSVG
                        value={qrData}
                        size={180}
                        level="M"
                        includeMargin={true}
                        fgColor="#000000"
                        bgColor="#ffffff"
                    />
                )}
            </div>
            
            {/* Time info */}
            <div className={`mt-4 text-center ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
                <p className="text-sm">
                    <span className="text-green-500 font-medium">✓ Valid</span> - Ready to scan
                </p>
            </div>
        </div>
    );
}

