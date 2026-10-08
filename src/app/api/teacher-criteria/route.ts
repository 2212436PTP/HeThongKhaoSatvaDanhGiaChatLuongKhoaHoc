import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TEACHER_CRITERIA_FILE = path.join(process.cwd(), 'src', 'data', 'teacher_criteria.json');

function getTeacherCriteria() {
    try {
        if (fs.existsSync(TEACHER_CRITERIA_FILE)) {
            const content = fs.readFileSync(TEACHER_CRITERIA_FILE, 'utf8');
            const data = JSON.parse(content);
            if (Array.isArray(data)) return data;
        }
    } catch (e) {
        console.error('Error reading teacher_criteria.json:', e);
    }
    return [];
}

function saveTeacherCriteria(criteria: any[]) {
    try {
        fs.writeFileSync(TEACHER_CRITERIA_FILE, JSON.stringify(criteria, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error writing teacher_criteria.json:', e);
        return false;
    }
}

export async function GET() {
    const teacherCriteria = getTeacherCriteria();
    return NextResponse.json({ teacherCriteria });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const current = getTeacherCriteria();
        let updated: any[] = [];
        
        if (body.teacherId && Array.isArray(body.criteria)) {
            // Merge criteria for specific teacher
            const others = current.filter((c: any) => c.teacherId !== body.teacherId);
            updated = [...others, ...body.criteria];
        } else if (Array.isArray(body.teacherCriteria)) {
            updated = body.teacherCriteria;
        } else {
            return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
        }
        
        saveTeacherCriteria(updated);
        return NextResponse.json({ success: true, count: updated.length, teacherCriteria: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { criterionId, criterionIds, teacherId, status } = body;
        
        if (!status) {
            return NextResponse.json({ error: 'Thiếu status' }, { status: 400 });
        }
        
        const current = getTeacherCriteria();
        let updated = [...current];
        
        if (teacherId) {
            // Cập nhật tất cả tiêu chí của 1 giảng viên cụ thể
            updated = current.map((c: any) => c.teacherId === teacherId ? { ...c, status } : c);
        } else if (Array.isArray(criterionIds) && criterionIds.length > 0) {
            // Cập nhật theo mảng IDs
            const idSet = new Set(criterionIds);
            updated = current.map((c: any) => idSet.has(c.id) ? { ...c, status } : c);
        } else if (criterionId) {
            // Cập nhật 1 tiêu chí đơn lẻ
            updated = current.map((c: any) => c.id === criterionId ? { ...c, status } : c);
        } else {
            return NextResponse.json({ error: 'Cần cung cấp teacherId, criterionIds hoặc criterionId' }, { status: 400 });
        }
        
        saveTeacherCriteria(updated);
        return NextResponse.json({ success: true, teacherCriteria: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { criterionId } = body;
        if (!criterionId) {
            return NextResponse.json({ error: 'Thiếu criterionId' }, { status: 400 });
        }
        const current = getTeacherCriteria();
        const updated = current.filter((c: any) => c.id !== criterionId);
        saveTeacherCriteria(updated);
        return NextResponse.json({ success: true, teacherCriteria: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
    }
}
