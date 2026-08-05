import db from '@/lib/db';
import NodesClient from './NodesClient';
import { getDictionary } from '@/i18n/dictionaries';
import { nodeStatusState } from '@/lib/trafficDaemon';

export const dynamic = 'force-dynamic';

export default async function NodesPage() {
  const masterApiHost = process.env.XRAY_API_URL || 'unix:///app/xray/api.sock';
  const nodes = await db.node.findMany({
    where: {
      NOT: { apiHost: masterApiHost }
    },
    orderBy: {
      name: 'asc'
    }
  });
  console.log("[DB Nodes]", JSON.stringify(nodes));
  
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
