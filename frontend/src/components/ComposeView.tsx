'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Sender, UserProfile } from '../types';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Calendar,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link2,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  X,
  UploadCloud,
  ChevronDown,
} from 'lucide-react';

interface ComposeViewProps {
  onBack: () => void;
  onScheduledSuccess: () => void;
  senders: Sender[];
  currentUser: UserProfile | null;
}

interface AttachmentFile {
  id: string;
  name: string;
  size: string;
  type: string;
  previewUrl?: string;
  fileObj: File;
}

export const ComposeView: React.FC<ComposeViewProps> = ({
  onBack,
  onScheduledSuccess,
  senders,
  currentUser,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [detectedEmails, setDetectedEmails] = useState<string[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [delaySeconds, setDelaySeconds] = useState<number | ''>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number | ''>(200);
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSendLaterOpen, setIsSendLaterOpen] = useState(false);
  const [showAllPills, setShowAllPills] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingList, setIsUploadingList] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  const fileAttachmentRef = useRef<HTMLInputElement>(null);
  const listInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Combine backend senders with current logged-in user email
  const allSenders: Sender[] = React.useMemo(() => {
    const list = [...senders];
    if (currentUser?.email && !list.some((s) => s.email === currentUser.email)) {
      list.unshift({
        id: currentUser.id || `usr_sender_${Date.now()}`,
        name: currentUser.name || currentUser.email.split('@')[0],
        email: currentUser.email,
        hourlyRateLimit: 200,
      });
    }
    return list;
  }, [senders, currentUser]);

  useEffect(() => {
    if (allSenders && allSenders.length > 0 && !selectedSenderId) {
      setSelectedSenderId(allSenders[0].id);
    }
  }, [allSenders, selectedSenderId]);

  // Execute Rich Text Formatting Commands
  const handleFormat = (command: string, value: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setBody(editorRef.current.innerHTML);
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Enter the link URL:', 'https://');
    if (url) {
      handleFormat('createLink', url);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedInput(val);

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = val.match(emailRegex) || [];
    if (matches.length > 0 && (val.includes(',') || val.includes(' ') || val.includes(';'))) {
      const uniqueNew = matches.map((m) => m.trim().toLowerCase()).filter((m) => !detectedEmails.includes(m));
      if (uniqueNew.length > 0) {
        setDetectedEmails((prev) => [...prev, ...uniqueNew]);
        setTypedInput('');
      }
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleaned = typedInput.trim().toLowerCase().replace(/[,;]/g, '');
      if (cleaned && emailRegex.test(cleaned) && !detectedEmails.includes(cleaned)) {
        setDetectedEmails((prev) => [...prev, cleaned]);
        setTypedInput('');
      } else if (cleaned && !emailRegex.test(cleaned)) {
        toast.error('Please enter a valid email address');
      }
    }
  };

  const removeEmailPill = (emailToRemove: string) => {
    setDetectedEmails((prev) => prev.filter((e) => e !== emailToRemove));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUploadListSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingList(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      let res;
      try {
        res = await axios.post('http://localhost:4000/api/emails/parse-lead-list', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } catch (apiErr) {
        res = await axios.post('http://localhost:4000/api/emails/parse-csv', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (res.data && res.data.success) {
        const parsed = (res.data.emails || []) as string[];
        if (parsed.length === 0) {
          toast.error(`No valid email addresses detected in ${file.name}`);
        } else {
          setDetectedEmails((prev) => Array.from(new Set([...prev, ...parsed])));
          toast.success(`Extracted ${parsed.length} lead emails from ${file.name}`, { icon: '📧' });
        }
      } else {
        throw new Error(res.data?.error || 'Failed to parse lead list file');
      }
    } catch (err: any) {
      // Client-side text parsing fallback
      try {
        const text = await file.text();
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = text.match(emailRegex) || [];
        const uniqueEmails = Array.from(new Set(matches.map((m) => m.toLowerCase())));

        if (uniqueEmails.length > 0) {
          setDetectedEmails((prev) => Array.from(new Set([...prev, ...uniqueEmails])));
          toast.success(`Extracted ${uniqueEmails.length} lead emails from ${file.name}`, { icon: '📧' });
        } else {
          toast.error(`No valid email addresses detected in ${file.name}`);
        }
      } catch (clientErr) {
        toast.error(err.response?.data?.error || 'Failed to parse lead list file');
      }
    } finally {
      setIsUploadingList(false);
      if (listInputRef.current) {
        listInputRef.current.value = '';
      }
    }
  };

  const handleFileAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith('image/');

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setAttachments((prev) => [
            ...prev,
            {
              id: `att_${Date.now()}_${Math.random()}`,
              name: file.name,
              size: formatFileSize(file.size),
              type: file.type,
              previewUrl: dataUrl,
              fileObj: file,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachments((prev) => [
          ...prev,
          {
            id: `att_${Date.now()}_${Math.random()}`,
            name: file.name,
            size: formatFileSize(file.size),
            type: file.type,
            fileObj: file,
          },
        ]);
      }
    }

    toast.success(`Attached ${files.length} file(s)`, { icon: '📎' });
    if (fileAttachmentRef.current) {
      fileAttachmentRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const setPresetTime = (timeStr: string) => {
    const target = new Date();
    if (timeStr === 'tomorrow') {
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0);
    } else if (timeStr === '10am') {
      target.setDate(target.getDate() + 1);
      target.setHours(10, 0, 0, 0);
    } else if (timeStr === '11am') {
      target.setDate(target.getDate() + 1);
      target.setHours(11, 0, 0, 0);
    } else if (timeStr === '3pm') {
      target.setDate(target.getDate() + 1);
      target.setHours(15, 0, 0, 0);
    }
    setScheduledTime(target.toISOString().slice(0, 16));
  };

  const handleSend = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let finalRecipients = [...detectedEmails];
    if (typedInput.trim() && emailRegex.test(typedInput.trim()) && !finalRecipients.includes(typedInput.trim())) {
      finalRecipients.push(typedInput.trim().toLowerCase());
    }

    const currentContent = editorRef.current ? editorRef.current.innerHTML : body;

    if (!subject.trim()) {
      toast.error('Please enter a subject line');
      return;
    }
    if (!currentContent.trim() || currentContent.trim() === '<br>') {
      toast.error('Please enter email body content');
      return;
    }
    if (finalRecipients.length === 0) {
      toast.error('Please enter or upload at least one lead email address in the To field');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedSender = allSenders.find((s) => s.id === selectedSenderId);
      const activeSenderEmail = selectedSender?.email || currentUser?.email || 'alex@reachinbox.ai';
      const activeSenderName = selectedSender?.name || currentUser?.name || 'Sender';

      const payload = {
        subject,
        body: currentContent,
        recipients: finalRecipients,
        startTime: scheduledTime ? new Date(scheduledTime).toISOString() : new Date().toISOString(),
        delaySeconds: Number(delaySeconds) || 2,
        hourlyLimit: Number(hourlyLimit) || 200,
        senderId: selectedSenderId,
        senderEmail: activeSenderEmail,
        senderName: activeSenderName,
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        attachments: attachments.map((a) => ({
          name: a.name,
          size: a.size,
          type: a.type,
          previewUrl: a.previewUrl,
        })),
      };

      const res = await axios.post('http://localhost:4000/api/emails/schedule', payload);
      if (res.data.success) {
        const msg = res.data.message || `Successfully scheduled ${finalRecipients.length} emails!`;
        toast.success(msg, { icon: '🚀' });
        onScheduledSuccess();
        onBack();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send emails');
    } finally {
      setIsSubmitting(false);
    }
  };

  const visiblePills = showAllPills ? detectedEmails : detectedEmails.slice(0, 3);
  const hiddenCount = detectedEmails.length - visiblePills.length;

  return (
    <div className="w-full flex-1 bg-white text-gray-900 flex flex-col font-sans p-8 space-y-6 relative overflow-y-auto min-h-screen">
      <input
        type="file"
        ref={listInputRef}
        accept=".csv,.xlsx,.xls,.txt"
        onChange={handleUploadListSelect}
        className="hidden"
      />

      <input
        type="file"
        ref={fileAttachmentRef}
        accept="*"
        multiple
        onChange={handleFileAttachmentSelect}
        className="hidden"
      />

      {/* Header matching Figma Screenshot */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 w-full">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-lg text-gray-700 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Compose New Email</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileAttachmentRef.current?.click()}
            className="text-gray-400 hover:text-gray-600 transition-all p-1 relative"
            title="Attach Files"
          >
            <Paperclip className="w-5 h-5" />
            {attachments.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#00b050] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow">
                {attachments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsSendLaterOpen(!isSendLaterOpen)}
            className={`transition-all p-1 rounded-lg ${
              isSendLaterOpen ? 'text-[#00b050] bg-emerald-50' : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Send Later Options"
          >
            <Clock className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSubmitting}
            className="px-6 py-1.5 border border-[#00b050] text-[#00b050] hover:bg-[#e8f5e9] rounded-full text-xs font-semibold transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Form Fields Container spanning 100% full width */}
      <div className="space-y-4 text-xs w-full">
        {/* From Field */}
        <div className="flex items-center gap-6">
          <span className="w-16 font-semibold text-gray-500">From</span>
          <div className="relative">
            <select
              value={selectedSenderId}
              onChange={(e) => setSelectedSenderId(e.target.value)}
              className="bg-[#f3f4f6] border-none rounded-xl px-4 py-2 pr-8 text-xs text-gray-800 font-semibold focus:outline-none cursor-pointer appearance-none"
            >
              {allSenders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.email}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* To Field matching Figma recipient@example.com */}
        <div className="flex items-start gap-6 pb-2 border-b border-gray-100 w-full">
          <span className="w-16 font-semibold text-gray-500 pt-1.5">To</span>
          <div className="flex-1 flex flex-wrap items-center gap-2 min-h-[32px]">
            {visiblePills.map((email) => (
              <span
                key={email}
                className="bg-[#e8f5e9] border border-emerald-300 text-[#00b050] rounded-full px-3 py-0.5 text-xs font-medium flex items-center gap-1.5 animate-in fade-in"
              >
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => removeEmailPill(email)}
                  className="hover:text-emerald-800 text-emerald-600 rounded-full p-0.5 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllPills(!showAllPills)}
                className="bg-emerald-100 text-[#00b050] hover:bg-emerald-200 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all"
              >
                {showAllPills ? 'Show Less' : `+${hiddenCount}`}
              </button>
            )}

            <input
              type="text"
              placeholder={detectedEmails.length === 0 ? "recipient@example.com" : "Add more..."}
              value={typedInput}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              className="flex-1 border-none focus:outline-none text-xs text-gray-800 placeholder-gray-400 bg-transparent min-w-[200px]"
            />

            <button
              type="button"
              onClick={() => listInputRef.current?.click()}
              disabled={isUploadingList}
              className="text-[#00b050] hover:text-[#009944] font-semibold text-xs transition-all shrink-0 px-3 py-1 bg-[#e8f5e9] hover:bg-[#dcedc8] rounded-full flex items-center gap-1.5 border border-emerald-200 shadow-sm"
              title="Upload Lead List (.csv, .xlsx, .xls, .txt)"
            >
              <UploadCloud className={`w-3.5 h-3.5 ${isUploadingList ? 'animate-bounce' : ''}`} />
              <span>{isUploadingList ? 'Parsing...' : '↑ Upload List'}</span>
            </button>
          </div>
        </div>

        {/* Subject Field */}
        <div className="flex items-center gap-6 pb-2 border-b border-gray-100 w-full">
          <span className="w-16 font-semibold text-gray-500">Subject</span>
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 border-none focus:outline-none text-xs text-gray-800 placeholder-gray-400 bg-transparent"
          />
        </div>

        {/* Delay and Hourly Limit side-by-side matching Figma Image */}
        <div className="flex items-center gap-6 pt-1">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-500">Delay between 2 emails</span>
            <input
              type="text"
              placeholder="00"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
              className="w-16 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-center text-xs text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium shadow-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-500">Hourly Limit</span>
            <input
              type="text"
              placeholder="00"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
              className="w-16 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-center text-xs text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Fully Functional Rich Text Editor Main Container */}
      <div className="bg-[#f9fafb] rounded-2xl p-6 border border-gray-100 space-y-4 shadow-sm flex-1 flex flex-col min-h-[400px] w-full">
        {/* Interactive Rich Text Toolbar matching Figma layout */}
        <div className="flex items-center gap-3 text-gray-400 border-b border-gray-200/60 pb-3 flex-wrap text-xs select-none">
          <button type="button" onClick={() => handleFormat('undo')} className="hover:text-gray-800 transition-all p-1 hover:bg-gray-200/60 rounded" title="Undo"><Undo className="w-4 h-4" /></button>
          <button type="button" onClick={() => handleFormat('redo')} className="hover:text-gray-800 transition-all p-1 hover:bg-gray-200/60 rounded" title="Redo"><Redo className="w-4 h-4" /></button>
          <span className="text-gray-300">|</span>
          <button type="button" onClick={() => handleFormat('bold')} className="hover:text-gray-800 transition-all p-1 font-bold hover:bg-gray-200/60 rounded" title="Bold"><Bold className="w-4 h-4" /></button>
          <button type="button" onClick={() => handleFormat('italic')} className="hover:text-gray-800 transition-all p-1 hover:bg-gray-200/60 rounded" title="Italic"><Italic className="w-4 h-4" /></button>
          <button type="button" onClick={() => handleFormat('underline')} className="hover:text-gray-800 transition-all p-1 hover:bg-gray-200/60 rounded" title="Underline"><Underline className="w-4 h-4" /></button>
          <span className="text-gray-300">|</span>
          <button type="button" onClick={() => handleFormat('justifyLeft')} className="hover:text-gray-800 transition-all p-1 hover:bg-gray-200/60 rounded" title="Align Left"><AlignLeft className="w-4 h-4" /></button>
          <button type="button" onClick={() => handleFormat('justifyCenter')} className="hover:text-gray-800 transition-all p-1 hover:bg-gray-200/60 rounded" title="Align Center"><AlignCenter className="w-4 h-4" /></button>
          <button type="button" onClick={() => handleFormat('justifyRight')} className="hover:text-gray-800 transition-all p-1 hover:bg-gray-200/60 rounded" title="Align Right"><AlignRight className="w-4 h-4" /></button>
          <span className="text-gray-300">|</span>
          <button type="button" onClick={() => handleFormat('insertOrderedList')} className="hover:text-gray-800 transition-all p-1 hover:bg-gray-200/60 rounded" title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
          <button type="button" onClick={() => handleFormat('insertUnorderedList')} className="hover:text-gray-800 transition-all p-1 hover:bg-gray-200/60 rounded" title="Bullet List"><List className="w-4 h-4" /></button>
          <button type="button" onClick={() => handleFormat('formatBlock', 'blockquote')} className="hover:text-gray-800 transition-all p-1 hover:bg-gray-200/60 rounded" title="Quote"><Quote className="w-4 h-4" /></button>
          <button type="button" onClick={handleInsertLink} className="hover:text-gray-800 transition-all p-1 hover:bg-gray-200/60 rounded" title="Link"><Link2 className="w-4 h-4" /></button>
          <button type="button" onClick={() => fileAttachmentRef.current?.click()} className="hover:text-gray-800 transition-all p-1 hover:bg-gray-200/60 rounded" title="Insert Image / Photo"><ImageIcon className="w-4 h-4" /></button>
        </div>

        {/* ContentEditable Interactive Text Area */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => {
            if (editorRef.current) {
              setBody(editorRef.current.innerHTML);
            }
          }}
          data-placeholder="Type Your Reply..."
          className="w-full flex-1 bg-transparent border-none focus:outline-none text-xs text-gray-800 font-sans leading-relaxed min-h-[300px] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
        />
      </div>

      {/* Attachments Section matching Figma Screenshot Thumbnail Cards */}
      {attachments.length > 0 && (
        <div className="pt-2 w-full space-y-2">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Attached Photos / Files ({attachments.length}):
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm group hover:shadow-md transition-all bg-gray-50"
              >
                {att.previewUrl ? (
                  <img
                    src={att.previewUrl}
                    alt={att.name}
                    className="w-48 h-32 object-cover block"
                  />
                ) : (
                  <div className="w-48 h-32 bg-emerald-50 text-[#00b050] font-bold flex flex-col items-center justify-center gap-1 p-3 text-center">
                    <span className="text-xs font-bold uppercase truncate max-w-[170px]" title={att.name}>
                      {att.name}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">{att.size}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-all opacity-80 hover:opacity-100 backdrop-blur-sm"
                  title="Remove Attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exact Figma Send Later Popover Drawer matching Screenshot */}
      {isSendLaterOpen && (
        <div className="absolute right-8 top-16 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-80 z-30 space-y-5 font-sans animate-in fade-in">
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">Send Later</h3>

          {/* Date Pick Input */}
          <div className="relative">
            <input
              type="datetime-local"
              placeholder="Pick date & time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full border-b border-gray-200 pb-2 text-xs text-gray-800 focus:outline-none focus:border-emerald-500 font-medium placeholder-gray-400 bg-transparent pr-6"
            />
            <Calendar className="w-4 h-4 text-gray-400 absolute right-0 top-0.5 pointer-events-none" />
          </div>

          {/* Presets List */}
          <div className="space-y-2.5 text-xs text-gray-600 font-medium pt-1">
            <button
              type="button"
              onClick={() => setPresetTime('tomorrow')}
              className="w-full text-left hover:text-emerald-600 transition-all py-1"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setPresetTime('10am')}
              className="w-full text-left hover:text-emerald-600 transition-all py-1"
            >
              Tomorrow, 10:00 AM
            </button>
            <button
              type="button"
              onClick={() => setPresetTime('11am')}
              className="w-full text-left hover:text-emerald-600 transition-all py-1"
            >
              Tomorrow, 11:00 AM
            </button>
            <button
              type="button"
              onClick={() => setPresetTime('3pm')}
              className="w-full text-left hover:text-emerald-600 transition-all py-1"
            >
              Tomorrow, 3:00 PM
            </button>
          </div>

          {/* Actions matching Cancel (text) and Done (green pill) */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsSendLaterOpen(false)}
              className="text-xs font-semibold text-gray-700 hover:text-gray-900 px-3 py-1.5 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSendLaterOpen(false);
                handleSend();
              }}
              disabled={isSubmitting}
              className="px-6 py-1.5 border border-[#00b050] text-[#00b050] hover:bg-[#e8f5e9] rounded-full text-xs font-semibold transition-all disabled:opacity-50"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
