export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface LikertOption {
    score: number;
    label: string;
    description?: string;
    color: string;
    bgActive: string;
    textActive: string;
    borderActive: string;
    emoji: string;
}

export const LIKERT_LEVELS: LikertOption[] = [
    { score: 1, label: 'Rất không hài lòng', color: 'rose', bgActive: 'bg-rose-500', textActive: 'text-white', borderActive: 'border-rose-600', emoji: '😞' },
    { score: 2, label: 'Không hài lòng', color: 'orange', bgActive: 'bg-orange-500', textActive: 'text-white', borderActive: 'border-orange-600', emoji: '🙁' },
    { score: 3, label: 'Bình thường/Không có ý kiến', color: 'amber', bgActive: 'bg-amber-500', textActive: 'text-white', borderActive: 'border-amber-600', emoji: '😐' },
    { score: 4, label: 'Hài lòng', color: 'sky', bgActive: 'bg-sky-600', textActive: 'text-white', borderActive: 'border-sky-700', emoji: '🙂' },
    { score: 5, label: 'Rất hài lòng', color: 'emerald', bgActive: 'bg-emerald-600', textActive: 'text-white', borderActive: 'border-emerald-700', emoji: '🤩' }
];

export const getLikertLabel = (score: number): string => {
    const item = LIKERT_LEVELS.find(l => l.score === score);
    return item ? `${score} - ${item.label}` : `${score}★`;
};

export interface Course {
    id: string;
    code?: string;
    name: string;
    duration?: string;
    description?: string;
    type?: 'REGULAR' | 'CERTIFICATE'; // Môn học chính quy hoặc Chứng chỉ đào tạo ITC
    totalPeriods?: number; // Tổng số tiết (VD: 45)
    theoryPeriods?: number; // Số tiết Lý thuyết (VD: 30)
    practicePeriods?: number; // Số tiết Thực hành (VD: 15)
}

export interface Teacher {
    id: string;
    code?: string;
    name: string;
    email?: string;
    dept?: string;
}

export interface Student {
    id: string;
    code: string;
    name: string;
    email: string;
    password?: string;
    phone?: string;
    enrolledClassCodes?: string[];
    createdAt?: string;
    status?: 'ACTIVE' | 'GRADUATED' | 'INACTIVE';
}

export interface TeacherCriterion {
    id: string;
    teacherId: string;
    classId?: string; // Tùy chọn: áp dụng riêng cho 1 lớp hoặc chung cho mọi lớp của GV
    name: string;
    description?: string;
    orderIndex?: number;
    isActive?: boolean;
    status?: 'APPROVED' | 'PENDING' | 'REJECTED'; // Trạng thái phê duyệt bởi Admin
}

export interface RoomBooking {
    id: string;
    teacherId: string;
    teacherName: string;
    courseId?: string;
    courseName: string;
    room: string;
    date: string;
    timeSlot: string;
    computersNeeded: number;
    purpose: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    adminNote?: string;
}

export interface TeacherNotification {
    id: string;
    teacherId: string;
    title: string;
    content: string;
    sender: 'CENTER' | 'ADMIN' | 'SYSTEM';
    date: string;
    isRead?: boolean;
    type?: 'ASSIGNMENT' | 'APPROVAL' | 'REJECTION' | 'ANNOUNCEMENT';
}

export interface StudentNotification {
    id: string;
    title: string;
    content: string;
    sender: 'CENTER' | 'TEACHER';
    senderName: string;
    classCode?: string;
    date: string;
    isRead?: boolean;
    priority?: 'NORMAL' | 'HIGH';
}

export interface StudentGrade {
    studentCode: string;
    classId: string;
    attendanceScore: number; // 10%
    labScore: number;        // 30%
    midtermScore: number;    // 20%
    finalScore: number;      // 40%
    totalScore: number;
    letterGrade: string;
    isPassed: boolean;
}

export interface ClassInfo {
    id: string;
    courseId: string;
    teacherId: string; // Giảng viên chính / GV 1
    teacherId2?: string; // Giảng viên đồng giảng dạy / GV 2 (tùy chọn)
    teacherRole1?: string; // VD: "Lý thuyết & Tổng quan"
    teacherRole2?: string; // VD: "Thực hành phòng máy & Đồ án"
    teacherIds?: string[]; // Danh sách ID tất cả GV phụ trách
    code: string;
    room: string;
    schedule: string;
    studentsCount: number;
    status: 'OPEN_SURVEY' | 'CLOSED_SURVEY';
}

export interface CriteriaRatings {
    facility?: number;
    environment?: number;
    curriculum?: number;
    teaching_method?: number;
    teaching_attitude?: number;
    center_service?: number;
    [key: string]: number | undefined; // index signature for dynamic access
}

export interface Review {
    id: string;
    classId: string;
    classCode?: string;
    studentCode?: string;
    studentName?: string;
    ratings: CriteriaRatings; // Đánh giá chung trung tâm
    teacherRatings?: Record<string, Record<string, number>>; // { [teacherId]: { [critId]: score (1-5) } }
    comment: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
    actionNote: string;
    createdAt: string;
    teacherNote?: string;
    teacherNotes?: Record<string, string>; // Ghi chú riêng của từng GV { [teacherId]: note }
    isEscalated?: boolean;
    isTeacherSurvey?: boolean;
    isCenterSurvey?: boolean;
    type?: 'TEACHER' | 'CENTER';
    deviceFingerprint?: string; // Mã nhận diện thiết bị
}

export interface AttendanceRecord {
    id: string;
    classId: string;
    classCode?: string;
    studentCode: string;
    studentId?: string;
    studentName: string;
    courseName?: string;
    date: string;
    isPresent: boolean;
    deviceFingerprint: string;
    submittedAt: string;
}

export interface CriteriaCategory {
    id: string;
    name: string;
    desc: string;
    category?: 'CENTER' | 'TEACHER';
}

export interface AlertItem {
    id: string;
    classCode: string;
    room: string;
    teacherName: string;
    critName: string;
    score: string;
    count: number;
}

export interface TeacherMetric {
    teacherId: string;
    teacherName: string;
    role: string;
    criteriaAvgs: Record<string, string | number>;
    overallAvg: string | number;
    feedbackCount: number;
}

export interface ClassMetric {
    classInfo: ClassInfo;
    courseName: string;
    teacherName: string;
    teacherName2?: string;
    teacherRole1?: string;
    teacherRole2?: string;
    count: number;
    criteriaSums: CriteriaRatings;
    criteriaAvgs: Record<string, string | number>;
    overallAvg: string | number;
    teacherMetrics?: Record<string, TeacherMetric>;
    badComments: Array<{ 
        id: string; 
        studentCode?: string;
        studentName?: string;
        comment: string; 
        status: string; 
        teacherNote?: string; 
        teacherNotes?: Record<string, string>;
        isEscalated?: boolean;
        createdAt?: string;
    }>;
    attendanceCount?: number;
}

export interface AppStats {
    totalSubmissions: number;
    centerAvgSatisfaction: string | number;
    alertList: AlertItem[];
    classMetrics: Record<string, ClassMetric>;
    totalAttendances?: number;
}
