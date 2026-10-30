import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Stealth: if not authenticated or not admin, return 404
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    notFound();
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-50 flex flex-col md:flex-row overflow-hidden relative">
      <AdminSidebar userEmail={session.user.email as string} />
      
      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden custom-scrollbar relative">
        {/* Subtle background glow for main content */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="w-full max-w-[2560px] mx-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
