import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { ClassReviewsModal } from '../modals/ClassReviewsModal';
import { CreateClassModal } from '../modals/CreateClassModal';
import { ShareQRModal } from '../modals/ShareQRModal';
import { CreateTeacherModal } from '../modals/CreateTeacherModal';
import { CreateStudentModal } from '../modals/CreateStudentModal';
import { CreateCourseModal } from '../modals/CreateCourseModal';
import { ManageCriteriaModal } from '../modals/ManageCriteriaModal';
import { AttendanceModal } from '../modals/AttendanceModal';
import { ApproveTeacherCriteriaModal } from '../modals/ApproveTeacherCriteriaModal';
import { ImportDataModal } from '../modals/ImportDataModal';
import { getDisplayStudentCode } from '../../lib/scheduleConflict';

export const AdminView = ({ 
    classes, 
    courses = [], 
    onAddCourse,
    onDeleteCourse,
    teachers, 
    students = [],
    onAddStudent,
    onDeleteStudent,
    onImportTeachers,
    onImportStudents,
    reviews, 
    criteriaList, 
    teacherCriteria = [],
    onUpdateTeacherCriteriaStatus,
    roomBookings = [],
    onUpdateRoomBookingStatus,
    attendances = [],
    enrollments = [],
    stats, 
    warningThreshold, 
    setWarningThreshold, 
    onUpdateAction, 
    onAddClass, 
    onToggleClassStatus, 
    onDeleteClass, 
    onRefreshData, 
    onDeleteTeacher,
    isCenterSurveyActive = true,
    onToggleCenterSurveyActive,
    onSaveCriteriaList,
    onDeleteTeacherCriteria,
    onUpdateTeacherAllCriteriaStatus,
    onApproveAllPendingCriteria,
    unenrollRequests = [],
    onApproveUnenroll,
    onRejectUnenroll
}: any) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [courseSearchTerm, setCourseSearchTerm] = useState('');
    const [showActionModal, setShowActionModal] = useState<any>(null);
    const [viewingClassReviewsId, setViewingClassReviewsId] = useState<string | null>(null);
    const [viewingAttendanceClass, setViewingAttendanceClass] = useState<any>(null);
    const [showCreateClassModal, setShowCreateClassModal] = useState(false);
    const [showCreateTeacherModal, setShowCreateTeacherModal] = useState(false);
    const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);
    const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
    const [showCriteriaModal, setShowCriteriaModal] = useState(false);
    const [showApproveCriteriaModal, setShowApproveCriteriaModal] = useState(false);
    const [importModalType, setImportModalType] = useState<'TEACHER' | 'STUDENT' | null>(null);
    const [sharingClass, setSharingClass] = useState<any>(null);
    const [centerSurveyFilter, setCenterSurveyFilter] = useState<'ALL' | 'DONE' | 'NOT_DONE'>('ALL');
    const [centerSurveySearch, setCenterSurveySearch] = useState('');
    const [viewingCenterSurveyModal, setViewingCenterSurveyModal] = useState<any>(null);
    const [expandedStudentClasses, setExpandedStudentClasses] = useState<Record<string, boolean>>({});

    const pendingUnenrollCount = (unenrollRequests || []).filter((r: any) => r.status === 'PENDING').length;
    const [classSubTab, setClassSubTab] = useState<'classes' | 'room_bookings'>('classes');
    const [roomBookingFilter, setRoomBookingFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
    const [roomBookingSearch, setRoomBookingSearch] = useState('');

    const pendingBookingsCount = (roomBookings || []).filter((b: any) => b.status === 'PENDING').length;
    const approvedBookingsCount = (roomBookings || []).filter((b: any) => b.status === 'APPROVED').length;
    const rejectedBookingsCount = (roomBookings || []).filter((b: any) => b.status === 'REJECTED').length;

    const filteredRoomBookings = (roomBookings || []).filter((b: any) => {
        if (roomBookingFilter !== 'ALL' && b.status !== roomBookingFilter) return false;
        if (roomBookingSearch) {
            const q = roomBookingSearch.toLowerCase();
            const tName = (b.teacherName || '').toLowerCase();
            const rName = (b.room || b.roomId || b.roomName || '').toLowerCase();
            const cName = (b.courseName || b.courseId || '').toLowerCase();
            const pDesc = (b.purpose || '').toLowerCase();
            if (!tName.includes(q) && !rName.includes(q) && !cName.includes(q) && !pDesc.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const centerSurveyCompletedStudents = (students || []).filter((st: any) => 
        (reviews || []).some((r: any) => 
            (r.studentCode === st.id || r.studentCode === st.code) && 
            (r.isCenterSurvey || r.type === 'CENTER')
        )
    );

    const centerSurveyPendingStudents = (students || []).filter((st: any) => 
        !(reviews || []).some((r: any) => 
            (r.studentCode === st.id || r.studentCode === st.code) && 
            (r.isCenterSurvey || r.type === 'CENTER')
        )
    );

    const displayedCenterSurveyStudents = (students || []).filter((st: any) => {
        const isDone = (reviews || []).some((r: any) => 
            (r.studentCode === st.id || r.studentCode === st.code) && 
            (r.isCenterSurvey || r.type === 'CENTER')
        );
        if (centerSurveyFilter === 'DONE' && !isDone) return false;
        if (centerSurveyFilter === 'NOT_DONE' && isDone) return false;
        if (centerSurveySearch) {
            const query = centerSurveySearch.toLowerCase();
            return (st.name || '').toLowerCase().includes(query) ||
                (st.code || st.id || '').toLowerCase().includes(query) ||
                (st.email || '').toLowerCase().includes(query);
        }
        return true;
    });

    const filteredBadReviews = reviews.filter((r: any) => {
        // Chỉ nhận những ý kiến phàn nàn từ <= 3 sao hoặc Giảng viên báo cáo khẩn cấp
        const ratingVals: number[] = Object.values(r.ratings || {}).map((s: any) => Number(s)).filter((s: number) => !isNaN(s) && s > 0);
        const avgScore = ratingVals.length > 0 ? (ratingVals.reduce((a, b) => a + b, 0) / ratingVals.length) : 5;
        const hasLowScore = ratingVals.some((s: number) => s <= 3) || avgScore <= 3.0;

        // Chỉ đưa vào giao diện Xử lý Phàn nàn nếu <= 3 sao hoặc Giảng viên báo cáo khẩn cấp
        if (!hasLowScore && !r.isEscalated) return false;
        
        if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
        if (searchTerm && !r.comment?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const escalatedReviews = reviews.filter((r: any) => r.isEscalated && r.status !== 'RESOLVED');

    const handleLocalUpdateAction = (reviewId: string, newStatus: string, newNote: string) => {
        onUpdateAction(reviewId, newStatus, newNote);
        setShowActionModal(null);
    };

    return (
        <div className="flex-1 bg-slate-50 p-4 lg:p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    {['overview', 'reviews', 'center_surveys', 'unenroll_requests', 'classes', 'teachers', 'students', 'courses'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${activeTab === tab ? 'bg-itc-800 text-white shadow-soft scale-105' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                        >
                            {tab === 'overview' && 'Bảng điều khiển'}
                            {tab === 'reviews' && 'Xử lý Phàn nàn'}
                            {tab === 'center_surveys' && `Khảo sát Trung tâm (${centerSurveyCompletedStudents.length}/${students.length})`}
                            {tab === 'unenroll_requests' && (
                                <span className="flex items-center gap-1.5">
                                    Duyệt Hủy Môn
                                    {pendingUnenrollCount > 0 && (
                                        <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                                            {pendingUnenrollCount}
                                        </span>
                                    )}
                                </span>
                            )}
                            {tab === 'classes' && (
                                <span className="flex items-center gap-1.5">
                                    Quản lý Lớp học
                                    {pendingBookingsCount > 0 && (
                                        <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse shadow-xs">
                                            {pendingBookingsCount}
                                        </span>
                                    )}
                                </span>
                            )}
                            {tab === 'teachers' && 'Quản lý Giảng viên'}
                            {tab === 'students' && 'Quản lý Sinh viên'}
                            {tab === 'courses' && 'Quản lý Môn học & Chứng chỉ'}
                        </button>
                    ))}
                </div>

                {/* TAB 1: BẢNG ĐIỀU KHIỂN */}
                {activeTab === 'overview' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="soft-card p-5 rounded-2xl border-l-4 border-l-sky-500">
                                <p className="text-[11px] text-slate-500 font-semibold mb-1">Tổng lượt Khảo sát</p>
                                <p className="text-2xl font-black text-slate-800">{stats.totalSubmissions}</p>
                            </div>
                            <div className="soft-card p-5 rounded-2xl border-l-4 border-l-emerald-500">
                                <p className="text-[11px] text-slate-500 font-semibold mb-1">Mức độ Hài lòng chung</p>
                                <p className="text-2xl font-black text-emerald-600">{stats.centerAvgSatisfaction} <span className="text-sm">★</span></p>
                            </div>
                            <div className="soft-card p-5 rounded-2xl border-l-4 border-l-amber-500">
                                <p className="text-[11px] text-slate-500 font-semibold mb-1">Cảnh báo Tiêu chí thấp</p>
                                <p className="text-2xl font-black text-amber-600">{stats.alertList.length} <span className="text-sm font-medium text-slate-400">cảnh báo</span></p>
                            </div>
                            <div className="soft-card p-5 rounded-2xl border-l-4 border-l-rose-500 flex flex-col justify-center">
                                <p className="text-[10px] text-slate-500 font-bold mb-1">NGƯỠNG CẢNH BÁO BẢO TRÌ:</p>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-rose-600">{warningThreshold} Sao</span>
                                    <input 
                                        type="range" 
                                        min="2.0" 
                                        max="4.0" 
                                        step="0.1" 
                                        value={warningThreshold} 
                                        onChange={(e) => setWarningThreshold(parseFloat(e.target.value))}
                                        className="w-32 accent-itc-800 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* BẢNG ĐIỀU KHIỂN ĐỢT KHẢO SÁT CHẤT LƯỢNG TRUNG TÂM */}
                        <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 ${isCenterSurveyActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                                    🛡️
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-extrabold text-sm text-slate-900">
                                            Đợt Khảo sát Đánh giá Chất lượng Trung tâm ITC
                                        </h3>
                                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                            isCenterSurveyActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600 border border-slate-300'
                                        }`}>
                                            {isCenterSurveyActive ? '🟢 ĐANG MỞ (BẮT BUỘC SV)' : '⚪ TẠM DỪNG'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                                        {isCenterSurveyActive 
                                            ? 'Khi đang Mở: Tất cả Sinh viên khi đăng nhập vào hệ thống bắt buộc phải làm phiếu khảo sát Trung tâm mới được thao tác các chức năng còn lại.' 
                                            : 'Khi Tạm dừng: Sinh viên có thể vào thẳng giao diện mà không bị chặn bởi khảo sát Trung tâm.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={onToggleCenterSurveyActive}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                                        isCenterSurveyActive 
                                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' 
                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    }`}
                                >
                                    {isCenterSurveyActive ? '⏸️ Tạm Dừng Khảo Sát' : '🚀 Mở Khảo Sát Bắt Buộc'}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-3 mb-6">
                            <button 
                                onClick={() => setShowApproveCriteriaModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                            >
                                <Icons.CheckCircle className="w-4 h-4 text-emerald-200" /> Duyệt Tiêu chí GV đề xuất ({teacherCriteria.filter((tc: any) => tc.status === 'PENDING').length})
                            </button>

                            <button 
                                onClick={() => setShowCriteriaModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                            >
                                <Icons.CheckCircle className="w-4 h-4 text-sky-400" /> Quản lý Tiêu chí Khảo sát Trung tâm
                            </button>
                        </div>

                        {/* YÊU CẦU ĐĂNG KÝ PHÒNG DẠY HỌC TỪ GIẢNG VIÊN */}
                        {roomBookings.filter((b: any) => b.status === 'PENDING').length > 0 && (
                            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 shadow-xs space-y-4 mb-6">
                                <div className="flex justify-between items-center border-b border-sky-200 pb-3">
                                    <div className="flex items-center space-x-2.5">
                                        <span className="p-1.5 bg-sky-100 text-sky-800 rounded-lg text-lg">🖥️</span>
                                        <div>
                                            <h3 className="font-bold text-sm text-sky-950">YÊU CẦU ĐĂNG KÝ PHÒNG DẠY HỌC TỪ GIẢNG VIÊN</h3>
                                            <p className="text-xs text-sky-700">Các yêu cầu mượn phòng máy / dạy bù cần Admin phê duyệt xếp phòng.</p>
                                        </div>
                                    </div>
                                    <span className="bg-sky-200 text-sky-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                        {roomBookings.filter((b: any) => b.status === 'PENDING').length} Yêu cầu mới
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {roomBookings.filter((b: any) => b.status === 'PENDING').map((b: any) => (
                                        <div key={b.id} className="bg-white p-4 rounded-xl border border-sky-200 shadow-2xs space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-bold text-itc-900 text-xs">👨‍🏫 {b.teacherName}</span>
                                                    <h4 className="font-bold text-sm text-sky-950">{b.room}</h4>
                                                </div>
                                                <span className="text-[10px] text-slate-400">{b.createdAt}</span>
                                            </div>
                                            <p className="text-xs text-slate-600">
                                                Khóa: <b>{b.courseName}</b> | Ngày: <b>{b.date}</b> ({b.timeSlot})
                                            </p>
                                            <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                                                Mục đích: {b.purpose} (Cần {b.computersNeeded} máy)
                                            </p>
                                            <div className="flex justify-end gap-2 pt-1">
                                                <button
                                                    onClick={() => onUpdateRoomBookingStatus && onUpdateRoomBookingStatus(b.id, 'REJECTED')}
                                                    className="text-xs text-slate-600 hover:text-rose-600 px-3 py-1 rounded-lg border border-slate-200"
                                                >
                                                    Từ chối
                                                </button>
                                                <button
                                                    onClick={() => onUpdateRoomBookingStatus && onUpdateRoomBookingStatus(b.id, 'APPROVED')}
                                                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg shadow-2xs"
                                                >
                                                    ✓ Duyệt cấp phòng
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* BANNER BÁO CÁO KHẨN CẤP TỪ GIẢNG VIÊN */}
                        {escalatedReviews.length > 0 ? (
                            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-xs space-y-4 mb-6">
                                <div className="flex justify-between items-center border-b border-amber-200/80 pb-3">
                                    <div className="flex items-center space-x-2.5">
                                        <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Icons.AlertTriangle className="w-4 h-4" /></div>
                                        <div>
                                            <h3 className="font-bold text-sm text-amber-900">YÊU CẦU HỖ TRỢ TỪ GIẢNG VIÊN</h3>
                                            <p className="text-xs text-amber-700/90">Các vấn đề nghiêm trọng được giảng viên báo cáo lên Admin.</p>
                                        </div>
                                    </div>
                                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200 animate-pulse">
                                        {escalatedReviews.length} Yêu cầu
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {escalatedReviews.map((item: any) => {
                                        const cls = classes.find((c: any) => c.id === item.classId);
                                        return (
                                            <div key={item.id} className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-1.5">
                                                        <span className="font-bold text-itc-900 text-xs">{cls ? cls.code : 'N/A'} - {cls ? cls.room : ''}</span>
                                                        <button onClick={() => setActiveTab('reviews')} className="text-[10px] text-itc-600 hover:underline">Xử lý ngay</button>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded">
                                                        "{item.comment}"
                                                    </p>
                                                    {item.teacherNote && (
                                                        <p className="text-[11px] text-itc-blue-700 mt-2 font-medium">
                                                            👨‍🏫 GV: {item.teacherNote}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : null}

                        {/* ALERT HIGHLIGHT BANNER */}
                        {stats.alertList.length > 0 ? (
                            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-5 shadow-xs space-y-4 mb-6">
                                <div className="flex justify-between items-center border-b border-rose-200/80 pb-3">
                                    <div className="flex items-center space-x-2.5">
                                        <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg"><Icons.AlertTriangle className="w-4 h-4" /></div>
                                        <div>
                                            <h3 className="font-bold text-sm text-rose-900">DANH SÁCH TIÊU CHÍ DƯỚI NGƯỠNG BẢO TRÌ (&lt; {warningThreshold}★)</h3>
                                            <p className="text-xs text-rose-700/90">Các vấn đề cơ sở vật chất phòng máy/giáo trình cần Ban Quản lý ITC DLU xử lý.</p>
                                        </div>
                                    </div>
                                    <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
                                        {stats.alertList.length} Cảnh báo
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {Object.values(
                                        stats.alertList.reduce((acc: any, item: any) => {
                                            if (!acc[item.room]) {
                                                acc[item.room] = { 
                                                    room: item.room, 
                                                    classes: new Set([item.classCode]), 
                                                    issues: [] 
                                                };
                                            } else {
                                                acc[item.room].classes.add(item.classCode);
                                            }
                                            acc[item.room].issues.push({ critName: item.critName, score: item.score });
                                            return acc;
                                        }, {})
                                    ).map((group: any) => (
                                        <div key={group.room} className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-bold text-itc-900 text-sm">Phòng {group.room}</span>
                                                    <span className="bg-rose-50 text-rose-700 font-extrabold text-[10px] uppercase px-2 py-0.5 rounded border border-rose-200">
                                                        {group.issues.length} Vấn đề
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mb-3">Lớp bị ảnh hưởng: <b>{Array.from(group.classes).join(', ')}</b></p>
                                                
                                                <div className="space-y-1.5 mb-2">
                                                    {group.issues.map((issue: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center text-xs bg-rose-50/60 p-1.5 rounded-lg border border-rose-100/50">
                                                            <span className="font-semibold text-rose-700">{issue.critName}</span>
                                                            <span className="font-bold text-rose-600 bg-white px-1.5 py-0.5 rounded shadow-2xs">{issue.score} ★</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end items-center text-[11px]">
                                                <button 
                                                    onClick={() => setActiveTab('reviews')}
                                                    className="text-itc-800 hover:text-itc-900 font-bold flex items-center gap-1 group"
                                                >
                                                    Xem nhận xét <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 mb-6">
                                <Icons.CheckCircle className="w-5 h-5 text-emerald-600" />
                                <span className="text-xs font-semibold">Tất cả các tiêu chí đánh giá phòng thực hành ITC DLU hiện đều đạt tiêu chuẩn (trên {warningThreshold} sao).</span>
                            </div>
                        )}

                        {/* Detailed Class Performance Table */}
                        <div className="mb-6 flex flex-col gap-5">
                            <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50 flex justify-between items-center shadow-xs">
                                <h3 className="font-bold text-itc-900 text-xs uppercase tracking-wider">Thống kê điểm chất lượng từng lớp học tại ITC DLU</h3>
                                <span className="text-[11px] text-slate-500 font-medium bg-white px-2 py-1 rounded-md border border-slate-200">Hệ thống DLU khảo sát</span>
                            </div>

                            <div className="flex flex-col gap-6">
                                {Object.values(stats.classMetrics).map((cm: any) => (
                                    <div key={cm.classInfo.id} className="bg-white rounded-2xl border-[3px] border-slate-100 shadow-md p-5 sm:p-6 hover:border-itc-400 hover:shadow-lg transition-all relative">
                                        {/* Thêm thanh màu đánh dấu bên trái cho đẹp */}
                                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-itc-500 rounded-l-xl"></div>
                                        <div className="pl-3 flex flex-wrap justify-between items-start gap-4 mb-5">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-900 text-sm">{cm.classInfo.code} - {cm.courseName}</h4>
                                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-itc-50 text-itc-800 border border-itc-200">{cm.classInfo.room}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Giảng viên: <b>{cm.teacherName}</b> {cm.teacherName2 ? <span> & <b>{cm.teacherName2}</b></span> : ''} | Lịch học: {cm.classInfo.schedule} | Đã nộp: <b>{cm.count}</b>/<b>{cm.classInfo.studentsCount} HV</b>
                                                </p>
                                                
                                                <div className="mt-3 flex items-center gap-3 flex-wrap">
                                                    <button 
                                                        onClick={() => setViewingAttendanceClass(cm.classInfo)}
                                                        className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1 border border-emerald-200 px-2.5 py-1 rounded-md transition"
                                                    >
                                                        <Icons.CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Sổ Điểm danh ({attendances.filter((a: any) => a.classId === cm.classInfo.id).length}/{cm.classInfo.studentsCount})
                                                    </button>
                                                    <button 
                                                        onClick={() => setViewingClassReviewsId(cm.classInfo.id)}
                                                        className="text-xs font-semibold text-itc-600 hover:text-itc-800 underline decoration-itc-300 underline-offset-2 flex items-center gap-1"
                                                    >
                                                        <Icons.Comments className="w-3.5 h-3.5" /> Xem tất cả {cm.count} nhận xét &rarr;
                                                    </button>
                                                    <button 
                                                        onClick={() => setSharingClass({ id: cm.classInfo.id, code: cm.classInfo.code, name: cm.courseName || '' })}
                                                        className="text-xs font-semibold text-slate-500 hover:text-itc-800 flex items-center gap-1 border border-slate-200 px-2 py-1 rounded-md"
                                                    >
                                                        <Icons.FileText className="w-3.5 h-3.5" /> Mã QR
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xl font-bold text-itc-800">{cm.overallAvg}</span>
                                                <span className="text-xs text-amber-500 font-semibold ml-1">★ / 5.0</span>
                                            </div>
                                        </div>

                                        <div className="bg-itc-50/50 rounded-xl p-3 border border-itc-100 mb-4">
                                            <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Nhận xét / Góp ý mới nhất:</h5>
                                            {cm.badComments && cm.badComments.length > 0 ? (
                                                <p className="text-xs text-slate-700 italic">"{cm.badComments[0].comment}"</p>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">Chưa có nhận xét nào.</p>
                                            )}
                                        </div>

                                        {cm.count > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {criteriaList.map((crit: any) => {
                                                    const score = cm.criteriaAvgs[crit.id];
                                                    const isAlert = score < warningThreshold;
                                                    return (
                                                        <div key={crit.id} className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="font-medium text-slate-700 text-[11px]">{crit.name}</span>
                                                                <span className={`font-bold ${isAlert ? 'text-rose-600' : 'text-slate-800'}`}>{score} ★</span>
                                                            </div>
                                                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                                <div 
                                                                    className={`h-1.5 rounded-full transition-all duration-500 ${isAlert ? 'bg-rose-500' : 'bg-itc-800'}`} 
                                                                    style={{ width: `${(score/5)*100}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs font-medium">
                                                Lớp chưa có học viên nào nộp bài khảo sát.
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {Object.values(stats.classMetrics).length === 0 && (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-xs shadow-2xs">
                                        Chưa có lớp học nào trong hệ thống. Hãy sang tab <b>"Quản lý Lớp học"</b> để tạo lớp đào tạo mới.
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* TAB 2: XỬ LÝ PHÀN NÀN */}
                {activeTab === 'reviews' && (
                    <div className="space-y-4">
                        <div className="soft-card p-4 rounded-2xl flex flex-wrap justify-between items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-600">Lọc theo trạng thái:</span>
                                <select 
                                    value={filterStatus} 
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="border border-slate-200 rounded-lg text-xs p-1.5 font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-itc-600"
                                >
                                    <option value="ALL">Tất cả nhận xét</option>
                                    <option value="OPEN">Chờ tiếp nhận xử lý</option>
                                    <option value="IN_PROGRESS">Đang kiểm tra / bảo trì</option>
                                    <option value="RESOLVED">Đã khắc phục hoàn tất</option>
                                </select>
                            </div>

                            <div className="relative w-full sm:w-64">
                                <input 
                                    type="text" 
                                    placeholder="Tìm nội dung phàn nàn..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-itc-600"
                                />
                                <span className="absolute left-2.5 top-2 text-slate-400"><Icons.Search /></span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {filteredBadReviews.length > 0 ? (
                                filteredBadReviews.map((rev: any) => {
                                    const cls = classes.find((c: any) => c.id === rev.classId);
                                    return (
                                        <div key={rev.id} className="soft-card p-5 rounded-2xl space-y-3 border-l-4 border-l-itc-800">
                                            <div className="flex flex-wrap justify-between items-start gap-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-bold text-itc-900 text-xs">{cls ? cls.code : 'Lớp đã đóng'}</span>
                                                    <span className="text-xs text-slate-400">• {rev.createdAt}</span>
                                                    {rev.isEscalated && (
                                                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-red-200 shadow-xs animate-pulse">
                                                            <Icons.AlertTriangle className="w-3 h-3" /> GV BÁO CÁO
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    {rev.status === 'OPEN' && <span className="bg-rose-50 text-rose-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-rose-200">Mới phàn nàn</span>}
                                                    {rev.status === 'IN_PROGRESS' && <span className="bg-amber-50 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">Đang kiểm tra</span>}
                                                    {rev.status === 'RESOLVED' && <span className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">Đã khắc phục</span>}
                                                </div>
                                            </div>

                                            <p className="text-xs font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                "{rev.comment}"
                                            </p>

                                            {rev.teacherNote && (
                                                <div className="text-xs text-itc-blue-700 bg-blue-50 p-2.5 rounded-xl border border-blue-100 italic">
                                                    <b>👨‍🏫 Giảng viên ghi chú:</b> {rev.teacherNote}
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-1.5">
                                                {criteriaList.map((crit: any) => {
                                                    const sc = rev.ratings?.[crit.id];
                                                    if (sc === undefined) return null;
                                                    const isBad = sc <= 2;
                                                    return (
                                                        <span key={crit.id} className={`text-[10px] font-medium px-2 py-0.5 rounded ${isBad ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'}`}>
                                                            {crit.name}: <b>{sc}★</b>
                                                        </span>
                                                    );
                                                })}
                                            </div>

                                            {rev.actionNote && (
                                                <div className="text-xs bg-itc-50 text-itc-900 p-2.5 rounded-xl border border-itc-100">
                                                    <b>Ghi chú khắc phục ITC:</b> {rev.actionNote}
                                                </div>
                                            )}

                                            <div className="flex justify-end">
                                                <button 
                                                    onClick={() => setShowActionModal({ reviewId: rev.id, actionNote: rev.actionNote || '', status: rev.status })}
                                                    className="text-xs font-semibold bg-itc-800 hover:bg-itc-900 text-white px-3.5 py-1.5 rounded-xl shadow-xs"
                                                >
                                                    Cập nhật tiến độ
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="soft-card p-8 text-center text-slate-400 rounded-2xl text-xs">
                                    Không có nhận xét phàn nàn nào khớp với bộ lọc.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB MỚI: THEO DÕI KHẢO SÁT TRUNG TÂM CỦA SINH VIÊN */}
                {activeTab === 'center_surveys' && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                        {/* Thống kê tỷ lệ hoàn thành khảo sát trung tâm */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="soft-card p-4 rounded-2xl border-l-4 border-l-sky-500">
                                <p className="text-[11px] font-semibold text-slate-500">Tổng sinh viên hệ thống</p>
                                <p className="text-2xl font-black text-slate-800">{students.length} <span className="text-xs font-normal text-slate-400">sinh viên</span></p>
                            </div>
                            <div className="soft-card p-4 rounded-2xl border-l-4 border-l-emerald-500">
                                <p className="text-[11px] font-semibold text-emerald-700">Đã nộp Khảo sát Trung tâm</p>
                                <p className="text-2xl font-black text-emerald-800">
                                    {centerSurveyCompletedStudents.length} / {students.length}
                                    <span className="text-xs font-bold text-emerald-600 ml-2">
                                        ({students.length > 0 ? Math.round((centerSurveyCompletedStudents.length / students.length) * 100) : 0}%)
                                    </span>
                                </p>
                            </div>
                            <div className="soft-card p-4 rounded-2xl border-l-4 border-l-amber-500">
                                <p className="text-[11px] font-semibold text-amber-700">Chưa làm Khảo sát</p>
                                <p className="text-2xl font-black text-amber-800">
                                    {centerSurveyPendingStudents.length}
                                    <span className="text-xs font-medium text-slate-400 ml-2">sinh viên</span>
                                </p>
                            </div>
                        </div>

                        {/* Thanh tìm kiếm & Bộ lọc */}
                        <div className="soft-card p-4 rounded-2xl flex flex-wrap justify-between items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-600">Bộ lọc:</span>
                                {[
                                    { id: 'ALL', label: `Tất cả (${students.length})` },
                                    { id: 'DONE', label: `Đã làm (${centerSurveyCompletedStudents.length})` },
                                    { id: 'NOT_DONE', label: `Chưa làm (${centerSurveyPendingStudents.length})` }
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setCenterSurveyFilter(f.id as any)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                            centerSurveyFilter === f.id
                                                ? 'bg-itc-800 text-white shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl w-72">
                                <span className="text-slate-400 text-xs">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Tìm theo Mã SV, Họ tên, Email..."
                                    value={centerSurveySearch}
                                    onChange={e => setCenterSurveySearch(e.target.value)}
                                    className="bg-transparent border-none outline-none text-xs w-full"
                                />
                            </div>
                        </div>

                        {/* Bảng danh sách sinh viên và trạng thái khảo sát */}
                        <div className="soft-card rounded-2xl overflow-hidden border border-slate-200">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="p-3">Mã SV</th>
                                        <th className="p-3">Họ và Tên</th>
                                        <th className="p-3">Email Sinh viên</th>
                                        <th className="p-3 text-center">Trạng thái Khảo sát</th>
                                        <th className="p-3 text-center">Điểm đánh giá TB</th>
                                        <th className="p-3">Ý kiến / Góp ý</th>
                                        <th className="p-3 text-right">Chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {displayedCenterSurveyStudents.map((st: any) => {
                                        const survey = reviews.find((r: any) => 
                                            (r.studentCode === st.id || r.studentCode === st.code) &&
                                            (r.isCenterSurvey || r.type === 'CENTER')
                                        );
                                        const isDone = !!survey;
                                        
                                        let avgScore = 0;
                                        if (survey && survey.ratings && Object.keys(survey.ratings).length > 0) {
                                            const scores = Object.values(survey.ratings) as number[];
                                            avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
                                        }

                                        return (
                                            <tr key={st.id || st.code} className="hover:bg-slate-50/80 transition">
                                                <td className="p-3 font-mono font-bold text-itc-900 whitespace-nowrap">
                                                    <span className="bg-itc-50 text-itc-800 px-2 py-0.5 rounded border border-itc-200 text-[11px]" title={st.id}>
                                                        {getDisplayStudentCode(st, students)}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-bold text-slate-800">{st.name}</td>
                                                <td className="p-3 font-mono text-slate-500 text-[11px]">{st.email}</td>
                                                <td className="p-3 text-center">
                                                    {isDone ? (
                                                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1">
                                                            ✓ Đã khảo sát ({survey.createdAt || 'Gần đây'})
                                                        </span>
                                                    ) : (
                                                        <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1">
                                                            ⏳ Chưa khảo sát
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center font-bold">
                                                    {isDone && avgScore > 0 ? (
                                                        <span className="text-amber-600 flex items-center justify-center gap-1">
                                                            {avgScore.toFixed(1)} <span className="text-amber-500">★</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-slate-600 max-w-xs truncate">
                                                    {survey?.comment ? `"${survey.comment}"` : <span className="text-slate-300 italic">Không có góp ý</span>}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {isDone ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewingCenterSurveyModal({ student: st, survey })}
                                                            className="text-xs font-bold text-itc-700 hover:text-itc-900 bg-itc-50 hover:bg-itc-100 border border-itc-200 px-3 py-1 rounded-lg transition"
                                                        >
                                                            Xem phiếu &rarr;
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">Chưa có</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {displayedCenterSurveyStudents.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-10 text-slate-400">
                                                Không có sinh viên nào khớp với bộ lọc khảo sát.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB MỚI: PHÊ DUYỆT YÊU CẦU HỦY MÔN HỌC */}
                {activeTab === 'unenroll_requests' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="soft-card p-5 rounded-2xl border border-slate-200 flex justify-between items-center flex-wrap gap-3">
                            <div>
                                <h3 className="font-bold text-itc-900 text-sm">Danh sách Yêu cầu Xin Hủy Môn học từ Sinh viên</h3>
                                <p className="text-xs text-slate-500">Học viên chỉ được hủy môn sau khi được Trung tâm xét duyệt</p>
                            </div>
                            <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-xl">
                                ⏳ Đang chờ duyệt: <b>{pendingUnenrollCount}</b> yêu cầu
                            </span>
                        </div>

                        <div className="soft-card rounded-2xl overflow-hidden border border-slate-200">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="p-3">Mã SV</th>
                                        <th className="p-3">Họ và Tên</th>
                                        <th className="p-3">Lớp xin hủy</th>
                                        <th className="p-3">Lý do xin rút</th>
                                        <th className="p-3">Thời gian gửi</th>
                                        <th className="p-3 text-center">Trạng thái</th>
                                        <th className="p-3 text-right">Hành động Phê duyệt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {unenrollRequests.map((req: any) => {
                                        const targetClass = classes.find((c: any) => c.code === req.classCode);
                                        const isPending = req.status === 'PENDING';

                                        return (
                                            <tr key={req.id} className="hover:bg-slate-50/80 transition">
                                                <td className="p-3 font-mono font-bold text-itc-900 whitespace-nowrap">
                                                    <span className="bg-itc-50 text-itc-800 px-2 py-0.5 rounded border border-itc-200 text-[11px]" title={req.studentId}>
                                                        {getDisplayStudentCode(req, students)}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-bold text-slate-800">{req.studentName}</td>
                                                <td className="p-3">
                                                    <span className="font-bold text-itc-900">{req.classCode}</span>
                                                    {targetClass && <span className="text-[11px] text-slate-500 block">({targetClass.room})</span>}
                                                </td>
                                                <td className="p-3 text-slate-600 italic max-w-xs">{req.reason || 'Lý do cá nhân'}</td>
                                                <td className="p-3 text-slate-400 text-[11px]">
                                                    {req.requestedAt ? new Date(req.requestedAt).toLocaleString('vi-VN') : 'Mới gửi'}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {req.status === 'PENDING' && (
                                                        <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                                                            ⏳ Chờ duyệt
                                                        </span>
                                                    )}
                                                    {req.status === 'APPROVED' && (
                                                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                                                            ✓ Đã duyệt hủy
                                                        </span>
                                                    )}
                                                    {req.status === 'REJECTED' && (
                                                        <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                                                            ✕ Từ chối
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {isPending ? (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => onApproveUnenroll && onApproveUnenroll(req.id)}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs transition"
                                                            >
                                                                ✓ Duyệt hủy
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => onRejectUnenroll && onRejectUnenroll(req.id)}
                                                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs px-3 py-1.5 rounded-xl transition"
                                                            >
                                                                ✕ Từ chối
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs italic">Đã giải quyết</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {unenrollRequests.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-10 text-slate-400">
                                                Hiện tại không có yêu cầu xin hủy môn nào từ học viên.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 3: QUẢN LÝ LỚP HỌC & DUYỆT PHÒNG DẠY BÙ ITC DLU */}
                {activeTab === 'classes' && (
                    <div className="space-y-4">
                        {/* Sub-tab navigation bar */}
                        <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex-wrap">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setClassSubTab('classes')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                        classSubTab === 'classes'
                                            ? 'bg-itc-800 text-white shadow-soft scale-105'
                                            : 'text-slate-600 hover:bg-slate-100 bg-slate-50'
                                    }`}
                                >
                                    <span>🏫 Danh sách Lớp Đào tạo</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                        classSubTab === 'classes' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                    }`}>
                                        {classes.length}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setClassSubTab('room_bookings')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                        classSubTab === 'room_bookings'
                                            ? 'bg-orange-600 text-white shadow-soft scale-105'
                                            : 'text-slate-600 hover:bg-slate-100 bg-slate-50'
                                    }`}
                                >
                                    <span>🏢 Duyệt Mượn phòng &amp; Dạy bù</span>
                                    {pendingBookingsCount > 0 ? (
                                        <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                                            {pendingBookingsCount} chờ duyệt
                                        </span>
                                    ) : (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                            classSubTab === 'room_bookings' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                            {roomBookings.length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {classSubTab === 'classes' ? (
                                <button 
                                    onClick={() => setShowCreateClassModal(true)}
                                    className="bg-itc-800 hover:bg-itc-900 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-xs transition"
                                >
                                    <Icons.Plus /> Tạo Lớp DLU mới
                                </button>
                            ) : (
                                <div className="text-xs text-slate-500 font-medium hidden sm:block">
                                    Duyệt phòng máy cho giảng viên đăng ký dạy bù &amp; ôn tập
                                </div>
                            )}
                        </div>

                        {/* SUB-TAB 1: LỚP HỌC CHÍNH KHÓA */}
                        {classSubTab === 'classes' && (
                            <div className="soft-card rounded-2xl p-5 border border-slate-200">
                                <div className="flex justify-between items-center mb-5 gap-3 flex-wrap">
                                    <div>
                                        <h3 className="font-bold text-itc-900 text-sm">Danh sách Lớp Đào tạo tại ITC - Đại học Đà Lạt</h3>
                                        <p className="text-xs text-slate-500">Quản lý các đợt mở form khảo sát chất lượng cho sinh viên &amp; học viên</p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs text-slate-600">
                                        <thead className="bg-itc-50 text-itc-900 font-bold uppercase border-b border-itc-200">
                                            <tr>
                                                <th className="p-2.5 whitespace-nowrap min-w-[110px]">Mã Lớp DLU</th>
                                                <th className="p-2.5 whitespace-nowrap min-w-[180px]">Chương trình Đào tạo</th>
                                                <th className="p-2.5 whitespace-nowrap min-w-[160px]">Giảng viên</th>
                                                <th className="p-2.5 whitespace-nowrap min-w-[170px]">Phòng &amp; Lịch học</th>
                                                <th className="p-2.5 whitespace-nowrap min-w-[120px]">Số ĐK / Sĩ số</th>
                                                <th className="p-2.5 whitespace-nowrap min-w-[150px]">Đợt Khảo sát</th>
                                                <th className="p-2.5 text-right whitespace-nowrap min-w-[220px]">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {classes.map((cls: any) => {
                                                const crs = courses.find((c: any) => c.id === cls.courseId || c.code === cls.courseId || c.name === cls.courseId);
                                                const tch1 = teachers.find((t: any) => t.id === cls.teacherId);
                                                const tch2 = teachers.find((t: any) => t.id === cls.teacherId2);
                                                const classAtts = attendances.filter((a: any) => a.classId === cls.id);
                                                const enrolledCount = enrollments.filter((e: any) => e.classCode === cls.code).length;
                                                const maxCapacity = cls.studentsCount || 30;
                                                const fillPct = maxCapacity > 0 ? Math.min(100, Math.round(enrolledCount / maxCapacity * 100)) : 0;
                                                return (
                                                    <tr key={cls.id} className="hover:bg-slate-50/60">
                                                        <td className="p-2.5 font-bold text-itc-900">{cls.code}</td>
                                                        <td className="p-2.5 font-medium">
                                                            <div className="font-bold text-slate-800 text-xs">
                                                                {crs ? crs.name : (cls.courseName || cls.courseId || 'Tin học cơ bản')}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                {crs?.code && (
                                                                    <span className="font-mono text-[10px] text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 font-bold">
                                                                        {crs.code}
                                                                    </span>
                                                                )}
                                                                {crs?.type === 'CERTIFICATE' ? (
                                                                    <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                                                                        🏅 Chứng chỉ
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                                                                        📘 Môn chính quy
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-2.5">
                                                            <div className="font-semibold text-slate-800">{tch1 ? tch1.name : ''}</div>
                                                            {tch2 && (
                                                                <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                                                                    + {tch2.name} <span className="text-[10px] text-slate-400">({cls.teacherRole2 || 'Thực hành'})</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-2.5">
                                                            <div className="font-bold text-slate-800 flex items-center gap-1">
                                                                <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-200">
                                                                    {cls.room || 'Chưa xếp phòng'}
                                                                </span>
                                                            </div>
                                                            {cls.schedule && (
                                                                <div className="text-[11px] text-itc-800 font-semibold mt-1 flex items-center gap-1">
                                                                    <span>🕒</span>
                                                                    <span>{cls.schedule}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        {/* Cột Số Đăng Ký */}
                                                        <td className="p-2.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`font-bold text-sm ${enrolledCount >= maxCapacity ? 'text-rose-600' : enrolledCount > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                                                                    {enrolledCount}
                                                                </span>
                                                                <span className="text-slate-400 text-xs">/ {maxCapacity}</span>
                                                            </div>
                                                            <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-20">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all ${enrolledCount >= maxCapacity ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                                    style={{ width: `${fillPct}%` }}
                                                                />
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 mt-0.5">{fillPct}% sĩ số</div>
                                                        </td>
                                                        <td className="p-2.5 whitespace-nowrap">
                                                            {(() => {
                                                                const classTeacherCriteria = (teacherCriteria || []).filter(
                                                                    (tc: any) => tc.teacherId === cls.teacherId || (cls.teacherId2 && tc.teacherId === cls.teacherId2)
                                                                );
                                                                const hasTeacherCriteria = classTeacherCriteria.length > 0;

                                                                return (
                                                                    <div className="flex flex-col gap-1 items-start">
                                                                        {cls.status === 'OPEN_SURVEY' ? (
                                                                            <span className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-lg text-xs border border-emerald-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                                Đang mở khảo sát
                                                                            </span>
                                                                        ) : (
                                                                            <span className="bg-slate-100 text-slate-600 font-medium px-2.5 py-1 rounded-lg text-xs border border-slate-200 inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                                                                                Đã khóa form
                                                                            </span>
                                                                        )}
                                                                        {!hasTeacherCriteria && cls.status !== 'OPEN_SURVEY' && (
                                                                            <span className="bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded text-[10px] border border-amber-200 inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                                                                                <span>⚠️</span> Chưa có tiêu chí GV
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="p-2.5 text-right whitespace-nowrap">
                                                            <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                                                                <button 
                                                                    onClick={() => setViewingAttendanceClass(cls)}
                                                                    className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
                                                                    title="Sổ điểm danh học viên"
                                                                >
                                                                    <Icons.CheckCircle className="w-3.5 h-3.5" /> Điểm danh ({classAtts.length})
                                                                </button>
                                                                <button 
                                                                    onClick={() => setSharingClass({ id: cls.id, code: cls.code, name: crs?.name || '' })}
                                                                    className="text-itc-600 hover:text-itc-800 font-semibold flex items-center gap-1"
                                                                >
                                                                    <Icons.FileText className="w-4 h-4" /> Mã QR
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        const classTeacherCriteria = (teacherCriteria || []).filter(
                                                                            (tc: any) => tc.teacherId === cls.teacherId || (cls.teacherId2 && tc.teacherId === cls.teacherId2)
                                                                        );
                                                                        const hasTeacherCriteria = classTeacherCriteria.length > 0;
                                                                        if (cls.status !== 'OPEN_SURVEY' && !hasTeacherCriteria) {
                                                                            alert(`⚠️ KHÔNG THỂ BẬT KHẢO SÁT LỚP ${cls.code}!\n\nGiảng viên phụ trách lớp (${tch1?.name || 'Giảng viên'}${tch2 ? ` & ${tch2.name}` : ''}) chưa đưa ra bất kỳ tiêu chí khảo sát cá nhân nào.\n\nTheo quy chế của Trung tâm ITC, Giảng viên phải đưa ra tiêu chí khảo sát cá nhân trước thì mới được phép mở đợt khảo sát cho sinh viên đánh giá!`);
                                                                            return;
                                                                        }
                                                                        onToggleClassStatus(cls.id, cls.status);
                                                                    }}
                                                                    className={`font-semibold underline whitespace-nowrap ${
                                                                        cls.status === 'OPEN_SURVEY'
                                                                            ? 'text-itc-800 hover:text-itc-900'
                                                                            : (teacherCriteria || []).some((tc: any) => tc.teacherId === cls.teacherId || (cls.teacherId2 && tc.teacherId === cls.teacherId2))
                                                                            ? 'text-itc-800 hover:text-itc-900'
                                                                            : 'text-amber-700 hover:text-amber-900'
                                                                    }`}
                                                                    title={cls.status !== 'OPEN_SURVEY' && !(teacherCriteria || []).some((tc: any) => tc.teacherId === cls.teacherId || (cls.teacherId2 && tc.teacherId === cls.teacherId2)) ? 'Giảng viên chưa tạo tiêu chí khảo sát cá nhân' : ''}
                                                                >
                                                                    {cls.status === 'OPEN_SURVEY' ? 'Đóng đợt' : 'Mở lại'}
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        if (window.confirm(`Bạn có chắc chắn muốn XÓA BỎ HOÀN TOÀN LỚP HỌC (Đợt khảo sát) ${cls.code}?\nHành động này sẽ xóa luôn cả dữ liệu khảo sát sinh viên đã nộp và không thể hoàn tác!`)) {
                                                                            onDeleteClass(cls.id);
                                                                        }
                                                                    }}
                                                                    className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 ml-2"
                                                                    title="Xóa đợt khảo sát (Lớp học) này"
                                                                >
                                                                    <Icons.Trash className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {classes.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="text-center py-12 text-slate-400">
                                                        Chưa có lớp học nào. Bấm <b>"+ Tạo Lớp DLU mới"</b> để bắt đầu tạo lớp học đầu tiên.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* SUB-TAB 2: DUYỆT MƯỢN PHÒNG & DẠY BÙ */}
                        {classSubTab === 'room_bookings' && (
                            <div className="space-y-4">
                                {/* Thống kê nhanh */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                                            <Icons.Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tổng yêu cầu</div>
                                            <div className="text-lg font-black text-slate-800">{roomBookings.length}</div>
                                        </div>
                                    </div>
                                    <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 shadow-xs flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                                            <Icons.AlertTriangle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Chờ phê duyệt</div>
                                            <div className="text-lg font-black text-amber-800 flex items-center gap-1.5">
                                                {pendingBookingsCount}
                                                {pendingBookingsCount > 0 && (
                                                    <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-black animate-pulse">
                                                        Cần duyệt
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 shadow-xs flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                                            <Icons.CheckCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Đã duyệt cấp phòng</div>
                                            <div className="text-lg font-black text-emerald-800">{approvedBookingsCount}</div>
                                        </div>
                                    </div>
                                    <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200 shadow-xs flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                                            <Icons.Close className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">Đã từ chối</div>
                                            <div className="text-lg font-black text-rose-800">{rejectedBookingsCount}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bảng danh sách yêu cầu duyệt */}
                                <div className="soft-card rounded-2xl p-5 border border-slate-200 bg-white">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
                                        <div>
                                            <h3 className="font-bold text-itc-900 text-sm flex items-center gap-2">
                                                <span className="text-orange-500">🏢</span> Danh sách Đăng ký Phòng máy &amp; Lớp Dạy bù
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Xem xét và phê duyệt cấp phòng cho giảng viên. Khi duyệt, phòng và ca học sẽ tự động khóa để chống trùng lịch.
                                            </p>
                                        </div>

                                        {/* Filters & Search */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <div className="relative">
                                                <Icons.Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="text"
                                                    value={roomBookingSearch}
                                                    onChange={e => setRoomBookingSearch(e.target.value)}
                                                    placeholder="Tìm GV, phòng, môn..."
                                                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-itc-500 w-44"
                                                />
                                            </div>

                                            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                                                <button
                                                    onClick={() => setRoomBookingFilter('ALL')}
                                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                                                        roomBookingFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                                                    }`}
                                                >
                                                    Tất cả ({roomBookings.length})
                                                </button>
                                                <button
                                                    onClick={() => setRoomBookingFilter('PENDING')}
                                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                                                        roomBookingFilter === 'PENDING' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                                                    }`}
                                                >
                                                    Chờ duyệt ({pendingBookingsCount})
                                                </button>
                                                <button
                                                    onClick={() => setRoomBookingFilter('APPROVED')}
                                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                                                        roomBookingFilter === 'APPROVED' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                                                    }`}
                                                >
                                                    Đã duyệt ({approvedBookingsCount})
                                                </button>
                                                <button
                                                    onClick={() => setRoomBookingFilter('REJECTED')}
                                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                                                        roomBookingFilter === 'REJECTED' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                                                    }`}
                                                >
                                                    Từ chối ({rejectedBookingsCount})
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs text-slate-600">
                                            <thead className="bg-orange-50/60 text-slate-800 font-bold uppercase border-b border-orange-200">
                                                <tr>
                                                    <th className="p-3">Giảng viên Đăng ký</th>
                                                    <th className="p-3">Phòng &amp; Môn học</th>
                                                    <th className="p-3">Thời gian &amp; Ca Dạy bù</th>
                                                    <th className="p-3">Mục đích &amp; Quy mô</th>
                                                    <th className="p-3">Thời điểm gửi</th>
                                                    <th className="p-3">Trạng thái</th>
                                                    <th className="p-3 text-right">Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredRoomBookings.map((b: any) => {
                                                    const roomName = b.room || b.roomId || b.roomName || 'Phòng máy';
                                                    const courseName = b.courseName || b.courseId || 'Lớp học';
                                                    const timeSlot = b.timeSlot || b.shift || 'Chưa định ca';
                                                    const comps = b.computersNeeded || b.estimatedStudents || 35;
                                                    return (
                                                        <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                                                            <td className="p-3">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                                                        {(b.teacherName || 'GV').charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-slate-900">{b.teacherName || 'Giảng viên ITC'}</div>
                                                                        <div className="text-[10px] text-slate-400 font-mono">ID: {b.teacherId ? b.teacherId.slice(0, 8) : 'ITC-TCH'}</div>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            <td className="p-3">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-bold text-orange-950 bg-orange-100/80 border border-orange-300 px-2 py-0.5 rounded-md text-[11px]">
                                                                        🏢 {roomName}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                                        🖥️ {comps} máy
                                                                    </span>
                                                                </div>
                                                                <div className="font-bold text-slate-800 text-xs mt-1">
                                                                    {courseName}
                                                                </div>
                                                            </td>

                                                            <td className="p-3">
                                                                <div className="font-bold text-slate-900 flex items-center gap-1">
                                                                    <span>📅</span>
                                                                    <span>{b.date}</span>
                                                                </div>
                                                                <div className="text-[11px] text-orange-700 font-semibold mt-0.5 flex items-center gap-1">
                                                                    <span>⏰</span>
                                                                    <span>{timeSlot}</span>
                                                                </div>
                                                            </td>

                                                            <td className="p-3 max-w-xs">
                                                                <div className="text-slate-700 font-medium leading-relaxed">
                                                                    {b.purpose || 'Dạy bù thực hành'}
                                                                </div>
                                                                <span className="inline-block mt-1 text-[10px] bg-sky-50 text-sky-700 font-bold px-1.5 py-0.2 rounded border border-sky-200">
                                                                    Lớp dạy bù / ôn thi
                                                                </span>
                                                            </td>

                                                            <td className="p-3 text-slate-400 text-[11px]">
                                                                {b.createdAt || 'Hôm nay'}
                                                            </td>

                                                            <td className="p-3">
                                                                {b.status === 'PENDING' && (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-xs animate-pulse">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                                        Đang chờ duyệt
                                                                    </span>
                                                                )}
                                                                {b.status === 'APPROVED' && (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                        ✓ Đã cấp phòng
                                                                    </span>
                                                                )}
                                                                {b.status === 'REJECTED' && (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                                        ✕ Đã từ chối
                                                                    </span>
                                                                )}
                                                            </td>

                                                            <td className="p-3 text-right">
                                                                {b.status === 'PENDING' ? (
                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                        <button
                                                                            onClick={() => onUpdateRoomBookingStatus(b.id, 'APPROVED')}
                                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1 hover:scale-105 active:scale-95"
                                                                            title="Duyệt cấp phòng và khóa lịch"
                                                                        >
                                                                            <Icons.CheckCircle className="w-3.5 h-3.5" /> Duyệt cấp phòng
                                                                        </button>
                                                                        <button
                                                                            onClick={() => onUpdateRoomBookingStatus(b.id, 'REJECTED')}
                                                                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-2.5 py-1.5 rounded-xl transition flex items-center gap-1"
                                                                            title="Từ chối yêu cầu"
                                                                        >
                                                                            <Icons.Close className="w-3.5 h-3.5" /> Từ chối
                                                                        </button>
                                                                    </div>
                                                                ) : b.status === 'APPROVED' ? (
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                                            Đã khóa phòng
                                                                        </span>
                                                                        <button
                                                                            onClick={() => {
                                                                                if (window.confirm(`Bạn có chắc muốn THU HỒI việc cấp phòng ${roomName} cho giảng viên ${b.teacherName}?`)) {
                                                                                    onUpdateRoomBookingStatus(b.id, 'REJECTED');
                                                                                }
                                                                            }}
                                                                            className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold underline"
                                                                        >
                                                                            Thu hồi
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <button
                                                                            onClick={() => onUpdateRoomBookingStatus(b.id, 'APPROVED')}
                                                                            className="text-xs text-itc-700 hover:text-itc-900 font-bold underline flex items-center gap-1"
                                                                        >
                                                                            <Icons.CheckCircle className="w-3.5 h-3.5" /> Duyệt lại
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}

                                                {filteredRoomBookings.length === 0 && (
                                                    <tr>
                                                        <td colSpan={7} className="text-center py-12 text-slate-400">
                                                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2 text-xl">
                                                                🏢
                                                            </div>
                                                            <p className="font-semibold text-slate-600">Không tìm thấy yêu cầu mượn phòng nào</p>
                                                            <p className="text-[11px] text-slate-400 mt-1">
                                                                Khi giảng viên gửi đăng ký dạy bù hoặc mượn phòng máy từ Cổng Giảng viên, danh sách sẽ hiển thị tại đây.
                                                            </p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Notice note */}
                                    <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                                        <span className="text-amber-600 text-base leading-none">💡</span>
                                        <div className="leading-relaxed">
                                            <b>Cơ chế đồng bộ tự động:</b> Khi Quản trị viên bấm <b>"Duyệt cấp phòng"</b>, phòng máy và ca học tương ứng sẽ được tự động khóa trên hệ thống (không ai có thể chọn trùng). Đồng thời, một thông báo xét duyệt chính thức sẽ được gửi trực tiếp đến hộp thư của Giảng viên.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: QUẢN LÝ GIẢNG VIÊN */}
                {activeTab === 'teachers' && (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Icons.User className="w-5 h-5 text-itc-600" /> Danh sách Giảng viên ({teachers.length})
                            </h3>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setImportModalType('TEACHER')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                                    title="Nhập danh sách giảng viên từ file Excel (.xlsx, .xls) hoặc .csv"
                                >
                                    📥 Nhập File Excel/CSV
                                </button>
                                <button 
                                    onClick={() => setShowCreateTeacherModal(true)}
                                    className="bg-itc-800 hover:bg-itc-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md"
                                >
                                    <Icons.Plus className="w-4 h-4" /> Thêm Giảng viên Mới
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr>
                                        <th className="p-4 rounded-tl-3xl">Mã GV</th>
                                        <th className="p-4">Họ và Tên</th>
                                        <th className="p-4">Email Đăng nhập</th>
                                        <th className="p-4 text-right rounded-tr-3xl">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {teachers.map((tch: any) => (
                                        <tr key={tch.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="p-4 font-bold text-itc-900">{tch.code}</td>
                                            <td className="p-4 text-slate-800 font-medium">{tch.name}</td>
                                            <td className="p-4 text-slate-600">{tch.email || 'Chưa cập nhật'}</td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    onClick={() => {
                                                        if (confirm(`Bạn có chắc chắn muốn xóa giảng viên ${tch.name}?`)) {
                                                            onDeleteTeacher(tch.id);
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                    title="Xóa giảng viên"
                                                >
                                                    <Icons.Trash className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {teachers.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center text-slate-500">Chưa có giảng viên nào.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 5: QUẢN LÝ SINH VIÊN */}
                {activeTab === 'students' && (
                    <div className="soft-card p-6 rounded-3xl space-y-4">
                        <div className="flex flex-wrap justify-between items-center gap-3">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                                    <span>🎓</span> Danh sách Sinh viên / Học viên ITC ({students.length})
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Mã SV được tự động gán theo thứ tự (SV01, SV02... SV0n), tự gán email @itc.edu.vn và mật khẩu mặc định svitc12345
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="text"
                                    placeholder="Tìm tên, mã SV, email..."
                                    value={studentSearchTerm}
                                    onChange={e => setStudentSearchTerm(e.target.value)}
                                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-itc-500 outline-none bg-slate-50 w-48"
                                />
                                <button 
                                    onClick={() => setImportModalType('STUDENT')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0"
                                    title="Nhập danh sách sinh viên từ file Excel (.xlsx, .xls) hoặc .csv"
                                >
                                    📥 Nhập File Excel/CSV
                                </button>
                                <button 
                                    onClick={() => setShowCreateStudentModal(true)}
                                    className="bg-itc-800 hover:bg-itc-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shrink-0"
                                >
                                    <Icons.Plus className="w-4 h-4" /> Thêm Sinh viên Mới
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr>
                                        <th className="p-4 rounded-tl-3xl">Mã SV</th>
                                        <th className="p-4">Họ và Tên</th>
                                        <th className="p-4">Email Đăng nhập</th>
                                        <th className="p-4">Mật khẩu cấp phát</th>
                                        <th className="p-4">Lớp đang theo học</th>
                                        <th className="p-4">Ngày đăng ký</th>
                                        <th className="p-4 text-right rounded-tr-3xl">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {students
                                        .filter((st: any) => {
                                            if (!studentSearchTerm) return true;
                                            const term = studentSearchTerm.toLowerCase();
                                            return (
                                                st.name?.toLowerCase().includes(term) ||
                                                st.code?.toLowerCase().includes(term) ||
                                                st.email?.toLowerCase().includes(term)
                                            );
                                        })
                                        .map((st: any) => (
                                            <tr key={st.id || st.code} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="p-4 font-mono font-black text-itc-900 whitespace-nowrap">
                                                    <span className="bg-itc-50 text-itc-900 px-2.5 py-1 rounded-lg border border-itc-200" title={st.id}>
                                                        {getDisplayStudentCode(st, students)}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-bold text-slate-800">{st.name}</td>
                                                <td className="p-4 text-slate-600 font-mono text-xs">{st.email}</td>
                                                <td className="p-4 font-mono text-xs text-slate-500">
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                                                        {st.password || 'svitc12345'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {(() => {
                                                        const sKey = st.id || st.code;
                                                        const approvedUnenrolls = new Set(
                                                            (unenrollRequests || [])
                                                                .filter((r: any) => (r.studentId === st.id || r.studentId === st.code) && r.status === 'APPROVED')
                                                                .map((r: any) => r.classCode)
                                                        );
                                                        const studentEnrolledCodes = Array.from(new Set([
                                                            ...(st.enrolledClassCodes || []),
                                                            ...(enrollments || [])
                                                                .filter((e: any) => (e.studentId === st.id || e.studentId === st.code))
                                                                .map((e: any) => e.classCode)
                                                        ])).filter(code => !approvedUnenrolls.has(code));

                                                        if (studentEnrolledCodes.length === 0) {
                                                            return <span className="text-slate-400 text-xs italic">Chưa xếp lớp</span>;
                                                        }

                                                        if (studentEnrolledCodes.length === 1) {
                                                            return (
                                                                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-lg font-mono">
                                                                    {studentEnrolledCodes[0]}
                                                                </span>
                                                            );
                                                        }

                                                        // Nếu 1 học viên đăng ký nhiều lớp: hiển thị mã lớp đầu tiên kèm nút mũi tên click để mở xem
                                                        const isExpanded = !!expandedStudentClasses[sKey];
                                                        return (
                                                            <div className="relative inline-block text-left">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setExpandedStudentClasses(prev => ({ ...prev, [sKey]: !prev[sKey] }))}
                                                                    className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold px-2.5 py-1 rounded-lg transition shadow-2xs"
                                                                    title="Bấm để xem tất cả các lớp đang học"
                                                                >
                                                                    <span className="font-mono">{studentEnrolledCodes[0]}</span>
                                                                    <span className="text-[10px] bg-blue-200/80 text-blue-900 px-1.5 py-0.2 rounded-full font-black">
                                                                        +{studentEnrolledCodes.length - 1} lớp
                                                                    </span>
                                                                    <span className={`transform transition-transform text-[9px] text-blue-600 ${isExpanded ? 'rotate-180' : ''}`}>
                                                                        ▼
                                                                    </span>
                                                                </button>

                                                                {isExpanded && (
                                                                    <div className="absolute left-0 mt-1.5 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 min-w-[170px] space-y-1.5 animate-in fade-in zoom-in-95">
                                                                        <div className="flex justify-between items-center pb-1 border-b border-slate-100">
                                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                                                Các lớp đang học ({studentEnrolledCodes.length}):
                                                                            </span>
                                                                            <span 
                                                                                onClick={() => setExpandedStudentClasses(prev => ({ ...prev, [sKey]: false }))}
                                                                                className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold px-1"
                                                                            >
                                                                                ×
                                                                            </span>
                                                                        </div>
                                                                        {studentEnrolledCodes.map((code: string) => (
                                                                            <div key={code} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 text-slate-800 font-mono text-xs font-bold border border-slate-100">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                                <span>{code}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="p-4 text-xs text-slate-500">{st.createdAt || 'Hôm nay'}</td>
                                                <td className="p-4 text-right">
                                                    <button 
                                                        onClick={() => {
                                                            if (confirm(`Bạn có chắc chắn muốn xóa sinh viên ${st.name} (${st.code})?`)) {
                                                                if (onDeleteStudent) onDeleteStudent(st.id || st.code);
                                                            }
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                        title="Xóa sinh viên"
                                                    >
                                                        <Icons.Trash className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    {students.length === 0 && (
                                        <tr><td colSpan={7} className="p-8 text-center text-slate-500">Chưa có sinh viên nào được thêm. Bấm "Thêm Sinh viên Mới" để tạo.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 6: QUẢN LÝ MÔN HỌC & CHỨNG CHỈ */}
                {activeTab === 'courses' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Danh mục Môn học & Khóa chứng chỉ ITC</h2>
                                <p className="text-xs text-slate-500">Tạo môn học, chứng chỉ chuyên đề để phân công giảng viên và cho sinh viên đăng ký</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Tìm mã hoặc tên môn học..." 
                                        className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-itc-500 w-64"
                                        value={courseSearchTerm}
                                        onChange={(e) => setCourseSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={() => setShowCreateCourseModal(true)}
                                    className="px-4 py-2 bg-itc-800 hover:bg-itc-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
                                >
                                    <Icons.Plus className="w-4 h-4" />
                                    Tạo Môn học / Chứng chỉ Mới
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                                        <th className="p-4 rounded-l-xl">Mã môn / CC</th>
                                        <th className="p-4">Tên môn học / Chứng chỉ</th>
                                        <th className="p-4 whitespace-nowrap min-w-[150px]">Phân loại</th>
                                        <th className="p-4 whitespace-nowrap">Thời lượng</th>
                                        <th className="p-4">Mô tả tóm tắt</th>
                                        <th className="p-4 text-right rounded-r-xl whitespace-nowrap">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {courses
                                        .filter((c: any) => 
                                            (c.name || '').toLowerCase().includes(courseSearchTerm.toLowerCase()) || 
                                            (c.code || '').toLowerCase().includes(courseSearchTerm.toLowerCase())
                                        )
                                        .map((c: any) => (
                                            <tr key={c.id || c.code} className="hover:bg-slate-50/70 transition">
                                                <td className="p-4 whitespace-nowrap">
                                                    <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 inline-block">
                                                        {c.code}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-bold text-slate-800 text-sm">{c.name}</td>
                                                <td className="p-4 whitespace-nowrap">
                                                    {c.type === 'CERTIFICATE' ? (
                                                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide whitespace-nowrap shadow-sm">
                                                            🎓 CHỨNG CHỈ
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap shadow-sm">
                                                            📘 MÔN CHÍNH QUY
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-slate-800 text-xs">
                                                        {c.duration || `${c.totalPeriods || 45} tiết`}
                                                    </div>
                                                    {(c.theoryPeriods !== undefined || c.practicePeriods !== undefined) && (
                                                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                                                            <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-100">
                                                                {c.theoryPeriods || 0} tiết LT
                                                            </span>
                                                            <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-100">
                                                                {c.practicePeriods || 0} tiết TH
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-slate-500 max-w-xs truncate">{c.description || 'Chương trình đào tạo chuẩn ITC'}</td>
                                                <td className="p-4 text-right">
                                                    <button 
                                                        onClick={() => {
                                                            if (confirm(`Bạn có chắc chắn muốn xóa môn học ${c.name} (${c.code})?`)) {
                                                                if (onDeleteCourse) onDeleteCourse(c.id || c.code);
                                                            }
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                        title="Xóa môn học"
                                                    >
                                                        <Icons.Trash className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    {courses.length === 0 && (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-500">Chưa có môn học nào. Bấm "Tạo Môn học / Chứng chỉ Mới" để thêm môn học vào hệ thống.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* MODALS */}
            {showCreateClassModal && (
                <CreateClassModal 
                    classes={classes}
                    courses={courses}
                    teachers={teachers}
                    onClose={() => setShowCreateClassModal(false)}
                    onSubmit={(newClass: any) => {
                        onAddClass(newClass);
                        setShowCreateClassModal(false);
                    }}
                />
            )}

            {showCreateStudentModal && (
                <CreateStudentModal
                    existingStudents={students}
                    classes={classes}
                    onClose={() => setShowCreateStudentModal(false)}
                    onSubmit={(newStudent: any) => {
                        if (onAddStudent) onAddStudent(newStudent);
                        setShowCreateStudentModal(false);
                    }}
                />
            )}

            {viewingClassReviewsId && (
                <ClassReviewsModal 
                    classId={viewingClassReviewsId} 
                    classes={classes} 
                    reviews={reviews} 
                    criteriaList={criteriaList}
                    teacherCriteria={teacherCriteria}
                    teachers={teachers}
                    currentUserRole="ADMIN"
                    onClose={() => setViewingClassReviewsId(null)} 
                />
            )}

            {viewingAttendanceClass && (
                <AttendanceModal 
                    classInfo={viewingAttendanceClass}
                    courseName={courses.find((c: any) => c.id === viewingAttendanceClass.courseId)?.name || viewingAttendanceClass.code}
                    attendances={attendances}
                    onClose={() => setViewingAttendanceClass(null)}
                />
            )}

            {sharingClass && (
                <ShareQRModal 
                    classId={sharingClass.id}
                    classCode={sharingClass.code}
                    courseName={sharingClass.name}
                    onClose={() => setSharingClass(null)}
                />
            )}
            
            {showCriteriaModal && (
                <ManageCriteriaModal 
                    criteriaList={criteriaList}
                    onClose={() => setShowCriteriaModal(false)}
                    onRefresh={onRefreshData}
                    onSaveCriteriaList={onSaveCriteriaList}
                />
            )}

            {showApproveCriteriaModal && (
                <ApproveTeacherCriteriaModal
                    teachers={teachers}
                    teacherCriteria={teacherCriteria}
                    onUpdateCriteriaStatus={(criterionId, newStatus) => {
                        if (onUpdateTeacherCriteriaStatus) onUpdateTeacherCriteriaStatus(criterionId, newStatus);
                    }}
                    onUpdateTeacherAllCriteriaStatus={onUpdateTeacherAllCriteriaStatus}
                    onApproveAllPendingCriteria={onApproveAllPendingCriteria}
                    onDeleteCriteria={(criterionId) => {
                        if (onDeleteTeacherCriteria) onDeleteTeacherCriteria(criterionId);
                    }}
                    onClose={() => setShowApproveCriteriaModal(false)}
                />
            )}

            {showCreateTeacherModal && (
                <CreateTeacherModal 
                    existingTeachers={teachers}
                    onClose={() => setShowCreateTeacherModal(false)}
                    onSubmit={(newUser: any) => {
                        setShowCreateTeacherModal(false);
                        onRefreshData();
                    }}
                />
            )}

            {importModalType && (
                <ImportDataModal
                    type={importModalType}
                    existingCount={importModalType === 'TEACHER' ? teachers.length : students.length}
                    onClose={() => setImportModalType(null)}
                    onSuccess={(importedItems: any[]) => {
                        if (importModalType === 'TEACHER' && onImportTeachers) {
                            onImportTeachers(importedItems);
                        } else if (importModalType === 'STUDENT' && onImportStudents) {
                            onImportStudents(importedItems);
                        }
                        if (onRefreshData) onRefreshData();
                    }}
                />
            )}

            {showCreateCourseModal && (
                <CreateCourseModal
                    existingCourses={courses}
                    onClose={() => setShowCreateCourseModal(false)}
                    onSubmit={(newCourse: any) => {
                        if (onAddCourse) onAddCourse(newCourse);
                        setShowCreateCourseModal(false);
                    }}
                />
            )}

            {/* Action Modal for Reviews */}
            {showActionModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl">
                        <h3 className="font-bold text-slate-900 text-sm mb-3">Cập nhật tiến độ xử lý phàn nàn</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái:</label>
                                <select 
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 focus:outline-none"
                                    value={showActionModal.status}
                                    onChange={(e) => setShowActionModal({...showActionModal, status: e.target.value})}
                                >
                                    <option value="OPEN">Chờ tiếp nhận</option>
                                    <option value="IN_PROGRESS">Đang kiểm tra / sửa chữa</option>
                                    <option value="RESOLVED">Đã khắc phục hoàn tất</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú hành động:</label>
                                <textarea 
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 focus:outline-none"
                                    placeholder="VD: Đã thay bàn phím mới..."
                                    value={showActionModal.actionNote}
                                    onChange={(e) => setShowActionModal({...showActionModal, actionNote: e.target.value})}
                                ></textarea>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2 justify-end">
                            <button 
                                onClick={() => setShowActionModal(null)}
                                className="px-3 py-1.5 text-slate-500 font-semibold text-xs hover:bg-slate-100 rounded-lg transition"
                            >
                                Hủy
                            </button>
                                <button 
                                    onClick={() => handleLocalUpdateAction(showActionModal.reviewId, showActionModal.status, showActionModal.actionNote)}
                                    className="px-4 py-2 bg-itc-800 hover:bg-itc-900 text-white rounded-xl text-xs font-bold shadow-xs"
                                >
                                    Lưu tiến độ
                                </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal xem chi tiết phiếu Khảo sát Trung tâm của Sinh viên */}
            {viewingCenterSurveyModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                            <div>
                                <span className="p-1 bg-sky-50 text-sky-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-sky-200 inline-block mb-1">
                                    PHIẾU ĐÁNH GIÁ TRUNG TÂM ITC
                                </span>
                                <h4 className="font-bold text-base text-slate-900">
                                    Học viên: <b className="text-itc-900">{viewingCenterSurveyModal.student.name}</b>
                                </h4>
                                <p className="text-xs text-slate-500">
                                    Mã SV: <span className="font-mono font-bold text-slate-700">{getDisplayStudentCode(viewingCenterSurveyModal.student, students)}</span> • {viewingCenterSurveyModal.student.email}
                                </p>
                            </div>
                            <button
                                onClick={() => setViewingCenterSurveyModal(null)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                                Điểm đánh giá các tiêu chí Trung tâm:
                            </span>
                            {criteriaList.map((crit: any) => {
                                const score = viewingCenterSurveyModal.survey?.ratings?.[crit.id];
                                if (score === undefined) return null;
                                return (
                                    <div key={crit.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                                        <span className="font-medium text-slate-700 pr-2">{crit.name}</span>
                                        <span className="font-black text-amber-500 shrink-0">{score} ★</span>
                                    </div>
                                );
                            })}
                        </div>

                        {viewingCenterSurveyModal.survey?.comment && (
                            <div className="p-3 bg-slate-50 rounded-xl text-xs border border-slate-100 space-y-1">
                                <span className="font-bold text-slate-700 block">Ý kiến đóng góp & Nhận xét của Học viên:</span>
                                <p className="text-slate-600 italic leading-relaxed">
                                    "{viewingCenterSurveyModal.survey.comment}"
                                </p>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs text-slate-400">
                            <span>Thời gian nộp: {viewingCenterSurveyModal.survey?.createdAt || 'Gần đây'}</span>
                            <button
                                onClick={() => setViewingCenterSurveyModal(null)}
                                className="px-5 py-2 bg-itc-800 hover:bg-itc-900 text-white font-bold text-xs rounded-xl shadow-xs"
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
