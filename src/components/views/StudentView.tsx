import React, { useState, useEffect } from 'react';
import { Icons } from '../ui/Icons';
import { CenterSurveyScreen } from './CenterSurveyScreen';
import { TeacherSurveyModal } from '../modals/TeacherSurveyModal';
import { GPSAttendanceModal } from '../modals/GPSAttendanceModal';
import { getDeviceFingerprint } from '../../lib/deviceFingerprint';
import { ClassInfo, CriteriaCategory, TeacherCriterion, StudentNotification, Course } from '../../types';
import { checkStudentConflict, getDisplayStudentCode } from '../../lib/scheduleConflict';

interface StudentViewProps {
    currentUser?: any;
    classes: ClassInfo[];
    courses: Course[];
    teachers: any[];
    criteriaList: CriteriaCategory[];
    teacherCriteria: TeacherCriterion[];
    reviews: any[];
    attendances: any[];
    notifications: StudentNotification[];
    studentGrades: Record<string, any>;
    students?: any[];
    enrollments?: any[];
    unenrollRequests?: any[];
    onSaveSurvey: (surveyData: any) => void;
    onRegisterCourse?: (classCode: string, isEnroll: boolean) => void;
    onRequestUnenroll?: (classCode: string, reason?: string) => void;
    onSelfAttendance?: (classCode: string, gpsInfo?: any) => void;
    isCenterSurveyActive?: boolean;
}

const DEMO_STUDENTS = [
    { id: 'ITC2024001', name: 'Nguyễn Văn An', email: 'an.itc24@dlu.edu.vn', major: 'Khoa CNTT - ĐH Đà Lạt' },
    { id: 'ITC2024002', name: 'Trần Thị Mai', email: 'mai.itc24@dlu.edu.vn', major: 'Khoa Kinh tế & QTKD' },
    { id: 'ITC2024003', name: 'Lê Quốc Bảo', email: 'bao.itc24@dlu.edu.vn', major: 'Khoa Ngoại ngữ' }
];

