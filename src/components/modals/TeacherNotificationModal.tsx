import React from 'react';
import { Icons } from '../ui/Icons';
import { TeacherNotification } from '../../types';

interface TeacherNotificationModalProps {
    notifications: TeacherNotification[];
    onClose: () => void;
    onMarkAllAsRead?: () => void;
}

export const TeacherNotificationModal = ({
    notifications = [],
    onClose,
    onMarkAllAsRead
}: TeacherNotificationModalProps) => {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center text-lg">
                            🔔
                        </div>
                        <div>
                            <h3 className="font-extrabold text-slate-900 text-sm">Hộp thư Thông báo Giảng viên</h3>
                            <p className="text-[11px] text-slate-500">Thông báo phân công lịch dạy & kết quả xét duyệt từ Trung tâm ITC</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
                    >
                        <Icons.Close className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">
                        Có <b>{notifications.length}</b> thông báo
                    </span>
                    {onMarkAllAsRead && notifications.some(n => !n.isRead) && (
                        <button
                            onClick={onMarkAllAsRead}
                            className="text-itc-700 hover:text-itc-900 font-bold hover:underline"
                        >
                            Đánh dấu tất cả đã đọc
                        </button>
                    )}
                </div>

                {/* Danh sách thông báo */}
                <div className="overflow-y-auto flex-1 space-y-3 pr-1">
                    {notifications.map((n) => (
                        <div 
                            key={n.id}
                            className={`p-4 rounded-2xl border transition-all space-y-1.5 ${
                                n.type === 'APPROVAL'
                                    ? 'bg-emerald-50/70 border-emerald-200'
                                    : n.type === 'REJECTION'
                                    ? 'bg-rose-50/70 border-rose-200'
                                    : n.type === 'ASSIGNMENT'
                                    ? 'bg-sky-50/70 border-sky-200'
                                    : 'bg-slate-50 border-slate-200'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                    {n.type === 'APPROVAL' && <span>✅</span>}
                                    {n.type === 'REJECTION' && <span>❌</span>}
                                    {n.type === 'ASSIGNMENT' && <span>📢</span>}
                                    {(!n.type || n.type === 'ANNOUNCEMENT') && <span>📌</span>}
                                    {n.title}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">{n.date}</span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                {n.content}
                            </p>
                            <div className="flex justify-between items-center pt-1 border-t border-slate-200/50 text-[10px] text-slate-500">
                                <span>Gửi từ: <b>{n.sender === 'ADMIN' ? 'Ban Quản Lý ITC' : 'Hệ thống ITC'}</b></span>
                                {!n.isRead && (
                                    <span className="w-2 h-2 rounded-full bg-itc-600 animate-pulse"></span>
                                )}
                            </div>
                        </div>
                    ))}

                    {notifications.length === 0 && (
                        <div className="py-12 text-center text-slate-400 text-xs">
                            <span className="text-3xl block mb-2">📭</span>
                            Hiện tại không có thông báo nào dành cho bạn.
                        </div>
                    )}
                </div>

                <div className="pt-2 text-right border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};
