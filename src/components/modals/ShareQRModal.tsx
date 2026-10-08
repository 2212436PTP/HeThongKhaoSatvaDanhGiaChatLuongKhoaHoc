import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { QRCodeSVG } from 'qrcode.react';

interface ShareQRModalProps {
    classCode: string;
    courseName: string;
    classId: string;
    onClose: () => void;
}

export const ShareQRModal = ({ classCode, courseName, classId, onClose }: ShareQRModalProps) => {
    const [copied, setCopied] = useState(false);
    
    // Tạo link trực tiếp tới trang làm bài khảo sát (tự động đổi localhost thành IP LAN để quét được bằng điện thoại)
    let origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (origin.includes('localhost')) {
        origin = origin.replace('localhost', '10.10.66.115');
    }
    const surveyLink = `${origin}/survey?classId=${classId}`;

    const handleCopy = () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(surveyLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-itc-800 p-4 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-bold text-lg">Mã Khảo sát QR</h3>
                        <p className="text-xs text-itc-100 mt-0.5">{classCode} - {courseName}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <Icons.Plus className="w-5 h-5 rotate-45" />
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center bg-slate-50">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
                        <QRCodeSVG 
                            value={surveyLink} 
                            size={200} 
                            fgColor="#1e3a8a" // Màu ITC Blue
                            level="H" 
                        />
                    </div>
                    
                    <p className="text-xs text-slate-500 text-center font-medium mb-3">
                        Sinh viên sử dụng Camera điện thoại hoặc Zalo để quét mã QR bên trên.
                    </p>

                    <div className="w-full relative">
                        <input 
                            type="text" 
                            readOnly 
                            value={surveyLink}
                            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-4 pr-24 text-xs text-slate-600 focus:outline-none"
                        />
                        <button 
                            onClick={handleCopy}
                            className="absolute right-1 top-1 bottom-1 bg-itc-800 hover:bg-itc-900 text-white font-bold text-xs px-4 rounded-lg transition"
                        >
                            {copied ? 'Đã sao chép' : 'Copy Link'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
