'use client';

import React from 'react';
import { ScheduledEmailItem } from '../types';
import { ArrowLeft, Star, Archive, Trash2, ExternalLink } from 'lucide-react';

interface EmailDetailViewProps {
  email: ScheduledEmailItem;
  onBack: () => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({ email, onBack }) => {
  const senderName = email.sender?.name || email.senderName || 'ReachInbox Outreach';
  const senderEmail = email.sender?.email || email.senderEmail || 'alex.johnson@outbox.ai';
  const displayTime = email.sentAt
    ? new Date(email.sentAt).toLocaleString()
    : new Date(email.scheduledForTime).toLocaleString();

  return (
    <div className="flex-1 bg-white p-6 space-y-6 overflow-y-auto">
      {/* Top Navigation & Actions Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 text-sm font-semibold text-gray-900">
          <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-lg transition-all text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span>{email.subject}</span>
        </div>

        <div className="flex items-center gap-3 text-gray-400">
          <button className="p-1.5 hover:text-amber-400" title="Star"><Star className="w-4 h-4" /></button>
          <button className="p-1.5 hover:text-gray-600" title="Archive"><Archive className="w-4 h-4" /></button>
          <button className="p-1.5 hover:text-rose-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Sender Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#00b050] text-white font-bold flex items-center justify-center text-sm">
            {senderName[0].toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              {senderName}
              <span className="text-gray-400 font-normal">&lt;{senderEmail}&gt;</span>
            </div>
            <div className="text-[11px] text-gray-400">
              to <span className="font-medium text-gray-600">{email.recipientEmail}</span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-gray-400 font-medium">
          {displayTime}
        </div>
      </div>

      {/* Dynamic Email Body Content */}
      <div className="space-y-4 text-xs text-gray-800 leading-relaxed pt-2 whitespace-pre-wrap">
        {email.body}
      </div>

      {/* Ethereal Real Preview Link Button */}
      {email.etherealPreviewUrl && (
        <div className="pt-4 border-t border-gray-100">
          <div className="text-[11px] text-gray-400 mb-2 font-medium">Fake SMTP Test Mail Preview:</div>
          <a
            href={email.etherealPreviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#00b050] border border-emerald-200 rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            <span>View Rendered HTML in Ethereal Email</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
};
