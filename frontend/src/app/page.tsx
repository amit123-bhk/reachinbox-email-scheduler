'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Sidebar } from '../components/Sidebar';
import { EmailListView } from '../components/EmailListView';
import { ComposeView } from '../components/ComposeView';
import { EmailDetailView } from '../components/EmailDetailView';
import { LoginView } from '../components/LoginView';
import { RegisterView } from '../components/RegisterView';
import { ScheduledEmailItem, Sender, UserProfile } from '../types';

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [currentView, setCurrentView] = useState<'list' | 'compose' | 'detail'>('list');
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmailItem[]>([]);
  const [sentEmails, setSentEmails] = useState<ScheduledEmailItem[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<ScheduledEmailItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load persistent user session from localStorage
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem('reachinbox_figma_user');
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed && parsed.email) {
          setUser(parsed);
        }
      }
    } catch (e) {
      console.warn('Error reading saved user session:', e);
    }
  }, []);

  const handleLogin = (loggedUser: UserProfile) => {
    setUser(loggedUser);
    try {
      localStorage.setItem('reachinbox_figma_user', JSON.stringify(loggedUser));
    } catch (e) {
      console.warn('Error saving user session:', e);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setAuthScreen('login');
    try {
      localStorage.removeItem('reachinbox_figma_user');
    } catch (e) {
      console.warn('Error clearing user session:', e);
    }
  };

  const fetchSenders = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get('http://localhost:4000/api/senders');
      if (res.data.success) {
        setSenders(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching senders:', err);
    }
  }, [user]);

  const fetchScheduled = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let url = `http://localhost:4000/api/emails/scheduled?userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email)}`;
      if (searchQuery.trim()) {
        url = `http://localhost:4000/api/emails/search?q=${encodeURIComponent(searchQuery)}&status=SCHEDULED&userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email)}`;
      }
      const res = await axios.get(url);
      if (res.data.success) {
        setScheduledEmails(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching scheduled emails:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, searchQuery]);

  const fetchSent = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let url = `http://localhost:4000/api/emails/sent?userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email)}`;
      if (searchQuery.trim()) {
        url = `http://localhost:4000/api/emails/search?q=${encodeURIComponent(searchQuery)}&status=SENT&userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email)}`;
      }
      const res = await axios.get(url);
      if (res.data.success) {
        setSentEmails(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching sent emails:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, searchQuery]);

  useEffect(() => {
    if (user) {
      fetchSenders();
      fetchScheduled();
      fetchSent();
    }
  }, [user, fetchSenders, fetchScheduled, fetchSent]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'scheduled') {
      fetchScheduled();
    } else {
      fetchSent();
    }
  }, [activeTab, fetchScheduled, fetchSent, user]);

  // If user is not logged in, show Login or Register screen
  if (!user) {
    if (authScreen === 'register') {
      return (
        <RegisterView
          onRegister={handleLogin}
          onNavigateToLogin={() => setAuthScreen('login')}
        />
      );
    }
    return (
      <LoginView
        onLogin={handleLogin}
        onNavigateToRegister={() => setAuthScreen('register')}
      />
    );
  }

  const rawEmails = activeTab === 'scheduled' ? scheduledEmails : sentEmails;
  const activeEmails = rawEmails.filter((email) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (email.recipientEmail && email.recipientEmail.toLowerCase().includes(q)) ||
      (email.subject && email.subject.toLowerCase().includes(q)) ||
      (email.body && email.body.toLowerCase().includes(q))
    );
  });

  // On Compose View: Full screen without sidebar matching Figma Image 9
  if (currentView === 'compose') {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans antialiased">
        <ComposeView
          onBack={() => setCurrentView('list')}
          onScheduledSuccess={() => {
            fetchScheduled();
            fetchSent();
          }}
          senders={senders}
          currentUser={user}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex font-sans antialiased overflow-hidden">
      {/* Left Sidebar matching Figma Image 3 */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        scheduledCount={scheduledEmails.length}
        sentCount={sentEmails.length}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setCurrentView('list');
        }}
        onOpenCompose={() => setCurrentView('compose')}
        onLogout={handleLogout}
      />

      {/* Main Right Screen Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {currentView === 'detail' && selectedEmail ? (
          <EmailDetailView
            email={selectedEmail}
            onBack={() => setCurrentView('list')}
          />
        ) : (
          <EmailListView
            emails={activeEmails}
            activeTab={activeTab}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={() => (activeTab === 'scheduled' ? fetchScheduled() : fetchSent())}
            onSelectEmail={(email) => {
              setSelectedEmail(email);
              setCurrentView('detail');
            }}
          />
        )}
      </div>
    </div>
  );
}
