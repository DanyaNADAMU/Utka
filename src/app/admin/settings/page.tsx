import { getSettings } from '@/lib/settings';
import { saveSettings } from '../actions';

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Настройки панели</h1>
        <p className="text-slate-400 mt-2">
          Управление базовыми конфигурациями системы и интеграцией с Xray.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-lg font-semibold text-slate-200">Маршрутизация и Xray</h2>
        </div>
        
        <form action={saveSettings} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="SUB_PATH" className="block text-sm font-medium text-slate-300 mb-1">
                Путь к ссылкам-подпискам
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Шаблон URL для генерации ссылок. Используйте `[token]` как плейсхолдер. 
                Например: `/[token]` или `/sub/[token]`.
              </p>
              <input 
                type="text" 
                id="SUB_PATH" 
                name="SUB_PATH" 
                defaultValue={settings.SUB_PATH}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                placeholder="/[token]"
              />
            </div>

            <div className="pt-4">
              <label htmlFor="XRAY_INBOUND_TAG" className="block text-sm font-medium text-slate-300 mb-1">
                Xray Inbound Tag
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Тег входящего соединения в `config.json` вашего Xray сервера, куда будут добавляться новые пользователи.
              </p>
              <input 
                type="text" 
                id="XRAY_INBOUND_TAG" 
                name="XRAY_INBOUND_TAG" 
                defaultValue={settings.XRAY_INBOUND_TAG}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                placeholder="vless-reality"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex justify-end">
            <button 
              type="submit" 
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]"
            >
              Сохранить настройки
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
