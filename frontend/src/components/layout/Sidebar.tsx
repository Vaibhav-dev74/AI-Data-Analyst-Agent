import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  Bot,
  BarChart3,
  TrendingUp,
  FileText,
  User,
  Settings,
  ShieldCheck,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { name: 'My Datasets', path: '/datasets', icon: Database },
  { name: 'AI Analyst', path: '/chat', icon: Bot, highlight: true },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Predictions', path: '/predictions', icon: TrendingUp },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-950/70 p-4 md:flex">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          Analytics Workspace
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`
                }
              >
                <Icon className={`h-4 w-4 ${item.highlight ? 'text-blue-400 animate-pulse' : ''}`} />
                <span>{item.name}</span>
                {item.highlight && (
                  <span className="ml-auto rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-semibold text-blue-400">
                    Live
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Sandboxed Core</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Zero arbitrary execution. DuckDB SQL AST verification & isolated data partitions active.
        </p>
      </div>
    </aside>
  );
};
