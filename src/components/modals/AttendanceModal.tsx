import React from 'react';
import { Icons } from '../ui/Icons';
import { AttendanceRecord } from '../../types';
import { getDisplayStudentCode } from '../../lib/scheduleConflict';

interface AttendanceModalProps {
    classInfo: any;
    courseName: string;
    attendances: AttendanceRecord[];
    onClose: () => void;
}

export const AttendanceModal = ({ classInfo, courseName, attendances, onClose }: AttendanceModalProps) => {
    const classAttendances = attendances.filter(a => a.classId === classInfo?.id);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-emerald-800 p-5 text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <Icons.CheckCircle className="w-6 h-6 text-emerald-300" />
                            <h3 className="font-bold text-lg">Sổ Điểm Danh Tự Động (Qua Khảo Sát)</h3>
                        </div>
                        <p className="text-xs text-emerald-100 mt-1">
                            Lớp: <b>{classInfo?.code}</b> — {courseName} | Phòng: <b>{classInfo?.room}</b>
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <Icons.Plus className="w-5 h-5 rotate-45" />
                    </button>
                </div>

                {/* Sub-header KPIs */}
                <div className="bg-emerald-50/60 p-4 border-b border-emerald-100 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-4 text-xs">
                        <div>
                            <span className="text-slate-500 font-medium">Sĩ số lớp:</span>{' '}
                            <b className="text-slate-800 font-black">{classInfo?.studentsCount || 0} học viên</b>
                        </div>
                        <div className="h-4 w-px bg-slate-300"></div>
                        <div>
                            <span className="text-slate-500 font-medium">Đã điểm danh & khảo sát:</span>{' '}
                            <b className="text-emerald-700 font-black">{classAttendances.length} học viên</b>
                        </div>
                        <div className="h-4 w-px bg-slate-300"></div>
                        <div>
                            <span className="text-slate-500 font-medium">Tỷ lệ chuyên cần:</span>{' '}
                            <b className="text-emerald-800 font-black">
                                {classInfo?.studentsCount ? Math.round((classAttendances.length / classInfo.studentsCount) * 100) : 0}%
                            </b>
                        </div>
                    </div>
                    <button 
                        onClick={() => window.print()}
                        className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                    >
                        <Icons.FileText className="w-3.5 h-3.5" /> In danh sách
                    </button>
                </div>

                {/* Body Table */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                    {classAttendances.length > 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                            <table className="w-full text-left text-xs text-slate-700">
                                <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="p-3 w-12 text-center">STT</th>
                                        <th className="p-3">Mã SV/HV</th>
                                        <th className="p-3">Họ và Tên</th>
                                        <th className="p-3">Thời gian nộp</th>
                                        <th className="p-3">Mã Thiết bị (Anti-Cheat)</th>
                                        <th className="p-3 text-right">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {classAttendances.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition">
                                            <td className="p-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                                            <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                                                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 text-[11px]" title={item.studentCode}>
                                                    {getDisplayStudentCode({ studentCode: item.studentCode, studentName: item.studentName })}
                                                </span>
                                            </td>
                                            <td className="p-3 font-medium text-slate-800">{item.studentName || 'Học viên ITC'}</td>
                                            <td className="p-3 text-slate-500">{item.submittedAt || item.date}</td>
                                            <td className="p-3 font-mono text-[11px] text-slate-500">
                                                <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                    {item.deviceFingerprint ? item.deviceFingerprint.slice(0, 15) + '...' : 'Thiết bị hợp lệ'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[11px] border border-emerald-200 inline-flex items-center gap-1">
                                                    <Icons.CheckCircle className="w-3 h-3 text-emerald-600" /> CÓ MẶT
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 text-xs">
                            <Icons.AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-60" />
                            Chưa có sinh viên nào nộp bài khảo sát để hoàn tất điểm danh hôm nay.
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};
