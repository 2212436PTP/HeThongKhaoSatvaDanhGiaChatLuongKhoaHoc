import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'src', 'data', 'survey_settings.json');

function getSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const content = fs.readFileSync(SETTINGS_FILE, 'utf8');
            return JSON.parse(content);
        }
    } catch (e) {
        console.error('Error reading survey_settings.json:', e);
    }
    return { isCenterSurveyActive: false };
}

function saveSettings(settings: any) {
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error writing survey_settings.json:', e);
        return false;
    }
}

export async function GET() {
    const settings = getSettings();
    return NextResponse.json(settings);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { isCenterSurveyActive } = body;
        const current = getSettings();
        const updated = {
            ...current,
            isCenterSurveyActive: Boolean(isCenterSurveyActive)
        };
        saveSettings(updated);
        return NextResponse.json({ success: true, ...updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
    }
}
