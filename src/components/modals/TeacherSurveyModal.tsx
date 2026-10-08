import React, { useState, useEffect } from 'react';
import { Icons } from '../ui/Icons';
import { getDeviceFingerprint, checkDeviceSubmissionStatus, recordDeviceSubmission } from '../../lib/deviceFingerprint';
import { TeacherCriterion, LIKERT_LEVELS } from '../../types';

interface TeacherSurveyModalProps {
    classInfo: any;
    courseName?: string;
    student: { id: string; name: string };
    teacherCriteria: TeacherCriterion[];
    teachers: any[];
    onSubmitSuccess: (surveyData: any) => void;
    onClose: () => void;
}

export const TeacherSurveyModal = ({
    classInfo,
    courseName = 'Môn học',
    student,
    teacherCriteria,
    teachers,
    onSubmitSuccess,
    onClose
}: TeacherSurveyModalProps) => {
    const [t1Ratings, setT1Ratings] = useState<Record<string, number>>({});
    const [t2Ratings, setT2Ratings] = useState<Record<string, number>>({});
    const [teacherComment, setTeacherComment] = useState('');
    const [deviceError, setDeviceError] = useState('');
    const [deviceId, setDeviceId] = useState('');

    const teacher1 = teachers.find(t => t.id === classInfo.teacherId);
    const teacher2 = teachers.find(t => t.id === classInfo.teacherId2);

    // Xác định giảng viên nào đang BẬT khảo sát trong lớp này
    const activeSurveyTeachers: string[] | undefined = classInfo.activeSurveyTeachers;
    const isT1Active = !activeSurveyTeachers || activeSurveyTeachers.length === 0 
        ? (classInfo.status === 'OPEN_SURVEY')
        : activeSurveyTeachers.includes(classInfo.teacherId);
    const isT2Active = classInfo.teacherId2 && (!activeSurveyTeachers || activeSurveyTeachers.length === 0
        ? (classInfo.status === 'OPEN_SURVEY')
        : activeSurveyTeachers.includes(classInfo.teacherId2));

    // Lọc tiêu chí đã duyệt của giảng viên đang mở đợt khảo sát
    const t1Criteria = (teacher1 && isT1Active)
        ? teacherCriteria.filter(tc => tc.teacherId === classInfo.teacherId && tc.status === 'APPROVED')
        : [];
    const t2Criteria = (teacher2 && isT2Active)
        ? teacherCriteria.filter(tc => tc.teacherId === classInfo.teacherId2 && tc.status === 'APPROVED')
        : [];

    useEffect(() => {
        const fp = getDeviceFingerprint();
        setDeviceId(fp);

        // Kiểm tra ràng buộc thiết bị (1 SV / 1 Thiết bị)
        const check = checkDeviceSubmissionStatus(`teacher_${classInfo.code}`, student.id);
        if (!check.allowed) {
            setDeviceError(check.reason || 'Thiết bị này đã được sử dụng bởi sinh viên khác để đánh giá lớp học này!');
        }
    }, [classInfo.code, student.id]);

    const handleRatingChange = (teacherNum: 1 | 2, criterionId: string, score: number) => {
        if (teacherNum === 1) {
            setT1Ratings(prev => ({ ...prev, [criterionId]: score }));
        } else {
            setT2Ratings(prev => ({ ...prev, [criterionId]: score }));
        }
    };

    // Đánh giá nhanh (Hài lòng) để test thuận tiện
    const handleQuickFill = () => {
        const auto1: Record<string, number> = {};
        t1Criteria.forEach(c => { auto1[c.id] = 5; });
        setT1Ratings(auto1);

        const auto2: Record<string, number> = {};
        t2Criteria.forEach(c => { auto2[c.id] = 5; });
        setT2Ratings(auto2);

        setTeacherComment('Giảng viên giảng dạy rất tận tình, giải đáp thắc mắc chi tiết và hướng dẫn thực hành kỹ lưỡng!');
    };

    const totalQuestions = t1Criteria.length + t2Criteria.length;
    const answeredCount = Object.keys(t1Ratings).length + Object.keys(t2Ratings).length;
    const isCompleted = answeredCount === totalQuestions && !deviceError;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const check = checkDeviceSubmissionStatus(`teacher_${classInfo.code}`, student.id);
        if (!check.allowed) {
            setDeviceError(check.reason || 'Thiết bị này đã được sử dụng!');
            return;
        }

        if (!isCompleted) {
            alert(`Vui lòng hoàn thành toàn bộ ${totalQuestions} tiêu chí đánh giá giảng viên trước khi nộp.`);
            return;
        }

        // Lưu fingerprint chống gian lận
        recordDeviceSubmission(`teacher_${classInfo.id}`, student.id, student.name);

        const teacherRatingsData: Record<string, Record<string, number>> = {};
        if (teacher1) teacherRatingsData[teacher1.id] = t1Ratings;
        if (teacher2) teacherRatingsData[teacher2.id] = t2Ratings;

        const payload = {
            id: 'rev_tch_' + Date.now(),
            classId: classInfo.id,
            classCode: classInfo.code,
            studentCode: student.id,
            studentName: student.name,
            isTeacherSurvey: true,
            type: 'TEACHER',
            ratings: {},
            teacherRatings: teacherRatingsData,
            comment: teacherComment.trim(),
            status: 'OPEN',
            deviceId,
            timestamp: new Date().toISOString()
        };

        onSubmitSuccess(payload);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-indigo-900 p-5 text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-white/10 rounded-lg text-lg">👨‍🏫</span>
                            <h3 className="font-bold text-base lg:text-lg">Khảo sát Chất lượng Giảng dạy của Giảng viên</h3>
                        </div>
                        <p className="text-xs text-indigo-200 mt-1">
                            Môn: <b>{courseName}</b> (Lớp {classInfo.code}) — Học viên: <b>{student.name}</b>
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                    >
                        <Icons.Close className="w-5 h-5" />
                    </button>
                </div>

                {/* Subheader: Info & Progress */}
                <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-indigo-950 font-medium">
                        <Icons.Lock className="w-4 h-4 text-indigo-700" />
                        <span>Phiếu khảo sát do Giảng viên yêu cầu để mở khóa bảng điểm môn học này.</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-900">
                            Tiến độ: {answeredCount}/{totalQuestions} câu
                        </span>
                        <button
                            type="button"
                            onClick={handleQuickFill}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition"
                        >
                            ⚡ Đánh giá nhanh (Rất hài lòng)
                        </button>
                    </div>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
                    {deviceError && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-800 font-medium">
                            <span className="text-lg">🚫</span>
                            <div>
                                <p className="font-bold text-sm">Cảnh báo trùng lặp thiết bị:</p>
                                <p className="mt-0.5">{deviceError}</p>
                            </div>
                        </div>
                    )}

                    {/* GIẢNG VIÊN 1 */}
                    {teacher1 && t1Criteria.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                                <span className="w-7 h-7 bg-indigo-100 text-indigo-800 rounded-lg flex items-center justify-center text-xs font-bold">1</span>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900">
                                        Giảng viên: {teacher1.name}
                                    </h4>
                                    <p className="text-[11px] text-slate-500">{classInfo.teacherRole1 || 'Giảng viên phụ trách môn'}</p>
                                </div>
                            </div>

                            <div className="space-y-3.5">
                                {t1Criteria.map((crit, idx) => (
                                    <div key={crit.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 transition">
                                        <p className="text-xs font-bold text-slate-800 mb-2">
                                            {idx + 1}. {crit.name}
                                        </p>
                                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                                            {LIKERT_LEVELS.map(lvl => (
                                                <button
                                                    key={lvl.score}
                                                    type="button"
                                                    onClick={() => handleRatingChange(1, crit.id, lvl.score)}
                                                    className={`py-2 px-1 rounded-xl text-center flex flex-col items-center gap-1 border transition text-xs ${
                                                        t1Ratings[crit.id] === lvl.score
                                                            ? `${lvl.bgActive} ${lvl.textActive} ${lvl.borderActive} shadow-xs font-bold scale-102`
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <span className="text-base">{lvl.emoji}</span>
                                                    <span className="text-[10px] font-semibold hidden sm:inline leading-tight">{lvl.label}</span>
                                                    <span className="text-[10px] font-bold sm:hidden">{lvl.score}★</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* GIẢNG VIÊN 2 (NẾU CÓ) */}
                    {teacher2 && t2Criteria.length > 0 && (
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                                <span className="w-7 h-7 bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center text-xs font-bold">2</span>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900">
                                        Giảng viên: {teacher2.name}
                                    </h4>
                                    <p className="text-[11px] text-slate-500">{classInfo.teacherRole2 || 'Giảng viên thực hành / trợ giảng'}</p>
                                </div>
                            </div>

                            <div className="space-y-3.5">
                                {t2Criteria.map((crit, idx) => (
                                    <div key={crit.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition">
                                        <p className="text-xs font-bold text-slate-800 mb-2">
                                            {idx + 1}. {crit.name}
                                        </p>
                                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                                            {LIKERT_LEVELS.map(lvl => (
                                                <button
                                                    key={lvl.score}
                                                    type="button"
                                                    onClick={() => handleRatingChange(2, crit.id, lvl.score)}
                                                    className={`py-2 px-1 rounded-xl text-center flex flex-col items-center gap-1 border transition text-xs ${
                                                        t2Ratings[crit.id] === lvl.score
                                                            ? `${lvl.bgActive} ${lvl.textActive} ${lvl.borderActive} shadow-xs font-bold scale-102`
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <span className="text-base">{lvl.emoji}</span>
                                                    <span className="text-[10px] font-semibold hidden sm:inline leading-tight">{lvl.label}</span>
                                                    <span className="text-[10px] font-bold sm:hidden">{lvl.score}★</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Nhận xét riêng cho Giảng viên */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase">
                            Lời nhắn / Nhận xét gửi Giảng viên (Không bắt buộc):
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Gửi lời cảm ơn hoặc đóng góp ý kiến về phương pháp giảng dạy..."
                            value={teacherComment}
                            onChange={e => setTeacherComment(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Footer buttons */}
                    <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                        >
                            Đóng lại
                        </button>
                        <button
                            type="submit"
                            disabled={!isCompleted}
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md ${
                                isCompleted
                                    ? 'bg-indigo-800 hover:bg-indigo-900 text-white scale-102'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <Icons.CheckCircle className="w-4 h-4 text-emerald-400" />
                            Nộp Đánh giá Giảng viên & Mở khóa Điểm
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
