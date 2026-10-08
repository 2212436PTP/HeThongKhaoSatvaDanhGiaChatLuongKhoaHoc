import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { supabase } from '../../lib/supabaseClient';

// Hàm tự động làm sạch ký tự đặc biệt (*, #, _, `, số thứ tự thừa...)
export const sanitizeCriteriaText = (text: string): string => {
    if (!text) return '';
    let cleaned = text.trim();

    // 1. Loại bỏ các ký tự Markdown định dạng: **, *, ##, #, __, _, ~, `, >
    cleaned = cleaned.replace(/[*#_~`>]/g, '');

    // 2. Loại bỏ dấu ngoặc kép thừa (kể cả quote dạng Word/Excel: “ ” ‘ ’)
    cleaned = cleaned.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '');

    // 3. Loại bỏ ký tự đầu dòng kiểu bullet: -, +, •, –, —, v.v.
    cleaned = cleaned.replace(/^[\s\-\+•–—\.]+\s*/, '');

    // 4. Loại bỏ số thứ tự ở đầu dòng nếu có (VD: "1.", "1)", "1/", "Tiêu chí 1:", "TC 1 -", "1.1.")
    cleaned = cleaned.replace(/^(?:tiêu\s*chí|tc)?\s*\d+(\.\d+)*[\.\)\/\-:]\s*/i, '');

    // 5. Lặp lại loại bỏ bullet/khoảng trắng thừa nếu sau số thứ tự vẫn còn bullet/dấu hai chấm
    cleaned = cleaned.replace(/^[\s\-\+•–—\.:]+\s*/, '');

    // 6. Chuẩn hóa khoảng trắng liên tiếp
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // 7. Viết hoa chữ cái đầu tiên
    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned;
};

