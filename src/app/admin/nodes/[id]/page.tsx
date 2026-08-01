import db from '@/lib/db';
import { getDictionary } from '@/i18n/dictionaries';
import { notFound } from 'next/navigation';
import NodeDetailClient from './NodeDetailClient';
import { nodeStatusState } from '@/lib/trafficDaemon';

export const dynamic = 'force-dynamic';

export default async function NodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const node = await db.node.findUnique({
    where: { id }
  });

  const masterApiHost = process.env.XRAY_API_URL || 'xray:7999';
  if (!node || node.apiHost === masterApiHost) {
    notFound();
  }

  const dict = await getDictionary();

  // Status is maintained in nodeStatusState
  const isOnline = nodeStatusState[node.id] || false;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <NodeDetailClient node={node} dict={dict} initialIsOnline={isOnline} />
    </div>
  );
}
