import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ENROLLMENTS_FILE = path.join(process.cwd(), 'src', 'data', 'enrollments.json');

function getEnrollments(): any[] {
    try {
        if (fs.existsSync(ENROLLMENTS_FILE)) {
            const content = fs.readFileSync(ENROLLMENTS_FILE, 'utf8');
            const trimmed = content.replace(/^\uFEFF/, '');
            const data = JSON.parse(trimmed);
            if (Array.isArray(data)) return data;
        }
    } catch (e) { console.error('Error reading enrollments:', e); }
    return [];
}

function saveEnrollments(enrollments: any[]): void {
    try { fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(enrollments, null, 2), 'utf8'); } catch (e) {}
}

export async function GET() {
    return NextResponse.json({ enrollments: getEnrollments() });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { studentId, classCode, action, enrollments: bulkEnrollments } = body;
        
        if (Array.isArray(bulkEnrollments)) {
            saveEnrollments(bulkEnrollments);
            return NextResponse.json({ success: true, enrollments: bulkEnrollments });
        }

        if (!studentId || !classCode) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        const current = getEnrollments();
        let updated: any[];
        if (action === 'unenroll') {
            updated = current.filter((e: any) => !(e.studentId === studentId && e.classCode === classCode));
        } else {
            const exists = current.some((e: any) => e.studentId === studentId && e.classCode === classCode);
            updated = exists ? current : [...current, { studentId, classCode, enrolledAt: new Date().toISOString() }];
        }
        saveEnrollments(updated);
        return NextResponse.json({ success: true, enrollments: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}