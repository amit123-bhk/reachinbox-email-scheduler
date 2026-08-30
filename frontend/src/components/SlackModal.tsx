'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SlackStatus } from '../types';
import { X, Slack, Send, ShieldCheck, Link2, AlertCircle, Trash2 } from 'lucide-react';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  slackStatus: SlackStatus | null;
  onStatusUpdated: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  slackStatus,
  onStatusUpdated,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channelName, setChannelName] = useState('#reachinbox-alerts');
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnectWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTestStatus(null);
    setIsLoading(true);

    try {
      const res = await axios.post('http://localhost:4000/api/slack/connect-webhook', {
        webhookUrl,
        channelName,
      });

      if (res.data.success) {
        onStatusUpdated();
        setTestStatus('Slack Webhook connected successfully!');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect Slack Webhook');
    } fontFinally: {
      setIsLoading(false);
    }
  };

  const handleTestAlert = async () => {
    setError(null);
    setTestStatus('Dispatching live alert message to Slack...');
    setIsLoading(true);

    try {
      const res = await axios.post('http://localhost:4000/api/slack/test');
      if (res.data.success) {
        setTestStatus('Live test alert successfully delivered to Slack channel!');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Test alert delivery failed');
      setTestStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await axios.post('http://localhost:4000/api/slack/disconnect');
      onStatusUpdated();
      setTestStatus('Slack integration disconnected.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthConnect = async () => {
    try {
      const res = await axios.get('http://localhost:4000/api/slack/auth-url');
      if (res.data.authUrl) {
        window.location.href = res.data.authUrl;
      }
    } catch (err: any) {
      setError('OAuth redirect URL generation failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Slack className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-100">Slack Alert Integration</h2>
              <p className="text-xs text-gray-400">Receive live alerts when sender hourly limit is reached</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* Current Connection Status Badge */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            slackStatus?.connected
              ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
              : 'bg-amber-950/30 border-amber-800/50 text-amber-300'
          }`}>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold">
                  {slackStatus?.connected ? 'Slack Connected & Active' : 'Slack Not Connected'}
                </div>
                <div className="text-[11px] opacity-80">
                  {slackStatus?.connected
                    ? `Alerts sending to channel ${slackStatus.channel}`
                    : 'Rate limit hits will proceed silently without crashing.'}
                </div>
              </div>
            </div>

            {slackStatus?.connected && (
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs flex items-center gap-1 transition-all"
                title="Disconnect Slack"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {testStatus && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{testStatus}</span>
            </div>
          )}

          {/* Connection Options */}
          <div className="space-y-4">
            {/* Option A: Connect via Incoming Webhook */}
            <form onSubmit={handleConnectWebhook} className="space-y-3 bg-gray-950 p-4 border border-gray-800 rounded-xl">
              <div className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-blue-400" />
                Option A: Connect Slack Incoming Webhook
              </div>
              <div>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="#channel (e.g. #reachinbox-alerts)"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-1/2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-200"
                />
                <button
                  type="submit"
                  disabled={isLoading || !webhookUrl}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                >
                  Save Webhook
                </button>
              </div>
            </form>

            {/* Option B: Direct OAuth Flow */}
            <div className="p-4 border border-gray-800 rounded-xl bg-gray-950/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-gray-200">Option B: Real Slack OAuth Flow</div>
                <div className="text-[11px] text-gray-400">Authorize ReachInbox app in your Slack workspace</div>
              </div>
              <button
                type="button"
                onClick={handleOAuthConnect}
                className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-xs font-medium transition-all"
              >
                Connect OAuth
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-gray-950/50">
          <button
            type="button"
            onClick={handleTestAlert}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Test Alert to Slack</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
