import React from 'react';
import { exportSurveyReportToExcel } from '../../lib/excelExport';

export const ReportModal = ({ 
    stats, 
    warningThreshold = 3.0, 
    reviews = [],
    classes = [],
    courses = [],
    criteriaList = [],
    teachers = [],
    onClose 
}: any) => {
    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8 border border-slate-200 text-xs text-slate-700">
                <div className="border-b border-slate-200 pb-3 mb-4 flex justify-between items-start">
                    <div>
                        <p className="text-[10px] font-extrabold text-itc-800 uppercase tracking-widest">BÁO CÁO NỘI BỘ DLU</p>
                        <h2 className="text-base font-bold text-slate-900 mt-0.5">BÁO CÁO CHẤT LƯỢNG ĐÀO TẠO & ĐIỂM NÓNG BẢO TRÌ</h2>
                        <p className="text-[11px] text-slate-500">Trung tâm Công nghệ Thông tin – Trường Đại học Đà Lạt</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                </div>

                <div className="space-y-4">
                    {/* Tech Stack Summary in Report */}
                    <div className="bg-slate-900 text-white p-4 rounded-xl text-xs space-y-2.5 border border-slate-700">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                            <h4 className="font-bold text-amber-400 uppercase text-[11px] tracking-wider">I. BỘ CÔNG NGHỆ ÁP DỤNG (CHIẾN THUẬT GỘP ALL-IN-ONE)</h4>
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30 font-semibold">1 Lập trình viên Fullstack</span>
                        </div>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-200">
                            <li className="bg-slate-800/80 p-2 rounded border border-slate-700">
                                <span className="text-amber-300 font-bold block">1. Framework Cốt lõi:</span>
                                Next.js (App Router, Server Actions / Route Handlers)
                            </li>
                            <li className="bg-slate-800/80 p-2 rounded border border-slate-700">
                                <span className="text-emerald-300 font-bold block">2. Cơ sở dữ liệu & Auth:</span>
                                Supabase (PostgreSQL + Supabase Auth)
                            </li>
                            <li className="bg-slate-800/80 p-2 rounded border border-slate-700">
                                <span className="text-sky-300 font-bold block">3. Giao diện & UI/UX:</span>
                                Tailwind CSS + Shadcn UI
                            </li>
                            <li className="bg-slate-800/80 p-2 rounded border border-slate-700">
                                <span className="text-purple-300 font-bold block">4. Phân tích hệ thống:</span>
                                Draw.io (Wireframe, Use Case, ERD)
                            </li>
                        </ul>
                        <div className="text-[11px] bg-slate-800/90 p-2 rounded border border-slate-700 text-slate-300">
                            <span className="text-rose-300 font-bold">5. Triển khai & Vận hành:</span> Deploy tự động từ GitHub lên nền tảng Vercel 1-Click.
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 bg-itc-50 p-3 rounded-xl border border-itc-100">
                        <div>
                            <span className="text-slate-500 block text-[11px]">Tổng lượt khảo sát:</span>
                            <b className="text-sm text-itc-900">{stats.totalSubmissions} lượt</b>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[11px]">Chỉ số hài lòng:</span>
                            <b className="text-sm text-itc-800">{stats.centerAvgSatisfaction} / 5.0 ★</b>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[11px]">Cảnh báo sự cố:</span>
                            <b className="text-sm text-rose-600">{stats.alertList.length} vụ việc</b>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-slate-800 text-xs mb-1.5">II. Chi tiết tiêu chí dưới ngưỡng cảnh báo (&lt; {warningThreshold}★)</h4>
                        {stats.alertList.length > 0 ? (
                            <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
                                <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                                    <tr>
                                        <th className="p-2">Lớp</th>
                                        <th className="p-2">Phòng máy</th>
                                        <th className="p-2">Tiêu chí phàn nàn</th>
                                        <th className="p-2 text-right">Điểm</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stats.alertList.map((a: any) => (
                                        <tr key={a.id}>
                                            <td className="p-2 font-bold text-itc-900">{a.classCode}</td>
                                            <td className="p-2">{a.room}</td>
                                            <td className="p-2 text-rose-600 font-medium">{a.critName}</td>
                                            <td className="p-2 text-right font-bold text-rose-600">{a.score} ★</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-slate-400 italic">Tất cả các tiêu chí hiện tại đều đạt chuẩn.</p>
                        )}
                    </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Xuất báo cáo ngày: {new Date().toLocaleDateString('vi-VN')}</span>
                    <div className="flex items-center gap-2">
                        <button 
                            type="button"
                            onClick={() => exportSurveyReportToExcel({
                                stats,
                                warningThreshold,
                                reviews,
                                classes,
                                courses,
                                criteriaList,
                                teachers
                            })}
                            className="px-3.5 py-1.5 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                            title="Tải toàn bộ báo cáo chất lượng khóa học dạng bảng tính Excel (.xlsx)"
                        >
                            <span>📥</span> Xuất Excel Báo Cáo (.xlsx)
                        </button>
                        <button 
                            onClick={() => window.print()}
                            className="px-3.5 py-1.5 bg-itc-800 text-white font-semibold text-xs rounded-lg hover:bg-itc-900 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>🖨️</span> In Báo Cáo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
