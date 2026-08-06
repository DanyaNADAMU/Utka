import db from '@/lib/db';
import NodesClient from './NodesClient';
import { getDictionary } from '@/i18n/dictionaries';
import { nodeStatusState } from '@/lib/trafficDaemon';

export const dynamic = 'force-dynamic';

export default async function NodesPage() {
  const masterApiHost = process.env.XRAY_API_URL || 'unix:///app/xray/api.sock';
  
  let masterNode = await db.node.findFirst({
    where: { OR: [{ isMaster: true }, { apiHost: masterApiHost }] }
  });

  if (!masterNode) {
    masterNode = await db.node.create({
      data: {
        name: 'Master',
        address: process.env.XRAY_SERVER_DOMAIN || 'nada.mu',
        port: 443,
        apiHost: masterApiHost,
        isMaster: true,
        isActive: true
      }
    });
  } else if (!masterNode.isMaster || masterNode.apiHost !== masterApiHost) {
    await db.node.update({
      where: { id: masterNode.id },
      data: { isMaster: true, apiHost: masterApiHost }
    });
    masterNode.apiHost = masterApiHost;
    masterNode.isMaster = true;
  }

  const nodes = await db.node.findMany({
    orderBy: [
      { isMaster: 'desc' },
      { name: 'asc' }
    ]
  });
  
  const dict = await getDictionary();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">{dict.admin.nodes.title}</h1>
        <p className="text-slate-400 mt-2">
          {dict.admin.nodes.subtitle}
        </p>
      </div>
      
      <NodesClient initialNodes={nodes} dict={dict} nodeStatus={nodeStatusState} />
    </div>
  );
}
