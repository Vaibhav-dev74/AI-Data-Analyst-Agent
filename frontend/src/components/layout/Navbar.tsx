import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Moon, Sun, LogOut, User as UserIcon, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 shadow-md shadow-blue-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              InsightIQ
              <span className="rounded bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-blue-400">
                PRO
              </span>
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User profile & logout */}
        {user ? (
          <div className="flex items-center gap-3 border-l border-slate-800 pl-3">
            <Link
              to="/profile"
              className="flex items-center gap-2.5 rounded-lg border border-slate-800/80 bg-slate-900/60 py-1.5 px-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/20 text-xs font-semibold text-blue-400">
                {user.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-200 leading-tight">{user.full_name}</p>
                <p className="text-[10px] text-slate-500">{user.email}</p>
              </div>
            </Link>

            <button
              onClick={logout}
              className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500 shadow-md shadow-blue-500/20"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
