'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/i18n/LanguageProvider';
import LanguageSwitcher from './LanguageSwitcher';
import GlobalAutoRefresh from './GlobalAutoRefresh';
import { ShieldCheck } from 'lucide-react';

export default function AdminSidebar({ userEmail }: { userEmail: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const dict = useTranslation();

  const links = [
    { href: '/admin', label: dict.admin.sidebar.dashboard, icon: '📊' },
    { href: '/admin/users', label: dict.admin.sidebar.users, icon: '👥' },
    { href: '/admin/nodes', label: dict.admin.sidebar.nodes, icon: '🖥️' },
    { href: '/admin/settings', label: dict.admin.sidebar.settings, icon: '🛠️' },
  ];

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 w-full shrink-0 z-40 relative">
        <Link href="/" className="flex items-center gap-2.5">
          <ShieldCheck className="w-7 h-7 text-emerald-400 shrink-0" />
          <h1 className="font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent text-xl">
            Dash
          </h1>
        </Link>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          title="Меню"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-50 h-full inset-y-0 left-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${collapsed ? 'md:w-20' : 'md:w-64'} w-64
        bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 shrink-0
      `}>
        <div className={`h-20 border-b border-slate-800 flex items-center ${collapsed ? 'justify-center' : 'justify-between px-6'}`}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="w-7 h-7 text-emerald-400 shrink-0" />
            <h1 className="font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent truncate transition-all duration-300 text-xl">
              Dash
            </h1>
          </Link>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:block text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors flex-shrink-0"
          title="Меню"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-x-hidden custom-scrollbar">
        {links.map(link => {
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`flex items-center ${collapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 text-slate-300 rounded-xl transition-all duration-200
                ${isActive ? 'bg-slate-800/80 text-white border border-slate-700/50 shadow-sm' : 'hover:bg-slate-800 hover:text-white border border-transparent'}`}
              title={collapsed ? link.label : undefined}
            >
              <span className={`text-lg transition-transform ${isActive && !collapsed ? 'scale-110' : ''}`}>{link.icon}</span>
              {!collapsed && <span className="font-medium text-sm whitespace-nowrap">{link.label}</span>}
            </Link>
          );
        })}
      </nav>
      
      <div className={`p-4 border-t border-slate-800 flex flex-col items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
        {!collapsed ? (
          <div className="flex items-center justify-between w-full gap-2">
            <LanguageSwitcher />
            <GlobalAutoRefresh collapsed={false} />
          </div>
        ) : (
          <GlobalAutoRefresh collapsed={true} />
        )}
        {!collapsed ? (
          <div className="text-xs font-medium text-slate-500 truncate bg-slate-950 px-3 py-2.5 rounded-lg border border-slate-800/50 w-full text-center">
            {userEmail}
          </div>
        ) : (
          <div className="text-xs font-medium text-slate-400 truncate w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800/50 shadow-inner" title={userEmail}>
            {userEmail.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
