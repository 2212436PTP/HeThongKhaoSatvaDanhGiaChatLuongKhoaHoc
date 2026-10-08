import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SURVEYS_FILE = path.join(process.cwd(), 'src', 'data', 'surveys.json');

function getSurveys(): any[] {
    try {
        if (fs.existsSync(SURVEYS_FILE)) {
            const content = fs.readFileSync(SURVEYS_FILE, 'utf8');
            const trimmed = content.replace(/^\uFEFF/, '');
            const data = JSON.parse(trimmed);
            if (Array.isArray(data)) return data;
        }
    } catch (e) {
        console.error('Error reading surveys.json:', e);
    }
    return [];
}

function saveSurveys(surveys: any[]): void {
    try {
        fs.writeFileSync(SURVEYS_FILE, JSON.stringify(surveys, null, 2), 'utf8');
    } catch (e) {
        console.error('Error writing surveys.json:', e);
    }
}

export async function GET() {
    return NextResponse.json({ surveys: getSurveys() });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const current = getSurveys();
        
        if (body.survey) {
            const survey = {
                ...body.survey,
                ratings: body.survey.ratings || body.survey.centerRatings || body.survey.answers || {},
                teacherRatings: body.survey.teacherRatings || {},
                timestamp: body.survey.timestamp || new Date().toISOString()
            };
            const existingIdx = current.findIndex((s: any) => s.id === survey.id);
            let updated: any[];
            if (existingIdx >= 0) {
                current[existingIdx] = survey;
                updated = [...current];
            } else {
                updated = [survey, ...current];
            }
            saveSurveys(updated);
            return NextResponse.json({ success: true, surveys: updated });
        }

        if (Array.isArray(body.surveys)) {
            saveSurveys(body.surveys);
            return NextResponse.json({ success: true, surveys: body.surveys });
        }

        return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
