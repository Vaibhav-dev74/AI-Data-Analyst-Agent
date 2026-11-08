import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';
import { User, Lock, Mail, CheckCircle, AlertCircle, Shield } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);
  const [savingPass, setSavingPass] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErr(null);
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      await userService.updateProfile({ full_name: fullName, email });
      await refreshUser();
      setProfileMsg('Profile information updated successfully.');
    } catch (err: any) {
      setProfileErr(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassErr(null);
    setPassMsg(null);
    if (newPassword.length < 6) {
      setPassErr('New password must have at least 6 characters.');
      return;
    }
    setSavingPass(true);
    try {
      await userService.changePassword(currentPassword, newPassword);
      setPassMsg('Password successfully changed.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPassErr(err.response?.data?.detail || 'Password update failed.');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          User Account & Security
          <User className="h-5 w-5 text-blue-400" />
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Manage your personal profile, authentication credentials, and tenant role.
        </p>
      </div>

      {/* Account Info Header */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xl font-bold text-white shadow-lg shadow-blue-500/20">
          {user?.full_name?.charAt(0) || 'U'}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{user?.full_name}</h2>
          <p className="text-xs text-slate-400">{user?.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-blue-400 uppercase">
              Role: {user?.role || 'Analyst'}
            </span>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Verified Tenant
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Profile Details</h3>

          {profileMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{profileMsg}</span>
            </div>
          )}
          {profileErr && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{profileErr}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
            >
              {savingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Password Form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Security & Password</h3>

          {passMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{passMsg}</span>
            </div>
          )}
          {passErr && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{passErr}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingPass}
              className="flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
            >
              {savingPass ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
