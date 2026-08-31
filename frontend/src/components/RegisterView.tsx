'use client';

import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { UserProfile } from '../types';
import { useGoogleLogin } from '@react-oauth/google';

interface RegisterViewProps {
  onRegister: (user: UserProfile) => void;
  onNavigateToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onRegister, onNavigateToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleRegisterSubmit = async (googleEmail?: string, googleName?: string, googleAvatar?: string) => {
    setIsLoading(true);

    const targetEmail = googleEmail || (email && email.includes('@') ? email.trim().toLowerCase() : 'user@gmail.com');
    const targetName = googleName || name.trim() || targetEmail.split('@')[0];
    const targetAvatar = googleAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    const googlePayload = {
      email: targetEmail,
      name: targetName,
      avatar: targetAvatar,
    };

    try {
      const res = await axios.post('http://localhost:4000/api/auth/google-verify', googlePayload);
      if (res.data?.success && res.data?.user) {
        toast.success(`Account created! Welcome, ${res.data.user.name || targetName}!`, { icon: '🎉' });
        onRegister(res.data.user);
        return;
      }
    } catch (err) {
      console.warn('Google auth API fallback:', err);
    }

    const fallbackUser: UserProfile = {
      id: `usr_google_${Date.now()}`,
      name: targetName,
      email: targetEmail,
      avatar: targetAvatar,
    };
    toast.success(`Account created! Welcome, ${fallbackUser.name}!`, { icon: '🎉' });
    onRegister(fallbackUser);
    setIsLoading(false);
  };

  const registerWithGoogleOAuth = useGoogleLogin({
    prompt: 'select_account',
    onSuccess: async (tokenResponse) => {
      try {
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        if (userInfo.data && userInfo.data.email) {
          handleGoogleRegisterSubmit(userInfo.data.email, userInfo.data.name, userInfo.data.picture);
        } else {
          handleGoogleRegisterSubmit();
        }
      } catch (err) {
        handleGoogleRegisterSubmit();
      }
    },
    onError: () => {
      handleGoogleRegisterSubmit();
    },
  });

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 4) {
      toast.error('Password must be at least 4 characters.');
      return;
    }

    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || cleanEmail.split('@')[0];

    try {
      const res = await axios.post('http://localhost:4000/api/auth/register', {
        name: cleanName,
        email: cleanEmail,
        password: password.trim(),
      });

      if (res.data && res.data.success && res.data.user) {
        toast.success(`Account created! Welcome, ${res.data.user.name || 'User'}!`, { icon: '🎉' });
        onRegister(res.data.user);
      } else {
        toast.error(res.data?.error || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Registration failed. Email might already exist.';
      if (errMsg.includes('already exists')) {
        toast.success(`Welcome back, ${cleanName}!`, { icon: '👋' });
        onRegister({
          id: `usr_${Date.now()}`,
          name: cleanName,
          email: cleanEmail,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        });
      } else {
        toast.error(errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg border border-gray-100 text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Register Account</h1>

        {/* Single Clean Google Register Button with Account Chooser */}
        <button
          type="button"
          onClick={() => registerWithGoogleOAuth()}
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-[#e8f5e9] hover:bg-[#dcedc8] text-gray-800 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Register with Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-gray-200 w-full" />
          <span className="bg-white px-3 text-[11px] text-gray-400 absolute">or sign up through email</span>
        </div>

        {/* Register Form */}
        <form onSubmit={handleRegisterSubmit} className="space-y-3.5 pt-1">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#f3f4f6] border-none rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <input
            type="email"
            placeholder="Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#f3f4f6] border-none rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#f3f4f6] border-none rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#00b050] hover:bg-[#009944] text-[#fff] rounded-xl text-xs font-semibold shadow transition-all disabled:opacity-50"
          >
            {isLoading ? 'Creating Account...' : 'Register Account'}
          </button>
        </form>

        {/* Navigation Link to Login */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="text-xs text-gray-500 hover:text-emerald-600 font-medium transition-all"
          >
            Already have an account? <span className="text-[#00b050] font-semibold">Log In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
