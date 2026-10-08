import { Course, Teacher, Student, ClassInfo, CriteriaCategory, Review, TeacherCriterion, AttendanceRecord, RoomBooking, StudentNotification, StudentGrade } from '../types';

export const INITIAL_COURSES: Course[] = [
    { id: 'crs_1', code: 'IT-BASIC', name: 'Tin học cơ bản' },
    { id: 'crs_2', code: 'IT-ADV', name: 'Tin học Nâng cao' },
    { id: 'crs_3', code: 'WEB-DEV', name: 'Lập trình Web Frontend' },
    { id: 'crs_4', code: 'DATA-ANALYTICS', name: 'Phân tích dữ liệu với Python' },
    { id: 'crs_cc01', code: 'CC01', name: 'Tin học MOS', type: 'CERTIFICATE', duration: '90 tiết (60 LT - 30 TH, 6 tuần)', description: 'Khóa đào tạo chứng chỉ chuyên đề - Trung tâm Tin học ITC' }
];

export const INITIAL_TEACHERS: Teacher[] = [];

// Tiêu chí đánh giá riêng do từng Giảng viên tự đưa ra (khởi tạo trống)
export const INITIAL_TEACHER_CRITERIA: TeacherCriterion[] = [];

// Danh sách lớp học (khởi tạo trống, Admin hoặc Giảng viên tự tạo mới)
export const INITIAL_CLASSES: ClassInfo[] = [];

// Tiêu chí chung của Trung tâm ITC - Trường Đại học Đà Lạt
export const CRITERIA_CATEGORIES: CriteriaCategory[] = [];

export const INITIAL_REVIEWS: Review[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

// Danh sách yêu cầu đăng ký phòng dạy học của Giảng viên (khởi tạo trống)
export const INITIAL_ROOM_BOOKINGS: RoomBooking[] = [];

// Danh sách thông báo cho Sinh viên (từ Trung tâm & Giảng viên)
export const INITIAL_NOTIFICATIONS: StudentNotification[] = [
    {
        id: 'notif_1',
        title: '📢 Chào mừng đến với Hệ thống Đánh giá Chất lượng ITC - ĐH Đà Lạt',
        content: 'Học viên vui lòng hoàn thành phiếu khảo sát chất lượng sau khi kết thúc khóa học để xem bảng điểm và nhận chứng chỉ.',
        sender: 'CENTER',
        senderName: 'Trung tâm Công nghệ Thông tin - ĐH Đà Lạt',
        date: new Date().toLocaleDateString('vi-VN'),
        isRead: false,
        priority: 'NORMAL'
    }
];

// Danh sách điểm số của sinh viên (khởi tạo trống)
export const INITIAL_STUDENT_GRADES: Record<string, StudentGrade> = {};

// Danh sách sinh viên (khởi tạo trống, Admin tự tạo thêm theo thứ tự SV01, SV02...)
export const INITIAL_STUDENTS: Student[] = [];
