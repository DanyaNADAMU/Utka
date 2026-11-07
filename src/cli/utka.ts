#!/usr/bin/env node

import QRCode from 'qrcode';
import db from '@/lib/db';
import {
  createUserService,
  listUsersService,
  getUserDetailsService,
  deleteUserService,
  resetUserTrafficService,
  syncAllNodesService,
} from '@/lib/userService';
import { getXrayInboundTags } from '@/lib/xray';

function formatBytes(bytes: bigint | number): string {
  const b = typeof bytes === 'bigint' ? bytes : BigInt(bytes || 0);
  if (b === BigInt(0)) return '0 B';
  const k = BigInt(1024);
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Number(b)) / Math.log(Number(k)));
  return `${(Number(b) / Math.pow(Number(k), i)).toFixed(2)} ${sizes[i]}`;
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function col(str: string | number, width: number, alignRight: boolean = false): string {
  const s = String(str);
  const plainLength = stripAnsi(s).length;
  if (plainLength >= width) return s;
  const padding = ' '.repeat(width - plainLength);
  return alignRight ? padding + s : s + padding;
}

async function renderQr(text: string): Promise<string> {
  return new Promise((resolve) => {
    QRCode.toString(text, { type: 'terminal', small: true }, (err, str) => {
      if (err) resolve(`[QR error: ${err.message}]`);
      else resolve(str);
    });
  });
}

function printHelp() {
  console.log(`
\x1b[1m\x1b[36m⚡ Utka Control CLI (utka)\x1b[0m
Minimalistic, modular Xray control suite (utka-core, utka-sub, utka-web, utka-cli)

\x1b[1mUSAGE:\x1b[0m
  utka <command> [subcommand] [arguments]

\x1b[1mCOMMANDS:\x1b[0m
  \x1b[32mstatus\x1b[0m                       Check database and Xray gRPC socket status
  \x1b[32msync\x1b[0m                         Sync all active users from DB into Xray in-memory state
  
  \x1b[32muser list\x1b[0m                    List all registered users and traffic usage
  \x1b[32muser add <name> [flags]\x1b[0m      Create a new user and generate subscription
  \x1b[32muser get <name|token>\x1b[0m        Display user details, subscription URL, and QR code
  \x1b[32muser delete <name|token>\x1b[0m     Remove user from Xray and delete from DB
  \x1b[32muser reset-traffic <name>\x1b[0m    Reset traffic usage counter for user

  \x1b[32mnode list\x1b[0m                    List all configured Xray nodes
  \x1b[32mhelp\x1b[0m                         Show this help message

\x1b[1mFLAGS:\x1b[0m
  --email <email>              Specify custom email address
  --sub-name <name>            Specify device or subscription name
  --no-qr                      Suppress terminal QR code output
`);
}

async function handleStatus() {
  console.log('\x1b[1m\x1b[36m--- Utka System Status ---\x1b[0m');

  // 1. PostgreSQL check
  try {
    const start = Date.now();
    await db.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    console.log(`\x1b[32m✔ PostgreSQL:\x1b[0m Connected (${latency}ms)`);
  } catch (err: any) {
    console.log(`\x1b[31m✖ PostgreSQL:\x1b[0m Failed (${err.message})`);
  }

  // 2. Nodes & Xray Socket check
  try {
    const nodes = await db.node.findMany();
    console.log(`\x1b[32m✔ Configured Nodes:\x1b[0m ${nodes.length}`);

    for (const node of nodes) {
      const isStaticNode = !node.apiHost || node.apiHost === 'static' || node.apiHost === 'none';
      if (isStaticNode) {
        let tagList = 'static';
        if (node.inboundSettings) {
          try {
            tagList = Object.keys(JSON.parse(node.inboundSettings)).join(', ');
          } catch {}
        }
        console.log(
          `  • Node \x1b[1m${node.name}\x1b[0m (${node.address}): \x1b[32mSTATIC NODE\x1b[0m | Inbounds: [${tagList}]`
        );
        continue;
      }

      const start = Date.now();
      const tags = await getXrayInboundTags(node.apiHost);
      const latency = Date.now() - start;

      if (tags.length > 0) {
        console.log(
          `  • Node \x1b[1m${node.name}\x1b[0m (${node.apiHost}): \x1b[32mONLINE\x1b[0m (${latency}ms) | Inbounds: [${tags.join(', ')}]`
        );
      } else {
        console.log(
          `  • Node \x1b[1m${node.name}\x1b[0m (${node.apiHost}): \x1b[31mOFFLINE or No Inbounds\x1b[0m`
        );
      }
    }
  } catch (err: any) {
    console.log(`\x1b[31m✖ Nodes/Xray Check Error:\x1b[0m ${err.message}`);
  }

  // 3. User counts
  try {
    const userCount = await db.user.count();
    const subCount = await db.subscription.count();
    console.log(`\x1b[32m✔ Total Users:\x1b[0m ${userCount} (Subscriptions: ${subCount})`);
  } catch {}
}

