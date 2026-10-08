"use client";

import React, { useState, useEffect } from "react";
import { getDeviceFingerprint, checkDeviceSubmissionStatus, recordDeviceSubmission } from "../../lib/deviceFingerprint";
import { LIKERT_LEVELS } from "../../types";

// Danh sách sinh viên giả lập cho lớp học
const demoStudents = [
  { id: "ITC2024001", name: "Nguyễn Văn An", course: "Lập trình Web Frontend", classCode: "ITC_24_01", teacher1: "Thầy Nguyễn Văn A (Lý thuyết)", teacher2: "Cô Trần Thị B (Thực hành Lab)" },
  { id: "ITC2024002", name: "Trần Thị Mai", course: "Lập trình Web Frontend", classCode: "ITC_24_01", teacher1: "Thầy Nguyễn Văn A (Lý thuyết)", teacher2: "Cô Trần Thị B (Thực hành Lab)" },
  { id: "ITC2024003", name: "Lê Quốc Bảo", course: "Tin học nâng cao", classCode: "ITC_24_02", teacher1: "Cô Trần Thị B (Chuyên đề)", teacher2: "Thầy Lê Văn C (Thực hành)" }
];

// 1. Tiêu chí đánh giá Trung tâm & Môn học chung
const centerSurveyCriteria = [
  { id: "center_1", text: "Phòng máy và trang thiết bị thực hành (máy tính, điều hòa, ánh sáng) đáp ứng tốt nhu cầu học tập." },
  { id: "center_2", text: "Hệ thống mạng Internet / Wi-Fi phòng máy của trường ổn định, đáp ứng bài học." },
  { id: "center_3", text: "Giáo trình, slide bài giảng và tài liệu học tập được cung cấp đầy đủ, kịp thời." },
  { id: "center_4", text: "Công tác hỗ trợ học viên, thủ tục thi và cấp chứng chỉ của Trung tâm ITC thuận tiện, rõ ràng." }
];

// 2. Tiêu chí đánh giá do Giảng viên 1 tự đưa ra (Thầy Nguyễn Văn A)
const teacher1Criteria = [
  { id: "t1_1", text: "Phương pháp giảng dạy lý thuyết: Trình bày rõ ràng, dễ hiểu và có ví dụ thực tế minh họa." },
  { id: "t1_2", text: "Khả năng tương tác: Nhiệt tình giải đáp thắc mắc và khuyến khích học viên phát biểu trao đổi." },
  { id: "t1_3", text: "Cung cấp tài liệu: Slide bài giảng tóm tắt kiến thức trọng tâm bài học đầy đủ." }
];

// 3. Tiêu chí đánh giá do Giảng viên 2 tự đưa ra (Cô Trần Thị B - Phụ trách Thực hành Lab)
const teacher2Criteria = [
  { id: "t2_1", text: "Hướng dẫn thực hành phòng máy: Cầm tay chỉ việc, theo sát và kiên nhẫn hướng dẫn học viên thực hành." },
  { id: "t2_2", text: "Khắc phục sự cố: Hỗ trợ sửa lỗi phần mềm/mã nguồn nhanh chóng khi học viên gặp vướng mắc." },
  { id: "t2_3", text: "Bài tập thực tế: Đưa ra các bài tập rèn luyện sát với đề thi chứng chỉ và thực tế công việc." }
];

