import React, { useState, useEffect } from 'react';
import { Icons } from '../ui/Icons';
import { getDeviceFingerprint, checkDeviceSubmissionStatus, recordDeviceSubmission } from '../../lib/deviceFingerprint';
import { CriteriaCategory, TeacherCriterion, LIKERT_LEVELS } from '../../types';
import { getDisplayStudentCode } from '../../lib/scheduleConflict';

interface StudentSurveyModalProps {
    classInfo: any;
    student: { id: string; name: string };
    criteriaList: CriteriaCategory[];
    teacherCriteria: TeacherCriterion[];
    teachers: any[];
    onSubmitSuccess: (surveyData: any) => void;
    onClose: () => void;
}

export const StudentSurveyModal = ({
    classInfo,
    student,
    criteriaList,
    teacherCriteria,
    teachers,
    onSubmitSuccess,
    onClose
}: StudentSurveyModalProps) => {
    const [centerRatings, setCenterRatings] = useState<Record<string, number>>({});
    const [teacher1Ratings, setTeacher1Ratings] = useState<Record<string, number>>({});
    const [teacher2Ratings, setTeacher2Ratings] = useState<Record<string, number>>({});
    const [comment, setComment] = useState('');
    const [deviceError, setDeviceError] = useState('');
    const [deviceId, setDeviceId] = useState('');

    const teacher1 = teachers.find(t => t.id === classInfo.teacherId);
    const teacher2 = teachers.find(t => t.id === classInfo.teacherId2);

    // Chỉ lấy các tiêu chí CÁ NHÂN ĐÃ ĐƯỢC DUYỆT (APPROVED)
    const t1Criteria = teacherCriteria.filter(tc => tc.teacherId === classInfo.teacherId && (tc.status === 'APPROVED' || !tc.status));
    const t2Criteria = classInfo.teacherId2 
        ? teacherCriteria.filter(tc => tc.teacherId === classInfo.teacherId2 && (tc.status === 'APPROVED' || !tc.status))
        : [];

    useEffect(() => {
        const fp = getDeviceFingerprint();
        setDeviceId(fp);

        // Kiểm tra ràng buộc thiết bị (Anti-cheat: 1 thiết bị chỉ được 1 sinh viên nộp bài)
        const check = checkDeviceSubmissionStatus(classInfo.code, student.id);
        if (!check.allowed) {
            setDeviceError(check.reason || 'Thiết bị này đã được sử dụng bởi sinh viên khác!');
        }
    }, [classInfo.code, student.id]);

    const handleQuickRating = (type: 'center' | 't1' | 't2', id: string, score: number) => {
        if (type === 'center') setCenterRatings(prev => ({ ...prev, [id]: score }));
        else if (type === 't1') setTeacher1Ratings(prev => ({ ...prev, [id]: score }));
        else if (type === 't2') setTeacher2Ratings(prev => ({ ...prev, [id]: score }));
    };

    const handleAutoFillGood = () => {
        const autoC: Record<string, number> = {};
        criteriaList.forEach(c => autoC[c.id] = 5);
        setCenterRatings(autoC);

        const autoT1: Record<string, number> = {};
        t1Criteria.forEach(c => autoT1[c.id] = 5);
        setTeacher1Ratings(autoT1);

        const autoT2: Record<string, number> = {};
        t2Criteria.forEach(c => autoT2[c.id] = 5);
        setTeacher2Ratings(autoT2);

        setComment('Giảng viên dạy nhiệt tình, bài tập thực hành sát thực tế, phòng máy mát mẻ đường truyền mạng ổn định!');
    };

    const totalQuestions = criteriaList.length + t1Criteria.length + t2Criteria.length;
    const answeredCount = Object.keys(centerRatings).length + Object.keys(teacher1Ratings).length + Object.keys(teacher2Ratings).length;
    const isReady = answeredCount === totalQuestions && !deviceError;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Kiểm tra lại thiết bị
        const check = checkDeviceSubmissionStatus(classInfo.code, student.id);
        if (!check.allowed) {
            setDeviceError(check.reason || 'Thiết bị này đã được dùng!');
            return;
        }

        if (!isReady) {
            alert(`Vui lòng hoàn thành tất cả ${totalQuestions} câu hỏi khảo sát trước khi nộp.`);
            return;
        }

        // Lưu fingerprint chống gian lận
        recordDeviceSubmission(classInfo.id, student.id, student.name);

        const teacherRatingsData: Record<string, Record<string, number>> = {};
        if (teacher1) teacherRatingsData[teacher1.id] = teacher1Ratings;
        if (teacher2) teacherRatingsData[teacher2.id] = teacher2Ratings;

        const payload = {
            id: 'rev_' + Date.now(),
            classId: classInfo.id,
            classCode: classInfo.code,
            studentCode: student.id,
            studentName: student.name,
            ratings: centerRatings,
            teacherRatings: teacherRatingsData,
            comment: comment.trim(),
            status: 'OPEN',
            deviceId,
            timestamp: new Date().toISOString()
        };

        onSubmitSuccess(payload);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-itc-800 p-5 text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-white/10 rounded-lg">📋</span>
                            <h3 className="font-bold text-lg">Phiếu Khảo sát Chất lượng & Mở khóa Điểm số</h3>
                        </div>
                        <p className="text-xs text-itc-100 mt-1">
                            Lớp: <b>{classInfo.code}</b> ({classInfo.room}) — Học viên: <b>{student.name}</b> ({getDisplayStudentCode(student)})
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <Icons.Plus className="w-5 h-5 rotate-45" />
                    </button>
                </div>

                {/* Anti-cheat banner & Progress */}
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                        <Icons.Lock className="w-4 h-4 text-itc-700" />
                        <span>Mã thiết bị: <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-800">{deviceId.slice(0, 18)}...</code></span>
                        <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">✓ 1 SV / 1 Thiết bị</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="font-bold text-itc-900">
                            Tiến độ: {answeredCount}/{totalQuestions} tiêu chí
                        </span>
                        <button
                            type="button"
                            onClick={handleAutoFillGood}
                            className="bg-itc-50 hover:bg-itc-100 text-itc-800 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-itc-200 transition"
                        >
                            ⚡ Điền nhanh 5★
                        </button>
                    </div>
                </div>

                {/* Device Anti-cheat Error */}
                {deviceError && (
                    <div className="m-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
                        <Icons.AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-sm">Cảnh báo vi phạm thiết bị (Anti-cheat):</p>
                            <p className="mt-1 leading-relaxed">{deviceError}</p>
                            <p className="mt-1 text-[11px] text-rose-600 italic">Mỗi thiết bị chỉ được 1 sinh viên sử dụng để tránh điểm danh hoặc khảo sát hộ bạn bè.</p>
                        </div>
                    </div>
                )}

                {/* Form content */}
                {/* Form content */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/60">
                    {/* BẢNG CHÚ GIẢI 5 CẤP ĐỘ ĐÁNH GIÁ */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                            <span>⭐</span> Thang đo chuẩn 5 cấp độ đánh giá:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {LIKERT_LEVELS.map(level => (
                                <div key={level.score} className="p-2 rounded-xl border border-slate-100 bg-slate-50/80 flex items-center gap-2">
                                    <span className={`w-6 h-6 rounded-lg ${level.bgActive} text-white text-xs font-black flex items-center justify-center shrink-0`}>
                                        {level.score}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-slate-800 truncate">{level.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* PHẦN 1: TRUNG TÂM ITC */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                            <h4 className="font-bold text-sm text-itc-900 uppercase flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-itc-100 text-itc-800 flex items-center justify-center text-xs font-black">1</span>
                                Đánh giá Chất lượng Phòng máy, Cơ sở vật chất & Phục vụ của Trung tâm
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                                Vui lòng chọn 1 trong 5 mức độ từ <b>1 (Rất không hài lòng)</b> đến <b>5 (Rất hài lòng)</b> cho từng tiêu chí.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {criteriaList.map((crit) => {
                                const currentScore = centerRatings[crit.id];
                                const currentLevel = LIKERT_LEVELS.find(l => l.score === currentScore);
                                return (
                                    <div key={crit.id} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                                            <div className="flex-1">
                                                <p className="font-bold text-xs text-slate-800">{crit.name}</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">{crit.desc}</p>
                                            </div>
                                            {currentLevel && (
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${currentLevel.bgActive} text-white shrink-0`}>
                                                    ✓ {currentScore} - {currentLevel.label}
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-5 gap-1.5 pt-1">
                                            {LIKERT_LEVELS.map((level) => {
                                                const isSelected = currentScore === level.score;
                                                return (
                                                    <button
                                                        key={level.score}
                                                        type="button"
                                                        onClick={() => handleQuickRating('center', crit.id, level.score)}
                                                        className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-0.5 ${
                                                            isSelected
                                                                ? `${level.bgActive} text-white shadow-xs font-bold scale-[1.02] border-transparent`
                                                                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                                        }`}
                                                        title={`${level.score}: ${level.label}`}
                                                    >
                                                        <span className="text-xs font-black">{level.score}★</span>
                                                        <span className="text-[10px] hidden sm:block truncate w-full text-center leading-tight">
                                                            {level.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* PHẦN 2: GIẢNG VIÊN 1 */}
                    {teacher1 && (
                        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-2xs space-y-4">
                            <div className="border-b border-blue-100 pb-3 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-sm text-blue-950 uppercase flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-black">2</span>
                                        Đánh giá Giảng viên: {teacher1.name}
                                    </h4>
                                    <p className="text-xs text-blue-700 mt-0.5">
                                        Vai trò: <b>{classInfo.teacherRole1 || 'Giảng viên Lý thuyết'}</b> — Tiêu chí riêng do giảng viên tự đưa ra (Đã duyệt)
                                    </p>
                                </div>
                                <span className="bg-blue-50 text-blue-800 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-blue-200">
                                    👨‍🏫 GV 1
                                </span>
                            </div>

                            <div className="space-y-4">
                                {t1Criteria.map((tc) => {
                                    const currentScore = teacher1Ratings[tc.id];
                                    const currentLevel = LIKERT_LEVELS.find(l => l.score === currentScore);
                                    return (
                                        <div key={tc.id} className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 space-y-2.5">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                                                <div className="flex-1">
                                                    <p className="font-bold text-xs text-blue-900">{tc.name}</p>
                                                    {tc.description && <p className="text-[11px] text-slate-500 mt-0.5">{tc.description}</p>}
                                                </div>
                                                {currentLevel && (
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${currentLevel.bgActive} text-white shrink-0`}>
                                                        ✓ {currentScore} - {currentLevel.label}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-5 gap-1.5 pt-1">
                                                {LIKERT_LEVELS.map((level) => {
                                                    const isSelected = currentScore === level.score;
                                                    return (
                                                        <button
                                                            key={level.score}
                                                            type="button"
                                                            onClick={() => handleQuickRating('t1', tc.id, level.score)}
                                                            className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-0.5 ${
                                                                isSelected
                                                                    ? `${level.bgActive} text-white shadow-xs font-bold scale-[1.02] border-transparent`
                                                                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                                        }`}
                                                            title={`${level.score}: ${level.label}`}
                                                        >
                                                            <span className="text-xs font-black">{level.score}★</span>
                                                            <span className="text-[10px] hidden sm:block truncate w-full text-center leading-tight">
                                                                {level.label}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* PHẦN 3: GIẢNG VIÊN 2 (NẾU CÓ) */}
                    {teacher2 && (
                        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-4">
                            <div className="border-b border-amber-100 pb-3 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-sm text-amber-950 uppercase flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-black">3</span>
                                        Đánh giá Giảng viên: {teacher2.name}
                                    </h4>
                                    <p className="text-xs text-amber-700 mt-0.5">
                                        Vai trò: <b>{classInfo.teacherRole2 || 'Giảng viên Thực hành'}</b> — Tiêu chí riêng do giảng viên tự đưa ra (Đã duyệt)
                                    </p>
                                </div>
                                <span className="bg-amber-50 text-amber-800 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-amber-200">
                                    👩‍🏫 GV 2
                                </span>
                            </div>

                            <div className="space-y-4">
                                {t2Criteria.map((tc) => {
                                    const currentScore = teacher2Ratings[tc.id];
                                    const currentLevel = LIKERT_LEVELS.find(l => l.score === currentScore);
                                    return (
                                        <div key={tc.id} className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-100 space-y-2.5">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                                                <div className="flex-1">
                                                    <p className="font-bold text-xs text-amber-900">{tc.name}</p>
                                                    {tc.description && <p className="text-[11px] text-slate-500 mt-0.5">{tc.description}</p>}
                                                </div>
                                                {currentLevel && (
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${currentLevel.bgActive} text-white shrink-0`}>
                                                        ✓ {currentScore} - {currentLevel.label}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-5 gap-1.5 pt-1">
                                                {LIKERT_LEVELS.map((level) => {
                                                    const isSelected = currentScore === level.score;
                                                    return (
                                                        <button
                                                            key={level.score}
                                                            type="button"
                                                            onClick={() => handleQuickRating('t2', tc.id, level.score)}
                                                            className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-0.5 ${
                                                                isSelected
                                                                    ? `${level.bgActive} text-white shadow-xs font-bold scale-[1.02] border-transparent`
                                                                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                                        }`}
                                                            title={`${level.score}: ${level.label}`}
                                                        >
                                                            <span className="text-xs font-black">{level.score}★</span>
                                                            <span className="text-[10px] hidden sm:block truncate w-full text-center leading-tight">
                                                                {level.label}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* PHẦN 4: Ý KIẾN ĐÓNG GÓP ẨN DANH */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                        <label className="block text-xs font-bold text-slate-800 uppercase">
                            💬 Ý kiến đóng góp ẩn danh (Khuyến khích phản ánh trung thực về phòng máy, mạng hoặc bài giảng):
                        </label>
                        <textarea
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="VD: Máy số 12 bị lag khi chạy bài lab; điều hòa phòng A24.1 nên chỉnh lạnh hơn một chút..."
                            className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-itc-500 bg-slate-50"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={!isReady}
                            className={`w-full py-3.5 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                                isReady
                                    ? 'bg-itc-800 hover:bg-itc-900 text-white cursor-pointer'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <Icons.CheckCircle className="w-4 h-4 text-emerald-400" />
                            {isReady 
                                ? 'Hoàn thành Khảo sát & Mở khóa Xem Bảng điểm' 
                                : `Vui lòng đánh giá đủ ${answeredCount}/${totalQuestions} tiêu chí để mở khóa`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
