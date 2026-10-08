import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { TeacherCriterion } from '../../types';
import { sanitizeCriteriaText } from './ManageCriteriaModal';

interface TeacherCriteriaModalProps {
    teacherId: string;
    teacherName: string;
    teacherCriteria: TeacherCriterion[];
    onSaveCriteria: (criteria: TeacherCriterion[]) => void;
    onClose: () => void;
}

const MAX_TEACHER_CRITERIA = 10;

export const TeacherCriteriaModal = ({
    teacherId,
    teacherName,
    teacherCriteria,
    onSaveCriteria,
    onClose
}: TeacherCriteriaModalProps) => {
    const [criteria, setCriteria] = useState<TeacherCriterion[]>(
        teacherCriteria.filter(c => c.teacherId === teacherId)
    );
    const [inputMode, setInputMode] = useState<'MANUAL' | 'FILE'>('MANUAL');

    // Manual form state
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');

    // File import state
    const [fileText, setFileText] = useState('');
    const [fileName, setFileName] = useState('');
    const [parsedItems, setParsedItems] = useState<Array<{ name: string; description?: string }>>([]);
    const [importError, setImportError] = useState('');

    const handleAddManual = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        if (criteria.length >= MAX_TEACHER_CRITERIA) {
            alert(`Theo quy định của Trung tâm ITC, mỗi giảng viên chỉ được thiết lập tối đa ${MAX_TEACHER_CRITERIA} tiêu chí đánh giá cá nhân.`);
            return;
        }

        const newItem: TeacherCriterion = {
            id: 'tc_' + Date.now(),
            teacherId,
            name: sanitizeCriteriaText(newName),
            description: newDesc.trim() ? sanitizeCriteriaText(newDesc) : undefined,
            orderIndex: criteria.length + 1,
            status: 'PENDING'
        };

        const updated = [...criteria, newItem];
        setCriteria(updated);
        onSaveCriteria(updated);
        setNewName('');
        setNewDesc('');
    };

    const handleStartEdit = (item: TeacherCriterion) => {
        setEditingId(item.id);
        setEditName(item.name);
        setEditDesc(item.description || '');
    };

    const handleSaveEdit = (id: string) => {
        const updated = criteria.map(c => 
            c.id === id ? { ...c, name: sanitizeCriteriaText(editName), description: editDesc.trim() ? sanitizeCriteriaText(editDesc) : undefined } : c
        );
        setCriteria(updated);
        onSaveCriteria(updated);
        setEditingId(null);
    };

    const handleDelete = (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa tiêu chí này khỏi phiếu đánh giá của bạn?')) {
            const updated = criteria.filter(c => c.id !== id);
            setCriteria(updated);
            onSaveCriteria(updated);
        }
    };

    // Phân tích nội dung file
    const parseContent = (content: string) => {
        setImportError('');
        const trimmed = content.trim();
        if (!trimmed) {
            setParsedItems([]);
            return;
        }

        const results: Array<{ name: string; description?: string }> = [];

        // 1. Thử parse JSON
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const arr = JSON.parse(trimmed);
                if (Array.isArray(arr)) {
                    arr.forEach((it: any) => {
                        const name = it.name || it.text || it.title;
                        if (name) {
                            results.push({ name, description: it.description || it.desc || undefined });
                        }
                    });
                    if (results.length > 0) {
                        setParsedItems(results);
                        return;
                    }
                }
            } catch (e) {}
        }

        // 2. Parse theo từng dòng CSV / TXT
        const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        let startIdx = 0;
        if (lines[0].toLowerCase().includes('tên tiêu chí') || lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('tiêu chí')) {
            startIdx = 1;
        }

        for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i];
            let name = '';
            let desc = '';

            if (line.includes('\t')) {
                const parts = line.split('\t');
                name = parts[0]?.trim();
                desc = parts.slice(1).join(' ').trim();
            } else if (line.includes('|')) {
                const parts = line.split('|');
                name = parts[0]?.trim();
                desc = parts.slice(1).join(' ').trim();
            } else if (line.includes(';') || line.includes(',')) {
                const delim = line.includes(';') ? ';' : ',';
                const parts = line.split(delim);
                name = parts[0]?.trim();
                desc = parts.slice(1).join(', ').trim();
            } else {
                name = line;
            }

            name = sanitizeCriteriaText(name);
            desc = sanitizeCriteriaText(desc);

            if (name) {
                results.push({ name, description: desc || undefined });
            }
        }

        if (results.length === 0) {
            setImportError('Không tìm thấy tiêu chí nào. Vui lòng kiểm tra định dạng.');
        }

        setParsedItems(results);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setFileText(text);
            parseContent(text);
        };
        reader.readAsText(file);
    };

    // Nhập hàng loạt tiêu chí từ file
    const handleImportBatch = () => {
        if (parsedItems.length === 0) return;

        const availableSlots = MAX_TEACHER_CRITERIA - criteria.length;
        if (availableSlots <= 0) {
            alert(`Bạn đã có ${criteria.length} tiêu chí (tối đa ${MAX_TEACHER_CRITERIA} tiêu chí). Không thể nhập thêm! Vui lòng xóa bớt tiêu chí cũ nếu muốn thay thế.`);
            return;
        }

        const itemsToImport = parsedItems.slice(0, availableSlots);
        if (parsedItems.length > availableSlots) {
            alert(`Theo quy định, mỗi giảng viên chỉ được tối đa ${MAX_TEACHER_CRITERIA} tiêu chí đánh giá cá nhân. Hệ thống chỉ lấy ${availableSlots} tiêu chí đầu tiên từ tệp tin để vừa đủ ${MAX_TEACHER_CRITERIA} tiêu chí.`);
        }

        const newCriteriaItems: TeacherCriterion[] = itemsToImport.map((item, idx) => ({
            id: 'tc_' + Date.now() + '_' + idx,
            teacherId,
            name: item.name,
            description: item.description,
            orderIndex: criteria.length + idx + 1,
            status: 'PENDING'
        }));

        const updated = [...criteria, ...newCriteriaItems];
        setCriteria(updated);
        onSaveCriteria(updated);

        alert(`✅ Đã nhập thành công ${newCriteriaItems.length} tiêu chí mới từ tệp tin!`);
        setFileText('');
        setFileName('');
        setParsedItems([]);
        setInputMode('MANUAL');
    };

    const handleDownloadTemplate = () => {
        const sampleCsv = `Tên tiêu chí giảng viên,Mô tả chi tiết\nPhương pháp truyền đạt và giải thích thuật toán,Giải thích trực quan dễ hiểu bằng sơ đồ và ví dụ thực tế\nTheo sát và hướng dẫn sửa lỗi code cho từng sinh viên,Nhiệt tình chỉ rõ nguyên nhân lỗi và cách debug chuẩn\nCập nhật tài liệu và bài tập lab mẫu đầy đủ,Cung cấp slide tóm tắt và source code mẫu trước buổi học`;
        const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'mau_tieu_chi_giang_vien.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-itc-800 p-5 text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <Icons.CheckCircle className="w-5 h-5 text-emerald-400" />
                            <h3 className="font-bold text-lg">Thiết lập Tiêu chí Đánh giá của Giảng viên</h3>
                        </div>
                        <p className="text-xs text-itc-100 mt-1">
                            Giảng viên: <b>{teacherName}</b> — Tiêu chí riêng sẽ xuất hiện trên phiếu khảo sát của học viên khi đánh giá bạn.
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <Icons.Plus className="w-5 h-5 rotate-45" />
                    </button>
                </div>

                {/* Sub-header / Mode selector */}
                <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setInputMode('MANUAL')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                inputMode === 'MANUAL'
                                    ? 'bg-itc-800 text-white shadow-xs'
                                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                            }`}
                        >
                            <span>✍️</span> Tự gõ tiêu chí
                        </button>
                        <button
                            type="button"
                            onClick={() => setInputMode('FILE')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                inputMode === 'FILE'
                                    ? 'bg-itc-800 text-white shadow-xs'
                                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                            }`}
                        >
                            <span>📁</span> Nhập bằng tệp tin (Update file)
                        </button>
                    </div>

                    <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <span>Số tiêu chí cá nhân:</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-black text-xs ${
                            criteria.length >= MAX_TEACHER_CRITERIA
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-itc-100 text-itc-900'
                        }`}>
                            {criteria.length} / {MAX_TEACHER_CRITERIA}
                        </span>
                        {criteria.length >= MAX_TEACHER_CRITERIA && (
                            <span className="text-[10px] text-rose-600 font-bold">(Đã đạt tối đa)</span>
                        )}
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
                    {/* Cảnh báo nếu số tiêu chí vượt quá 10 */}
                    {criteria.length > MAX_TEACHER_CRITERIA && (
                        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-amber-900 text-xs animate-in fade-in">
                            <div className="flex items-center gap-2.5">
                                <Icons.AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                <div>
                                    <p className="font-bold">Quy định: Mỗi giảng viên chỉ được tối đa 10 tiêu chí đánh giá cá nhân.</p>
                                    <p className="text-[11px] text-amber-700 mt-0.5">
                                        Hiện bạn đang có <b>{criteria.length}</b> tiêu chí. Vui lòng bấm rút gọn hoặc xóa bớt để đủ điều kiện gửi Admin phê duyệt.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm(`Bạn có chắc chắn muốn giữ lại đúng 10 tiêu chí đầu tiên và xóa ${criteria.length - MAX_TEACHER_CRITERIA} tiêu chí phía sau?`)) {
                                        const trimmed = criteria.slice(0, MAX_TEACHER_CRITERIA);
                                        setCriteria(trimmed);
                                        onSaveCriteria(trimmed);
                                    }
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition text-xs shrink-0"
                            >
                                ✂️ Giữ đúng 10 tiêu chí đầu
                            </button>
                        </div>
                    )}

                    {/* Danh sách tiêu chí hiện có */}
                    <div>
                        <h4 className="font-bold text-xs uppercase text-slate-600 mb-3 tracking-wider flex items-center gap-1.5">
                            <Icons.FileText className="w-4 h-4 text-itc-700" /> Các tiêu chí hiện tại của bạn ({criteria.length})
                        </h4>

                        <div className="space-y-2.5">
                            {criteria.map((item, index) => (
                                <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-itc-300 transition">
                                    {editingId === item.id ? (
                                        <div className="space-y-3">
                                            <input 
                                                type="text" 
                                                value={editName} 
                                                onChange={e => setEditName(e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:border-itc-500 outline-none"
                                            />
                                            <input 
                                                type="text" 
                                                placeholder="Mô tả tiêu chí..."
                                                value={editDesc} 
                                                onChange={e => setEditDesc(e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-600 focus:border-itc-500 outline-none"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => setEditingId(null)}
                                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                                                >
                                                    Hủy
                                                </button>
                                                <button 
                                                    onClick={() => handleSaveEdit(item.id)}
                                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                                                >
                                                    Lưu
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-itc-100 text-itc-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                        {index + 1}
                                                    </span>
                                                    <h5 className="font-bold text-slate-800 text-xs sm:text-sm">{item.name}</h5>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                                        item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                                        item.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {item.status === 'APPROVED' ? '✓ Đã duyệt' : item.status === 'REJECTED' ? '✕ Từ chối' : '⏳ Chờ Admin duyệt'}
                                                    </span>
                                                </div>
                                                {item.description && (
                                                    <p className="text-xs text-slate-500 mt-1 pl-7">{item.description}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button 
                                                    onClick={() => handleStartEdit(item)}
                                                    className="p-1.5 text-slate-400 hover:text-itc-800 hover:bg-slate-100 rounded-lg transition"
                                                    title="Sửa tiêu chí"
                                                >
                                                    <Icons.FileText className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                    title="Xóa tiêu chí"
                                                >
                                                    <Icons.Trash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {criteria.length === 0 && (
                                <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                                    Bạn chưa tạo tiêu chí đánh giá riêng nào. Hãy thêm tiêu chí ở form bên dưới hoặc nhập bằng tệp tin.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* KHU VỰC THÊM MỚI (TỰ GÕ HOẶC NHẬP TỪ FILE) */}
                    {inputMode === 'MANUAL' ? (
                        /* Chế độ 1: Tự gõ */
                        <div className="bg-white p-5 rounded-2xl border border-itc-200 shadow-sm">
                            <h4 className="font-bold text-xs uppercase text-itc-900 mb-3 flex items-center gap-1.5">
                                <Icons.Plus className="w-4 h-4 text-itc-800" /> Tự gõ tiêu chí đánh giá mới
                            </h4>
                            <form onSubmit={handleAddManual} className="space-y-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tên tiêu chí *</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="VD: Khả năng hướng dẫn giải quyết lỗi lập trình thực tế"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-itc-500 outline-none bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Mô tả / Hướng dẫn học viên chấm điểm</label>
                                    <textarea 
                                        rows={2}
                                        placeholder="VD: Giảng viên nhiệt tình, giải đáp nhanh chóng và chỉ rõ nguyên nhân lỗi..."
                                        value={newDesc}
                                        onChange={e => setNewDesc(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:border-itc-500 outline-none bg-slate-50 resize-none"
                                    />
                                </div>
                                <div className="flex justify-end pt-1">
                                    <button 
                                        type="submit"
                                        disabled={criteria.length >= MAX_TEACHER_CRITERIA}
                                        className={`font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 ${
                                            criteria.length >= MAX_TEACHER_CRITERIA
                                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                                : 'bg-itc-800 hover:bg-itc-900 text-white'
                                        }`}
                                    >
                                        <Icons.Plus className="w-3.5 h-3.5" /> Thêm vào danh sách của tôi
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        /* Chế độ 2: Nhập bằng tệp tin (Update file) */
                        <div className="bg-white p-5 rounded-2xl border border-itc-200 shadow-sm space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                                <h4 className="font-bold text-xs uppercase text-itc-900 flex items-center gap-1.5">
                                    📁 Nhập tiêu chí từ tệp tin (CSV / TXT / JSON)
                                </h4>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="text-[11px] font-bold text-itc-700 hover:underline flex items-center gap-1"
                                >
                                    📥 Tải file mẫu CSV
                                </button>
                            </div>

                            <div className="border-2 border-dashed border-slate-300 hover:border-itc-500 rounded-2xl p-4 text-center bg-slate-50 transition">
                                <input 
                                    type="file" 
                                    id="teacher-criteria-file-input"
                                    accept=".csv,.txt,.json,.tsv" 
                                    onChange={handleFileUpload} 
                                    className="hidden" 
                                />
                                <label htmlFor="teacher-criteria-file-input" className="cursor-pointer block">
                                    <span className="text-2xl block mb-1">📂</span>
                                    <span className="text-xs font-bold text-itc-900 block">Chọn tệp tin từ máy tính</span>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">Định dạng hỗ trợ: .CSV, .TXT, .JSON (Cột: Tên tiêu chí, Mô tả)</span>
                                </label>
                                {fileName && (
                                    <div className="mt-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 py-1 px-2 rounded-lg border border-emerald-200">
                                        ✓ Đã chọn: {fileName}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Hoặc dán trực tiếp danh sách tiêu chí:
                                </label>
                                <textarea 
                                    rows={3}
                                    value={fileText}
                                    onChange={e => { setFileText(e.target.value); parseContent(e.target.value); }}
                                    placeholder={`Tên tiêu chí 1, Mô tả chi tiết\nTên tiêu chí 2, Mô tả chi tiết`}
                                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:border-itc-500 outline-none font-mono bg-slate-50 resize-none"
                                />
                            </div>

                            {importError && (
                                <div className="p-2.5 bg-rose-50 text-rose-700 text-[11px] rounded-xl border border-rose-200 font-medium">
                                    ⚠️ {importError}
                                </div>
                            )}

                            {parsedItems.length > 0 && (
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-700">Xem trước kết quả nhận diện:</span>
                                        <span className="bg-emerald-100 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                                            {parsedItems.length} tiêu chí
                                        </span>
                                    </div>
                                    <div className="max-h-32 overflow-y-auto space-y-1 text-[11px]">
                                        {parsedItems.map((item, i) => (
                                            <div key={i} className="p-1.5 bg-white rounded border border-slate-200 truncate">
                                                <b>{i + 1}. {item.name}</b> {item.description && <span className="text-slate-400"> — {item.description}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                disabled={parsedItems.length === 0}
                                onClick={handleImportBatch}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
                            >
                                ✅ Nhập {parsedItems.length} Tiêu chí vào danh sách của tôi
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="bg-itc-800 hover:bg-itc-900 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-sm"
                    >
                        Hoàn tất & Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};
