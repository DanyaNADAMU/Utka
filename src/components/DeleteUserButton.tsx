'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUserAction } from '@/app/admin/users/actions';
import { useTranslation } from '@/i18n/LanguageProvider';

export default function DeleteUserButton({ subscriptionId }: { subscriptionId: string }) {
  const dict = useTranslation();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(dict.admin?.users?.profile?.delete_confirm || "Are you sure you want to delete this user? All their access will be revoked.")) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await deleteUserAction(subscriptionId);
      if (res.success) {
        router.push('/admin/users');
      } else {
        alert(res.error || 'Error deleting user');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting user');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50"
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )}
      {dict.admin?.users?.profile?.delete_user || "Delete User"}
    </button>
  );
}
