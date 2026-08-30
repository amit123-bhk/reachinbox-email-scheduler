'use client';

import React from 'react';
import { UserProfile, SlackStatus } from '../types';
import { Mail, Plus, Slack, Activity, LogOut, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  user: UserProfile | null;
  slackStatus: SlackStatus | null;
  onLogout: () => void;
  onOpenCompose: () => void;
  onOpenSlackModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  slackStatus,
  onLogout,
  onOpenCompose,
  onOpenSlackModal,
}) => {
  return (
    <header className="bg-gray-900/90 backdrop-blur border-b border-gray-800 sticky top-0 z-40 px-6 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-gray-950 rounded-[10px] flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight">
                ReachInbox
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                Scheduler Pro
              </span>
            </div>
            <p className="text-xs text-gray-400">Outbox Labs AI Lead Outbound Engine</p>
          </div>
        </div>

        {/* Header Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Slack Connection Button */}
          <button
            onClick={onOpenSlackModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              slackStatus?.connected
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50 hover:bg-emerald-900/50'
                : 'bg-gray-800/60 text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white'
            }`}
            title="Slack Notification Integration"
          >
            <Slack className="w-4 h-4 text-emerald-400" />
            <span>{slackStatus?.connected ? 'Slack Alerts Active' : 'Connect Slack'}</span>
            {slackStatus?.connected && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />}
          </button>

          {/* BullBoard Live Dashboard Link */}
          <a
            href="http://localhost:4000/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800/60 text-gray-300 border border-gray-700 hover:bg-gray-800 hover:text-white transition-all"
            title="Live BullMQ Queue Monitor"
          >
            <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>BullMQ Queues</span>
          </a>

          {/* Primary Action: Compose New Email */}
          <button
            onClick={onOpenCompose}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Compose New Email</span>
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-gray-800">
              <img
                src={user.avatar || 'https://lh3.googleusercontent.com/a/default-user'}
                alt={user.name}
                className="w-9 h-9 rounded-full border border-blue-500/30 object-cover"
              />
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-gray-200">{user.name}</div>
                <div className="text-[11px] text-gray-400 max-w-[140px] truncate">{user.email}</div>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
