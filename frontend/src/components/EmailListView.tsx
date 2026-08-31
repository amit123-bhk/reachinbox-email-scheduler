'use client';

import React from 'react';
import { ScheduledEmailItem } from '../types';
import { Search, SlidersHorizontal, RotateCw, Star, Clock } from 'lucide-react';

interface EmailListViewProps {
  emails: ScheduledEmailItem[];
  activeTab: 'scheduled' | 'sent';
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onSelectEmail: (email: ScheduledEmailItem) => void;
}

export const EmailListView: React.FC<EmailListViewProps> = ({
  emails,
  activeTab,
  isLoading,
  searchQuery,
  onSearchChange,
  onRefresh,
  onSelectEmail,
}) => {
  const formatScheduledBadge = (dateInput: string | Date | undefined) => {
    if (!dateInput) return 'Tue 9:15:12 AM';
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return 'Tue 9:15:12 AM';
      const day = d.toLocaleDateString('en-US', { weekday: 'short' });
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
      return `${day} ${time}`;
    } catch (e) {
      return 'Tue 9:15:12 AM';
    }
  };

  return (
    <div className="flex-1 bg-white p-6 space-y-6 overflow-y-auto font-sans">
      {/* Top Search Bar & Action Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-2xl">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search email, subject, or content..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#f3f4f6] border-none rounded-full pl-10 pr-4 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 text-gray-400">
          <button className="p-1.5 hover:text-gray-600 transition-all" title="Filter">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button onClick={onRefresh} className="p-1.5 hover:text-gray-600 transition-all" title="Refresh">
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Email Item Rows displaying full real email addresses */}
      <div className="space-y-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="py-3 px-4 animate-pulse flex items-center justify-between border-b border-gray-50">
              <div className="h-3 bg-gray-100 rounded w-1/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-8" />
            </div>
          ))
        ) : emails.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            No {activeTab} emails found.
          </div>
        ) : (
          emails.map((email) => {
            const isSent = activeTab === 'sent' || email.status === 'SENT';

            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email)}
                className="py-3 px-3 hover:bg-gray-50 rounded-xl cursor-pointer flex items-center justify-between gap-4 transition-all border-b border-gray-50/50"
              >
                {/* Full Real Lead Email Address */}
                <div className="w-56 shrink-0 font-semibold text-xs text-gray-900 truncate" title={email.recipientEmail}>
                  To: {email.recipientEmail}
                </div>

                {/* Status Badge & Subject + Body Snippet */}
                <div className="flex-1 flex items-center gap-2.5 truncate">
                  {isSent ? (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium shrink-0">
                      Sent
                    </span>
                  ) : (
                    <span className="bg-[#fff3e0] border border-orange-200 text-[#e65100] rounded-full px-2.5 py-0.5 text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 shadow-sm">
                      <Clock className="w-3 h-3 text-[#e65100]" />
                      <span>{formatScheduledBadge(email.scheduledForTime)}</span>
                    </span>
                  )}

                  <span className="font-semibold text-xs text-gray-900 truncate">
                    {email.subject}
                  </span>
                </div>

                {/* Star Action Icon */}
                <button className="text-gray-300 hover:text-amber-400 shrink-0 p-1" title="Star">
                  <Star className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
