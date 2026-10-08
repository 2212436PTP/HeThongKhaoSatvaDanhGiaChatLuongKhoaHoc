import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { Teacher } from '../../types';
import { getNextTeacherCode, generateSuggestedEmail } from '../../lib/scheduleConflict';

interface CreateTeacherModalProps {
    existingTeachers?: Teacher[];
    onClose: () => void;
    onSubmit: (newTeacher: any) => void;
}

export const CreateTeacherModal = ({ existingTeachers = [], onClose, onSubmit }: CreateTeacherModalProps) => {
    // Tự gán Mã GV theo thứ tự đăng ký GV01, GV02, ... GV0n
    const autoCode = getNextTeacherCode(existingTeachers);

    const [name, setName] = useState('');
    const [code, setCode] = useState(autoCode);
    const [username, setUsername] = useState('');
    const [dept, setDept] = useState('Khoa CNTT - ĐH Đà Lạt');
    const [password, setPassword] = useState('gvitc123');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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

    const fullEmail = `${username || code.toLowerCase()}@dlu.edu.vn`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (!name.trim()) {
            setError('Vui lòng nhập Họ và tên giảng viên.');
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/create-teacher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: fullEmail, password, code, name, dept })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Lỗi khi tạo tài khoản giảng viên');
            }

            onSubmit(data.user);
        } catch (err: any) {
            setError(err.message || 'Lỗi khi tạo giảng viên');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-itc-800 p-5 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-lg">
                            👨‍🏫
                        </div>
                        <div>
                            <h3 className="font-black text-lg">Thêm Giảng viên Mới</h3>
                            <p className="text-xs text-itc-100">
                                Tự động sinh Mã GV ({autoCode}) & gán email @dlu.edu.vn
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition">
                        <Icons.Plus className="w-5 h-5 text-white rotate-45" />
                    </button>
                </div>

                <div className="p-6 bg-slate-50">
                    {error && (
                        <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-xs rounded-xl border border-rose-200 font-bold flex items-center gap-2">
                            <Icons.AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                    Họ và Tên Giảng viên *
                                </label>
                                <input 
                                    required 
                                    autoFocus
                                    value={name} 
                                    onChange={e => handleNameChange(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold focus:border-itc-500 outline-none bg-slate-50" 
                                    placeholder="VD: TS. Nguyễn Minh Trí"
                                />
                                <p className="text-[10px] text-slate-400 mt-1 italic">
                                    * Chỉ cần nhập tên, hệ thống tự động sinh Mã GV ({autoCode}) và email.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                        Mã Giảng viên:
                                    </label>
                                    <input 
                                        required 
                                        value={code} 
                                        onChange={e => setCode(e.target.value.toUpperCase())}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs uppercase font-mono font-black text-itc-900 bg-slate-50" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                        Mật khẩu:
                                    </label>
                                    <input 
                                        required 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 bg-slate-50" 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                    Email Đăng nhập (Tự động gán đuôi @dlu.edu.vn):
                                </label>
                                <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:border-itc-500">
                                    <input 
                                        type="text" 
                                        required 
                                        value={username} 
                                        onChange={e => handleUsernameChange(e.target.value)}
                                        className="flex-1 px-3 py-2 text-xs font-mono font-semibold outline-none bg-transparent" 
                                        placeholder={code.toLowerCase()}
                                    />
                                    <span className="bg-slate-200 text-slate-700 px-3.5 flex items-center text-xs font-bold border-l border-slate-200 select-none">
                                        @dlu.edu.vn
                                    </span>
                                </div>
                                <p className="text-[11px] text-itc-700 mt-1 font-semibold">
                                    📧 Email cấp phát: <b className="font-mono text-itc-900">{fullEmail}</b>
                                </p>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                    Khoa / Bộ môn công tác:
                                </label>
                                <input 
                                    type="text" 
                                    value={dept} 
                                    onChange={e => setDept(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50" 
                                    placeholder="VD: Khoa CNTT - ĐH Đà Lạt"
                                />
                            </div>
                        </div>
                        
                        <div className="pt-2 flex gap-3">
                            <button type="button" onClick={onClose} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition text-xs">
                                Hủy
                            </button>
                            <button type="submit" disabled={isLoading} className="flex-1 bg-itc-800 hover:bg-itc-900 text-white font-bold py-3 rounded-xl transition text-xs shadow-md flex items-center justify-center gap-1.5">
                                {isLoading ? 'Đang tạo...' : `Tạo Giảng viên (${code})`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
