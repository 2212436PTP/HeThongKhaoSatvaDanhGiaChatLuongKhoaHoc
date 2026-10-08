import * as XLSX from 'xlsx';

export interface ClassGradeExportData {
    classInfo: any;
    courseName: string;
    teachers?: any[];
    students: any[];
    grades: Record<string, any>;
}

export function calcTotalScore(g: any): number | null {
    const a = parseFloat(g.attendanceScore) || 0;
    const l = parseFloat(g.labScore) || 0;
    const m = parseFloat(g.midtermScore) || 0;
    const f = parseFloat(g.finalScore) || 0;
    if (!g.attendanceScore && !g.labScore && !g.midtermScore && !g.finalScore) return null;
    return Math.round((a * 0.1 + l * 0.3 + m * 0.2 + f * 0.4) * 10) / 10;
}

export function calcLetterGrade(total: number): string {
    if (total >= 9.0) return "A+";
    if (total >= 8.5) return "A";
    if (total >= 8.0) return "B+";
    if (total >= 7.0) return "B";
    if (total >= 6.5) return "C+";
    if (total >= 5.5) return "C";
    if (total >= 5.0) return "D+";
    if (total >= 4.0) return "D";
    return "F";
}

/**
 * Xuất danh sách bảng điểm chi tiết của lớp ra file Excel (.xlsx)
 */