export const ManageCriteriaModal = ({ criteriaList, onClose, onRefresh, onSaveCriteriaList }: any) => {
    const [loading, setLoading] = useState(false);
    const [editingCrit, setEditingCrit] = useState<any>(null);
    const [inputMode, setInputMode] = useState<'MANUAL' | 'FILE'>('MANUAL'); // 'MANUAL' (Tự gõ) vs 'FILE' (Nhập từ file)
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Manual Form state
    const [id, setId] = useState('');
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [orderIndex, setOrderIndex] = useState(criteriaList.length + 1);

    // File Import state
    const [fileText, setFileText] = useState('');
    const [fileName, setFileName] = useState('');
    const [parsedCriteria, setParsedCriteria] = useState<Array<{ id: string; name: string; description: string; orderIndex: number }>>([]);
    const [importError, setImportError] = useState('');

    const resetManualForm = () => {
        setId('');
        setName('');
        setDesc('');
        setOrderIndex(criteriaList.length + 1);
        setEditingCrit(null);
    };

    const handleEdit = (crit: any) => {
        setInputMode('MANUAL');
        setEditingCrit(crit);
        setId(crit.id);
        setName(crit.name);
        setDesc(crit.description || '');
        setOrderIndex(crit.order_index || crit.orderIndex || 1);
    };

    // Chọn / Bỏ chọn tất cả
    const handleToggleSelectAll = () => {
        if (selectedIds.length === criteriaList.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(criteriaList.map((c: any) => c.id));
        }
    };

    const handleToggleSelectOne = (critId: string) => {
        setSelectedIds(prev => prev.includes(critId) ? prev.filter(x => x !== critId) : [...prev, critId]);
    };

    // Xóa một tiêu chí
    const handleDeleteSingle = async (crit: any) => {
        if (!confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN tiêu chí "${crit.name}" khỏi danh sách khảo sát?`)) {
            return;
        }

        setLoading(true);
        try {
            const updated = criteriaList.filter((c: any) => c.id !== crit.id);
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_survey_criteria', JSON.stringify(updated));
            }
            if (onSaveCriteriaList) onSaveCriteriaList(updated);

            try {
                await supabase.from('survey_criteria').delete().eq('id', crit.id);
            } catch (err) {
                console.warn('Lỗi Supabase khi xóa (đã cập nhật vào bộ nhớ hệ thống):', err);
            }

            if (editingCrit?.id === crit.id) {
                resetManualForm();
            }
            setSelectedIds(prev => prev.filter(x => x !== crit.id));
            if (onRefresh) onRefresh();
        } catch (err: any) {
            alert('Lỗi khi xóa tiêu chí: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Xóa hàng loạt tiêu chí đã chọn
    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Bạn có chắc chắn muốn XÓA ${selectedIds.length} tiêu chí đã chọn? Thao tác này không thể hoàn tác!`)) {
            return;
        }

        setLoading(true);
        try {
            const updated = criteriaList.filter((c: any) => !selectedIds.includes(c.id));
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_survey_criteria', JSON.stringify(updated));
            }
            if (onSaveCriteriaList) onSaveCriteriaList(updated);

            try {
                await supabase.from('survey_criteria').delete().in('id', selectedIds);
            } catch (err) {
                console.warn('Lỗi Supabase khi xóa hàng loạt:', err);
            }

            if (editingCrit && selectedIds.includes(editingCrit.id)) {
                resetManualForm();
            }
            setSelectedIds([]);
            if (onRefresh) onRefresh();
        } catch (err: any) {
            alert('Lỗi khi xóa: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Khôi phục tiêu chí mẫu ban đầu
    const handleRestoreDefaults = () => {
        if (!confirm('Khôi phục danh sách tiêu chí khảo sát mặc định ban đầu của ITC?')) return;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('itc_survey_criteria');
        }
        setSelectedIds([]);
        resetManualForm();
        if (onRefresh) onRefresh();
    };

    // Tự động làm sạch các ký tự đặc biệt (*, #, số thứ tự thừa) cho toàn bộ tiêu chí hiện tại
    const handleCleanAllCriteria = async () => {
        if (criteriaList.length === 0) return;
        if (!confirm(`Tự động dọn dẹp các ký tự lạ (*, #, số thứ tự bị lặp...) cho toàn bộ ${criteriaList.length} tiêu chí hiện tại?`)) return;

        setLoading(true);
        try {
            const updated = criteriaList.map((c: any) => ({
                ...c,
                name: sanitizeCriteriaText(c.name),
                description: c.description ? sanitizeCriteriaText(c.description) : c.description
            }));

            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_survey_criteria', JSON.stringify(updated));
            }
            if (onSaveCriteriaList) onSaveCriteriaList(updated);

            for (const item of updated) {
                try {
                    await supabase.from('survey_criteria').update({
                        name: item.name,
                        description: item.description
                    }).eq('id', item.id);
                } catch (e) {}
            }

            if (onRefresh) onRefresh();
            alert('✨ Đã làm sạch toàn bộ ký tự đặc biệt (*, #, số thứ tự) thành công!');
        } catch (err: any) {
            alert('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Lưu khi tự gõ (Manual)
    const handleSaveManual = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let updatedList: any[] = [];
            if (!editingCrit) {
                const finalId = id.trim() ? id.toLowerCase().replace(/\s+/g, '_') : 'crit_' + Date.now().toString().slice(-6);
                const existing = criteriaList.find((c: any) => c.id === finalId);
                if (existing) {
                    alert('Mã tiêu chí này đã tồn tại!');
                    setLoading(false);
                    return;
                }

                const newCrit = {
                    id: finalId,
                    name: sanitizeCriteriaText(name),
                    description: sanitizeCriteriaText(desc),
                    order_index: orderIndex,
                    is_active: true
                };

                updatedList = [...criteriaList, newCrit];

                const { error } = await supabase.from('survey_criteria').insert([newCrit]);
                if (error) {
                    console.warn('Database fallback to local memory', error.message);
                }
            } else {
                updatedList = criteriaList.map((c: any) => c.id === editingCrit.id ? {
                    ...c,
                    name: sanitizeCriteriaText(name),
                    description: sanitizeCriteriaText(desc),
                    order_index: orderIndex
                } : c);

                const { error } = await supabase.from('survey_criteria').update({
                    name: name.trim(),
                    description: desc.trim(),
                    order_index: orderIndex
                }).eq('id', editingCrit.id);
                if (error) console.warn('Supabase update error:', error.message);
            }
            
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_survey_criteria', JSON.stringify(updatedList));
            }
            if (onSaveCriteriaList) onSaveCriteriaList(updatedList);

            if (onRefresh) onRefresh();
            resetManualForm();
        } catch (err: any) {
            alert('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Parser xử lý nội dung file (CSV, TXT, JSON, Tab-separated)
    const parseContent = (content: string) => {
        setImportError('');
        const trimmed = content.trim();
        if (!trimmed) {
            setParsedCriteria([]);
            return;
        }

        const results: Array<{ id: string; name: string; description: string; orderIndex: number }> = [];

        // 1. Thử phân tích JSON
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const jsonArray = JSON.parse(trimmed);
                if (Array.isArray(jsonArray)) {
                    jsonArray.forEach((item: any, idx: number) => {
                        const rawName = item.name || item.text || item.title;
                        if (rawName) {
                            results.push({
                                id: item.id || `crit_imp_${Date.now().toString().slice(-4)}_${idx + 1}`,
                                name: sanitizeCriteriaText(rawName),
                                description: sanitizeCriteriaText(item.description || item.desc || ''),
                                orderIndex: criteriaList.length + idx + 1
                            });
                        }
                    });
                    if (results.length > 0) {
                        setParsedCriteria(results);
                        return;
                    }
                }
            } catch (e) {
                // Not valid JSON, continue with CSV / text
            }
        }

        // 2. Phân tích dòng theo CSV hoặc TXT (dấu phẩy, chấm phẩy, tab hoặc gạch đứng |)
        const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        
        let startIndex = 0;
        // Bỏ qua dòng tiêu đề nếu có
        if (lines[0].toLowerCase().includes('tiêu chí') || lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('tên')) {
            startIndex = 1;
        }

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            let critName = '';
            let critDesc = '';

            if (line.includes('\t')) {
                const parts = line.split('\t');
                critName = parts[0]?.trim();
                critDesc = parts.slice(1).join(' ').trim();
            } else if (line.includes('|')) {
                const parts = line.split('|');
                critName = parts[0]?.trim();
                critDesc = parts.slice(1).join(' ').trim();
            } else if (line.includes(';') || line.includes(',')) {
                const delimiter = line.includes(';') ? ';' : ',';
                const parts = line.split(delimiter);
                critName = parts[0]?.trim();
                critDesc = parts.slice(1).join(', ').trim();
            } else {
                critName = line;
            }

            // Tự động làm sạch các ký tự đặc biệt (*, #, _, `, số thứ tự thừa)
            critName = sanitizeCriteriaText(critName);
            critDesc = sanitizeCriteriaText(critDesc);

            if (critName) {
                results.push({
                    id: `crit_imp_${Date.now().toString().slice(-4)}_${i + 1}`,
                    name: critName,
                    description: critDesc,
                    orderIndex: criteriaList.length + results.length + 1
                });
            }
        }

        if (results.length === 0) {
            setImportError('Không tìm thấy tiêu chí hợp lệ trong tệp tin. Vui lòng kiểm tra định dạng.');
        }

        setParsedCriteria(results);
    };

    // Đọc file từ máy tính
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

    // Lưu hàng loạt tiêu chí từ file vào hệ thống
    const handleImportBatch = async () => {
        if (parsedCriteria.length === 0) {
            alert('Chưa có tiêu chí nào được nhận diện để nhập!');
            return;
        }

        setLoading(true);
        try {
            const insertPayload = parsedCriteria.map((item, index) => ({
                id: item.id.toLowerCase().replace(/\s+/g, '_'),
                name: item.name,
                description: item.description,
                order_index: criteriaList.length + index + 1,
                is_active: true
            }));

            const { error } = await supabase.from('survey_criteria').insert(insertPayload);
            if (error) {
                console.warn('Lỗi Supabase khi thêm hàng loạt, thêm vào bộ nhớ local:', error.message);
            }

            const updatedList = [...criteriaList, ...insertPayload];
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_survey_criteria', JSON.stringify(updatedList));
            }
            if (onSaveCriteriaList) onSaveCriteriaList(updatedList);

            alert(`✅ Đã nhập thành công ${parsedCriteria.length} tiêu chí mới vào hệ thống!`);
            if (onRefresh) onRefresh();
            setFileText('');
            setFileName('');
            setParsedCriteria([]);
            setInputMode('MANUAL');
        } catch (err: any) {
            alert('Lỗi khi nhập tiêu chí: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Tải file mẫu CSV
    const handleDownloadTemplate = () => {
        const sampleCsv = `Tên tiêu chí,Mô tả chi tiết\nChất lượng máy tính thực hành,Cấu hình máy mạnh chuột bàn phím nhạy màn hình rõ nét\nTốc độ mạng Internet Wi-Fi,Đường truyền cáp quang nhanh truy cập tài liệu và lab mượt mà\nKhông gian và điều hòa nhiệt độ,Phòng học thoáng mát nhiệt độ duy trì ổn định\nThái độ cán bộ kỹ thuật ITC,Hỗ trợ học viên đăng ký và xử lý trục trặc máy nhanh chóng`;
        const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'mau_tieu_chi_khao_sat_itc.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleToggleStatus = async (crit: any) => {
        if (!confirm(`Bạn có chắc chắn muốn ${crit.is_active ? 'ẨN' : 'HIỂN THỊ'} tiêu chí này?`)) return;
        
        setLoading(true);
        try {
            const updated = criteriaList.map((c: any) => c.id === crit.id ? { ...c, is_active: !crit.is_active } : c);
            if (typeof window !== 'undefined') {
                localStorage.setItem('itc_survey_criteria', JSON.stringify(updated));
            }
            if (onSaveCriteriaList) onSaveCriteriaList(updated);

            try {
                await supabase.from('survey_criteria').update({
                    is_active: !crit.is_active
                }).eq('id', crit.id);
            } catch (err) {
                console.warn('Supabase toggle error:', err);
            }
            
            if (onRefresh) onRefresh();
        } catch (err: any) {
            alert('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-itc-800 p-5 text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <Icons.CheckCircle className="w-5 h-5 text-emerald-400" />
                            <h3 className="font-bold text-lg">Quản lý Tiêu chí Khảo sát Trung tâm</h3>
                        </div>
                        <p className="text-xs text-itc-100 mt-1">
                            Hỗ trợ 2 phương thức: <b>Tự gõ thủ công</b> hoặc <b>Nhập nhanh bằng cập nhật tệp tin (CSV / Excel / TXT / JSON)</b>
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
                            onClick={() => { setInputMode('MANUAL'); setEditingCrit(null); resetManualForm(); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
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
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                inputMode === 'FILE'
                                    ? 'bg-itc-800 text-white shadow-xs'
                                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                            }`}
                        >
                            <span>📁</span> Nhập bằng tệp tin (Update file)
                        </button>
                    </div>

                    <div className="text-xs font-bold text-slate-600">
                        Tổng tiêu chí hiện tại: <span className="text-itc-900 font-extrabold">{criteriaList.length}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-slate-50 flex flex-col md:flex-row gap-6">
                    {/* BẢNG BÊN TRÁI: DANH SÁCH TIÊU CHÍ HIỆN CÓ */}
                    <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                                Danh sách Tiêu chí đang áp dụng ({criteriaList.length})
                            </h4>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleCleanAllCriteria}
                                    disabled={loading || criteriaList.length === 0}
                                    className="text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs"
                                    title="Tự động xóa các ký tự *, #, số thứ tự thừa khỏi toàn bộ tiêu chí hiện tại"
                                >
                                    🧹 Làm sạch ký tự (*, #)
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRestoreDefaults}
                                    className="text-[11px] font-semibold text-slate-500 hover:text-itc-800 hover:underline transition"
                                    title="Khôi phục danh sách tiêu chí mẫu"
                                >
                                    ↺ Khôi phục mặc định
                                </button>
                                <button 
                                    onClick={() => { resetManualForm(); setInputMode('MANUAL'); setId('crit_' + Date.now().toString().slice(-4)); }}
                                    className="text-xs font-bold bg-itc-100 text-itc-800 px-3 py-1.5 rounded-lg hover:bg-itc-200 transition-colors"
                                >
                                    + Tạo tiêu chí mới
                                </button>
                            </div>
                        </div>

                        {/* Thanh công cụ chọn và xóa hàng loạt */}
                        {criteriaList.length > 0 && (
                            <div className="bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
                                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer select-none">
                                    <input 
                                        type="checkbox"
                                        checked={selectedIds.length > 0 && selectedIds.length === criteriaList.length}
                                        onChange={handleToggleSelectAll}
                                        className="w-4 h-4 rounded text-itc-800 focus:ring-itc-500 cursor-pointer accent-itc-800"
                                    />
                                    <span>Chọn tất cả ({criteriaList.length})</span>
                                </label>

                                {selectedIds.length > 0 ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-slate-500">
                                            Đã chọn: <b className="text-itc-900">{selectedIds.length}</b>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleDeleteSelected}
                                            disabled={loading}
                                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition shadow-2xs"
                                        >
                                            <Icons.Trash className="w-3.5 h-3.5" /> Xóa đã chọn ({selectedIds.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedIds([])}
                                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                                        >
                                            Bỏ chọn
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-[11px] text-slate-400">
                                        Tick ô để chọn xóa nhiều tiêu chí cùng lúc
                                    </span>
                                )}
                            </div>
                        )}
                        
                        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                            {criteriaList.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6 space-y-2">
                                    <p className="text-sm font-bold text-slate-600">Chưa có tiêu chí khảo sát nào!</p>
                                    <p className="text-xs text-slate-400">Bạn có thể tự thêm tiêu chí mới, nhập từ tệp tin hoặc khôi phục bộ tiêu chí mặc định.</p>
                                    <button
                                        type="button"
                                        onClick={handleRestoreDefaults}
                                        className="mt-2 px-4 py-2 bg-itc-800 text-white text-xs font-bold rounded-xl hover:bg-itc-900 transition"
                                    >
                                        ↺ Nạp lại bộ tiêu chí mẫu của ITC
                                    </button>
                                </div>
                            ) : (
                                criteriaList.map((crit: any) => (
                                    <div 
                                        key={crit.id} 
                                        className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                                            editingCrit?.id === crit.id 
                                                ? 'border-itc-500 bg-itc-50 shadow-xs' 
                                                : selectedIds.includes(crit.id)
                                                    ? 'border-rose-300 bg-rose-50/40'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                                            <input 
                                                type="checkbox"
                                                checked={selectedIds.includes(crit.id)}
                                                onChange={() => handleToggleSelectOne(crit.id)}
                                                className="w-4 h-4 rounded text-itc-800 focus:ring-itc-500 cursor-pointer accent-itc-800 shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                        #{crit.order_index || crit.orderIndex || 1}
                                                    </span>
                                                    <p className={`text-xs sm:text-sm font-bold truncate ${!crit.is_active ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                        {crit.name}
                                                    </p>
                                                    {!crit.is_active && (
                                                        <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold shrink-0">
                                                            Đã ẩn
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{crit.description || crit.desc}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button 
                                                type="button"
                                                onClick={() => handleEdit(crit)} 
                                                className="px-2.5 py-1 text-xs font-bold text-itc-800 hover:bg-itc-50 rounded-lg transition"
                                                title="Sửa tiêu chí"
                                            >
                                                Sửa
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => handleToggleStatus(crit)} 
                                                className={`text-[11px] font-bold px-2 py-1 rounded-lg transition ${
                                                    crit.is_active ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                }`}
                                            >
                                                {crit.is_active ? 'Ẩn' : 'Hiện'}
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => handleDeleteSingle(crit)} 
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                title="Xóa vĩnh viễn tiêu chí này"
                                            >
                                                <Icons.Trash className="w-4 h-4 text-slate-400 hover:text-rose-600" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* BẢNG BÊN PHẢI: CHẾ ĐỘ NHẬP (TỰ GÕ HOẶC TỪ FILE) */}
                    <div className="w-full md:w-96 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm shrink-0 h-fit space-y-4">
                        {inputMode === 'MANUAL' ? (
                            /* CHẾ ĐỘ 1: TỰ GÕ THỦ CÔNG */
                            <div>
                                <div className="border-b border-slate-100 pb-3 mb-3 flex justify-between items-center">
                                    <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                                        {editingCrit ? '✏️ Sửa tiêu chí' : '✍️ Tự gõ thêm tiêu chí'}
                                    </h4>
                                    {editingCrit && (
                                        <button onClick={resetManualForm} className="text-[11px] text-slate-400 hover:text-slate-600 underline">
                                            Hủy sửa
                                        </button>
                                    )}
                                </div>
                                <form onSubmit={handleSaveManual} className="space-y-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Mã tiêu chí (ID)</label>
                                        <input 
                                            type="text" 
                                            value={id} 
                                            onChange={e => setId(e.target.value)} 
                                            className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:border-itc-500 bg-slate-50 font-mono" 
                                            placeholder="VD: may_tinh, mang_wifi..." 
                                        />
                                        <p className="text-[10px] text-slate-400 mt-0.5">Để trống hệ thống sẽ tự sinh mã.</p>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Tên Tiêu chí *</label>
                                        <input 
                                            required 
                                            type="text" 
                                            value={name} 
                                            onChange={e => setName(e.target.value)} 
                                            placeholder="VD: Trang thiết bị và máy tính phòng thực hành"
                                            className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:border-itc-500 outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Mô tả chi tiết / Hướng dẫn học viên</label>
                                        <textarea 
                                            value={desc} 
                                            onChange={e => setDesc(e.target.value)} 
                                            rows={3} 
                                            placeholder="VD: Chuột, bàn phím, màn hình máy tính hoạt động ổn định, máy chiếu rõ nét..."
                                            className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:border-itc-500 outline-none resize-none"
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Thứ tự hiển thị</label>
                                        <input 
                                            type="number" 
                                            value={orderIndex} 
                                            onChange={e => setOrderIndex(parseInt(e.target.value) || 1)} 
                                            className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:border-itc-500 outline-none" 
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        {editingCrit && (
                                            <button 
                                                type="button" 
                                                onClick={() => handleDeleteSingle(editingCrit)} 
                                                className="py-2 px-3 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition flex items-center justify-center gap-1"
                                                title="Xóa tiêu chí này"
                                            >
                                                <Icons.Trash className="w-3.5 h-3.5" /> Xóa
                                            </button>
                                        )}
                                        <button 
                                            type="button" 
                                            onClick={resetManualForm} 
                                            className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                                        >
                                            Đặt lại
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={loading} 
                                            className="flex-1 py-2 text-xs font-bold text-white bg-itc-800 hover:bg-itc-900 rounded-xl transition disabled:opacity-50 shadow-sm"
                                        >
                                            {loading ? 'Đang lưu...' : 'Lưu Tiêu chí'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            /* CHẾ ĐỘ 2: NHẬP BẰNG TỆP TIN (UPDATE / IMPORT FILE) */
                            <div className="space-y-3.5">
                                <div className="border-b border-slate-100 pb-2.5 flex justify-between items-center">
                                    <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                                        📁 Tải tệp tin Tiêu chí
                                    </h4>
                                    <button 
                                        type="button" 
                                        onClick={handleDownloadTemplate}
                                        className="text-[11px] font-bold text-itc-700 hover:underline flex items-center gap-1"
                                    >
                                        📥 Tải file mẫu CSV
                                    </button>
                                </div>

                                {/* Drag & Drop or Select File */}
                                <div className="border-2 border-dashed border-slate-300 hover:border-itc-500 rounded-2xl p-4 text-center bg-slate-50 transition">
                                    <input 
                                        type="file" 
                                        id="criteria-file-input"
                                        accept=".csv,.txt,.json,.tsv" 
                                        onChange={handleFileUpload} 
                                        className="hidden" 
                                    />
                                    <label htmlFor="criteria-file-input" className="cursor-pointer block">
                                        <span className="text-2xl block mb-1">📂</span>
                                        <span className="text-xs font-bold text-itc-900 block">Chọn tệp tin từ máy tính</span>
                                        <span className="text-[10px] text-slate-400 block mt-0.5">Hỗ trợ định dạng: .CSV, .TXT, .JSON, .TSV</span>
                                    </label>
                                    {fileName && (
                                        <div className="mt-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 py-1 px-2 rounded-lg border border-emerald-200">
                                            ✓ Đã chọn: {fileName}
                                        </div>
                                    )}
                                </div>

                                {/* Direct Paste Area */}
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                        Hoặc dán nội dung tệp tin trực tiếp:
                                    </label>
                                    <textarea 
                                        rows={4}
                                        value={fileText}
                                        onChange={e => { setFileText(e.target.value); parseContent(e.target.value); }}
                                        placeholder={`Tên tiêu chí 1, Mô tả chi tiết 1\nTên tiêu chí 2, Mô tả chi tiết 2\n...`}
                                        className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:border-itc-500 outline-none font-mono bg-slate-50 resize-none"
                                    />
                                </div>

                                {importError && (
                                    <div className="p-2.5 bg-rose-50 text-rose-700 text-[11px] rounded-xl border border-rose-200 font-medium">
                                        ⚠️ {importError}
                                    </div>
                                )}

                                {/* Xem trước kết quả đã phân tích */}
                                {parsedCriteria.length > 0 && (
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-700">Xem trước kết quả:</span>
                                            <span className="bg-emerald-100 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                                                {parsedCriteria.length} tiêu chí
                                            </span>
                                        </div>
                                        <div className="max-h-36 overflow-y-auto space-y-1 text-[11px]">
                                            {parsedCriteria.map((c, i) => (
                                                <div key={i} className="p-1.5 bg-white rounded border border-slate-200 truncate">
                                                    <b>{i + 1}. {c.name}</b> {c.description && <span className="text-slate-400"> — {c.description}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    disabled={parsedCriteria.length === 0 || loading}
                                    onClick={handleImportBatch}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
                                >
                                    {loading ? 'Đang nhập...' : `✅ Nhập ${parsedCriteria.length} Tiêu chí vào Hệ thống`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-6 py-2.5 rounded-xl transition"
                    >
                        Đóng cửa sổ
                    </button>
                </div>
            </div>
        </div>
    );
};
