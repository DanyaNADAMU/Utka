'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createNode, deleteNode, getNodeConfigInstructions } from './actions';
import { Plus, Edit2, Trash2, FileCode, Copy, Check, X } from 'lucide-react';
import { Node } from '@prisma/client';

export default function NodesClient({ 
  initialNodes, 
  dict,
  nodeStatus
}: { 
  initialNodes: Node[]; 
  dict: any;
  nodeStatus: Record<string, boolean>;
}) {
  const router = useRouter();
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [isPending, startTransition] = useTransition();

  // Instructions modal state
  const [instructionsNode, setInstructionsNode] = useState<Node | null>(null);
  const [instructionsData, setInstructionsData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'master' | 'node' | 'reported'>('master');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    port: '443',
    xrayPort: '8443',
    apiHost: '',
    adminUuid: '',
    realityServerName: '',
    realityPubKey: '',
    realityPrivKey: '',
    realityShortId: '',
    isActive: true,
  });

  const openInstructions = async (node: Node) => {
    setInstructionsNode(node);
    setActiveTab('master');
    try {
      const data = await getNodeConfigInstructions(node.id);
      setInstructionsData(data);
    } catch (err) {
      console.error("Error loading instructions:", err);
    }
  };

  const closeInstructions = () => {
    setInstructionsNode(null);
    setInstructionsData(null);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      address: '',
      port: '443',
      xrayPort: '8443',
      apiHost: '',
      adminUuid: '',
      realityServerName: '',
      realityPubKey: '',
      realityPrivKey: '',
      realityShortId: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNode(null);
  };

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

        const targetNode = await createNode(payload);
        setNodes([targetNode, ...nodes]);
        closeModal();

        // Open setup instructions automatically after saving
        await openInstructions(targetNode);
      } catch (err) {
        console.error(err);
        alert(dict.common.error);
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm(dict.admin.nodes.delete_confirm)) {
      startTransition(async () => {
        try {
          await deleteNode(id);
          setNodes(nodes.filter(n => n.id !== id));
        } catch (err) {
          console.error(err);
          alert(dict.common.error);
        }
      });
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => openCreateModal()}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg shadow-emerald-500/20"
        >
          <Plus size={18} />
          <span>{dict.admin.nodes.add_node}</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-sm border-b border-slate-800">
                <th className="p-4 font-medium text-slate-400">{dict.admin.nodes.table.name}</th>
                <th className="p-4 font-medium text-slate-400">{dict.admin.nodes.table.address}</th>
                <th className="p-4 font-medium text-slate-400">{dict.admin.nodes.table.port}</th>
                <th className="p-4 font-medium text-slate-400">Xray Port</th>
                <th className="p-4 font-medium text-slate-400">{dict.admin.nodes.table.status}</th>
                <th className="p-4 font-medium text-slate-400">Connection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {nodes.map(node => {
                const isMasterNode = (node as any).isMaster || node.apiHost?.includes('api.sock');
                return (
                <tr 
                  key={node.id} 
                  onClick={() => router.push(`/admin/nodes/${node.id}`)}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <td className="p-4 text-white font-medium flex items-center space-x-2">
                    <span>{node.name}</span>
                    {isMasterNode && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Master
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-slate-300">{node.address}</td>
                  <td className="p-4 text-slate-300">{node.port}</td>
                  <td className="p-4 text-slate-300 font-mono text-sm">{(node as any).xrayPort || 8443}</td>
                  <td className="p-4">
                    {node.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${nodeStatus[node.id] ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                      <span className={`text-sm font-medium ${nodeStatus[node.id] ? 'text-emerald-400' : 'text-red-400'}`}>
                        {nodeStatus[node.id] ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
              })}
              {nodes.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No nodes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Node Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {dict.admin.nodes.add_node}
              </h2>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="node-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{dict.admin.nodes.form.name}</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{dict.admin.nodes.form.address}</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">{dict.admin.nodes.form.port || "Public Port (HAProxy)"}</label>
                    <input
                      type="number"
                      required
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      placeholder="e.g. 443"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">{dict.admin.nodes.form.xrayPort || "Internal Xray Port"}</label>
                    <input
                      type="number"
                      required
                      value={formData.xrayPort}
                      onChange={(e) => setFormData({ ...formData, xrayPort: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      placeholder="e.g. 8443"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{dict.admin.nodes.form.adminUuid}</label>
                  <input
                    type="text"
                    value={formData.adminUuid}
                    onChange={(e) => setFormData({ ...formData, adminUuid: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm"
                    placeholder="Auto-generated if left empty"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{dict.admin.nodes.form.realityServerName}</label>
                  <input
                    type="text"
                    value={formData.realityServerName}
                    onChange={(e) => setFormData({ ...formData, realityServerName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    placeholder="e.g. domain.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">{dict.admin.nodes.form.realityPubKey}</label>
                    <input
                      type="text"
                      value={formData.realityPubKey}
                      onChange={(e) => setFormData({ ...formData, realityPubKey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-xs"
                      placeholder="Auto-generated"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">{dict.admin.nodes.form.realityPrivKey}</label>
                    <input
                      type="text"
                      value={formData.realityPrivKey}
                      onChange={(e) => setFormData({ ...formData, realityPrivKey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-xs"
                      placeholder="Auto-generated"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{dict.admin.nodes.form.realityShortId}</label>
                  <input
                    type="text"
                    value={formData.realityShortId}
                    onChange={(e) => setFormData({ ...formData, realityShortId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm"
                    placeholder="Auto-generated"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-950 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-300 cursor-pointer">
                    {dict.admin.nodes.form.isActive}
                  </label>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-800 flex justify-end space-x-3 bg-slate-900/50">
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-medium transition-colors disabled:opacity-50"
              >
                {dict.common.cancel}
              </button>
              <button
                type="submit"
                form="node-form"
                disabled={isPending}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {isPending ? dict.common.loading : dict.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Instructions Modal */}
      {instructionsNode && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileCode className="text-cyan-400" size={22} />
                  <span>{dict.admin.nodes.instructions_title || "Xray Setup Instructions"}</span>
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Node: <span className="text-cyan-400 font-medium">{instructionsNode.name}</span> (Public Port: {instructionsNode.port}, Internal Xray Port: {(instructionsNode as any).xrayPort || 8443})
                </p>
              </div>
              <button
                onClick={closeInstructions}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2 space-x-2">
              <button
                onClick={() => setActiveTab('master')}
                className={`px-4 py-2.5 font-medium text-sm rounded-t-lg transition-colors flex items-center space-x-2 ${
                  activeTab === 'master'
                    ? 'bg-slate-900 text-cyan-400 border-t border-x border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                <span>{dict.admin.nodes.master_tab || "Master (moscow-nadamudash)"}</span>
              </button>
              <button
                onClick={() => setActiveTab('node')}
                className={`px-4 py-2.5 font-medium text-sm rounded-t-lg transition-colors flex items-center space-x-2 ${
                  activeTab === 'node'
                    ? 'bg-slate-900 text-emerald-400 border-t border-x border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                <span>{dict.admin.nodes.node_tab || "Node (ice-nadamudash-node)"}</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {!instructionsData ? (
                <div className="py-12 text-center text-slate-400">Loading instructions...</div>
              ) : activeTab === 'master' ? (
                <div className="space-y-6">
                  <p className="text-sm text-slate-300 bg-cyan-950/40 border border-cyan-800/40 rounded-lg p-3">
                    {dict.admin.nodes.master_desc || "Add these sections to /app/xray/config.json on Master:"}
                  </p>

                  {/* Master Inbound */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold text-slate-200">
                        {dict.admin.nodes.inbound_title || "1. inbounds section:"}
                      </h4>
                      <button
                        onClick={() => handleCopy(JSON.stringify(instructionsData.masterSnippets.inbound, null, 2), 'masterInbound')}
                        className="text-xs flex items-center space-x-1 text-slate-400 hover:text-cyan-400 bg-slate-800 px-2.5 py-1 rounded transition-colors"
                      >
                        {copiedKey === 'masterInbound' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copiedKey === 'masterInbound' ? (dict.admin.nodes.copied || 'Copied!') : (dict.admin.nodes.copy_button || 'Copy')}</span>
                      </button>
                    </div>
                    <pre className="bg-slate-950 p-4 rounded-xl text-xs text-emerald-400 overflow-x-auto border border-slate-800 font-mono">
                      <code>{JSON.stringify(instructionsData.masterSnippets.inbound, null, 2)}</code>
                    </pre>
                  </div>

                  {/* Master Outbound */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold text-slate-200">
                        {dict.admin.nodes.outbound_title || "2. outbounds section:"}
                      </h4>
                      <button
                        onClick={() => handleCopy(JSON.stringify(instructionsData.masterSnippets.outbound, null, 2), 'masterOutbound')}
                        className="text-xs flex items-center space-x-1 text-slate-400 hover:text-cyan-400 bg-slate-800 px-2.5 py-1 rounded transition-colors"
                      >
                        {copiedKey === 'masterOutbound' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copiedKey === 'masterOutbound' ? (dict.admin.nodes.copied || 'Copied!') : (dict.admin.nodes.copy_button || 'Copy')}</span>
                      </button>
                    </div>
                    <pre className="bg-slate-950 p-4 rounded-xl text-xs text-emerald-400 overflow-x-auto border border-slate-800 font-mono">
                      <code>{JSON.stringify(instructionsData.masterSnippets.outbound, null, 2)}</code>
                    </pre>
                  </div>

                  {/* Master Routing Rule */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold text-slate-200">
                        {dict.admin.nodes.routing_title || "3. routing.rules section:"}
                      </h4>
                      <button
                        onClick={() => handleCopy(JSON.stringify(instructionsData.masterSnippets.routingRule, null, 2), 'masterRouting')}
                        className="text-xs flex items-center space-x-1 text-slate-400 hover:text-cyan-400 bg-slate-800 px-2.5 py-1 rounded transition-colors"
                      >
                        {copiedKey === 'masterRouting' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copiedKey === 'masterRouting' ? (dict.admin.nodes.copied || 'Copied!') : (dict.admin.nodes.copy_button || 'Copy')}</span>
                      </button>
                    </div>
                    <pre className="bg-slate-950 p-4 rounded-xl text-xs text-emerald-400 overflow-x-auto border border-slate-800 font-mono">
                      <code>{JSON.stringify(instructionsData.masterSnippets.routingRule, null, 2)}</code>
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-300 bg-emerald-950/40 border border-emerald-800/40 rounded-lg p-3 flex-1 mr-3">
                      {dict.admin.nodes.node_desc || "Use this configuration for xray/config.json on Node server:"}
                    </p>
                    <button
                      onClick={() => handleCopy(instructionsData.nodeSnippets.fullConfig, 'nodeConfigFull')}
                      className="text-xs flex items-center space-x-1 text-slate-400 hover:text-emerald-400 bg-slate-800 px-3 py-2 rounded-lg transition-colors shrink-0"
                    >
                      {copiedKey === 'nodeConfigFull' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedKey === 'nodeConfigFull' ? (dict.admin.nodes.copied || 'Copied!') : 'Copy full config'}</span>
                    </button>
                  </div>

                  {/* API Inbound */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold text-slate-200">1. inbounds — API (stats socket):</h4>
                      <button
                        onClick={() => handleCopy(JSON.stringify(instructionsData.nodeSnippets.apiInbound, null, 2), 'nodeApiInbound')}
                        className="text-xs flex items-center space-x-1 text-slate-400 hover:text-emerald-400 bg-slate-800 px-2.5 py-1 rounded transition-colors"
                      >
                        {copiedKey === 'nodeApiInbound' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copiedKey === 'nodeApiInbound' ? (dict.admin.nodes.copied || 'Copied!') : (dict.admin.nodes.copy_button || 'Copy')}</span>
                      </button>
                    </div>
                    <pre className="bg-slate-950 p-4 rounded-xl text-xs text-emerald-400 overflow-x-auto border border-slate-800 font-mono">
                      <code>{JSON.stringify(instructionsData.nodeSnippets.apiInbound, null, 2)}</code>
                    </pre>
                  </div>

                  {/* VLESS Inbound */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold text-slate-200">2. inbounds — VLESS REALITY (main):</h4>
                      <button
                        onClick={() => handleCopy(JSON.stringify(instructionsData.nodeSnippets.vlessInbound, null, 2), 'nodeVlessInbound')}
                        className="text-xs flex items-center space-x-1 text-slate-400 hover:text-emerald-400 bg-slate-800 px-2.5 py-1 rounded transition-colors"
                      >
                        {copiedKey === 'nodeVlessInbound' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copiedKey === 'nodeVlessInbound' ? (dict.admin.nodes.copied || 'Copied!') : (dict.admin.nodes.copy_button || 'Copy')}</span>
                      </button>
                    </div>
                    <pre className="bg-slate-950 p-4 rounded-xl text-xs text-emerald-400 overflow-x-auto border border-slate-800 font-mono">
                      <code>{JSON.stringify(instructionsData.nodeSnippets.vlessInbound, null, 2)}</code>
                    </pre>
                  </div>

                  {/* Outbounds */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold text-slate-200">3. outbounds:</h4>
                      <button
                        onClick={() => handleCopy(JSON.stringify(instructionsData.nodeSnippets.outbounds, null, 2), 'nodeOutbounds')}
                        className="text-xs flex items-center space-x-1 text-slate-400 hover:text-emerald-400 bg-slate-800 px-2.5 py-1 rounded transition-colors"
                      >
                        {copiedKey === 'nodeOutbounds' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copiedKey === 'nodeOutbounds' ? (dict.admin.nodes.copied || 'Copied!') : (dict.admin.nodes.copy_button || 'Copy')}</span>
                      </button>
                    </div>
                    <pre className="bg-slate-950 p-4 rounded-xl text-xs text-emerald-400 overflow-x-auto border border-slate-800 font-mono">
                      <code>{JSON.stringify(instructionsData.nodeSnippets.outbounds, null, 2)}</code>
                    </pre>
                  </div>

                  {/* Routing */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold text-slate-200">4. routing:</h4>
                      <button
                        onClick={() => handleCopy(JSON.stringify(instructionsData.nodeSnippets.routing, null, 2), 'nodeRouting')}
                        className="text-xs flex items-center space-x-1 text-slate-400 hover:text-emerald-400 bg-slate-800 px-2.5 py-1 rounded transition-colors"
                      >
                        {copiedKey === 'nodeRouting' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copiedKey === 'nodeRouting' ? (dict.admin.nodes.copied || 'Copied!') : (dict.admin.nodes.copy_button || 'Copy')}</span>
                      </button>
                    </div>
                    <pre className="bg-slate-950 p-4 rounded-xl text-xs text-emerald-400 overflow-x-auto border border-slate-800 font-mono">
                      <code>{JSON.stringify(instructionsData.nodeSnippets.routing, null, 2)}</code>
                    </pre>
                  </div>

                  {/* Stats / API / Policy */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold text-slate-200">5. stats, api, policy:</h4>
                      <button
                        onClick={() => handleCopy(JSON.stringify({ stats: instructionsData.nodeSnippets.stats, api: instructionsData.nodeSnippets.api, policy: instructionsData.nodeSnippets.policy }, null, 2), 'nodeExtras')}
                        className="text-xs flex items-center space-x-1 text-slate-400 hover:text-emerald-400 bg-slate-800 px-2.5 py-1 rounded transition-colors"
                      >
                        {copiedKey === 'nodeExtras' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copiedKey === 'nodeExtras' ? (dict.admin.nodes.copied || 'Copied!') : (dict.admin.nodes.copy_button || 'Copy')}</span>
                      </button>
                    </div>
                    <pre className="bg-slate-950 p-4 rounded-xl text-xs text-emerald-400 overflow-x-auto border border-slate-800 font-mono">
                      <code>{JSON.stringify({ stats: instructionsData.nodeSnippets.stats, api: instructionsData.nodeSnippets.api, policy: instructionsData.nodeSnippets.policy }, null, 2)}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-800 flex justify-end bg-slate-900/50">
              <button
                type="button"
                onClick={closeInstructions}
                className="px-6 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
              >
                {dict.admin.nodes.close || "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
