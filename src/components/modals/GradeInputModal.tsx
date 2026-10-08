import React, { useState, useEffect } from "react";
import { Icons } from "../ui/Icons";
import { exportClassGradesToExcel } from "../../lib/excelExport";

interface GradeInputModalProps {
    classInfo: any;
    courseName: string;
    enrollments: any[];
    students: any[];
    existingGrades: Record<string, any>;
    onSaveGrades: (classId: string, grades: any[]) => void;
    onClose: () => void;
}

function calcLetterGrade(total: number): string {
    if (total >= 9.0) return "A+";
    if (total >= 8.5) return "A";
    if (total >= 8.0) return "B+";
    if (total >= 7.0) return "B";
    if (total >= 6.5) return "C+";
    if (total >= 5.5) return "C";
    if (total >= 5.0) return "D+";
    if (total >= 4.0) return "D";
    return "F";
}

export const GradeInputModal = ({
    classInfo,
    courseName,
    enrollments,
    students,
    existingGrades,
    onSaveGrades,
    onClose
}: GradeInputModalProps) => {
    // Lấy danh sách sinh viên đăng ký lớp này
    const enrolledStudentIds = enrollments
        .filter((e: any) => e.classCode === classInfo.code)
        .map((e: any) => e.studentId);

    const enrolledStudents = students.filter((s: any) =>
        enrolledStudentIds.includes(s.id) ||
        (s.enrolledClassCodes || []).includes(classInfo.code)
    );

    const [grades, setGrades] = useState<Record<string, any>>(() => {
        const init: Record<string, any> = {};
        enrolledStudents.forEach((s: any) => {
            const key = `${classInfo.id}_${s.id}`;
            const existing = existingGrades[key];
            init[s.id] = existing || {
                attendanceScore: "",
                labScore: "",
                midtermScore: "",
                finalScore: "",
            };
        });
        return init;
    });

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleChange = (studentId: string, field: string, value: string) => {
        const num = parseFloat(value);
        if (value !== "" && (isNaN(num) || num < 0 || num > 10)) return;
        setGrades((prev) => ({
            ...prev,
            [studentId]: { ...prev[studentId], [field]: value }
        }));
    };

    const calcTotal = (g: any) => {
        const a = parseFloat(g.attendanceScore) || 0;
        const l = parseFloat(g.labScore) || 0;
        const m = parseFloat(g.midtermScore) || 0;
        const f = parseFloat(g.finalScore) || 0;
        if (!g.attendanceScore && !g.labScore && !g.midtermScore && !g.finalScore) return null;
        return Math.round((a * 0.1 + l * 0.3 + m * 0.2 + f * 0.4) * 10) / 10;
    };

    const handleSave = async () => {
        setSaving(true);
        const gradeList = enrolledStudents.map((s: any) => {
            const g = grades[s.id] || {};
            const total = calcTotal(g);
            return {
                classId: classInfo.id,
                classCode: classInfo.code,
                studentId: s.id,
                studentCode: s.code || s.id,
                studentName: s.name,
                attendanceScore: parseFloat(g.attendanceScore) || 0,
                labScore: parseFloat(g.labScore) || 0,
                midtermScore: parseFloat(g.midtermScore) || 0,
                finalScore: parseFloat(g.finalScore) || 0,
                totalScore: total ?? 0,
                letterGrade: total !== null ? calcLetterGrade(total) : "F",
                isPassed: total !== null ? total >= 4.0 : false,
            };
        });
        await onSaveGrades(classInfo.id, gradeList);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-itc-800 px-6 py-5 flex justify-between items-center rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <span className="p-2 bg-white/10 rounded-xl text-xl">📊</span>
                        <div>
                            <h3 className="font-extrabold text-white text-base">Nhập điểm - Lớp {classInfo.code}</h3>
                            <p className="text-xs text-itc-200 mt-0.5">{courseName} | {enrolledStudents.length} sinh viên đã đăng ký</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
                        <Icons.Plus className="w-5 h-5 text-white rotate-45" />
                    </button>
                </div>

                {/* Legend */}
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1"><b className="text-itc-800">CC:</b> Chuyên cần (10%)</span>
                    <span className="flex items-center gap-1"><b className="text-sky-700">TH:</b> Thực hành Lab (30%)</span>
                    <span className="flex items-center gap-1"><b className="text-amber-700">GK:</b> Lý thuyết Giữa kỳ (20%)</span>
                    <span className="flex items-center gap-1"><b className="text-purple-700">CK:</b> Thi Cuối kỳ (40%)</span>
                </div>

                {/* Table */}
                <div className="overflow-auto flex-1">
                    {enrolledStudents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                            <span className="text-4xl mb-3">📭</span>
                            <p className="text-sm font-semibold">Chưa có sinh viên nào đăng ký lớp này.</p>
                            <p className="text-xs mt-1 text-slate-400">Khi sinh viên đăng ký, họ sẽ xuất hiện ở đây để bạn nhập điểm.</p>
                        </div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left">STT</th>
                                    <th className="px-4 py-3 text-left">Sinh viên</th>
                                    <th className="px-3 py-3 text-center w-20">CC<br/><span className="font-normal text-[10px] text-slate-400">/10</span></th>
                                    <th className="px-3 py-3 text-center w-20">TH<br/><span className="font-normal text-[10px] text-slate-400">/10</span></th>
                                    <th className="px-3 py-3 text-center w-20">GK<br/><span className="font-normal text-[10px] text-slate-400">/10</span></th>
                                    <th className="px-3 py-3 text-center w-20">CK<br/><span className="font-normal text-[10px] text-slate-400">/10</span></th>
                                    <th className="px-4 py-3 text-center w-24">Tổng kết</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {enrolledStudents.map((student: any, idx: number) => {
                                    const g = grades[student.id] || {};
                                    const total = calcTotal(g);
                                    const letter = total !== null ? calcLetterGrade(total) : null;
                                    const passed = total !== null ? total >= 4.0 : null;
                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50/70 transition">
                                            <td className="px-4 py-2.5 text-slate-400 font-medium">{idx + 1}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="font-bold text-slate-800">{student.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{student.code || student.id?.substring(0, 8)}</div>
                                            </td>
                                            {["attendanceScore", "labScore", "midtermScore", "finalScore"].map((field) => (
                                                <td key={field} className="px-3 py-2.5 text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="10"
                                                        step="0.5"
                                                        value={g[field] ?? ""}
                                                        onChange={(e) => handleChange(student.id, field, e.target.value)}
                                                        placeholder="—"
                                                        className="w-16 text-center border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:border-itc-500 focus:ring-1 focus:ring-itc-200 outline-none bg-white text-slate-800"
                                                    />
                                                </td>
                                            ))}
                                            <td className="px-4 py-2.5 text-center">
                                                {total !== null ? (
                                                    <div className={`inline-flex flex-col items-center px-3 py-1.5 rounded-xl font-black text-sm ${
                                                        passed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                                    }`}>
                                                        <span>{total}</span>
                                                        <span className="text-[10px] font-bold opacity-80">{letter}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 text-lg">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-white rounded-b-3xl">
                    <p className="text-xs text-slate-500">
                        Công thức: <b>CC×10% + TH×30% + GK×20% + CK×40%</b> · Đạt nếu ≥ 4.0 điểm
                    </p>
                    <div className="flex items-center gap-3">
                        {saved && (
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                <Icons.CheckCircle className="w-4 h-4 text-emerald-500" /> Đã lưu thành công!
                            </span>
                        )}
                        <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
                            Đóng
                        </button>
                        <button
                            type="button"
                            onClick={() => exportClassGradesToExcel({
                                classInfo,
                                courseName,
                                students: enrolledStudents,
                                grades
                            })}
                            disabled={enrolledStudents.length === 0}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-60 cursor-pointer"
                            title="Tải bảng điểm lớp học ra file Excel (.xlsx)"
                        >
                            <span>📥</span> Xuất Excel (.xlsx)
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || enrolledStudents.length === 0}
                            className="flex items-center gap-2 px-5 py-2.5 bg-itc-800 hover:bg-itc-900 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {saving ? (
                                <><Icons.Loader className="w-4 h-4 animate-spin" /> Đang lưu...</>
                            ) : (
                                <><Icons.CheckCircle className="w-4 h-4 text-emerald-400" /> Lưu Bảng điểm</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