async function handleSync() {
  console.log('\x1b[1mStarting gRPC reconciliation sync with Xray nodes...\x1b[0m');
  const results = await syncAllNodesService();

  for (const r of results) {
    console.log(
      `Node \x1b[1m${r.nodeName}\x1b[0m: Synced \x1b[32m${r.synced}\x1b[0m / ${r.total} active UUIDs to Xray in-memory state.`
    );
  }
  console.log('\x1b[32m✔ Reconciliation complete. Xray memory is in sync with database.\x1b[0m');
}

async function handleUserList() {
  const users = await listUsersService();

  if (users.length === 0) {
    console.log('No users found. Create one using: \x1b[32mutka user add <name>\x1b[0m');
    return;
  }

  console.log(
    '\x1b[1m' +
    [
      col('NAME', 16),
      col('EMAIL', 26),
      col('TOKEN', 38),
      col('TRAFFIC', 12),
      col('ROLE', 10),
    ].join(' ') +
    '\x1b[0m'
  );
  console.log('─'.repeat(106));

  for (const u of users) {
    const token = u.subscriptions[0]?.token || 'no-subscription';
    const trafficStr = formatBytes(u.totalBytes);

    console.log(
      [
        col(u.name || '—', 16),
        col(u.email || '—', 26),
        col(token, 38),
        col(trafficStr, 12),
        col(u.role, 10),
      ].join(' ')
    );
  }
}

async function handleUserAdd(args: string[]) {
  const name = args[0];
  if (!name) {
    console.error('\x1b[31mError:\x1b[0m Name argument is required. Usage: utka user add <name> [--email <email>]');
    process.exit(1);
  }

  let email: string | undefined;
  let subName: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1];
      i++;
    } else if (args[i] === '--sub-name' && args[i + 1]) {
      subName = args[i + 1];
      i++;
    }
  }

  console.log(`Creating user \x1b[1m${name}\x1b[0m...`);
  const result = await createUserService({ name, email, subName });

  console.log('\x1b[32m✔ User created successfully!\x1b[0m');
  console.log(`  • ID:            ${result.user.id}`);
  console.log(`  • Token:         \x1b[1m${result.subscription.token}\x1b[0m`);
  console.log(`  • Inbounds:      ${result.inbounds.length} provisioned in Xray`);

  const details = await getUserDetailsService(result.subscription.token);
  if (details) {
    console.log(`  • Sub URL:       \x1b[36m${details.subUrl}\x1b[0m\n`);

    if (!args.includes('--no-qr')) {
      console.log('\x1b[1mSubscription QR Code (Scan in Clash / Sing-box / Shadowrocket):\x1b[0m');
      const qrAscii = await renderQr(details.subUrl);
      console.log(qrAscii);
    }
  }
}

