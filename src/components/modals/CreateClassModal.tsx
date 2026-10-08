import React, { useState, useEffect } from 'react';
import { Icons } from '../ui/Icons';
import { Course, Teacher } from '../../types';
import { checkTeacherConflict, checkRoomConflict, normalizeRoomName, isSlotOccupied, isTeacherBusy } from '../../lib/scheduleConflict';

interface CreateClassModalProps {
    courses: Course[];
    teachers: Teacher[];
    classes?: any[];
    onClose: () => void;
    onSubmit: (newClass: any) => void;
}

// Danh sách các thứ trong tuần
const DAYS_OF_WEEK = [
    { key: 'T2', label: 'Thứ 2' },
    { key: 'T3', label: 'Thứ 3' },
    { key: 'T4', label: 'Thứ 4' },
    { key: 'T5', label: 'Thứ 5' },
    { key: 'T6', label: 'Thứ 6' },
    { key: 'T7', label: 'Thứ 7' },
    { key: 'CN', label: 'Chủ Nhật' },
];

// Các tổ hợp ngày học thông dụng tại ITC
const QUICK_PRESETS = [
    { label: 'Tối 2 - 4 - 6', days: ['T2', 'T4', 'T6'], shift: 'Tối (18:00 - 20:30)', startTime: '18:00', endTime: '20:30' },
    { label: 'Tối 3 - 5 - 7', days: ['T3', 'T5', 'T7'], shift: 'Tối (18:00 - 20:30)', startTime: '18:00', endTime: '20:30' },
    { label: 'Chiều 2 - 4 - 6', days: ['T2', 'T4', 'T6'], shift: 'Chiều (14:00 - 16:30)', startTime: '14:00', endTime: '16:30' },
    { label: 'Chiều 3 - 5', days: ['T3', 'T5'], shift: 'Chiều (14:00 - 16:30)', startTime: '14:00', endTime: '16:30' },
    { label: 'Cuối tuần (T7 - CN)', days: ['T7', 'CN'], shift: 'Sáng (08:00 - 11:00)', startTime: '08:00', endTime: '11:00' },
    { label: 'Sáng 2 - 4 - 6', days: ['T2', 'T4', 'T6'], shift: 'Sáng (08:00 - 10:30)', startTime: '08:00', endTime: '10:30' },
];

// Danh sách phòng máy sẵn có tại Trung tâm ITC - Đại học Đà Lạt
const QUICK_ROOMS = [
    'Phòng TV 1',
    'Phòng TV 2',
    'Phòng TV 3',
    'Phòng TV 4',
    'Phòng A24.1',
    'Phòng A24.LAU',
    'Phòng A8.3',
    'Phòng A8.5',
    'Phòng A8.6'
];

