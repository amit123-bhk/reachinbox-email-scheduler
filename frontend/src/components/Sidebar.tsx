'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { Clock, Send, ChevronDown, LogOut, User } from 'lucide-react';

interface SidebarProps {
  user: UserProfile;
  activeTab: 'scheduled' | 'sent';
  scheduledCount: number;
  sentCount: number;
  onSelectTab: (tab: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  scheduledCount,
  sentCount,
  onSelectTab,
  onOpenCompose,
  onLogout,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside className="w-64 bg-white border-r border-gray-100 min-h-screen p-5 flex flex-col justify-between shrink-0 font-sans">
      <div className="space-y-6">
        {/* Top Brand Logo */}
        <div className="px-1">
          <h1 className="text-2xl font-black tracking-tight text-gray-900 font-mono">ONG</h1>
        </div>

        {/* User Profile Card with Avatar Image & Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="bg-gray-50 border border-gray-100 rounded-2xl p-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-all select-none"
            title="Click for profile options"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Profile Avatar Image Preserved */}
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-200"
              />
              <div className="text-left min-w-0">
                <div className="text-xs font-bold text-gray-900 truncate">{user.name}</div>
                <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* Profile Dropdown Menu matching Figma */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 space-y-1">
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="text-xs font-bold text-gray-900">{user.name}</div>
                <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Primary Action: Compose Button */}
        <button
          onClick={onOpenCompose}
          className="w-full py-2 px-4 border border-[#00b050] text-[#00b050] hover:bg-[#e8f5e9] rounded-full text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
        >
          Compose
        </button>

        {/* CORE Navigation Menu */}
        <div className="space-y-1.5 pt-2">
          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            CORE
          </div>

          {/* Scheduled Nav item */}
          <button
            onClick={() => onSelectTab('scheduled')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'scheduled'
                ? 'bg-[#e8f5e9] text-[#00b050] font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4" />
              <span>Scheduled</span>
            </div>
            <span className="text-[11px] font-semibold opacity-75">{scheduledCount}</span>
          </button>

          {/* Sent Nav item */}
          <button
            onClick={() => onSelectTab('sent')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'sent'
                ? 'bg-[#e8f5e9] text-[#00b050] font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Send className="w-4 h-4" />
              <span>Sent</span>
            </div>
            <span className="text-[11px] font-semibold opacity-75">{sentCount}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
