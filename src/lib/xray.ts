import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import protobuf from 'protobufjs';
import path from 'path';
import db from './db';
import { getSettings } from './settings';

// Define paths to proto files
const PROXYMAN_PROTO = path.join(process.cwd(), 'src/proto/app/proxyman/command/command.proto');
const STATS_PROTO = path.join(process.cwd(), 'src/proto/app/stats/command/command.proto');
const VLESS_ACCOUNT_PROTO = path.join(process.cwd(), 'src/proto/proxy/vless/account.proto');

const loadOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [path.join(process.cwd(), 'src/proto')]
};

// Load gRPC services
const proxymanDef = protoLoader.loadSync(PROXYMAN_PROTO, loadOptions);
const statsDef = protoLoader.loadSync(STATS_PROTO, loadOptions);

const xrayProxyman = (grpc.loadPackageDefinition(proxymanDef) as any).xray.app.proxyman.command;
const xrayStats = (grpc.loadPackageDefinition(statsDef) as any).xray.app.stats.command;

const clientsCache: Record<string, { handler: any, stats: any }> = {};

export function invalidateClientCache(grpcHost: string) {
  const host = grpcHost || process.env.XRAY_API_URL || 'unix:///app/xray/api.sock';
  delete clientsCache[host];
}

export function getClients(grpcHost: string) {
  let host = grpcHost || process.env.XRAY_API_URL || 'unix:///app/xray/api.sock';
  
  if (!clientsCache[host]) {
    clientsCache[host] = {
      handler: new xrayProxyman.HandlerService(host, grpc.credentials.createInsecure()),
      stats: new xrayStats.StatsService(host, grpc.credentials.createInsecure())
    };
  }
  return clientsCache[host];
}

// Load protobufjs root for encoding TypedMessages
const root = new protobuf.Root();
try {
  root.resolvePath = function(origin, target) {
    if (target.match(/^(app|common|proxy|transport|core)\//)) {
      return path.join(process.cwd(), 'src/proto', target);
    }
    return protobuf.util.path.resolve(origin, target);
  };
  root.loadSync([PROXYMAN_PROTO, STATS_PROTO, VLESS_ACCOUNT_PROTO]);
} catch (e) {
  console.error("Failed to load Xray protobufs:", e);
}

/**
 * Add a VLESS user to an existing inbound
 */
export async function addVlessUser(grpcHost: string, inboundTag: string, email: string, uuid: string, flow?: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const { handler } = getClients(grpcHost);
      const Account = root.lookupType("xray.proxy.vless.Account");
      const defaultFlow = (process.env.XRAY_FLOW !== undefined)
        ? process.env.XRAY_FLOW
        : (process.env.XRAY_NETWORK === "ws" ? "" : "xtls-rprx-vision");
      const accountMsg = Account.create({
        id: uuid,
        flow: flow !== undefined ? flow : defaultFlow,
        encryption: "none"
      });
      const accountBytes = Account.encode(accountMsg).finish();

      const AddUserOperation = root.lookupType("xray.app.proxyman.command.AddUserOperation");
      const opMsg = AddUserOperation.create({
        user: {
          email: email,
          level: 0,
          account: {
            type: "xray.proxy.vless.Account",
            value: accountBytes
          }
        }
      });
      const opBytes = AddUserOperation.encode(opMsg).finish();

      handler.alterInbound({
        tag: inboundTag,
        operation: {
          type: "xray.app.proxyman.command.AddUserOperation",
          value: opBytes
        }
      }, (err: Error, res: any) => {
        if (err) {
          if (err.message && err.message.toLowerCase().includes("already exists")) {
            return resolve(true);
          }
          console.error("[Xray API] AddUser Error:", err);
          invalidateClientCache(grpcHost);
          return resolve(false);
        }
        resolve(true);
      });
    } catch (e) {
      console.error("[Xray API] AddUser Exception:", e);
      invalidateClientCache(grpcHost);
      resolve(false);
    }
  });
}

/**
 * Remove a VLESS user from an existing inbound
 */
