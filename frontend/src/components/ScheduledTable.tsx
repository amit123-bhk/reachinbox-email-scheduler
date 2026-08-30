'use client';

import React from 'react';
import { ScheduledEmailItem } from '../types';
import { Clock, RefreshCw, AlertTriangle, CheckCircle2, User, Search } from 'lucide-react';

interface ScheduledTableProps {
  emails: ScheduledEmailItem[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  emails,
  isLoading,
  searchQuery,
  onSearchChange,
  onRefresh,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESCHEDULED_RATE_LIMIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Rate Limit Postponed
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
            Sending...
          </span>
        );
      case 'SCHEDULED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Clock className="w-3 h-3 text-cyan-400" />
            Scheduled
          </span>
        );
    }
  };

  return (
    <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl overflow-hidden shadow-xl">
      {/* Table Action Header & Search Bar */}
      <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-950/40">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search subject, lead email, sender (Elasticsearch)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 bg-gray-800/60 hover:bg-gray-800 border border-gray-700 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800/80 bg-gray-950/60 text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
              <th className="py-3 px-4">Recipient Lead</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Sender Account</th>
              <th className="py-3 px-4">Scheduled Time</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50 text-xs">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-3 bg-gray-800 rounded w-36"></div></td>
                  <td className="py-4 px-4"><div className="h-3 bg-gray-800 rounded w-48"></div></td>
                  <td className="py-4 px-4"><div className="h-3 bg-gray-800 rounded w-28"></div></td>
                  <td className="py-4 px-4"><div className="h-3 bg-gray-800 rounded w-24"></div></td>
                  <td className="py-4 px-4"><div className="h-6 bg-gray-800 rounded-full w-24"></div></td>
                </tr>
              ))
            ) : emails.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  <p className="font-medium text-sm text-gray-400">No scheduled emails in queue</p>
                  <p className="text-xs text-gray-600 mt-0.5">Click "Compose New Email" to schedule your cold outreach campaign.</p>
                </td>
              </tr>
            ) : (
              emails.map((item) => (
                <tr key={item.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-gray-200">
                    {item.recipientEmail}
                  </td>
                  <td className="py-3.5 px-4 text-gray-300 max-w-xs truncate" title={item.subject}>
                    {item.subject}
                  </td>
                  <td className="py-3.5 px-4 text-gray-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{item.sender?.name || item.senderEmail || 'Default Sender'}</span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">
                    {new Date(item.scheduledForTime).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(item.status)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
