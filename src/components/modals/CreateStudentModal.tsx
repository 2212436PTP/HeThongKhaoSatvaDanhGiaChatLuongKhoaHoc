import React, { useState, useEffect } from 'react';
import { Icons } from '../ui/Icons';
import { Student } from '../../types';
import { getNextStudentCode, generateSuggestedEmail } from '../../lib/scheduleConflict';

interface CreateStudentModalProps {
    existingStudents: Student[];
    classes: any[];
    onClose: () => void;
    onSubmit: (newStudent: Student) => void;
}

export const CreateStudentModal = ({
    existingStudents,
    classes,
    onClose,
    onSubmit
}: CreateStudentModalProps) => {
    // Tự sinh mã SV theo thứ tự SV01, SV02, ... SV0n
    const autoCode = getNextStudentCode(existingStudents);

    const [name, setName] = useState('');
    const [code, setCode] = useState(autoCode);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('svitc123'); // Mật khẩu mặc định theo yêu cầu
    const [selectedClassCodes, setSelectedClassCodes] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Khi người dùng gõ Tên, tự động gợi ý username email nếu chưa có
    const handleNameChange = (val: string) => {
        setName(val);
        const suggested = generateSuggestedEmail(val, code).split('@')[0];
        setUsername(suggested);
    };

    const handleUsernameChange = (val: string) => {
        let clean = val.trim().toLowerCase().replace(/\s+/g, '');
        if (clean.includes('@')) {
            clean = clean.split('@')[0];
        }
        setUsername(clean);
    };

    const fullEmail = `${username || code.toLowerCase()}@itc.edu.vn`;

    const toggleClassEnroll = (classCode: string) => {
        setSelectedClassCodes(prev => 
            prev.includes(classCode) ? prev.filter(c => c !== classCode) : [...prev, classCode]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!name.trim()) {
            setError('Vui lòng nhập Họ và tên sinh viên.');
            setIsLoading(false);
            return;
        }

        const finalPassword = password.trim() || 'svitc123';

        // Tạo tài khoản Supabase Auth cho sinh viên để đăng nhập được
        let supabaseUserId: string | null = null;
        try {
            const res = await fetch('/api/auth/create-student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: fullEmail,
                    password: finalPassword,
                    code: code.trim().toUpperCase(),
                    name: name.trim()
                })
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Không thể tạo tài khoản đăng nhập cho sinh viên.');
                setIsLoading(false);
                return;
            }
            supabaseUserId = data.userId;
        } catch (err) {
            setError('Lỗi kết nối server. Vui lòng thử lại.');
            setIsLoading(false);
            return;
        }

        const newStudent: Student = {
            id: supabaseUserId || code.trim().toUpperCase(),
            code: code.trim().toUpperCase(),
            name: name.trim(),
            email: fullEmail,
            password: finalPassword,
            enrolledClassCodes: selectedClassCodes,
            createdAt: new Date().toLocaleDateString('vi-VN'),
            status: 'ACTIVE'
        };

        onSubmit(newStudent);
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-itc-800 p-5 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-lg">
                            🎓
                        </div>
                        <div>
                            <h3 className="font-black text-lg">Thêm Sinh viên / Học viên Mới</h3>
                            <p className="text-xs text-itc-100 mt-0.5">
                                Tự động sinh Mã SV ({autoCode}), gán email @itc.edu.vn & mật khẩu
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <Icons.Plus className="w-5 h-5 rotate-45" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-slate-50 overflow-y-auto max-h-[82vh]">
                    {error && (
                        <div className="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-2">
                            <Icons.AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Họ và tên sinh viên */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                Họ và Tên Sinh viên *
                            </label>
                            <input 
                                type="text"
                                required
                                autoFocus
                                placeholder="VD: Nguyễn Văn An"
                                value={name}
                                onChange={e => handleNameChange(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold focus:border-itc-500 outline-none bg-slate-50"
                            />
                            <p className="text-[10px] text-slate-400 mt-1 italic">
                                * Chỉ cần nhập họ tên, hệ thống tự sinh mã SV và email tương ứng.
                            </p>
                        </div>

                        {/* Mã SV & Email tự sinh */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                    Mã Sinh viên (Tự động gán thứ tự):
                                </label>
                                <input 
                                    type="text"
                                    required
                                    value={code}
                                    onChange={e => setCode(e.target.value.toUpperCase())}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-itc-900 bg-slate-50"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                    Mật khẩu cấp phát:
                                </label>
                                <input 
                                    type="text"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="svitc123"
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 bg-slate-50"
                                />
                            </div>
                        </div>

                        {/* Email tự động đuôi @itc.edu.vn */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                Email đăng nhập (Tự gán đuôi @itc.edu.vn):
                            </label>
                            <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:border-itc-500">
                                <input 
                                    type="text"
                                    value={username}
                                    onChange={e => handleUsernameChange(e.target.value)}
                                    placeholder={code.toLowerCase()}
                                    className="flex-1 px-3 py-2 text-xs font-mono font-semibold outline-none bg-transparent"
                                />
                                <span className="bg-slate-200 text-slate-700 px-3 flex items-center text-xs font-bold border-l border-slate-200 select-none">
                                    @itc.edu.vn
                                </span>
                            </div>
                            <p className="text-[11px] text-itc-700 mt-1 font-semibold">
                                📧 Email sẽ cấp: <b className="font-mono text-itc-900">{fullEmail}</b>
                            </p>
                        </div>
                    </div>

                    {/* Xếp lớp ban đầu (Tùy chọn) */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase">
                            Xếp vào Lớp học (Tùy chọn):
                        </label>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {classes.map(c => (
                                <label key={c.id} className="flex items-center gap-2 p-2 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer text-xs transition">
                                    <input 
                                        type="checkbox"
                                        checked={selectedClassCodes.includes(c.code)}
                                        onChange={() => toggleClassEnroll(c.code)}
                                        className="w-4 h-4 accent-itc-800 rounded"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <b className="text-slate-800">{c.code}</b> — <span className="text-slate-500">{c.room}</span>
                                        <span className="block text-[10px] text-slate-400 font-mono">{c.schedule}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-2 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition text-xs disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 bg-itc-800 hover:bg-itc-900 text-white font-bold py-3 rounded-xl transition text-xs shadow-md flex items-center justify-center gap-1.5 disabled:opacity-70"
                        >
                            {isLoading ? <><Icons.Loader className="w-4 h-4 animate-spin" /> Đang tạo...</> : <><Icons.Plus className="w-4 h-4" /> Tạo Sinh viên ({code})</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
