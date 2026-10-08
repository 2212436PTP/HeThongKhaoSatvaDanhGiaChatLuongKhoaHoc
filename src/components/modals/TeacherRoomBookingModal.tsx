import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { Course, RoomBooking } from '../../types';
import { 
    STANDARD_ROOMS, 
    STANDARD_DAYS, 
    STANDARD_SHIFTS, 
    calculateRoomAvailability, 
    checkTeacherConflict, 
    checkRoomConflict,
    isSlotOccupied,
    isTeacherBusy
} from '../../lib/scheduleConflict';

interface TeacherRoomBookingModalProps {
    teacherId: string;
    teacherName: string;
    classes: any[];
    courses?: Course[];
    allClasses?: any[];
    teachers?: any[];
    roomBookings: RoomBooking[];
    initialTab?: 'create' | 'matrix' | 'history';
    onSubmitBooking: (booking: RoomBooking) => void;
    onCancelBooking?: (bookingId: string) => void;
    onClose: () => void;
}

export const TeacherRoomBookingModal = ({
    teacherId,
    teacherName,
    classes,
    courses = [],
    allClasses,
    teachers = [],
    roomBookings,
    initialTab = 'create',
    onSubmitBooking,
    onCancelBooking,
    onClose
}: TeacherRoomBookingModalProps) => {
    const globalClasses = (allClasses && allClasses.length > 0) ? allClasses : classes;
    const initialCourseChoice = courses[0]?.name || classes[0]?.code || 'Tin học cơ bản';
    const [selectedClass, setSelectedClass] = useState(initialCourseChoice);
    const [selectedRoom, setSelectedRoom] = useState(STANDARD_ROOMS[0]);
    const [bookingDate, setBookingDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    const [selectedDayKey, setSelectedDayKey] = useState('T2');
    const [shiftType, setShiftType] = useState('Tối');
    const [computersNeeded, setComputersNeeded] = useState(35);
    const [purpose, setPurpose] = useState('Dạy bù thực hành phòng máy và ôn tập đề thi');
    const [note, setNote] = useState('');
    const [activeTab, setActiveTab] = useState<'create' | 'matrix' | 'history'>(initialTab);
    const [errorMsg, setErrorMsg] = useState('');

    const scheduleString = `${shiftType} ${selectedDayKey} (${shiftType === 'Sáng' ? '08:00 - 11:30' : shiftType === 'Chiều' ? '13:30 - 17:00' : '18:00 - 20:30'})`;

    // 1. Kiểm tra Giảng viên có bị trùng lịch dạy vào giờ này không (dựa trên toàn bộ lịch trường)
    const teacherConflict = checkTeacherConflict(teacherId, scheduleString, globalClasses);

    // 2. Kiểm tra Phòng máy có bị trùng lịch lớp khác không (dựa trên toàn bộ lịch trường)
    const roomConflict = checkRoomConflict(selectedRoom, scheduleString, globalClasses);

    // Tính toán ma trận phòng trống theo toàn bộ lớp học và giảng viên
    const availabilitySlots = calculateRoomAvailability(globalClasses, teachers);

    const myBookings = roomBookings.filter(b => b.teacherId === teacherId);

    // Bấm chọn trực tiếp từ Ma trận phòng trống
    const handleSelectSlotFromMatrix = (room: string, dayKey: string, shift: string) => {
        setSelectedRoom(room);
        setSelectedDayKey(dayKey);
        setShiftType(shift);
        setActiveTab('create');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (teacherConflict.conflict) {
            setErrorMsg(`Bạn không thể đăng ký: ${teacherConflict.message}`);
            return;
        }

        if (roomConflict.conflict) {
            setErrorMsg(`Phòng máy bận: ${roomConflict.message}`);
            return;
        }

        const newBooking: RoomBooking = {
            id: 'rb_' + Date.now(),
            teacherId,
            teacherName,
            courseName: selectedClass,
            room: selectedRoom,
            date: bookingDate,
            timeSlot: scheduleString,
            computersNeeded: Number(computersNeeded),
            purpose: purpose + (note ? ` (${note})` : ''),
            status: 'PENDING',
            createdAt: new Date().toLocaleString('vi-VN')
        };

        onSubmitBooking(newBooking);
        setActiveTab('history');
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-itc-800 p-5 text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-white/10 rounded-lg">🖥️</span>
                            <h3 className="font-black text-lg">Đăng ký Phòng máy & Tra cứu Phòng trống</h3>
                        </div>
                        <p className="text-xs text-itc-100 mt-1">
                            Giảng viên: <b>{teacherName}</b> — Hiển thị phòng trống, ngày trống, giờ trống để tránh trùng lịch
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <Icons.Plus className="w-5 h-5 rotate-45" />
                    </button>
                </div>

                {/* Tab switch */}
                <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 shrink-0 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 shrink-0 ${
                            activeTab === 'create' ? 'bg-white text-itc-800 border-t-2 border-itc-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <span>📝</span> Đăng ký mượn phòng
                    </button>
                    <button
                        onClick={() => setActiveTab('matrix')}
                        className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 shrink-0 ${
                            activeTab === 'matrix' ? 'bg-white text-itc-800 border-t-2 border-itc-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <span>🟢</span> Bảng Phòng trống & Giờ trống (Tra cứu)
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 shrink-0 ${
                            activeTab === 'history' ? 'bg-white text-itc-800 border-t-2 border-itc-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <span>📋</span> Lịch sử đăng ký của tôi ({myBookings.length})
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                    {/* TAB 1: TẠO ĐĂNG KÝ PHÒNG */}
                    {activeTab === 'create' && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Cảnh báo trùng lịch */}
                            {(teacherConflict.conflict || roomConflict.conflict) && (
                                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs space-y-1 animate-in shake">
                                    <p className="font-black text-rose-800 flex items-center gap-1.5 text-sm">
                                        <span>🚫</span> CẢNH BÁO TRÙNG LỊCH:
                                    </p>
                                    {teacherConflict.conflict && (
                                        <p className="text-rose-700 font-semibold">• {teacherConflict.message}</p>
                                    )}
                                    {roomConflict.conflict && (
                                        <p className="text-rose-700 font-semibold">• {roomConflict.message}</p>
                                    )}
                                    <p className="text-[11px] text-rose-600 italic mt-1">
                                        👉 Vui lòng đổi sang phòng khác hoặc giờ khác, hoặc bấm sang tab "Bảng Phòng trống" để chọn phòng còn trống!
                                    </p>
                                </div>
                            )}

                            {errorMsg && (
                                <div className="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200">
                                    ⚠️ {errorMsg}
                                </div>
                            )}

                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Môn học / Lớp học */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Môn học / Khóa học muốn dạy
                                        </label>
                                        <select
                                            value={selectedClass}
                                            onChange={(e) => setSelectedClass(e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-itc-500 bg-slate-50"
                                        >
                                            {courses.length > 0 && (
                                                <optgroup label="📚 Chương trình Đào tạo & Chứng chỉ ITC">
                                                    {courses.map(crs => (
                                                        <option key={crs.id} value={`${crs.name} (${crs.code || 'ITC'})`}>
                                                            {crs.type === 'CERTIFICATE' ? '🏅 ' : '📖 '} {crs.name} ({crs.code || 'ITC'})
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {classes.length > 0 && (
                                                <optgroup label="🏫 Các lớp học hiện tại của tôi">
                                                    {classes.map(c => (
                                                        <option key={c.id} value={`${c.code} (${c.room})`}>{c.code} - {c.room}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            <optgroup label="🎯 Hoạt động khác">
                                                <option value="Dạy bù thực hành phòng máy">Dạy bù thực hành phòng máy</option>
                                                <option value="Lớp chuyên đề bồi dưỡng ôn thi">Lớp chuyên đề bồi dưỡng ôn thi</option>
                                                <option value="Tổ chức thi thử thực hành trên máy">Tổ chức thi thử thực hành trên máy</option>
                                            </optgroup>
                                        </select>
                                    </div>

                                    {/* Chọn phòng */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Phòng máy đăng ký
                                        </label>
                                        <select
                                            value={selectedRoom}
                                            onChange={(e) => setSelectedRoom(e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-itc-500 bg-slate-50"
                                        >
                                            {STANDARD_ROOMS.map(r => {
                                                const occ = isSlotOccupied(r, selectedDayKey, shiftType, globalClasses, roomBookings);
                                                return (
                                                    <option key={r} value={r} disabled={occ.isOccupied}>
                                                        {r} {occ.isOccupied ? `(🔒 Đã kín lịch)` : ' (Trống)'}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    {/* Ngày học trong tuần */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-xs font-bold text-slate-700 uppercase">
                                                Thứ trong tuần
                                            </label>
                                            <span className="text-[10px] text-slate-400 font-semibold">🔒 = Đã kín ca {shiftType}</span>
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                            {STANDARD_DAYS.map(d => {
                                                const occ = isSlotOccupied(selectedRoom, d.key, shiftType, globalClasses, roomBookings);
                                                const teacherBusy = isTeacherBusy(teacherId, d.key, shiftType, globalClasses);
                                                const isLocked = occ.isOccupied || teacherBusy.isBusy;
                                                const lockTitle = occ.isOccupied 
                                                    ? `Phòng ${selectedRoom} đã kín ca ${shiftType}: ${occ.occupiedBy}` 
                                                    : teacherBusy.isBusy 
                                                        ? `Bạn đã có lịch dạy: ${teacherBusy.busyWith}` 
                                                        : '';

                                                return (
                                                    <button
                                                        key={d.key}
                                                        type="button"
                                                        disabled={isLocked}
                                                        title={lockTitle}
                                                        onClick={() => !isLocked && setSelectedDayKey(d.key)}
                                                        className={`py-1.5 rounded-lg text-xs font-bold border transition relative ${
                                                            isLocked
                                                                ? 'bg-rose-50 text-rose-300 border-rose-200 cursor-not-allowed opacity-60'
                                                                : selectedDayKey === d.key
                                                                    ? 'bg-itc-800 text-white border-itc-800 shadow-2xs'
                                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {d.key}
                                                        {isLocked && <span className="block text-[8px] no-underline font-black text-rose-600">🔒 Kín</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Ca học */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-xs font-bold text-slate-700 uppercase">
                                                Ca học / Khung giờ
                                            </label>
                                            <span className="text-[10px] text-slate-400 font-semibold">Khóa tự động nếu trùng</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {STANDARD_SHIFTS.map(s => {
                                                const occ = isSlotOccupied(selectedRoom, selectedDayKey, s.key, globalClasses, roomBookings);
                                                const teacherBusy = isTeacherBusy(teacherId, selectedDayKey, s.key, globalClasses);
                                                const isLocked = occ.isOccupied || teacherBusy.isBusy;
                                                const lockTitle = occ.isOccupied 
                                                    ? `Phòng ${selectedRoom} đã có lịch ${s.key} ${selectedDayKey}: ${occ.occupiedBy}` 
                                                    : teacherBusy.isBusy 
                                                        ? `Bạn đã có lịch dạy: ${teacherBusy.busyWith}` 
                                                        : '';

                                                return (
                                                    <button
                                                        key={s.key}
                                                        type="button"
                                                        disabled={isLocked}
                                                        title={lockTitle}
                                                        onClick={() => !isLocked && setShiftType(s.key)}
                                                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1 ${
                                                            isLocked
                                                                ? 'bg-rose-50 text-rose-400 border-rose-200 cursor-not-allowed opacity-60'
                                                                : shiftType === s.key
                                                                    ? 'bg-itc-800 text-white border-itc-800 shadow-2xs'
                                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        <span>{s.key}</span>
                                                        {isLocked ? <span className="text-[10px] text-rose-600 font-bold">🔒 Kín</span> : null}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Ngày cụ thể */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Ngày bắt đầu sử dụng
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={bookingDate}
                                            onChange={(e) => setBookingDate(e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-itc-500 bg-slate-50"
                                        />
                                    </div>

                                    {/* Số máy tính */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Số lượng máy tính cần dùng
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="60"
                                            required
                                            value={computersNeeded}
                                            onChange={(e) => setComputersNeeded(Number(e.target.value))}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-itc-500 bg-slate-50"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Mục đích sử dụng & Yêu cầu phần mềm
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="VD: Dạy bù thực hành, cần cài VS Code, Node.js..."
                                        value={purpose}
                                        onChange={(e) => setPurpose(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-itc-500 bg-slate-50 font-medium"
                                    />
                                </div>

                                <div className="p-3 bg-itc-50 rounded-xl border border-itc-200 flex justify-between items-center text-xs">
                                    <span className="text-itc-900 font-semibold">Khung giờ đăng ký:</span>
                                    <b className="font-mono text-itc-900 text-sm">{scheduleString} — {selectedRoom}</b>
                                </div>

                                <button
                                    type="submit"
                                    disabled={teacherConflict.conflict || roomConflict.conflict}
                                    className={`w-full py-3 rounded-xl transition text-xs font-bold shadow-md flex items-center justify-center gap-1.5 ${
                                        teacherConflict.conflict || roomConflict.conflict
                                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                            : 'bg-itc-800 hover:bg-itc-900 text-white cursor-pointer'
                                    }`}
                                >
                                    <Icons.CheckCircle className="w-4 h-4 text-emerald-400" /> 
                                    {teacherConflict.conflict || roomConflict.conflict
                                        ? 'Bị trùng lịch - Không thể gửi yêu cầu'
                                        : 'Gửi yêu cầu đăng ký phòng tới Admin'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* TAB 2: MA TRẬN PHÒNG TRỐNG VÀ GIỜ TRỐNG TRỰC QUAN */}
                    {activeTab === 'matrix' && (
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap justify-between items-center gap-2">
                                <div>
                                    <h4 className="font-black text-sm text-itc-900">
                                        BẢNG TỔNG HỢP PHÒNG TRỐNG & GIỜ TRỐNG TẠI TRUNG TÂM ITC
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                        Bấm vào ô màu xanh <b>[🟢 TRỐNG]</b> để tự động chọn phòng và giờ đăng ký ngay mà không sợ trùng lịch!
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold">
                                    <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Còn trống
                                    </span>
                                    <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span> Đã có lớp / Bận
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto p-4">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase text-slate-600">
                                            <th className="p-2.5">Phòng máy</th>
                                            {STANDARD_DAYS.map(d => (
                                                <th key={d.key} className="p-2.5 text-center min-w-[110px]">
                                                    {d.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {STANDARD_ROOMS.map(room => (
                                            <tr key={room} className="hover:bg-slate-50/50">
                                                <td className="p-2.5 font-bold text-slate-800 whitespace-nowrap bg-slate-50/30">
                                                    🖥️ {room}
                                                </td>
                                                {STANDARD_DAYS.map(day => {
                                                    // Lấy tình trạng 3 ca (Sáng, Chiều, Tối) của phòng vào ngày này
                                                    const morningSlot = availabilitySlots.find(s => s.room === room && s.dayKey === day.key && s.shift === 'Sáng');
                                                    const afternoonSlot = availabilitySlots.find(s => s.room === room && s.dayKey === day.key && s.shift === 'Chiều');
                                                    const eveningSlot = availabilitySlots.find(s => s.room === room && s.dayKey === day.key && s.shift === 'Tối');

                                                    return (
                                                        <td key={day.key} className="p-1.5 align-top">
                                                            <div className="space-y-1">
                                                                {/* Ca Sáng */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => !morningSlot?.isOccupied && handleSelectSlotFromMatrix(room, day.key, 'Sáng')}
                                                                    disabled={morningSlot?.isOccupied}
                                                                    className={`w-full text-[10px] p-1 rounded font-bold transition text-left truncate block ${
                                                                        morningSlot?.isOccupied
                                                                            ? 'bg-rose-100 text-rose-800 cursor-not-allowed opacity-90'
                                                                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-200 cursor-pointer border border-emerald-200'
                                                                    }`}
                                                                    title={morningSlot?.isOccupied ? `Bận: ${morningSlot.occupiedBy}` : `Bấm để đăng ký Sáng ${day.key}`}
                                                                >
                                                                    {morningSlot?.isOccupied ? `🔴 Sáng: ${morningSlot.classCode}` : `🟢 Sáng (Trống)`}
                                                                </button>

                                                                {/* Ca Chiều */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => !afternoonSlot?.isOccupied && handleSelectSlotFromMatrix(room, day.key, 'Chiều')}
                                                                    disabled={afternoonSlot?.isOccupied}
                                                                    className={`w-full text-[10px] p-1 rounded font-bold transition text-left truncate block ${
                                                                        afternoonSlot?.isOccupied
                                                                            ? 'bg-rose-100 text-rose-800 cursor-not-allowed opacity-90'
                                                                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-200 cursor-pointer border border-emerald-200'
                                                                    }`}
                                                                    title={afternoonSlot?.isOccupied ? `Bận: ${afternoonSlot.occupiedBy}` : `Bấm để đăng ký Chiều ${day.key}`}
                                                                >
                                                                    {afternoonSlot?.isOccupied ? `🔴 Chiều: ${afternoonSlot.classCode}` : `🟢 Chiều (Trống)`}
                                                                </button>

                                                                {/* Ca Tối */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => !eveningSlot?.isOccupied && handleSelectSlotFromMatrix(room, day.key, 'Tối')}
                                                                    disabled={eveningSlot?.isOccupied}
                                                                    className={`w-full text-[10px] p-1 rounded font-bold transition text-left truncate block ${
                                                                        eveningSlot?.isOccupied
                                                                            ? 'bg-rose-100 text-rose-800 cursor-not-allowed opacity-90'
                                                                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-200 cursor-pointer border border-emerald-200'
                                                                    }`}
                                                                    title={eveningSlot?.isOccupied ? `Bận: ${eveningSlot.occupiedBy}` : `Bấm để đăng ký Tối ${day.key}`}
                                                                >
                                                                    {eveningSlot?.isOccupied ? `🔴 Tối: ${eveningSlot.classCode}` : `🟢 Tối (Trống)`}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: LỊCH SỬ ĐĂNG KÝ CỦA TÔI */}
                    {activeTab === 'history' && (
                        <div className="space-y-3">
                            {myBookings.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-xs italic bg-white rounded-2xl border border-dashed border-slate-200">
                                    Bạn chưa có yêu cầu đăng ký phòng nào.
                                </div>
                            ) : (
                                myBookings.map((b) => (
                                    <div key={b.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-sm text-itc-900">{b.room}</h4>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Khóa: <b>{b.courseName}</b> | Ngày: <b>{b.date}</b> ({b.timeSlot})
                                                </p>
                                            </div>
                                            <div>
                                                {b.status === 'APPROVED' && (
                                                    <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                                                        <Icons.CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Đã duyệt cấp phòng
                                                    </span>
                                                )}
                                                {b.status === 'PENDING' && (
                                                    <span className="bg-amber-50 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                                                        <Icons.Loader className="w-3.5 h-3.5 text-amber-600 animate-spin" /> Đang chờ duyệt
                                                    </span>
                                                )}
                                                {b.status === 'REJECTED' && (
                                                    <span className="bg-rose-50 text-rose-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1">
                                                        <Icons.AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Phòng bận / Từ chối
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                            <span className="font-semibold text-slate-700">Mục đích:</span> {b.purpose} | Cần: {b.computersNeeded} máy
                                        </p>

                                        {b.adminNote && (
                                            <p className="text-xs text-itc-blue-800 bg-blue-50 p-2 rounded-lg border border-blue-100">
                                                <b>Phản hồi từ Admin:</b> {b.adminNote}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                Đăng ký: {b.createdAt || 'Gần đây'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (window.confirm(`Bạn có chắc chắn muốn HỦY yêu cầu đăng ký mượn ${b.room} (${b.date} - ${b.timeSlot})?\n\nHành động này sẽ giải phóng phòng học trên hệ thống.`)) {
                                                        onCancelBooking && onCancelBooking(b.id);
                                                    }
                                                }}
                                                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1 rounded-lg transition flex items-center gap-1.5 shadow-2xs"
                                                title="Hủy đăng ký mượn phòng này"
                                            >
                                                <Icons.Trash className="w-3.5 h-3.5" /> Hủy đăng ký mượn phòng
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-5 py-2 rounded-xl transition"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};
