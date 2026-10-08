"use client";

import React, { useEffect, useState } from "react";

type SurveySubmission = {
  timestamp: string;
  studentCode: string;
  studentName: string;
  classCode: string;
  course: string;
  answers: Record<number, number>;
  comment: string;
  // Các field để xử lý phàn nàn
  status?: string; // OPEN, IN_PROGRESS, RESOLVED
  actionNote?: string;
};

type ClassStat = {
  classCode: string;
  course: string;
  totalSubmissions: number;
  overallAverage: number;
  groupAverages: number[];
};

export default function DemoAdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);
  const [classStats, setClassStats] = useState<ClassStat[]>([]);
  
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    overallAverage: 0
  });

  // State cho bộ lọc phàn nàn
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionModal, setActionModal] = useState<any>(null);

  useEffect(() => {
    const loadData = () => {
      const data = JSON.parse(localStorage.getItem("mock_surveys") || "[]") as SurveySubmission[];
      
      // Gán status mặc định là OPEN nếu chưa có
      const processedData = data.map(item => ({
          ...item,
          status: item.status || 'OPEN'
      }));
      
      setSubmissions(processedData.reverse()); 

      if (processedData.length > 0) {
        let globalTotalScore = 0;
        const classMap: Record<string, any> = {};

        processedData.forEach(sub => {
          if (!classMap[sub.classCode]) {
            classMap[sub.classCode] = {
              classCode: sub.classCode,
              course: sub.course,
              totalSubmissions: 0,
              totalScores: 0,
              groupSums: [0, 0, 0, 0, 0],
              groupCounts: [0, 0, 0, 0, 0]
            };
          }
          
          classMap[sub.classCode].totalSubmissions += 1;

          Object.entries(sub.answers).forEach(([qIdStr, score]) => {
            const qId = parseInt(qIdStr);
            classMap[sub.classCode].totalScores += score;
            globalTotalScore += score;
            
            let groupIndex = 0;
            if (qId >= 1 && qId <= 6) groupIndex = 0;
            else if (qId >= 7 && qId <= 12) groupIndex = 1;
            else if (qId >= 13 && qId <= 18) groupIndex = 2;
            else if (qId >= 19 && qId <= 24) groupIndex = 3;
            else if (qId >= 25 && qId <= 30) groupIndex = 4;

            classMap[sub.classCode].groupSums[groupIndex] += score;
            classMap[sub.classCode].groupCounts[groupIndex] += 1;
          });
        });

        const statsArray: ClassStat[] = Object.values(classMap).map((cm: any) => ({
          classCode: cm.classCode,
          course: cm.course,
          totalSubmissions: cm.totalSubmissions,
          overallAverage: Number((cm.totalScores / (cm.totalSubmissions * 30)).toFixed(2)),
          groupAverages: cm.groupSums.map((sum: number, i: number) => 
            cm.groupCounts[i] ? Number((sum / cm.groupCounts[i]).toFixed(2)) : 0
          )
        }));

        setClassStats(statsArray);
        setGlobalStats({
          total: processedData.length,
          overallAverage: Number((globalTotalScore / (processedData.length * 30)).toFixed(2))
        });
      } else {
        setClassStats([]);
        setGlobalStats({ total: 0, overallAverage: 0 });
      }
    };

    loadData();
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, []);

  const groupNames = [
    "I. Mục tiêu & Nội dung",
    "II. Giảng dạy & Đánh giá",
    "III. Cơ sở vật chất",
    "IV. Quản lý & Hỗ trợ",
    "V. Mức độ Hài lòng"
  ];

  const handleUpdateComplaint = () => {
    // Lấy data cũ
    const data = JSON.parse(localStorage.getItem("mock_surveys") || "[]") as SurveySubmission[];
    
    // Cập nhật record khớp timestamp
    const updatedData = data.map(sub => {
        if (sub.timestamp === actionModal.timestamp) {
            return {
                ...sub,
                status: actionModal.status,
                actionNote: actionModal.actionNote
            };
        }
        return sub;
    });

    // Lưu lại local storage
    localStorage.setItem("mock_surveys", JSON.stringify(updatedData));
    
    // Cập nhật state UI
    setSubmissions(updatedData.reverse());
    setActionModal(null);
  };

  // Lọc danh sách phàn nàn
  const filteredBadSubmissions = submissions.filter(sub => {
    const hasComment = sub.comment && sub.comment.trim() !== "";
    const hasBadRating = Object.values(sub.answers).some(score => score <= 2);
    
    if (!hasComment && !hasBadRating) return false;
    
    if (filterStatus !== 'ALL' && sub.status !== filterStatus) return false;
    
    if (searchTerm && (!sub.comment || !sub.comment.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
    
    return true;
  });

  return (
    <div className="min-h-screen flex-1 bg-slate-50 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-sm scale-105' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
                Bảng điều khiển (Demo)
            </button>
            <button
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'reviews' ? 'bg-indigo-600 text-white shadow-sm scale-105' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
                Xử lý Phàn nàn
            </button>
        </div>

        {activeTab === 'overview' && (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-l-sky-500">
                        <p className="text-[11px] text-slate-500 font-semibold mb-1">Tổng phiếu Toàn trung tâm</p>
                        <p className="text-2xl font-black text-slate-800">{globalStats.total}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-l-emerald-500">
                        <p className="text-[11px] text-slate-500 font-semibold mb-1">Hài lòng Toàn trung tâm</p>
                        <p className="text-2xl font-black text-emerald-600">{globalStats.overallAverage} <span className="text-sm">★</span></p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-l-amber-500">
                        <p className="text-[11px] text-slate-500 font-semibold mb-1">Cảnh báo Phàn nàn</p>
                        <p className="text-2xl font-black text-amber-600">
                            {submissions.filter(s => (s.comment && s.comment.trim() !== "") || Object.values(s.answers).some(sc => sc <= 2)).length} 
                            <span className="text-sm text-slate-400 font-medium"> phiếu</span>
                        </p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-l-rose-500">
                        <p className="text-[11px] text-slate-500 font-semibold mb-1">Lớp đang khảo sát</p>
                        <p className="text-xl font-black text-rose-600">{classStats.length} Lớp</p>
                    </div>
                </div>

                <div className="mb-6 flex flex-col gap-5">
                    <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50 flex justify-between items-center shadow-sm">
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Thống kê điểm chất lượng từng lớp (Realtime Demo)</h3>
                    </div>

                    {classStats.length === 0 && (
                        <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm font-medium">
                            Chưa có học viên nào từ bất kỳ lớp nào nộp bài khảo sát Demo.
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                        {classStats.map((cm) => (
                            <div key={cm.classCode} className="bg-white rounded-2xl border-[3px] border-slate-100 shadow-sm p-5 sm:p-6 relative">
                                <div className="absolute left-0 top-0 bottom-0 w-2 bg-indigo-500 rounded-l-xl"></div>
                                <div className="pl-3 flex flex-wrap justify-between items-start gap-4 mb-5">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-900 text-sm">{cm.classCode} - {cm.course}</h4>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">Số phiếu đã thu: <b>{cm.totalSubmissions}</b> Sinh viên</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xl font-bold text-indigo-800">{cm.overallAverage}</span>
                                        <span className="text-xs text-amber-500 font-semibold ml-1">★ / 5.0</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                                    {groupNames.map((name, idx) => {
                                        const score = cm.groupAverages[idx];
                                        const isAlert = score < 3.5;
                                        return (
                                            <div key={idx} className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="font-medium text-slate-700 text-[11px]">{name}</span>
                                                    <span className={`font-bold ${isAlert ? 'text-rose-600' : 'text-slate-800'}`}>{score} ★</span>
                                                </div>
                                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                    <div 
                                                        className={`h-1.5 rounded-full transition-all duration-500 ${isAlert ? 'bg-rose-500' : 'bg-indigo-600'}`} 
                                                        style={{ width: `${(score/5)*100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        )}

        {activeTab === 'reviews' && (
             <div className="space-y-4">
                {/* BỘ LỌC */}
                <div className="bg-white p-4 rounded-2xl flex flex-wrap justify-between items-center gap-4 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">Lọc theo trạng thái:</span>
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="border border-slate-200 rounded-lg text-xs p-2 font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        >
                            <option value="ALL">Tất cả phàn nàn</option>
                            <option value="OPEN">Chờ tiếp nhận xử lý</option>
                            <option value="IN_PROGRESS">Đang kiểm tra / Sửa chữa</option>
                            <option value="RESOLVED">Đã khắc phục hoàn tất</option>
                        </select>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <input 
                            type="text" 
                            placeholder="Tìm nội dung phàn nàn..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                        <span className="absolute left-2.5 top-2.5 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                        </span>
                    </div>
                </div>

                {/* DANH SÁCH PHÀN NÀN */}
                <div className="space-y-3">
                    {filteredBadSubmissions.length > 0 ? (
                        filteredBadSubmissions.map((rev, idx) => {
                            const badRatings = Object.entries(rev.answers).filter(([q, score]) => score <= 2);
                            
                            return (
                            <div key={idx} className="bg-white p-5 rounded-2xl space-y-3 border-l-4 border-l-indigo-800 shadow-sm transition-all hover:shadow-md">
                                <div className="flex flex-wrap justify-between items-start gap-2">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-indigo-900 text-sm">{rev.classCode} - {rev.course}</span>
                                        <span className="text-xs text-slate-500 mt-1">SV: <b>{rev.studentName}</b> ({rev.studentCode}) • {new Date(rev.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div>
                                        {rev.status === 'OPEN' && <span className="bg-rose-50 text-rose-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-rose-200">Mới phàn nàn</span>}
                                        {rev.status === 'IN_PROGRESS' && <span className="bg-amber-50 text-amber-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-amber-200">Đang xử lý</span>}
                                        {rev.status === 'RESOLVED' && <span className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-200">Đã khắc phục</span>}
                                    </div>
                                </div>

                                {rev.comment && rev.comment.trim() !== "" && (
                                    <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        "{rev.comment}"
                                    </p>
                                )}

                                {badRatings.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {badRatings.map(([qId, score]) => (
                                            <span key={qId} className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
                                                Câu {qId}: {score}★
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Ghi chú khắc phục của Admin */}
                                {rev.actionNote && (
                                    <div className="text-xs bg-indigo-50 text-indigo-900 p-3 rounded-xl border border-indigo-100 mt-2">
                                        <b className="uppercase text-[10px] mr-1">📝 Ghi chú từ Ban Quản Trị:</b> {rev.actionNote}
                                    </div>
                                )}

                                {/* Nút Cập nhật tiến độ */}
                                <div className="flex justify-end pt-2">
                                    <button 
                                        onClick={() => setActionModal({ 
                                            timestamp: rev.timestamp, 
                                            status: rev.status, 
                                            actionNote: rev.actionNote || '' 
                                        })}
                                        className="text-xs font-semibold bg-indigo-800 hover:bg-indigo-900 text-white px-4 py-2 rounded-lg shadow-sm transition"
                                    >
                                        Cập nhật tiến độ
                                    </button>
                                </div>
                            </div>
                        )})
                    ) : (
                        <div className="bg-white p-10 text-center text-slate-400 rounded-2xl text-xs shadow-sm">
                            Không tìm thấy phàn nàn nào khớp với điều kiện lọc.
                        </div>
                    )}
                </div>
            </div>
        )}

      </div>

      {/* MODAL CẬP NHẬT TIẾN ĐỘ PHÀN NÀN */}
      {actionModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-fade-in">
                  <h3 className="font-bold text-slate-900 text-lg mb-4">Cập nhật tiến độ xử lý</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Trạng thái:</label>
                          <select 
                              className="w-full border border-slate-300 rounded-xl p-3 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                              value={actionModal.status}
                              onChange={(e) => setActionModal({...actionModal, status: e.target.value})}
                          >
                              <option value="OPEN">Chờ tiếp nhận</option>
                              <option value="IN_PROGRESS">Đang kiểm tra / sửa chữa</option>
                              <option value="RESOLVED">Đã khắc phục hoàn tất</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Ghi chú hành động:</label>
                          <textarea 
                              rows={3}
                              className="w-full border border-slate-300 rounded-xl p-3 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                              placeholder="Ví dụ: Đã thay bàn phím mới cho sinh viên..."
                              value={actionModal.actionNote}
                              onChange={(e) => setActionModal({...actionModal, actionNote: e.target.value})}
                          ></textarea>
                      </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                      <button 
                          onClick={() => setActionModal(null)}
                          className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                          Hủy
                      </button>
                      <button 
                          onClick={handleUpdateComplaint}
                          className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition"
                      >
                          Lưu cập nhật
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
