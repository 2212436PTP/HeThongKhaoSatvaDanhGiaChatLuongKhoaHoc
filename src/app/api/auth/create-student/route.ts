import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, code, name } = body;

        if (!email || !password || !code || !name) {
            return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trong file .env.local' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 1. Tạo tài khoản trong Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // 2. Ghi vào bảng app_users với role STUDENT
        const userId = authData.user.id;
        const { error: dbError } = await supabaseAdmin.from('app_users').insert({
            id: userId,
            role: 'STUDENT',
            code,
            name,
            email
        });

        if (dbError) {
            // Rollback: xóa auth user nếu insert DB thất bại
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return NextResponse.json({ error: dbError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, userId }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
    }
}
