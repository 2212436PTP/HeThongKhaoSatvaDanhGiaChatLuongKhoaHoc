import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const COURSES_FILE = path.join(process.cwd(), 'src', 'data', 'courses.json');

const DEFAULT_COURSES = [
    { id: 'crs_1', code: 'IT-BASIC', name: 'Tin học cơ bản', type: 'REGULAR', duration: '45 tiết', description: 'Chương trình đào tạo chuẩn ITC' },
    { id: 'crs_2', code: 'IT-ADV', name: 'Tin học Nâng cao', type: 'REGULAR', duration: '45 tiết', description: 'Chương trình đào tạo chuẩn ITC' },
    { id: 'crs_3', code: 'WEB-DEV', name: 'Lập trình Web Frontend', type: 'REGULAR', duration: '45 tiết', description: 'Chương trình đào tạo chuẩn ITC' },
    { id: 'crs_4', code: 'DATA-ANALYTICS', name: 'Phân tích dữ liệu với Python', type: 'REGULAR', duration: '45 tiết', description: 'Chương trình đào tạo chuẩn ITC' },
    { id: 'crs_cc01', code: 'CC01', name: 'Tin học MOS', type: 'CERTIFICATE', duration: '90 tiết (60 LT - 30 TH, 6 tuần)', description: 'Khóa đào tạo chứng chỉ chuyên đề - Trung tâm Tin học ITC' }
];

function getCourses(): any[] {
    try {
        if (fs.existsSync(COURSES_FILE)) {
            const content = fs.readFileSync(COURSES_FILE, 'utf8');
            const trimmed = content.replace(/^\uFEFF/, '');
            const data = JSON.parse(trimmed);
            if (Array.isArray(data) && data.length > 0) return data;
        }
    } catch (e) {
        console.error('Error reading courses.json:', e);
    }
    return DEFAULT_COURSES;
}

function saveCourses(courses: any[]): boolean {
    try {
        fs.writeFileSync(COURSES_FILE, JSON.stringify(courses, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error writing courses.json:', e);
        return false;
    }
}

export async function GET() {
    const courses = getCourses();
    return NextResponse.json({ courses });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const current = getCourses();
        let updated: any[] = [];

        if (body.course) {
            const newCourse = body.course;
            const existingIndex = current.findIndex(c => c.id === newCourse.id || c.code === newCourse.code);
            if (existingIndex >= 0) {
                current[existingIndex] = { ...current[existingIndex], ...newCourse };
                updated = [...current];
            } else {
                updated = [newCourse, ...current];
            }
        } else if (Array.isArray(body.courses)) {
            updated = body.courses;
        } else {
            return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
        }

        saveCourses(updated);
        return NextResponse.json({ success: true, count: updated.length, courses: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get('id') || searchParams.get('code');
        if (!courseId) {
            return NextResponse.json({ error: 'Thiếu id hoặc code môn học' }, { status: 400 });
        }

        const current = getCourses();
        const updated = current.filter(c => c.id !== courseId && c.code !== courseId);
        saveCourses(updated);

        return NextResponse.json({ success: true, count: updated.length, courses: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
    }
}
