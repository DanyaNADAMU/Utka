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
  const domain = node.realityServerName || process.env.XRAY_SNI || "example.com";

  const inbound = {
    tag: inboundTag,
    listen: `/opt/stacks/nadamudash/xray/node-${node.id}.sock`,
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
          port: 443,
          users: [
            {
              id: node.adminUuid || "YOUR_ADMIN_UUID",
              encryption: "none",
              flow: "xtls-rprx-vision"
            }
          ]
        }
      ]
    },
    streamSettings: {
      network: "tcp",
      security: "reality",
      realitySettings: {
        serverName: domain,
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
    inboundJson: JSON.stringify(inbound, null, 2),
    outboundJson: JSON.stringify(outbound, null, 2),
    routingRuleJson: JSON.stringify(routingRule, null, 2),
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
  const domain = node.realityServerName || process.env.XRAY_SNI || "example.com";
  const nodeTag = node.name || "NodeTag";
  const port = node.port || 443;
  const adminUuid = node.adminUuid || "YOUR_ADMIN_UUID";
  const bridgeUuid = "373087a1-0076-4fbf-9a47-2e450fa285bc";

  const dns = {
    servers: [
      "1.1.1.1",
      "8.8.8.8",
      "localhost"
    ]
  };

  const log = {
    access: "/var/log/xray/access.log",
    error: "/var/log/xray/error.log",
    loglevel: "warning"
  };

  const api = {
    tag: "api",
    services: [
      "HandlerService",
      "StatsService",
      "LoggerService"
    ]
  };

  const stats = {};

  const policy = {
    levels: {
      "0": {
        statsUserUplink: true,
        statsUserDownlink: true
      }
    },
    system: {
      statsInboundUplink: true,
      statsInboundDownlink: true,
      statsOutboundUplink: true,
      statsOutboundDownlink: true
    }
  };

  const nodeInbound = {
    tag: nodeTag,
    listen: "127.0.0.1",
    port: port,
    protocol: "vless",
    settings: {
      clients: [
        {
          id: adminUuid,
          email: "admin@nadamudash",
          flow: "xtls-rprx-vision"
        },
        {
          id: bridgeUuid,
          email: "bridge@nadamudash",
          flow: "xtls-rprx-vision"
        }
      ],
      decryption: "none"
    },
    streamSettings: {
      network: "tcp",
      tcpSettings: {
        acceptProxyProtocol: true
      },
      security: "reality",
      realitySettings: {
        show: false,
        dest: `${domain}:443`,
        xver: 0,
        serverNames: [
          domain
        ],
        privateKey: node.realityPrivKey || "YOUR_REALITY_PRIVATE_KEY",
        shortIds: [
          node.realityShortId || "YOUR_REALITY_SHORT_ID"
        ]
      },
      sockopt: {
        acceptProxyProtocol: true
      }
    },
    sniffing: {
      enabled: true,
      destOverride: [
        "http",
        "tls",
        "quic"
      ],
      routeOnly: true
    }
  };

  const outbounds = [
    {
      protocol: "freedom",
      tag: "direct"
    },
    {
      protocol: "blackhole",
      tag: "block"
    }
  ];

  const routing = {
    domainStrategy: "IPIfNonMatch",
    rules: [
      {
        type: "field",
        user: [
          "admin@nadamudash"
        ],
        outboundTag: "api"
      },
      {
        type: "field",
        ip: [
          "geoip:private"
        ],
        outboundTag: "block"
      },
      {
        type: "field",
        protocol: [
          "bittorrent"
        ],
        outboundTag: "block"
      },
      {
        type: "field",
        inboundTag: [
          nodeTag
        ],
        outboundTag: "direct"
      }
    ]
  };

  const fullNodeConfig = {
    dns,
    log,
    api,
    stats,
    policy,
    inbounds: [nodeInbound],
    outbounds,
    routing
  };

  // Master Setup Snippets
  const masterApiInbound = {
    tag: "api",
    listen: "/opt/stacks/nadamudash/xray/api.sock",
    port: 1,
    protocol: "dokodemo-door",
    settings: {
      address: "127.0.0.1",
      port: 1,
      network: "unix"
    }
  };

  const masterApiRoutingRule = {
    type: "field",
    inboundTag: [
      "api"
    ],
    outboundTag: "api"
  };

  return {
    fullNodeConfigJson: JSON.stringify(fullNodeConfig, null, 2),
    masterApiInboundJson: JSON.stringify(masterApiInbound, null, 2),
    masterApiRoutingRuleJson: JSON.stringify(masterApiRoutingRule, null, 2),
    systemBlocksJson: JSON.stringify({ dns, log, api, stats, policy }, null, 2),
  };
}

// Deprecated no-op function kept for backward compatibility (config editing via panel is disabled)
export async function regenerateMasterXrayConfig() {
  console.log("[xrayConfig] Automated config modification is disabled. Panel operates in read-only mode.");
}
