import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Redirect if not authenticated
  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  // TODO: Add role check (e.g. session.user.role !== 'ADMIN')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <Link href="/">
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              NadamuDash
            </h1>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="block px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
            Дашборд
          </Link>
          <Link href="/admin/users" className="block px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
            Пользователи
          </Link>
          <Link href="/admin/settings" className="block px-4 py-2 text-slate-300 bg-slate-800/50 hover:bg-slate-800 text-white rounded-lg transition-colors border border-slate-700/50">
            Настройки
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="text-sm text-slate-500 truncate">{session.user.email}</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