export async function removeVlessUser(grpcHost: string, inboundTag: string, email: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const { handler } = getClients(grpcHost);
      const RemoveUserOperation = root.lookupType("xray.app.proxyman.command.RemoveUserOperation");
      const opMsg = RemoveUserOperation.create({
        email: email
      });
      const opBytes = RemoveUserOperation.encode(opMsg).finish();

      handler.alterInbound({
        tag: inboundTag,
        operation: {
          type: "xray.app.proxyman.command.RemoveUserOperation",
          value: opBytes
        }
      }, (err: Error, res: any) => {
        if (err) {
          if (err.message && (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("does not exist"))) {
            return resolve(true);
          }
          console.error("[Xray API] RemoveUser Error:", err);
          return resolve(false);
        }
        resolve(true);
      });
    } catch (e) {
      console.error("[Xray API] RemoveUser Exception:", e);
      resolve(false);
    }
  });
}

/**
 * Query traffic stats for a specific user email
 * Returns { up: number, down: number } (in bytes)
 */
export async function queryUserStats(grpcHost: string, emailPrefix: string, reset: boolean = false): Promise<{ up: bigint, down: bigint }> {
  return new Promise((resolve) => {
    const { stats } = getClients(grpcHost);
    stats.queryStats({
      pattern: `user>>>${emailPrefix}`,
      reset: reset
    }, (err: Error, res: any) => {
      if (err || !res || !res.stat) {
        return resolve({ up: BigInt(0), down: BigInt(0) });
      }

      let up = BigInt(0);
      let down = BigInt(0);

      res.stat.forEach((statObj: any) => {
        if (statObj.name.includes("downlink")) {
          down = BigInt(statObj.value);
        } else if (statObj.name.includes("uplink")) {
          up = BigInt(statObj.value);
        }
      });

      resolve({ up, down });
    });
  });
}

/**
 * Query traffic stats for all users
 * Returns a dictionary of email to { up, down }
 */
export async function queryAllUserStats(grpcHost: string, reset: boolean = false): Promise<Record<string, { up: bigint, down: bigint }> | null> {
  return new Promise((resolve) => {
    const { stats } = getClients(grpcHost);
    stats.queryStats({
      pattern: `user>>>`,
      reset: reset
    }, (err: Error, res: any) => {
      if (err) {
        console.error(`[Xray API QueryAllStats Error for ${grpcHost}]:`, err);
        invalidateClientCache(grpcHost);
        return resolve(null);
      }
      if (!res || !res.stat) {
        return resolve({});
      }

      const results: Record<string, { up: bigint, down: bigint }> = {};

      res.stat.forEach((statObj: any) => {
        // name looks like: "user>>>subId_inboundTag_uuid>>>traffic>>>downlink"
        const parts = statObj.name.split('>>>');
        if (parts.length >= 4) {
          const email = parts[1];
          const direction = parts[3]; // uplink or downlink
          
          if (!results[email]) {
            results[email] = { up: BigInt(0), down: BigInt(0) };
          }
          
          if (direction === "downlink") {
            results[email].down += BigInt(statObj.value);
          } else if (direction === "uplink") {
            results[email].up += BigInt(statObj.value);
          }
        }
      });

      resolve(results);
    });
  });
}

/**
 * Parses config.json and returns all inbound tags except 'api' (dokodemo-door)
 */
import fs from 'fs/promises';
import crypto from 'crypto';

export function getX25519PublicKey(privateKeyBase64url: string): string | null {
  try {
    const privBytes = Buffer.from(privateKeyBase64url, 'base64url');
    if (privBytes.length !== 32) return null;
    
    // PKCS#8 ASN.1 prefix for X25519 private key
    const privPrefix = Buffer.from('302e020100300506032b656e04220420', 'hex');
    const privDer = Buffer.concat([privPrefix, privBytes]);
    
    const privKey = crypto.createPrivateKey({
      key: privDer,
      format: 'der',
      type: 'pkcs8'
    });
    
    const pubKey = crypto.createPublicKey(privKey);
    const pubDer = pubKey.export({ format: 'der', type: 'spki' });
    
    // SPKI ASN.1 prefix for X25519 public key is 12 bytes
    const pubBytes = pubDer.slice(12);
    return pubBytes.toString('base64url');
  } catch (e) {
    console.error("Failed to derive public key:", e);
    return null;
  }
}

/**
 * Queries Xray via gRPC HandlerService ListInbounds to get active inbound tags
 */
