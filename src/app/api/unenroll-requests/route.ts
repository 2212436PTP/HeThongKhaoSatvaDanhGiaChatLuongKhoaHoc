import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const REQUESTS_FILE = path.join(process.cwd(), 'src', 'data', 'unenroll_requests.json');
const ENROLLMENTS_FILE = path.join(process.cwd(), 'src', 'data', 'enrollments.json');

function getRequests(): any[] {
    try {
        if (fs.existsSync(REQUESTS_FILE)) {
            const content = fs.readFileSync(REQUESTS_FILE, 'utf8');
            const trimmed = content.replace(/^\uFEFF/, '');
            const data = JSON.parse(trimmed);
            if (Array.isArray(data)) return data;
        }
    } catch (e) {
        console.error('Error reading unenroll_requests.json:', e);
    }
    return [];
}

function saveRequests(requests: any[]): void {
    try {
        fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2), 'utf8');
    } catch (e) {
        console.error('Error writing unenroll_requests.json:', e);
    }
}

function removeEnrollment(studentId: string, classCode: string): void {
    try {
        if (fs.existsSync(ENROLLMENTS_FILE)) {
            const content = fs.readFileSync(ENROLLMENTS_FILE, 'utf8');
            const trimmed = content.replace(/^\uFEFF/, '');
            const data = JSON.parse(trimmed);
            if (Array.isArray(data)) {
                const updated = data.filter((e: any) => !(e.studentId === studentId && e.classCode === classCode));
                fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(updated, null, 2), 'utf8');
            }
        }
    } catch (e) {
        console.error('Error removing enrollment:', e);
    }
}

export async function GET() {
    return NextResponse.json({ requests: getRequests() });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, requestId, studentId, studentCode, studentName, classCode, reason } = body;
        const current = getRequests();

        if (action === 'create') {
            if (!studentId || !classCode) {
                return NextResponse.json({ error: 'Missing studentId or classCode' }, { status: 400 });
            }
            // Check if already requested and pending
            const existing = current.find(r => r.studentId === studentId && r.classCode === classCode && r.status === 'PENDING');
            if (existing) {
                return NextResponse.json({ error: 'Yêu cầu hủy môn này đang chờ Trung tâm duyệt.', request: existing }, { status: 400 });
            }

            const newReq = {
                id: 'unreq_' + Date.now(),
                studentId,
                studentCode: studentCode || (studentId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId) ? studentId : undefined),
                studentName: studentName || studentId,
                classCode,
                reason: reason || 'Sinh viên đề nghị rút môn / đổi lớp',
                status: 'PENDING',
                requestedAt: new Date().toISOString()
            };

            const updated = [newReq, ...current];
            saveRequests(updated);
            return NextResponse.json({ success: true, requests: updated, newRequest: newReq });
        }

        if (action === 'approve') {
            const req = current.find(r => r.id === requestId);
            if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
            req.status = 'APPROVED';
            req.resolvedAt = new Date().toISOString();
            saveRequests(current);

            // Gỡ sinh viên khỏi danh sách đăng ký
            removeEnrollment(req.studentId, req.classCode);

            return NextResponse.json({ success: true, requests: current });
        }

        if (action === 'reject') {
            const req = current.find(r => r.id === requestId);
            if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
            req.status = 'REJECTED';
            req.resolvedAt = new Date().toISOString();
            req.rejectReason = body.rejectReason || 'Trung tâm không chấp thuận yêu cầu hủy môn';
            saveRequests(current);
            return NextResponse.json({ success: true, requests: current });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
