import React, { useState, useMemo } from 'react';
import { Icons } from '../ui/Icons';
import { TeacherCriterion, Teacher } from '../../types';

interface ApproveTeacherCriteriaModalProps {
    teachers: Teacher[];
    teacherCriteria: TeacherCriterion[];
    onUpdateCriteriaStatus: (criterionId: string, newStatus: 'APPROVED' | 'REJECTED') => void;
    onUpdateTeacherAllCriteriaStatus?: (teacherId: string, newStatus: 'APPROVED' | 'REJECTED') => void;
    onApproveAllPendingCriteria?: () => void;
    onDeleteCriteria?: (criterionId: string) => void;
    onClose: () => void;
}

export const ApproveTeacherCriteriaModal = ({
    teachers,
    teacherCriteria,
    onUpdateCriteriaStatus,
    onUpdateTeacherAllCriteriaStatus,
    onApproveAllPendingCriteria,
    onDeleteCriteria,
    onClose
}: ApproveTeacherCriteriaModalProps) => {
    // ID của giảng viên đang được chọn để xem chi tiết (nếu null -> hiển thị danh sách tất cả GV)
    const [viewingTeacherId, setViewingTeacherId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');

    // Gom nhóm tiêu chí theo từng giảng viên
    const teacherDataList = useMemo(() => {
        // Chỉ lấy những GV có tiêu chí trong hệ thống hoặc tìm trong teachers
        const map = new Map<string, {
            teacher: Teacher | undefined;
            criteria: TeacherCriterion[];
            pendingCount: number;
            approvedCount: number;
            rejectedCount: number;
        }>();

        // Khởi tạo các GV có trong teacherCriteria
        teacherCriteria.forEach(tc => {
            if (!map.has(tc.teacherId)) {
                const t = teachers.find(item => item.id === tc.teacherId);
                map.set(tc.teacherId, {
                    teacher: t,
                    criteria: [],
                    pendingCount: 0,
                    approvedCount: 0,
                    rejectedCount: 0
                });
            }
            const entry = map.get(tc.teacherId)!;
            entry.criteria.push(tc);
            const status = tc.status || 'APPROVED';
            if (status === 'PENDING') entry.pendingCount++;
            else if (status === 'APPROVED') entry.approvedCount++;
            else if (status === 'REJECTED') entry.rejectedCount++;
        });

        // Chuyển map thành array
        return Array.from(map.entries()).map(([teacherId, data]) => ({
            teacherId,
            teacherName: data.teacher ? data.teacher.name : `Giảng viên (${teacherId})`,
            teacherCode: data.teacher ? data.teacher.id : teacherId,
            teacherDept: data.teacher?.dept || 'Khoa CNTT',
            teacherEmail: data.teacher?.email || '',
            criteria: data.criteria,
            pendingCount: data.pendingCount,
            approvedCount: data.approvedCount,
            rejectedCount: data.rejectedCount,
            totalCount: data.criteria.length
        }));
    }, [teachers, teacherCriteria]);

    // Thống kê tổng quan toàn hệ thống
    const totalPendingAll = useMemo(() => {
        return teacherCriteria.filter(tc => tc.status === 'PENDING').length;
    }, [teacherCriteria]);

    const totalApprovedAll = useMemo(() => {
        return teacherCriteria.filter(tc => (tc.status || 'APPROVED') === 'APPROVED').length;
    }, [teacherCriteria]);

    // Lọc danh sách GV theo tìm kiếm và trạng thái
    const filteredTeacherData = useMemo(() => {
        return teacherDataList.filter(item => {
            const matchesSearch = item.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 item.teacherCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 item.teacherDept.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            if (statusFilter === 'PENDING') return item.pendingCount > 0;
            if (statusFilter === 'APPROVED') return item.pendingCount === 0 && item.approvedCount > 0;
            return true;
        });
    }, [teacherDataList, searchTerm, statusFilter]);

    // Giảng viên đang xem chi tiết (nếu có)
    const currentViewingTeacher = useMemo(() => {
        if (!viewingTeacherId) return null;
        return teacherDataList.find(item => item.teacherId === viewingTeacherId) || null;
    }, [viewingTeacherId, teacherDataList]);

    // Xử lý duyệt tất cả tiêu chí của 1 GV
    const handleApproveTeacherAll = (teacherId: string) => {
        if (onUpdateTeacherAllCriteriaStatus) {
            onUpdateTeacherAllCriteriaStatus(teacherId, 'APPROVED');
        } else {
            // Fallback: duyệt từng cái
            const tData = teacherDataList.find(t => t.teacherId === teacherId);
            if (tData) {
                tData.criteria.forEach(c => {
                    if (c.status !== 'APPROVED') {
                        onUpdateCriteriaStatus(c.id, 'APPROVED');
                    }
                });
            }
        }
    };

    // Xử lý từ chối tất cả tiêu chí của 1 GV
    const handleRejectTeacherAll = (teacherId: string) => {
        if (confirm('Bạn có chắc chắn muốn TỪ CHỐI toàn bộ tiêu chí của giảng viên này?')) {
            if (onUpdateTeacherAllCriteriaStatus) {
                onUpdateTeacherAllCriteriaStatus(teacherId, 'REJECTED');
            } else {
                const tData = teacherDataList.find(t => t.teacherId === teacherId);
                if (tData) {
                    tData.criteria.forEach(c => {
                        if (c.status !== 'REJECTED') {
                            onUpdateCriteriaStatus(c.id, 'REJECTED');
                        }
                    });
                }
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-itc-800 to-itc-900 p-5 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400">
                            <Icons.CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Phê duyệt Tiêu chí Đánh giá của Giảng viên</h3>
                            <p className="text-xs text-itc-100">
                                {viewingTeacherId 
                                    ? `Đang xem chi tiết tiêu chí của giảng viên: ${currentViewingTeacher?.teacherName}` 
                                    : 'Danh sách các giảng viên đã đề xuất tiêu chí đánh giá cá nhân'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                    >
                        <Icons.Plus className="w-5 h-5 rotate-45" />
                    </button>
                </div>

                {/* Sub-bar / Thống kê nhanh */}
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                        <span className="text-slate-600 font-semibold">
                            👨‍🏫 Có <b className="text-itc-900 font-bold">{teacherDataList.length}</b> Giảng viên đề xuất
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-600 font-semibold">
                            📋 Tổng <b className="text-itc-900 font-bold">{teacherCriteria.length}</b> tiêu chí
                        </span>
                        {totalPendingAll > 0 && (
                            <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200 animate-pulse flex items-center gap-1">
                                ⏳ {totalPendingAll} tiêu chí chờ duyệt
                            </span>
                        )}
                        {totalPendingAll === 0 && teacherCriteria.length > 0 && (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                ✓ Đã duyệt tất cả tiêu chí
                            </span>
                        )}
                    </div>

                    {/* Nút duyệt nhanh toàn bộ tất cả GV */}
                    {!viewingTeacherId && totalPendingAll > 0 && onApproveAllPendingCriteria && (
                        <button
                            type="button"
                            onClick={onApproveAllPendingCriteria}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1.5"
                            title="Phê duyệt nhanh tất cả các tiêu chí đang chờ duyệt của toàn bộ giảng viên"
                        >
                            <Icons.CheckCircle className="w-3.5 h-3.5" /> Duyệt tất cả giảng viên ({totalPendingAll} tiêu chí)
                        </button>
                    )}
                </div>

                {/* CONTENT AREA */}
                {viewingTeacherId && currentViewingTeacher ? (
                    /* ========================================================
                       CHẾ ĐỘ XEM CHI TIẾT TIÊU CHÍ CỦA 1 GIẢNG VIÊN CỤ THỂ
                       ======================================================== */
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/60">
                        {/* Thanh điều hướng quay lại & Thao tác cho GV này */}
                        <div className="bg-white p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setViewingTeacherId(null)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 border border-slate-300 shadow-2xs"
                                >
                                    <span className="text-base leading-none">←</span> Quay lại danh sách Giảng viên
                                </button>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                        👨‍🏫 {currentViewingTeacher.teacherName}
                                        <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                            {currentViewingTeacher.teacherCode}
                                        </span>
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                        {currentViewingTeacher.teacherDept} {currentViewingTeacher.teacherEmail && `• ${currentViewingTeacher.teacherEmail}`}
                                    </p>
                                </div>
                            </div>

                            {/* Các nút hành động cho GV này */}
                            <div className="flex items-center gap-2">
                                {currentViewingTeacher.pendingCount > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => handleApproveTeacherAll(currentViewingTeacher.teacherId)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
                                    >
                                        <Icons.CheckCircle className="w-4 h-4" /> Phê duyệt tất cả ({currentViewingTeacher.totalCount} tiêu chí)
                                    </button>
                                ) : (
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                        <Icons.CheckCircle className="w-4 h-4 text-emerald-600" /> Tất cả đã được phê duyệt
                                    </span>
                                )}

                                <button
                                    type="button"
                                    onClick={() => handleRejectTeacherAll(currentViewingTeacher.teacherId)}
                                    className="bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold text-xs px-3 py-2 rounded-xl transition border border-slate-200"
                                >
                                    Từ chối tất cả
                                </button>
                            </div>
                        </div>

                        {/* Danh sách các tiêu chí chi tiết của GV này */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-3">
                            {currentViewingTeacher.criteria.map((tc, index) => {
                                const status = tc.status || 'APPROVED';
                                return (
                                    <div 
                                        key={tc.id} 
                                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-itc-300 transition space-y-3"
                                    >
                                        <div className="flex flex-wrap justify-between items-start gap-2">
                                            <div className="flex items-start gap-3">
                                                <span className="w-7 h-7 rounded-xl bg-itc-50 text-itc-800 font-bold text-xs flex items-center justify-center shrink-0 border border-itc-200 mt-0.5">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <h5 className="font-bold text-sm text-slate-800">{tc.name}</h5>
                                                    {tc.description && (
                                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                            {tc.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {status === 'APPROVED' && (
                                                    <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                                                        <Icons.CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Đã duyệt
                                                    </span>
                                                )}
                                                {status === 'PENDING' && (
                                                    <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                                                        <Icons.Loader className="w-3.5 h-3.5 text-amber-600 animate-spin" /> Chờ duyệt
                                                    </span>
                                                )}
                                                {status === 'REJECTED' && (
                                                    <span className="bg-rose-50 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1">
                                                        <Icons.AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Chưa phù hợp
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons cho từng tiêu chí */}
                                        <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-100">
                                            {status !== 'APPROVED' && (
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateCriteriaStatus(tc.id, 'APPROVED')}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-2xs flex items-center gap-1"
                                                >
                                                    <Icons.CheckCircle className="w-3.5 h-3.5" /> Phê duyệt tiêu chí
                                                </button>
                                            )}
                                            {status !== 'REJECTED' && (
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateCriteriaStatus(tc.id, 'REJECTED')}
                                                    className="bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 text-xs font-bold px-3 py-1.5 rounded-lg transition border border-slate-200"
                                                >
                                                    Từ chối
                                                </button>
                                            )}
                                            {onDeleteCriteria && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm(`Bạn có chắc chắn muốn xóa tiêu chí "${tc.name}"?`)) {
                                                            onDeleteCriteria(tc.id);
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                    title="Xóa tiêu chí này"
                                                >
                                                    <Icons.Trash className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    /* ========================================================
                       CHẾ ĐỘ XEM DANH SÁCH GIẢNG VIÊN (MẶC ĐỊNH)
                       ======================================================== */
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                        {/* Filter & Search Bar */}
                        <div className="bg-white p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex-1 min-w-[240px] relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Icons.Search className="w-4 h-4" />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên Giảng viên, Mã GV hoặc Khoa..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-itc-500 transition"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-600">Trạng thái:</span>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 px-3 py-2 focus:outline-none"
                                >
                                    <option value="ALL">Tất cả ({teacherDataList.length})</option>
                                    <option value="PENDING">Có tiêu chí chờ duyệt ({teacherDataList.filter(t => t.pendingCount > 0).length})</option>
                                    <option value="APPROVED">Đã duyệt toàn bộ ({teacherDataList.filter(t => t.pendingCount === 0 && t.approvedCount > 0).length})</option>
                                </select>
                            </div>
                        </div>

                        {/* List of Teachers */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-3">
                            {filteredTeacherData.length === 0 ? (
                                <div className="text-center py-16 text-slate-400 text-xs italic bg-white rounded-3xl border border-dashed border-slate-200 p-8">
                                    <Icons.GraduationCap className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                    <p className="font-semibold text-slate-600 text-sm">Không tìm thấy giảng viên nào phù hợp</p>
                                    <p className="text-slate-400 mt-1">Chưa có tiêu chí nào được đề xuất hoặc không khớp với bộ lọc tìm kiếm.</p>
                                </div>
                            ) : (
                                filteredTeacherData.map((item) => {
                                    const hasPending = item.pendingCount > 0;
                                    const allApproved = item.pendingCount === 0 && item.approvedCount > 0;

                                    return (
                                        <div 
                                            key={item.teacherId}
                                            className={`bg-white p-5 rounded-2xl border transition-all duration-200 shadow-2xs hover:shadow-md flex flex-wrap items-center justify-between gap-4 ${
                                                hasPending ? 'border-amber-300/80 bg-gradient-to-r from-white via-white to-amber-50/20' : 'border-slate-200'
                                            }`}
                                        >
                                            {/* Thông tin Giảng viên (Clickable) */}
                                            <div 
                                                onClick={() => setViewingTeacherId(item.teacherId)}
                                                className="flex items-center gap-4 cursor-pointer group flex-1 min-w-[280px]"
                                            >
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base transition-transform group-hover:scale-105 shadow-2xs ${
                                                    hasPending 
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                                        : 'bg-itc-50 text-itc-800 border border-itc-200'
                                                }`}>
                                                    👨‍🏫
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-sm text-slate-900 group-hover:text-itc-800 transition">
                                                            {item.teacherName}
                                                        </h4>
                                                        <span className="bg-slate-100 text-slate-600 font-bold text-[10px] px-2 py-0.5 rounded-md border border-slate-200">
                                                            {item.teacherCode}
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {item.teacherDept} {item.teacherEmail && `• ${item.teacherEmail}`}
                                                    </p>

                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                                                            📋 {item.totalCount}/10 tiêu chí
                                                        </span>

                                                        {hasPending && (
                                                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1 animate-pulse">
                                                                ⏳ {item.pendingCount} tiêu chí chờ duyệt
                                                            </span>
                                                        )}

                                                        {allApproved && (
                                                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                                                                ✓ Đã duyệt toàn bộ
                                                            </span>
                                                        )}

                                                        {item.rejectedCount > 0 && (
                                                            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                                                                ✕ {item.rejectedCount} từ chối
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Các nút hành động trực tiếp */}
                                            <div className="flex items-center gap-2">
                                                {/* Nút xem chi tiết các tiêu chí của GV này */}
                                                <button
                                                    type="button"
                                                    onClick={() => setViewingTeacherId(item.teacherId)}
                                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1 border border-slate-200"
                                                    title="Bấm vào để xem danh sách chi tiết các tiêu chí của giảng viên này"
                                                >
                                                    <Icons.Eye className="w-3.5 h-3.5 text-slate-500" /> Xem tiêu chí ({item.totalCount})
                                                </button>

                                                {/* Nút 1-click DUYỆT TẤT CẢ TIÊU CHÍ CỦA GV NÀY */}
                                                {hasPending ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleApproveTeacherAll(item.teacherId)}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 active:scale-95"
                                                        title="Phê duyệt nhanh toàn bộ tiêu chí của giảng viên này một lần"
                                                    >
                                                        <Icons.CheckCircle className="w-4 h-4" /> Duyệt tất cả ({item.totalCount})
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingTeacherId(item.teacherId)}
                                                        className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5"
                                                    >
                                                        <Icons.CheckCircle className="w-4 h-4 text-emerald-600" /> Đã duyệt xong
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
                    <p className="text-xs text-slate-400 italic">
                        * Tiêu chí sau khi được duyệt sẽ tự động cập nhật vào phiếu khảo sát học viên của giảng viên đó.
                    </p>
                    <button
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-xs"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};