export const CreateClassModal = ({ courses, teachers, classes = [], onClose, onSubmit }: CreateClassModalProps) => {
    const [hasSecondTeacher, setHasSecondTeacher] = useState(false);
    
    // State chọn ngày & giờ
    const [selectedDays, setSelectedDays] = useState<string[]>(['T2', 'T4', 'T6']);
    const [shiftType, setShiftType] = useState('Tối'); // Sáng, Chiều, Tối
    const [startTime, setStartTime] = useState('18:00');
    const [endTime, setEndTime] = useState('20:30');

    const [formData, setFormData] = useState({
        code: `ITC_${new Date().getFullYear().toString().slice(-2)}_${Math.floor(10 + Math.random() * 90)}`,
        courseId: courses[0]?.id || '',
        teacherId: teachers[0]?.id || '',
        teacherRole1: 'Giảng viên Lý thuyết',
        teacherId2: teachers.length > 1 ? teachers[1]?.id : '',
        teacherRole2: 'Giảng viên Thực hành phòng máy',
        room: 'Phòng TV 1',
        schedule: 'Tối 2-4-6 (18:00 - 20:30)',
        studentsCount: 10
    });

    const [error, setError] = useState('');

    // Kiểm tra trùng lịch giảng viên và trùng phòng học
    const teacher1Conflict = checkTeacherConflict(formData.teacherId, formData.schedule, classes || []);
    const teacher2Conflict = hasSecondTeacher && formData.teacherId2
        ? checkTeacherConflict(formData.teacherId2, formData.schedule, classes || [])
        : { conflict: false };
    const roomConflict = checkRoomConflict(formData.room, formData.schedule, classes || []);
    const hasAnyConflict = teacher1Conflict.conflict || teacher2Conflict.conflict || roomConflict.conflict;

    const teacher1Obj = teachers.find(t => t.id === formData.teacherId);
    const teacher2Obj = teachers.find(t => t.id === formData.teacherId2);

    // Tự động cập nhật chuỗi Lịch học khi người dùng click chọn ngày hoặc giờ
    useEffect(() => {
        if (selectedDays.length === 0) {
            setFormData(prev => ({ ...prev, schedule: '' }));
            return;
        }

        const daysText = selectedDays.join('-');
        const scheduleString = `${shiftType} ${daysText} (${startTime} - ${endTime})`;
        setFormData(prev => ({ ...prev, schedule: scheduleString }));
    }, [selectedDays, shiftType, startTime, endTime]);

    const toggleDay = (dayKey: string) => {
        setSelectedDays(prev => 
            prev.includes(dayKey) 
                ? prev.filter(d => d !== dayKey) 
                : [...prev, dayKey]
        );
    };

    const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
        setSelectedDays(preset.days);
        setStartTime(preset.startTime);
        setEndTime(preset.endTime);
        if (preset.shift.includes('Tối')) setShiftType('Tối');
        else if (preset.shift.includes('Chiều')) setShiftType('Chiều');
        else setShiftType('Sáng');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.code.trim()) {
            setError('Vui lòng nhập Mã lớp DLU.');
            return;
        }
        if (!formData.room.trim()) {
            setError('Vui lòng chọn hoặc nhập Phòng Máy / Lab.');
            return;
        }
        if (selectedDays.length === 0 || !formData.schedule.trim()) {
            setError('Vui lòng chọn ít nhất một ngày học trong tuần và khung giờ.');
            return;
        }

        if (hasSecondTeacher && formData.teacherId === formData.teacherId2) {
            setError('Giảng viên 1 và Giảng viên 2 không được trùng nhau.');
            return;
        }

        // Chặn tạo nếu trùng lịch Giảng viên hoặc Phòng
        if (teacher1Conflict.conflict) {
            setError(`Trùng lịch GV 1: ${teacher1Conflict.message}`);
            return;
        }
        if (teacher2Conflict.conflict) {
            setError(`Trùng lịch GV 2: ${teacher2Conflict.message}`);
            return;
        }
        if (roomConflict.conflict) {
            setError(`Trùng phòng học: ${roomConflict.message}`);
            return;
        }
        
        const teacherIds = [formData.teacherId];
        if (hasSecondTeacher && formData.teacherId2) {
            teacherIds.push(formData.teacherId2);
        }

        const newClass = {
            id: 'cls_' + Date.now(),
            code: formData.code.trim(),
            courseId: formData.courseId,
            teacherId: formData.teacherId,
            teacherId2: hasSecondTeacher ? formData.teacherId2 : undefined,
            teacherRole1: formData.teacherRole1,
            teacherRole2: hasSecondTeacher ? formData.teacherRole2 : undefined,
            teacherIds,
            room: formData.room.trim(),
            schedule: formData.schedule,
            studentsCount: formData.studentsCount,
            status: 'OPEN_SURVEY'
        };
        
        onSubmit(newClass);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-itc-800 p-4 sm:p-5 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-black text-lg">Mở Lớp Đào tạo Mới</h3>
                        <p className="text-xs text-itc-100 mt-0.5">
                            Chỉ định phòng trống, 1 lớp được tối đa 2 GV, tự động phát hiện và chặn trùng lịch
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <Icons.Plus className="w-5 h-5 rotate-45" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 bg-slate-50 overflow-y-auto flex-1">
                    {/* CẢNH BÁO TRÙNG LỊCH REALTIME */}
                    {hasAnyConflict && (
                        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 text-xs space-y-1.5 animate-in shake">
                            <p className="font-black text-rose-800 flex items-center gap-1.5 text-sm">
                                <span>🚫</span> PHÁT HIỆN TRÙNG LỊCH HỌC HOẶC PHÒNG MÁY:
                            </p>
                            {teacher1Conflict.conflict && (
                                <p className="text-rose-700">
                                    • <b>Giảng viên 1 ({teacher1Obj?.name}):</b> {teacher1Conflict.message}
                                </p>
                            )}
                            {teacher2Conflict.conflict && (
                                <p className="text-rose-700">
                                    • <b>Giảng viên 2 ({teacher2Obj?.name}):</b> {teacher2Conflict.message}
                                </p>
                            )}
                            {roomConflict.conflict && (
                                <p className="text-rose-700">
                                    • <b>Phòng máy ({formData.room}):</b> {roomConflict.message}
                                </p>
                            )}
                        </div>
                    )}

                    {error && !hasAnyConflict && (
                        <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs border border-rose-200 font-bold flex items-center gap-2">
                            <Icons.AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                        </div>
                    )}

                    {/* Mã lớp & Sĩ số */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-700">Mã Lớp DLU *</label>
                                <button 
                                    type="button" 
                                    onClick={() => setFormData(prev => ({ ...prev, code: `ITC_${new Date().getFullYear().toString().slice(-2)}_${Math.floor(10 + Math.random() * 90)}` }))}
                                    className="text-[10px] text-itc-600 font-bold hover:underline"
                                >
                                    🔄 Tạo mã mới
                                </button>
                            </div>
                            <input 
                                type="text" 
                                placeholder="VD: ITC_26_01"
                                value={formData.code}
                                onChange={e => setFormData({...formData, code: e.target.value})}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-itc-500 outline-none bg-white font-mono font-bold"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Sĩ số (Học viên)</label>
                            <input 
                                type="number" 
                                min="1"
                                value={formData.studentsCount}
                                onChange={e => setFormData({...formData, studentsCount: parseInt(e.target.value) || 0})}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-itc-500 outline-none bg-white font-bold"
                            />
                        </div>
                    </div>

                    {/* Khóa học */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Khóa Học / Chứng Chỉ *</label>
                        <select 
                            value={formData.courseId}
                            onChange={e => setFormData({...formData, courseId: e.target.value})}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:border-itc-500 outline-none bg-white font-bold text-slate-800"
                        >
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.code || c.id})</option>
                            ))}
                        </select>
                    </div>

                    {/* GIẢNG VIÊN 1 */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                        <span className="text-xs font-bold text-itc-900 flex items-center gap-1.5">
                            <Icons.User className="w-4 h-4 text-itc-700" /> Giảng viên 1 (Chính) *
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                                <select 
                                    value={formData.teacherId}
                                    onChange={e => setFormData({...formData, teacherId: e.target.value})}
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:border-itc-500 outline-none bg-slate-50 font-semibold"
                                >
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.code || t.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <input 
                                    type="text"
                                    placeholder="Vai trò (VD: Giảng viên Lý thuyết)"
                                    value={formData.teacherRole1}
                                    onChange={e => setFormData({...formData, teacherRole1: e.target.value})}
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* CHECKBOX BẬT GIẢNG VIÊN 2 */}
                    <div className="flex items-center gap-2 pt-0.5">
                        <input 
                            type="checkbox" 
                            id="co-teaching-checkbox" 
                            checked={hasSecondTeacher} 
                            onChange={e => setHasSecondTeacher(e.target.checked)}
                            className="w-4 h-4 accent-itc-800 rounded cursor-pointer"
                        />
                        <label htmlFor="co-teaching-checkbox" className="text-xs font-bold text-slate-700 cursor-pointer">
                            Xếp thêm Giảng viên 2 (Mô hình đồng giảng dạy / Phụ trách thực hành)
                        </label>
                    </div>

                    {/* GIẢNG VIÊN 2 */}
                    {hasSecondTeacher && (
                        <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 space-y-2 animate-in fade-in duration-150">
                            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                <Icons.User className="w-4 h-4 text-amber-700" /> Giảng viên 2 (Đồng giảng dạy) *
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <select 
                                        value={formData.teacherId2}
                                        onChange={e => setFormData({...formData, teacherId2: e.target.value})}
                                        className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:border-itc-500 outline-none bg-white font-semibold"
                                    >
                                        {teachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.code || t.email})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <input 
                                        type="text"
                                        placeholder="Vai trò (VD: Giảng viên Thực hành phòng máy)"
                                        value={formData.teacherRole2}
                                        onChange={e => setFormData({...formData, teacherRole2: e.target.value})}
                                        className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BẢNG CHỌN NGÀY VÀ GIỜ HỌC TRỰC QUAN */}
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-itc-200 shadow-2xs space-y-3.5">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-1.5">
                                <span className="p-1 bg-itc-100 text-itc-800 rounded-md">📅</span>
                                <label className="text-xs font-bold text-itc-950 uppercase tracking-wide">
                                    Bảng chọn Ngày & Giờ học (Chọn trực tiếp không cần gõ phím)
                                </label>
                            </div>
                            <span className="text-[11px] font-bold text-itc-700 bg-itc-50 px-2.5 py-0.5 rounded-full border border-itc-200">
                                {formData.schedule || 'Chưa chọn'}
                            </span>
                        </div>

                        {/* Mẫu chọn nhanh (1-Click Presets) */}
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                                Chọn nhanh lịch phổ biến tại ITC:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {QUICK_PRESETS.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => applyPreset(preset)}
                                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-itc-100 hover:border-itc-400 hover:text-itc-900 transition"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Chọn các thứ trong tuần */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                    Chọn ngày trong tuần (Ca {shiftType}):
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">🔒 = Trùng phòng hoặc GV bận</span>
                            </div>
                            <div className="grid grid-cols-7 gap-1.5">
                                {DAYS_OF_WEEK.map(day => {
                                    const isSelected = selectedDays.includes(day.key);
                                    const occ = isSlotOccupied(formData.room, day.key, shiftType, classes || []);
                                    const t1Busy = isTeacherBusy(formData.teacherId, day.key, shiftType, classes || []);
                                    const t2Busy = hasSecondTeacher && formData.teacherId2 ? isTeacherBusy(formData.teacherId2, day.key, shiftType, classes || []) : { isBusy: false };
                                    const isLocked = occ.isOccupied || t1Busy.isBusy || t2Busy.isBusy;
                                    const lockTitle = occ.isOccupied 
                                        ? `Phòng ${formData.room} đã có lớp: ${occ.occupiedBy}` 
                                        : t1Busy.isBusy 
                                            ? `Giảng viên 1 bận: ${t1Busy.busyWith}` 
                                            : t2Busy.isBusy 
                                                ? `Giảng viên 2 bận: ${t2Busy.busyWith}` 
                                                : '';

                                    return (
                                        <button
                                            key={day.key}
                                            type="button"
                                            disabled={isLocked && !isSelected}
                                            title={lockTitle}
                                            onClick={() => {
                                                if (isLocked && !isSelected) return;
                                                toggleDay(day.key);
                                            }}
                                            className={`py-2 rounded-xl text-xs font-black transition flex flex-col items-center justify-center border relative ${
                                                isLocked && !isSelected
                                                    ? 'bg-rose-50 text-rose-300 border-rose-200 cursor-not-allowed opacity-60'
                                                    : isSelected 
                                                        ? 'bg-itc-800 text-white border-itc-800 shadow-sm scale-105' 
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            <span className="text-[10px] opacity-75 font-semibold">T.Tuần</span>
                                            <span>{day.key}</span>
                                            {isLocked && !isSelected && (
                                                <span className="text-[8px] font-black text-rose-600">🔒 Kín</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Chọn Ca & Giờ học cụ thể */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                Chọn ca học & Thời gian:
                            </span>
                            
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Ca học */}
                                <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                    {['Sáng', 'Chiều', 'Tối'].map(shift => (
                                        <button
                                            key={shift}
                                            type="button"
                                            onClick={() => {
                                                setShiftType(shift);
                                                if (shift === 'Sáng') { setStartTime('08:00'); setEndTime('10:30'); }
                                                else if (shift === 'Chiều') { setStartTime('14:00'); setEndTime('16:30'); }
                                                else { setStartTime('18:00'); setEndTime('20:30'); }
                                            }}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                                shiftType === shift 
                                                    ? 'bg-itc-800 text-white shadow-2xs' 
                                                    : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            {shift}
                                        </button>
                                    ))}
                                </div>

                                {/* Giờ bắt đầu & Giờ kết thúc */}
                                <div className="flex items-center gap-2 text-xs font-semibold">
                                    <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                                        <span className="text-slate-400 text-[10px]">Từ:</span>
                                        <input 
                                            type="time" 
                                            value={startTime}
                                            onChange={e => setStartTime(e.target.value)}
                                            className="text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                        />
                                    </div>
                                    <span className="text-slate-400 font-bold">-</span>
                                    <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                                        <span className="text-slate-400 text-[10px]">Đến:</span>
                                        <input 
                                            type="time" 
                                            value={endTime}
                                            onChange={e => setEndTime(e.target.value)}
                                            className="text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PHÒNG MÁY / LAB */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-700">Phòng Máy / Lab *</label>
                            <span className="text-[11px] text-slate-500">Đã chọn: <b className="text-itc-900">{formData.room}</b></span>
                        </div>

                        {/* Nút bấm chọn nhanh phòng máy */}
                        <div className="flex flex-wrap gap-1.5">
                            {QUICK_ROOMS.map(r => {
                                const isRoomBusy = selectedDays.length > 0 && selectedDays.some(d => isSlotOccupied(r, d, shiftType, classes || []).isOccupied);
                                return (
                                    <button
                                        key={r}
                                        type="button"
                                        disabled={isRoomBusy}
                                        title={isRoomBusy ? `Phòng ${r} đã kín vào lịch ${shiftType} ${selectedDays.join('-')}` : ''}
                                        onClick={() => !isRoomBusy && setFormData(prev => ({ ...prev, room: r }))}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                                            isRoomBusy
                                                ? 'bg-rose-50 text-rose-300 border-rose-200 cursor-not-allowed opacity-60'
                                                : formData.room === r 
                                                    ? 'bg-itc-800 text-white border-itc-800 shadow-2xs' 
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        🖥️ {r} {isRoomBusy ? '(🔒 Kín)' : ''}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Ô nhập tùy chỉnh nếu phòng ngoài danh sách */}
                        <input 
                            type="text" 
                            placeholder="Hoặc tự gõ tên phòng khác (VD: Phòng Hội trường A)..."
                            value={formData.room}
                            onChange={e => setFormData({...formData, room: e.target.value})}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-itc-500 outline-none bg-white mt-1"
                        />
                    </div>

                    {/* SĨ SỐ LỚP HỌC (GIỚI HẠN SINH VIÊN) */}
                    <div className="space-y-2 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                👥 Sĩ số tối đa của lớp (Giới hạn đăng ký):
                            </label>
                            <span className="text-xs font-black text-amber-800 bg-white px-2.5 py-0.5 rounded-md border border-amber-200">
                                {formData.studentsCount} Học viên
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {[10, 15, 20, 25, 30].map(cnt => (
                                <button
                                    key={cnt}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, studentsCount: cnt }))}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                                        formData.studentsCount === cnt
                                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {cnt} HV
                                </button>
                            ))}
                            <div className="flex items-center gap-1 ml-auto">
                                <span className="text-[11px] text-slate-500 font-semibold">Tự nhập:</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={200}
                                    value={formData.studentsCount}
                                    onChange={e => setFormData(prev => ({ ...prev, studentsCount: parseInt(e.target.value) || 10 }))}
                                    className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center focus:border-amber-500 outline-none"
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-amber-700 italic">
                            * Khi số lượng sinh viên đăng ký chạm mức giới hạn ({formData.studentsCount} SV), sinh viên tiếp theo sẽ nhận thông báo lớp đã đủ sĩ số và không thể ghi danh thêm.
                        </p>
                    </div>

                    {/* Footer Buttons */}
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition">
                            Hủy bỏ
                        </button>
                        <button type="submit" className="px-6 py-2.5 text-xs font-bold text-white bg-itc-800 rounded-xl hover:bg-itc-900 shadow-md flex items-center gap-2 transition transform hover:scale-105">
                            <Icons.Plus className="w-4 h-4" /> Tạo Lớp Ngay
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
