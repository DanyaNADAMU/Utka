import db from '@/lib/db';
import NodesClient from './NodesClient';
import { getDictionary } from '@/i18n/dictionaries';
import { fetchTrafficState } from '@/lib/trafficClient';

export const dynamic = 'force-dynamic';

export default async function NodesPage() {
  const masterApiHost = process.env.XRAY_API_URL || 'unix:///run/xray/xray-api.sock';
  
  let masterNode = await db.node.findFirst({
    where: { OR: [{ isMaster: true }, { apiHost: masterApiHost }] }
  });

  if (!masterNode) {
    masterNode = await db.node.create({
      data: {
        name: 'Master',
        address: process.env.XRAY_SERVER_DOMAIN || process.env.XRAY_SERVER_DOMAIN_OR_IP || '127.0.0.1',
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

  await db.node.updateMany({
    where: { realityServerName: 'biz.mail.ru' },
    data: { realityServerName: '' }
  });

  const nodes = await db.node.findMany({
    orderBy: [
      { isMaster: 'desc' },
      { name: 'asc' }
    ]
  });
  
  const dict = await getDictionary();
  const trafficState = await fetchTrafficState();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">{dict.admin.nodes.title}</h1>
        <p className="text-slate-400 mt-2">
          {dict.admin.nodes.subtitle}
        </p>
      </div>
      
      <NodesClient initialNodes={nodes} dict={dict} nodeStatus={trafficState.nodes || {}} />
    </div>
  );
}
