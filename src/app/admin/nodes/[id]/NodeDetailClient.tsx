'use client';

import { useState, useTransition } from 'react';
import { Node } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { updateNode, deleteNode, syncNodeUsersAction, saveNodeInboundSettings } from '../actions';
import { ArrowLeft, Save, Trash2, Server, Terminal, Settings, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useTrafficStream } from '@/components/TrafficStreamContext';

export default function NodeDetailClient({
  node,
  dict,
  initialIsOnline,
  masterSnippets,
  nodeSnippets,
  activeInbounds = []
}: {
  node: Node;
  dict: any;
  initialIsOnline: boolean;
  masterSnippets?: any;
  nodeSnippets?: any;
  activeInbounds?: string[];
}) {
  const router = useRouter();
  const { trafficData } = useTrafficStream();
  const isOnline = trafficData.nodes?.[node.id] !== undefined
    ? Boolean(trafficData.nodes[node.id])
    : initialIsOnline;
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'config'>('general');
  const [copied, setCopied] = useState(false);

  const isMasterNode = (node as any).isMaster || node.apiHost?.includes('api.sock');

  const [inboundSettings, setInboundSettings] = useState<Record<string, any>>(() => {
    try {
      return (node as any).inboundSettings ? JSON.parse((node as any).inboundSettings) : {};
    } catch (e) {
      return {};
    }
  });

  const updateInboundSetting = (tag: string, key: string, value: any) => {
    setInboundSettings(prev => ({
      ...prev,
      [tag]: {
        ...(prev[tag] || {}),
        [key]: value
      }
    }));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncUsers = async () => {
    setIsSyncing(true);
    try {
      const res = await syncNodeUsersAction(node.id);
      alert(dict.admin?.nodes?.users_synced || `Synced ${res.success}/${res.total} active UUIDs to Xray.`);
    } catch (e) {
      console.error(e);
      alert(dict.common?.error || 'Failed to sync users');
    } finally {
      setIsSyncing(false);
    }
  };

  const [formData, setFormData] = useState({
    name: node.name,
    address: node.address,
    port: node.port.toString(),
    xrayPort: (node as any).xrayPort ? (node as any).xrayPort.toString() : '8443',
    adminUuid: node.adminUuid || '',
    realityServerName: node.realityServerName || '',
    realityPubKey: node.realityPubKey || '',
    realityPrivKey: (node as any).realityPrivKey || '',
    realityShortId: node.realityShortId || '',
    isActive: node.isActive,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          name: formData.name,
          address: formData.address,
          port: parseInt(formData.port) || 443,
          xrayPort: parseInt(formData.xrayPort) || 8443,
          adminUuid: formData.adminUuid,
          realityServerName: formData.realityServerName,
          realityPubKey: formData.realityPubKey,
          realityPrivKey: formData.realityPrivKey,
          realityShortId: formData.realityShortId,
          isActive: formData.isActive,
        };

        await updateNode(node.id, payload);
        await saveNodeInboundSettings(node.id, JSON.stringify(inboundSettings));
        router.refresh();
        alert(dict.common.saved || 'Saved successfully');
      } catch (err) {
        console.error(err);
        alert(dict.common.error);
      }
    });
  };

  const handleDelete = async () => {
    if (confirm(dict.admin.nodes.delete_confirm)) {
      startTransition(async () => {
        try {
          await deleteNode(node.id);
          router.push('/admin/nodes');
        } catch (err) {
          console.error(err);
          alert(dict.common.error);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/nodes"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-white">{node.name}</h1>
              {isMasterNode && (
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  Master
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-slate-400 mt-1">
              <span className="flex items-center space-x-1.5">
                <Server size={14} className="text-slate-500" />
                <span className="font-mono">{node.address}:{node.port}</span>
              </span>
              <span className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                <span className={isOnline ? 'text-emerald-400' : 'text-red-400'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleSyncUsers}
            disabled={isSyncing}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all disabled:opacity-50 font-medium"
          >
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
            <span>{dict.admin?.nodes?.sync_users || 'Sync Users'}</span>
          </button>
          {!isMasterNode && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all disabled:opacity-50 font-medium"
            >
              <Trash2 size={18} />
              <span>{dict.admin.nodes.delete_node || 'Delete Node'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'general'
              ? 'text-cyan-400 border-cyan-400'
              : 'text-slate-400 border-transparent hover:text-slate-300 hover:border-slate-700'
          }`}
        >
          <Settings size={18} />
          <span>{dict.admin.nodes.form?.general || 'Settings'}</span>
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'config'
              ? 'text-emerald-400 border-emerald-400'
              : 'text-slate-400 border-transparent hover:text-slate-300 hover:border-slate-700'
          }`}
        >
          <Terminal size={18} />
          <span>Setup Instructions</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {activeTab === 'general' ? (
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">{dict.admin.nodes.form?.basic_info || 'Basic Information'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/40 p-6 border border-slate-800 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">{dict.admin.nodes.form.name}</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">{dict.admin.nodes.form.address}</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                </div>

                {!isMasterNode && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">{dict.admin.nodes.form.adminUuid}</label>
                    <input
                      type="text"
                      value={formData.adminUuid}
                      onChange={(e) => setFormData({ ...formData, adminUuid: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-sm"
                      placeholder="UUID for gRPC tunnel"
                    />
                    <p className="text-xs text-slate-500 mt-2">This UUID is used for the REALITY gRPC tunnel between Master and Node.</p>
                  </div>
                )}

                <div className="md:col-span-2 flex items-center space-x-3 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-950 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-300 cursor-pointer select-none">
                    {dict.admin.nodes.form.isActive}
                  </label>
                </div>
              </div>
            </div>

              {activeInbounds.length > 0 && (
                <div className="space-y-6 pt-6 border-t border-slate-800">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Inbound Settings (Per-Tag)</h3>
                    <p className="text-xs text-slate-400 mt-1">Configure client metadata per inbound tag for this node (port, flow, network, SNI, keys).</p>
                  </div>

                  <div className="space-y-4">
                    {activeInbounds.map((tag) => {
                      const item = inboundSettings[tag] || {};
                      return (
                        <div key={tag} className="p-5 border border-slate-800 bg-slate-950/60 rounded-xl space-y-4">
                          <h4 className="text-sm font-bold text-emerald-400 flex items-center space-x-2">
                            <span>Tag: {tag}</span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1">Client Port</label>
                              <input
                                type="number"
                                value={item.port || ''}
                                onChange={(e) => updateInboundSetting(tag, 'port', e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder={`Default (${formData.port})`}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1">Flow</label>
                              <select
                                value={item.flow || 'xtls-rprx-vision'}
                                onChange={(e) => updateInboundSetting(tag, 'flow', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 appearance-none"
                              >
                                <option value="xtls-rprx-vision">xtls-rprx-vision (Recommended)</option>
                                <option value="xtls-rprx-vision-udp443">xtls-rprx-vision-udp443</option>
                                <option value="">None (Empty)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1">Network / Transport</label>
                              <select
                                value={item.network || 'tcp'}
                                onChange={(e) => updateInboundSetting(tag, 'network', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 appearance-none"
                              >
                                <option value="tcp">tcp</option>
                                <option value="ws">ws</option>
                                <option value="grpc">grpc</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1">Custom SNI</label>
                              <input
                                type="text"
                                value={item.sni || ''}
                                onChange={(e) => updateInboundSetting(tag, 'sni', e.target.value)}
                                placeholder={`Default (${formData.realityServerName})`}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1">Custom Public Key</label>
                              <input
                                type="text"
                                value={item.pbk || ''}
                                onChange={(e) => updateInboundSetting(tag, 'pbk', e.target.value)}
                                placeholder="Default (Node Public Key)"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1">Custom Short ID</label>
                              <input
                                type="text"
                                value={item.sid || ''}
                                onChange={(e) => updateInboundSetting(tag, 'sid', e.target.value)}
                                placeholder={`Default (${formData.realityShortId})`}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            <div className="pt-8 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center space-x-2 bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                <Save size={18} />
                <span>{isPending ? dict.common.loading : (dict.common.save || 'Save Changes')}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-8 space-y-8">
            {isMasterNode ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Инструкции по настройке Xray на Мастере</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Скопируйте эти конфигурационные блоки в файл <code className="text-emerald-400">/etc/xray/config.json</code> на сервере Мастера.
                  </p>
                </div>

                <CodeBlock 
                  title="1. API Inbound (Unix сокет API)" 
                  code={nodeSnippets?.masterApiInboundJson || '{}'}
                  description="Вставьте в массив inbounds в config.json Мастера"
                />

                <CodeBlock 
                  title="2. API Routing Rule (Правило маршрутизации API)" 
                  code={nodeSnippets?.masterApiRoutingRuleJson || '{}'}
                  description="Вставьте в массив routing.rules в config.json Мастера"
                />

                <CodeBlock 
                  title="3. Системные блоки (dns, log, api, stats, policy)" 
                  code={nodeSnippets?.systemBlocksJson || '{}'}
                  description="Базовые параметры логирования, API и статистики для Мастера"
                />
              </div>
            ) : (
              <div className="space-y-8">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">1. Конфигурация для сервера Ноды</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Полная конфигурация для файла <code className="text-emerald-400">/etc/xray/config.json</code> на сервере ноды (<code className="font-mono">{node.address}</code>).
                    </p>
                  </div>

                  <CodeBlock 
                    title={`Полный config.json для Ноды ${node.name}`}
                    code={nodeSnippets?.fullNodeConfigJson || '{}'}
                  />
                </div>

                <div className="pt-6 border-t border-slate-800 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">2. Блоки для добавления на Мастере</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Добавьте эти 3 фрагмента в соответствующий <code className="text-emerald-400">/etc/xray/config.json</code> на Мастере для подключения к этой ноде по туннелю.
                    </p>
                  </div>

                  <CodeBlock 
                    title="2.1. Inbound на Мастере (Unix-сокет туннеля)" 
                    code={masterSnippets?.inboundJson || '{}'}
                    description="Вставьте в массив inbounds Мастера"
                  />

                  <CodeBlock 
                    title="2.2. Outbound на Мастере (VLESS туннель к Ноде)" 
                    code={masterSnippets?.outboundJson || '{}'}
                    description="Вставьте в массив outbounds Мастера"
                  />

                  <CodeBlock 
                    title="2.3. Routing Rule на Мастере" 
                    code={masterSnippets?.routingRuleJson || '{}'}
                    description="Вставьте в массив routing.rules Мастера"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ title, code, description }: { title: string; code: string; description?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2 bg-slate-950/60 p-5 border border-slate-800 rounded-xl">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-emerald-400">{title}</h4>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-medium transition-all"
        >
          {copied ? 'Скопировано!' : 'Копировать'}
        </button>
      </div>
      {description && <p className="text-xs text-slate-400">{description}</p>}
      <pre className="p-4 bg-slate-950 border border-slate-800/80 rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}
