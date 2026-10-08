"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { Icons } from '../../components/ui/Icons';
import { getDeviceFingerprint, checkDeviceSubmissionStatus, recordDeviceSubmission } from '../../lib/deviceFingerprint';
import { INITIAL_TEACHER_CRITERIA, INITIAL_CLASSES, INITIAL_COURSES, INITIAL_TEACHERS } from '../../data/mockData';
import { LIKERT_LEVELS } from '../../types';
import { Suspense } from 'react';

function SurveyContent() {
    const searchParams = useSearchParams();
    const classId = searchParams.get('classId');

    const [classData, setClassData] = useState<any>(null);
    const [courseData, setCourseData] = useState<any>(null);
    const [teacher1Data, setTeacher1Data] = useState<any>(null);
    const [teacher2Data, setTeacher2Data] = useState<any>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [deviceWarning, setDeviceWarning] = useState('');
    
    // Thông tin sinh viên để điểm danh
    const [studentCode, setStudentCode] = useState('');
    const [studentName, setStudentName] = useState('');

    // Đánh giá 3 phần
    const [centerRatings, setCenterRatings] = useState<Record<string, number>>({});
    const [teacher1Ratings, setTeacher1Ratings] = useState<Record<string, number>>({});
    const [teacher2Ratings, setTeacher2Ratings] = useState<Record<string, number>>({});
    const [comment, setComment] = useState('');
    
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    const [centerCriteria, setCenterCriteria] = useState<any[]>([]);
    const [t1Criteria, setT1Criteria] = useState<any[]>([]);
    const [t2Criteria, setT2Criteria] = useState<any[]>([]);

    useEffect(() => {
        if (!classId) {
            setError('Đường dẫn không hợp lệ. Vui lòng quét lại mã QR của lớp học.');
            setIsLoading(false);
            return;
        }

        const fetchClassInfo = async () => {
            try {
                // 1. Fetch class from Supabase, fallback to mockData
                let cData: any = null;
                const { data: dbClass } = await supabase.from('classes').select('*').eq('id', classId).single();
                cData = dbClass || INITIAL_CLASSES.find(c => c.id === classId) || {
                    id: classId,
                    code: 'ITC_24_01',
                    course_id: 'crs_1',
                    teacher_id: 'tch_1',
                    teacher_id2: 'tch_2',
                    room: 'Phòng TV 1',
                    status: 'OPEN_SURVEY'
                };

                // 2. Fetch course & teachers
                const courseId = cData.course_id || cData.courseId;
                const { data: crData } = await supabase.from('courses').select('*').eq('id', courseId).single();
                const resolvedCourse = crData || INITIAL_COURSES.find(c => c.id === courseId) || { name: 'Khóa Đào tạo ITC' };

                const t1Id = cData.teacher_id || cData.teacherId;
                const t2Id = cData.teacher_id2 || cData.teacherId2;

                const { data: t1Db } = await supabase.from('app_users').select('*').eq('id', t1Id).single();
                const resolvedT1 = t1Db || INITIAL_TEACHERS.find(t => t.id === t1Id) || { name: 'Thầy Nguyễn Văn A', dept: 'Khoa CNTT' };

                let resolvedT2 = null;
                if (t2Id) {
                    const { data: t2Db } = await supabase.from('app_users').select('*').eq('id', t2Id).single();
                    resolvedT2 = t2Db || INITIAL_TEACHERS.find(t => t.id === t2Id) || { name: 'Cô Trần Thị B', dept: 'Bộ môn Mạng' };
                }

                // 3. Fetch criteria
                const { data: critData } = await supabase.from('survey_criteria').select('*').eq('is_active', true).order('order_index', { ascending: true });
                const resolvedCenterCriteria = (critData && critData.length > 0) ? critData : [
                    { id: 'facility', name: 'Cơ sở vật chất & Máy tính', description: 'Máy tính, chuột, phím, máy lạnh, máy chiếu phòng học hoạt động tốt' },
                    { id: 'environment', name: 'Môi trường & Mạng Wifi', description: 'Internet ổn định, phòng máy sạch sẽ, yên tĩnh' },
                    { id: 'curriculum', name: 'Giáo trình & Tài liệu môn học', description: 'Tài liệu cập nhật, bám sát thực hành' },
                    { id: 'center_service', name: 'Dịch vụ hỗ trợ Trung tâm ITC', description: 'Thủ tục thi, chứng chỉ và giải đáp thắc mắc kịp thời' }
                ];

                // 4. Fetch teacher criteria
                const resolvedT1Crit = INITIAL_TEACHER_CRITERIA.filter(tc => tc.teacherId === t1Id);
                const resolvedT2Crit = t2Id ? INITIAL_TEACHER_CRITERIA.filter(tc => tc.teacherId === t2Id) : [];

                setClassData(cData);
                setCourseData(resolvedCourse);
                setTeacher1Data(resolvedT1);
                setTeacher2Data(resolvedT2);
                setCenterCriteria(resolvedCenterCriteria);
                setT1Criteria(resolvedT1Crit.length > 0 ? resolvedT1Crit : [
                    { id: 't1_default_1', name: 'Phương pháp truyền đạt lý thuyết', description: 'Rõ ràng, dễ hiểu, gắn liền thực tế' },
                    { id: 't1_default_2', name: 'Tác phong & sự nhiệt tình', description: 'Đúng giờ, giải đáp thắc mắc chu đáo' }
                ]);
                setT2Criteria(resolvedT2Crit.length > 0 ? resolvedT2Crit : [
                    { id: 't2_default_1', name: 'Kỹ năng hướng dẫn thực hành Lab', description: 'Theo sát, kiên nhẫn hướng dẫn sửa lỗi' },
                    { id: 't2_default_2', name: 'Bài tập thực hành rèn luyện', description: 'Phù hợp với năng lực và yêu cầu thi chứng chỉ' }
                ]);

            } catch (err: any) {
                setError(err.message || 'Lỗi tải dữ liệu lớp học');
            } finally {
                setIsLoading(false);
            }
        };

        fetchClassInfo();
    }, [classId]);

    // Kiểm tra ràng buộc thiết bị khi nhập mã SV
    const handleStudentCodeChange = (code: string) => {
        setStudentCode(code);
        if (code.trim().length >= 4 && classId) {
            const check = checkDeviceSubmissionStatus(classId, code.trim());
            if (!check.allowed) {
                setDeviceWarning(check.reason || 'Thiết bị này đã được sử dụng!');
            } else {
                setDeviceWarning('');
            }
        } else {
            setDeviceWarning('');
        }
    };

    const handleAutoFill = () => {
        setStudentCode('ITC' + Math.floor(1000 + Math.random() * 9000));
        setStudentName('Học viên ITC Test');
        
        const cRatings: Record<string, number> = {};
        centerCriteria.forEach(c => cRatings[c.id] = 5);
        setCenterRatings(cRatings);

        const t1Ratings: Record<string, number> = {};
        t1Criteria.forEach(c => t1Ratings[c.id] = 5);
        setTeacher1Ratings(t1Ratings);

        const t2Ratings: Record<string, number> = {};
        t2Criteria.forEach(c => t2Ratings[c.id] = 5);
        setTeacher2Ratings(t2Ratings);

        setComment('Cả hai thầy cô đều dạy rất hay và nhiệt tình hỗ trợ lớp học!');
    };

    const handleSubmit = async () => {
        if (!studentCode.trim()) {
            alert('Vui lòng nhập Mã sinh viên / Học viên để hệ thống tự động điểm danh!');
            return;
        }

        // Kiểm tra thiết bị
        const check = checkDeviceSubmissionStatus(classId || '', studentCode.trim());
        if (!check.allowed) {
            alert(check.reason);
            return;
        }

        if (Object.keys(centerRatings).length < centerCriteria.length) {
            alert('Vui lòng đánh giá tất cả các tiêu chí của Trung tâm!');
            return;
        }

        if (Object.keys(teacher1Ratings).length < t1Criteria.length) {
            alert(`Vui lòng đánh giá tất cả các tiêu chí của Giảng viên 1 (${teacher1Data?.name})!`);
            return;
        }

        if (teacher2Data && Object.keys(teacher2Ratings).length < t2Criteria.length) {
            alert(`Vui lòng đánh giá tất cả các tiêu chí của Giảng viên 2 (${teacher2Data?.name})!`);
            return;
        }

        setSubmitting(true);
        const deviceId = getDeviceFingerprint();

        const teacherRatingsData: Record<string, any> = {};
        if (teacher1Data?.id) teacherRatingsData[teacher1Data.id] = teacher1Ratings;
        if (teacher2Data?.id) teacherRatingsData[teacher2Data.id] = teacher2Ratings;

        // Lưu vào Supabase reviews (nếu có bảng), đồng thời lưu localStorage
        try {
            await supabase.from('reviews').insert([{
                id: 'rev_' + Date.now(),
                class_id: classId,
                ratings: centerRatings,
                comment: comment,
                status: 'OPEN',
                is_escalated: false
            }]);
        } catch (e) {
            console.log('Saved to client state');
        }

        // Lưu vết điểm danh và khóa thiết bị
        recordDeviceSubmission(classId || '', studentCode.trim(), studentName.trim());

        // Đồng bộ vào mock_surveys để demo
        const existingSurveys = JSON.parse(localStorage.getItem('mock_surveys') || '[]');
        existingSurveys.push({
            id: 'rev_' + Date.now(),
            classId: classId,
            classCode: classData?.code,
            studentCode: studentCode.trim(),
            studentName: studentName.trim(),
            deviceId: deviceId,
            centerRatings,
            teacherRatings: teacherRatingsData,
            comment,
            status: 'OPEN',
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('mock_surveys', JSON.stringify(existingSurveys));

        setSubmitting(false);
        setSubmitted(true);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Icons.Loader className="w-8 h-8 text-itc-800 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full">
                    <Icons.AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-slate-800 mb-2">Lỗi truy cập</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">{error}</p>
                </div>
            </div>
        );
    }

    if (classData?.status === 'CLOSED_SURVEY') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-sm w-full">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.CheckCircle className="w-8 h-8 text-slate-400" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 mb-2">Đợt khảo sát đã kết thúc</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Đợt khảo sát chất lượng cho lớp <b>{classData.code}</b> đã đóng. Cảm ơn bạn đã quan tâm!
                    </p>
                </div>
            </div>
        );
    }

    // ĐÃ NỘP XONG: HIỂN THỊ ĐIỂM DANH THÀNH CÔNG & BẢNG ĐIỂM
    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border-t-4 border-emerald-500 max-w-md w-full text-center space-y-5 animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
                        <Icons.CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">HOÀN TẤT ĐIỂM DANH & KHẢO SÁT!</h2>
                        <p className="text-emerald-700 font-bold text-xs mt-1">
                            ✓ Xác nhận sinh viên [{studentCode}] CÓ MẶT buổi học hôm nay.
                        </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
                        <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Lớp học:</span>
                            <b className="text-slate-800">{classData?.code}</b>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Thời gian điểm danh:</span>
                            <b className="text-slate-800">{new Date().toLocaleTimeString('vi-VN')} ({new Date().toLocaleDateString('vi-VN')})</b>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Trạng thái thiết bị:</span>
                            <span className="text-emerald-700 font-bold">1 thiết bị duy nhất hợp lệ</span>
                        </div>
                    </div>

                    {/* Mở khóa điểm thi */}
                    <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-left space-y-2">
                        <span className="text-[11px] font-bold text-emerald-900 uppercase block border-b border-emerald-200 pb-1">
                            Kết quả học tập môn học đã mở khóa:
                        </span>
                        <div className="flex justify-between text-xs pt-1">
                            <span className="text-slate-600 font-medium">Điểm Chuyên cần:</span>
                            <b className="text-emerald-700">10 / 10</b>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-600 font-medium">Điểm Thực hành Lab:</span>
                            <b className="text-blue-700">8.8</b>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-600 font-medium">Điểm Thi kết thúc:</span>
                            <b className="text-purple-700">9.0 (ĐẠT CHỨNG CHỈ)</b>
                        </div>
                    </div>

                    <p className="text-[11px] text-slate-400">
                        Cảm ơn bạn đã đóng góp ý kiến để ITC Đại học Đà Lạt ngày càng hoàn thiện!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-20 shadow-xs flex justify-between items-center max-w-2xl mx-auto">
                <div className="flex items-center gap-2">
                    <img src="/logoitc.jpg" alt="ITC Logo" className="h-8 object-contain" />
                    <div>
                        <h2 className="text-xs font-bold text-itc-900 leading-tight uppercase">ITC - ĐH ĐÀ LẠT</h2>
                        <p className="text-[10px] text-slate-500">Khảo sát & Điểm danh</p>
                    </div>
                </div>
                <button 
                    onClick={handleAutoFill} 
                    className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-2xs"
                >
                    ⚡ Điền nhanh (Demo)
                </button>
            </header>

            <main className="max-w-2xl mx-auto py-6 px-4 space-y-5">
                {/* Thông tin lớp học */}
                <div className="bg-white rounded-3xl shadow-sm p-5 border border-slate-200 space-y-2">
                    <span className="text-[10px] font-extrabold text-itc-800 uppercase tracking-widest bg-itc-50 px-2 py-0.5 rounded">
                        LỚP ĐÀO TẠO CHỨNG CHỈ
                    </span>
                    <h1 className="text-lg font-black text-slate-900">{courseData?.name}</h1>
                    <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                        <span>Mã lớp: <b className="text-itc-900">{classData?.code}</b></span>
                        <span>Phòng máy: <b>{classData?.room}</b></span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                        <p className="text-blue-900">
                            👨‍🏫 <b>Giảng viên 1:</b> {teacher1Data?.name} ({classData?.teacherRole1 || 'Lý thuyết'})
                        </p>
                        {teacher2Data && (
                            <p className="text-amber-900">
                                👩‍🏫 <b>Giảng viên 2:</b> {teacher2Data?.name} ({classData?.teacherRole2 || 'Thực hành Lab'})
                            </p>
                        )}
                    </div>
                </div>

                {/* Bước 1: Nhập thông tin sinh viên để điểm danh */}
                <div className="bg-white rounded-3xl shadow-sm p-5 border border-slate-200 space-y-3">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                        <Icons.User className="w-4 h-4 text-itc-800" /> Bước 1: Thông tin học viên (Bắt buộc để điểm danh)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Mã Sinh viên / Học viên *</label>
                            <input 
                                type="text"
                                required
                                placeholder="VD: ITC2024001"
                                value={studentCode}
                                onChange={e => handleStudentCodeChange(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-itc-500 outline-none bg-slate-50 uppercase font-mono font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Họ và Tên</label>
                            <input 
                                type="text"
                                placeholder="VD: Nguyễn Văn A"
                                value={studentName}
                                onChange={e => setStudentName(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-itc-500 outline-none bg-slate-50 font-medium"
                            />
                        </div>
                    </div>

                    {deviceWarning && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                            <span className="text-sm">⚠️</span>
                            <span>{deviceWarning}</span>
                        </div>
                    )}
                </div>

                {/* BẢNG CHÚ GIẢI 5 CẤP ĐỘ ĐÁNH GIÁ */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <span>⭐</span> 5 cấp độ đánh giá chất lượng chuẩn:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {LIKERT_LEVELS.map(level => (
                            <div key={level.score} className="p-2 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-md ${level.bgActive} text-white text-[11px] font-black flex items-center justify-center shrink-0`}>
                                    {level.score}
                                </span>
                                <span className="text-[11px] font-bold text-slate-800 truncate">{level.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bước 2: Đánh giá Trung tâm */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="w-5 h-5 rounded-full bg-itc-800 text-white text-[11px] font-bold flex items-center justify-center">I</span>
                        <div>
                            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                                Đánh giá Trung tâm & Cơ sở vật chất
                            </h3>
                            <p className="text-[11px] text-slate-500">Thang điểm 5 mức từ "Rất không hài lòng" đến "Rất hài lòng"</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {centerCriteria.map((crit) => {
                            const score = centerRatings[crit.id];
                            const curLvl = LIKERT_LEVELS.find(l => l.score === score);
                            return (
                                <div key={crit.id} className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-2">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 text-xs">
                                        <div className="pr-2">
                                            <h4 className="font-bold text-slate-800">{crit.name}</h4>
                                            <p className="text-[11px] text-slate-500 mt-0.5">{crit.description}</p>
                                        </div>
                                        {curLvl && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${curLvl.bgActive} text-white shrink-0`}>
                                                ✓ {score} - {curLvl.label}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                                        {LIKERT_LEVELS.map(level => (
                                            <button
                                                key={level.score}
                                                type="button"
                                                onClick={() => setCenterRatings({...centerRatings, [crit.id]: level.score})}
                                                className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-0.5 ${
                                                    score === level.score
                                                        ? `${level.bgActive} text-white shadow-xs font-bold scale-[1.02] border-transparent`
                                                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                                }`}
                                                title={`${level.score}: ${level.label}`}
                                            >
                                                <span className="text-xs font-black">{level.score}★</span>
                                                <span className="text-[10px] hidden sm:block truncate w-full text-center leading-tight">
                                                    {level.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bước 3: Đánh giá Giảng viên 1 */}
                <div className="bg-white rounded-3xl shadow-sm border border-blue-200 p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-blue-100 pb-3">
                        <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-[11px] font-bold flex items-center justify-center">II</span>
                        <div>
                            <h3 className="font-bold text-blue-950 text-xs uppercase tracking-wide">
                                Đánh giá Giảng viên 1: {teacher1Data?.name}
                            </h3>
                            <p className="text-[10px] text-blue-600">Tiêu chí do chính Giảng viên 1 đưa ra để lắng nghe học viên</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {t1Criteria.map((crit) => {
                            const score = teacher1Ratings[crit.id];
                            const curLvl = LIKERT_LEVELS.find(l => l.score === score);
                            return (
                                <div key={crit.id} className="p-3 bg-blue-50/40 rounded-2xl border border-blue-100 space-y-2">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 text-xs">
                                        <div className="pr-2">
                                            <h4 className="font-bold text-slate-800">{crit.name}</h4>
                                            {crit.description && <p className="text-[11px] text-slate-500 mt-0.5">{crit.description}</p>}
                                        </div>
                                        {curLvl && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${curLvl.bgActive} text-white shrink-0`}>
                                                ✓ {score} - {curLvl.label}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                                        {LIKERT_LEVELS.map(level => (
                                            <button
                                                key={level.score}
                                                type="button"
                                                onClick={() => setTeacher1Ratings({...teacher1Ratings, [crit.id]: level.score})}
                                                className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-0.5 ${
                                                    score === level.score
                                                        ? `${level.bgActive} text-white shadow-xs font-bold scale-[1.02] border-transparent`
                                                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                                }`}
                                                title={`${level.score}: ${level.label}`}
                                            >
                                                <span className="text-xs font-black">{level.score}★</span>
                                                <span className="text-[10px] hidden sm:block truncate w-full text-center leading-tight">
                                                    {level.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bước 4: Đánh giá Giảng viên 2 (Nếu lớp có 2 GV) */}
                {teacher2Data && (
                    <div className="bg-white rounded-3xl shadow-sm border border-amber-200 p-5 space-y-4">
                        <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                            <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center">III</span>
                            <div>
                                <h3 className="font-bold text-amber-950 text-xs uppercase tracking-wide">
                                    Đánh giá Giảng viên 2: {teacher2Data?.name}
                                </h3>
                                <p className="text-[10px] text-amber-700">Tiêu chí do chính Giảng viên 2 đưa ra</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {t2Criteria.map((crit) => {
                                const score = teacher2Ratings[crit.id];
                                const curLvl = LIKERT_LEVELS.find(l => l.score === score);
                                return (
                                    <div key={crit.id} className="p-3 bg-amber-50/40 rounded-2xl border border-amber-100 space-y-2">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 text-xs">
                                            <div className="pr-2">
                                                <h4 className="font-bold text-slate-800">{crit.name}</h4>
                                                {crit.description && <p className="text-[11px] text-slate-500 mt-0.5">{crit.description}</p>}
                                            </div>
                                            {curLvl && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${curLvl.bgActive} text-white shrink-0`}>
                                                    ✓ {score} - {curLvl.label}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-5 gap-1.5 pt-1">
                                            {LIKERT_LEVELS.map(level => (
                                                <button
                                                    key={level.score}
                                                    type="button"
                                                    onClick={() => setTeacher2Ratings({...teacher2Ratings, [crit.id]: level.score})}
                                                    className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-0.5 ${
                                                        score === level.score
                                                            ? `${level.bgActive} text-white shadow-xs font-bold scale-[1.02] border-transparent`
                                                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                                    }`}
                                                    title={`${level.score}: ${level.label}`}
                                                >
                                                    <span className="text-xs font-black">{level.score}★</span>
                                                    <span className="text-[10px] hidden sm:block truncate w-full text-center leading-tight">
                                                        {level.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Bước 5: Ý kiến đóng góp ẩn danh */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-3">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                        Ý kiến đóng góp & Góp ý thêm (Tùy chọn)
                    </h4>
                    <textarea 
                        rows={3} 
                        placeholder="Nhập góp ý của bạn để trung tâm và 2 giảng viên nâng cao chất lượng..."
                        className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:border-itc-500 outline-none resize-none bg-slate-50 transition"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </div>

                {/* Nút gửi */}
                <button 
                    onClick={handleSubmit}
                    disabled={submitting || !!deviceWarning}
                    className={`w-full bg-itc-800 hover:bg-itc-900 text-white font-bold text-sm py-4 rounded-2xl transition shadow-md flex items-center justify-center gap-2 ${
                        (submitting || !!deviceWarning) ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                >
                    {submitting ? <Icons.Loader className="w-5 h-5 animate-spin" /> : <Icons.CheckCircle className="w-5 h-5 text-emerald-400" />}
                    {submitting ? 'Đang gửi...' : 'Nộp Khảo Sát & Điểm Danh Có Mặt'}
                </button>
            </main>
        </div>
    );
}

export default function SurveyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Icons.Loader className="w-8 h-8 animate-spin text-itc-800" /></div>}>
            <SurveyContent />
        </Suspense>
    );
}