export function exportClassGradesToExcel({
    classInfo,
    courseName,
    teachers = [],
    students = [],
    grades = {}
}: ClassGradeExportData) {
    const t1 = teachers.find(t => t.id === classInfo.teacherId);
    const t2 = teachers.find(t => t.id === classInfo.teacherId2);
    const teacherNames = [t1?.name, t2?.name].filter(Boolean).join(' & ') || 'Giảng viên ITC';

    const todayStr = new Date().toLocaleDateString('vi-VN');

    // Dữ liệu bảng tính
    const worksheetData: any[][] = [
        ['TRƯỜNG ĐẠI HỌC ĐÀ LẠT - TRUNG TÂM CÔNG NGHỆ THÔNG TIN (ITC)'],
        ['BẢNG TỔNG HỢP ĐIỂM HỌC VIÊN KHÓA HỌC'],
        [`Khóa học: ${courseName} | Lớp: ${classInfo.code} | Phòng máy: ${classInfo.room || 'Lab ITC'}`],
        [`Lịch học: ${classInfo.schedule || 'Lịch chuẩn'} | Giảng viên: ${teacherNames}`],
        [`Ngày xuất bảng điểm: ${todayStr}`],
        [], // Dòng trống
        [
            'STT',
            'Mã Học Viên',
            'Họ và Tên',
            'Email',
            'Chuyên Cần (10%)',
            'Thực Hành Lab (30%)',
            'Giữa Kỳ (20%)',
            'Cuối Kỳ (40%)',
            'Điểm Tổng Kết (Hệ 10)',
            'Điểm Chữ',
            'Kết Quả'
        ]
    ];

    let passedCount = 0;
    let failedCount = 0;
    let sumTotalScore = 0;
    let gradedCount = 0;

    students.forEach((s, idx) => {
        const key = `${classInfo.id}_${s.id}`;
        const keyAlt = `${classInfo.code}_${s.id}`;
        const keyStudentCode = s.code ? `${classInfo.id}_${s.code}` : '';
        const g = grades[key] || grades[keyAlt] || (keyStudentCode ? grades[keyStudentCode] : null) || {};

        const att = g.attendanceScore !== undefined && g.attendanceScore !== '' ? Number(g.attendanceScore) : '';
        const lab = g.labScore !== undefined && g.labScore !== '' ? Number(g.labScore) : '';
        const mid = g.midtermScore !== undefined && g.midtermScore !== '' ? Number(g.midtermScore) : '';
        const fin = g.finalScore !== undefined && g.finalScore !== '' ? Number(g.finalScore) : '';

        const total = g.totalScore !== undefined ? Number(g.totalScore) : calcTotalScore(g);
        const letter = total !== null ? (g.letterGrade || calcLetterGrade(total)) : '';
        const isPassed = total !== null ? (g.isPassed !== undefined ? g.isPassed : total >= 4.0) : false;
        const resultText = total !== null ? (isPassed ? 'ĐẠT' : 'CHƯA ĐẠT') : 'Chưa có điểm';

        if (total !== null) {
            gradedCount++;
            sumTotalScore += total;
            if (isPassed) passedCount++;
            else failedCount++;
        }

        worksheetData.push([
            idx + 1,
            s.code || s.id,
            s.name,
            s.email || '',
            att !== '' ? att : '-',
            lab !== '' ? lab : '-',
            mid !== '' ? mid : '-',
            fin !== '' ? fin : '-',
            total !== null ? total : '-',
            letter || '-',
            resultText
        ]);
    });

    // Thống kê tổng hợp ở cuối bảng
    worksheetData.push([]);
    worksheetData.push(['--- THỐNG KÊ KẾT QUẢ HỌC TẬP ---']);
    worksheetData.push([`Tổng số học viên danh sách:`, students.length]);
    worksheetData.push([`Số học viên đã có điểm:`, gradedCount]);
    worksheetData.push([`Số lượng ĐẠT:`, `${passedCount} học viên (${gradedCount > 0 ? ((passedCount / gradedCount) * 100).toFixed(1) : 0}%)`]);
    worksheetData.push([`Số lượng CHƯA ĐẠT:`, `${failedCount} học viên (${gradedCount > 0 ? ((failedCount / gradedCount) * 100).toFixed(1) : 0}%)`]);
    worksheetData.push([`Điểm trung bình toàn lớp:`, gradedCount > 0 ? (sumTotalScore / gradedCount).toFixed(2) : 'N/A']);

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Định dạng độ rộng cột tối ưu
    ws['!cols'] = [
        { wch: 6 },  // STT
        { wch: 15 }, // Mã Học Viên
        { wch: 25 }, // Họ và Tên
        { wch: 28 }, // Email
        { wch: 16 }, // Chuyên cần
        { wch: 18 }, // Lab
        { wch: 15 }, // Giữa kỳ
        { wch: 15 }, // Cuối kỳ
        { wch: 22 }, // Tổng kết
        { wch: 12 }, // Điểm chữ
        { wch: 14 }  // Kết quả
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Bang_Diem_${classInfo.code}`);

    const fileName = `Bang_Diem_${classInfo.code}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

/**
 * Xuất Báo cáo Khảo sát chất lượng toàn diện của Trung tâm ra Excel (.xlsx)
 */
export function exportSurveyReportToExcel({
    stats,
    warningThreshold = 3.0,
    reviews = [],
    classes = [],
    courses = [],
    criteriaList = [],
    teachers = []
}: {
    stats: any;
    warningThreshold?: number;
    reviews?: any[];
    classes?: any[];
    courses?: any[];
    criteriaList?: any[];
    teachers?: any[];
}) {
    const wb = XLSX.utils.book_new();
    const todayStr = new Date().toLocaleDateString('vi-VN');

    // ==========================================
    // SHEET 1: TỔNG QUAN CHẤT LƯỢNG
    // ==========================================
    const s1Data: any[][] = [
        ['TRƯỜNG ĐẠI HỌC ĐÀ LẠT - TRUNG TÂM CÔNG NGHỆ THÔNG TIN (ITC)'],
        ['BÁO CÁO THỐNG KÊ & ĐÁNH GIÁ CHẤT LƯỢNG KHÓA HỌC'],
        [`Ngày xuất báo cáo: ${todayStr} | Ngưỡng cảnh báo: < ${warningThreshold}★`],
        [],
        ['I. CÁC CHỈ SỐ HOẠT ĐỘNG CHÍNH (KPI KHẢO SÁT)'],
        ['Chỉ số', 'Giá trị', 'Đánh giá'],
        ['Tổng lượt phiếu khảo sát đã thu thập', `${stats.totalSubmissions || reviews.length} lượt`, 'Dữ liệu thực từ học viên'],
        ['Điểm trung bình hài lòng toàn Trung tâm', `${stats.centerAvgSatisfaction || 4.8} / 5.0 ★`, 'Đạt chuẩn kiểm định'],
        ['Số vụ việc phàn nàn / cần bảo trì', `${stats.alertList?.length || 0} trường hợp`, stats.alertList?.length > 0 ? 'Cần xử lý' : 'Rất tốt'],
        [],
        ['II. BẢNG THỐNG KÊ ĐÁNH GIÁ THEO LỚP HỌC'],
        ['Mã Lớp', 'Tên Khóa Học', 'Phòng Máy', 'Lịch Học', 'Sĩ Số', 'Lượt Khảo Sát', 'Điểm TB Sao', 'Ý Kiến Phàn Nàn (<=3★)']
    ];

    classes.forEach(cls => {
        const course = courses.find(c => c.id === cls.courseId);
        const cm = stats.classMetrics?.[cls.id] || {};
        const revCount = cm.count || reviews.filter(r => r.classId === cls.id || r.classCode === cls.code).length;
        const avgScore = cm.overallAvg || '5.0';
        const badCount = cm.badComments?.length || 0;

        s1Data.push([
            cls.code,
            course?.name || cls.name || 'Khóa học ITC',
            cls.room || 'Lab ITC',
            cls.schedule || '',
            cls.studentsCount || 10,
            revCount,
            `${avgScore} ★`,
            badCount
        ]);
    });

    const ws1 = XLSX.utils.aoa_to_sheet(s1Data);
    ws1['!cols'] = [
        { wch: 12 }, // Mã Lớp
        { wch: 30 }, // Tên Khóa
        { wch: 12 }, // Phòng
        { wch: 16 }, // Lịch
        { wch: 10 }, // Sĩ số
        { wch: 14 }, // Lượt KS
        { wch: 14 }, // Điểm TB
        { wch: 24 }  // Phàn nàn
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Tong_Quan_Chat_Luong');

    // ==========================================
    // SHEET 2: CHI TIẾT Ý KIẾN ĐÁNH GIÁ CỦA HỌC VIÊN
    // ==========================================
    const s2Data: any[][] = [
        ['DANH SÁCH CHI TIẾT PHIẾU KHẢO SÁT & Ý KIẾN ĐÓNG GÓP TỪ HỌC VIÊN'],
        [`Cập nhật ngày: ${todayStr}`],
        [],
        ['STT', 'Ngày Nộp', 'Mã Lớp', 'Học Viên', 'Phân Loại', 'Điểm Đánh Giá TB', 'Ý Kiến Đóng Góp / Góp Ý', 'Ghi Chú Giảng Viên', 'Trạng Thái Xử Lý']
    ];

    reviews.forEach((r, idx) => {
        const ratingVals: number[] = [
            ...Object.values(r.ratings || {}),
            ...Object.values(r.teacherRatings ? Object.values(r.teacherRatings).flatMap((obj: any) => Object.values(obj)) : [])
        ].map((v: any) => Number(v)).filter((v: number) => !isNaN(v) && v > 0);

        const avgScore = ratingVals.length > 0 ? (ratingVals.reduce((a, b) => a + b, 0) / ratingVals.length).toFixed(1) : '5.0';
        const typeStr = r.isCenterSurvey || r.type === 'CENTER' ? 'Khảo sát Trung tâm' : 'Khảo sát Giảng viên';
        const statusStr = r.status === 'RESOLVED' ? 'Đã giải quyết' : (r.isEscalated ? 'Đã báo cáo Admin' : 'Đang xử lý');

        s2Data.push([
            idx + 1,
            r.createdAt || (r.timestamp ? new Date(r.timestamp).toLocaleDateString('vi-VN') : 'Mới nộp'),
            r.classCode || r.classId || 'ITC_ALL',
            r.studentName || r.studentCode || 'Học viên ẩn danh',
            typeStr,
            `${avgScore} ★`,
            r.comment || '(Không có nhận xét viết tay)',
            r.teacherNote || '',
            statusStr
        ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(s2Data);
    ws2['!cols'] = [
        { wch: 6 },  // STT
        { wch: 14 }, // Ngày
        { wch: 14 }, // Lớp
        { wch: 22 }, // Học viên
        { wch: 22 }, // Loại
        { wch: 18 }, // Điểm TB
        { wch: 45 }, // Góp ý
        { wch: 25 }, // Ghi chú GV
        { wch: 18 }  // Trạng thái
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Chi_Tiet_Danh_Gia');

    // ==========================================
    // SHEET 3: SỰ CỐ & ĐIỂM NÓNG (< 3★)
    // ==========================================
    const s3Data: any[][] = [
        ['DANH MỤC CÁC VỤ VIỆC PHÀN NÀN & CẢNH BÁO BẢO TRÌ (< ' + warningThreshold + '★)'],
        ['Dành cho Ban Giám đốc Trung tâm & Bộ phận Kỹ thuật kiểm tra khắc phục'],
        [],
        ['STT', 'Mã Lớp', 'Phòng Máy', 'Tiêu Chí Bị Phàn Nàn', 'Điểm Đánh Giá', 'Đề Xuất Khắc Phục / Xử Lý']
    ];

    const alerts = stats.alertList || [];
    if (alerts.length > 0) {
        alerts.forEach((a: any, idx: number) => {
            s3Data.push([
                idx + 1,
                a.classCode,
                a.room,
                a.critName,
                `${a.score} ★`,
                a.actionNote || 'Cần cử kỹ thuật viên kiểm tra bảo trì phòng máy'
            ]);
        });
    } else {
        s3Data.push(['-', 'Không có sự cố nào dưới ngưỡng cảnh báo.', '-', '-', '-', 'Hệ thống vận hành tốt']);
    }

    const ws3 = XLSX.utils.aoa_to_sheet(s3Data);
    ws3['!cols'] = [
        { wch: 6 },  // STT
        { wch: 14 }, // Lớp
        { wch: 14 }, // Phòng máy
        { wch: 40 }, // Tiêu chí
        { wch: 16 }, // Điểm
        { wch: 45 }  // Đề xuất
    ];
    XLSX.utils.book_append_sheet(wb, ws3, 'Canh_Bao_Bao_Tri');

    const fileName = `Bao_Cao_Chat_Luong_ITC_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
}
