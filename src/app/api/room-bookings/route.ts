import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BOOKINGS_FILE = path.join(process.cwd(), 'src', 'data', 'room_bookings.json');

function getBookings(): any[] {
    try {
        if (fs.existsSync(BOOKINGS_FILE)) {
            const content = fs.readFileSync(BOOKINGS_FILE, 'utf8');
            const trimmed = content.replace(/^\uFEFF/, '');
            const data = JSON.parse(trimmed);
            if (Array.isArray(data)) return data;
        }
    } catch (e) {
        console.error('Error reading room_bookings.json:', e);
    }
    return [];
}

function saveBookings(bookings: any[]): void {
    try {
        fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf8');
    } catch (e) {
        console.error('Error writing room_bookings.json:', e);
    }
}

export async function GET() {
    return NextResponse.json({ bookings: getBookings() });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const current = getBookings();
        const { action, booking, bookingId, status, adminNote } = body;

        if (action === 'create' && booking) {
            const newBooking = {
                ...booking,
                status: booking.status || 'PENDING',
                createdAt: booking.createdAt || new Date().toLocaleString('vi-VN')
            };
            const updated = [newBooking, ...current.filter((b: any) => b.id !== newBooking.id)];
            saveBookings(updated);
            return NextResponse.json({ success: true, bookings: updated });
        }

        if (action === 'update_status' && bookingId && status) {
            const updated = current.map((b: any) => {
                if (b.id === bookingId) {
                    return {
                        ...b,
                        status,
                        adminNote: adminNote !== undefined ? adminNote : b.adminNote
                    };
                }
                return b;
            });
            saveBookings(updated);
            return NextResponse.json({ success: true, bookings: updated });
        }

        if ((action === 'delete' || action === 'cancel') && bookingId) {
            const updated = current.filter((b: any) => b.id !== bookingId);
            saveBookings(updated);
            return NextResponse.json({ success: true, bookings: updated });
        }

        if (Array.isArray(body.bookings)) {
            saveBookings(body.bookings);
            return NextResponse.json({ success: true, bookings: body.bookings });
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    } catch (e: any) {
        console.error('API /api/room-bookings error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
