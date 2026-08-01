'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserAccessAction } from '@/app/admin/users/actions';
import { useTranslation } from '@/i18n/LanguageProvider';

interface NodeAccess {
  id: string;
  name: string;
}

interface EditUserAccessModalProps {
  subscriptionId: string;
  nodes: NodeAccess[];
  allTags: string[];
  currentAccess: { nodeId: string; inboundTag: string }[];
}

export default function EditUserAccessModal({
  subscriptionId,
  nodes,
  allTags,
  currentAccess,
}: EditUserAccessModalProps) {
  const dict = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [selected, setSelected] = useState<Set<string>>(new Set(
    currentAccess.map(a => `${a.nodeId}:${a.inboundTag}`)
  ));

  const handleToggle = (nodeId: string, tag: string) => {
    const key = `${nodeId}:${tag}`;
    const newSelected = new Set(selected);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelected(newSelected);
  };

  const handleSave = async () => {
    setLoading(true);
    
    // Convert Set back to required format
    const accessMap = new Map<string, string[]>();
    Array.from(selected).forEach(key => {
      const [nodeId, tag] = key.split(':');
      if (!accessMap.has(nodeId)) {
        accessMap.set(nodeId, []);
      }
      accessMap.get(nodeId)!.push(tag);
    });

    const accessData = Array.from(accessMap.entries()).map(([nodeId, inboundTags]) => ({
      nodeId,
      inboundTags,
    }));

    // If a node was completely unselected, we should still include it with an empty array if we wanted to be explicit,
    // but the action parses the entire list of desired access. So omitting a node means no access on it, which is correct.

    try {
      const res = await updateUserAccessAction(subscriptionId, accessData);
      if (res.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        alert(res.error || 'Error updating access');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating access');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setSelected(new Set(currentAccess.map(a => `${a.nodeId}:${a.inboundTag}`)));
          setIsOpen(true);
        }}
        className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl transition-colors font-medium text-sm flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        {(dict.admin?.users?.profile as any)?.manage_access || "Manage Access"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100">
                {(dict.admin?.users?.profile as any)?.manage_access || "Manage Access"}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {nodes.map(node => (
                <div key={node.id} className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{node.name}</h3>
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl divide-y divide-slate-800/50">
                    {allTags.map(tag => {
                      const key = `${node.id}:${tag}`;
                      const isChecked = selected.has(key);
                      return (
                        <label key={tag} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-800/30 transition-colors">
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={isChecked}
                              onChange={() => handleToggle(node.id, tag)}
                            />
                            <div className="w-5 h-5 border-2 border-slate-600 rounded bg-transparent peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center">
                              <svg className={`w-3 h-3 text-white pointer-events-none ${isChecked ? 'opacity-100' : 'opacity-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                          <span className="text-sm text-slate-200">{tag}</span>
                        </label>
                      );
                    })}
                    {allTags.length === 0 && (
                      <div className="p-3 text-sm text-slate-500 italic">No inbounds available</div>
                    )}
                  </div>
                </div>
              ))}
              
              {nodes.length === 0 && (
                <div className="text-center py-4 text-slate-400">
                  No active servers found.
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50 rounded-b-2xl mt-auto">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-xl transition-colors font-medium text-sm"
              >
                {dict.common?.cancel || "Cancel"}
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-colors font-medium text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {loading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {dict.common?.save || "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
