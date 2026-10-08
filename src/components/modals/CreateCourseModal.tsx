import React, { useState, useEffect } from 'react';
import { Icons } from '../ui/Icons';
import { Course } from '../../types';

interface CreateCourseModalProps {
    existingCourses: Course[];
    onClose: () => void;
    onSubmit: (newCourse: Course) => void;
}

// Hàm tự động sinh mã môn học / chứng chỉ theo thứ tự: MH01, MH02... hoặc CC01, CC02...
export const generateNextCourseCode = (courseType: 'REGULAR' | 'CERTIFICATE', coursesList: Course[]): string => {
    const prefix = courseType === 'CERTIFICATE' ? 'CC' : 'MH';
    let maxNum = 0;
    
    (coursesList || []).forEach(c => {
        if (!c.code) return;
        const upper = c.code.toUpperCase().trim();
        // Bắt các mẫu như CC01, CC-01, CC_01, MH01, MH-01, MH_01
        const regex = new RegExp(`^${prefix}[-_]?0*([0-9]+)$`, 'i');
        const match = upper.match(regex);
        if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });

    const nextNum = (maxNum + 1).toString().padStart(2, '0');
    return `${prefix}${nextNum}`;
};

export const CreateCourseModal = ({ existingCourses = [], onClose, onSubmit }: CreateCourseModalProps) => {
    const [type, setType] = useState<'REGULAR' | 'CERTIFICATE'>('CERTIFICATE');
    const [code, setCode] = useState(() => generateNextCourseCode('CERTIFICATE', existingCourses));
    const [name, setName] = useState('');
    
    // Quản lý số tiết: Tổng, Lý thuyết (LT), Thực hành (TH)
    const [totalPeriods, setTotalPeriods] = useState<number>(45);
    const [theoryPeriods, setTheoryPeriods] = useState<number>(30);
    const [practicePeriods, setPracticePeriods] = useState<number>(15);
    const [weeksCount, setWeeksCount] = useState<number>(6);
    
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');

    // Tự động gán mã mới khi đổi loại hình đào tạo nếu mã hiện tại đang là dạng tự gán
    const handleTypeChange = (newType: 'REGULAR' | 'CERTIFICATE') => {
        setType(newType);
        const autoCode = generateNextCourseCode(newType, existingCourses);
        setCode(autoCode);

        // Với chứng chỉ thường thiên về thực hành phòng máy nhiều hơn
        if (newType === 'CERTIFICATE' && totalPeriods === 45) {
            setTheoryPeriods(15);
            setPracticePeriods(30);
        } else if (newType === 'REGULAR' && totalPeriods === 45) {
            setTheoryPeriods(30);
            setPracticePeriods(15);
        }
    };

    // Khi đổi tổng số tiết
    const handleSetTotalPeriods = (total: number) => {
        setTotalPeriods(total);
        if (total === 45) {
            // Mặc định chuẩn 2:1 (30 LT - 15 TH) hoặc 1:2
            if (type === 'CERTIFICATE') {
                setTheoryPeriods(15);
                setPracticePeriods(30);
            } else {
                setTheoryPeriods(30);
                setPracticePeriods(15);
            }
        } else if (total === 30) {
            setTheoryPeriods(20);
            setPracticePeriods(10);
        } else if (total === 60) {
            setTheoryPeriods(30);
            setPracticePeriods(30);
        } else if (total === 90) {
            setTheoryPeriods(60);
            setPracticePeriods(30);
        } else {
            const half = Math.floor(total / 2);
            setTheoryPeriods(half);
            setPracticePeriods(total - half);
        }
    };

    // Khi người dùng điều chỉnh Lý thuyết
    const handleTheoryChange = (val: number) => {
        const lt = Math.max(0, Math.min(totalPeriods, val));
        setTheoryPeriods(lt);
        setPracticePeriods(totalPeriods - lt);
    };

    // Khi người dùng điều chỉnh Thực hành
    const handlePracticeChange = (val: number) => {
        const th = Math.max(0, Math.min(totalPeriods, val));
        setPracticePeriods(th);
        setTheoryPeriods(totalPeriods - th);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('Vui lòng nhập tên môn học hoặc chứng chỉ!');
            return;
        }

        const finalCode = (code.trim() || generateNextCourseCode(type, existingCourses)).toUpperCase();

        // Kiểm tra trùng mã môn
        if (existingCourses.some(c => c.code?.toUpperCase() === finalCode)) {
            setError(`Mã môn / chứng chỉ "${finalCode}" đã tồn tại! Vui lòng chọn mã khác.`);
            return;
        }

        // Tạo chuỗi thời lượng chi tiết
        const durationText = `${totalPeriods} tiết (${theoryPeriods} LT - ${practicePeriods} TH, ${weeksCount} tuần)`;

        const newCourse: Course = {
            id: 'crs_' + Date.now(),
            code: finalCode,
            name: name.trim(),
            duration: durationText,
            totalPeriods,
            theoryPeriods,
            practicePeriods,
            description: description.trim() || `${type === 'CERTIFICATE' ? 'Khóa đào tạo chứng chỉ chuyên đề' : 'Chương trình môn học chính quy'} - Trung tâm Tin học ITC ĐH Đà Lạt`,
            type: type
        };

        onSubmit(newCourse);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 lg:p-7 shadow-2xl border border-slate-100 space-y-4 my-8">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-itc-50 text-itc-800 border border-itc-200 flex items-center justify-center text-lg font-black">
                            📚
                        </div>
                        <div>
                            <h3 className="font-extrabold text-slate-900 text-base">Thêm Môn học / Chứng chỉ mới</h3>
                            <p className="text-xs text-slate-500">Mã tự gán thứ tự & cấu hình phân bổ số tiết Lý thuyết / Thực hành</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
                    >
                        <Icons.Close className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Loại hình đào tạo */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                            1. Phân loại đào tạo
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => handleTypeChange('CERTIFICATE')}
                                className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center flex items-center justify-center gap-1.5 ${
                                    type === 'CERTIFICATE'
                                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                <span>🏅</span> Khóa Chứng chỉ (CC..)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('REGULAR')}
                                className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center flex items-center justify-center gap-1.5 ${
                                    type === 'REGULAR'
                                        ? 'bg-itc-800 text-white border-itc-900 shadow-xs'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                <span>📖</span> Môn Chính quy (MH..)
                            </button>
                        </div>
                    </div>

                    {/* Mã môn (Tự gán) & Tên môn */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-slate-700 uppercase">
                                    Mã (Tự gán)
                                </label>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    Auto
                                </span>
                            </div>
                            <input
                                type="text"
                                required
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                className="w-full border border-sky-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-sky-900 bg-sky-50 focus:bg-white focus:outline-none focus:border-sky-500 transition text-center"
                                placeholder="MH01 / CC01"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                Tên Môn học / Chứng chỉ <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="VD: Lập trình Web Fullstack, Tin học MOS..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-itc-500 bg-slate-50 focus:bg-white transition"
                            />
                        </div>
                    </div>

                    {/* KHỐI PHÂN CHIA THỜI LƯỢNG: TỔNG SỐ TIẾT, LÝ THUYẾT VÀ THỰC HÀNH */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                                ⏱️ 2. Thời lượng & Phân bổ số tiết
                            </label>
                            <span className="text-xs font-bold text-itc-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                Tổng: <b>{totalPeriods} tiết</b> ({weeksCount} tuần)
                            </span>
                        </div>

                        {/* Chọn nhanh tổng số tiết */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-slate-500 font-semibold mr-1">Tổng tiết:</span>
                            {[30, 45, 60, 90].map(cnt => (
                                <button
                                    key={cnt}
                                    type="button"
                                    onClick={() => handleSetTotalPeriods(cnt)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                                        totalPeriods === cnt
                                            ? 'bg-itc-800 text-white border-itc-800 shadow-2xs'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    {cnt} tiết
                                </button>
                            ))}
                            <div className="flex items-center gap-1 ml-auto">
                                <span className="text-[11px] text-slate-400">Tự nhập:</span>
                                <input
                                    type="number"
                                    min={5}
                                    max={300}
                                    value={totalPeriods}
                                    onChange={(e) => handleSetTotalPeriods(parseInt(e.target.value) || 45)}
                                    className="w-14 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs font-bold text-center outline-none"
                                />
                            </div>
                        </div>

                        {/* Phân chia Lý thuyết & Thực hành */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                <span>Phân bổ chi tiết:</span>
                                <span className="text-slate-500 text-[11px]">
                                    Lý thuyết: <b className="text-indigo-700">{theoryPeriods} tiết</b> ({Math.round((theoryPeriods / totalPeriods) * 100)}%) | Thực hành: <b className="text-emerald-700">{practicePeriods} tiết</b> ({Math.round((practicePeriods / totalPeriods) * 100)}%)
                                </span>
                            </div>

                            {/* Gợi ý các phương án chia chuẩn cho 45 tiết */}
                            {totalPeriods === 45 && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => { setTheoryPeriods(30); setPracticePeriods(15); }}
                                        className={`p-2 rounded-xl text-left border transition text-[11px] ${
                                            theoryPeriods === 30 && practicePeriods === 15
                                                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs font-bold'
                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <p className="font-bold text-xs">📘 30 LT + 15 TH</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Tỷ lệ 2:1 (Chuẩn ĐH/CĐ phổ biến nhất)</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setTheoryPeriods(15); setPracticePeriods(30); }}
                                        className={`p-2 rounded-xl text-left border transition text-[11px] ${
                                            theoryPeriods === 15 && practicePeriods === 30
                                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs font-bold'
                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <p className="font-bold text-xs">💻 15 LT + 30 TH</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Tỷ lệ 1:2 (Môn thiên về Code/Lab máy tính)</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setTheoryPeriods(0); setPracticePeriods(45); }}
                                        className={`p-2 rounded-xl text-left border transition text-[11px] ${
                                            theoryPeriods === 0 && practicePeriods === 45
                                                ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs font-bold'
                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <p className="font-bold text-xs">🖥️ 0 LT + 45 TH</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">100% Thực hành (Luyện thi CC MOS/IC3)</p>
                                    </button>
                                </div>
                            )}

                            {/* Ô nhập điều chỉnh thủ công số tiết LT và TH */}
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                                    <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                                        📖 Số tiết Lý thuyết (LT):
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="number"
                                            min={0}
                                            max={totalPeriods}
                                            value={theoryPeriods}
                                            onChange={(e) => handleTheoryChange(parseInt(e.target.value) || 0)}
                                            className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-900 focus:outline-none"
                                        />
                                        <span className="text-[11px] text-indigo-700 font-semibold whitespace-nowrap">tiết</span>
                                    </div>
                                </div>

                                <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                                        🖥️ Số tiết Thực hành (TH):
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="number"
                                            min={0}
                                            max={totalPeriods}
                                            value={practicePeriods}
                                            onChange={(e) => handlePracticeChange(parseInt(e.target.value) || 0)}
                                            className="w-full bg-white border border-emerald-200 rounded-lg px-2.5 py-1 text-xs font-bold text-emerald-900 focus:outline-none"
                                        />
                                        <span className="text-[11px] text-emerald-700 font-semibold whitespace-nowrap">tiết</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Số tuần học dự kiến */}
                        <div className="flex items-center justify-between text-xs px-1">
                            <span className="text-slate-600 font-medium">Thời gian học dự kiến:</span>
                            <div className="flex items-center gap-1.5">
                                {[4, 6, 8, 10].map(w => (
                                    <button
                                        key={w}
                                        type="button"
                                        onClick={() => setWeeksCount(w)}
                                        className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                            weeksCount === w
                                                ? 'bg-slate-700 text-white border-slate-700'
                                                : 'bg-white text-slate-600 border-slate-200'
                                        }`}
                                    >
                                        {w} tuần
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Mô tả */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            3. Mô tả tóm tắt nội dung
                        </label>
                        <textarea
                            rows={2}
                            placeholder="Mô tả kiến thức, kỹ năng thực hành và chuẩn đầu ra của môn học..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-itc-500 bg-slate-50 focus:bg-white transition"
                        />
                    </div>

                    {/* Footer */}
                    <div className="pt-2 flex gap-3 justify-end border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-slate-500 hover:bg-slate-100 font-bold text-xs rounded-xl transition"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-itc-800 hover:bg-itc-900 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                        >
                            <span>✓</span> Xác nhận Tạo Môn ({code})
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