export async function getXrayInboundTags(grpcHost: string): Promise<string[]> {
  return new Promise((resolve) => {
    try {
      const { handler } = getClients(grpcHost);
      handler.listInbounds({ isOnlyTags: true }, (err: Error, res: any) => {
        if (err) {
          console.error(`[Xray API] ListInbounds Error for ${grpcHost}:`, err);
          invalidateClientCache(grpcHost);
          return resolve([]);
        }
        if (!res || !res.inbounds || !Array.isArray(res.inbounds)) {
          return resolve([]);
        }
        const tags: string[] = res.inbounds
          .map((i: any) => i.tag || (typeof i === 'string' ? i : ''))
          .filter((t: string) => t && t !== 'api' && t !== 'dokodemo-door' && !t.startsWith('grpc-in'))
          .sort((a: string, b: string) => a.localeCompare(b));
        resolve(tags);
      });
    } catch (e) {
      console.error(`[Xray API] ListInbounds Exception for ${grpcHost}:`, e);
      invalidateClientCache(grpcHost);
      resolve([]);
    }
  });
}

export async function getClientInboundTags(grpcHost?: string): Promise<string[]> {
  const host = grpcHost || process.env.XRAY_API_URL || 'unix:///app/xray/api.sock';
  return getXrayInboundTags(host);
}

export async function buildClientLink(
  inboundTag: string, 
  xrayUuid: string, 
  nodeName: string, 
  nodeAddress: string, 
  nodePort: number,
  nodeReality?: { sni?: string | null; pbk?: string | null; sid?: string | null; path?: string | null },
  inboundOverrides?: { port?: number; flow?: string; network?: string; sni?: string; pbk?: string; sid?: string; path?: string; name?: string; serviceName?: string }
): Promise<string> {
  const settings = await getSettings();
  const defaultName = (inboundTag.includes("direct") ? "Glacier • Direct" : ((inboundTag.includes("grpc") || nodeAddress.includes("cloud") || nodeAddress.includes("floe")) ? "🇩🇪 Floe • Frankfurt" : "Glacier • WARP"));
  const displayName = inboundOverrides?.name || defaultName;
  const name = encodeURIComponent(displayName);
  
  // Apply per-inbound settings from overrides or global settings
  const customPort = inboundOverrides?.port || (settings[`INBOUND_${inboundTag}_PORT`] ? parseInt(settings[`INBOUND_${inboundTag}_PORT`]) : null);
  const customFlow = inboundOverrides?.flow || settings[`INBOUND_${inboundTag}_FLOW`] || "xtls-rprx-vision";
  
  const port = customPort ? customPort : nodePort;
  const protocol = "vless";
  
  const pbk = inboundOverrides?.pbk || nodeReality?.pbk || process.env.XRAY_PUBLIC_KEY || "";
  const sid = inboundOverrides?.sid || nodeReality?.sid || process.env.XRAY_SHORT_ID || "";
  const sni = inboundOverrides?.sni || nodeReality?.sni || process.env.XRAY_SNI || "";
  const defaultWsPath = (inboundTag.includes("activity") || inboundTag.includes("direct")) ? "/api/v1/activity" : "/api/v1/events";
  const wsPath = inboundOverrides?.path || nodeReality?.path || settings[`INBOUND_${inboundTag}_PATH`] || defaultWsPath;
  const serviceName = inboundOverrides?.serviceName || inboundOverrides?.path || settings[`INBOUND_${inboundTag}_SERVICE_NAME`] || "cloud-sync";
  
  const network = inboundOverrides?.network || settings[`INBOUND_${inboundTag}_NETWORK`] || (process.env.XRAY_NETWORK || "ws");
  const security = pbk ? "reality" : (sni ? "tls" : "none");

  if (protocol === "vless") {
    let link = `vless://${xrayUuid}@${nodeAddress}:${port}?encryption=none`;
    if (network === "tcp") link += `&type=tcp`;
    if (network === "ws") link += `&type=ws&path=${encodeURIComponent(wsPath)}`;
    if (network === "grpc") link += `&type=grpc&serviceName=${encodeURIComponent(serviceName)}`;
    
    link += `&security=${security}`;
    
    if (security === "reality" || security === "tls") {
      link += `&sni=${sni}&fp=chrome`;
    }
    
    if (security === "reality") {
      link += `&pbk=${pbk}&sid=${sid}&flow=${customFlow}`;
    }
    
    return `${link}#${name}`;
  }
  
  // Basic fallback
  return `vless://${xrayUuid}@${nodeAddress}:${port}`;
}