export const StudentView = ({
    currentUser,
    classes,
    courses,
    teachers,
    criteriaList,
    teacherCriteria,
    reviews,
    attendances,
    notifications = [],
    studentGrades = {},
    students = [],
    enrollments = [],
    unenrollRequests = [],
    onSaveSurvey,
    onRegisterCourse,
    onRequestUnenroll,
    onSelfAttendance,
    isCenterSurveyActive = false
}: StudentViewProps) => {
    const [selectedStudent, setSelectedStudent] = useState(() => {
        if (currentUser) {
            return {
                id: currentUser.id || 'ITC2024001',
                code: currentUser.code,
                name: currentUser.name || 'Học viên ITC',
                email: currentUser.email || 'an.itc24@dlu.edu.vn',
                major: 'Khoa CNTT - ĐH Đà Lạt'
            };
        }
        return DEMO_STUDENTS[0];
    });
    const [activeTab, setActiveTab] = useState<'grades' | 'register' | 'schedule'>('grades');
    const [surveyClass, setSurveyClass] = useState<any>(null);
    const [gpsModalClass, setGpsModalClass] = useState<any>(null);
    const [showNotifModal, setShowNotifModal] = useState(false);
    const [notifList, setNotifList] = useState<StudentNotification[]>(notifications);

    useEffect(() => {
        if (Array.isArray(notifications)) {
            setNotifList(notifications);
        }
    }, [notifications]);
    const [enrolledClassCodes, setEnrolledClassCodes] = useState<string[]>(() => {
        const studentId = currentUser?.id;
        if (typeof window !== 'undefined' && studentId) {
            try {
                const saved = localStorage.getItem('itc_enrolled_' + studentId);
                if (saved) return JSON.parse(saved);
            } catch (e) {}
        }
        // Fallback: lọc từ enrollments prop nếu có
        if (enrollments && enrollments.length > 0 && currentUser?.id) {
            return enrollments
                .filter((e: any) => e.studentId === currentUser.id)
                .map((e: any) => e.classCode);
        }
        return [];
    });
    const [deviceId, setDeviceId] = useState('');
    const [completedTeacherSurveys, setCompletedTeacherSurveys] = useState<Record<string, boolean>>({});

    const unreadCount = notifList.filter(n => !n.isRead).length;

    const handleMarkAllRead = () => {
        setNotifList(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    // Trạng thái đã hoàn thành khảo sát Trung tâm
    const [centerSurveyDone, setCenterSurveyDone] = useState<boolean>(() => {
        const studentId = currentUser?.id || DEMO_STUDENTS[0].id;
        if (typeof window !== 'undefined') {
            return localStorage.getItem('itc_center_survey_done_' + studentId) === 'true';
        }
        return false;
    });

    useEffect(() => {
        setDeviceId(getDeviceFingerprint());
    }, []);

    // Lưu enrollment vào localStorage mỗi khi thay đổi
    useEffect(() => {
        const studentId = currentUser?.id;
        if (typeof window !== 'undefined' && studentId) {
            localStorage.setItem('itc_enrolled_' + studentId, JSON.stringify(enrolledClassCodes));
        }
    }, [enrolledClassCodes, currentUser?.id]);

    // Đồng bộ danh sách lớp học viên đăng ký từ server & loại bỏ các môn Admin đã duyệt hủy
    useEffect(() => {
        const studentId = currentUser?.id || selectedStudent.id;
        const studentCode = (currentUser as any)?.code || (selectedStudent as any)?.code;

        // Các lớp đã được Admin DUYỆT HỦY MÔN
        const approvedUnenrolls = new Set(
            (unenrollRequests || [])
                .filter((r: any) => 
                    (r.studentId === studentId || r.studentId === studentCode) && 
                    r.status === 'APPROVED'
                )
                .map((r: any) => r.classCode)
        );

        // Lấy danh sách đăng ký từ server enrollments (đã cập nhật khi đăng ký mới hoặc sau khi Admin duyệt hủy)
        const serverCodes = (enrollments || [])
            .filter((e: any) => (e.studentId === studentId || e.studentId === studentCode))
            .map((e: any) => e.classCode);

        // Đọc thêm từ localStorage nếu có, loại bỏ các môn cũ đã bị duyệt hủy nếu chưa đăng ký lại
        let localCodes: string[] = [];
        if (typeof window !== 'undefined' && studentId) {
            try {
                const saved = localStorage.getItem('itc_enrolled_' + studentId);
                if (saved) {
                    localCodes = JSON.parse(saved).filter((c: string) => serverCodes.includes(c) || !approvedUnenrolls.has(c));
                }
            } catch (e) {}
        }

        const merged = Array.from(new Set([...serverCodes, ...localCodes]));
        setEnrolledClassCodes(merged);
        if (typeof window !== 'undefined' && studentId) {
            localStorage.setItem('itc_enrolled_' + studentId, JSON.stringify(merged));
        }
    }, [enrollments, unenrollRequests, currentUser?.id, selectedStudent.id]);

    // Cập nhật trạng thái khảo sát Trung tâm khi student hoặc reviews thay đổi
    useEffect(() => {
        const sId = selectedStudent.id;
        const hasInReviews = reviews.some(r => 
            r.studentCode === sId && (r.isCenterSurvey || r.type === 'CENTER')
        );
        const localDone = typeof window !== 'undefined' && localStorage.getItem('itc_center_survey_done_' + sId) === 'true';
        setCenterSurveyDone(hasInReviews || localDone);
    }, [selectedStudent.id, reviews]);

    const handleCenterSurveySuccess = (surveyData: any) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('itc_center_survey_done_' + selectedStudent.id, 'true');
        }
        setCenterSurveyDone(true);
        onSaveSurvey(surveyData);
    };

    // Lấy danh sách ID các giảng viên ĐANG BẬT KHẢO SÁT trong lớp học này
    const getClassActiveTeacherIds = (cls: ClassInfo): string[] => {
        if ((cls as any).activeSurveyTeachers && Array.isArray((cls as any).activeSurveyTeachers)) {
            return (cls as any).activeSurveyTeachers;
        }
        if (cls.status === 'OPEN_SURVEY') {
            return [cls.teacherId, cls.teacherId2].filter(Boolean) as string[];
        }
        return [];
    };

    // Lấy danh sách tiêu chí đã duyệt của Giảng viên phụ trách lớp học này
    const getClassTeacherCriteria = (cls: ClassInfo) => {
        const activeTeacherIds = getClassActiveTeacherIds(cls);
        return (teacherCriteria || []).filter(
            tc => activeTeacherIds.includes(tc.teacherId) && tc.status === 'APPROVED'
        );
    };

    // Kiểm tra sinh viên đã nộp khảo sát cho TẤT CẢ giảng viên đang bật khảo sát của lớp này chưa
    const isTeacherSurveySubmitted = (cls: ClassInfo) => {
        const activeTeacherIds = getClassActiveTeacherIds(cls);
        // Nếu không có giảng viên nào bật khảo sát, coi như không bị chặn
        if (activeTeacherIds.length === 0) return true;

        if (completedTeacherSurveys[cls.id] || completedTeacherSurveys[cls.code]) return true;

        const sId = currentUser?.id || selectedStudent.id;
        const sCode = (currentUser as any)?.code || (selectedStudent as any)?.code;

        const studentClassReviews = reviews.filter(r => 
            (r.classId === cls.id || r.classCode === cls.code) && 
            (r.studentCode === sId || r.studentCode === sCode || r.studentId === sId || r.studentId === sCode) &&
            (r.isTeacherSurvey || r.type === 'TEACHER')
        );

        if (studentClassReviews.length === 0) {
            if (typeof window !== 'undefined') {
                const byId = localStorage.getItem(`itc_teacher_survey_done_${cls.id}_${sId}`) === 'true';
                const byCode = localStorage.getItem(`itc_teacher_survey_done_${cls.code}_${sId}`) === 'true';
                if (byId || byCode) return true;
            }
            return false;
        }

        // Với từng giảng viên đang bật khảo sát, kiểm tra xem đã có đánh giá chưa
        const allDone = activeTeacherIds.every(tId => {
            return studentClassReviews.some(r => {
                if (r.teacherRatings && r.teacherRatings[tId] && Object.keys(r.teacherRatings[tId]).length > 0) return true;
                if (r.teacherId === tId) return true;
                if (!r.teacherRatings && activeTeacherIds.length === 1) return true;
                return false;
            });
        });

        return allDone;
    };

    const handleTeacherSurveySuccess = (surveyData: any) => {
        if (typeof window !== 'undefined' && surveyClass) {
            localStorage.setItem(`itc_teacher_survey_done_${surveyClass.id}_${selectedStudent.id}`, 'true');
            localStorage.setItem(`itc_teacher_survey_done_${surveyClass.code}_${selectedStudent.id}`, 'true');
        }
        if (surveyClass) {
            setCompletedTeacherSurveys(prev => ({
                ...prev,
                [surveyClass.id]: true,
                [surveyClass.code]: true
            }));
        }
        onSaveSurvey(surveyData);
        setSurveyClass(null);
    };

    const [unenrollModalClass, setUnenrollModalClass] = useState<string | null>(null);
    const [unenrollReasonText, setUnenrollReasonText] = useState('');

    const handleConfirmRequestUnenroll = (classCode: string) => {
        if (onRequestUnenroll) {
            onRequestUnenroll(classCode, unenrollReasonText.trim());
        }
        setUnenrollModalClass(null);
        setUnenrollReasonText('');
    };

    const handleToggleEnroll = (classCode: string) => {
        // Nếu đã đăng ký và muốn hủy: Bắt buộc gửi yêu cầu xin hủy môn chờ Trung tâm duyệt
        if (enrolledClassCodes.includes(classCode)) {
            setUnenrollModalClass(classCode);
            return;
        }

        const targetClass = classes.find(c => c.code === classCode);
        if (!targetClass) return;

        // 1. KIỂM TRA SĨ SỐ LỚP HỌC
        const enrolledCount = enrollments.filter((e: any) => e.classCode === classCode).length ||
            (students || []).filter((s: any) => (s.enrolledClassCodes || []).includes(classCode)).length;
        const maxCapacity = targetClass.studentsCount || 10;

        if (enrolledCount >= maxCapacity) {
            alert(`⚠️ THÔNG BÁO: LỚP HỌC ĐÃ ĐỦ SĨ SỐ!\n\nLớp "${targetClass.code}" chỉ có sĩ số tối đa là ${maxCapacity} học viên (Hiện tại đã có ${enrolledCount}/${maxCapacity} bạn đăng ký).\n\nKhông thể đăng ký thêm vào lớp này! Vui lòng chọn lớp hoặc ca học khác.`);
            return;
        }

        // 2. Kiểm tra sinh viên có bị trùng giờ học không
        if (targetClass.schedule) {
            const conflict = checkStudentConflict(targetClass.schedule, enrolledClassCodes, classes);
            if (conflict.conflict) {
                alert(`🚫 TRÙNG LỊCH HỌC!\n${conflict.message}\nSinh viên có thể học nhiều môn nhưng không thể học cùng giờ!`);
                return;
            }
        }

        setEnrolledClassCodes(prev => [...prev, classCode]);
        // Gọi callback để lưu server và gửi thông báo cho GV/Admin
        if (onRegisterCourse) onRegisterCourse(classCode, true);
    };

    // Đăng ký môn học (dành cho môn chưa có lớp hoặc đăng ký môn chờ xếp lịch)
    const handleToggleEnrollCourse = (courseCode: string) => {
        const targetCourse = courses.find(c => c.code === courseCode || c.id === courseCode);
        const codeToUse = targetCourse?.code || courseCode;
        const idToMatch = targetCourse?.id;
        const isEnrolled = enrolledClassCodes.some(c => c === codeToUse || (idToMatch && c === idToMatch));

        if (isEnrolled) {
            setEnrolledClassCodes(prev => prev.filter(c => c !== codeToUse && (!idToMatch || c !== idToMatch)));
            if (onRegisterCourse) onRegisterCourse(codeToUse, false);
        } else {
            setEnrolledClassCodes(prev => [...prev, codeToUse]);
            if (onRegisterCourse) onRegisterCourse(codeToUse, true);
        }
    };

    // Lọc các lớp sinh viên đang học (đã có lịch học cụ thể)
    const myClasses = classes.filter(c => enrolledClassCodes.includes(c.code));

    // Lọc các môn học viên đã đăng ký nhưng đang chờ xếp lớp & lịch học
    const pendingEnrolledCourses = courses.filter(course => {
        const isRegistered = (course.code ? enrolledClassCodes.includes(course.code) : false) || enrolledClassCodes.includes(course.id);
        const hasSpecificClass = classes.some(c => 
            (c.courseId === course.id || (course.code && c.courseId === course.code)) && enrolledClassCodes.includes(c.code)
        );
        return isRegistered && !hasSpecificClass;
    });

    // ==========================================
    // YÊU CẦU 1: NẾU ADMIN CỦA TRUNG TÂM ĐƯA RA KHẢO SÁT
    // Khi sinh viên đăng nhập vào hệ thống thì BẮT BUỘC PHẢI LÀM KHẢO SÁT
    // thì mới được thao tác các chức năng còn lại trong giao diện sinh viên.
    // ==========================================
    const isCenterSurveyBlocking = isCenterSurveyActive === true && (criteriaList || []).length > 0 && !centerSurveyDone;

    if (isCenterSurveyBlocking) {
        return (
            <CenterSurveyScreen
                student={selectedStudent}
                criteriaList={criteriaList}
                onSubmitSuccess={handleCenterSurveySuccess}
            />
        );
    }

    return (
        <div className="flex-1 bg-slate-50 p-4 lg:p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header Sinh viên & Chuông thông báo */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-itc-800 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-itc-50 text-itc-800 border border-itc-200 flex items-center justify-center text-xl font-black shrink-0">
                            🎓
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base lg:text-lg font-bold text-itc-900">
                                    Cổng Thông tin Học viên ITC - Đại học Đà Lạt
                                </h2>
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    Sinh viên
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Tra cứu điểm số, làm khảo sát chất lượng khóa học và đăng ký lịch học phòng máy.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Thông tin học viên đăng nhập */}
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[11px] font-semibold text-slate-500">Học viên:</span>
                            <b className="text-xs text-itc-900">{selectedStudent.name}</b>
                            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-bold" title={selectedStudent.id}>
                                {getDisplayStudentCode(currentUser || selectedStudent, students)}
                            </span>
                        </div>

                        {/* Chuông thông báo */}
                        <button
                            onClick={() => setShowNotifModal(true)}
                            className="relative p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-slate-700"
                            title="Xem thông báo từ Trung tâm & Giảng viên"
                        >
                            <Icons.Bell className="w-5 h-5 text-itc-800" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce shadow-xs">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setActiveTab('grades')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'grades'
                                ? 'bg-itc-800 text-white shadow-soft scale-105'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <Icons.CheckCircle className="w-4 h-4 text-emerald-400" />
                        Tra cứu Bảng điểm & Khảo sát ({myClasses.length + pendingEnrolledCourses.length} môn)
                    </button>

                    <button
                        onClick={() => setActiveTab('register')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'register'
                                ? 'bg-itc-800 text-white shadow-soft scale-105'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <Icons.Plus className="w-4 h-4" />
                        Đăng ký Khóa học ({courses.length} môn mở)
                    </button>

                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'schedule'
                                ? 'bg-itc-800 text-white shadow-soft scale-105'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <Icons.Calendar className="w-4 h-4" />
                        Thời khóa biểu & Phòng học ({myClasses.length + pendingEnrolledCourses.length})
                    </button>
                </div>

                {/* TAB 1: TRA CỨU ĐIỂM & KHẢO SÁT */}
                {activeTab === 'grades' && (
                    <div className="space-y-5">
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-start gap-3">
                            <span className="p-1.5 bg-blue-100 text-blue-800 rounded-lg shrink-0 text-base">ℹ️</span>
                            <div className="text-xs text-slate-700 leading-relaxed">
                                <p className="font-bold text-sm text-slate-900">Quy chế Khảo sát & Tra cứu Bảng điểm:</p>
                                <p className="mt-0.5">
                                    - <b>Khảo sát Trung tâm (Admin):</b> Khi Trung tâm đưa ra khảo sát chất lượng định kỳ, sinh viên phải hoàn thành ngay khi đăng nhập mới có thể truy cập các tính năng của Cổng sinh viên.
                                </p>
                                <p className="mt-0.5">
                                    - <b>Khảo sát Giảng viên theo Lớp:</b> Đối với từng lớp học, nếu Giảng viên đưa ra tiêu chí khảo sát, sinh viên bắt buộc hoàn thành phiếu khảo sát của giảng viên đó thì mới được xem thông tin chi tiết và bảng điểm.
                                </p>
                            </div>
                        </div>

                        {myClasses.map((cls) => {
                            const course = courses.find(c => c.id === cls.courseId);
                            const t1 = teachers.find(t => t.id === cls.teacherId);
                            const t2 = teachers.find(t => t.id === cls.teacherId2);

                            // Lấy danh sách tiêu chí của giảng viên lớp này
                            const classTeacherCriteria = getClassTeacherCriteria(cls);
                            const hasTeacherSurvey = classTeacherCriteria.length > 0;
                            const teacherSurveyDone = isTeacherSurveySubmitted(cls);
                            const canAccess = !hasTeacherSurvey || teacherSurveyDone;

                            // Tìm kiếm điểm chính xác do giảng viên đã nhập
                            const sId = currentUser?.id || selectedStudent.id;
                            const sCode = (currentUser as any)?.code || (selectedStudent as any)?.code;
                            const grade = studentGrades[`${cls.id}_${sId}`]
                                || studentGrades[`${cls.code}_${sId}`]
                                || (sCode && studentGrades[`${cls.id}_${sCode}`])
                                || (sCode && studentGrades[`${cls.code}_${sCode}`])
                                || Object.values(studentGrades).find((g: any) => 
                                    (g.classId === cls.id || g.classCode === cls.code) &&
                                    (g.studentId === sId || g.studentCode === sId || (sCode && (g.studentId === sCode || g.studentCode === sCode)) || g.studentName === selectedStudent.name)
                                );

                            const today = new Date().toLocaleDateString('vi-VN');
                            const todayAtt = attendances.find(a => 
                                (a.studentCode === sId || a.studentCode === sCode || a.studentId === sId) && 
                                (a.classId === cls.id || a.classCode === cls.code) &&
                                a.date === today &&
                                a.isPresent
                            );

                            const isAttended = !!todayAtt || attendances.some(a => 
                                (a.studentCode === sId || a.studentCode === sCode || a.studentId === sId) && 
                                (a.classId === cls.id || a.classCode === cls.code) &&
                                a.isPresent
                            ) || teacherSurveyDone;

                            return (
                                <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 lg:p-6 space-y-4 hover:border-itc-300 transition">
                                    {/* Class Header */}
                                    <div className="flex flex-wrap justify-between items-start gap-3 border-b border-slate-100 pb-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-base text-itc-900">{cls.code} - {course?.name || 'Khóa học'}</span>
                                                <span className="bg-itc-100 text-itc-800 text-[11px] font-bold px-2 py-0.5 rounded-md">
                                                    {cls.room}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Lịch học: <b>{cls.schedule}</b>
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1.5">
                                                {t1 && (
                                                    <span className="flex items-center gap-1">
                                                        👨‍🏫 GV1: <b>{t1.name}</b> ({cls.teacherRole1 || 'Lý thuyết'})
                                                    </span>
                                                )}
                                                {t2 && (
                                                    <span className="flex items-center gap-1">
                                                        👩‍🏫 GV2: <b>{t2.name}</b> ({cls.teacherRole2 || 'Thực hành'})
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Survey & Attendance Status */}
                                        <div className="flex flex-col items-end gap-2">
                                            {teacherSurveyDone ? (
                                                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
                                                    <Icons.CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Đã hoàn thành khảo sát GV
                                                </span>
                                            ) : !hasTeacherSurvey ? (
                                                <span className="bg-sky-50 text-sky-700 text-xs font-bold px-3 py-1 rounded-xl border border-sky-200 flex items-center gap-1">
                                                    <span>🔓</span> Bảng điểm mở (Không có khảo sát GV)
                                                </span>
                                            ) : (
                                                <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-xl border border-amber-200 flex items-center gap-1 animate-pulse">
                                                    🔒 Khảo sát Giảng viên bắt buộc
                                                </span>
                                            )}

                                            {/* Phần điểm danh: Giảng viên điểm danh hoặc Học viên tự điểm danh tại Trung tâm qua GPS */}
                                            {todayAtt ? (
                                                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                                                    <Icons.CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                    Đã điểm danh hôm nay ({todayAtt.submittedAt || 'Có mặt'})
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setGpsModalClass(cls)}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1.5 animate-pulse"
                                                        title="Bấm để xác thực GPS và tự điểm danh khi bạn đang có mặt tại phòng học của Trung tâm ITC"
                                                    >
                                                        <span>📍</span> Tự điểm danh (GPS Phòng máy)
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Grade Area: Locked or Unlocked */}
                                    {!canAccess ? (
                                        <div className="bg-amber-50/70 p-6 rounded-2xl border-2 border-dashed border-amber-300 text-center space-y-3">
                                            <div className="w-14 h-14 bg-white rounded-2xl mx-auto flex items-center justify-center text-2xl shadow-xs border border-amber-200">
                                                👨‍🏫
                                            </div>
                                            <div>
                                                <span className="bg-amber-100 text-amber-900 font-extrabold text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full inline-block mb-1">
                                                    BẮT BUỘC KHẢO SÁT GIẢNG VIÊN ĐỂ XEM ĐIỂM
                                                </span>
                                                <h4 className="font-bold text-sm text-slate-800">
                                                    Bảng điểm & Chi tiết môn {course?.name || cls.code} đang bị khóa
                                                </h4>
                                                <p className="text-xs text-slate-600 max-w-lg mx-auto mt-1 leading-relaxed">
                                                    Giảng viên giảng dạy môn học này ({t1?.name}{t2 ? ` & ${t2.name}` : ''}) đã đưa ra <b>{classTeacherCriteria.length} tiêu chí khảo sát chất lượng giảng dạy</b>.
                                                    {getClassActiveTeacherIds(cls).length > 1 && (
                                                        <span className="block mt-1 text-indigo-800 font-bold">
                                                            👥 Lớp học có 2 giảng viên ({t1?.name} & {t2?.name}) cùng đưa ra khảo sát. Bạn cần hoàn thành đánh giá cả 2 giảng viên để mở khóa bảng điểm!
                                                        </span>
                                                    )}
                                                    Quy chế yêu cầu bạn phải hoàn thành phiếu khảo sát này thì mới được xem chi tiết điểm số và thông tin môn học.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setSurveyClass(cls)}
                                                className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-md inline-flex items-center gap-2 transform hover:scale-105"
                                            >
                                                <Icons.CheckCircle className="w-4 h-4 text-emerald-400" />
                                                Làm Khảo sát Giảng viên ({classTeacherCriteria.length} Tiêu chí{getClassActiveTeacherIds(cls).length > 1 ? ' - 2 Giảng viên' : ''})
                                            </button>
                                        </div>
                                    ) : (
                                        grade ? (
                                            <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200 space-y-3">
                                                <div className="flex justify-between items-center border-b border-emerald-100 pb-2">
                                                    <span className="text-xs font-bold uppercase text-emerald-900 tracking-wider">
                                                        📊 Bảng điểm chi tiết (Đã mở khóa):
                                                    </span>
                                                    <span className="bg-emerald-600 text-white font-black text-xs px-2.5 py-0.5 rounded-md">
                                                        {grade.isPassed ? 'KẾT QUẢ: ĐẠT' : 'CHƯA ĐẠT'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                                                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                                                        <p className="text-[10px] text-slate-500 font-semibold">Chuyên cần (10%)</p>
                                                        <p className="text-base font-black text-slate-800 mt-0.5">{grade.attendanceScore}</p>
                                                    </div>
                                                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                                                        <p className="text-[10px] text-slate-500 font-semibold">Thực hành Lab (30%)</p>
                                                        <p className="text-base font-black text-slate-800 mt-0.5">{grade.labScore}</p>
                                                    </div>
                                                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                                                        <p className="text-[10px] text-slate-500 font-semibold">Lý thuyết GK (20%)</p>
                                                        <p className="text-base font-black text-slate-800 mt-0.5">{grade.midtermScore}</p>
                                                    </div>
                                                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                                                        <p className="text-[10px] text-slate-500 font-semibold">Thi Thực hành CK (40%)</p>
                                                        <p className="text-base font-black text-slate-800 mt-0.5">{grade.finalScore}</p>
                                                    </div>
                                                    <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-xs">
                                                        <p className="text-[10px] text-emerald-100 font-bold uppercase">Tổng kết (Hệ 10)</p>
                                                        <p className="text-lg font-black mt-0.5">{grade.totalScore} ({grade.letterGrade})</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
                                                <p className="text-xs font-bold text-slate-700">⏳ Giảng viên chưa nhập bảng điểm cho lớp này</p>
                                                <p className="text-[11px] text-slate-500">Bảng điểm sẽ tự động hiển thị ngay khi giảng viên hoàn tất nhập điểm.</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            );
                        })}

                        {/* Khối hiển thị môn học đăng ký chờ xếp lịch & phòng máy */}
                        {pendingEnrolledCourses.length > 0 && (
                            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 lg:p-5 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                                    <h4 className="font-bold text-xs lg:text-sm text-amber-900 uppercase">
                                        Môn học đã đăng ký - Đang chờ Trung tâm xếp lịch & phòng máy ({pendingEnrolledCourses.length})
                                    </h4>
                                </div>
                                <p className="text-xs text-amber-800">
                                    Các môn học dưới đây bạn đã đăng ký thành công. Ngay khi Trung tâm sắp xếp lịch học và phòng máy, hệ thống sẽ tự động cập nhật thời khóa biểu, gửi thông báo và mở chức năng điểm danh & khảo sát tại đây.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                    {pendingEnrolledCourses.map(c => (
                                        <div key={c.id} className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex justify-between items-center">
                                            <div>
                                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 uppercase">
                                                    {c.code}
                                                </span>
                                                <h5 className="font-bold text-xs text-slate-900 mt-1">{c.name}</h5>
                                                <p className="text-[11px] text-slate-500">{c.duration || '45 tiết'}</p>
                                            </div>
                                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                                ⏳ Chờ xếp lịch
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {myClasses.length === 0 && pendingEnrolledCourses.length === 0 && (
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                                <span className="text-3xl">📚</span>
                                <h4 className="font-bold text-sm text-slate-800">Bạn chưa đăng ký môn học nào</h4>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                    Vui lòng chuyển sang tab &quot;Đăng ký Khóa học&quot; để chọn các môn học hoặc chứng chỉ đang mở tại Trung tâm ITC.
                                </p>
                                <button
                                    onClick={() => setActiveTab('register')}
                                    className="px-4 py-2 bg-itc-800 text-white rounded-xl text-xs font-bold hover:bg-itc-900 transition"
                                >
                                    Xem danh sách môn học ngay
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: ĐĂNG KÝ KHÓA HỌC */}
                {activeTab === 'register' && (
                    <div className="space-y-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            <div>
                                <h3 className="font-bold text-sm text-itc-900 uppercase mb-1">
                                    Danh mục Tất cả Khóa học & Lớp học tại Trung tâm ITC
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Hiển thị tất cả <b>{courses.length}</b> môn học có trong Trung tâm. Đăng ký nhanh để được xếp vào lớp học máy và nhận thông báo lịch học.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-200">
                                    {classes.length} Lớp đã có lịch
                                </span>
                                <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg font-bold border border-amber-200">
                                    {courses.filter(c => !classes.some(cls => cls.courseId === c.id || cls.courseId === c.code)).length} Môn chờ xếp lịch
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {courses.map((course) => {
                                const courseClasses = classes.filter(cls => cls.courseId === course.id || cls.courseId === course.code);

                                // TRƯỜNG HỢP 1: MÔN ĐÃ CÓ LỚP HỌC MỞ (có lịch học & phòng máy)
                                if (courseClasses.length > 0) {
                                    return courseClasses.map((cls) => {
                                        const t1 = teachers.find(t => t.id === cls.teacherId);
                                        const t2 = teachers.find(t => t.id === cls.teacherId2);
                                        const isEnrolled = enrolledClassCodes.includes(cls.code);
                                        
                                        const enrolledCount = enrollments.filter((e: any) => e.classCode === cls.code).length ||
                                            (students || []).filter((s: any) => (s.enrolledClassCodes || []).includes(cls.code)).length;
                                        const maxCapacity = cls.studentsCount || 10;
                                        const isFull = enrolledCount >= maxCapacity;

                                        const sId = currentUser?.id || selectedStudent.id;
                                        const sCode = (currentUser as any)?.code || (selectedStudent as any)?.code;
                                        const isPendingUnenroll = (unenrollRequests || []).some(
                                            (r: any) => (r.studentId === sId || r.studentId === sCode || r.studentCode === sCode || r.studentCode === sId) &&
                                                r.classCode === cls.code &&
                                                r.status === 'PENDING'
                                        );

                                        return (
                                            <div key={cls.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-itc-300 transition space-y-3.5 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="bg-itc-50 text-itc-800 text-[10px] font-bold px-2 py-0.5 rounded border border-itc-200 uppercase">
                                                                    {cls.code}
                                                                </span>
                                                                <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">
                                                                    {course.code}
                                                                </span>
                                                            </div>
                                                            <h4 className="font-bold text-base text-itc-900 mt-1">{course.name}</h4>
                                                        </div>
                                                        <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                                                            {cls.room}
                                                        </span>
                                                    </div>

                                                    <div className="text-xs text-slate-600 space-y-1.5 mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                        <p className="flex items-center gap-1.5">
                                                            <Icons.Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                            Lịch học: <b>{cls.schedule}</b>
                                                        </p>
                                                        <p className="flex items-center gap-1.5">
                                                            <Icons.User className="w-3.5 h-3.5 text-slate-400" />
                                                            GV Lý thuyết: <b>{t1 ? t1.name : 'Giảng viên ITC'}</b>
                                                        </p>
                                                        {t2 && (
                                                            <p className="flex items-center gap-1.5">
                                                                <Icons.User className="w-3.5 h-3.5 text-slate-400" />
                                                                GV Thực hành Lab: <b>{t2.name}</b>
                                                            </p>
                                                        )}
                                                        <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center text-[11px]">
                                                            <span className="text-slate-500 font-semibold">Tình trạng sĩ số:</span>
                                                            <span className={`font-bold px-2 py-0.5 rounded-md ${
                                                                isFull ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                                            }`}>
                                                                {isFull ? `🔴 ĐÃ ĐỦ SĨ SỐ (${enrolledCount}/${maxCapacity})` : `🟢 Còn chỗ (${enrolledCount}/${maxCapacity} HV)`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => !isPendingUnenroll && handleToggleEnroll(cls.code)}
                                                    disabled={isPendingUnenroll}
                                                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                                        isPendingUnenroll
                                                            ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-not-allowed shadow-2xs font-black'
                                                            : isEnrolled
                                                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                                                            : isFull
                                                            ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                                            : 'bg-itc-800 hover:bg-itc-900 text-white shadow-xs'
                                                    }`}
                                                >
                                                    {isPendingUnenroll ? (
                                                        <><span>⏳</span> Chờ Trung tâm duyệt hủy môn</>
                                                    ) : isEnrolled ? (
                                                        <><span>📩</span> Xin hủy môn (Chờ duyệt)</>
                                                    ) : isFull ? (
                                                        `⚠️ Đã đủ sĩ số (${enrolledCount}/${maxCapacity}) - Bấm xem cảnh báo`
                                                    ) : (
                                                        '✓ Đăng ký tham gia lớp học'
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    });
                                }

                                // TRƯỜNG HỢP 2: MÔN CHƯA CÓ LỚP HỌC (Đang mở đăng ký chờ xếp lịch & phòng máy)
                                const isCourseEnrolled = enrolledClassCodes.some(c => c === course.code || c === course.id);

                                return (
                                    <div key={course.id} className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-2xs hover:border-amber-300 transition space-y-3.5 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300 uppercase">
                                                            {course.code}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                                            course.type === 'CERTIFICATE' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                        }`}>
                                                            {course.type === 'CERTIFICATE' ? 'Khóa Chứng chỉ' : 'Môn Chính quy'}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-base text-itc-900 mt-1">{course.name}</h4>
                                                </div>
                                                <span className="bg-amber-50 text-amber-800 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-amber-200 whitespace-nowrap">
                                                    ⏳ Chờ xếp lịch
                                                </span>
                                            </div>

                                            <div className="text-xs text-slate-600 space-y-2 mt-3 bg-amber-50/40 p-3.5 rounded-xl border border-amber-100">
                                                <p className="flex items-center gap-1.5 text-slate-700">
                                                    <Icons.Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                                    Thời lượng: <b>{course.duration || '45 tiết (30 LT - 15 TH, 6 tuần)'}</b>
                                                </p>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    {course.description || 'Chương trình đào tạo chất lượng cao tại Trung tâm Công nghệ Thông tin - Đại học Đà Lạt.'}
                                                </p>
                                                <div className="pt-2 border-t border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-1.5">
                                                    <span className="shrink-0 text-amber-600">💡</span>
                                                    <span>
                                                        Học viên đăng ký trước môn này sẽ nhận được <b>thông báo lịch học & phòng máy</b> ngay khi Trung tâm mở lớp và tự động thêm vào Thời khóa biểu.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {isCourseEnrolled ? (
                                            <div className="space-y-2 pt-1">
                                                <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl text-center">
                                                    <span className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                                                        <span>✅</span> Đã đăng ký môn học (Chờ xếp lịch & phòng máy)
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleToggleEnrollCourse(course.code || course.id)}
                                                    className="w-full py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-slate-600 border border-slate-200 transition"
                                                >
                                                    ✕ Hủy đăng ký môn này
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleToggleEnrollCourse(course.code || course.id)}
                                                className="w-full py-2.5 rounded-xl text-xs font-bold bg-itc-800 hover:bg-itc-900 text-white shadow-xs transition flex items-center justify-center gap-1.5"
                                            >
                                                <span>✓</span> Đăng ký môn học này (Chờ xếp lịch)
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* TAB 3: THỜI KHÓA BIỂU & PHÒNG HỌC */}
                {activeTab === 'schedule' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 lg:p-6 space-y-4">
                        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                                <h3 className="font-bold text-base text-itc-900">Thời khóa biểu & Phòng học Máy trong tuần</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Lịch học và phòng máy các môn bạn đã đăng ký tại Trung tâm Công nghệ Thông tin - Đại học Đà Lạt.
                                </p>
                            </div>
                            <span className="text-xs font-bold text-itc-800 bg-itc-50 px-3 py-1.5 rounded-xl border border-itc-200">
                                Tổng cộng: {myClasses.length + pendingEnrolledCourses.length} môn đã đăng ký
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                                        <th className="p-3 whitespace-nowrap">Mã lớp / Mã môn</th>
                                        <th className="p-3 min-w-[180px]">Tên môn học</th>
                                        <th className="p-3 whitespace-nowrap">Lịch học / Ca học</th>
                                        <th className="p-3 whitespace-nowrap">Phòng máy</th>
                                        <th className="p-3 whitespace-nowrap min-w-[160px]">Giảng viên giảng dạy</th>
                                        <th className="p-3 whitespace-nowrap min-w-[140px]">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {/* Danh sách lớp đã có lịch học cụ thể */}
                                    {myClasses.map((cls) => {
                                        const course = courses.find(c => c.id === cls.courseId || c.code === cls.courseId);
                                        const t1 = teachers.find(t => t.id === cls.teacherId);
                                        const t2 = teachers.find(t => t.id === cls.teacherId2);

                                        return (
                                            <tr key={cls.id} className="hover:bg-slate-50/70">
                                                <td className="p-3 font-bold text-itc-900 whitespace-nowrap">
                                                    <span className="bg-itc-50 text-itc-800 px-2 py-0.5 rounded border border-itc-200 font-mono">
                                                        {cls.code}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-semibold text-slate-800">{course?.name || cls.code}</td>
                                                <td className="p-3 text-slate-700 font-medium whitespace-nowrap">{cls.schedule}</td>
                                                <td className="p-3 whitespace-nowrap">
                                                    <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-md font-bold border border-blue-200">
                                                        {cls.room}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-slate-600 whitespace-nowrap">
                                                    {t1?.name} {t2 ? `& ${t2.name}` : ''}
                                                </td>
                                                <td className="p-3 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold text-[11px] border border-emerald-200 whitespace-nowrap shadow-2xs">
                                                        🟢 Đang diễn ra
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {/* Danh sách môn đã đăng ký đang chờ xếp lịch */}
                                    {pendingEnrolledCourses.map((course) => (
                                        <tr key={course.id} className="hover:bg-amber-50/50 bg-amber-50/20">
                                            <td className="p-3 whitespace-nowrap">
                                                <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300 font-mono font-bold">
                                                    {course.code}
                                                </span>
                                            </td>
                                            <td className="p-3 font-bold text-itc-900">{course.name}</td>
                                            <td className="p-3 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg font-bold border border-amber-200 whitespace-nowrap">
                                                    ⏳ Đang chờ xếp lịch học
                                                </span>
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg font-bold border border-amber-200 whitespace-nowrap">
                                                    ⏳ Chờ bố trí phòng máy
                                                </span>
                                            </td>
                                            <td className="p-3 text-slate-500 italic whitespace-nowrap">
                                                Trung tâm ITC phân công
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full font-bold text-[11px] border border-amber-300 whitespace-nowrap shadow-2xs">
                                                    ⏳ Chờ mở lớp
                                                </span>
                                            </td>
                                        </tr>
                                    ))}

                                    {myClasses.length === 0 && pendingEnrolledCourses.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center p-8 text-slate-500">
                                                <p className="font-semibold text-slate-700 mb-1">Chưa có môn học trong Thời khóa biểu</p>
                                                <p className="text-xs text-slate-400">Vui lòng chuyển sang tab &quot;Đăng ký Khóa học&quot; để đăng ký các môn học mong muốn.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
                            <span className="text-base text-itc-800">💡</span>
                            <p>
                                <b>Lưu ý:</b> Đối với các môn học đang ở trạng thái <b>&quot;Chờ mở lớp&quot;</b>, hệ thống sẽ tự động cập nhật Lịch học và Phòng máy chính thức ngay khi Trung tâm xếp lịch, đồng thời gửi thông báo trực tiếp đến bạn qua biểu tượng Chuông thông báo.
                            </p>
                        </div>
                    </div>
                )}

                {/* MODAL THÔNG BÁO CHO SINH VIÊN */}
                {showNotifModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="bg-itc-800 p-5 text-white flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Icons.Bell className="w-5 h-5 text-amber-300" />
                                    <h3 className="font-bold text-base">Thông báo của bạn ({notifList.length})</h3>
                                </div>
                                <button
                                    onClick={() => setShowNotifModal(false)}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                                >
                                    <Icons.Plus className="w-5 h-5 rotate-45" />
                                </button>
                            </div>

                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <span className="text-xs text-slate-500">
                                    {unreadCount} thông báo chưa đọc
                                </span>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-xs font-bold text-itc-700 hover:text-itc-900 hover:underline"
                                    >
                                        Đánh dấu tất cả đã đọc
                                    </button>
                                )}
                            </div>

                            <div className="p-5 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
                                {notifList.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`p-4 rounded-2xl border transition space-y-2 ${
                                            n.isRead ? 'bg-white border-slate-200' : 'bg-blue-50/50 border-blue-200 shadow-2xs'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className="font-bold text-xs text-slate-800 leading-snug">{n.title}</h4>
                                            <span className="text-[10px] text-slate-400 shrink-0">{n.date}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>
                                        <div className="flex items-center gap-2 pt-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                                n.sender === 'CENTER' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                            }`}>
                                                {n.sender === 'CENTER' ? '🏢 Trung tâm ITC' : '👨‍🏫 Giảng viên'}
                                            </span>
                                            <span className="text-[11px] text-slate-500 font-medium">
                                                Gửi bởi: {n.senderName}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
                                <button
                                    onClick={() => setShowNotifModal(false)}
                                    className="bg-slate-800 text-white font-bold text-xs px-5 py-2 rounded-xl"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL KHẢO SÁT GIẢNG VIÊN */}
                {surveyClass && (
                    <TeacherSurveyModal
                        classInfo={surveyClass}
                        courseName={courses.find(c => c.id === surveyClass.courseId)?.name || 'Môn học'}
                        student={selectedStudent}
                        teacherCriteria={teacherCriteria}
                        teachers={teachers}
                        onSubmitSuccess={handleTeacherSurveySuccess}
                        onClose={() => setSurveyClass(null)}
                    />
                )}

                {/* MODAL XÁC THỰC GPS TỰ ĐIỂM DANH TẠI PHÒNG MÁY TRUNG TÂM */}
                {gpsModalClass && (
                    <GPSAttendanceModal
                        classCode={gpsModalClass.code}
                        courseName={courses.find(c => c.id === gpsModalClass.courseId)?.name || gpsModalClass.code}
                        studentName={selectedStudent.name}
                        onConfirmAttendance={(gpsInfo) => {
                            if (onSelfAttendance) {
                                onSelfAttendance(gpsModalClass.code, gpsInfo);
                            }
                            setGpsModalClass(null);
                        }}
                        onClose={() => setGpsModalClass(null)}
                    />
                )}

                {/* MODAL XIN HỦY MÔN HỌC */}
                {unenrollModalClass && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-100 animate-in zoom-in-95">
                            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                                <span className="p-2 bg-rose-50 text-rose-600 rounded-xl text-lg">📝</span>
                                <div>
                                    <h4 className="font-bold text-base text-slate-900">Yêu cầu Xin Hủy Môn học</h4>
                                    <p className="text-xs text-slate-500">Lớp: <b className="text-itc-900">{unenrollModalClass}</b></p>
                                </div>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900">
                                <b>Quy chế Trung tâm ITC:</b> Học viên không thể tự ý hủy môn ngay lập tức. Sau khi gửi yêu cầu, Trung tâm Quản lý sẽ xem xét và phê duyệt đơn xin hủy môn của bạn.
                            </p>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 block">
                                    Lý do xin rút / hủy môn học:
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="VD: Trùng lịch học chuyên ngành, bận việc cá nhân, muốn đổi sang lớp khác..."
                                    value={unenrollReasonText}
                                    onChange={e => setUnenrollReasonText(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:border-itc-500 outline-none bg-slate-50"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUnenrollModalClass(null);
                                        setUnenrollReasonText('');
                                    }}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                                >
                                    Đóng / Hủy bỏ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleConfirmRequestUnenroll(unenrollModalClass)}
                                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
                                >
                                    Gửi yêu cầu tới Trung tâm
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
