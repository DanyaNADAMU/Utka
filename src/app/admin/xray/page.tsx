import { getXrayConfig } from '../actions';

export default async function XrayConfigPage() {
  const { success, data, error } = await getXrayConfig();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Конфигурация Xray</h1>
        <p className="text-slate-400 mt-2">
          Текущий файл `xray/config.json`. Доступно только для чтения.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-lg font-semibold text-slate-200">Raw JSON</h2>
        </div>
        
        <div className="p-6">
          {!success ? (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
              Ошибка при чтении файла: {error}
            </div>
          ) : (
            <pre className="bg-slate-950 p-4 rounded-lg overflow-x-auto text-sm text-emerald-400 border border-slate-800">
              <code>{data}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
