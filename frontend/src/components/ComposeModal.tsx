'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sender } from '../types';
import { X, Upload, Users, Clock, Send, ShieldAlert, Sparkles, FileText } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduledSuccess: () => void;
  senders: Sender[];
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onScheduledSuccess,
  senders,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientsText, setRecipientsText] = useState('');
  const [detectedEmails, setDetectedEmails] = useState<string[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  useEffect(() => {
    if (senders && senders.length > 0 && !selectedSenderId) {
      setSelectedSenderId(senders[0].id);
    }
  }, [senders, selectedSenderId]);

  useEffect(() => {
    // Set default start time to now formatted for datetime-local
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setStartTime(now.toISOString().slice(0, 16));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post('http://localhost:4000/api/emails/parse-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        const parsed = res.data.emails as string[];
        setDetectedEmails(parsed);
        setRecipientsText(parsed.join('\n'));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to parse CSV file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualTextChange = (text: string) => {
    setRecipientsText(text);
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex) || [];
    const unique = Array.from(new Set(matches));
    setDetectedEmails(unique);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError('Please enter an email subject');
      return;
    }
    if (!body.trim()) {
      setError('Please enter email body content');
      return;
    }
    if (detectedEmails.length === 0) {
      setError('Please upload a CSV or enter at least one valid recipient email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        subject,
        body,
        recipients: detectedEmails,
        startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        delaySeconds,
        hourlyLimit,
        senderId: selectedSenderId,
      };

      const res = await axios.post('http://localhost:4000/api/emails/schedule', payload);

      if (res.data.success) {
        onScheduledSuccess();
        onClose();
        // Reset form
        setSubject('');
        setBody('');
        setRecipientsText('');
        setDetectedEmails([]);
        setUploadedFileName(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to schedule emails');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/50 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-100">Schedule Email Campaign</h2>
              <p className="text-xs text-gray-400">Prospect & dispatch personalized cold outreach at scale</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Sender Selection & Campaign Config Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sender Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Sending Account</label>
              <select
                value={selectedSenderId}
                onChange={(e) => setSelectedSenderId(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 transition-all"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email}) - Max {s.hourlyRateLimit}/hr
                  </option>
                ))}
              </select>
            </div>

            {/* Start Time Picker */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Schedule Start Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Rate Limits & Delay Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-950/60 p-4 border border-gray-800/80 rounded-xl">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Inter-Email Delay (seconds)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 2)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-gray-500 mt-1">Provider throttling safety delay</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Hourly Send Limit (emails/hr)
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 200)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-gray-500 mt-1">Triggers Slack notification on breach</p>
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email Subject</label>
            <input
              type="text"
              placeholder="e.g. Accelerate your outbound lead generation with ReachInbox AI"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email Body</label>
            <textarea
              rows={4}
              placeholder="Write your email template here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {/* Lead CSV Upload & Recipient Parsing Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-400" />
                Target Lead Emails
              </label>
              {detectedEmails.length > 0 && (
                <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full text-[11px] font-medium">
                  {detectedEmails.length} valid lead{detectedEmails.length === 1 ? '' : 's'} detected
                </span>
              )}
            </div>

            {/* CSV File Upload Dropzone */}
            <div className="relative border-2 border-dashed border-gray-800 hover:border-blue-500/50 bg-gray-950/40 hover:bg-gray-950 rounded-xl p-4 text-center transition-all">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-blue-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-xs text-gray-300 font-medium">
                  {uploadedFileName ? (
                    <span className="text-blue-400 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> {uploadedFileName}
                    </span>
                  ) : (
                    <>Click or drag CSV / Text file to upload lead list</>
                  )}
                </div>
                <p className="text-[11px] text-gray-500">Auto detects lead emails from CSV headers or raw lines</p>
              </div>
            </div>

            {/* Manual Textarea Input */}
            <textarea
              rows={3}
              placeholder="Or paste email addresses separated by commas or line breaks..."
              value={recipientsText}
              onChange={(e) => handleManualTextChange(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Scheduling Queue...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Schedule {detectedEmails.length} Email{detectedEmails.length === 1 ? '' : 's'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
