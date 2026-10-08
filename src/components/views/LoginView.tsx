import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Icons } from '../ui/Icons';

export const LoginView = ({ 
    onLoginSuccess
}: { 
    onLoginSuccess: (user: any, role: string, teacherId?: string) => void;
}) => {
    const [account, setAccount] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const inputVal = account.trim();
        if (!inputVal) {
            setError('Vui lòng nhập email, mã số hoặc tên đăng nhập.');
            setIsLoading(false);
            return;
        }

        try {
            // Bước 1: Chuẩn hóa và nhận diện email đăng nhập
            let loginEmail = inputVal;
            let normalizedCode = inputVal.toUpperCase();

            // Tự động chuẩn hóa SV1 -> SV01, GV1 -> GV01
            if (/^[sS][vV]\d$/.test(inputVal)) {
                normalizedCode = `SV0${inputVal.slice(2)}`;
            } else if (/^[gG][vV]\d$/.test(inputVal)) {
                normalizedCode = `GV0${inputVal.slice(2)}`;
            }

            // Nếu người dùng không nhập @ (ví dụ gõ: "SV01", "GV01", "admin", "annguyen")
            if (!loginEmail.includes('@')) {
                try {
                    // Tra cứu trong bảng app_users theo code hoặc email
                    const { data: matchedUsers } = await supabase
                        .from('app_users')
                        .select('email, role, code')
                        .or(`code.ilike.${normalizedCode},code.ilike.${inputVal},email.ilike.${inputVal}@%`)
                        .limit(1);

                    if (matchedUsers && matchedUsers.length > 0 && matchedUsers[0].email) {
                        loginEmail = matchedUsers[0].email;
                    } else {
                        // Đoán theo tiền tố
                        const lower = inputVal.toLowerCase();
                        if (lower.startsWith('gv')) {
                            loginEmail = `${lower}@dlu.edu.vn`;
                        } else {
                            loginEmail = `${lower}@itc.edu.vn`;
                        }
                    }
                } catch (e) {
                    const lower = inputVal.toLowerCase();
                    loginEmail = lower.startsWith('gv') ? `${lower}@dlu.edu.vn` : `${lower}@itc.edu.vn`;
                }
            }

            // Bước 2: Đăng nhập qua Supabase Auth
            let authSuccess = false;
            let { data, error: authError } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password
            });

            if (!authError && data?.user) {
                authSuccess = true;
            } else {
                // Thử mật khẩu dự phòng (123456 <-> svitc123 / gvitc123)
                const fallbackPasswords = [];
                if (password === '123456') {
                    fallbackPasswords.push('svitc123', 'gvitc123');
                } else if (password === 'svitc123' || password === 'gvitc123') {
                    fallbackPasswords.push('123456');
                }

                for (const fallbackPass of fallbackPasswords) {
                    const { data: fbData, error: fbError } = await supabase.auth.signInWithPassword({
                        email: loginEmail,
                        password: fallbackPass
                    });
                    if (!fbError && fbData?.user) {
                        authSuccess = true;
                        break;
                    }
                }

                // Nếu vẫn chưa thành công và inputVal không có @, thử đảo domain (@itc.edu.vn <-> @dlu.edu.vn)
                if (!authSuccess && !inputVal.includes('@')) {
                    const altEmail = loginEmail.endsWith('@dlu.edu.vn')
                        ? `${loginEmail.split('@')[0]}@itc.edu.vn`
                        : `${loginEmail.split('@')[0]}@dlu.edu.vn`;
                    
                    const { data: altData, error: altError } = await supabase.auth.signInWithPassword({
                        email: altEmail,
                        password
                    });
                    if (!altError && altData?.user) {
                        authSuccess = true;
                        loginEmail = altEmail;
                    }
                }
            }

            if (!authSuccess) {
                setError('Tài khoản hoặc mật khẩu không chính xác. Mật khẩu mặc định là 123456.');
                setIsLoading(false);
                return;
            }

            // Lấy lại session hiện tại
            const { data: sessionData } = await supabase.auth.getSession();
            const currentAuthUser = sessionData?.session?.user;

            if (!currentAuthUser) {
                setError('Đăng nhập thất bại. Vui lòng thử lại.');
                setIsLoading(false);
                return;
            }

            // Bước 3: Lấy thông tin vai trò (role) từ bảng app_users
            const { data: appUser } = await supabase
                .from('app_users')
                .select('*')
                .eq('id', currentAuthUser.id)
                .maybeSingle();

            // Nếu app_users chưa kịp có hoặc fallback
            let role = appUser?.role;
            if (!role) {
                const userEmail = (currentAuthUser.email || '').toLowerCase();
                if (userEmail.startsWith('admin@')) role = 'ADMIN';
                else if (userEmail.endsWith('@dlu.edu.vn') || userEmail.includes('gv')) role = 'TEACHER';
                else role = 'STUDENT';
            }

            const effectiveUser = appUser || {
                id: currentAuthUser.id,
                email: currentAuthUser.email,
                name: currentAuthUser.email?.split('@')[0] || 'Người dùng',
                role
            };

            const teacherId = role === 'TEACHER' ? effectiveUser.id : undefined;

            // Chuyển người dùng vào đúng giao diện tương ứng theo vai trò
            onLoginSuccess(effectiveUser, role, teacherId);

        } catch (err) {
            console.error('Login error:', err);
            setError('Đã xảy ra lỗi kết nối máy chủ. Vui lòng thử lại sau.');
            setIsLoading(false);
        }
    };

    return (
        <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Brand Header */}
                <div className="bg-gradient-to-b from-itc-900 to-itc-800 p-8 text-center text-white relative">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg p-2">
                        <img src="/logoitc.jpg" alt="ITC Logo" className="h-14 object-contain" />
                    </div>
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/10 text-emerald-300 border border-emerald-400/30 inline-block mb-2 shadow-2xs">
                        Trung tâm Công nghệ Thông tin - Trường ĐH Đà Lạt
                    </span>
                    <h2 className="text-xl font-black tracking-tight">HỆ THỐNG QUẢN LÝ CHẤT LƯỢNG</h2>
                    <p className="text-xs text-itc-100 mt-1">
                        Cổng đăng nhập dùng chung cho Ban Quản lý, Giảng viên & Học viên
                    </p>
                </div>

                {/* Login Form */}
                <div className="p-6 sm:p-8">
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="p-3.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded-2xl border border-rose-200 flex items-center gap-2 animate-in shake">
                                <Icons.AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                Tài khoản đăng nhập
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Icons.User className="w-4 h-4" />
                                </span>
                                <input 
                                    type="text" 
                                    required
                                    autoComplete="username"
                                    value={account}
                                    onChange={(e) => setAccount(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-itc-500 focus:bg-white transition-all font-medium"
                                    placeholder="Email, Mã SV / Mã GV hoặc Username..."
                                />
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 pl-1">
                                * Có thể nhập email đầy đủ hoặc chỉ cần nhập Mã SV (VD: <b>SV01</b>), Mã GV (VD: <b>GV01</b>).
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Icons.Lock className="w-4 h-4" />
                                </span>
                                <input 
                                    type={showPassword ? 'text' : 'password'} 
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-itc-500 focus:bg-white transition-all"
                                    placeholder="Nhập mật khẩu..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    <Icons.Eye className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between mt-1 pl-1 text-[11px] text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Icons.Lock className="w-3 h-3 text-slate-400" />
                                    <span>Mật khẩu mặc định: <b className="text-slate-700">123456</b></span>
                                </span>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full bg-itc-800 hover:bg-itc-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 text-xs sm:text-sm cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <Icons.Loader className="w-4 h-4 animate-spin" /> Đang xác thực...
                                    </>
                                ) : (
                                    <>
                                        <Icons.CheckCircle className="w-4 h-4 text-emerald-400" /> Đăng nhập vào Hệ thống
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-1.5">
                        <p className="text-[11px] text-slate-500 font-medium">
                            Hệ thống tự động điều hướng đúng giao diện theo vai trò của bạn:
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 text-[10px] font-bold text-slate-600">
                            <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">🛡️ Quản trị viên</span>
                            <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">👨‍🏫 Giảng viên</span>
                            <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">🎓 Học viên</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
