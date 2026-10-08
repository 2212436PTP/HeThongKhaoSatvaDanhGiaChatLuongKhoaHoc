import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CLASSES_FILE = path.join(process.cwd(), 'src', 'data', 'classes.json');

function getClasses(): any[] {
    try {
        if (fs.existsSync(CLASSES_FILE)) {
            const content = fs.readFileSync(CLASSES_FILE, 'utf8');
            const data = JSON.parse(content);
            if (Array.isArray(data)) return data;
        }
    } catch (e) {
        console.error('Error reading classes.json:', e);
    }
    return [];
}

function saveClasses(classes: any[]): boolean {
    try {
        fs.writeFileSync(CLASSES_FILE, JSON.stringify(classes, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error writing classes.json:', e);
        return false;
    }
}

export async function GET() {
    const classes = getClasses();
    return NextResponse.json({ classes });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const current = getClasses();
        let updated: any[] = [];

        if (body.classItem) {
            // Thêm hoặc cập nhật 1 lớp học
            const existingIndex = current.findIndex(c => c.id === body.classItem.id || c.code === body.classItem.code);
            if (existingIndex >= 0) {
                current[existingIndex] = { ...current[existingIndex], ...body.classItem };
                updated = [...current];
            } else {
                updated = [body.classItem, ...current];
            }
        } else if (Array.isArray(body.classes)) {
            updated = body.classes;
        } else {
            return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
        }

        saveClasses(updated);
        return NextResponse.json({ success: true, count: updated.length, classes: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { classId, status, updates } = body;
        if (!classId) {
            return NextResponse.json({ error: 'Thiếu classId' }, { status: 400 });
        }

        const current = getClasses();
        const updated = current.map(c => {
            if (c.id === classId) {
                return { ...c, ...(updates || {}), ...(status ? { status } : {}) };
            }
            return c;
        });

        saveClasses(updated);
        return NextResponse.json({ success: true, classes: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { classId } = body;
        if (!classId) {
            return NextResponse.json({ error: 'Thiếu classId' }, { status: 400 });
        }

        const current = getClasses();
        const updated = current.filter(c => c.id !== classId);
        saveClasses(updated);
        return NextResponse.json({ success: true, classes: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
    }
}
