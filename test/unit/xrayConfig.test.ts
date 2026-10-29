import { describe, it, expect } from 'vitest';
import {
  generateRealityKeypair,
  generateMasterNodeConfigSnippet,
  generateNodeConfigSnippet,
} from '@/lib/xrayConfig';

describe('xrayConfig', () => {
  it('generates a valid x25519 reality keypair in base64url', () => {
    const keypair = generateRealityKeypair();
    expect(keypair).toHaveProperty('publicKey');
    expect(keypair).toHaveProperty('privateKey');
    expect(keypair.publicKey.length).toBeGreaterThan(30);
    expect(keypair.privateKey.length).toBeGreaterThan(30);
    // base64url format check (no +, /, or = characters)
    expect(keypair.publicKey).not.toMatch(/[+/=]/);
    expect(keypair.privateKey).not.toMatch(/[+/=]/);
  });

  it('generates master node config snippet with dokodemo and vless outbound', () => {
    const node = {
      id: 'node-test-1',
      name: 'Test Node',
      address: '10.166.118.81',
      port: 443,
      adminUuid: 'c37df8c0-82fa-48ef-97b7-5ceb29ee5ff2',
      realityServerName: 'dl.google.com',
      realityPubKey: 'pubkey123',
      realityShortId: 'sid123',
    };

    const snippet = generateMasterNodeConfigSnippet(node);
    expect(snippet).toHaveProperty('inbound');
    expect(snippet).toHaveProperty('outbound');
    expect(snippet).toHaveProperty('routingRule');

    expect(snippet.inbound.tag).toBe('grpc-in-node-test-1');
    expect(snippet.outbound.tag).toBe('vless-out-node-test-1');
    expect(snippet.outbound.settings.vnext[0].address).toBe('10.166.118.81');
    expect(snippet.outbound.streamSettings.realitySettings.publicKey).toBe('pubkey123');
    expect(snippet.outbound.streamSettings.realitySettings.serverName).toBe('dl.google.com');

    // Valid JSON strings
    expect(JSON.parse(snippet.inboundJson)).toEqual(snippet.inbound);
    expect(JSON.parse(snippet.outboundJson)).toEqual(snippet.outbound);
  });

  it('generates full node config snippet structure', () => {
    const node = {
      id: 'node-standalone',
      name: 'Standalone Node',
      address: '8.8.8.8',
      port: 443,
      adminUuid: 'c37df8c0-82fa-48ef-97b7-5ceb29ee5ff2',
      realityServerName: 'dl.google.com',
      realityPubKey: 'pubkey_xyz',
      realityPrivKey: 'privkey_xyz',
      realityShortId: 'abcd1234',
    };

    const snippet = generateNodeConfigSnippet(node);
    expect(snippet).toHaveProperty('fullNodeConfigJson');
    expect(snippet).toHaveProperty('masterApiInboundJson');
    expect(snippet).toHaveProperty('masterApiRoutingRuleJson');

    const parsedConfig = JSON.parse(snippet.fullNodeConfigJson);
    expect(parsedConfig.inbounds.length).toBeGreaterThan(0);
    expect(parsedConfig.api.tag).toBe('api');
  });
});
