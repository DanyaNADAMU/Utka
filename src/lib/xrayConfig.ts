import { generateKeyPairSync } from 'crypto';

export function generateRealityKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync('x25519');
  const pub = publicKey.export({ type: 'spki', format: 'der' }).slice(-32).toString('base64url');
  const priv = privateKey.export({ type: 'pkcs8', format: 'der' }).slice(-32).toString('base64url');
  return { publicKey: pub, privateKey: priv };
}

export function generateMasterNodeConfigSnippet(node: {
  id: string;
  name: string;
  address: string;
  port: number;
  xrayPort?: number | null;
  adminUuid?: string | null;
  realityServerName?: string | null;
  realityPubKey?: string | null;
  realityPrivKey?: string | null;
  realityShortId?: string | null;
}) {
  const inboundTag = `grpc-in-${node.id}`;
  const outboundTag = `vless-out-${node.id}`;

  const inbound = {
    tag: inboundTag,
    listen: `/etc/xray/node-${node.id}.sock`,
    port: 1,
    protocol: "dokodemo-door",
    settings: {
      address: "127.0.0.1",
      port: 1,
      network: "unix"
    }
  };

  const outbound = {
    tag: outboundTag,
    protocol: "vless",
    settings: {
      vnext: [
        {
          address: node.address,
          port: node.port,
          users: [
            {
              id: node.adminUuid || "YOUR_ADMIN_UUID",
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
        serverName: node.realityServerName || process.env.XRAY_SNI || "",
        fingerprint: "chrome",
        show: false,
        publicKey: node.realityPubKey || "YOUR_REALITY_PUBLIC_KEY",
        shortId: node.realityShortId || "YOUR_REALITY_SHORT_ID",
        spiderX: ""
      }
    }
  };

  const routingRule = {
    type: "field",
    inboundTag: [inboundTag],
    outboundTag: outboundTag
  };

  return {
    inbound,
    outbound,
    routingRule,
    masterSnippetsJson: JSON.stringify(
      {
        inbound,
        outbound,
        routingRule
      },
      null,
      2
    )
  };
}

export function generateNodeConfigSnippet(node: {
  id: string;
  name: string;
  address: string;
  port: number;
  xrayPort?: number | null;
  adminUuid?: string | null;
  realityServerName?: string | null;
  realityPubKey?: string | null;
  realityPrivKey?: string | null;
  realityShortId?: string | null;
}) {
  const serverName = node.realityServerName || process.env.XRAY_SNI || "";
  const internalPort = node.xrayPort || 8443;

  const apiInbound = {
    tag: "api",
    listen: "/etc/xray/api.sock",
    port: 1,
    protocol: "dokodemo-door",
    settings: {
      address: "127.0.0.1",
      port: 1,
      network: "unix"
    }
  };

  const vlessInbound = {
    tag: "vless-in",
    listen: "127.0.0.1",
    port: internalPort,
    protocol: "vless",
    settings: {
      clients: [
        {
          id: node.adminUuid || "YOUR_ADMIN_UUID",
          email: "admin@nadamudash"
        }
      ],
      decryption: "none"
    },
    streamSettings: {
      network: "tcp",
      security: "reality",
      realitySettings: {
        show: false,
        dest: `${serverName}:443`,
        xver: 0,
        serverNames: [serverName],
        privateKey: node.realityPrivKey || "YOUR_REALITY_PRIVATE_KEY_HERE",
        shortIds: [node.realityShortId || "YOUR_REALITY_SHORT_ID"]
      },
      sockopt: {
        acceptProxyProtocol: false
      }
    },
    sniffing: {
      enabled: true,
      destOverride: ["http", "tls", "quic"]
    }
  };

  const outbounds = [
    { protocol: "freedom", tag: "direct" },
    { protocol: "blackhole", tag: "block" }
  ];

  const routing = {
    rules: [
      { type: "field", inboundTag: ["api"], outboundTag: "api" },
      { type: "field", user: ["admin@nadamudash"], outboundTag: "api" },
      { type: "field", ip: ["127.0.0.0/8", "::1/128"], outboundTag: "block" }
    ]
  };

  const stats = {};

  const api = {
    tag: "api",
    services: ["HandlerService", "StatsService", "LoggerService"]
  };

  const policy = {
    levels: {
      "0": { statsUserUplink: true, statsUserDownlink: true }
    },
    system: {
      statsInboundUplink: true,
      statsInboundDownlink: true,
      statsOutboundUplink: true,
      statsOutboundDownlink: true
    }
  };

  const fullConfig = {
    log: { loglevel: "warning" },
    inbounds: [apiInbound, vlessInbound],
    outbounds,
    routing,
    stats,
    api,
    policy,
  };

  return {
    apiInbound,
    vlessInbound,
    outbounds,
    routing,
    stats,
    api,
    policy,
    fullConfig: JSON.stringify(fullConfig, null, 2),
  };
}

// Deprecated no-op function kept for backward compatibility (config editing via panel is disabled)
export async function regenerateMasterXrayConfig() {
  console.log("[xrayConfig] Automated config modification is disabled. Panel operates in read-only mode.");
}
