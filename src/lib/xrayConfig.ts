import fs from 'fs';
import path from 'path';
import db from './db';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function regenerateMasterXrayConfig() {
  const activeNodes = await db.node.findMany({ where: { isActive: true } });
  
  const config: any = {
    log: {
      access: "/var/log/xray/access.log",
      error: "/var/log/xray/error.log",
      loglevel: "warning"
    },
    api: {
      tag: "api",
      services: ["HandlerService", "StatsService"]
    },
    stats: {},
    policy: {
      levels: {
        "0": { statsUserUplink: true, statsUserDownlink: true }
      },
      system: {
        statsInboundUplink: true, statsInboundDownlink: true,
        statsOutboundUplink: true, statsOutboundDownlink: true
      }
    },
    inbounds: [
      {
        listen: "/etc/xray/api.sock",
        port: 1,
        protocol: "dokodemo-door",
        settings: { address: "127.0.0.1", port: 1, network: "unix" },
        tag: "api"
      }
    ],
    outbounds: [
      { protocol: "freedom", tag: "direct" },
      { protocol: "blackhole", tag: "block" }
    ],
    routing: {
      domainStrategy: "IPIfNonMatch",
      rules: [
        { type: "field", inboundTag: ["api"], outboundTag: "api" },
        { type: "field", ip: ["geoip:private"], outboundTag: "block" }
      ]
    }
  };

  for (const node of activeNodes) {
    const isLocal = node.address === '127.0.0.1' || node.address === 'localhost' || node.apiHost === 'unix:///app/xray/api.sock';
    const expectedApiHost = isLocal ? 'unix:///app/xray/api.sock' : `unix:///app/xray/node-${node.id}.sock`;

    if (node.apiHost !== expectedApiHost) {
      await db.node.update({
        where: { id: node.id },
        data: { apiHost: expectedApiHost }
      }).catch(console.error);
      node.apiHost = expectedApiHost;
    }

    if (isLocal) {
      continue; 
    }

    const inboundTag = `grpc-in-${node.id}`;
    const outboundTag = `vless-out-${node.id}`;

    // 1. Inbound (dokodemo-door) listening on Unix Domain Socket /etc/xray/node-[id].sock
    config.inbounds.push({
      tag: inboundTag,
      listen: `/etc/xray/node-${node.id}.sock`,
      port: 1,
      protocol: "dokodemo-door",
      settings: {
        address: "/etc/xray/api.sock", 
        port: 1,
        network: "unix"
      }
    });

    // 2. Outbound (vless reality) to the remote Node
    config.outbounds.push({
      tag: outboundTag,
      protocol: "vless",
      settings: {
        vnext: [
          {
            address: node.address,
            port: node.port, 
            users: [
              {
                id: node.adminUuid,
                encryption: "none"
              }
            ]
          }
        ]
      },
      streamSettings: {
        network: "tcp",
        security: "reality",
        realitySettings: {
          serverName: (node as any).realityServerName || "biz.mail.ru",
          fingerprint: "chrome",
          show: false,
          publicKey: (node as any).realityPubKey || "", 
          shortId: (node as any).realityShortId || "",
          spiderX: ""
        }
      }
    });

    // 3. Routing rule to bind the inbound to the outbound
    config.routing.rules.push({
      type: "field",
      inboundTag: [inboundTag],
      outboundTag: outboundTag
    });
  }

  try {
    const xrayDir = path.join(process.cwd(), 'xray');
    if (fs.existsSync(xrayDir)) {
      const files = fs.readdirSync(xrayDir);
      for (const f of files) {
        if (f.startsWith('node-') && f.endsWith('.sock')) {
          try { fs.unlinkSync(path.join(xrayDir, f)); } catch {}
        }
      }
    }
    const configPath = path.join(xrayDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("Regenerated xray config.");
  } catch (err) {
    console.error("Failed to write xray config.json:", err);
  }

  // Attempt to restart Xray container if docker socket is available
  try {
    const res = await execAsync('docker restart nadamudash-xray');
    console.log("[Daemon] Restarted nadamudash-xray container:", res.stdout.trim());
  } catch (e) {
    console.warn("[Daemon] Could not restart docker xray:", e);
  }
}
