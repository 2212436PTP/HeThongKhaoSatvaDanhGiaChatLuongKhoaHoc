import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { ShareQRModal } from '../modals/ShareQRModal';
import { ClassReviewsModal } from '../modals/ClassReviewsModal';
import { TeacherCriteriaModal } from '../modals/TeacherCriteriaModal';
import { AttendanceModal } from '../modals/AttendanceModal';
import { TeacherRoomBookingModal } from '../modals/TeacherRoomBookingModal';
import { ClassStudentsModal } from '../modals/ClassStudentsModal';
import { TeacherNotificationModal } from '../modals/TeacherNotificationModal';
import { GradeInputModal } from '../modals/GradeInputModal';
import { TeacherCriterion, AttendanceRecord, RoomBooking, TeacherNotification, Course, Student } from '../../types';

export const TeacherView = ({ 
    currentUser,
    currentUserRole, 
    teachers, 
    selectedTeacherId, 
    setSelectedTeacherId, 
    classes, 
    courses = [],
    students = [],
    reviews, 
    criteriaList, 
    teacherCriteria = [],
    onSaveTeacherCriteria,
    roomBookings = [],
    onSubmitRoomBooking,
    attendances = [],
    teacherNotifications = [],
    onMarkTeacherNotificationsRead,
    enrollments = [],
    studentGrades = {},
    onSaveGrades,
    onToggleClassSurvey,
    onToggleAttendance,
    onCancelRoomBooking,
    stats, 
    onUpdateTeacherNote, 
    onEscalateReview 
}: any) => {
    const [sharingClass, setSharingClass] = useState<any>(null);
    const [viewingClassReviewsId, setViewingClassReviewsId] = useState<string | null>(null);
    const [showCriteriaModal, setShowCriteriaModal] = useState(false);
    const [showRoomBookingModal, setShowRoomBookingModal] = useState(false);
    const [bookingInitialTab, setBookingInitialTab] = useState<'create' | 'matrix'>('create');
    const [viewingAttendanceClass, setViewingAttendanceClass] = useState<any>(null);
    const [viewingStudentsClass, setViewingStudentsClass] = useState<any>(null);
    const [showNotifModal, setShowNotifModal] = useState(false);
    const [gradeInputClass, setGradeInputClass] = useState<any>(null);
    const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});

    // Xác định ID giảng viên: nếu đăng nhập là TEACHER thì luôn lấy ID tài khoản đang đăng nhập
    const effectiveTeacherId = (currentUserRole === 'TEACHER' && currentUser?.id)
        ? currentUser.id
        : selectedTeacherId;

    const currentTeacher = (currentUserRole === 'TEACHER' && currentUser?.name)
        ? currentUser
        : (teachers.find((t: any) => t.id === effectiveTeacherId) || currentUser);

    // Lọc các lớp mà giảng viên này phụ trách (hoặc GV1 hoặc GV2)
    const teacherClasses = classes.filter((c: any) => 
        c.teacherId === effectiveTeacherId || 
        c.teacherId2 === effectiveTeacherId || 
        (c.teacherIds && c.teacherIds.includes(effectiveTeacherId))
    );

    const myCriteria = teacherCriteria.filter((tc: TeacherCriterion) => tc.teacherId === effectiveTeacherId);
    const myNotifications = (teacherNotifications || []).filter((n: any) => n.teacherId === effectiveTeacherId || !n.teacherId);
    const unreadNotifCount = myNotifications.filter((n: any) => !n.isRead).length;

    return (
        <div className="flex-1 bg-slate-50 p-4 lg:p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-itc-800 flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-itc-100 text-itc-800 rounded-lg">
                                <Icons.User className="w-5 h-5" />
                            </span>
                            <h2 className="text-base lg:text-lg font-bold text-itc-900">Góc Giảng viên ITC - Đại học Đà Lạt</h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Xem kết quả đánh giá theo tiêu chí riêng, danh sách sinh viên điểm danh & phản hồi chất lượng.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="bg-itc-50 text-itc-900 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-itc-200 shadow-2xs">
                            👨‍🏫 {currentTeacher?.name || currentUser?.name || 'Giảng viên ITC'}
                        </span>

                        {/* Chuông thông báo Giảng viên */}
                        <button 
                            onClick={() => setShowNotifModal(true)}
                            className="relative p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl transition shadow-2xs"
                            title="Thông báo phân công lịch dạy & kết quả xét duyệt"
                        >
                            <span className="text-base leading-none">🔔</span>
                            {unreadNotifCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-xs">
                                    {unreadNotifCount}
                                </span>
                            )}
                        </button>

                        <button 
                            onClick={() => {
                                setBookingInitialTab('matrix');
                                setShowRoomBookingModal(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
                        >
                            <span>🟢</span> Tra cứu phòng trống
                        </button>

                        <button 
                            onClick={() => {
                                setBookingInitialTab('create');
                                setShowRoomBookingModal(true);
                            }}
                            className="bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
                        >
                            <span>🖥️</span> Đăng ký dạy ({roomBookings.filter((b: any) => b.teacherId === effectiveTeacherId).length})
                        </button>

                        <button 
                            onClick={() => setShowCriteriaModal(true)}
                            className="bg-itc-800 hover:bg-itc-900 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
                        >
                            <Icons.CheckCircle className="w-4 h-4 text-emerald-400" /> Tiêu chí ({myCriteria.length})
                        </button>
                    </div>
                </div>

                {/* Danh sách lớp giảng dạy */}
                <div className="space-y-5">
                    {teacherClasses.map((cls: any) => {
                        const cm = stats?.classMetrics?.[cls.id] || { count: 0, overallAvg: 0, criteriaAvgs: {}, badComments: [] };
                        const isPrimary = cls.teacherId === effectiveTeacherId;
                        const myRole = isPrimary ? (cls.teacherRole1 || 'Giảng viên Lý thuyết') : (cls.teacherRole2 || 'Giảng viên Thực hành phòng máy');
                        const otherTeacherId = isPrimary ? cls.teacherId2 : cls.teacherId;
                        const otherTeacher = teachers.find((t: any) => t.id === otherTeacherId);
                        const otherTeacherRole = isPrimary ? cls.teacherRole2 : cls.teacherRole1;

                        const classAttendances = (attendances || []).filter((a: AttendanceRecord) => a.classId === cls.id);

                        // Tính điểm trung bình các tiêu chí của riêng giảng viên này
                        const teacherReviews = reviews.filter((r: any) => r.classId === cls.id && r.teacherRatings?.[effectiveTeacherId]);
                        const myCritScores: Record<string, number> = {};
                        const myCritCounts: Record<string, number> = {};

                        teacherReviews.forEach((r: any) => {
                            const ratings = r.teacherRatings?.[effectiveTeacherId] || {};
                            Object.entries(ratings).forEach(([critId, score]) => {
                                myCritScores[critId] = (myCritScores[critId] || 0) + (score as number);
                                myCritCounts[critId] = (myCritCounts[critId] || 0) + 1;
                            });
                        });

                        return (
                            <div key={cls.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 lg:p-6 space-y-4 hover:border-itc-300 transition">
                                <div className="flex flex-wrap justify-between items-start gap-4 border-b border-slate-100 pb-4">
                                    <div>
                                        <div className="flex items-center gap-2.5">
                                            <span className="font-bold text-sm lg:text-base text-itc-900">{cls.code} - {cm.courseName || 'Khóa học'}</span>
                                            <span className="bg-itc-100 text-itc-800 text-[11px] font-bold px-2.5 py-0.5 rounded-md border border-itc-200">
                                                {cls.room}
                                            </span>
                                            <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-md">
                                                Vai trò: {myRole}
                                            </span>
                                        </div>

                                        {otherTeacher && (
                                            <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                                                <Icons.User className="w-3.5 h-3.5 text-slate-400" />
                                                Đồng giảng dạy cùng: <b>{otherTeacher.name}</b> {otherTeacherRole ? `(${otherTeacherRole})` : ''}
                                            </p>
                                        )}

                                        <p className="text-xs text-slate-500 mt-1">
                                            Lịch học: <b>{cls.schedule}</b> | Đã nộp khảo sát: <b className="text-itc-800">{cm.count}</b> / {cls.studentsCount} học viên
                                        </p>

                                        {/* Action buttons */}
                                        <div className="flex flex-wrap items-center gap-2.5 mt-3.5">
                                            <button 
                                                onClick={() => setSharingClass({ id: cls.id, code: cls.code, name: cm.courseName || '' })}
                                                className="text-xs font-bold text-white bg-itc-800 hover:bg-itc-900 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                                            >
                                                <Icons.FileText className="w-3.5 h-3.5" /> Trình chiếu Mã QR Khảo Sát
                                            </button>

                                            <button 
                                                onClick={() => setViewingAttendanceClass({ id: cls.id, code: cls.code, room: cls.room, studentsCount: cls.studentsCount })}
                                                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                            >
                                                <Icons.CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Sổ Điểm danh ({classAttendances.length}/{cls.studentsCount})
                                            </button>

                                            <button 
                                                onClick={() => setViewingStudentsClass({ classInfo: cls, courseName: cm.courseName || cls.code })}
                                                className="text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                            >
                                                <span>👨‍🎓</span> DS Sinh viên ({students.filter((s: any) => (s.enrolledClassCodes || []).includes(cls.code) || (enrollments || []).some((e: any) => (e.studentId === s.id || e.studentId === s.code) && e.classCode === cls.code)).length})
                                            </button>

                                            {/* Nút nhập điểm */}
                                            <button 
                                                onClick={() => setGradeInputClass({ classInfo: cls, courseName: cm.courseName || cls.code })}
                                                className="text-xs font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                            >
                                                <span>📊</span> Nhập điểm
                                            </button>

                                            {/* Nút bật/tắt khảo sát riêng của giảng viên (Hỗ trợ 2 giảng viên cùng bật) */}
                                            {(() => {
                                                const isMySurveyActive = (cls as any).activeSurveyTeachers 
                                                    ? (cls as any).activeSurveyTeachers.includes(effectiveTeacherId) 
                                                    : (cls.status === 'OPEN_SURVEY');
                                                const otherTeacherId = cls.teacherId === effectiveTeacherId ? cls.teacherId2 : cls.teacherId;
                                                const isOtherActive = otherTeacherId && ((cls as any).activeSurveyTeachers 
                                                    ? (cls as any).activeSurveyTeachers.includes(otherTeacherId) 
                                                    : (cls.status === 'OPEN_SURVEY'));
                                                const hasMyCriteria = myCriteria.length > 0;

                                                const handleToggleClick = () => {
                                                    if (!isMySurveyActive && !hasMyCriteria) {
                                                        alert('⚠️ BẠN CHƯA ĐƯA RA TIÊU CHÍ KHẢO SÁT CÁ NHÂN!\n\nTheo quy chế của Trung tâm ITC, bạn phải đưa ra tiêu chí khảo sát cá nhân trước thì mới được phép bật khảo sát cho sinh viên.\n\nHệ thống sẽ mở form "Đề xuất Tiêu chí khảo sát" để bạn tạo tiêu chí ngay bây giờ!');
                                                        setShowCriteriaModal(true);
                                                        return;
                                                    }
                                                    if (onToggleClassSurvey) {
                                                        onToggleClassSurvey(cls.id, cls.status, effectiveTeacherId);
                                                    }
                                                };

                                                return (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <button 
                                                            onClick={handleToggleClick}
                                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border ${
                                                                isMySurveyActive 
                                                                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 shadow-2xs' 
                                                                    : !hasMyCriteria
                                                                    ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                            }`}
                                                            title={isMySurveyActive 
                                                                ? 'Khảo sát của bạn đang BẬT: Sinh viên phải đánh giá bạn mới xem được điểm. Bấm để tắt.' 
                                                                : !hasMyCriteria
                                                                ? 'Bạn chưa đưa ra tiêu chí khảo sát cá nhân. Hãy tạo tiêu chí trước khi bật khảo sát!'
                                                                : 'Khảo sát của bạn đang TẮT. Bấm để bật yêu cầu sinh viên làm khảo sát của bạn.'}
                                                        >
                                                            {isMySurveyActive ? (
                                                                <><span>🔒</span> Khảo sát của bạn: ĐANG BẬT</>
                                                            ) : !hasMyCriteria ? (
                                                                <><span>⚠️</span> Chưa có tiêu chí (Tạo tiêu chí)</>
                                                            ) : (
                                                                <><span>🔓</span> Khảo sát của bạn: ĐANG TẮT</>
                                                            )}
                                                        </button>

                                                        {otherTeacher && (
                                                            <span className={`text-[11px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 ${
                                                                isOtherActive 
                                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                                            }`}>
                                                                <span>{isOtherActive ? '🟢' : '⚪'}</span> 
                                                                {otherTeacher.name}: {isOtherActive ? 'Đang mở KS' : 'Đang tắt KS'}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            <button 
                                                onClick={() => setViewingClassReviewsId(cls.id)}
                                                className="text-xs font-semibold text-itc-600 hover:text-itc-800 underline decoration-itc-300 underline-offset-2 flex items-center gap-1 pl-1"
                                            >
                                                <Icons.Comments className="w-3.5 h-3.5" /> Xem tất cả {cm.count} nhận xét &rarr;
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-right bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <span className="text-2xl font-black text-itc-800">{cm.overallAvg}</span>
                                        <span className="text-[11px] text-amber-500 font-bold block">★ / 5.0 Trung bình</span>
                                    </div>
                                </div>

                                {/* Phần 1: Tiêu chí cá nhân của Giảng viên */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold text-itc-900 uppercase flex items-center gap-1.5">
                                            <Icons.CheckCircle className="w-4 h-4 text-emerald-600" /> Kết quả đánh giá Tiêu chí do bạn đặt ra ({myCriteria.length}):
                                        </h4>
                                        {myCriteria.length === 0 && (
                                            <button 
                                                onClick={() => setShowCriteriaModal(true)} 
                                                className="text-[11px] text-itc-600 font-bold underline hover:text-itc-800"
                                            >
                                                + Thêm tiêu chí đánh giá cá nhân
                                            </button>
                                        )}
                                    </div>

                                    {myCriteria.length > 0 ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                                {myCriteria.map((crit: any) => {
                                                    const total = myCritScores[crit.id] || 0;
                                                    const cnt = myCritCounts[crit.id] || 0;
                                                    const avg = cnt > 0 ? (total / cnt).toFixed(1) : 'Chưa có';
                                                    return (
                                                        <div key={crit.id} className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
                                                            <p className="text-[11px] font-bold text-emerald-900 leading-snug">{crit.name}</p>
                                                            {crit.description && (
                                                                <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{crit.description}</p>
                                                            )}
                                                            <p className="text-sm font-black text-emerald-700 mt-1 flex items-center gap-1">
                                                                {avg} {cnt > 0 && <span className="text-xs font-semibold">★ ({cnt} lượt)</span>}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Dữ liệu học viên đã đánh giá tiêu chí cá nhân của giảng viên */}
                                            {teacherReviews.length > 0 && (
                                                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-3 shadow-2xs">
                                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                                                        <span className="text-[11px] font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                                                            <span>📋</span> Dữ liệu Học viên đã đánh giá ({teacherReviews.length} học viên):
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const allExp: Record<string, boolean> = {};
                                                                    teacherReviews.forEach((tr: any) => { allExp[tr.id] = true; });
                                                                    setExpandedReviews(allExp);
                                                                }}
                                                                className="text-[10px] text-itc-700 font-bold hover:underline"
                                                            >
                                                                Mở rộng tất cả
                                                            </button>
                                                            <span className="text-slate-300 text-xs">|</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setExpandedReviews({})}
                                                                className="text-[10px] text-slate-500 font-bold hover:underline"
                                                            >
                                                                Thu gọn tất cả
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="divide-y divide-slate-100 text-xs space-y-1">
                                                        {teacherReviews.map((tr: any) => {
                                                            const trRatings = tr.teacherRatings?.[effectiveTeacherId] || {};
                                                            const stObj = students.find((s: any) => s.id === tr.studentCode || s.code === tr.studentCode);
                                                            const stName = stObj ? stObj.name : (tr.studentName || tr.studentCode || 'Học viên ẩn danh');

                                                            const ratingValues: number[] = Object.values(trRatings).map((v: any) => Number(v)).filter((v: number) => !isNaN(v) && v > 0);
                                                            const avgScore = ratingValues.length > 0 
                                                                ? (ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1) 
                                                                : '5.0';
                                                            const isExpanded = !!expandedReviews[tr.id];

                                                            return (
                                                                <div key={tr.id} className="py-2.5 space-y-2">
                                                                    <div className="flex flex-wrap justify-between items-center gap-2">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="font-bold text-slate-800 flex items-center gap-1">
                                                                                <span>👨‍🎓</span> {stName}
                                                                            </span>
                                                                            <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                                                                {tr.studentCode || 'HV'}
                                                                            </span>
                                                                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                                                                                ⭐ {avgScore}/5.0 ({ratingValues.length} tiêu chí)
                                                                            </span>
                                                                        </div>

                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] text-slate-400">
                                                                                {tr.createdAt || (tr.timestamp ? new Date(tr.timestamp).toLocaleDateString('vi-VN') : 'Mới nộp')}
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setExpandedReviews(prev => ({ ...prev, [tr.id]: !prev[tr.id] }))}
                                                                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                                                                                    isExpanded 
                                                                                        ? 'bg-slate-100 text-slate-700 border-slate-300' 
                                                                                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shadow-2xs'
                                                                                }`}
                                                                            >
                                                                                {isExpanded ? '▲ Thu gọn' : '👁️ Xem chi tiết đánh giá ▼'}
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Bảng chi tiết tiêu chí chỉ bung ra khi click xem */}
                                                                    {isExpanded && (
                                                                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-2 animate-in fade-in duration-150">
                                                                            <div className="text-[11px] font-bold text-slate-700">Chi tiết điểm đánh giá từng tiêu chí:</div>
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                                                                {Object.entries(trRatings).map(([critId, score]) => {
                                                                                    const crit = myCriteria.find((c: any) => c.id === critId);
                                                                                    return (
                                                                                        <div key={critId} className="bg-white text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[11px] flex justify-between items-center shadow-2xs">
                                                                                            <span className="font-medium truncate mr-2">{crit ? crit.name : critId}</span>
                                                                                            <span className="font-bold text-amber-600 shrink-0">{score as number} ★</span>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>

                                                                            {tr.comment && (
                                                                                <div className="text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 mt-1">
                                                                                    <span className="font-bold text-slate-800">💬 Góp ý của học viên: </span>
                                                                                    <span className="italic">"{tr.comment}"</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                                            Bạn chưa thiết lập tiêu chí riêng. Hãy bấm nút <b>"Tiêu chí đánh giá của tôi"</b> để đưa ra tiêu chí riêng cho học viên đánh giá.
                                        </div>
                                    )}
                                </div>

                                {/* Phần: Ý kiến đóng góp ẩn danh từ Học viên */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <h4 className="text-xs font-bold text-itc-900 uppercase mb-2.5 flex items-center gap-1.5">
                                        <Icons.Comments /> Ý kiến đóng góp ẩn danh từ Học viên:
                                    </h4>
                                    {cm.badComments && cm.badComments.length > 0 ? (
                                        <div className="space-y-3">
                                            {cm.badComments.map((rev: any, i: number) => {
                                                const existingTeacherNote = rev.teacherNotes?.[effectiveTeacherId] || rev.teacherNote;
                                                return (
                                                    <div key={i} className={`bg-white p-3 rounded-xl text-xs shadow-2xs border ${rev.isEscalated ? 'border-red-300 bg-red-50/20' : 'border-slate-200'}`}>
                                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                                            <div className="flex-1 text-slate-800 font-medium leading-relaxed">
                                                                "{rev.comment}"
                                                            </div>
                                                            {!rev.isEscalated ? (
                                                                <button 
                                                                    onClick={() => onEscalateReview(rev.id)}
                                                                    title="Báo cáo cho Admin xử lý"
                                                                    className="shrink-0 bg-red-50 text-red-600 px-2.5 py-1 rounded text-[10px] uppercase font-bold hover:bg-red-100 transition-colors flex items-center gap-1 border border-red-100"
                                                                >
                                                                    <Icons.AlertTriangle className="w-3 h-3" /> Báo cáo Admin
                                                                </button>
                                                            ) : (
                                                                <span className="shrink-0 text-red-600 px-2 py-1 text-[10px] uppercase font-bold flex items-center gap-1 bg-red-100 rounded border border-red-200">
                                                                    <Icons.AlertTriangle className="w-3 h-3" /> Đã báo cáo Admin
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Khu vực Ghi chú của Giảng viên */}
                                                        <div className="mt-2.5 pt-2 border-t border-slate-100">
                                                            {existingTeacherNote ? (
                                                                <div className="text-itc-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100 flex items-start gap-2">
                                                                    <span className="font-bold text-[11px] shrink-0">👨‍🏫 Ghi chú của bạn:</span>
                                                                    <span className="italic">{existingTeacherNote}</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex gap-2">
                                                                    <input 
                                                                        type="text" 
                                                                        placeholder="Thêm ghi chú cá nhân / giải trình cho phản ánh này..."
                                                                        className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-itc-500 bg-white"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                                                                onUpdateTeacherNote(rev.id, e.currentTarget.value.trim(), effectiveTeacherId);
                                                                            }
                                                                        }}
                                                                    />
                                                                    <button 
                                                                        className="bg-itc-800 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-itc-900 transition-colors shrink-0" 
                                                                        onClick={(e) => {
                                                                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                                            if (input.value.trim()) onUpdateTeacherNote(rev.id, input.value.trim(), effectiveTeacherId);
                                                                        }}
                                                                    >
                                                                        Lưu
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">Chưa có ý kiến nhận xét nào từ học viên.</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {teacherClasses.length === 0 && (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 text-xs">
                            Hiện bạn chưa được phân công lớp học nào tại Trung tâm.
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {sharingClass && (
                <ShareQRModal 
                    classId={sharingClass.id}
                    classCode={sharingClass.code}
                    courseName={sharingClass.name}
                    onClose={() => setSharingClass(null)}
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
                    currentUserRole="TEACHER"
                    currentTeacherId={effectiveTeacherId}
                    onClose={() => setViewingClassReviewsId(null)} 
                />
            )}

            {showRoomBookingModal && (
                <TeacherRoomBookingModal
                    teacherId={effectiveTeacherId}
                    teacherName={currentTeacher?.name || 'Giảng viên'}
                    classes={teacherClasses}
                    courses={courses}
                    allClasses={classes}
                    teachers={teachers}
                    roomBookings={roomBookings}
                    initialTab={bookingInitialTab}
                    onSubmitBooking={(newBooking) => {
                        if (onSubmitRoomBooking) onSubmitRoomBooking(newBooking);
                    }}
                    onCancelBooking={(bookingId) => {
                        if (onCancelRoomBooking) onCancelRoomBooking(bookingId);
                    }}
                    onClose={() => setShowRoomBookingModal(false)}
                />
            )}

            {showCriteriaModal && (
                <TeacherCriteriaModal 
                    teacherId={effectiveTeacherId}
                    teacherName={currentTeacher?.name || 'Giảng viên'}
                    teacherCriteria={teacherCriteria}
                    onSaveCriteria={(newCriteria) => {
                        if (onSaveTeacherCriteria) onSaveTeacherCriteria(newCriteria);
                    }}
                    onClose={() => setShowCriteriaModal(false)}
                />
            )}

            {viewingAttendanceClass && (
                <AttendanceModal 
                    classInfo={viewingAttendanceClass}
                    courseName={classes.find((c: any) => c.id === viewingAttendanceClass.id)?.code || ''}
                    attendances={attendances}
                    onClose={() => setViewingAttendanceClass(null)}
                />
            )}

            {viewingStudentsClass && (
                <ClassStudentsModal
                    classInfo={viewingStudentsClass.classInfo}
                    courseName={viewingStudentsClass.courseName}
                    students={students}
                    attendances={attendances}
                    reviews={reviews}
                    enrollments={enrollments}
                    effectiveTeacherId={effectiveTeacherId}
                    teacherCriteria={teacherCriteria}
                    studentGrades={studentGrades}
                    teachers={teachers}
                    onToggleAttendance={onToggleAttendance}
                    onClose={() => setViewingStudentsClass(null)}
                />
            )}

            {showNotifModal && (
                <TeacherNotificationModal
                    notifications={myNotifications}
                    onClose={() => setShowNotifModal(false)}
                    onMarkAllAsRead={onMarkTeacherNotificationsRead}
                />
            )}

            {gradeInputClass && (
                <GradeInputModal
                    classInfo={gradeInputClass.classInfo}
                    courseName={gradeInputClass.courseName}
                    enrollments={enrollments}
                    students={students}
                    existingGrades={studentGrades}
                    onSaveGrades={(classId, grades) => {
                        if (onSaveGrades) onSaveGrades(classId, grades);
                    }}
                    onClose={() => setGradeInputClass(null)}
                />
            )}
        </div>
    );
};
