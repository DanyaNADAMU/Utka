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

export function getClients(grpcHost: string) {
  let host = grpcHost;
  // Auto-migrate legacy tcp configurations to unix socket
  if (host.includes('xray:8080') || host.includes('xray:7999')) {
    host = 'unix:///app/xray/api.sock';
  }
  
  if (!clientsCache[host]) {
    clientsCache[host] = {
      handler: new xrayProxyman.HandlerService(host, grpc.credentials.createInsecure()),
      stats: new xrayStats.StatsService(host, grpc.credentials.createInsecure())
    };
  }
  return clientsCache[host];
}

// Load protobufjs root for encoding TypedMessages
let root = new protobuf.Root();
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
export async function addVlessUser(grpcHost: string, inboundTag: string, email: string, uuid: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const { handler } = getClients(grpcHost);
      const Account = root.lookupType("xray.proxy.vless.Account");
      const accountMsg = Account.create({
        id: uuid,
        flow: "xtls-rprx-vision",
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
          console.error("[Xray API] AddUser Error:", err);
          return resolve(false);
        }
        resolve(true);
      });
    } catch (e) {
      console.error("[Xray API] AddUser Exception:", e);
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
export async function queryAllUserStats(grpcHost: string, reset: boolean = false): Promise<Record<string, { up: bigint, down: bigint }>> {
  return new Promise((resolve) => {
    const { stats } = getClients(grpcHost);
    stats.queryStats({
      pattern: `user>>>`,
      reset: reset
    }, (err: Error, res: any) => {
      if (err || !res || !res.stat) {
        return resolve({});
      }

      const results: Record<string, { up: bigint, down: bigint }> = {};

      res.stat.forEach((statObj: any) => {
        // name looks like: "user>>>danya_vless_uuid>>>traffic>>>downlink"
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

export async function getInboundConfig(tag: string): Promise<any | null> {
  try {
    const configPath = path.join(process.cwd(), 'xray', 'config.json');
    const data = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(data);
    if (!config.inbounds || !Array.isArray(config.inbounds)) return null;
    
    return config.inbounds.find((i: any) => i.tag === tag) || null;
  } catch (e) {
    return null;
  }
}

export async function buildClientLink(
  inboundTag: string, 
  xrayUuid: string, 
  nodeName: string, 
  nodeAddress: string, 
  nodePort: number
): Promise<string> {
  const conf = await getInboundConfig(inboundTag);
  const settings = await getSettings();
  const name = encodeURIComponent(`${nodeName || "NadamuDash"} - ${inboundTag}`);
  
  // Apply per-inbound settings
  const customPort = settings[`INBOUND_${inboundTag}_PORT`];
  const customFlow = settings[`INBOUND_${inboundTag}_FLOW`] || "xtls-rprx-vision";
  
  // We MUST use the external nodePort (exposed by haproxy) or the custom port
  // rather than the internal Xray listen port (conf.port)
  const port = customPort ? parseInt(customPort) : nodePort;
  
  if (!conf) {
    // Fallback if not found
    return `vless://${xrayUuid}@${nodeAddress}:${port}?encryption=none&flow=${customFlow}&security=reality&sni=biz.mail.ru&fp=chrome&type=tcp&headerType=none#${name}`;
  }

  const protocol = conf.protocol || "vless";
  
  // Extract reality settings
  let pbk = process.env.XRAY_PUBLIC_KEY || "";
  let sid = process.env.XRAY_SHORT_ID || "";
  let sni = process.env.XRAY_SNI || "biz.mail.ru";
  
  const stream = conf.streamSettings || {};
  const network = stream.network || "tcp";
  const security = stream.security || "none";
  
  if (security === "reality" && stream.realitySettings) {
    const rs = stream.realitySettings;
    if (rs.serverNames && rs.serverNames.length > 0) sni = rs.serverNames[0];
    if (rs.shortIds && rs.shortIds.length > 0) sid = rs.shortIds[0];
    if (rs.privateKey) {
      const derivedPbk = getX25519PublicKey(rs.privateKey);
      if (derivedPbk) pbk = derivedPbk;
    }
  } else if (security === "tls" && stream.tlsSettings) {
    const ts = stream.tlsSettings;
    if (ts.serverName) sni = ts.serverName;
  }

  if (protocol === "vless") {
    let link = `vless://${xrayUuid}@${nodeAddress}:${port}?encryption=none`;
    if (network === "tcp") link += `&type=tcp`;
    if (network === "ws") link += `&type=ws`;
    if (network === "grpc") link += `&type=grpc`;
    
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
  nodePort: number
): Promise<any> {
  const conf = await getInboundConfig(inboundTag);
  const name = `${nodeName || "NadamuDash"} - ${inboundTag}`;
  
  if (!conf) {
    return null;
  }

  const port = conf.port || nodePort;
  const protocol = conf.protocol || "vless";
  if (protocol !== "vless") return null;
  
  let pbk = process.env.XRAY_PUBLIC_KEY || "";
  let sid = process.env.XRAY_SHORT_ID || "";
  let sni = process.env.XRAY_SNI || "biz.mail.ru";
  
  const stream = conf.streamSettings || {};
  const network = stream.network || "tcp";
  const security = stream.security || "none";
  
  if (security === "reality" && stream.realitySettings) {
    const rs = stream.realitySettings;
    if (rs.serverNames && rs.serverNames.length > 0) sni = rs.serverNames[0];
    if (rs.shortIds && rs.shortIds.length > 0) sid = rs.shortIds[0];
    if (rs.privateKey) {
      const derivedPbk = getX25519PublicKey(rs.privateKey);
      if (derivedPbk) pbk = derivedPbk;
    }
  } else if (security === "tls" && stream.tlsSettings) {
    const ts = stream.tlsSettings;
    if (ts.serverName) sni = ts.serverName;
  }

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

  if (security === "reality") {
    proxy.flow = "xtls-rprx-vision";
    proxy["reality-opts"] = {
      "public-key": pbk,
      "short-id": sid
    };
  }

  return proxy;
}

export async function getClientInboundTags(): Promise<string[]> {
  try {
    const configPath = path.join(process.cwd(), 'xray', 'config.json');
    const data = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(data);
    if (!config.inbounds || !Array.isArray(config.inbounds)) return [];
    
    // Filter out API inbound (usually dokodemo-door with tag 'api')
    return config.inbounds
      .filter((i: any) => i.tag && i.tag !== 'api' && i.protocol !== 'dokodemo-door')
      .map((i: any) => i.tag);
  } catch (e) {
    console.error("Failed to read client inbound tags:", e);
    return [];
  }
}

