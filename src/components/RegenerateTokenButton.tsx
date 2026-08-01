'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { regenerateTokenAction } from '@/app/admin/users/actions';
import { useTranslation } from '@/i18n/LanguageProvider';

export default function RegenerateTokenButton({ subscriptionId }: { subscriptionId: string }) {
  const dict = useTranslation();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegenerate = async () => {
    if (!confirm((dict.admin?.users?.profile as any)?.regenerate_confirm || "Are you sure you want to regenerate the token? The old link will stop working.")) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await regenerateTokenAction(subscriptionId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Error regenerating token');
      }
    } catch (err) {
      console.error(err);
      alert('Error regenerating token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRegenerate}
      disabled={loading}
      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50 flex items-center justify-center"
      title={(dict.admin?.users?.profile as any)?.regenerate_token || "Regenerate Token"}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )}
    </button>
  );
}
