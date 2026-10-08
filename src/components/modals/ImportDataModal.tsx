import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Icons } from '../ui/Icons';

interface ImportDataModalProps {
    type: 'TEACHER' | 'STUDENT';
    onClose: () => void;
    onSuccess: (importedItems: any[]) => void;
    existingCount?: number;
}

export const ImportDataModal = ({
    type,
    onClose,
    onSuccess,
    existingCount = 0
}: ImportDataModalProps) => {
    const isTeacher = type === 'TEACHER';
    const title = isTeacher ? 'Nhập Danh sách Giảng viên từ File' : 'Nhập Danh sách Sinh viên từ File';
    const emailDomain = isTeacher ? '@dlu.edu.vn' : '@itc.edu.vn';
    const defaultPassword = isTeacher ? 'gvitc123' : 'svitc123';
    const defaultPrefix = isTeacher ? 'GV' : 'SV';

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string>('');
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string>('');
    const [importResult, setImportResult] = useState<{ success: number; errors: any[] } | null>(null);

    // Hàm tạo email gợi ý từ họ tên
    const generateEmailFromName = (fullName: string, code: string) => {
        const clean = fullName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
        return `${clean || code.toLowerCase()}${emailDomain}`;
    };

    // Hàm tải file mẫu Excel (.xlsx)
    const handleDownloadTemplate = (format: 'xlsx' | 'csv') => {
        let headers: string[] = [];
        let sampleRows: any[][] = [];

        if (isTeacher) {
            headers = ['Họ và Tên (*)', 'Mã Giảng viên', 'Khoa / Bộ môn', 'Email / Tên đăng nhập', 'Mật khẩu'];
            sampleRows = [
                ['TS. Nguyễn Văn A', 'GV01', 'Khoa CNTT - ĐH Đà Lạt', 'tsnguyenvana', 'gvitc123'],
                ['ThS. Trần Thị B', 'GV02', 'Bộ môn Kỹ thuật Phần mềm', 'tranb', 'gvitc123'],
                ['ThS. Lê Hoàng C', '', 'Khoa CNTT - ĐH Đà Lạt', '', 'gvitc123']
            ];
        } else {
            headers = ['Họ và Tên (*)', 'Mã Sinh viên', 'Lớp học tham gia', 'Email / Tên đăng nhập', 'Mật khẩu'];
            sampleRows = [
                ['Nguyễn Văn An', 'SV01', 'ITC_01_24', 'annguyen', 'svitc123'],
                ['Trần Thị Bình', 'SV02', 'ITC_01_24, ITC_02_24', 'binhtran', 'svitc123'],
                ['Lê Văn Cường', '', 'ITC_02_24', '', 'svitc123']
            ];
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
        // Set column widths
        ws['!cols'] = [
            { wch: 25 },
            { wch: 16 },
            { wch: 28 },
            { wch: 26 },
            { wch: 16 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, isTeacher ? 'Giảng viên' : 'Sinh viên');

        const outName = isTeacher 
            ? `Mau_Nhap_Giang_Vien_ITC.${format}` 
            : `Mau_Nhap_Sinh_Vien_ITC.${format}`;
        
        XLSX.writeFile(wb, outName, { bookType: format });
    };

    // Xử lý đọc file khi người dùng chọn
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');
        setImportResult(null);
        setFileName(file.name);
        setIsParsing(true);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (rawRows.length < 2) {
                    throw new Error('File không chứa dòng dữ liệu nào sau dòng tiêu đề.');
                }

                // Tìm vị trí cột tương ứng
                const headerRow: string[] = rawRows[0].map((h: any) => String(h || '').trim().toLowerCase());
                
                const findColIdx = (aliases: string[]) => {
                    return headerRow.findIndex(h => aliases.some(alias => h.includes(alias)));
                };

                const nameIdx = findColIdx(['họ', 'tên', 'name', 'giảng viên', 'sinh viên']);
                const codeIdx = findColIdx(['mã', 'code', 'id']);
                const deptIdx = findColIdx(['khoa', 'bộ môn', 'dept', 'department']);
                const classIdx = findColIdx(['lớp', 'class', 'khóa']);
                const emailIdx = findColIdx(['email', 'tài khoản', 'đăng nhập', 'username']);
                const passIdx = findColIdx(['mật khẩu', 'password', 'pass']);

                if (nameIdx === -1) {
                    throw new Error('Không tìm thấy cột "Họ và Tên" trong file. Vui lòng tải file mẫu để kiểm tra.');
                }

                const parsedList: any[] = [];
                let runningIndex = existingCount + 1;

                for (let i = 1; i < rawRows.length; i++) {
                    const row = rawRows[i];
                    if (!row || row.length === 0) continue;

                    const rawName = String(row[nameIdx] || '').trim();
                    if (!rawName) continue; // Bỏ qua dòng trống tên

                    let rawCode = codeIdx >= 0 && row[codeIdx] ? String(row[codeIdx]).trim().toUpperCase() : '';
                    if (!rawCode) {
                        rawCode = `${defaultPrefix}${runningIndex < 10 ? '0' + runningIndex : runningIndex}`;
                    }

                    let rawEmail = emailIdx >= 0 && row[emailIdx] ? String(row[emailIdx]).trim().toLowerCase() : '';
                    if (rawEmail) {
                        if (!rawEmail.includes('@')) {
                            rawEmail = `${rawEmail}${emailDomain}`;
                        } else if (!rawEmail.endsWith(emailDomain)) {
                            rawEmail = `${rawEmail.split('@')[0]}${emailDomain}`;
                        }
                    } else {
                        rawEmail = generateEmailFromName(rawName, rawCode);
                    }

                    const rawPass = passIdx >= 0 && row[passIdx] ? String(row[passIdx]).trim() : defaultPassword;
                    const rawDept = deptIdx >= 0 && row[deptIdx] ? String(row[deptIdx]).trim() : 'Khoa CNTT - ĐH Đà Lạt';
                    const rawClassStr = classIdx >= 0 && row[classIdx] ? String(row[classIdx]).trim() : '';
                    const classCodes = rawClassStr ? rawClassStr.split(/[,;\s]+/).filter(Boolean) : [];

                    parsedList.push({
                        name: rawName,
                        code: rawCode,
                        email: rawEmail,
                        password: rawPass || defaultPassword,
                        dept: rawDept,
                        classCodes,
                        classCode: classCodes[0] || ''
                    });

                    runningIndex++;
                }

                if (parsedList.length === 0) {
                    throw new Error('Không tìm thấy bản ghi hợp lệ nào trong file.');
                }

                setParsedData(parsedList);
            } catch (err: any) {
                setError(err.message || 'Lỗi khi đọc file');
                setParsedData([]);
            } finally {
                setIsParsing(false);
            }
        };

        reader.onerror = () => {
            setError('Không thể đọc file. Vui lòng thử lại.');
            setIsParsing(false);
        };

        reader.readAsArrayBuffer(file);
    };

    // Xóa một hàng trong danh sách preview
    const handleRemoveRow = (index: number) => {
        setParsedData(prev => prev.filter((_, i) => i !== index));
    };

    // Tiến hành Import lên Server
    const handleImportSubmit = async () => {
        if (parsedData.length === 0) return;

        setIsLoading(true);
        setError('');
        setImportResult(null);

        try {
            const endpoint = isTeacher ? '/api/auth/import-teachers' : '/api/auth/import-students';
            const payload = isTeacher ? { teachers: parsedData } : { students: parsedData };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Lỗi khi nhập dữ liệu');
            }

            const createdItems = isTeacher ? data.teachers : data.students;
            setImportResult({
                success: data.createdCount || createdItems.length,
                errors: data.errors || []
            });

            if (createdItems && createdItems.length > 0) {
                onSuccess(createdItems);
            }
        } catch (err: any) {
            setError(err.message || 'Lỗi khi nhập dữ liệu');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-itc-800 to-itc-900 p-5 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl">
                            {isTeacher ? '👨‍🏫' : '🎓'}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{title}</h3>
                            <p className="text-xs text-itc-100">
                                Hỗ trợ file Excel (.xlsx, .xls) và .csv. Tự động sinh mã {defaultPrefix}, gán email {emailDomain} và mật khẩu {defaultPassword}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                    >
                        <Icons.Plus className="w-5 h-5 rotate-45" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
                    {/* Error notification */}
                    {error && (
                        <div className="p-4 bg-rose-50 text-rose-700 text-xs font-bold rounded-2xl border border-rose-200 flex items-center gap-2">
                            <Icons.AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Result notification */}
                    {importResult && (
                        <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-2xl border border-emerald-200 flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <Icons.CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                                <span className="text-sm">
                                    Thành công! Đã tạo mới <b>{importResult.success}</b> tài khoản {isTeacher ? 'giảng viên' : 'sinh viên'} vào hệ thống.
                                </span>
                            </div>
                            {importResult.errors && importResult.errors.length > 0 && (
                                <p className="text-amber-700 text-[11px] pl-7">
                                    (Lưu ý: Có {importResult.errors.length} dòng bị bỏ qua hoặc đã tồn tại email/mã).
                                </p>
                            )}
                        </div>
                    )}

                    {/* Upload & Template Bar */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h4 className="font-bold text-sm text-slate-800">1. Chuẩn bị File Dữ liệu</h4>
                                <p className="text-xs text-slate-500">Tải file mẫu để điền theo đúng định dạng được tối ưu:</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleDownloadTemplate('xlsx')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-2xs flex items-center gap-1.5"
                                >
                                    📥 Tải File Mẫu Excel (.xlsx)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDownloadTemplate('csv')}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition border border-slate-200 flex items-center gap-1"
                                >
                                    Tải Mẫu .CSV
                                </button>
                            </div>
                        </div>

                        {/* Drag and Drop Zone */}
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 hover:border-itc-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/60 hover:bg-itc-50/30 transition group"
                        >
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept=".xlsx, .xls, .csv" 
                                onChange={handleFileChange}
                                className="hidden" 
                            />
                            <div className="w-12 h-12 rounded-2xl bg-itc-100 text-itc-800 flex items-center justify-center mx-auto mb-2 text-2xl group-hover:scale-110 transition-transform">
                                📁
                            </div>
                            <p className="font-bold text-sm text-slate-700 group-hover:text-itc-800 transition">
                                {fileName ? `Đã chọn: ${fileName}` : 'Bấm vào đây để chọn file Excel / CSV hoặc kéo thả vào đây'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                Chấp nhận định dạng .xlsx, .xls, .csv (tối đa 500 người mỗi lần nhập)
                            </p>
                        </div>
                    </div>

                    {/* Preview Table */}
                    {parsedData.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-3 p-5">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                        <span>2. Xem trước Dữ liệu Đã Đọc</span>
                                        <span className="bg-itc-50 text-itc-800 text-xs font-bold px-2.5 py-0.5 rounded-lg border border-itc-200">
                                            {parsedData.length} người hợp lệ
                                        </span>
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                        Kiểm tra lại danh sách trước khi xác nhận lưu vào hệ thống
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setParsedData([]);
                                        setFileName('');
                                    }}
                                    className="text-xs font-bold text-slate-500 hover:text-rose-600 transition"
                                >
                                    Xóa danh sách này
                                </button>
                            </div>

                            <div className="max-h-72 overflow-y-auto border border-slate-100 rounded-xl">
                                <table className="w-full text-left text-xs text-slate-600">
                                    <thead className="bg-slate-50 text-slate-700 uppercase font-bold sticky top-0 border-b border-slate-200 text-[10px]">
                                        <tr>
                                            <th className="p-3 w-12 text-center">STT</th>
                                            <th className="p-3">Họ và Tên</th>
                                            <th className="p-3">Mã {defaultPrefix}</th>
                                            <th className="p-3">Email Đăng nhập</th>
                                            <th className="p-3">Mật khẩu</th>
                                            <th className="p-3">{isTeacher ? 'Khoa / Bộ môn' : 'Lớp tham gia'}</th>
                                            <th className="p-3 w-10 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {parsedData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/80 transition">
                                                <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                                                <td className="p-3 font-bold text-slate-800">{row.name}</td>
                                                <td className="p-3">
                                                    <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md border border-slate-200">
                                                        {row.code}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-itc-900 font-medium">{row.email}</td>
                                                <td className="p-3 font-mono text-slate-500">{row.password}</td>
                                                <td className="p-3 text-slate-600">
                                                    {isTeacher 
                                                        ? (row.dept || 'Khoa CNTT') 
                                                        : (row.classCodes.length > 0 ? row.classCodes.join(', ') : 'Chưa xếp lớp')}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveRow(idx)}
                                                        className="text-slate-400 hover:text-rose-600 transition"
                                                        title="Bỏ dòng này"
                                                    >
                                                        <Icons.Trash className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 shrink-0">
                    <p className="text-xs text-slate-400 italic">
                        * Mọi tài khoản sau khi nhập sẽ được cấp quyền đăng nhập ngay lập tức.
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-5 py-2.5 rounded-xl transition border border-slate-200"
                        >
                            Hủy bỏ
                        </button>

                        <button
                            type="button"
                            disabled={parsedData.length === 0 || isLoading || isParsing}
                            onClick={handleImportSubmit}
                            className="bg-itc-800 hover:bg-itc-900 disabled:opacity-50 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-md flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Icons.Loader className="w-4 h-4 animate-spin" /> Đang tạo tài khoản...
                                </>
                            ) : (
                                <>
                                    <Icons.CheckCircle className="w-4 h-4" /> 
                                    Xác nhận Nhập {parsedData.length > 0 ? `(${parsedData.length} ${isTeacher ? 'Giảng viên' : 'Sinh viên'})` : ''}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
