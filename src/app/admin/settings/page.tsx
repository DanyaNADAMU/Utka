import { getSettings } from '@/lib/settings';
import { saveSettings } from '../actions';
import { getDictionary } from '@/i18n/dictionaries';
import { getClientInboundTags } from '@/lib/xray';

export default async function SettingsPage() {
  const dict = await getDictionary();
  const settings = await getSettings();
  const inbounds = await getClientInboundTags();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">{dict.admin.settings.title}</h1>
        <p className="text-slate-400 mt-2">
          {dict.admin.settings.description}
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-lg font-semibold text-slate-200">{dict.admin.settings.routing_xray}</h2>
        </div>
        
        <form action={saveSettings} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="SUB_PATH" className="block text-sm font-medium text-slate-300 mb-1">
                {dict.admin.settings.sub_path}
              </label>
              <p className="text-xs text-slate-500 mb-2">
                {dict.admin.settings.sub_path_desc}
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
              <label htmlFor="OLD_UUID_EXPIRE_MINUTES" className="block text-sm font-medium text-slate-300 mb-1">
                {dict.admin.settings.old_uuid_expire}
              </label>
              <p className="text-xs text-slate-500 mb-2">
                {dict.admin.settings.old_uuid_expire_desc}
              </p>
              <input 
                type="number" 
                id="OLD_UUID_EXPIRE_MINUTES" 
                name="OLD_UUID_EXPIRE_MINUTES" 
                defaultValue={settings.OLD_UUID_EXPIRE_MINUTES}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="2031"
              />
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 space-y-4">
            <h3 className="text-md font-semibold text-slate-200">{dict.admin.settings.webhooks_integrations}</h3>

            <div>
              <label htmlFor="WEBHOOK_URL" className="block text-sm font-medium text-slate-300 mb-1">
                {dict.admin.settings.webhook_url}
              </label>
              <p className="text-xs text-slate-500 mb-2">
                {dict.admin.settings.webhook_url_desc}
              </p>
              <input 
                type="text" 
                id="WEBHOOK_URL" 
                name="WEBHOOK_URL" 
                defaultValue={settings.WEBHOOK_URL}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono text-xs"
                placeholder="https://example.com/api/v1/subscriptions/webhook"
              />
            </div>

            <div className="pt-2">
              <label htmlFor="SERVICE_TOKENS" className="block text-sm font-medium text-slate-300 mb-1">
                {dict.admin.settings.service_tokens}
              </label>
              <p className="text-xs text-slate-500 mb-2">
                {dict.admin.settings.service_tokens_desc}
              </p>
              <textarea 
                id="SERVICE_TOKENS" 
                name="SERVICE_TOKENS" 
                rows={3}
                defaultValue={settings.SERVICE_TOKENS}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono text-xs"
                placeholder="secret_service_token_1&#10;secret_service_token_2"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex justify-end">
            <button 
              type="submit" 
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]"
            >
              {dict.admin.settings.save_button}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
