import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { Student, AttendanceRecord, Review } from '../../types';
import { exportClassGradesToExcel } from '../../lib/excelExport';
import { getDisplayStudentCode } from '../../lib/scheduleConflict';

interface ClassStudentsModalProps {
    classInfo: any;
    courseName: string;
    students: Student[];
    attendances: AttendanceRecord[];
    reviews: Review[];
    enrollments?: any[];
    studentGrades?: any;
    teachers?: any[];
    effectiveTeacherId?: string;
    teacherCriteria?: any[];
    onToggleAttendance?: (classInfo: any, student: any) => void;
    onClose: () => void;
}

export const ClassStudentsModal = ({
    classInfo,
    courseName,
    students = [],
    attendances = [],
    reviews = [],
    enrollments = [],
    studentGrades = {},
    teachers = [],
    effectiveTeacherId,
    teacherCriteria = [],
    onToggleAttendance,
    onClose
}: ClassStudentsModalProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingReview, setViewingReview] = useState<any>(null);

    // Lọc danh sách sinh viên đăng ký lớp này (từ cả enrolledClassCodes và enrollments)
    const enrolledStudents = students.filter(s => 
        (s.enrolledClassCodes || []).includes(classInfo.code) ||
        enrollments.some((e: any) => (e.studentId === s.id || e.studentId === s.code) && e.classCode === classInfo.code)
    );

    const filteredStudents = enrolledStudents.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.code || s.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Tính toán số lượng đã điểm danh & đã nộp khảo sát
    const classAttendances = attendances.filter(a => a.classId === classInfo.id || a.classCode === classInfo.code);
    const classReviews = reviews.filter(r => r.classId === classInfo.id || r.classCode === classInfo.code);

    // Tiêu chí của giảng viên này
    const myCriteria = teacherCriteria.filter((tc: any) => tc.teacherId === effectiveTeacherId);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-4xl w-full p-6 lg:p-7 shadow-2xl border border-slate-100 space-y-5 max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-itc-100 text-itc-800 rounded-lg text-lg">👨‍🎓</span>
                            <h3 className="font-extrabold text-slate-900 text-base lg:text-lg">
                                Quản lý Sinh viên & Điểm danh - Lớp {classInfo.code}
                            </h3>
                            <span className="bg-itc-50 text-itc-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-itc-200">
                                {classInfo.room}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Môn học: <b className="text-itc-900">{courseName}</b> | Lịch: <b>{classInfo.schedule}</b>
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
                    >
                        <Icons.Close className="w-5 h-5" />
                    </button>
                </div>

                {/* Sĩ số & Thống kê nhanh */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                        <p className="text-[11px] font-semibold text-slate-500">Sĩ số sinh viên lớp</p>
                        <p className="text-xl font-black text-itc-900 mt-0.5">
                            {enrolledStudents.length} / <span className="text-sm text-slate-400">{classInfo.studentsCount || 10} HV</span>
                        </p>
                    </div>
                    <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 text-center">
                        <p className="text-[11px] font-semibold text-emerald-700">Đã điểm danh</p>
                        <p className="text-xl font-black text-emerald-800 mt-0.5">
                            {enrolledStudents.filter(st => {
                                const tRev = classReviews.some(r => (r.studentCode === st.code || r.studentCode === st.id) && (r.isTeacherSurvey || r.type === 'TEACHER' || r.teacherRatings));
                                return tRev || classAttendances.some(a => (a.studentCode === st.code || a.studentCode === st.id || a.studentId === st.id) && a.isPresent);
                            }).length} / {enrolledStudents.length} HV
                        </p>
                    </div>
                    <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 text-center">
                        <p className="text-[11px] font-semibold text-indigo-700">Đã đánh giá Giảng viên</p>
                        <p className="text-xl font-black text-indigo-800 mt-0.5">
                            {enrolledStudents.filter(st => classReviews.some(r => (r.studentCode === st.id || r.studentCode === st.code) && (r.isTeacherSurvey || r.type === 'TEACHER' || r.teacherRatings))).length} / {enrolledStudents.length} HV
                        </p>
                    </div>
                </div>

                {/* Search box */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
                    <span className="text-slate-400">🔍</span>
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo Tên sinh viên, Mã SV (SV01...) hoặc Email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs w-full font-medium"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-y-auto flex-1 border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-700 font-bold uppercase sticky top-0 border-b border-slate-200 z-10">
                            <tr>
                                <th className="p-3">Mã SV</th>
                                <th className="p-3">Họ và Tên</th>
                                <th className="p-3">Email Sinh viên</th>
                                <th className="p-3 text-center">Điểm danh</th>
                                <th className="p-3 text-center">Khảo sát Giảng viên</th>
                                <th className="p-3 text-center">Khảo sát TT</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredStudents.map((st) => {
                                const teacherRev = classReviews.find(r => 
                                    (r.studentCode === st.code || r.studentCode === st.id) &&
                                    (r.isTeacherSurvey || r.type === 'TEACHER' || (r.teacherRatings && effectiveTeacherId && r.teacherRatings[effectiveTeacherId]))
                                );
                                const centerRev = reviews.find(r => 
                                    (r.studentCode === st.code || r.studentCode === st.id) &&
                                    (r.isCenterSurvey || r.type === 'CENTER')
                                );
                                const attended = Boolean(
                                    teacherRev || 
                                    classAttendances.some(a => (a.studentCode === st.code || a.studentCode === st.id || a.studentId === st.id) && a.isPresent)
                                );

                                // Điểm các tiêu chí của GV nếu có
                                const tRatings = (teacherRev && effectiveTeacherId && teacherRev.teacherRatings?.[effectiveTeacherId]) 
                                    ? teacherRev.teacherRatings[effectiveTeacherId] 
                                    : (teacherRev?.teacherRatings ? Object.values(teacherRev.teacherRatings)[0] : null);

                                return (
                                    <tr key={st.id || st.code} className="hover:bg-slate-50/80 transition">
                                        <td className="p-3 font-mono font-bold text-itc-900 whitespace-nowrap">
                                            <span className="bg-itc-50 text-itc-800 px-2 py-0.5 rounded border border-itc-200 text-[11px]" title={st.id}>
                                                {getDisplayStudentCode(st, students)}
                                            </span>
                                        </td>
                                        <td className="p-3 font-bold text-slate-800">{st.name}</td>
                                        <td className="p-3 font-mono text-slate-500 text-[11px]">{st.email}</td>
                                        
                                        {/* Điểm danh */}
                                        <td className="p-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => onToggleAttendance && onToggleAttendance(classInfo, st)}
                                                className={`px-3 py-1 rounded-full text-[11px] font-bold transition flex items-center justify-center gap-1 mx-auto ${
                                                    attended
                                                        ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-2xs'
                                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200'
                                                }`}
                                                title="Click để chuyển trạng thái điểm danh"
                                            >
                                                {attended ? '✓ Có mặt' : '○ Chưa điểm danh'}
                                            </button>
                                        </td>

                                        {/* Khảo sát Giảng viên */}
                                        <td className="p-3 text-center">
                                            {teacherRev ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                                                        ✓ Đã đánh giá
                                                    </span>
                                                    {tRatings && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewingReview({ student: st, ratings: tRatings, comment: teacherRev.comment })}
                                                            className="text-[10px] text-indigo-600 hover:underline font-semibold"
                                                        >
                                                            Xem điểm chấm &rarr;
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                                                    ⏳ Chưa làm
                                                </span>
                                            )}
                                        </td>

                                        {/* Khảo sát Trung tâm */}
                                        <td className="p-3 text-center">
                                            {centerRev ? (
                                                <span className="bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                                    ✓ Đã nộp
                                                </span>
                                            ) : (
                                                <span className="bg-slate-100 text-slate-400 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                                                    Chưa làm
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-10 text-slate-400">
                                        {enrolledStudents.length === 0 
                                            ? 'Lớp học hiện tại chưa có sinh viên nào đăng ký.'
                                            : 'Không tìm thấy sinh viên phù hợp với từ khóa tìm kiếm.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
                    <p className="text-xs text-slate-500">
                        Hiển thị <b>{filteredStudents.length}</b> / {enrolledStudents.length} sinh viên đăng ký môn học
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => exportClassGradesToExcel({
                                classInfo,
                                courseName,
                                teachers,
                                students: enrolledStudents,
                                grades: studentGrades || {}
                            })}
                            disabled={enrolledStudents.length === 0}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
                            title="Xuất danh sách sinh viên & bảng điểm lớp học ra file Excel (.xlsx)"
                        >
                            <span>📥</span> Xuất Excel Bảng Điểm (.xlsx)
                        </button>
                        <button
                            onClick={onClose}
                            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                            Đóng cửa sổ
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal xem chi tiết điểm đánh giá tiêu chí của sinh viên */}
            {viewingReview && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                            <div>
                                <h4 className="font-bold text-sm text-slate-900">
                                    Chi tiết đánh giá của: <b className="text-indigo-800">{viewingReview.student.name}</b>
                                </h4>
                                <p className="text-xs text-slate-500">Mã SV: {getDisplayStudentCode(viewingReview.student, students)}</p>
                            </div>
                            <button onClick={() => setViewingReview(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                            <span className="text-[11px] font-bold text-slate-600 uppercase block">
                                Điểm chấm các tiêu chí riêng của bạn:
                            </span>
                            {Object.entries(viewingReview.ratings).map(([critId, score]) => {
                                const tc = myCriteria.find((c: any) => c.id === critId);
                                return (
                                    <div key={critId} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                                        <span className="font-medium text-slate-700 pr-2">{tc ? tc.name : critId}</span>
                                        <span className="font-black text-amber-500 shrink-0">{score as number} ★</span>
                                    </div>
                                );
                            })}
                        </div>

                        {viewingReview.comment && (
                            <div className="p-3 bg-indigo-50/60 rounded-xl text-xs text-indigo-900 border border-indigo-100">
                                <span className="font-bold block mb-0.5">Lời nhắn gửi:</span>
                                <p className="italic">"{viewingReview.comment}"</p>
                            </div>
                        )}

                        <div className="text-right pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setViewingReview(null)}
                                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
