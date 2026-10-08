/**
 * scheduleConflict.ts
 * Module phát hiện và ngăn chặn trùng lịch dạy của Giảng viên, trùng phòng máy và trùng lịch học của Sinh viên.
 */

export const STANDARD_ROOMS = [
    'Phòng TV 1',
    'Phòng TV 2',
    'Phòng TV 3',
    'Phòng TV 4',
    'Phòng A24.1',
    'Phòng A24.LAU',
    'Phòng A8.3',
    'Phòng A8.5',
    'Phòng A8.6'
];

export const STANDARD_DAYS = [
    { key: 'T2', label: 'Thứ 2' },
    { key: 'T3', label: 'Thứ 3' },
    { key: 'T4', label: 'Thứ 4' },
    { key: 'T5', label: 'Thứ 5' },
    { key: 'T6', label: 'Thứ 6' },
    { key: 'T7', label: 'Thứ 7' },
    { key: 'CN', label: 'Chủ Nhật' }
];

export const STANDARD_SHIFTS = [
    { key: 'Sáng', label: 'Ca Sáng (08:00 - 11:30)', timeRange: '08:00 - 11:30' },
    { key: 'Chiều', label: 'Ca Chiều (13:30 - 17:00)', timeRange: '13:30 - 17:00' },
    { key: 'Tối', label: 'Ca Tối (18:00 - 20:30)', timeRange: '18:00 - 20:30' }
];

// Hàm chuẩn hóa chuỗi không dấu để tạo email
export const removeVietnameseTones = (str: string): string => {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();
};

// Tự động sinh Mã SV kế tiếp: SV01, SV02, ... SV0n
export const getNextStudentCode = (existingStudents: any[]): string => {
    let maxNum = 0;
    existingStudents.forEach(s => {
        const code = s.code || s.id || '';
        const match = code.match(/SV0*(\d+)/i);
        if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    });
    const nextNum = maxNum + 1;
    return `SV${nextNum < 10 ? '0' + nextNum : nextNum}`;
};

// Kiểm tra chuỗi có phải UUID không
export const isUuid = (str?: string): boolean => {
    if (!str) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
};

