"use client";

/**
 * Tiện ích nhận diện Thiết bị (Device Fingerprint) & Kiểm tra Điểm danh
 * Chống gian lận: 1 Thiết bị chỉ được làm khảo sát & điểm danh 1 lần cho mỗi lớp học.
 */

// Hàm tạo hash đơn giản từ chuỗi
function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

// Lấy Device Fingerprint duy nhất của thiết bị
export function getDeviceFingerprint(): string {
    if (typeof window === 'undefined') return 'server_environment';

    // 1. Kiểm tra UUID lưu trữ cố định trên thiết bị
    const STORAGE_KEY = 'itc_device_client_id';
    let deviceId = localStorage.getItem(STORAGE_KEY);
    
    if (!deviceId) {
        // Tạo dấu vân tay phần cứng từ canvas + thông số màn hình
        let canvasHash = '';
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = 200;
                canvas.height = 50;
                ctx.textBaseline = 'top';
                ctx.font = "14px 'Arial'";
                ctx.textBaseline = 'alphabetic';
                ctx.fillStyle = '#f60';
                ctx.fillRect(125, 1, 62, 20);
                ctx.fillStyle = '#069';
                ctx.fillText('ITC_DLU_DEVICE_ID', 2, 15);
                ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
                ctx.fillText('ITC_DLU_DEVICE_ID', 4, 17);
                canvasHash = hashString(canvas.toDataURL());
            }
        } catch (e) {
            canvasHash = 'no_canvas';
        }

        const screenDetails = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const platform = navigator.platform || '';
        const rawFingerprint = `${navigator.userAgent}__${screenDetails}__${timezone}__${platform}__${canvasHash}`;
        
        deviceId = 'DEV_' + hashString(rawFingerprint) + '_' + Date.now().toString(36);
        localStorage.setItem(STORAGE_KEY, deviceId);
    }

    return deviceId;
}

/**
 * Kiểm tra xem thiết bị này đã từng gửi bài khảo sát cho lớp này chưa
 * Trả về: { allowed: boolean; reason?: string; existingStudentCode?: string }
 */
export function checkDeviceSubmissionStatus(classId: string, currentStudentCode: string): {
    allowed: boolean;
    reason?: string;
    existingStudentCode?: string;
} {
    if (typeof window === 'undefined') return { allowed: true };

    const deviceId = getDeviceFingerprint();
    const recordsKey = 'itc_attendance_device_records';
    const records = JSON.parse(localStorage.getItem(recordsKey) || '[]') as Array<{
        deviceId: string;
        classId: string;
        studentCode: string;
        date: string;
    }>;

    // 1. Kiểm tra xem thiết bị này đã nộp cho lớp này chưa (với bất kỳ mã sinh viên nào)
    const deviceUsedRecord = records.find(r => r.deviceId === deviceId && r.classId === classId);
    if (deviceUsedRecord) {
        if (deviceUsedRecord.studentCode !== currentStudentCode) {
            return {
                allowed: false,
                reason: `Thiết bị này đã được sinh viên có mã [${deviceUsedRecord.studentCode}] sử dụng để điểm danh & khảo sát trước đó! Mỗi thiết bị chỉ được khảo sát 1 lần nhằm đảm bảo tính trung thực.`,
                existingStudentCode: deviceUsedRecord.studentCode
            };
        } else {
            return {
                allowed: false,
                reason: `Bạn (${currentStudentCode}) đã hoàn tất đánh giá và điểm danh trên thiết bị này rồi! Điểm số của bạn đã được mở khóa bên dưới.`,
                existingStudentCode: deviceUsedRecord.studentCode
            };
        }
    }

    // 2. Kiểm tra xem mã sinh viên này đã nộp bài cho lớp này từ thiết bị khác chưa
    const studentSubmittedRecord = records.find(r => r.classId === classId && r.studentCode === currentStudentCode);
    if (studentSubmittedRecord) {
        return {
            allowed: false,
            reason: `Mã sinh viên [${currentStudentCode}] đã hoàn tất khảo sát môn học này trước đó. Không thể gửi lại lần 2.`,
            existingStudentCode: currentStudentCode
        };
    }

    return { allowed: true };
}

/**
 * Đánh dấu thiết bị và sinh viên đã hoàn tất khảo sát & điểm danh
 */
export function recordDeviceSubmission(classId: string, studentCode: string, studentName?: string) {
    if (typeof window === 'undefined') return;

    const deviceId = getDeviceFingerprint();
    const recordsKey = 'itc_attendance_device_records';
    const records = JSON.parse(localStorage.getItem(recordsKey) || '[]');
    
    records.push({
        id: 'att_' + Date.now(),
        deviceId,
        classId,
        studentCode,
        studentName: studentName || '',
        date: new Date().toLocaleDateString('vi-VN'),
        timestamp: new Date().toISOString()
    });

    localStorage.setItem(recordsKey, JSON.stringify(records));
}
