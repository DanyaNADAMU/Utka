import db from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getDictionary } from "@/i18n/dictionaries";
import { notFound } from "next/navigation";
import Link from "next/link";
import UserTrafficViewer from "@/components/UserTrafficViewer";
import CopyButton from "@/components/CopyButton";

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const dict = await getDictionary();
  const settings = await getSettings();
  const authUrl = process.env.AUTH_URL || 'https://nada.mu';

  const sub = await db.subscription.findUnique({
    where: { id: params.id },
    include: { user: true }
  });

  if (!sub) {
    notFound();
  }

  const subPath = settings.SUB_PATH.replace('[token]', sub.token);
  const safeSubPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
  const subLink = `${authUrl}${safeSubPath}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-white">Пользователь: {sub.user?.email || 'Неизвестно'}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-slate-200 mb-4">Информация</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">Имя подписки</p>
              <p className="font-medium text-slate-200">{sub.name || 'Default'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Токен</p>
              <code className="text-sm text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                {sub.token}
              </code>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Ссылка на подписку</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 truncate max-w-[200px] md:max-w-xs">
                  {subLink}
                </code>
                <CopyButton text={subLink} iconOnly={true} label={dict.common.copied} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-slate-200 mb-4">Системные данные</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">ID Подписки</p>
              <code className="text-sm text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                {sub.id}
              </code>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Создано</p>
              <p className="font-medium text-slate-200">{sub.createdAt.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Обновлено</p>
              <p className="font-medium text-slate-200">{sub.updatedAt.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <UserTrafficViewer subId={sub.id} />
    </div>
  );
}
