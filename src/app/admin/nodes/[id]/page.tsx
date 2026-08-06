import db from '@/lib/db';
import { getDictionary } from '@/i18n/dictionaries';
import { notFound } from 'next/navigation';
import NodeDetailClient from './NodeDetailClient';
import { nodeStatusState } from '@/lib/trafficDaemon';
import { generateNodeConfigSnippet, generateMasterNodeConfigSnippet } from '@/lib/xrayConfig';

import { getXrayInboundTags } from '@/lib/xray';

export const dynamic = 'force-dynamic';

export default async function NodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const node = await db.node.findUnique({
    where: { id }
  });

  if (!node) {
    notFound();
  }

  if (node.realityServerName === 'biz.mail.ru') {
    await db.node.update({
      where: { id: node.id },
      data: { realityServerName: '' }
    });
    node.realityServerName = '';
  }

  if (node.inboundSettings && node.inboundSettings.includes('biz.mail.ru')) {
    const cleanedSettings = node.inboundSettings.replaceAll('biz.mail.ru', '');
    await db.node.update({
      where: { id: node.id },
      data: { inboundSettings: cleanedSettings }
    });
    node.inboundSettings = cleanedSettings;
  }

  const dict = await getDictionary();

  // Status is maintained in nodeStatusState
  const isOnline = nodeStatusState[node.id] || false;
  const masterSnippets = generateMasterNodeConfigSnippet(node);
  const nodeSnippets = generateNodeConfigSnippet(node);
  const activeInbounds = await getXrayInboundTags(node.apiHost);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <NodeDetailClient 
        node={node} 
        dict={dict} 
        initialIsOnline={isOnline} 
        masterSnippets={masterSnippets}
        nodeSnippets={nodeSnippets}
        activeInbounds={activeInbounds}
      />
    </div>
  );
}

