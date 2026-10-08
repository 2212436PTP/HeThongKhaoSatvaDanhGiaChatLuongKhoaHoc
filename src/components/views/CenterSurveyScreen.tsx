import React, { useState, useEffect } from 'react';
import { Icons } from '../ui/Icons';
import { getDeviceFingerprint, checkDeviceSubmissionStatus, recordDeviceSubmission } from '../../lib/deviceFingerprint';
import { CriteriaCategory, LIKERT_LEVELS } from '../../types';
import { getDisplayStudentCode } from '../../lib/scheduleConflict';

interface CenterSurveyScreenProps {
    student: { id: string; name: string; email?: string };
    criteriaList: CriteriaCategory[];
    onSubmitSuccess: (surveyData: any) => void;
}

export const CenterSurveyScreen = ({
    student,
    criteriaList = [],
    onSubmitSuccess
}: CenterSurveyScreenProps) => {
    const [centerRatings, setCenterRatings] = useState<Record<string, number>>({});
    const [comment, setComment] = useState('');
    const [deviceError, setDeviceError] = useState('');
    const [deviceId, setDeviceId] = useState('');

    useEffect(() => {
        const fp = getDeviceFingerprint();
        setDeviceId(fp);

        const check = checkDeviceSubmissionStatus('center_survey', student.id);
        if (!check.allowed) {
            setDeviceError(check.reason || 'Thiết bị này đã được sử dụng bởi sinh viên khác để nộp khảo sát Trung tâm!');
        }
    }, [student.id]);

    const handleRatingChange = (criterionId: string, score: number) => {
        setCenterRatings(prev => ({ ...prev, [criterionId]: score }));
    };

    const handleQuickFill = () => {
        const autoC: Record<string, number> = {};
        criteriaList.forEach(c => { autoC[c.id] = 5; });
        setCenterRatings(autoC);
        setComment('Cơ sở vật chất phòng máy rất tốt, máy lạnh thoáng mát, đường truyền mạng ổn định và nhân viên hỗ trợ chu đáo!');
    };

    const totalQuestions = criteriaList.length;
    const answeredCount = Object.keys(centerRatings).length;
    const isCompleted = answeredCount === totalQuestions && !deviceError;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const check = checkDeviceSubmissionStatus('center_survey', student.id);
        if (!check.allowed) {
            setDeviceError(check.reason || 'Thiết bị này đã được sử dụng!');
            return;
        }

        if (!isCompleted) {
            alert(`Vui lòng hoàn thành toàn bộ ${totalQuestions} tiêu chí đánh giá chất lượng Trung tâm.`);
            return;
        }

        recordDeviceSubmission('center_survey', student.id, student.name);

        const payload = {
            id: 'rev_center_' + Date.now(),
            classId: 'center_general',
            classCode: 'ITC_CENTER',
            studentCode: student.id,
            studentName: student.name,
            isCenterSurvey: true,
            type: 'CENTER',
            ratings: centerRatings,
            comment: comment.trim(),
            status: 'OPEN',
            deviceId,
            timestamp: new Date().toISOString()
        };

        onSubmitSuccess(payload);
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 lg:p-6 animate-in fade-in duration-300">
            <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden space-y-0">
                {/* Header */}
                <div className="bg-itc-900 p-6 text-white text-center space-y-2 relative">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-inner">
                        🛡️
                    </div>
                    <span className="bg-amber-400 text-amber-950 font-black text-[10px] tracking-wider uppercase px-3 py-0.5 rounded-full inline-block">
                        YÊU CẦU BẮT BUỘC TỪ TRUNG TÂM ITC
                    </span>
                    <h2 className="text-xl lg:text-2xl font-black uppercase tracking-tight">
                        Phiếu Khảo sát Đánh giá Chất lượng Trung tâm
                    </h2>
                    <p className="text-xs text-itc-100 max-w-xl mx-auto leading-relaxed">
                        Chào bạn <b>{student.name}</b> (MSSV: <b>{getDisplayStudentCode(student)}</b>). Trung tâm Công nghệ Thông tin - ĐH Đà Lạt đang thu thập ý kiến đánh giá về Cơ sở vật chất, Phòng máy, Mạng Internet và Chất lượng phục vụ.
                    </p>
                </div>

                {/* Blocking notice */}
                <div className="bg-amber-50 border-b border-amber-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold">
                        <Icons.Lock className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Hệ thống tạm khóa các chức năng khác cho đến khi bạn hoàn tất phiếu khảo sát này.</span>
                    </div>

                    <button
                        type="button"
                        onClick={handleQuickFill}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1 ml-auto"
                    >
                        <span>⚡</span> Đánh giá nhanh (Rất hài lòng)
                    </button>
                </div>

                {/* Progress bar */}
                <div className="bg-slate-50 px-6 py-2 border-b border-slate-200 flex justify-between items-center text-xs font-semibold text-slate-600">
                    <span>Tiến độ đánh giá:</span>
                    <span className="font-bold text-itc-800">
                        {answeredCount} / {totalQuestions} Tiêu chí ({Math.round((answeredCount / (totalQuestions || 1)) * 100)}%)
                    </span>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {deviceError && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-800 font-medium">
                            <span className="text-lg">🚫</span>
                            <div>
                                <p className="font-bold text-sm">Cảnh báo bảo mật thiết bị:</p>
                                <p className="mt-0.5">{deviceError}</p>
                            </div>
                        </div>
                    )}

                    {/* Criteria List */}
                    <div className="space-y-4">
                        {criteriaList.map((crit, idx) => (
                            <div key={crit.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-itc-400 transition space-y-3">
                                <div>
                                    <h4 className="font-bold text-xs lg:text-sm text-slate-800">
                                        {idx + 1}. {crit.name}
                                    </h4>
                                    {crit.desc && (
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            {crit.desc}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                                    {LIKERT_LEVELS.map(lvl => (
                                        <button
                                            key={lvl.score}
                                            type="button"
                                            onClick={() => handleRatingChange(crit.id, lvl.score)}
                                            className={`py-2 px-1 rounded-xl text-center flex flex-col items-center gap-1 border transition text-xs ${
                                                centerRatings[crit.id] === lvl.score
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

                    {/* Comment */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase">
                            Ý kiến đóng góp phát triển Trung tâm ITC (Tùy chọn):
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Nhập góp ý về máy tính, điều hòa, phòng học, dịch vụ hỗ trợ của trung tâm..."
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:outline-none focus:border-itc-600 transition"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                            <Icons.Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Mỗi học viên chỉ được gửi khảo sát 1 lần duy nhất trên 1 thiết bị.</span>
                        </div>

                        <button
                            type="submit"
                            disabled={!isCompleted}
                            className={`w-full sm:w-auto px-8 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg ${
                                isCompleted
                                    ? 'bg-itc-800 hover:bg-itc-900 text-white transform hover:scale-105 cursor-pointer'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <Icons.CheckCircle className="w-4 h-4 text-emerald-400" />
                            Hoàn Tất Khảo Sát & Mở Khóa Giao Diện
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
