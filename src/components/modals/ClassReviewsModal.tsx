import React from 'react';
import { Icons } from '../ui/Icons';

export const ClassReviewsModal = ({ 
    classId, 
    reviews, 
    classes, 
    criteriaList, 
    teacherCriteria = [], 
    teachers = [], 
    currentUserRole = 'ADMIN',
    currentTeacherId,
    onClose 
}: any) => {
    if (!classId) return null;

    const cls = classes.find((c: any) => c.id === classId);
    if (!cls) return null;

    // Lọc ra tất cả các nhận xét của lớp này
    const classReviews = reviews.filter((r: any) => r.classId === classId);

    // Tìm giảng viên của lớp
    const teacher1 = teachers.find((t: any) => t.id === cls.teacherId);
    const teacher2 = teachers.find((t: any) => t.id === cls.teacherId2);

    const teacher1Criteria = teacherCriteria.filter((tc: any) => tc.teacherId === cls.teacherId);
    const teacher2Criteria = cls.teacherId2 ? teacherCriteria.filter((tc: any) => tc.teacherId === cls.teacherId2) : [];

    // Sắp xếp: có bình luận lên trước
    classReviews.sort((a: any, b: any) => {
        if (a.comment && !b.comment) return -1;
        if (!a.comment && b.comment) return 1;
        return 0;
    });

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-itc-800 p-4 md:p-5 text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <Icons.Comments className="w-5 h-5 text-itc-200" />
                            <h3 className="font-bold text-lg">Đánh giá Chi tiết Lớp {cls.code}</h3>
                        </div>
                        <p className="text-xs text-itc-100 mt-1">
                            Phòng: <b>{cls.room}</b> | Tổng lượt nộp bài: <b>{classReviews.length}</b> học viên
                            {teacher1 && ` • GV1: ${teacher1.name}`}
                            {teacher2 && ` • GV2: ${teacher2.name}`}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                        <Icons.Plus className="w-5 h-5 rotate-45" />
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-4">
                    {classReviews.length === 0 ? (
                        <div className="text-center text-slate-400 py-16 italic">
                            Chưa có sinh viên nào nộp bài khảo sát cho lớp này.
                        </div>
                    ) : (
                        classReviews.map((rev: any) => {
                            const hasBad = Object.values(rev.ratings || {}).some((s: any) => (s as number) <= 2);
                            const hasGood = Object.values(rev.ratings || {}).every((s: any) => (s as number) >= 4);
                            
                            let borderClass = 'border-slate-200';
                            let bgClass = 'bg-white';
                            if (hasBad) {
                                borderClass = 'border-rose-300';
                                bgClass = 'bg-rose-50/20';
                            } else if (hasGood) {
                                borderClass = 'border-emerald-300';
                                bgClass = 'bg-emerald-50/20';
                            }

                            return (
                                <div key={rev.id} className={`p-5 rounded-2xl border-l-4 ${borderClass} ${bgClass} bg-white shadow-2xs space-y-3`}>
                                    <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-xs text-slate-800">
                                                {rev.studentCode ? `Học viên: ${rev.studentCode}` : 'Học viên ẩn danh'}
                                            </span>
                                            {rev.studentName && (
                                                <span className="text-xs text-slate-500 font-medium">({rev.studentName})</span>
                                            )}
                                            <span className="text-xs text-slate-400">• {rev.createdAt}</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            {hasBad && <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Có phàn nàn</span>}
                                            {hasGood && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Hài lòng cao</span>}
                                            {rev.isEscalated && <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Báo cáo Admin</span>}
                                        </div>
                                    </div>
                                    
                                    {/* 1. Điểm đánh giá Trung tâm */}
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                            1. Đánh giá Trung tâm & Môn học:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {criteriaList.map((crit: any) => {
                                                const sc = rev.ratings?.[crit.id];
                                                if (sc === undefined) return null;
                                                const isBad = sc <= 2;
                                                return (
                                                    <span key={crit.id} className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${isBad ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 text-slate-700'}`}>
                                                        {crit.name}: <b>{sc}★</b>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 2. Quyền riêng tư sư phạm: Chỉ Giảng viên mới được xem đánh giá của mình */}
                                    {currentUserRole === 'ADMIN' ? (
                                        <div className="bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                                            <Icons.Lock className="w-4 h-4 text-slate-400 shrink-0" />
                                            <span>
                                                <b>Bảo mật sư phạm:</b> Theo quy định, Trung tâm ITC chỉ xem xét đánh giá chất lượng khóa học chung. Điểm tiêu chí cá nhân do Giảng viên tự đưa ra chỉ hiển thị riêng cho Giảng viên đó.
                                            </span>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Giảng viên 1 xem tiêu chí của mình */}
                                            {teacher1 && teacher1.id === currentTeacherId && rev.teacherRatings?.[teacher1.id] && (
                                                <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                                                    <span className="text-[10px] font-bold text-itc-900 uppercase tracking-wider block mb-1">
                                                        2. Đánh giá tiêu chí cá nhân của bạn ({teacher1.name}):
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {Object.entries(rev.teacherRatings[teacher1.id]).map(([critId, score]) => {
                                                            const tc = teacher1Criteria.find((c: any) => c.id === critId);
                                                            return (
                                                                <span key={critId} className="text-[10px] bg-white text-blue-900 px-2 py-0.5 rounded border border-blue-200">
                                                                    {tc?.name || critId}: <b>{score as number}★</b>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Giảng viên 2 xem tiêu chí của mình */}
                                            {teacher2 && teacher2.id === currentTeacherId && rev.teacherRatings?.[teacher2.id] && (
                                                <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-200">
                                                    <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
                                                        2. Đánh giá tiêu chí cá nhân của bạn ({teacher2.name}):
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {Object.entries(rev.teacherRatings[teacher2.id]).map(([critId, score]) => {
                                                            const tc = teacher2Criteria.find((c: any) => c.id === critId);
                                                            return (
                                                                <span key={critId} className="text-[10px] bg-white text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                                                                    {tc?.name || critId}: <b>{score as number}★</b>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Bình luận */}
                                    {rev.comment ? (
                                        <div className="text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="font-bold text-[10px] uppercase text-slate-500 block mb-1">Góp ý học viên:</span>
                                            "{rev.comment}"
                                        </div>
                                    ) : (
                                        <div className="text-[11px] text-slate-400 italic">
                                            (Không để lại góp ý văn bản)
                                        </div>
                                    )}

                                    {/* Ghi chú phản hồi của giảng viên */}
                                    {(rev.teacherNotes || rev.teacherNote) && (
                                        <div className="space-y-1 pt-1">
                                            {rev.teacherNotes && Object.entries(rev.teacherNotes).map(([tId, note]) => {
                                                const tch = teachers.find((t: any) => t.id === tId);
                                                return (
                                                    <div key={tId} className="text-xs text-itc-blue-700 bg-blue-50/80 p-2 rounded-lg border border-blue-100 flex items-start gap-1.5">
                                                        <span className="font-bold shrink-0">👨‍🏫 {tch?.name || 'Giảng viên'}:</span>
                                                        <span className="italic">{note as string}</span>
                                                    </div>
                                                );
                                            })}
                                            {!rev.teacherNotes && rev.teacherNote && (
                                                <div className="text-xs text-itc-blue-700 bg-blue-50/80 p-2 rounded-lg border border-blue-100 flex items-start gap-1.5">
                                                    <span className="font-bold shrink-0">👨‍🏫 Giảng viên:</span>
                                                    <span className="italic">{rev.teacherNote}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2 rounded-xl transition"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};