async function handleUserGet(identifier?: string, flags: string[] = []) {
  if (!identifier) {
    console.error('\x1b[31mError:\x1b[0m Identifier (name, email, or token) is required.');
    process.exit(1);
  }

  const details = await getUserDetailsService(identifier);
  if (!details) {
    console.error(`\x1b[31mError:\x1b[0m User or subscription not found for "${identifier}".`);
    process.exit(1);
  }

  console.log('\x1b[1m\x1b[36m--- User & Subscription Details ---\x1b[0m');
  console.log(`  • User:          ${details.user.name || 'Unnamed'} (${details.user.email || '—'})`);
  console.log(`  • User ID:       ${details.user.id}`);
  console.log(`  • Sub Name:      ${details.subscription.name}`);
  console.log(`  • Sub Token:     \x1b[1m${details.subscription.token}\x1b[0m`);
  console.log(`  • Sub URL:       \x1b[36m${details.subUrl}\x1b[0m`);
  console.log(
    `  • Traffic:       Up: ${formatBytes(details.traffic.up)} | Down: ${formatBytes(
      details.traffic.down
    )} | Total: \x1b[1m${formatBytes(details.traffic.total)}\x1b[0m`
  );
  console.log(`  • Created:       ${details.subscription.createdAt.toISOString()}`);

  if (details.links.length > 0) {
    console.log('\n\x1b[1mDirect VLESS Connection Links:\x1b[0m');
    for (const l of details.links) {
      console.log(`  [${l.tag} @ ${l.nodeName}]:`);
      console.log(`  \x1b[33m${l.link}\x1b[0m\n`);
    }
  }

  if (!flags.includes('--no-qr')) {
    console.log('\x1b[1mSubscription QR Code:\x1b[0m');
    const qrAscii = await renderQr(details.subUrl);
    console.log(qrAscii);
  }
}

async function handleUserDelete(identifier?: string) {
  if (!identifier) {
    console.error('\x1b[31mError:\x1b[0m Identifier (name, email, or token) is required.');
    process.exit(1);
  }

  console.log(`Removing user "${identifier}" from Xray and database...`);
  const res = await deleteUserService(identifier);

  if (res.success) {
    console.log(`\x1b[32m✔ User "${res.deletedUser}" deleted successfully.\x1b[0m`);
  } else {
    console.error(`\x1b[31mError:\x1b[0m ${res.error}`);
  }
}

async function handleUserResetTraffic(identifier?: string) {
  if (!identifier) {
    console.error('\x1b[31mError:\x1b[0m Identifier is required.');
    process.exit(1);
  }

  const res = await resetUserTrafficService(identifier);
  if (res.success) {
    console.log(`\x1b[32m✔ Traffic reset successfully for "${identifier}".\x1b[0m`);
  } else {
    console.error(`\x1b[31mError:\x1b[0m ${res.error}`);
  }
}

async function handleNodeList() {
  const nodes = await db.node.findMany({
    include: {
      _count: {
        select: { inbounds: true, subscriptions: true },
      },
    },
  });

  if (nodes.length === 0) {
    console.log('No nodes registered in database.');
    return;
  }

  console.log(
    '\x1b[1m' +
    [
      col('NAME', 18),
      col('ADDRESS', 24),
      col('PORT', 8),
      col('INTERNAL', 10),
      col('STATUS', 12),
      col('USERS', 8),
    ].join(' ') +
    '\x1b[0m'
  );
  console.log('─'.repeat(84));

  for (const n of nodes) {
    const statusStr = n.isActive ? '\x1b[32mActive\x1b[0m' : '\x1b[31mDisabled\x1b[0m';
    console.log(
      [
        col(n.name, 18),
        col(n.address, 24),
        col(n.port, 8),
        col(n.xrayPort, 10),
        col(statusStr, 12),
        col(n._count.subscriptions, 8),
      ].join(' ')
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'status':
        await handleStatus();
        break;
      case 'sync':
        await handleSync();
        break;
      case 'user':
      case 'users': {
        const subCmd = args[1];
        if (subCmd === 'list' || !subCmd) {
          await handleUserList();
        } else if (subCmd === 'add') {
          await handleUserAdd(args.slice(2));
        } else if (subCmd === 'get') {
          await handleUserGet(args[2], args.slice(3));
        } else if (subCmd === 'delete' || subCmd === 'revoke' || subCmd === 'rm') {
          await handleUserDelete(args[2]);
        } else if (subCmd === 'reset-traffic') {
          await handleUserResetTraffic(args[2]);
        } else {
          console.error(`Unknown user subcommand: ${subCmd}`);
          printHelp();
        }
        break;
      }
      case 'node':
      case 'nodes':
        await handleNodeList();
        break;
      case 'help':
      case '--help':
      case '-h':
      case undefined:
        printHelp();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err: any) {
    console.error('\x1b[31mFatal error:\x1b[0m', err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
