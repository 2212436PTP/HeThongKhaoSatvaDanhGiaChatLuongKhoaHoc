import React, { useState, useEffect } from 'react';
import { Icons } from '../ui/Icons';
import { 
    ITC_CENTER_COORDINATES, 
    getCurrentGPSPosition, 
    calculateDistanceMeters 
} from '../../lib/gpsLocation';

interface GPSAttendanceModalProps {
    classCode: string;
    courseName?: string;
    studentName: string;
    onConfirmAttendance: (gpsInfo: {
        latitude: number;
        longitude: number;
        distanceMeters: number;
        isSimulated: boolean;
    }) => void;
    onClose: () => void;
}

export const GPSAttendanceModal = ({
    classCode,
    courseName = 'Khóa học ITC',
    studentName,
    onConfirmAttendance,
    onClose
}: GPSAttendanceModalProps) => {
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [isSimulated, setIsSimulated] = useState(false);

    const checkGPS = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const pos = await getCurrentGPSPosition();
            setCoords(pos);
            const dist = calculateDistanceMeters(pos.latitude, pos.longitude);
            setDistance(dist);
            setIsSimulated(false);
        } catch (err: any) {
            setErrorMsg(err.message || 'Không thể lấy định vị GPS.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkGPS();
    }, []);

    // Chế độ mô phỏng vị trí phòng máy dành cho PC không có GPS hoặc khi kiểm thử đồ án
    const handleSimulateLabLocation = () => {
        const simLat = ITC_CENTER_COORDINATES.latitude + (Math.random() * 0.0002 - 0.0001);
        const simLon = ITC_CENTER_COORDINATES.longitude + (Math.random() * 0.0002 - 0.0001);
        const simDist = calculateDistanceMeters(simLat, simLon);

        setCoords({ latitude: simLat, longitude: simLon, accuracy: 5 });
        setDistance(simDist);
        setIsSimulated(true);
        setErrorMsg('');
        setLoading(false);
    };

    const isWithinRadius = distance !== null && distance <= ITC_CENTER_COORDINATES.allowedRadiusMeters;

    const handleConfirm = () => {
        if (!coords || distance === null) return;
        if (!isWithinRadius && !isSimulated) {
            alert(`Khoảng cách hiện tại của bạn là ${distance}m, vượt quá bán kính cho phép (${ITC_CENTER_COORDINATES.allowedRadiusMeters}m). Bạn phải có mặt tại Trung tâm ITC để điểm danh!`);
            return;
        }

        onConfirmAttendance({
            latitude: coords.latitude,
            longitude: coords.longitude,
            distanceMeters: distance,
            isSimulated
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl shrink-0">
                            📍
                        </div>
                        <div>
                            <h3 className="font-extrabold text-slate-900 text-base">
                                Xác thực Vị trí GPS Điểm danh
                            </h3>
                            <p className="text-xs text-slate-500">
                                Lớp: <b className="text-itc-900">{classCode}</b> — Học viên: <b>{studentName}</b>
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
                    >
                        <Icons.Close className="w-5 h-5" />
                    </button>
                </div>

                {/* Vị trí Trung tâm tham chiếu */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-700">
                        <span className="flex items-center gap-1.5">
                            <span>🏫</span> Vị trí Trung tâm ITC tham chiếu:
                        </span>
                        <span className="bg-itc-100 text-itc-800 px-2 py-0.5 rounded text-[10px]">
                            Bán kính $\le$ {ITC_CENTER_COORDINATES.allowedRadiusMeters}m
                        </span>
                    </div>
                    <p className="text-slate-600 font-medium">
                        {ITC_CENTER_COORDINATES.name}
                    </p>
                    <p className="text-slate-400 text-[11px]">
                        {ITC_CENTER_COORDINATES.address} (Tọa độ: {ITC_CENTER_COORDINATES.latitude}, {ITC_CENTER_COORDINATES.longitude})
                    </p>
                </div>

                {/* Trạng thái quét GPS hiện tại */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="py-8 text-center space-y-2 bg-slate-50 rounded-2xl border border-slate-200">
                            <Icons.Loader className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                            <p className="text-xs font-bold text-slate-700">Đang nhận diện tọa độ vệ tinh GPS từ thiết bị...</p>
                            <p className="text-[11px] text-slate-400">Vui lòng chấp nhận quyền truy cập vị trí trên trình duyệt khi có thông báo.</p>
                        </div>
                    ) : errorMsg && !isSimulated ? (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2.5 text-xs text-rose-800">
                            <div className="flex items-start gap-2">
                                <span className="text-lg">⚠️</span>
                                <div>
                                    <p className="font-bold">Không thể lấy tọa độ GPS tự động:</p>
                                    <p className="mt-0.5 text-[11px]">{errorMsg}</p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between">
                                <button
                                    onClick={checkGPS}
                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition"
                                >
                                    Thử quét lại GPS
                                </button>
                                <button
                                    onClick={handleSimulateLabLocation}
                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition shadow-xs"
                                    title="Mô phỏng vị trí phòng máy khi kiểm thử trên máy tính bàn không có chip GPS"
                                >
                                    🧪 Mô phỏng vị trí Lab ITC
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={`p-4 rounded-2xl border space-y-3 ${
                            isWithinRadius 
                                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' 
                                : 'bg-amber-50/70 border-amber-300 text-amber-950'
                        }`}>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-xs flex items-center gap-1.5">
                                    <span>{isWithinRadius ? '🟢' : '🔴'}</span> 
                                    {isWithinRadius ? 'VỊ TRÍ HỢP LỆ TRONG KHUÔN VIÊN' : 'NGOÀI BÁN KÍNH PHÒNG MÁY'}
                                </span>
                                {isSimulated && (
                                    <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        🧪 Test Lab Mode
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/60">
                                    <span className="text-[10px] text-slate-500 block">Khoảng cách tới Trung tâm:</span>
                                    <b className="text-sm font-black text-slate-900">{distance} mét</b>
                                </div>
                                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/60">
                                    <span className="text-[10px] text-slate-500 block">Độ chính xác GPS:</span>
                                    <b className="text-sm font-black text-slate-900">&plusmn; {coords?.accuracy || 10} mét</b>
                                </div>
                            </div>

                            <div className="text-[11px] leading-relaxed">
                                {isWithinRadius ? (
                                    <p className="text-emerald-800 font-semibold">
                                        ✓ Thiết bị của bạn được xác nhận đang có mặt tại khuôn viên Trung tâm ITC (cách {distance}m $\le$ {ITC_CENTER_COORDINATES.allowedRadiusMeters}m). Bạn có thể bấm xác nhận điểm danh!
                                    </p>
                                ) : (
                                    <p className="text-rose-700 font-semibold">
                                        ✕ Bạn đang ở cách Trung tâm {distance}m (vượt mức cho phép {ITC_CENTER_COORDINATES.allowedRadiusMeters}m). Quy chế yêu cầu học viên phải có mặt tại phòng máy để tự điểm danh!
                                    </p>
                                )}
                            </div>

                            {/* Tùy chọn test mô phỏng vị trí nếu đang ở xa */}
                            {!isWithinRadius && (
                                <div className="pt-2 border-t border-amber-200 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleSimulateLabLocation}
                                        className="text-[11px] text-indigo-700 font-bold hover:underline"
                                    >
                                        🧪 Bật chế độ Mô phỏng phòng máy (Demo chấm bài) &rarr;
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Nhắc nhở chống gian lận vân tay thiết bị */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-2 text-[11px] text-slate-600">
                    <span className="text-sm">🛡️</span>
                    <span>Hệ thống tự động lưu dấu vân tay thiết bị: Mỗi máy chỉ được điểm danh cho 1 học viên duy nhất trong ngày.</span>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-2.5 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                        Đóng lại
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading || (!isWithinRadius && !isSimulated)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs ${
                            isWithinRadius || isSimulated
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 scale-102'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        <Icons.CheckCircle className="w-4 h-4" />
                        Xác nhận Điểm danh Có mặt
                    </button>
                </div>
            </div>
        </div>
    );
};
