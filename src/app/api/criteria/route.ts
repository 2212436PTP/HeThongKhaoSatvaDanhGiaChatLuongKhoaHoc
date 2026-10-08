import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CRITERIA_FILE = path.join(process.cwd(), 'src', 'data', 'criteria.json');

function getCriteria() {
    try {
        if (fs.existsSync(CRITERIA_FILE)) {
            const content = fs.readFileSync(CRITERIA_FILE, 'utf8');
            const data = JSON.parse(content);
            if (Array.isArray(data)) return data;
        }
    } catch (e) {
        console.error('Error reading criteria.json:', e);
    }
    return [];
}

function saveCriteria(criteria: any[]) {
    try {
        fs.writeFileSync(CRITERIA_FILE, JSON.stringify(criteria, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error writing criteria.json:', e);
        return false;
    }
}

export async function GET() {
    const criteria = getCriteria();
    return NextResponse.json({ criteria });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { criteria } = body;
        if (!Array.isArray(criteria)) {
            return NextResponse.json({ error: 'criteria phải là một mảng' }, { status: 400 });
        }
        saveCriteria(criteria);
        return NextResponse.json({ success: true, count: criteria.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
    }
}
