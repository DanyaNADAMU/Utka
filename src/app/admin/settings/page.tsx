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

          {inbounds.length > 0 && (
            <div className="pt-6 border-t border-slate-800 space-y-6">
              <h3 className="text-lg font-semibold text-slate-200">Inbound Settings (Per-Tag)</h3>
              
              {inbounds.map((tag) => (
                <div key={tag} className="space-y-4 p-4 border border-slate-800 bg-slate-900/30 rounded-xl">
                  <h4 className="text-sm font-medium text-emerald-400">Tag: {tag}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`INBOUND_${tag}_PORT`} className="block text-sm font-medium text-slate-300 mb-1">
                        Client Port
                      </label>
                      <input 
                        type="number" 
                        id={`INBOUND_${tag}_PORT`}
                        name={`INBOUND_${tag}_PORT`}
                        defaultValue={settings[`INBOUND_${tag}_PORT`] || ""}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                        placeholder="Leave empty to use node port"
                      />
                    </div>
                    <div>
                      <label htmlFor={`INBOUND_${tag}_FLOW`} className="block text-sm font-medium text-slate-300 mb-1">
                        Default Flow
                      </label>
                      <select 
                        id={`INBOUND_${tag}_FLOW`}
                        name={`INBOUND_${tag}_FLOW`}
                        defaultValue={settings[`INBOUND_${tag}_FLOW`] || "xtls-rprx-vision"}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none"
                      >
                        <option value="xtls-rprx-vision">xtls-rprx-vision (Recommended)</option>
                        <option value="xtls-rprx-vision-udp443">xtls-rprx-vision-udp443</option>
                        <option value="">None (Empty)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

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