export async function buildClashProxyObject(
  inboundTag: string, 
  xrayUuid: string, 
  nodeName: string, 
  nodeAddress: string, 
  nodePort: number,
  nodeReality?: { sni?: string | null; pbk?: string | null; sid?: string | null; path?: string | null },
  inboundOverrides?: { port?: number; flow?: string; network?: string; sni?: string; pbk?: string; sid?: string; path?: string; name?: string; serviceName?: string }
): Promise<any> {
  const settings = await getSettings();
  const defaultName = (inboundTag.includes("direct") ? "Glacier • Direct" : ((inboundTag.includes("grpc") || nodeAddress.includes("cloud") || nodeAddress.includes("floe")) ? "🇩🇪 Floe • Frankfurt" : "Glacier • WARP"));
  const name = inboundOverrides?.name || defaultName;
  const customPort = inboundOverrides?.port || (settings[`INBOUND_${inboundTag}_PORT`] ? parseInt(settings[`INBOUND_${inboundTag}_PORT`]) : null);
  const port = customPort ? customPort : nodePort;
  
  const pbk = inboundOverrides?.pbk || nodeReality?.pbk || process.env.XRAY_PUBLIC_KEY || "";
  const sid = inboundOverrides?.sid || nodeReality?.sid || process.env.XRAY_SHORT_ID || "";
  const sni = inboundOverrides?.sni || nodeReality?.sni || process.env.XRAY_SNI || "";
  const defaultWsPath = (inboundTag.includes("activity") || inboundTag.includes("direct")) ? "/api/v1/activity" : "/api/v1/events";
  const wsPath = inboundOverrides?.path || nodeReality?.path || settings[`INBOUND_${inboundTag}_PATH`] || defaultWsPath;
  const serviceName = inboundOverrides?.serviceName || inboundOverrides?.path || settings[`INBOUND_${inboundTag}_SERVICE_NAME`] || "cloud-sync";
  
  const network = inboundOverrides?.network || settings[`INBOUND_${inboundTag}_NETWORK`] || (process.env.XRAY_NETWORK || "ws");
  const security = pbk ? "reality" : (sni ? "tls" : "none");

  const proxy: any = {
    name,
    type: "vless",
    server: nodeAddress,
    port,
    uuid: xrayUuid,
    network,
    tls: security === "tls" || security === "reality",
    udp: true,
  };

  if (security === "reality" || security === "tls") {
    proxy.servername = sni;
    proxy["client-fingerprint"] = "chrome";
  }

  if (network === "ws") {
    proxy["ws-opts"] = {
      path: wsPath,
      headers: {
        Host: sni || nodeAddress,
      },
    };
  }

  if (network === "grpc") {
    proxy["grpc-opts"] = {
      "grpc-service-name": serviceName,
    };
  }

  if (security === "reality") {
    proxy.flow = inboundOverrides?.flow || settings[`INBOUND_${inboundTag}_FLOW`] || "xtls-rprx-vision";
    proxy["reality-opts"] = {
      "public-key": pbk,
      "short-id": sid
    };
  }

  return proxy;
}

/**
 * Re-adds all active SubscriptionInbound UUIDs to Xray on a specific node via gRPC
 */
export async function syncNodeUsers(nodeId: string): Promise<{ total: number; success: number }> {
  try {
    const node = await db.node.findUnique({ where: { id: nodeId } });
    if (!node || !node.isActive) return { total: 0, success: 0 };

    const inbounds = await db.subscriptionInbound.findMany({
      where: { nodeId: node.id }
    });

    console.log(`[Sync] Syncing ${inbounds.length} active UUIDs to node ${node.name} (${node.id})...`);
    let successCount = 0;

    for (const inb of inbounds) {
      const email = `${inb.subscriptionId}_${inb.inboundTag}_${inb.xrayUuid}`;
      const ok = await addVlessUser(node.apiHost, inb.inboundTag, email, inb.xrayUuid);
      if (ok) successCount++;
    }

    console.log(`[Sync] Node ${node.name}: ${successCount}/${inbounds.length} users synced successfully.`);
    return { total: inbounds.length, success: successCount };
  } catch (e) {
    console.error(`[Sync] Failed to sync users for node ${nodeId}:`, e);
    return { total: 0, success: 0 };
  }
}


