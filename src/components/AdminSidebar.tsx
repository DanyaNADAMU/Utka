'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminSidebar({ userEmail }: { userEmail: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: '/admin', label: 'Дашборд', icon: '📊' },
    { href: '/admin/users', label: 'Пользователи', icon: '👥' },
    { href: '/admin/xray', label: 'Конфиг Xray', icon: '⚙️' },
    { href: '/admin/settings', label: 'Настройки', icon: '🛠️' },
  ];

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 relative shrink-0`}>
      <div className={`h-20 border-b border-slate-800 flex items-center ${collapsed ? 'justify-center' : 'justify-between px-6'}`}>
        {!collapsed && (
          <Link href="/">
            <h1 className="font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent truncate transition-all duration-300 text-xl">
              NadamuDash
            </h1>
          </Link>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors flex-shrink-0"
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
      
      <div className={`p-4 border-t border-slate-800 flex items-center ${collapsed ? 'justify-center' : ''}`}>
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
  );
}
