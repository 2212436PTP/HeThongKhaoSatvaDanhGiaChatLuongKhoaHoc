import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { studentId } = body;

        if (!studentId) {
            return NextResponse.json({ error: 'Thiếu ID sinh viên' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 1. Delete from app_users
        const { error: dbError } = await supabaseAdmin.from('app_users').delete().eq('id', studentId);
        
        if (dbError) {
            return NextResponse.json({ error: 'Không thể xóa dữ liệu học viên: ' + dbError.message }, { status: 400 });
        }

        // 2. Delete from auth.users if UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
        if (isUUID) {
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(studentId);
            if (authError) {
                return NextResponse.json({ error: authError.message }, { status: 400 });
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
    }
}
