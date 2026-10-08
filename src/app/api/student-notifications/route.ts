import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const NOTIFS_FILE = path.join(process.cwd(), 'src', 'data', 'student_notifications.json');

function getNotifications(): any[] {
    try {
        if (fs.existsSync(NOTIFS_FILE)) {
            const content = fs.readFileSync(NOTIFS_FILE, 'utf8');
            const trimmed = content.replace(/^\uFEFF/, '');
            const data = JSON.parse(trimmed);
            if (Array.isArray(data)) return data;
        }
    } catch (e) {
        console.error('Error reading student notifications:', e);
    }
    return [];
}

function saveNotifications(notifs: any[]): void {
    try {
        fs.writeFileSync(NOTIFS_FILE, JSON.stringify(notifs, null, 2), 'utf8');
    } catch (e) {
        console.error('Error saving student notifications:', e);
    }
}

export async function GET() {
    return NextResponse.json({ notifications: getNotifications() });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { notification, notifications } = body;
        
        let current = getNotifications();
        if (Array.isArray(notifications)) {
            current = notifications;
        } else if (notification) {
            current = [notification, ...current];
        }
        
        saveNotifications(current);
        return NextResponse.json({ success: true, notifications: current });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
