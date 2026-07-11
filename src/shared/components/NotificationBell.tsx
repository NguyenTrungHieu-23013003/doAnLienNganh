'use client';

import React, { useState, useEffect, useRef } from 'react';
import { formatLocalDate } from '@/lib/utils';
import { useTranslation } from "react-i18next";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell({ userId }: { userId: string }) {
    const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = React.useCallback(async () => {
    try {
      // Để tránh Next.js Client Cache hoặc Browser Cache lưu lại request GET,
      // ta thêm param thời gian (t) luôn thay đổi và headers chống lưu cache.
      const res = await fetch(`/api/notifications?userId=${userId}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) setNotifications(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
    
    // Polling: Auto refresh every 4 seconds to catch new notifications
    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 4000);
    
    // Listen for custom notification triggers within the same tab if any component dispatches it
    const handleCustomTrigger = () => {
      fetchNotifications();
    };
    window.addEventListener('refresh-notifications', handleCustomTrigger);
    
    return () => { 
      clearInterval(intervalId);
      window.removeEventListener('refresh-notifications', handleCustomTrigger);
    };
  }, [userId, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0a0a0a]"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold text-white">{t("Notifications")}</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-sm">{t("No notifications")}</div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  onClick={() => markAsRead(notif.id, notif.isRead)}
                  className={`p-4 border-b border-zinc-800/50 cursor-pointer transition-colors ${notif.isRead ? 'opacity-60 hover:bg-zinc-800/30' : 'bg-zinc-800/80 hover:bg-zinc-700/80'}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-medium text-white">{notif.title}</p>
                    {!notif.isRead && <span className="w-2 h-2 bg-red-500 rounded-full mt-1 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{notif.message}</p>
                  <p className="text-[10px] text-zinc-500 mt-2" suppressHydrationWarning>{formatLocalDate(notif.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