// Chuẩn hóa và rút gọn mã sinh viên hiển thị (hiện mã chuẩn SV01, SV02... hoặc rút gọn SV-XXXXXX thay vì UUID dài)
export const getDisplayStudentCode = (
    studentRef?: any,
    studentsList: any[] = []
): string => {
    if (!studentRef) return 'SV-ITC';
    
    let raw = typeof studentRef === 'string' 
        ? studentRef 
        : (studentRef.studentCode || studentRef.code || studentRef.studentId || studentRef.id || '');
    const name = typeof studentRef === 'object' ? (studentRef.studentName || studentRef.name || '') : '';

    // 1. Tìm trong studentsList theo id, code, hoặc tên
    if (studentsList && studentsList.length > 0) {
        const found = studentsList.find((s: any) => 
            (raw && (s.id === raw || s.code === raw)) || 
            (name && s.name && s.name.trim().toLowerCase() === name.trim().toLowerCase())
        );
        if (found) {
            if (found.code && !isUuid(found.code)) {
                return found.code;
            }
        }
    }

    // 2. Tra cứu theo tên mẫu quen thuộc nếu có
    if (name) {
        const lowerName = name.trim().toLowerCase();
        if (lowerName === 'nguyễn văn an') return 'SV01';
        if (lowerName === 'trần thị bình') return 'SV02';
        if (lowerName === 'lê hoàng cường') return 'SV03';
        if (lowerName === 'phạm quốc dũng') return 'SV04';
        if (lowerName === 'hoàng thị mỹ duyên') return 'SV05';
        if (lowerName === 'đỗ minh đạt') return 'SV06';
    }

    // 3. Nếu raw không phải UUID (ví dụ SV01, SV02, ITC2024001...) thì dùng trực tiếp
    if (raw && !isUuid(raw)) {
        return raw;
    }

    // 4. Nếu là UUID dài thì rút gọn thành mã số sinh viên bình thường, gọn gàng (VD: SV-EE269C)
    if (raw && isUuid(raw)) {
        return `SV-${raw.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    }

    return raw || 'SV-ITC';
};

// Tự động sinh Mã GV kế tiếp: GV01, GV02, ... GV0n
export const getNextTeacherCode = (existingTeachers: any[]): string => {
    let maxNum = 0;
    existingTeachers.forEach(t => {
        const code = t.code || t.id || '';
        const match = code.match(/GV0*(\d+)/i);
        if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    });
    const nextNum = maxNum + 1;
    return `GV${nextNum < 10 ? '0' + nextNum : nextNum}`;
};

// Tự động tạo email gợi ý từ Họ và tên hoặc Mã: e.g. nguyenvana@itc.edu.vn hoặc sv01@itc.edu.vn
export const generateSuggestedEmail = (name: string, code: string): string => {
    if (!name.trim()) return `${code.toLowerCase()}@itc.edu.vn`;
    const clean = removeVietnameseTones(name).replace(/[^a-z0-9]/g, '');
    if (clean.length > 2) {
        return `${clean}@itc.edu.vn`;
    }
    return `${code.toLowerCase()}@itc.edu.vn`;
};

// Phân tích chuỗi Lịch học (VD: "Sáng T2-T4-T6 (08:00 - 10:30)" -> { days: ['T2','T4','T6'], shift: 'Sáng' })
export const parseSchedule = (scheduleStr: string) => {
    if (!scheduleStr) return { days: [], shift: 'Tối' };

    const lower = scheduleStr.toLowerCase();
    let shift = 'Tối';
    if (lower.includes('sang') || lower.includes('sáng')) shift = 'Sáng';
    else if (lower.includes('chieu') || lower.includes('chiều')) shift = 'Chiều';
    else if (lower.includes('toi') || lower.includes('tối')) shift = 'Tối';

    // BỎ phần giờ nằm trong ngoặc đơn (VD: "(08:00 - 10:30)", "(18:00 - 20:30)")
    // để tránh số phút "30" hay "15" bị nhận nhầm thành Thứ 3, Thứ 5!
    const dayPart = lower.split('(')[0] || lower;

    // Tìm các ngày chính xác bằng regex (tránh khớp số nằm trong mã lớp hoặc giờ)
    const days: string[] = [];
    if (/\b(t2|thứ\s*2|thứ\s*hai)\b|(?<!\d)2(?!\d)/i.test(dayPart)) days.push('T2');
    if (/\b(t3|thứ\s*3|thứ\s*ba)\b|(?<!\d)3(?!\d)/i.test(dayPart)) days.push('T3');
    if (/\b(t4|thứ\s*4|thứ\s*tư)\b|(?<!\d)4(?!\d)/i.test(dayPart)) days.push('T4');
    if (/\b(t5|thứ\s*5|thứ\s*năm)\b|(?<!\d)5(?!\d)/i.test(dayPart)) days.push('T5');
    if (/\b(t6|thứ\s*6|thứ\s*sáu)\b|(?<!\d)6(?!\d)/i.test(dayPart)) days.push('T6');
    if (/\b(t7|thứ\s*7|thứ\s*bảy)\b|(?<!\d)7(?!\d)/i.test(dayPart)) days.push('T7');
    if (/\b(cn|chủ\s*nhật)\b/i.test(dayPart)) days.push('CN');

    return { days, shift };
};

// Kiểm tra 2 lịch học có bị trùng nhau không (Cùng ca và trùng ít nhất 1 ngày trong tuần)
export const isScheduleOverlapping = (scheduleA: string, scheduleB: string): boolean => {
    if (!scheduleA || !scheduleB) return false;
    const parsedA = parseSchedule(scheduleA);
    const parsedB = parseSchedule(scheduleB);

    // Khác ca học (Sáng / Chiều / Tối) thì không trùng
    if (parsedA.shift !== parsedB.shift) return false;

    // Kiểm tra có ngày nào trùng nhau không
    const hasCommonDay = parsedA.days.some(day => parsedB.days.includes(day));
    return hasCommonDay;
};

// Chuẩn hóa tên phòng để so sánh
export const normalizeRoomName = (room: string): string => {
    if (!room) return '';
    const r = room.toLowerCase().trim();
    if (r.includes('tv 1') || r.includes('tv1')) return 'Phòng TV 1';
    if (r.includes('tv 2') || r.includes('tv2')) return 'Phòng TV 2';
    if (r.includes('tv 3') || r.includes('tv3')) return 'Phòng TV 3';
    if (r.includes('tv 4') || r.includes('tv4')) return 'Phòng TV 4';
    if (r.includes('a24.1') || r.includes('a24-1') || r.includes('a24_1')) return 'Phòng A24.1';
    if (r.includes('a24.lau') || r.includes('a24-lau') || r.includes('a24 lầu') || r.includes('a24lau')) return 'Phòng A24.LAU';
    if (r.includes('a8.3') || r.includes('a8-3') || r.includes('a8_3')) return 'Phòng A8.3';
    if (r.includes('a8.5') || r.includes('a8-5') || r.includes('a8_5')) return 'Phòng A8.5';
    if (r.includes('a8.6') || r.includes('a8-6') || r.includes('a8_6')) return 'Phòng A8.6';
    return room.trim();
};

/**
 * 1. Kiểm tra trùng lịch của Giảng viên:
 * "Giảng viên đã có lịch dạy ngày hôm đó hoặc vào giờ đó không thể đăng ký hoặc dạy thêm phòng nào hoặc môn nào khác."
 */
export const checkTeacherConflict = (
    teacherId: string,
    targetSchedule: string,
    existingClasses: any[],
    ignoreClassId?: string
): { conflict: boolean; conflictingClass?: any; message?: string } => {
    if (!teacherId || !targetSchedule) return { conflict: false };

    for (const cls of existingClasses) {
        if (ignoreClassId && cls.id === ignoreClassId) continue;

        const isTeaching = cls.teacherId === teacherId || cls.teacherId2 === teacherId || (cls.teacherIds && cls.teacherIds.includes(teacherId));
        if (isTeaching && cls.schedule) {
            if (isScheduleOverlapping(cls.schedule, targetSchedule)) {
                return {
                    conflict: true,
                    conflictingClass: cls,
                    message: `Giảng viên đã có lịch dạy lớp "${cls.code}" vào ${cls.schedule} (tại ${cls.room}). Không thể dạy trùng ca!`
                };
            }
        }
    }

    return { conflict: false };
};

/**
 * 2. Kiểm tra trùng lịch Phòng máy:
 * Không thể có 2 lớp học hoặc yêu cầu phòng được xếp vào cùng 1 phòng ở cùng ca/giờ.
 */
export const checkRoomConflict = (
    room: string,
    targetSchedule: string,
    existingClasses: any[],
    ignoreClassId?: string
): { conflict: boolean; conflictingClass?: any; message?: string } => {
    if (!room || !targetSchedule) return { conflict: false };
    const normTarget = normalizeRoomName(room);

    for (const cls of existingClasses) {
        if (ignoreClassId && cls.id === ignoreClassId) continue;

        if (cls.room && normalizeRoomName(cls.room) === normTarget && cls.schedule) {
            if (isScheduleOverlapping(cls.schedule, targetSchedule)) {
                return {
                    conflict: true,
                    conflictingClass: cls,
                    message: `${room} đã được xếp cho lớp "${cls.code}" vào ${cls.schedule}. Vui lòng chọn phòng hoặc giờ khác!`
                };
            }
        }
    }

    return { conflict: false };
};

/**
 * 3. Kiểm tra trùng lịch học của Sinh viên:
 * "Sinh viên cũng có thể học nhiều môn nhưng không thể học cùng giờ."
 */
export const checkStudentConflict = (
    newClassSchedule: string,
    enrolledClassCodes: string[],
    allClasses: any[]
): { conflict: boolean; conflictingClass?: any; message?: string } => {
    if (!newClassSchedule || !enrolledClassCodes || enrolledClassCodes.length === 0) {
        return { conflict: false };
    }

    for (const code of enrolledClassCodes) {
        const enrolledClass = allClasses.find(c => c.code === code);
        if (enrolledClass && enrolledClass.schedule) {
            if (isScheduleOverlapping(enrolledClass.schedule, newClassSchedule)) {
                return {
                    conflict: true,
                    conflictingClass: enrolledClass,
                    message: `Bạn đã đăng ký lớp "${enrolledClass.code}" học vào ${enrolledClass.schedule}. Không thể học 2 môn cùng giờ!`
                };
            }
        }
    }

    return { conflict: false };
};

/**
 * 4. Tính toán Ma trận Phòng trống (Room Availability Matrix):
 * Trả về danh sách từng phòng kèm theo tình trạng các ca (Sáng, Chiều, Tối các ngày)
 * để giảng viên tra cứu và bấm đăng ký trực tiếp mà không bị trùng.
 */
export interface RoomSlotStatus {
    room: string;
    dayKey: string;
    shift: string;
    isOccupied: boolean;
    occupiedBy?: string; // Tên lớp học hoặc Giảng viên
    classCode?: string;
    teacherName?: string;
}

export const calculateRoomAvailability = (
    allClasses: any[],
    teachers: any[]
): RoomSlotStatus[] => {
    const slots: RoomSlotStatus[] = [];

    STANDARD_ROOMS.forEach(room => {
        STANDARD_DAYS.forEach(day => {
            STANDARD_SHIFTS.forEach(shift => {
                // Kiểm tra xem phòng này vào Thứ + Ca này có lớp nào không
                let occupiedInfo: any = null;

                for (const cls of allClasses) {
                    if (normalizeRoomName(cls.room) === normalizeRoomName(room)) {
                        const parsed = parseSchedule(cls.schedule || '');
                        if (parsed.shift === shift.key && parsed.days.includes(day.key)) {
                            const t1 = teachers.find(t => t.id === cls.teacherId);
                            const t2 = teachers.find(t => t.id === cls.teacherId2);
                            const tNames = [t1?.name, t2?.name].filter(Boolean).join(' & ');

                            occupiedInfo = {
                                classCode: cls.code,
                                teacherName: tNames || 'Giảng viên ITC',
                                occupiedBy: `${cls.code} (${tNames || 'Đang dạy'})`
                            };
                            break;
                        }
                    }
                }

                slots.push({
                    room,
                    dayKey: day.key,
                    shift: shift.key,
                    isOccupied: !!occupiedInfo,
                    occupiedBy: occupiedInfo?.occupiedBy,
                    classCode: occupiedInfo?.classCode,
                    teacherName: occupiedInfo?.teacherName
                });
            });
        });
    });

    return slots;
};

/**
 * Kiểm tra xem 1 Slot (Phòng + Thứ + Ca) đã bị chiếm chưa (bởi Lớp học hoặc Đăng ký phòng)
 */
export const isSlotOccupied = (
    room: string,
    dayKey: string,
    shift: string,
    allClasses: any[] = [],
    roomBookings: any[] = []
): { isOccupied: boolean; occupiedBy?: string } => {
    if (!room || !dayKey || !shift) return { isOccupied: false };
    const normRoom = normalizeRoomName(room);

    // 1. Kiểm tra trong danh sách lớp học hiện tại
    for (const cls of allClasses) {
        if (cls.room && normalizeRoomName(cls.room) === normRoom) {
            const parsed = parseSchedule(cls.schedule || '');
            if (parsed.shift === shift && parsed.days.includes(dayKey)) {
                return {
                    isOccupied: true,
                    occupiedBy: `Lớp ${cls.code} (${cls.schedule})`
                };
            }
        }
    }

    // 2. Kiểm tra trong các booking đã duyệt hoặc đang chờ duyệt
    for (const bk of roomBookings) {
        if (bk.status !== 'REJECTED' && bk.room && normalizeRoomName(bk.room) === normRoom) {
            const parsed = parseSchedule(bk.timeSlot || '');
            if (parsed.shift === shift && parsed.days.includes(dayKey)) {
                return {
                    isOccupied: true,
                    occupiedBy: `GV ${bk.teacherName || 'Giảng viên'} đặt (${bk.purpose || 'Đăng ký dạy'})`
                };
            }
        }
    }

    return { isOccupied: false };
};

/**
 * Kiểm tra xem Giảng viên có đang bận lịch dạy vào Thứ + Ca này không
 */
export const isTeacherBusy = (
    teacherId: string,
    dayKey: string,
    shift: string,
    allClasses: any[] = []
): { isBusy: boolean; busyWith?: string } => {
    if (!teacherId || !dayKey || !shift) return { isBusy: false };
    for (const cls of allClasses) {
        const isTeaching = cls.teacherId === teacherId || cls.teacherId2 === teacherId || (cls.teacherIds && cls.teacherIds.includes(teacherId));
        if (isTeaching && cls.schedule) {
            const parsed = parseSchedule(cls.schedule);
            if (parsed.shift === shift && parsed.days.includes(dayKey)) {
                return {
                    isBusy: true,
                    busyWith: `Lớp ${cls.code} (${cls.room})`
                };
            }
        }
    }
    return { isBusy: false };
};

export const RANDOM_SCHEDULE_OPTIONS = [
    'Tối 2 - 4 - 6 (18:00 - 20:30)',
    'Tối 3 - 5 - 7 (18:00 - 20:30)',
    'Chiều 2 - 4 - 6 (14:00 - 16:30)',
    'Chiều 3 - 5 (14:00 - 16:30)',
    'Sáng 2 - 4 - 6 (08:00 - 10:30)',
    'Cuối tuần T7 - CN (Sáng 08:00 - 11:00)',
    'Cuối tuần T7 - CN (Chiều 14:00 - 17:00)'
];

/**
 * Thuật toán sắp xếp ngẫu nhiên Phòng học & Giờ học cho danh sách lớp
 * Đảm bảo tuyệt đối:
 * 1. Không trùng phòng máy vào cùng giờ/ca/ngày
 * 2. Không trùng lịch giảng dạy của cùng một Giảng viên
 */
export const randomizeClassSchedulesAndRooms = (
    classesList: any[]
): { success: boolean; classes: any[]; message?: string } => {
    if (!classesList || classesList.length === 0) {
        return { success: false, classes: [], message: 'Chưa có lớp học nào trong hệ thống.' };
    }

    const rooms = [...STANDARD_ROOMS];
    const schedules = [...RANDOM_SCHEDULE_OPTIONS];

    // Tạo danh sách tất cả các cặp (room, schedule) khả thi
    const allSlots: Array<{ room: string; schedule: string }> = [];
    rooms.forEach(r => {
        schedules.forEach(s => {
            allSlots.push({ room: r, schedule: s });
        });
    });

    const MAX_ATTEMPTS = 100;
    
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const assignedClasses: any[] = [];
        let success = true;

        // Trộn ngẫu nhiên danh sách lớp
        const shuffledClasses = [...classesList].sort(() => Math.random() - 0.5);

        for (const cls of shuffledClasses) {
            // Trộn ngẫu nhiên các slot khả dụng
            const shuffledSlots = [...allSlots].sort(() => Math.random() - 0.5);
            let assignedSlot: { room: string; schedule: string } | null = null;

            for (const slot of shuffledSlots) {
                // 1. Kiểm tra xem slot có bị trùng phòng với lớp đã gán trước đó không
                const roomConflict = assignedClasses.some(ac => 
                    normalizeRoomName(ac.room) === normalizeRoomName(slot.room) &&
                    isScheduleOverlapping(ac.schedule, slot.schedule)
                );
                if (roomConflict) continue;

                // 2. Kiểm tra xem giảng viên của lớp này có bị trùng giờ dạy với lớp đã gán không
                const teacherIds = cls.teacherIds || [cls.teacherId, cls.teacherId2].filter(Boolean);
                const teacherConflict = assignedClasses.some(ac => {
                    const acTeacherIds = ac.teacherIds || [ac.teacherId, ac.teacherId2].filter(Boolean);
                    const sharesTeacher = teacherIds.some((tId: string) => acTeacherIds.includes(tId));
                    return sharesTeacher && isScheduleOverlapping(ac.schedule, slot.schedule);
                });
                if (teacherConflict) continue;

                assignedSlot = slot;
                break;
            }

            if (!assignedSlot) {
                success = false;
                break;
            }

            assignedClasses.push({
                ...cls,
                room: assignedSlot.room,
                schedule: assignedSlot.schedule
            });
        }

        if (success) {
            const sortedResult = classesList.map(orig => 
                assignedClasses.find(ac => ac.id === orig.id) || orig
            );
            return {
                success: true,
                classes: sortedResult,
                message: `Đã xếp lịch ngẫu nhiên thành công cho ${classesList.length} lớp học (100% không trùng giờ, không trùng phòng).`
            };
        }
    }

    return {
        success: false,
        classes: classesList,
        message: 'Không thể tìm được phương án xếp lịch ngẫu nhiên hoàn toàn không trùng cho số lượng lớp hiện tại.'
    };
};
