import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { students } = body;

        if (!Array.isArray(students) || students.length === 0) {
            return NextResponse.json({ error: 'Danh sách sinh viên không hợp lệ hoặc rỗng' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trong .env.local' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const { data: existingUsers } = await supabaseAdmin.from('app_users').select('id, email, code');
        const existingEmails = new Set((existingUsers || []).map(u => (u.email || '').toLowerCase().trim()));
        const existingCodes = new Set((existingUsers || []).map(u => (u.code || '').toUpperCase().trim()));

        const createdStudents: any[] = [];
        const errors: any[] = [];

        for (const item of students) {
            try {
                const name = (item.name || '').trim();
                if (!name) continue;

                let code = (item.code || '').trim().toUpperCase();
                let email = (item.email || '').trim().toLowerCase();
                const password = (item.password || '123456').trim();
                const enrolledClassCodes = Array.isArray(item.enrolledClassCodes) 
                    ? item.enrolledClassCodes 
                    : (item.classCode ? [item.classCode.trim()] : []);

                // Tạo email @itc.edu.vn nếu chưa có hoặc chưa đúng đuôi
                if (!email) {
                    const cleanName = name
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/đ/g, 'd')
                        .replace(/Đ/g, 'D')
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, '');
                    email = `${cleanName || 'sv' + Date.now().toString().slice(-4)}@itc.edu.vn`;
                } else if (!email.endsWith('@itc.edu.vn')) {
                    email = `${email.split('@')[0]}@itc.edu.vn`;
                }

                // Nếu email đã tồn tại, thêm hậu tố số
                if (existingEmails.has(email)) {
                    const prefix = email.split('@')[0];
                    email = `${prefix}${Math.floor(Math.random() * 89 + 10)}@itc.edu.vn`;
                }

                // Nếu chưa có code, tự sinh
                if (!code || existingCodes.has(code)) {
                    let nextIdx = existingCodes.size + createdStudents.length + 1;
                    code = `SV${nextIdx < 10 ? '0' + nextIdx : nextIdx}`;
                }

                // 1. Tạo Auth User trong Supabase
                const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true
                });

                if (authError) {
                    errors.push({ name, email, error: authError.message });
                    continue;
                }

                const userId = authData.user.id;

                // 2. Thêm vào app_users
                const { error: dbError } = await supabaseAdmin.from('app_users').insert({
                    id: userId,
                    role: 'STUDENT',
                    code,
                    name,
                    email
                });

                if (dbError) {
                    await supabaseAdmin.auth.admin.deleteUser(userId);
                    errors.push({ name, email, error: dbError.message });
                    continue;
                }

                existingEmails.add(email);
                existingCodes.add(code);
                createdStudents.push({
                    id: userId,
                    code,
                    name,
                    email,
                    enrolledClassCodes,
                    status: 'ACTIVE',
                    role: 'STUDENT',
                    createdAt: new Date().toLocaleDateString('vi-VN')
                });
            } catch (err: any) {
                errors.push({ name: item.name, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            totalSubmitted: students.length,
            createdCount: createdStudents.length,
            students: createdStudents,
            errors
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi máy chủ khi import sinh viên' }, { status: 500 });
    }
}
