import db from '@/lib/db';
import NodesClient from './NodesClient';
import { getDictionary } from '@/i18n/dictionaries';

export const dynamic = 'force-dynamic';

export default async function NodesPage() {
  const nodes = await db.node.findMany();
  
  const dict = await getDictionary();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">{dict.admin.nodes.title}</h1>
          <p className="text-slate-400 text-sm mt-1">{dict.admin.nodes.subtitle}</p>
        </div>
      </div>
      
      <NodesClient initialNodes={nodes} dict={dict} />
    </div>
  );
}