export default function DemoXemDiemPage() {
  const [currentStudent, setCurrentStudent] = useState(demoStudents[0]);
  const [isSurveyCompleted, setIsSurveyCompleted] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [deviceError, setDeviceError] = useState("");
  
  // Trạng thái Form khảo sát
  const [centerRatings, setCenterRatings] = useState<Record<string, number>>({});
  const [teacher1Ratings, setTeacher1Ratings] = useState<Record<string, number>>({});
  const [teacher2Ratings, setTeacher2Ratings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");

  const totalQuestions = centerSurveyCriteria.length + teacher1Criteria.length + teacher2Criteria.length;
  const answeredCount = Object.keys(centerRatings).length + Object.keys(teacher1Ratings).length + Object.keys(teacher2Ratings).length;

  useEffect(() => {
    // Lấy device fingerprint khi component mount
    const devId = getDeviceFingerprint();
    setDeviceId(devId);
  }, []);

  // Kiểm tra tình trạng điểm danh & khảo sát mỗi khi đổi sinh viên
  useEffect(() => {
    const existingSurveys = JSON.parse(localStorage.getItem("mock_surveys") || "[]");
    const didSubmit = existingSurveys.some((s: any) => s.studentCode === currentStudent.id && s.classCode === currentStudent.classCode);
    setIsSurveyCompleted(didSubmit);
    setDeviceError("");
  }, [currentStudent]);

  const handleOpenSurvey = () => {
    // Kiểm tra ràng buộc thiết bị (Anti-cheat: 1 thiết bị chỉ được 1 sinh viên nộp bài)
    const status = checkDeviceSubmissionStatus(currentStudent.classCode, currentStudent.id);
    if (!status.allowed) {
      setDeviceError(status.reason || "Thiết bị này đã được sử dụng!");
      return;
    }

    setDeviceError("");
    setShowSurveyModal(true);
    setCenterRatings({});
    setTeacher1Ratings({});
    setTeacher2Ratings({});
    setComment("");
  };

  const handleAutoFill = () => {
    const autoCenter: Record<string, number> = {};
    centerSurveyCriteria.forEach(c => autoCenter[c.id] = Math.random() > 0.3 ? 5 : 4);
    
    const autoT1: Record<string, number> = {};
    teacher1Criteria.forEach(c => autoT1[c.id] = 5);

    const autoT2: Record<string, number> = {};
    teacher2Criteria.forEach(c => autoT2[c.id] = Math.random() > 0.2 ? 5 : 4);

    setCenterRatings(autoCenter);
    setTeacher1Ratings(autoT1);
    setTeacher2Ratings(autoT2);
    setComment("Giảng viên dạy rất tâm huyết, cơ sở vật chất phòng máy đáp ứng tốt bài học!");
  };

  const handleSubmitSurvey = (e: React.FormEvent) => {
    e.preventDefault();

    if (answeredCount < totalQuestions) {
      alert(`Vui lòng đánh giá đầy đủ tất cả các tiêu chí! (Hiện tại: ${answeredCount}/${totalQuestions})`);
      return;
    }

    // 1. Kiểm tra lại thiết bị trước khi lưu
    const status = checkDeviceSubmissionStatus(currentStudent.classCode, currentStudent.id);
    if (!status.allowed) {
      alert(status.reason);
      setShowSurveyModal(false);
      return;
    }

    // 2. Ghi nhận khảo sát
    const submission = {
      id: "rev_" + Date.now(),
      timestamp: new Date().toISOString(),
      studentCode: currentStudent.id,
      studentName: currentStudent.name,
      classCode: currentStudent.classCode,
      course: currentStudent.course,
      deviceId: deviceId,
      centerRatings,
      teacher1Ratings,
      teacher2Ratings,
      comment,
      status: "OPEN"
    };

    const existingSurveys = JSON.parse(localStorage.getItem("mock_surveys") || "[]");
    existingSurveys.push(submission);
    localStorage.setItem("mock_surveys", JSON.stringify(existingSurveys));

    // 3. Đánh dấu điểm danh & khóa thiết bị
    recordDeviceSubmission(currentStudent.classCode, currentStudent.id, currentStudent.name);

    setIsSurveyCompleted(true);
    setShowSurveyModal(false);
  };

  const handleResetDevice = () => {
    if (confirm("Xóa toàn bộ lịch sử điểm danh và khảo sát trên thiết bị này để thử lại từ đầu?")) {
      localStorage.removeItem("itc_device_client_id");
      localStorage.removeItem("itc_attendance_device_records");
      localStorage.removeItem("mock_surveys");
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 lg:p-8 font-sans">
      
      {/* THANH ĐIỀU KHIỂN DEMO (CHO NGƯỜI THUYẾT TRÌNH BÁO CÁO) */}
      <div className="w-full max-w-3xl bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-amber-900">⚙️ CÔNG CỤ DEMO BÁO CÁO:</span>
          <span className="text-xs text-amber-700 hidden sm:inline">(Giả lập học viên tra cứu)</span>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            className="border border-amber-300 bg-white rounded-xl p-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            value={currentStudent.id}
            onChange={(e) => setCurrentStudent(demoStudents.find(s => s.id === e.target.value)!)}
          >
            {demoStudents.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.id}) - Lớp {s.classCode}</option>
            ))}
          </select>

          <button 
            onClick={handleResetDevice}
            className="bg-rose-500 hover:bg-rose-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold transition shadow-2xs"
            title="Xóa dữ liệu để test lại việc điểm danh 1 lần trên 1 thiết bị"
          >
            Reset Dữ Liệu
          </button>
        </div>
      </div>

      {/* CỔNG TRA CỨU ĐIỂM HỌC VIÊN */}
      <div className="bg-white rounded-3xl shadow-xl max-w-3xl w-full p-6 lg:p-8 border border-slate-200">
        <div className="text-center pb-6 border-b border-slate-100">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <img src="/logoitc.jpg" alt="ITC Logo" className="h-8 object-contain" />
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-itc-900 uppercase tracking-tight">
            CỔNG THÔNG TIN HỌC VIÊN ITC - ĐẠI HỌC ĐÀ LÀT
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Tra cứu kết quả học tập & Đánh giá chất lượng môn học / Chứng chỉ
          </p>
        </div>

        {/* Thông tin học viên */}
        <div className="my-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-700">
            <div>
              <span className="text-slate-500 font-semibold block">Họ và tên học viên:</span>
              <b className="text-sm text-slate-900">{currentStudent.name}</b>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Mã sinh viên / Học viên:</span>
              <b className="text-sm font-mono text-itc-900">{currentStudent.id}</b>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Môn học / Chứng chỉ:</span>
              <b className="text-slate-900">{currentStudent.course} (Mã lớp: {currentStudent.classCode})</b>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Giảng viên phụ trách:</span>
              <span className="font-semibold text-itc-800 block text-[11px]">{currentStudent.teacher1}</span>
              <span className="font-semibold text-amber-700 block text-[11px]">{currentStudent.teacher2}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Trạng thái điểm danh hôm nay:</span>
              {isSurveyCompleted ? (
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  ✓ ĐÃ ĐIỂM DANH (CÓ MẶT)
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                  ⏳ CHƯA ĐIỂM DANH
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Thiết bị: <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{deviceId.slice(0, 16)}...</span>
            </div>
          </div>
        </div>

        {/* THÔNG BÁO LỖI THIẾT BỊ NẾU ĐÃ BỊ DÙNG HỘ */}
        {deviceError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-semibold flex items-start gap-2.5">
            <span className="text-lg">🚫</span>
            <div>
              <p className="font-bold">Cảnh báo quy chế thiết bị:</p>
              <p className="mt-0.5 font-normal leading-relaxed">{deviceError}</p>
            </div>
          </div>
        )}

        {/* KHU VỰC BẢNG ĐIỂM: BỊ KHÓA NẾU CHƯA LÀM KHẢO SÁT */}
        {!isSurveyCompleted ? (
          <div className="p-6 bg-slate-50 border-2 border-dashed border-amber-300 rounded-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-xl shadow-xs">
              🔒
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">KẾT QUẢ ĐANG TẠM KHÓA</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Theo quy chế đào tạo của ITC - Đại học Đà Lạt, học viên <b>bắt buộc phải hoàn tất phiếu khảo sát chất lượng môn học và đánh giá 2 giảng viên</b> để được mở khóa xem điểm và tự động ghi nhận điểm danh có mặt hôm nay.
              </p>
            </div>
            
            <button
              onClick={handleOpenSurvey}
              className="bg-itc-800 hover:bg-itc-900 text-white font-bold py-3.5 px-8 rounded-xl shadow-md transition transform hover:scale-105 text-sm"
            >
              ✍️ THỰC HIỆN KHẢO SÁT ĐỂ XEM ĐIỂM & ĐIỂM DANH
            </button>
            <p className="text-[11px] text-slate-400 italic">
              * Lưu ý: Mỗi sinh viên chỉ được làm 1 lần duy nhất trên 1 thiết bị.
            </p>
          </div>
        ) : (
          /* BẢNG ĐIỂM ĐƯỢC MỞ KHÓA */
          <div className="p-6 bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-emerald-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-sm">✓</span>
                <div>
                  <h3 className="font-black text-emerald-950 text-base">BẢNG ĐIỂM ĐÃ ĐƯỢC MỞ KHÓA</h3>
                  <p className="text-[11px] text-emerald-700">Đã hoàn tất khảo sát & xác nhận điểm danh thành công!</p>
                </div>
              </div>
              <span className="bg-emerald-200 text-emerald-900 font-extrabold text-xs px-3 py-1 rounded-full">
                XẾP LOẠI: GIỎI
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">Điểm danh / Chuyên cần:</span>
                <b className="text-xl font-black text-emerald-600">10 / 10</b>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">Điểm Thực hành Lab:</span>
                <b className="text-xl font-black text-blue-600">8.8</b>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">Điểm Thi Cuối Khóa:</span>
                <b className="text-xl font-black text-purple-600">9.0</b>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
              <span className="text-slate-600 font-medium">Kết luận đánh giá cấp chứng chỉ:</span>
              <b className="text-emerald-700 font-bold text-sm">ĐỦ ĐIỀU KIỆN CẤP CHỨNG CHỈ ITC</b>
            </div>

            <div className="text-center pt-2">
              <a href="/" target="_blank" className="text-xs text-itc-800 hover:underline font-bold">
                👉 Đi tới Dashboard Admin / Giảng viên để xem dữ liệu nhảy realtime
              </a>
            </div>
          </div>
        )}
      </div>

      {/* MODAL KHẢO SÁT BẮT BUỘC (GỒM ĐÁNH GIÁ TRUNG TÂM + GV1 + GV2) */}
      {showSurveyModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex justify-center z-50 overflow-hidden p-2 sm:p-4">
          <div className="bg-white w-full max-w-3xl max-h-[95vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="bg-itc-800 text-white p-5 shrink-0 flex justify-between items-start">
              <div>
                <h2 className="text-base sm:text-lg font-bold">
                  PHIẾU KHẢO SÁT CHẤT LƯỢNG MÔN HỌC & ĐÁNH GIÁ 2 GIẢNG VIÊN
                </h2>
                <p className="text-xs text-itc-200 mt-1">
                  Lớp: <b>{currentStudent.classCode}</b> — Học viên: <b>{currentStudent.name}</b> ({currentStudent.id})
                </p>
              </div>
              <button 
                onClick={handleAutoFill} 
                className="bg-amber-400 hover:bg-amber-300 text-slate-900 px-3 py-1.5 text-xs font-black rounded-lg shadow-sm shrink-0 transition"
                title="Tự động chọn nhanh điểm để demo báo cáo"
              >
                ⚡ Điền Mẫu (Demo)
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">
              
              {/* BẢNG CHÚ GIẢI 5 CẤP ĐỘ ĐÁNH GIÁ */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
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

              {/* PHẦN 1: ĐÁNH GIÁ TRUNG TÂM */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="w-6 h-6 rounded-full bg-itc-800 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                      Đánh giá chung về Trung tâm & Cơ sở vật chất môn học
                    </h3>
                    <p className="text-[11px] text-slate-500">Đánh giá theo 5 mức chuẩn từ "Rất không hài lòng" đến "Rất hài lòng"</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {centerSurveyCriteria.map((item, idx) => {
                    const score = centerRatings[item.id];
                    const curLvl = LIKERT_LEVELS.find(l => l.score === score);
                    return (
                      <div key={item.id} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                          <p className="font-semibold text-slate-700">{idx + 1}. {item.text}</p>
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
                              onClick={() => setCenterRatings(prev => ({ ...prev, [item.id]: level.score }))}
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

              {/* PHẦN 2: ĐÁNH GIÁ GIẢNG VIÊN 1 (DO GV1 TỰ ĐƯA RA TIÊU CHÍ) */}
              <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-blue-100 pb-3">
                  <span className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <div>
                    <h3 className="font-bold text-blue-900 text-sm uppercase tracking-wide">
                      Đánh giá Giảng viên 1: {currentStudent.teacher1}
                    </h3>
                    <p className="text-[11px] text-slate-500">Các tiêu chí dưới đây do chính Giảng viên 1 thiết lập để tiếp thu ý kiến học viên</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {teacher1Criteria.map((item, idx) => {
                    const score = teacher1Ratings[item.id];
                    const curLvl = LIKERT_LEVELS.find(l => l.score === score);
                    return (
                      <div key={item.id} className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-2 text-xs">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                          <p className="font-semibold text-slate-700">{idx + 1}. {item.text}</p>
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
                              onClick={() => setTeacher1Ratings(prev => ({ ...prev, [item.id]: level.score }))}
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

              {/* PHẦN 3: ĐÁNH GIÁ GIẢNG VIÊN 2 (DO GV2 TỰ ĐƯA RA TIÊU CHÍ) */}
              <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                  <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <div>
                    <h3 className="font-bold text-amber-900 text-sm uppercase tracking-wide">
                      Đánh giá Giảng viên 2: {currentStudent.teacher2}
                    </h3>
                    <p className="text-[11px] text-slate-500">Các tiêu chí thực hành/lab do chính Giảng viên 2 thiết lập</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {teacher2Criteria.map((item, idx) => {
                    const score = teacher2Ratings[item.id];
                    const curLvl = LIKERT_LEVELS.find(l => l.score === score);
                    return (
                      <div key={item.id} className="p-3 bg-amber-50/40 rounded-xl border border-amber-100 space-y-2 text-xs">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                          <p className="font-semibold text-slate-700">{idx + 1}. {item.text}</p>
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
                              onClick={() => setTeacher2Ratings(prev => ({ ...prev, [item.id]: level.score }))}
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

              {/* PHẦN 4: Ý KIẾN GÓP Ý THÊM */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <h3 className="font-bold text-slate-800 text-xs uppercase mb-2">
                  4. Ý kiến đóng góp & Góp ý thêm (Tùy chọn)
                </h3>
                <textarea 
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:border-itc-500 outline-none bg-slate-50 resize-none"
                  placeholder="Nhập nhận xét hoặc phản hồi của bạn để 2 giảng viên và trung tâm nâng cao chất lượng..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 shrink-0">
              <div className="text-xs font-semibold text-slate-500">
                Tiến độ: <span className={answeredCount === totalQuestions ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                  {answeredCount}/{totalQuestions} tiêu chí
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSurveyModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSubmitSurvey}
                  disabled={answeredCount < totalQuestions}
                  className={`py-2.5 px-6 font-bold text-xs rounded-xl transition shadow-sm ${
                    answeredCount === totalQuestions 
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  NỘP BÀI & MỞ KHÓA ĐIỂM
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
