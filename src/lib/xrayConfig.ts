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
    if (node.apiHost.includes('unix://')) {
      // Master already has local api.sock configured by default
      continue; 
    }

    const hostParts = node.apiHost.replace('http://', '').split(':');
    if (hostParts.length !== 2) continue;
    const grpcPort = parseInt(hostParts[1]);

    const inboundTag = `grpc-in-${node.id}`;
    const outboundTag = `vless-out-${node.id}`;

    // 1. Inbound (dokodemo-door) listening on grpcPort, forwarding to remote grpc port (8080)
    config.inbounds.push({
      tag: inboundTag,
      listen: "127.0.0.1",
      port: grpcPort,
      protocol: "dokodemo-door",
      settings: {
        address: "127.0.0.1", 
        port: 8080,
        network: "tcp"
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

  const configPath = path.join(process.cwd(), 'xray', 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log("Regenerated xray config.");

  // Restart Xray container
  try {
    // If running in docker, we restart the nadamudash-xray container
    await execAsync('docker restart nadamudash-xray').catch(() => {});
  } catch (e) {
    console.warn("Could not restart docker xray:", e);
  }
}
