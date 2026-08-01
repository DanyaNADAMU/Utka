'use client';

import { useState, useTransition } from 'react';
import { createNode, updateNode, deleteNode } from './actions';
import { Plus, Edit2, Trash2 } from 'lucide-react';
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
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    port: '',
    apiHost: '',
    adminUuid: '',
    realityServerName: 'biz.mail.ru',
    realityPubKey: '',
    realityShortId: '',
    isActive: true,
  });

  const openModal = (node?: Node) => {
    if (node) {
      setEditingNode(node);
      setFormData({
        name: node.name,
        address: node.address,
        port: node.port.toString(),
        apiHost: node.apiHost,
        adminUuid: node.adminUuid || '',
        realityServerName: node.realityServerName || 'biz.mail.ru',
        realityPubKey: node.realityPubKey || '',
        realityShortId: node.realityShortId || '',
        isActive: node.isActive,
      });
    } else {
      setEditingNode(null);
      setFormData({
        name: '',
        address: '',
        port: '',
        apiHost: '',
        adminUuid: '',
        realityServerName: 'biz.mail.ru',
        realityPubKey: '',
        realityShortId: '',
        isActive: true,
      });
    }
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
          port: parseInt(formData.port),
          apiHost: formData.apiHost,
          adminUuid: formData.adminUuid,
          realityServerName: formData.realityServerName,
          realityPubKey: formData.realityPubKey,
          realityShortId: formData.realityShortId,
          isActive: formData.isActive,
        };

        if (editingNode) {
          const updated = await updateNode(editingNode.id, payload);
          setNodes(nodes.map(n => n.id === updated.id ? updated : n));
        } else {
          const created = await createNode(payload);
          setNodes([created, ...nodes]);
        }
        closeModal();
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
          onClick={() => openModal()}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg shadow-emerald-500/20"
        >
          <Plus size={18} />
          <span>{dict.admin.nodes.add_node}</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-sm border-b border-slate-800">
                <th className="p-4 font-medium text-slate-400">{dict.admin.nodes.table.name}</th>
                <th className="p-4 font-medium text-slate-400">{dict.admin.nodes.table.address}</th>
                <th className="p-4 font-medium text-slate-400">{dict.admin.nodes.table.port}</th>
                <th className="p-4 font-medium text-slate-400">API Host</th>
                <th className="p-4 font-medium text-slate-400">{dict.admin.nodes.table.status}</th>
                <th className="p-4 font-medium text-slate-400">Connection</th>
                <th className="p-4 font-medium text-slate-400 text-right">{dict.admin.nodes.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {nodes.map(node => (
                <tr key={node.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-white font-medium">{node.name}</td>
                  <td className="p-4 text-slate-300">{node.address}</td>
                  <td className="p-4 text-slate-300">{node.port}</td>
                  <td className="p-4 font-mono text-sm text-slate-400">{node.apiHost}</td>
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
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => openModal(node)}
                      className="text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg inline-flex items-center justify-center"
                      title={dict.admin.nodes.edit_node}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(node.id)}
                      className="text-slate-400 hover:text-red-400 transition-colors px-2 py-1.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg inline-flex items-center justify-center"
                      title={dict.admin.nodes.delete_node}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {editingNode ? dict.admin.nodes.edit_node : dict.admin.nodes.add_node}
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

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{dict.admin.nodes.form.port}</label>
                  <input
                    type="number"
                    required
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{dict.admin.nodes.form.adminUuid}</label>
                  <input
                    type="text"
                    value={formData.adminUuid}
                    onChange={(e) => setFormData({ ...formData, adminUuid: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    placeholder="Leave empty for auto-generate"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{dict.admin.nodes.form.realityServerName}</label>
                  <input
                    type="text"
                    value={formData.realityServerName}
                    onChange={(e) => setFormData({ ...formData, realityServerName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    placeholder="e.g. biz.mail.ru"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">{dict.admin.nodes.form.realityPubKey}</label>
                    <input
                      type="text"
                      value={formData.realityPubKey}
                      onChange={(e) => setFormData({ ...formData, realityPubKey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      placeholder="Optional for local"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">{dict.admin.nodes.form.realityShortId}</label>
                    <input
                      type="text"
                      value={formData.realityShortId}
                      onChange={(e) => setFormData({ ...formData, realityShortId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      placeholder="Optional for local"
                    />
                  </div>
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
    </div>
  );
}
