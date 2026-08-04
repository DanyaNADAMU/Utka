'use client';

import { useState, useTransition } from 'react';
import { Node } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { updateNode, deleteNode } from '../actions';
import { ArrowLeft, Save, Trash2, Server, Terminal, Settings } from 'lucide-react';
import Link from 'next/link';

export default function NodeDetailClient({
  node,
  dict,
  initialIsOnline,
  configSnippet
}: {
  node: Node;
  dict: any;
  initialIsOnline: boolean;
  configSnippet?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'general' | 'config'>('general');
  const [copied, setCopied] = useState(false);

  const displayConfig = configSnippet || (typeof node.xrayConfig === 'string' ? node.xrayConfig : JSON.stringify(node.xrayConfig, null, 2)) || '';

  const handleCopy = () => {
    if (displayConfig) {
      navigator.clipboard.writeText(displayConfig);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [formData, setFormData] = useState({
    name: node.name,
    address: node.address,
    port: node.port.toString(),
    xrayPort: (node as any).xrayPort ? (node as any).xrayPort.toString() : '8443',
    apiHost: node.apiHost,
    adminUuid: node.adminUuid || '',
    realityServerName: node.realityServerName || 'biz.mail.ru',
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
          apiHost: formData.apiHost,
          adminUuid: formData.adminUuid,
          realityServerName: formData.realityServerName,
          realityPubKey: formData.realityPubKey,
          realityPrivKey: formData.realityPrivKey,
          realityShortId: formData.realityShortId,
          isActive: formData.isActive,
        };

        await updateNode(node.id, payload);
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
      <div className="flex items-center justify-between bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center space-x-6">
          <Link
            href="/admin/nodes"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all hover:scale-105 active:scale-95"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">{node.name}</h1>
              {node.isActive ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                  Inactive
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-slate-400">
              <span className="flex items-center space-x-1.5">
                <Server size={14} className="text-slate-500" />
                <span className="font-mono">{node.address}:{node.port}</span>
              </span>
              <span className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${initialIsOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                <span className={initialIsOnline ? 'text-emerald-400' : 'text-red-400'}>
                  {initialIsOnline ? 'Online' : 'Offline'}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all disabled:opacity-50 font-medium"
          >
            <Trash2 size={18} />
            <span>{dict.admin.nodes.delete_node || 'Delete Node'}</span>
          </button>
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
              ? 'text-purple-400 border-purple-400'
              : 'text-slate-400 border-transparent hover:text-slate-300 hover:border-slate-700'
          }`}
        >
          <Terminal size={18} />
          <span>{dict.admin.nodes.form?.reported_config || 'Xray Configuration'}</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {activeTab === 'general' ? (
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">{dict.admin.nodes.form?.basic_info || 'Basic Information'}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">{dict.admin.nodes.form.name}</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">{dict.admin.nodes.form.address}</label>
                      <input
                        type="text"
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">{dict.admin.nodes.form.port || "Public Port"}</label>
                        <input
                          type="number"
                          required
                          value={formData.port}
                          onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">{dict.admin.nodes.form.xrayPort || "Internal Xray Port"}</label>
                        <input
                          type="number"
                          required
                          value={formData.xrayPort}
                          onChange={(e) => setFormData({ ...formData, xrayPort: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">{dict.admin.nodes.form.adminUuid}</label>
                      <input
                        type="text"
                        value={formData.adminUuid}
                        onChange={(e) => setFormData({ ...formData, adminUuid: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-sm"
                        placeholder="UUID for gRPC tunnel"
                      />
                      <p className="text-xs text-slate-500 mt-2">This UUID is used for the REALITY gRPC tunnel between Master and Node.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">{dict.admin.nodes.form?.reality_settings || 'REALITY Settings'}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">{dict.admin.nodes.form.realityServerName}</label>
                      <input
                        type="text"
                        value={formData.realityServerName}
                        onChange={(e) => setFormData({ ...formData, realityServerName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">{dict.admin.nodes.form.realityPubKey}</label>
                      <input
                        type="text"
                        value={formData.realityPubKey}
                        onChange={(e) => setFormData({ ...formData, realityPubKey: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">{dict.admin.nodes.form.realityShortId}</label>
                      <input
                        type="text"
                        value={formData.realityShortId}
                        onChange={(e) => setFormData({ ...formData, realityShortId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center space-x-3">
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
              </div>
            </div>

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
          <div className="p-0">
            {displayConfig ? (
              <div className="relative">
                <div className="absolute top-4 right-4 flex space-x-2 z-10">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-md transition-all"
                  >
                    {copied ? (dict.admin.nodes?.copied || 'Copied!') : (dict.admin.nodes?.copy_button || 'Copy')}
                  </button>
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-md">
                    {dict.admin.nodes.form?.raw_format || 'Raw File Format'}
                  </span>
                </div>
                <pre className="p-8 bg-slate-950 text-emerald-400 font-mono text-sm overflow-x-auto min-h-[500px]">
                  <code>{displayConfig}</code>
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-slate-500">
                <Terminal size={48} className="mb-4 text-slate-700" />
                <p className="text-lg font-medium text-slate-400">{dict.admin.nodes.form?.no_config || 'Xray Configuration'}</p>
                <p className="text-sm mt-2 max-w-md text-center">
                  {dict.admin.nodes.form?.no_config_help || 'Copy this configuration into /etc/xray/config.json on the node server.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
