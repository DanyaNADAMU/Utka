import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import protobuf from 'protobufjs';
import path from 'path';

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

const XRAY_API_URL = process.env.XRAY_API_URL || 'xray:7999';

// Initialize clients
const handlerClient = new xrayProxyman.HandlerService(XRAY_API_URL, grpc.credentials.createInsecure());
const statsClient = new xrayStats.StatsService(XRAY_API_URL, grpc.credentials.createInsecure());

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
export async function addVlessUser(inboundTag: string, email: string, uuid: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
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

      handlerClient.alterInbound({
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
export async function removeVlessUser(inboundTag: string, email: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const RemoveUserOperation = root.lookupType("xray.app.proxyman.command.RemoveUserOperation");
      const opMsg = RemoveUserOperation.create({
        email: email
      });
      const opBytes = RemoveUserOperation.encode(opMsg).finish();

      handlerClient.alterInbound({
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
export async function queryUserStats(emailPrefix: string): Promise<{ up: bigint, down: bigint }> {
  return new Promise((resolve) => {
    statsClient.queryStats({
      pattern: `user>>>${emailPrefix}_`,
      reset: false // Set to true if you want Xray to reset counters after query
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
 * Parses config.json and returns all inbound tags except 'api' (dokodemo-door)
 */
import fs from 'fs/promises';

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

