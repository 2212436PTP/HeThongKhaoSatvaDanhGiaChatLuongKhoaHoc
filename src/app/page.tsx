"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Icons } from '../components/ui/Icons';
import { AdminView } from '../components/views/AdminView';
import { TeacherView } from '../components/views/TeacherView';
import { StudentView } from '../components/views/StudentView';
import { LoginView } from '../components/views/LoginView';
import { ReportModal } from '../components/modals/ReportModal';
import { ChangePasswordModal } from '../components/modals/ChangePasswordModal';
import { supabase } from '../lib/supabaseClient';
import { INITIAL_CLASSES, INITIAL_COURSES, INITIAL_TEACHERS, INITIAL_STUDENTS, CRITERIA_CATEGORIES, INITIAL_REVIEWS, INITIAL_TEACHER_CRITERIA, INITIAL_ATTENDANCE, INITIAL_ROOM_BOOKINGS, INITIAL_NOTIFICATIONS, INITIAL_STUDENT_GRADES } from '../data/mockData';

export default function App() {
    const [courses, setCourses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>(INITIAL_STUDENTS);
    const [classes, setClasses] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [criteriaList, setCriteriaList] = useState<any[]>([]);
    const [teacherCriteria, setTeacherCriteria] = useState<any[]>(INITIAL_TEACHER_CRITERIA);
    const [attendances, setAttendances] = useState<any[]>(INITIAL_ATTENDANCE);
    const [roomBookings, setRoomBookings] = useState<any[]>(INITIAL_ROOM_BOOKINGS);
    const [notifications, setNotifications] = useState<any[]>(INITIAL_NOTIFICATIONS);
    const [teacherNotifications, setTeacherNotifications] = useState<any[]>([]);
    const [studentGrades, setStudentGrades] = useState<any>(INITIAL_STUDENT_GRADES);
    const [isCenterSurveyActive, setIsCenterSurveyActive] = useState<boolean>(false);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [unenrollRequests, setUnenrollRequests] = useState<any[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    
    const [isMounted, setIsMounted] = useState(false);
    const [role, setRole] = useState('ADMIN'); // ADMIN, TEACHER, STUDENT
    const [warningThreshold, setWarningThreshold] = useState(3.0);
    const [toastMessage, setToastMessage] = useState('');
    const [showReport, setShowReport] = useState(false);

    // Auth & Context States
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

    const handleSetUserSession = (user: any, userRole: string, teacherId?: string) => {
        setCurrentUser(user);
        setRole(userRole);
        if (teacherId) setSelectedTeacherId(teacherId);
        if (typeof window !== 'undefined') {
            localStorage.setItem('itc_current_user', JSON.stringify(user));
            localStorage.setItem('itc_current_role', userRole);
            if (teacherId) localStorage.setItem('itc_selected_teacher_id', teacherId);
        }
    };

    // Fetch Initial Data
    const fetchData = async (isInitial = false) => {
        if (isInitial) setIsLoading(true);
        try {
            const { data: cData } = await supabase.from('courses').select('*');
            const { data: uData } = await supabase.from('app_users').select('*');
            const { data: clsData } = await supabase.from('classes').select('*');
            const { data: revData } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
            const { data: critData } = await supabase.from('survey_criteria').select('*').order('order_index', { ascending: true });

            const teacherList = (uData && uData.filter(u => u.role === 'TEACHER')) || [];
            
            // Map snake_case from DB to camelCase for React, hỗ trợ 2 giảng viên
            const mappedClasses = (clsData && clsData.length > 0) ? clsData.map(c => ({
                id: c.id,
                code: c.code,
                courseId: c.course_id || c.courseId,
                teacherId: c.teacher_id || c.teacherId,
                teacherId2: c.teacher_id2 || c.teacherId2,
                teacherRole1: c.teacher_role1 || c.teacherRole1 || 'Giảng viên Lý thuyết',
                teacherRole2: c.teacher_role2 || c.teacherRole2,
                teacherIds: c.teacher_ids || (c.teacher_id2 ? [c.teacher_id, c.teacher_id2] : [c.teacher_id]),
                schedule: c.schedule,
                room: c.room,
                studentsCount: c.students_count || c.studentsCount || 30,
                status: c.status
            })) : [];

            // Đọc thêm classes từ server API và localStorage để không bao giờ mất khi reload
            let serverClasses: any[] = [];
            try {
                const resCls = await fetch('/api/classes');
                if (resCls.ok) {
                    const clsJson = await resCls.json();
                    if (Array.isArray(clsJson.classes)) {
                        serverClasses = clsJson.classes;
                    }
                }
            } catch (e) {}

            let localClasses: any[] = [];
            // Đọc thêm khảo sát từ localStorage nếu có (và dọn dẹp mock data cũ)
            let localSurveys = [];
            let localAttendances = [];
            let localTC = null;
            let localBookings = null;
            let localStudents = null;
            let localTeacherNotifs: any[] = [];
            let localCourses: any[] = [];
            let localCriteria: any[] | null = null;
            if (typeof window !== 'undefined') {
                const isCleaned = localStorage.getItem('itc_data_clean_v4');
                if (!isCleaned) {
                    localStorage.removeItem('mock_surveys');
                    localStorage.removeItem('itc_attendance_device_records');
                    localStorage.removeItem('itc_students_list');
                    localStorage.removeItem('itc_room_bookings');
                    localStorage.removeItem('itc_teacher_criteria');
                    localStorage.removeItem('itc_teacher_notifications');
                    localStorage.removeItem('itc_courses_list');
                    localStorage.setItem('itc_data_clean_v4', 'true');
                } else {
                    localSurveys = JSON.parse(localStorage.getItem('mock_surveys') || '[]');
                    localAttendances = JSON.parse(localStorage.getItem('itc_attendance_device_records') || '[]');
                    const savedTC = localStorage.getItem('itc_teacher_criteria');
                    if (savedTC) localTC = JSON.parse(savedTC);
                    const savedRB = localStorage.getItem('itc_room_bookings');
                    if (savedRB) localBookings = JSON.parse(savedRB);
                    const savedStudents = localStorage.getItem('itc_students_list');
                    if (savedStudents) localStudents = JSON.parse(savedStudents);
                    const savedTN = localStorage.getItem('itc_teacher_notifications');
                    if (savedTN) localTeacherNotifs = JSON.parse(savedTN);
                    const savedCourses = localStorage.getItem('itc_courses_list');
                    if (savedCourses) localCourses = JSON.parse(savedCourses);
                    const savedClasses = localStorage.getItem('itc_classes_list');
                    if (savedClasses) {
                        try {
                            localClasses = JSON.parse(savedClasses);
                        } catch (e) {}
                    }
                }
                const savedCriteria = localStorage.getItem('itc_survey_criteria');
                if (savedCriteria) {
                    try {
                        localCriteria = JSON.parse(savedCriteria);
                    } catch (e) {}
                }
            }

            // 1. Đồng bộ trạng thái mở/đóng khảo sát từ Server (thay vì phụ thuộc riêng localStorage)
            try {
                const resSettings = await fetch('/api/survey-settings');
                if (resSettings.ok) {
                    const settingsData = await resSettings.json();
                    setIsCenterSurveyActive(settingsData.isCenterSurveyActive === true);
                }
            } catch (e) {}

            // 2. Đồng bộ danh sách tiêu chí khảo sát từ Server
            let resolvedCriteria: any[] = [];
            try {
                const resCrit = await fetch('/api/criteria');
                if (resCrit.ok) {
                    const critJson = await resCrit.json();
                    if (Array.isArray(critJson.criteria) && critJson.criteria.length > 0) {
                        resolvedCriteria = critJson.criteria;
                    }
                }
            } catch (e) {}

            // Nếu server chưa có tiêu chí nhưng client có (Admin vừa import 30 tiêu chí vào localStorage)
            if (resolvedCriteria.length === 0 && localCriteria && localCriteria.length > 0) {
                resolvedCriteria = localCriteria;
                // Tự động đẩy lên server để tất cả tài khoản học viên và thiết bị khác đều nhận đủ 30 tiêu chí
                fetch('/api/criteria', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ criteria: localCriteria })
                }).catch(() => {});
            }

            // 3. Đồng bộ danh sách tiêu chí của Giảng viên từ Server (để Admin phê duyệt)
            let resolvedTeacherCriteria: any[] = [];
            try {
                const resTC = await fetch('/api/teacher-criteria');
                if (resTC.ok) {
                    const tcJson = await resTC.json();
                    if (Array.isArray(tcJson.teacherCriteria) && tcJson.teacherCriteria.length > 0) {
                        resolvedTeacherCriteria = tcJson.teacherCriteria;
                    }
                }
            } catch (e) {}

            // Nếu server chưa có nhưng client có (Giảng viên vừa lưu ở localStorage của họ)
            if (resolvedTeacherCriteria.length === 0 && localTC && localTC.length > 0) {
                resolvedTeacherCriteria = localTC;
                fetch('/api/teacher-criteria', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ teacherCriteria: localTC })
                }).catch(() => {});
            }

            // 4. Đồng bộ khảo sát nộp từ Server /api/surveys
            let serverSurveys: any[] = [];
            try {
                const resSurv = await fetch('/api/surveys');
                if (resSurv.ok) {
                    const survJson = await resSurv.json();
                    if (Array.isArray(survJson.surveys)) {
                        serverSurveys = survJson.surveys;
                    }
                }
            } catch (e) {}

            const dbReviews: any[] = (revData && revData.length > 0) ? revData.map(r => ({
                id: r.id,
                classId: r.class_id,
                ratings: r.ratings,
                teacherRatings: r.teacher_ratings,
                comment: r.comment,
                status: r.status,
                actionNote: r.action_note,
                teacherNote: r.teacher_note,
                isEscalated: r.is_escalated,
                createdAt: r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : undefined
            })) : [];

            // Gộp reviews từ database, server surveys và reviews nộp từ client
            const allReviews: any[] = [...dbReviews];
            serverSurveys.forEach((ss: any) => {
                if (!allReviews.some(r => r.id === ss.id)) {
                    allReviews.push({
                        ...ss,
                        ratings: ss.ratings || ss.centerRatings || ss.answers || {},
                        teacherRatings: ss.teacherRatings || {}
                    });
                }
            });
            localSurveys.forEach((ls: any) => {
                if (!allReviews.some(r => r.id === ls.id)) {
                    allReviews.push({
                        id: ls.id,
                        classId: ls.classId || mappedClasses.find(c => c.code === ls.classCode)?.id || 'cls_1',
                        ratings: ls.centerRatings || ls.answers || {},
                        teacherRatings: ls.teacherRatings || (ls.teacher1Ratings ? {
                            'tch_1': ls.teacher1Ratings,
                            'tch_2': ls.teacher2Ratings
                        } : {}),
                        comment: ls.comment || '',
                        status: ls.status || 'OPEN',
                        actionNote: ls.actionNote || '',
                        teacherNote: ls.teacherNote || '',
                        createdAt: ls.timestamp ? new Date(ls.timestamp).toLocaleDateString('vi-VN') : 'Hôm nay'
                    });
                }
            });

            // Gộp điểm danh
            const allAttendances = [...INITIAL_ATTENDANCE];
            localAttendances.forEach((la: any) => {
                if (!allAttendances.some(a => a.studentCode === la.studentCode && a.classId === la.classId)) {
                    allAttendances.push({
                        id: la.id || 'att_' + Date.now(),
                        classId: la.classId || 'cls_1',
                        classCode: la.classCode,
                        studentCode: la.studentCode,
                        studentName: la.studentName || 'Học viên',
                        date: la.date || new Date().toLocaleDateString('vi-VN'),
                        isPresent: true,
                        deviceFingerprint: la.deviceId,
                        submittedAt: la.timestamp ? new Date(la.timestamp).toLocaleTimeString('vi-VN') : ''
                    });
                }
            });

            // Đọc thêm courses từ Server API để incognito hay mọi trình duyệt đều đồng bộ
            let serverCourses: any[] = [];
            try {
                const resCrs = await fetch('/api/courses');
                if (resCrs.ok) {
                    const crsJson = await resCrs.json();
                    if (Array.isArray(crsJson.courses)) {
                        serverCourses = crsJson.courses;
                    }
                }
            } catch (e) {}

            const baseCourses = (cData && cData.length > 0) ? cData : (serverCourses.length > 0 ? serverCourses : INITIAL_COURSES);
            const courseMap = new Map<string, any>();
            INITIAL_COURSES.forEach(c => courseMap.set(c.id, c));
            serverCourses.forEach(c => courseMap.set(c.id, { ...(courseMap.get(c.id) || {}), ...c }));
            baseCourses.forEach(c => courseMap.set(c.id, { ...(courseMap.get(c.id) || {}), ...c }));
            localCourses.forEach((lc: any) => {
                courseMap.set(lc.id, { ...(courseMap.get(lc.id) || {}), ...lc });
            });
            const mergedCourses = Array.from(courseMap.values());

            // Tự động đồng bộ các môn từ local lên server nếu server chưa có
            if (localCourses.length > 0) {
                const missingOnServer = localCourses.filter((lc: any) => !serverCourses.some(sc => sc.id === lc.id || sc.code === lc.code));
                if (missingOnServer.length > 0) {
                    fetch('/api/courses', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ courses: mergedCourses })
                    }).catch(() => {});
                }
            }

            // Hợp nhất các nguồn lớp học (server, local, supabase) đảm bảo reload không mất
            const classMap = new Map<string, any>();
            INITIAL_CLASSES.forEach(c => classMap.set(c.id, c));
            serverClasses.forEach(c => classMap.set(c.id, { ...(classMap.get(c.id) || {}), ...c }));
            localClasses.forEach(c => classMap.set(c.id, { ...(classMap.get(c.id) || {}), ...c }));
            mappedClasses.forEach(c => classMap.set(c.id, { ...(classMap.get(c.id) || {}), ...c }));
            const mergedClasses = Array.from(classMap.values());

            setCourses(mergedCourses);
            setTeacherNotifications(localTeacherNotifs);
            setTeachers(teacherList);
            setClasses(mergedClasses);
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_classes_list', JSON.stringify(mergedClasses));
            }
            setReviews(allReviews);
            setCriteriaList(resolvedCriteria);
            setTeacherCriteria(resolvedTeacherCriteria);
            setAttendances(allAttendances);
            if (localBookings) setRoomBookings(localBookings);
            const studentUsers = (uData && uData.filter(u => u.role === 'STUDENT')) || [];
            const mergedStudents = [...studentUsers];
            if (localStudents && localStudents.length > 0) {
                localStudents.forEach((ls: any) => {
                    if (!mergedStudents.some(s => s.id === ls.id || s.code === ls.code)) {
                        mergedStudents.push(ls);
                    }
                });
            }
            setStudents(mergedStudents);

            // Load enrollments (đăng ký lớp học của sinh viên)
            try {
                const resEnroll = await fetch('/api/enrollments');
                if (resEnroll.ok) {
                    const enrollData = await resEnroll.json();
                    if (Array.isArray(enrollData.enrollments)) {
                        setEnrollments(enrollData.enrollments);
                    }
                }
            } catch (e) {}

            // Load unenroll requests (đơn xin hủy môn của sinh viên)
            try {
                const resUnenroll = await fetch('/api/unenroll-requests');
                if (resUnenroll.ok) {
                    const unenrollJson = await resUnenroll.json();
                    if (Array.isArray(unenrollJson.requests)) {
                        setUnenrollRequests(unenrollJson.requests);
                    }
                }
            } catch (e) {}

            // Load room bookings (đăng ký mượn phòng & dạy bù của giảng viên)
            try {
                const resRB = await fetch('/api/room-bookings');
                if (resRB.ok) {
                    const rbJson = await resRB.json();
                    if (Array.isArray(rbJson.bookings)) {
                        setRoomBookings(rbJson.bookings);
                    }
                }
            } catch (e) {}

            // Load grades (điểm số)
            try {
                const resGrades = await fetch('/api/grades');
                if (resGrades.ok) {
                    const gradesData = await resGrades.json();
                    if (Array.isArray(gradesData.grades) && gradesData.grades.length > 0) {
                        const gradesMap: Record<string, any> = {};
                        gradesData.grades.forEach((g: any) => {
                            gradesMap[`${g.classId}_${g.studentId}`] = g;
                            if (g.classCode) gradesMap[`${g.classCode}_${g.studentId}`] = g;
                            if (g.studentCode) {
                                gradesMap[`${g.classId}_${g.studentCode}`] = g;
                                if (g.classCode) gradesMap[`${g.classCode}_${g.studentCode}`] = g;
                            }
                        });
                        setStudentGrades((prev: any) => ({ ...INITIAL_STUDENT_GRADES, ...gradesMap }));
                    }
                }
            } catch (e) {}

            // Load student notifications (thông báo cho sinh viên)
            try {
                const resNotifs = await fetch('/api/student-notifications');
                if (resNotifs.ok) {
                    const notifJson = await resNotifs.json();
                    if (Array.isArray(notifJson.notifications) && notifJson.notifications.length > 0) {
                        setNotifications(notifJson.notifications);
                    }
                }
            } catch (e) {}

            // Cập nhật selectedTeacherId: nếu đang đăng nhập là GV thì ưu tiên ID của GV đó
            const { data: sessionData } = await supabase.auth.getSession();
            const loggedInUserId = sessionData?.session?.user?.id;
            const loggedInUser = (uData || []).find(u => u.id === loggedInUserId);

            if (loggedInUser?.role === 'TEACHER') {
                setSelectedTeacherId(loggedInUser.id);
            } else {
                setSelectedTeacherId(prev => {
                    if (prev && teacherList.some(t => t.id === prev)) return prev;
                    return teacherList.length > 0 ? teacherList[0].id : '';
                });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            triggerToast('Lỗi tải dữ liệu từ máy chủ!');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setIsMounted(true);
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    // Xác thực session với Supabase và lấy thông tin user từ app_users
                    const { data } = await supabase.from('app_users').select('*').eq('id', session.user.id).single();
                    if (data) {
                        handleSetUserSession(data, data.role, data.role === 'TEACHER' ? data.id : undefined);
                    } else {
                        // User tồn tại trong Auth nhưng không có trong app_users → đăng xuất
                        await supabase.auth.signOut();
                        if (typeof window !== 'undefined') {
                            localStorage.removeItem('itc_current_user');
                            localStorage.removeItem('itc_current_role');
                            localStorage.removeItem('itc_selected_teacher_id');
                        }
                    }
                    
                    // Kích hoạt popup đổi mật khẩu nếu phát hiện truy cập từ link Invite / Recovery
                    if (window.location.hash.includes('type=invite') || window.location.hash.includes('type=recovery')) {
                        setShowChangePasswordModal(true);
                        window.history.replaceState(null, '', window.location.pathname);
                    }
                } else {
                    // Không có Supabase session → xóa localStorage để bắt đăng nhập lại
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('itc_current_user');
                        localStorage.removeItem('itc_current_role');
                        localStorage.removeItem('itc_selected_teacher_id');
                    }
                }
            } catch (err) {
                console.warn('initAuth error:', err);
            }
            fetchData(true);
        };
        initAuth();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const { data } = await supabase.from('app_users').select('*').eq('id', session.user.id).single();
                if (data) {
                    handleSetUserSession(data, data.role, data.role === 'TEACHER' ? data.id : undefined);
                }
            }
            // Không xử lý SIGNED_OUT ở đây để tránh vòng lặp với handleLogout
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Toast logic
    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    // Derived States (Data Analytics Engine)
    const stats = useMemo(() => {
        let totalSubmissions = reviews.length;
        let sumAllRatings = 0;
        let countAllRatings = 0;
        let alertList: any[] = []; // Array of alerts
        let classMetrics: Record<string, any> = {};

        // Initialize classMetrics hỗ trợ 2 giảng viên
        classes.forEach(c => {
            const course = courses.find(cr => cr.id === c.courseId);
            const teacher1 = teachers.find(t => t.id === c.teacherId);
            const teacher2 = teachers.find(t => t.id === c.teacherId2);
            classMetrics[c.id] = {
                classInfo: c,
                courseName: course ? course.name : '',
                teacherName: teacher1 ? teacher1.name : '',
                teacherName2: teacher2 ? teacher2.name : '',
                teacherRole1: c.teacherRole1 || 'Giảng viên Lý thuyết',
                teacherRole2: c.teacherRole2 || (c.teacherId2 ? 'Giảng viên Thực hành' : ''),
                count: 0,
                criteriaSums: {}, // Sẽ khởi tạo động
                criteriaAvgs: {},
                overallAvg: 0,
                badComments: []
            };
        });

        reviews.forEach(r => {
            const cm = classMetrics[r.classId];
            if (!cm) return;

            const rRatings = r.ratings || {};
            const hasCenterRatings = Object.keys(rRatings).length > 0;

            if (hasCenterRatings) {
                cm.count++;
                let rSum = 0;
                criteriaList.forEach(crit => {
                    if (cm.criteriaSums[crit.id] === undefined) cm.criteriaSums[crit.id] = 0;
                    const score = rRatings[crit.id] || 0;
                    cm.criteriaSums[crit.id] += score;
                    sumAllRatings += score;
                    countAllRatings++;
                    rSum += score;
                });
            }

            const hasComment = r.comment && r.comment.trim().length > 0;
            if (hasComment) {
                const ratingVals: number[] = Object.values(rRatings).map((s: any) => Number(s)).filter((s: number) => !isNaN(s) && s > 0);
                const avgR = ratingVals.length > 0 ? (ratingVals.reduce((a, b) => a + b, 0) / ratingVals.length) : 5;
                const isComplaint = ratingVals.some((s: number) => s <= 3) || avgR <= 3.0 || r.isEscalated;
                if (isComplaint) {
                    cm.badComments.push({ id: r.id, comment: r.comment, status: r.status, teacherNote: r.teacherNote, isEscalated: r.isEscalated });
                }
            }
        });

        // Calculate averages and alerts
        Object.values(classMetrics).forEach((cm: any) => {
            if (cm.count > 0) {
                let totalScore = 0;
                criteriaList.forEach(crit => {
                    const sum = cm.criteriaSums[crit.id] || 0;
                    const avg = sum / cm.count;
                    cm.criteriaAvgs[crit.id] = avg.toFixed(1);
                    totalScore += avg;

                    if (avg > 0 && avg < warningThreshold) {
                        alertList.push({
                            id: `alert_${cm.classInfo.id}_${crit.id}`,
                            classCode: cm.classInfo.code,
                            room: cm.classInfo.room,
                            teacherName: cm.teacherName,
                            critName: crit.name,
                            score: avg.toFixed(1),
                            count: cm.count
                        });
                    }
                });
                cm.overallAvg = criteriaList.length > 0 ? (totalScore / criteriaList.length).toFixed(1) : 0;
            } else {
                criteriaList.forEach(crit => { cm.criteriaAvgs[crit.id] = 0; });
                cm.overallAvg = 0;
            }
        });

        const centerAvgSatisfaction = countAllRatings > 0 ? (sumAllRatings / countAllRatings).toFixed(1) : 0;

        return {
            totalSubmissions,
            centerAvgSatisfaction,
            alertList,
            classMetrics
        };
    }, [reviews, classes, courses, teachers, warningThreshold]);

    const handleSaveTeacherCriteria = async (newCriteria: any[]) => {
        const teacherId = newCriteria[0]?.teacherId;
        setTeacherCriteria(prev => {
            const others = teacherId ? prev.filter(c => c.teacherId !== teacherId) : [];
            const updated = [...others, ...newCriteria];
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_teacher_criteria', JSON.stringify(updated));
            }
            return updated;
        });
        try {
            await fetch('/api/teacher-criteria', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacherId, criteria: newCriteria })
            });
        } catch (e) {
            console.error('Error saving teacher criteria to server:', e);
        }
        triggerToast('Đã lưu tiêu chí giảng viên và gửi đến Admin phê duyệt!');
    };

    const handleUpdateTeacherNote = async (reviewId: string, note: string, teacherId?: string) => {
        setReviews(prev => prev.map(r => {
            if (r.id === reviewId) {
                const notes = { ...(r.teacherNotes || {}) };
                if (teacherId) notes[teacherId] = note;
                return { ...r, teacherNote: note, teacherNotes: notes };
            }
            return r;
        }));
        try {
            await supabase.from('reviews').update({ teacher_note: note }).eq('id', reviewId);
        } catch (e) {}
        triggerToast('Đã lưu ghi chú thành công!');
    };

    const handleEscalateReview = async (reviewId: string) => {
        const { error } = await supabase.from('reviews').update({ is_escalated: true }).eq('id', reviewId);
        if (!error) {
            fetchData();
            triggerToast('Đã báo cáo Admin khẩn cấp!');
        }
    };

    const handleUpdateAction = async (reviewId: string, newStatus: string, newNote: string) => {
        const { error } = await supabase.from('reviews').update({ status: newStatus, action_note: newNote }).eq('id', reviewId);
        if (!error) {
            fetchData();
            triggerToast('Đã cập nhật tiến độ khắc phục!');
        }
    };

    const dispatchTeacherNotification = (teacherId: string, notif: { title: string; content: string; type: any }) => {
        const newNotif = {
            id: 'tn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            teacherId,
            title: notif.title,
            content: notif.content,
            date: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            isRead: false,
            type: notif.type
        };
        setTeacherNotifications(prev => {
            const updated = [newNotif, ...prev];
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_teacher_notifications', JSON.stringify(updated));
            }
            return updated;
        });
    };

    const handleMarkTeacherNotificationsRead = (teacherId: string) => {
        setTeacherNotifications(prev => {
            const updated = prev.map(n => (!n.teacherId || n.teacherId === teacherId) ? { ...n, isRead: true } : n);
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_teacher_notifications', JSON.stringify(updated));
            }
            return updated;
        });
    };

    const dispatchStudentNotification = (studentId: string | undefined, notif: { title: string; content: string; classCode?: string; priority?: 'NORMAL' | 'HIGH' }) => {
        const newNotif = {
            id: 'sn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            studentId,
            title: notif.title,
            content: notif.content,
            sender: 'CENTER' as const,
            senderName: 'Trung tâm Công nghệ Thông tin - ĐH Đà Lạt',
            classCode: notif.classCode,
            date: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            isRead: false,
            priority: notif.priority || 'NORMAL'
        };

        setNotifications(prev => {
            const updated = [newNotif, ...prev];
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_student_notifications', JSON.stringify(updated));
            }
            return updated;
        });

        fetch('/api/student-notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notification: newNotif })
        }).catch(err => console.error('Lỗi khi lưu thông báo sinh viên lên API:', err));
    };

    const handleAddClass = async (newClass: any) => {
        setClasses(prev => {
            const updated = [newClass, ...prev.filter(c => c.id !== newClass.id && c.code !== newClass.code)];
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_classes_list', JSON.stringify(updated));
            }
            return updated;
        });

        // 1. Lưu vĩnh viễn vào Server file /api/classes (đảm bảo reload không bao giờ mất)
        try {
            await fetch('/api/classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classItem: newClass })
            });
        } catch (e) {
            console.error('Error saving class to API:', e);
        }

        // 2. Thử lưu vào Supabase (loại bỏ teacher_id2 để tương thích 100% với schema Supabase)
        try {
            await supabase.from('classes').insert([{
                id: newClass.id,
                code: newClass.code,
                course_id: newClass.courseId,
                teacher_id: newClass.teacherId,
                schedule: newClass.schedule,
                room: newClass.room,
                students_count: newClass.studentsCount || 30,
                status: newClass.status
            }]);
        } catch (e) {
            console.log('Class saved via server API & local storage');
        }

        // 3. Tự động gửi thông báo phân công giảng dạy cho giáo viên
        const course = courses.find(c => c.id === newClass.courseId || c.code === newClass.courseId);
        const courseName = course?.name || newClass.code;
        const courseCode = course?.code || newClass.courseId;
        const courseId = course?.id || newClass.courseId;

        if (newClass.teacherId) {
            dispatchTeacherNotification(newClass.teacherId, {
                title: '🔔 Phân công Lịch giảng dạy Mới',
                content: `Trung tâm ITC đã phân công bạn giảng dạy môn "${courseName}" (Lớp ${newClass.code}) tại ${newClass.room}, thời gian: ${newClass.schedule} (Sĩ số tối đa: ${newClass.studentsCount || 10} học viên).`,
                type: 'ASSIGNMENT'
            });
        }
        if (newClass.teacherId2) {
            dispatchTeacherNotification(newClass.teacherId2, {
                title: '🔔 Phân công Trợ giảng / Phòng máy Mới',
                content: `Trung tâm ITC đã phân công bạn phối hợp giảng dạy môn "${courseName}" (Lớp ${newClass.code}) tại ${newClass.room}, thời gian: ${newClass.schedule}.`,
                type: 'ASSIGNMENT'
            });
        }

        // 4. QUAN TRỌNG: TỰ ĐỘNG CHUYỂN CÁC HỌC VIÊN ĐÃ ĐĂNG KÝ TRƯỚC MÔN NÀY VÀO LỚP HỌC MỚI
        // VÀ GỬI THÔNG BÁO LỊCH HỌC & PHÒNG MÁY ĐẾN HỌC VIÊN
        const pendingEnrollments = (enrollments || []).filter((e: any) => 
            e.classCode === courseCode || e.classCode === courseId
        );

        if (pendingEnrollments.length > 0) {
            const updatedEnrollments = enrollments.map((e: any) => {
                if (e.classCode === courseCode || e.classCode === courseId) {
                    return { ...e, classCode: newClass.code };
                }
                return e;
            });
            setEnrollments(updatedEnrollments);

            // Lưu danh sách enrollments đã chuyển đổi lên server API
            try {
                await fetch('/api/enrollments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enrollments: updatedEnrollments })
                });
            } catch (e) {
                console.error('Error updating enrollments for new class:', e);
            }

            // Gửi thông báo đến từng học viên và cập nhật local storage cho họ
            pendingEnrollments.forEach((pe: any) => {
                dispatchStudentNotification(pe.studentId, {
                    title: `📅 Đã có Lịch học & Phòng máy môn ${courseName}`,
                    content: `Môn học "${courseName}" bạn đã đăng ký đã được xếp lịch học chính thức: Lớp "${newClass.code}", Lịch học: ${newClass.schedule}, Phòng máy: ${newClass.room}. Môn học đã được tự động thêm vào Thời khóa biểu và Phòng học của bạn!`,
                    classCode: newClass.code,
                    priority: 'HIGH'
                });

                if (typeof window !== 'undefined' && pe.studentId) {
                    try {
                        const saved = localStorage.getItem('itc_enrolled_' + pe.studentId);
                        if (saved) {
                            const codes: string[] = JSON.parse(saved);
                            const newCodes = codes.map((c: string) => (c === courseCode || c === courseId) ? newClass.code : c);
                            localStorage.setItem('itc_enrolled_' + pe.studentId, JSON.stringify(newCodes));
                        }
                    } catch (err) {}
                }
            });
        }

        // Gửi thêm thông báo toàn trường/trung tâm để các học viên khác cũng nắm được lịch lớp mới mở
        dispatchStudentNotification(undefined, {
            title: `📢 Lớp học mới mở: ${courseName} (${newClass.code})`,
            content: `Trung tâm Tin học ITC vừa mở lớp mới "${newClass.code}" môn "${courseName}". Lịch học: ${newClass.schedule} tại ${newClass.room}. Mời học viên quan tâm tra cứu và đăng ký trong Cổng học viên!`,
            classCode: newClass.code,
            priority: 'NORMAL'
        });

        triggerToast(`🎉 Tạo lớp ${newClass.code} thành công! Đã gửi thông báo lịch học và cập nhật Thời khóa biểu cho học viên.`);
    };

    const handleToggleClassStatus = async (classId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'OPEN_SURVEY' ? 'CLOSED_SURVEY' : 'OPEN_SURVEY';

        // KIỂM TRA QUY CHẾ: Giảng viên phụ trách phải đưa ra tiêu chí khảo sát cá nhân thì mới được bật khảo sát
        if (newStatus === 'OPEN_SURVEY') {
            const targetClass = classes.find(c => c.id === classId);
            if (targetClass) {
                const classTC = (teacherCriteria || []).filter(
                    (tc: any) => tc.teacherId === targetClass.teacherId || (targetClass.teacherId2 && tc.teacherId === targetClass.teacherId2)
                );
                if (classTC.length === 0) {
                    const tch1 = teachers.find(t => t.id === targetClass.teacherId);
                    const tch2 = teachers.find(t => t.id === targetClass.teacherId2);
                    alert(`⚠️ KHÔNG THỂ BẬT KHẢO SÁT LỚP ${targetClass.code}!\n\nGiảng viên phụ trách lớp (${tch1?.name || 'Giảng viên'}${tch2 ? ` & ${tch2.name}` : ''}) chưa đưa ra bất kỳ tiêu chí khảo sát cá nhân nào.\n\nTheo quy chế của Trung tâm ITC, Giảng viên phải đưa ra tiêu chí khảo sát cá nhân trước thì mới được phép mở đợt khảo sát cho sinh viên đánh giá!`);
                    return;
                }
            }
        }

        setClasses(prev => {
            const updated = prev.map(c => c.id === classId ? { ...c, status: newStatus } : c);
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_classes_list', JSON.stringify(updated));
            }
            return updated;
        });
        try {
            await fetch('/api/classes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId, status: newStatus })
            });
        } catch (e) {}
        try {
            await supabase.from('classes').update({ status: newStatus }).eq('id', classId);
        } catch (e) {}
        triggerToast('Đã đổi trạng thái mở form khảo sát!');
    };

    const handleDeleteClass = async (classId: string) => {
        setClasses(prev => {
            const updated = prev.filter(c => c.id !== classId);
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_classes_list', JSON.stringify(updated));
            }
            return updated;
        });
        setReviews(prev => prev.filter(r => r.classId !== classId));

        try {
            await fetch('/api/classes', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId })
            });
        } catch (e) {}

        // Xóa reviews trước (ràng buộc khóa ngoại)
        try {
            await supabase.from('reviews').delete().eq('class_id', classId);
            await supabase.from('classes').delete().eq('id', classId);
        } catch (e) {}

        triggerToast('Đã xóa đợt khảo sát (lớp học) thành công!');
    };

    const handleImportTeachers = (newTeachers: any[]) => {
        setTeachers(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const fresh = newTeachers.filter(t => !existingIds.has(t.id));
            return [...prev, ...fresh];
        });
        triggerToast(`🎉 Đã nhập thành công ${newTeachers.length} giảng viên vào hệ thống!`);
    };

    const handleImportStudents = (newStudents: any[]) => {
        setStudents(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const fresh = newStudents.filter(s => !existingIds.has(s.id));
            const updated = [...prev, ...fresh];
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_students_list', JSON.stringify(updated));
            }
            return updated;
        });
        triggerToast(`🎉 Đã nhập thành công ${newStudents.length} sinh viên vào hệ thống!`);
    };

    const handleUpdateTeacherAllCriteriaStatus = async (teacherId: string, newStatus: 'APPROVED' | 'REJECTED') => {
        const teacher = teachers.find(t => t.id === teacherId);
        const teacherName = teacher ? teacher.name : 'Giảng viên';
        const updated = teacherCriteria.map(tc => tc.teacherId === teacherId ? { ...tc, status: newStatus } : tc);
        setTeacherCriteria(updated);
        if (typeof window !== 'undefined') {
            localStorage.setItem('itc_teacher_criteria', JSON.stringify(updated));
        }
        try {
            await fetch('/api/teacher-criteria', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacherId, status: newStatus })
            });
        } catch (e) {
            console.error('Error batch updating teacher criteria status:', e);
        }
        triggerToast(newStatus === 'APPROVED' 
            ? `✓ Đã phê duyệt tất cả tiêu chí của ${teacherName}!`
            : `Đã từ chối các tiêu chí của ${teacherName}`);
    };

    const handleApproveAllPendingCriteria = async () => {
        const pendingCount = teacherCriteria.filter(tc => tc.status === 'PENDING').length;
        if (pendingCount === 0) {
            triggerToast('Không có tiêu chí nào đang chờ duyệt!');
            return;
        }
        const updated = teacherCriteria.map(tc => ({ ...tc, status: 'APPROVED' as const }));
        setTeacherCriteria(updated);
        if (typeof window !== 'undefined') {
            localStorage.setItem('itc_teacher_criteria', JSON.stringify(updated));
        }
        try {
            await fetch('/api/teacher-criteria', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacherCriteria: updated })
            });
        } catch (e) {
            console.error('Error approving all criteria:', e);
        }
        triggerToast(`🎉 Đã phê duyệt nhanh toàn bộ ${pendingCount} tiêu chí của các giảng viên!`);
    };

    const handleUpdateTeacherCriteriaStatus = async (criterionId: string, newStatus: 'APPROVED' | 'REJECTED') => {
        const updated = teacherCriteria.map(tc => tc.id === criterionId ? { ...tc, status: newStatus } : tc);
        setTeacherCriteria(updated);
        if (typeof window !== 'undefined') {
            localStorage.setItem('itc_teacher_criteria', JSON.stringify(updated));
        }
        try {
            await fetch('/api/teacher-criteria', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ criterionId, status: newStatus })
            });
        } catch (e) {
            console.error('Error updating teacher criteria status:', e);
        }
        triggerToast(newStatus === 'APPROVED' ? 'Đã phê duyệt tiêu chí của Giảng viên' : 'Đã từ chối tiêu chí');
    };

    const handleDeleteTeacherCriteria = async (criterionId: string) => {
        const updated = teacherCriteria.filter(tc => tc.id !== criterionId);
        setTeacherCriteria(updated);
        if (typeof window !== 'undefined') {
            localStorage.setItem('itc_teacher_criteria', JSON.stringify(updated));
        }
        try {
            await fetch('/api/teacher-criteria', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ criterionId })
            });
        } catch (e) {
            console.error('Error deleting teacher criterion:', e);
        }
        triggerToast('🗑️ Đã xóa tiêu chí của giảng viên');
    };

    const handleSaveCriteriaList = async (newCriteria: any[]) => {
        setCriteriaList(newCriteria);
        if (typeof window !== 'undefined') {
            localStorage.setItem('itc_survey_criteria', JSON.stringify(newCriteria));
        }
        try {
            await fetch('/api/criteria', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ criteria: newCriteria })
            });
        } catch (e) {
            console.error('Error saving criteria to server:', e);
        }
    };

    const handleSubmitRoomBooking = async (newBooking: any) => {
        const updated = [newBooking, ...roomBookings.filter(b => b.id !== newBooking.id)];
        setRoomBookings(updated);
        if (typeof window !== 'undefined') {
            localStorage.setItem('itc_room_bookings', JSON.stringify(updated));
        }
        try {
            await fetch('/api/room-bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', booking: newBooking })
            });
        } catch (e) {
            console.error('Error saving room booking:', e);
        }
        triggerToast('Đã gửi yêu cầu đăng ký phòng tới Trung tâm');
    };

    const handleUpdateRoomBookingStatus = async (bookingId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
        const targetBooking = roomBookings.find(b => b.id === bookingId);
        const updated = roomBookings.map(b => b.id === bookingId ? { ...b, status } : b);
        setRoomBookings(updated);
        if (typeof window !== 'undefined') {
            localStorage.setItem('itc_room_bookings', JSON.stringify(updated));
        }

        try {
            await fetch('/api/room-bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_status', bookingId, status })
            });
        } catch (e) {
            console.error('Error updating room booking status:', e);
        }

        // Gửi thông báo xét duyệt đến Giảng viên
        if (targetBooking?.teacherId) {
            const roomName = targetBooking.room || (targetBooking as any).roomId || (targetBooking as any).roomName || 'phòng học';
            const courseLabel = targetBooking.courseName || (targetBooking as any).courseId || targetBooking.purpose || 'lớp học';
            const timeSlotLabel = targetBooking.timeSlot || (targetBooking as any).shift || '';
            if (status === 'APPROVED') {
                dispatchTeacherNotification(targetBooking.teacherId, {
                    title: '✅ Đã Duyệt Đăng ký Dạy Bù / Mượn Phòng',
                    content: `Trung tâm ITC đã PHÊ DUYỆT yêu cầu đăng ký phòng: ${roomName} cho môn "${courseLabel}", thời gian: ${targetBooking.date} (${timeSlotLabel}).`,
                    type: 'APPROVAL'
                });
            } else if (status === 'REJECTED') {
                dispatchTeacherNotification(targetBooking.teacherId, {
                    title: '❌ Từ chối Đăng ký Dạy Bù / Mượn Phòng',
                    content: `Yêu cầu đăng ký dạy/phòng ${roomName} vào ngày ${targetBooking.date} (${timeSlotLabel}) chưa được duyệt. Vui lòng liên hệ trung tâm để đổi lịch hoặc phòng khác.`,
                    type: 'REJECTION'
                });
            }
        }

        triggerToast(
            status === 'APPROVED' 
                ? '✓ Đã duyệt cấp phòng dạy bù và gửi thông báo cho Giảng viên' 
                : status === 'REJECTED'
                ? '✕ Đã từ chối yêu cầu và gửi thông báo cho Giảng viên'
                : 'Đã chuyển trạng thái yêu cầu về chờ duyệt'
        );
    };

    const handleCancelRoomBooking = async (bookingId: string) => {
        const updated = roomBookings.filter(b => b.id !== bookingId);
        setRoomBookings(updated);
        if (typeof window !== 'undefined') {
            localStorage.setItem('itc_room_bookings', JSON.stringify(updated));
        }

        try {
            await fetch('/api/room-bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', bookingId })
            });
        } catch (e) {
            console.error('Error canceling room booking:', e);
        }

        triggerToast('🗑️ Đã hủy đăng ký mượn phòng học thành công!');
    };

    const handleSaveStudentSurvey = async (surveyData: any) => {
        // Chuẩn hóa surveyData luôn đảm bảo ratings và teacherRatings là object
        const cleanSurveyData = {
            ...surveyData,
            ratings: surveyData.ratings || surveyData.centerRatings || surveyData.answers || {},
            teacherRatings: surveyData.teacherRatings || {}
        };

        // Ghi vào reviews
        const updatedReviews = [cleanSurveyData, ...reviews.filter(r => r.id !== cleanSurveyData.id)];
        setReviews(updatedReviews);

        // Phương án 1: Tự động điểm danh CHỈ kích hoạt khi học viên làm Khảo sát Giảng viên của chính lớp học đó
        const isTeacherClassSurvey = Boolean(cleanSurveyData.classId || cleanSurveyData.classCode) && cleanSurveyData.type !== 'CENTER';

        if (isTeacherClassSurvey) {
            const today = new Date().toLocaleDateString('vi-VN');
            const studentId = cleanSurveyData.studentId || currentUser?.id;
            const studentCode = cleanSurveyData.studentCode || currentUser?.code || studentId;
            const studentName = cleanSurveyData.studentName || currentUser?.name || 'Học viên';

            const cls = classes.find(c => c.id === cleanSurveyData.classId || c.code === cleanSurveyData.classCode);
            const targetClassId = cls?.id || cleanSurveyData.classId;
            const targetClassCode = cls?.code || cleanSurveyData.classCode;

            let updatedAttendances = [...attendances];
            const existingIdx = updatedAttendances.findIndex(
                a => (a.classId === targetClassId || a.classCode === targetClassCode) && 
                     (a.studentCode === studentCode || a.studentId === studentId)
            );
            if (existingIdx >= 0) {
                updatedAttendances[existingIdx] = {
                    ...updatedAttendances[existingIdx],
                    isPresent: true,
                    date: today,
                    submittedAt: new Date().toLocaleTimeString('vi-VN')
                };
            } else {
                updatedAttendances.unshift({
                    id: 'att_' + Date.now() + '_' + targetClassId,
                    classId: targetClassId,
                    classCode: targetClassCode,
                    studentId: studentId,
                    studentCode: studentCode,
                    studentName: studentName,
                    date: today,
                    isPresent: true,
                    deviceFingerprint: cleanSurveyData.deviceId || 'AUTO_TEACHER_SURVEY_ATTENDANCE',
                    submittedAt: new Date().toLocaleTimeString('vi-VN')
                });
            }
            setAttendances(updatedAttendances);
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_attendance_device_records', JSON.stringify(updatedAttendances));
            }
        }

        if (typeof window !== 'undefined') {
            const localSurveys = JSON.parse(localStorage.getItem('mock_surveys') || '[]');
            localSurveys.push(cleanSurveyData);
            localStorage.setItem('mock_surveys', JSON.stringify(localSurveys));
        }

        // Lưu vĩnh viễn lên server qua API /api/surveys
        try {
            await fetch('/api/surveys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ survey: cleanSurveyData })
            });
        } catch (e) {
            console.error('Error saving survey to server:', e);
        }

        // Gửi thông báo đến Admin nếu là khảo sát trung tâm
        if (cleanSurveyData.type === 'CENTER' || Object.keys(cleanSurveyData.ratings).length > 0) {
            setNotifications(prev => [{
                id: 'notif_' + Date.now(),
                title: '📋 Học viên vừa nộp khảo sát Trung tâm',
                message: `Học viên ${cleanSurveyData.studentName || cleanSurveyData.studentCode} (${cleanSurveyData.studentCode}) đã hoàn thành phiếu khảo sát chất lượng trung tâm.`,
                timestamp: new Date().toLocaleTimeString('vi-VN'),
                read: false,
                type: 'SURVEY'
            }, ...prev]);
        }

        // Nếu có teacherRatings, gửi thông báo ngay cho giảng viên
        if (cleanSurveyData.teacherRatings && typeof cleanSurveyData.teacherRatings === 'object') {
            Object.keys(cleanSurveyData.teacherRatings).forEach((tchId) => {
                dispatchTeacherNotification(tchId, {
                    title: '⭐ Học viên đánh giá tiêu chí giảng dạy',
                    content: `Học viên ${cleanSurveyData.studentName || cleanSurveyData.studentCode} lớp ${cleanSurveyData.classCode || ''} vừa nộp đánh giá tiêu chí cá nhân của bạn. Nhận xét: "${cleanSurveyData.comment || 'Rất tốt'}".`,
                    type: 'ANNOUNCEMENT'
                });
            });
        }

        triggerToast('🎉 Đã nộp khảo sát & Lưu dữ liệu thành công!');
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (e) {}
        // Xóa hết state và localStorage
        setCurrentUser(null);
        setRole('ADMIN');
        if (typeof window !== 'undefined') {
            localStorage.removeItem('itc_current_user');
            localStorage.removeItem('itc_current_role');
            localStorage.removeItem('itc_selected_teacher_id');
        }
    };

    const handleDeleteTeacher = async (teacherId: string) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/delete-teacher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacherId })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Lỗi không xác định');
            
            triggerToast('Đã xóa giảng viên thành công');
            fetchData(false);
        } catch (error: any) {
            console.error('Lỗi khi xóa giảng viên:', error);
            triggerToast(`Lỗi: ${error.message}`);
            setIsLoading(false);
        }
    };

    const handleAddStudent = (newStudent: any) => {
        setStudents(prev => {
            const updated = [...prev, newStudent];
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_students_list', JSON.stringify(updated));
            }
            return updated;
        });
        triggerToast(`🎉 Đã thêm học viên ${newStudent.name} (${newStudent.code}) thành công!`);
    };

    const handleDeleteStudent = async (studentId: string) => {
        try {
            await fetch('/api/auth/delete-student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId })
            });
        } catch (e) {
            console.error('Lỗi khi xóa học viên:', e);
        }
        setStudents(prev => {
            const updated = prev.filter(s => s.id !== studentId);
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_students_list', JSON.stringify(updated));
            }
            return updated;
        });
        triggerToast('Đã xóa học viên thành công!');
    };

    const handleAddCourse = async (newCourse: any) => {
        setCourses(prev => {
            const updated = [newCourse, ...prev];
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_courses_list', JSON.stringify(updated));
            }
            return updated;
        });

        // 1. Lưu lên Server API để Web ẩn danh (Incognito) và tất cả trình duyệt khác đều thấy
        try {
            await fetch('/api/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ course: newCourse })
            });
        } catch (e) {
            console.error('Lỗi khi lưu môn học lên server API:', e);
        }

        // 2. Lưu lên Supabase nếu có kết nối
        try {
            await supabase.from('courses').insert([{
                id: newCourse.id,
                code: newCourse.code,
                name: newCourse.name,
                description: newCourse.description,
                duration: newCourse.duration,
                type: newCourse.type
            }]);
        } catch (e) {
            console.log('Saved course locally');
        }
        triggerToast(`🎉 Đã tạo ${newCourse.type === 'CERTIFICATE' ? 'chứng chỉ' : 'môn học'} ${newCourse.name} thành công!`);
    };

    const handleDeleteCourse = async (courseId: string) => {
        setCourses(prev => {
            const updated = prev.filter(c => c.id !== courseId && c.code !== courseId);
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_courses_list', JSON.stringify(updated));
            }
            return updated;
        });

        // Xóa trên Server API
        try {
            await fetch(`/api/courses?id=${encodeURIComponent(courseId)}`, {
                method: 'DELETE'
            });
        } catch (e) {
            console.error('Lỗi khi xóa môn học trên server API:', e);
        }

        try {
            await supabase.from('courses').delete().or(`id.eq.${courseId},code.eq.${courseId}`);
        } catch (e) {}
        triggerToast('Đã xóa môn học thành công!');
    };

    const handleResetAllData = async () => {
        if (typeof window !== 'undefined') {
            if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu mẫu (lớp học, phản hồi, sinh viên, điểm danh) và làm sạch toàn bộ hệ thống không?')) {
                return;
            }
            localStorage.removeItem('mock_surveys');
            localStorage.removeItem('itc_attendance_device_records');
            localStorage.removeItem('itc_students_list');
            localStorage.removeItem('itc_room_bookings');
            localStorage.removeItem('itc_teacher_criteria');
            localStorage.removeItem('itc_teacher_notifications');
            localStorage.removeItem('itc_courses_list');
            localStorage.setItem('itc_data_clean_v4', 'true');
        }

        try {
            await supabase.from('classes').delete().neq('id', 'keep_none');
            await supabase.from('reviews').delete().neq('id', 'keep_none');
        } catch (e) {
            console.error('Error clearing supabase:', e);
        }

        setStudents([]);
        setClasses([]);
        setReviews([]);
        setAttendances([]);
        setRoomBookings([]);
        setTeacherCriteria([]);
        setTeacherNotifications([]);
        triggerToast('✨ Đã xóa toàn bộ dữ liệu cũ và làm sạch hệ thống!');
    };

    const handleToggleCenterSurveyActive = async () => {
        const next = !isCenterSurveyActive;
        setIsCenterSurveyActive(next);
        if (typeof window !== 'undefined') {
            localStorage.setItem('itc_center_survey_active', String(next));
        }
        try {
            await fetch('/api/survey-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isCenterSurveyActive: next })
            });
        } catch (e) {
            console.error('Error saving survey settings:', e);
        }
        triggerToast(next ? 'Đã MỞ đợt khảo sát chất lượng Trung tâm (Bắt buộc SV làm khi đăng nhập)' : 'Đã TẠM ĐÓNG đợt khảo sát Trung tâm');
    };

    // Xử lý sinh viên đăng ký/hủy lớp học - lưu server và gửi thông báo
    const handleRegisterCourse = async (classCode: string, isEnroll: boolean) => {
        const studentId = currentUser?.id;
        const studentCode = (currentUser as any)?.code || studentId;
        if (!studentId) return;

        // Khi học viên đăng ký lại lớp học: Xóa bỏ trạng thái hủy môn cũ (nếu có) để học viên tham gia lại bình thường
        if (isEnroll) {
            setUnenrollRequests(prev => prev.filter(r => 
                !((r.studentId === studentId || r.studentId === studentCode || r.studentCode === studentCode || r.studentCode === studentId) && r.classCode === classCode)
            ));
        }

        // Lưu lên server
        try {
            const res = await fetch('/api/enrollments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId, classCode, action: isEnroll ? 'enroll' : 'unenroll' })
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.enrollments)) {
                    setEnrollments(data.enrollments);
                }
            }
        } catch (e) {
            console.error('Error saving enrollment:', e);
        }

        // Gửi thông báo khi đăng ký (không phải hủy)
        if (isEnroll) {
            const cls = classes.find(c => c.code === classCode);
            if (cls) {
                const courseName = courses.find(c => c.id === cls.courseId)?.name || classCode;
                const studentName = currentUser?.name || 'Học viên';
                const notifContent = `Học viên ${studentName} (${currentUser?.code || studentId.substring(0, 8)}) đã đăng ký tham gia lớp "${classCode}" - Môn: ${courseName}.`;

                if (cls.teacherId) {
                    dispatchTeacherNotification(cls.teacherId, {
                        title: '🎓 Học viên mới đăng ký lớp học',
                        content: notifContent,
                        type: 'ANNOUNCEMENT'
                    });
                }
                if (cls.teacherId2) {
                    dispatchTeacherNotification(cls.teacherId2, {
                        title: '🎓 Học viên mới đăng ký lớp học',
                        content: notifContent,
                        type: 'ANNOUNCEMENT'
                    });
                }
                triggerToast(`✅ Đăng ký lớp ${classCode} thành công! Giảng viên đã nhận thông báo.`);
            } else {
                // Đăng ký theo môn học đang mở (chờ xếp lịch & phòng máy)
                const course = courses.find(c => c.code === classCode || c.id === classCode);
                const courseName = course?.name || classCode;
                triggerToast(`✅ Đã đăng ký môn "${courseName}" thành công! Hệ thống sẽ thông báo ngay khi có lịch học & phòng máy.`);
            }
        } else {
            triggerToast(`Đã hủy đăng ký ${classCode}.`);
        }
    };

    // Giảng viên điểm danh nhanh sinh viên trong danh sách lớp
    const handleToggleAttendance = (classInfo: any, student: any) => {
        const today = new Date().toLocaleDateString('vi-VN');
        const existingIndex = attendances.findIndex(
            a => (a.classId === classInfo.id || a.classCode === classInfo.code) && (a.studentCode === student.code || a.studentId === student.id)
        );

        let updatedAttendances = [...attendances];
        let nextStatus = true;

        if (existingIndex >= 0) {
            nextStatus = !updatedAttendances[existingIndex].isPresent;
            updatedAttendances[existingIndex] = {
                ...updatedAttendances[existingIndex],
                isPresent: nextStatus,
                submittedAt: new Date().toLocaleTimeString('vi-VN')
            };
        } else {
            updatedAttendances.unshift({
                id: 'att_' + Date.now(),
                classId: classInfo.id,
                classCode: classInfo.code,
                studentCode: student.code,
                studentName: student.name,
                studentId: student.id,
                date: today,
                isPresent: true,
                deviceFingerprint: 'GV_DIEM_DANH',
                submittedAt: new Date().toLocaleTimeString('vi-VN')
            });
        }

        setAttendances(updatedAttendances);
        if (typeof window !== 'undefined') {
            localStorage.setItem('itc_attendance_device_records', JSON.stringify(updatedAttendances));
        }
        triggerToast(`Đã ${nextStatus ? 'điểm danh CÓ MẶT' : 'đánh dấu VẮNG'} học viên ${student.name}`);
    };

    // Học viên gửi yêu cầu hủy môn (Chờ trung tâm duyệt)
    const handleRequestUnenroll = async (classCode: string, reason?: string) => {
        const studentId = currentUser?.id;
        const studentCode = currentUser?.code;
        const studentName = currentUser?.name || 'Học viên';
        if (!studentId) return;

        try {
            const res = await fetch('/api/unenroll-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    studentId,
                    studentCode,
                    studentName,
                    classCode,
                    reason: reason || 'Lý do cá nhân'
                })
            });
            const data = await res.json();
            if (data.requests) {
                setUnenrollRequests(data.requests);
            }
            triggerToast('⏳ Đã gửi đơn xin hủy môn. Vui lòng chờ Trung tâm phê duyệt!');
        } catch (e) {
            console.error('Error requesting unenroll:', e);
            triggerToast('Lỗi khi gửi yêu cầu hủy môn!');
        }
    };

    // Admin duyệt hủy môn học cho sinh viên
    const handleApproveUnenroll = async (requestId: string) => {
        try {
            const res = await fetch('/api/unenroll-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approve',
                    requestId
                })
            });
            const data = await res.json();
            if (data.requests) {
                setUnenrollRequests(data.requests);
            }
            if (data.enrollments) {
                setEnrollments(data.enrollments);
            }
            // Dọn dẹp cache localStorage của học viên nếu có
            const req = unenrollRequests.find(r => r.id === requestId);
            if (req && typeof window !== 'undefined') {
                const sId = req.studentId;
                const cached = localStorage.getItem('itc_enrolled_' + sId);
                if (cached) {
                    try {
                        const arr = JSON.parse(cached);
                        const updated = arr.filter((c: string) => c !== req.classCode);
                        localStorage.setItem('itc_enrolled_' + sId, JSON.stringify(updated));
                    } catch (e) {}
                }
            }
            triggerToast('✅ Đã duyệt đơn hủy môn học!');
        } catch (e) {
            console.error('Error approving unenroll:', e);
            triggerToast('Lỗi khi duyệt đơn hủy môn!');
        }
    };

    // Admin từ chối đơn hủy môn học của sinh viên
    const handleRejectUnenroll = async (requestId: string, reason?: string) => {
        try {
            const res = await fetch('/api/unenroll-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reject',
                    requestId,
                    reason
                })
            });
            const data = await res.json();
            if (data.requests) {
                setUnenrollRequests(data.requests);
            }
            triggerToast('❌ Đã từ chối đơn hủy môn học!');
        } catch (e) {
            console.error('Error rejecting unenroll:', e);
            triggerToast('Lỗi khi từ chối đơn hủy môn!');
        }
    };

    // Giảng viên lưu điểm
    const handleSaveGrades = async (classId: string, grades: any[]) => {
        // Cập nhật state
        setStudentGrades((prev: any) => {
            const next = { ...prev };
            grades.forEach((g: any) => {
                next[`${g.classId}_${g.studentId}`] = g;
                if (g.classCode) next[`${g.classCode}_${g.studentId}`] = g;
                if (g.studentCode) {
                    next[`${g.classId}_${g.studentCode}`] = g;
                    if (g.classCode) next[`${g.classCode}_${g.studentCode}`] = g;
                }
            });
            return next;
        });
        // Lưu lên server
        try {
            await fetch('/api/grades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId, grades })
            });
        } catch (e) {
            console.error('Error saving grades:', e);
        }
        triggerToast('✅ Đã lưu bảng điểm thành công!');
    };

    // Giảng viên bật/tắt khảo sát lớp (Hỗ trợ 2 giảng viên bật khảo sát độc lập cùng lúc)
    const handleToggleClassSurvey = async (classId: string, currentStatus: string, teacherId?: string) => {
        const targetClass = classes.find(c => c.id === classId);
        if (!targetClass) {
            await handleToggleClassStatus(classId, currentStatus);
            return;
        }

        const effectiveTeacherId = teacherId || currentUser?.id || targetClass.teacherId;
        const currentActive: string[] = (targetClass as any).activeSurveyTeachers || 
            (targetClass.status === 'OPEN_SURVEY' 
                ? [targetClass.teacherId, targetClass.teacherId2].filter(Boolean) 
                : []);

        const isTurningOn = !currentActive.includes(effectiveTeacherId);

        // KIỂM TRA QUY CHẾ: Giảng viên chưa đưa ra tiêu chí khảo sát cá nhân thì KHÔNG ĐƯỢC BẬT KHẢO SÁT
        if (isTurningOn) {
            const myCriteria = (teacherCriteria || []).filter(
                (tc: any) => tc.teacherId === effectiveTeacherId
            );
            if (myCriteria.length === 0) {
                alert('⚠️ BẠN CHƯA ĐƯA RA TIÊU CHÍ KHẢO SÁT CÁ NHÂN!\n\nTheo quy chế của Trung tâm ITC, bạn cần đưa ra tiêu chí khảo sát cá nhân trước thì mới được phép bật đợt khảo sát cho sinh viên.\n\nVui lòng bấm vào "Đề xuất Tiêu chí khảo sát" ở phía trên để tạo tiêu chí trước.');
                return;
            }
        }

        let updatedActive: string[];
        if (currentActive.includes(effectiveTeacherId)) {
            updatedActive = currentActive.filter(id => id !== effectiveTeacherId);
        } else {
            updatedActive = [...currentActive, effectiveTeacherId];
        }

        const newStatus = updatedActive.length > 0 ? 'OPEN_SURVEY' : 'CLOSED_SURVEY';

        setClasses(prev => {
            const updated = prev.map(c => c.id === classId ? {
                ...c,
                status: newStatus,
                activeSurveyTeachers: updatedActive
            } : c);
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_classes_list', JSON.stringify(updated));
            }
            return updated;
        });

        try {
            await fetch('/api/classes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId,
                    status: newStatus,
                    activeSurveyTeachers: updatedActive
                })
            });
        } catch (e) {}

        const teacherName = teachers.find(t => t.id === effectiveTeacherId)?.name || 'Giảng viên';
        const isNowOn = updatedActive.includes(effectiveTeacherId);
        triggerToast(isNowOn 
            ? `🟢 Đã BẬT đợt khảo sát của ${teacherName} cho lớp ${targetClass.code}!`
            : `⚪ Đã TẮT khảo sát của ${teacherName} cho lớp ${targetClass.code}.`
        );
    };

    // Học viên tự điểm danh tại địa chỉ Trung tâm ITC (Có định vị GPS và kiểm tra bán kính)
    const handleStudentSelfAttendance = (classCode: string, gpsInfo?: any) => {
        const studentId = currentUser?.id;
        const studentCode = (currentUser as any)?.code || studentId;
        const studentName = currentUser?.name || 'Học viên';
        if (!studentId) return;

        const targetClass = classes.find(c => c.code === classCode);
        if (!targetClass) return;

        const today = new Date().toLocaleDateString('vi-VN');
        const deviceId = typeof window !== 'undefined' ? (localStorage.getItem('itc_device_client_id') || 'DEV_' + Math.random().toString(36).substr(2, 8)) : 'DEV_UNKNOWN';

        // 1. Kiểm tra thiết bị đã điểm danh cho sinh viên khác hôm nay chưa
        const isDeviceUsedByOther = attendances.some(
            a => a.date === today && 
                 a.deviceFingerprint === deviceId && 
                 a.studentCode !== studentCode && 
                 a.studentId !== studentId
        );
        if (isDeviceUsedByOther) {
            triggerToast('🚫 THIẾT BỊ NÀY ĐÃ ĐIỂM DANH CHO HỌC VIÊN KHÁC! Mỗi thiết bị chỉ được điểm danh cho 1 học viên duy nhất.');
            return;
        }

        // 2. Kiểm tra học viên đã điểm danh cho lớp này hôm nay chưa
        const isAlreadyAttended = attendances.some(
            a => a.date === today &&
                 (a.classId === targetClass.id || a.classCode === targetClass.code) &&
                 (a.studentCode === studentCode || a.studentId === studentId) &&
                 a.isPresent
        );
        if (isAlreadyAttended) {
            triggerToast('Bạn đã điểm danh buổi học hôm nay rồi!');
            return;
        }

        const locationText = gpsInfo
            ? `Trung tâm ITC - ĐH Đà Lạt (${gpsInfo.isSimulated ? 'Mô phỏng Lab' : `GPS: Cách ${gpsInfo.distanceMeters}m`})`
            : 'Trung tâm ITC - ĐH Đà Lạt';

        const newRecord = {
            id: 'att_self_' + Date.now(),
            classId: targetClass.id,
            classCode: targetClass.code,
            studentCode: studentCode,
            studentName: studentName,
            studentId: studentId,
            date: today,
            isPresent: true,
            deviceFingerprint: deviceId,
            location: locationText,
            gpsLatitude: gpsInfo?.latitude,
            gpsLongitude: gpsInfo?.longitude,
            gpsDistanceMeters: gpsInfo?.distanceMeters,
            isSimulatedGPS: gpsInfo?.isSimulated || false,
            submittedAt: new Date().toLocaleTimeString('vi-VN')
        };

        const updated = [newRecord, ...attendances];
        setAttendances(updated);
        if (typeof window !== 'undefined') {
            localStorage.setItem('itc_attendance_device_records', JSON.stringify(updated));
        }

        const distInfo = gpsInfo?.distanceMeters !== undefined ? ` (Khoảng cách GPS: ${gpsInfo.distanceMeters}m)` : '';
        triggerToast(`🎉 Điểm danh thành công lớp ${targetClass.code} tại Trung tâm ITC!${distInfo}`);
    };

    if (!isMounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md p-2">
                        <img src="/logoitc.jpg" alt="ITC Logo" className="h-8 object-contain" />
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Icons.Loader className="w-4 h-4 animate-spin text-itc-800" />
                        <span>Đang tải hệ thống ITC...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <LoginView 
                onLoginSuccess={(user, userRole, teacherId) => {
                    handleSetUserSession(user, userRole, teacherId);
                    fetchData(true);
                }} 
            />
        );
    }

    return (
        <div suppressHydrationWarning className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
            {/* Global Toast */}
            {toastMessage && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-full text-xs font-bold shadow-2xl animate-fade-in-down flex items-center gap-2">
                    <Icons.CheckCircle className="w-4 h-4 text-emerald-400" />
                    {toastMessage}
                </div>
            )}

            {/* Header ITC */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
                <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="shrink-0 bg-white rounded-xl overflow-hidden flex items-center justify-center p-1">
                            <img src="/logoitc.jpg" alt="ITC Logo" className="h-10 object-contain" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-extrabold text-itc-blue-900 text-sm lg:text-base leading-tight tracking-tight uppercase">
                                    {currentUser?.role === 'ADMIN' && 'ITC Admin Dashboard - Hệ thống Quản trị'}
                                    {currentUser?.role === 'TEACHER' && 'ITC Teacher Portal - Góc Giảng viên'}
                                    {currentUser?.role === 'STUDENT' && 'ITC Student Portal - Cổng Học viên'}
                                </h1>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    currentUser?.role === 'ADMIN' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                                    currentUser?.role === 'TEACHER' ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                                    'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                }`}>
                                    {currentUser?.role === 'ADMIN' && '🛡️ Quản lý'}
                                    {currentUser?.role === 'TEACHER' && '👨‍🏫 Giảng viên'}
                                    {currentUser?.role === 'STUDENT' && '🎓 Học viên'}
                                </span>
                            </div>
                            <p className="text-[10px] lg:text-xs text-slate-500 font-medium">Trung tâm Công nghệ Thông tin - Trường ĐH Đà Lạt</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-3">
                        {/* User badge */}
                        <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>{currentUser?.name || currentUser?.email}</span>
                        </div>

                        {currentUser?.role === 'ADMIN' && (
                            <>
                                <button 
                                    onClick={handleResetAllData}
                                    title="Xóa toàn bộ dữ liệu mẫu cũ và làm sạch hệ thống"
                                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                                >
                                    <Icons.Trash className="w-3.5 h-3.5 text-rose-500" /> Xóa Data Mẫu
                                </button>
                                <button 
                                    onClick={() => setShowReport(true)}
                                    className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-itc-50 text-itc-800 hover:bg-itc-100 border border-itc-200 rounded-lg text-xs font-bold transition-colors"
                                >
                                    <Icons.FileText className="w-4 h-4" /> Xuất Báo Cáo
                                </button>
                            </>
                        )}

                        <button 
                            onClick={() => setShowChangePasswordModal(true)}
                            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                        >
                            <Icons.Lock className="w-3.5 h-3.5" /> Đổi mật khẩu
                        </button>

                        <button 
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition"
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area: Strictly separates views based on currentUser.role */}
            <main className="flex-1 flex flex-col relative">
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20">
                        <Icons.Loader className="w-10 h-10 text-itc-600 animate-spin mb-4" />
                        <p className="text-sm font-semibold text-slate-500">Đang tải dữ liệu từ máy chủ...</p>
                    </div>
                ) : (
                    <>
                        {currentUser?.role === 'ADMIN' && (
                            <AdminView 
                                classes={classes} 
                                courses={courses} 
                                onAddCourse={handleAddCourse}
                                onDeleteCourse={handleDeleteCourse}
                                teachers={teachers} 
                                reviews={reviews} 
                                criteriaList={criteriaList}
                                onSaveCriteriaList={handleSaveCriteriaList}
                                teacherCriteria={teacherCriteria}
                                onUpdateTeacherCriteriaStatus={handleUpdateTeacherCriteriaStatus}
                                onDeleteTeacherCriteria={handleDeleteTeacherCriteria}
                                roomBookings={roomBookings}
                                onUpdateRoomBookingStatus={handleUpdateRoomBookingStatus}
                                attendances={attendances}
                                enrollments={enrollments}
                                stats={stats} 
                                warningThreshold={warningThreshold} 
                                setWarningThreshold={setWarningThreshold} 
                                onUpdateAction={handleUpdateAction}
                                onAddClass={handleAddClass}
                                onToggleClassStatus={handleToggleClassStatus}
                                onDeleteClass={handleDeleteClass}
                                onRefreshData={() => fetchData(false)}
                                onDeleteTeacher={handleDeleteTeacher}
                                students={students}
                                onAddStudent={handleAddStudent}
                                onDeleteStudent={handleDeleteStudent}
                                onImportTeachers={handleImportTeachers}
                                onImportStudents={handleImportStudents}
                                onResetAllData={handleResetAllData}
                                isCenterSurveyActive={isCenterSurveyActive}
                                onToggleCenterSurveyActive={handleToggleCenterSurveyActive}
                                onUpdateTeacherAllCriteriaStatus={handleUpdateTeacherAllCriteriaStatus}
                                onApproveAllPendingCriteria={handleApproveAllPendingCriteria}
                                unenrollRequests={unenrollRequests}
                                onApproveUnenroll={handleApproveUnenroll}
                                onRejectUnenroll={handleRejectUnenroll}
                            />
                        )}
                        
                        {currentUser?.role === 'TEACHER' && (
                            <TeacherView 
                                currentUser={currentUser}
                                currentUserRole="TEACHER"
                                teachers={teachers} 
                                selectedTeacherId={currentUser.id} 
                                setSelectedTeacherId={setSelectedTeacherId} 
                                classes={classes} 
                                courses={courses}
                                students={students}
                                reviews={reviews}
                                criteriaList={criteriaList}
                                teacherCriteria={teacherCriteria}
                                onSaveTeacherCriteria={handleSaveTeacherCriteria}
                                roomBookings={roomBookings}
                                onSubmitRoomBooking={handleSubmitRoomBooking}
                                attendances={attendances}
                                teacherNotifications={teacherNotifications}
                                onMarkTeacherNotificationsRead={handleMarkTeacherNotificationsRead}
                                enrollments={enrollments}
                                studentGrades={studentGrades}
                                onSaveGrades={handleSaveGrades}
                                onToggleClassSurvey={handleToggleClassSurvey}
                                onToggleAttendance={handleToggleAttendance}
                                onCancelRoomBooking={handleCancelRoomBooking}
                                stats={stats} 
                                onUpdateTeacherNote={handleUpdateTeacherNote}
                                onEscalateReview={handleEscalateReview}
                            />
                        )}

                        {currentUser?.role === 'STUDENT' && (
                            <StudentView
                                currentUser={currentUser}
                                classes={classes}
                                courses={courses}
                                teachers={teachers}
                                criteriaList={criteriaList}
                                teacherCriteria={teacherCriteria}
                                reviews={reviews}
                                attendances={attendances}
                                notifications={notifications}
                                studentGrades={studentGrades}
                                students={students}
                                enrollments={enrollments}
                                unenrollRequests={unenrollRequests}
                                onSaveSurvey={handleSaveStudentSurvey}
                                onRegisterCourse={handleRegisterCourse}
                                onRequestUnenroll={handleRequestUnenroll}
                                onSelfAttendance={handleStudentSelfAttendance}
                                isCenterSurveyActive={isCenterSurveyActive}
                            />
                        )}
                    </>
                )}
            </main>

            {/* Modals */}
            {showReport && (
                <ReportModal 
                    stats={stats} 
                    warningThreshold={warningThreshold} 
                    reviews={reviews}
                    classes={classes}
                    courses={courses}
                    criteriaList={criteriaList}
                    teachers={teachers}
                    onClose={() => setShowReport(false)} 
                />
            )}
            
            {showChangePasswordModal && (
                <ChangePasswordModal 
                    onClose={() => setShowChangePasswordModal(false)}
                    onSuccess={() => {
                        setShowChangePasswordModal(false);
                        triggerToast('Đã lưu mật khẩu mới thành công!');
                    }}
                />
            )}
        </div>
    );
}


