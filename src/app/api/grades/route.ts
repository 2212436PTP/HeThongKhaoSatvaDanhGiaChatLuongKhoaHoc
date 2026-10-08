import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const GRADES_FILE = path.join(process.cwd(), 'src', 'data', 'grades.json');

function getGrades(): any[] {
    try {
        if (fs.existsSync(GRADES_FILE)) {
            const content = fs.readFileSync(GRADES_FILE, 'utf8');
            const trimmed = content.replace(/^\uFEFF/, '');
            const data = JSON.parse(trimmed);
            if (Array.isArray(data)) return data;
        }
    } catch (e) {}
    return [];
}

function saveGrades(grades: any[]): void {
    try { fs.writeFileSync(GRADES_FILE, JSON.stringify(grades, null, 2), 'utf8'); } catch (e) {}
}

export async function GET() {
    return NextResponse.json({ grades: getGrades() });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        if (body.grades && body.classId) {
            const current = getGrades();
            const others = current.filter((g: any) => g.classId !== body.classId);
            saveGrades([...others, ...body.grades]);
            return NextResponse.json({ success: true });
        }
        if (body.grade) {
            const current = getGrades();
            const idx = current.findIndex((g: any) => g.classId === body.grade.classId && g.studentId === body.grade.studentId);
            if (idx >= 0) { current[idx] = body.grade; saveGrades(current); }
            else { saveGrades([...current, body.grade]); }
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}