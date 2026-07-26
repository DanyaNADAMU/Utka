import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const sub = await db.subscription.findUnique({
    where: { token },
    include: { node: true }
  });

  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update last fetched timestamp
  await db.subscription.update({
    where: { id: sub.id },
    data: { lastFetched: new Date() }
  });

  const uuid = sub.xrayUuid;
  const address = sub.node.address;
  const port = sub.node.port;
  const name = encodeURIComponent(sub.name || "NadamuDash");
  
  const pbk = process.env.XRAY_PUBLIC_KEY || "YOUR_PUBLIC_KEY";
  const sid = process.env.XRAY_SHORT_ID || "YOUR_SHORT_ID";
  const sni = process.env.XRAY_SNI || "biz.mail.ru";

  const vlessLink = `vless://${uuid}@${address}:${port}?encryption=none&flow=xtls-rprx-vision&security=reality&sni=${sni}&fp=chrome&pbk=${pbk}&sid=${sid}&type=tcp&headerType=none#${name}`;
  
  const base64Link = Buffer.from(vlessLink).toString('base64');
  
  return new NextResponse(base64Link, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}
