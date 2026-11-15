import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn().mockResolvedValue({}),
}));

import { buildClientLink, buildClashProxyObject, invalidateClientCache, getClients } from '@/lib/xray';

describe('buildClientLink & buildClashProxyObject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a valid VLESS Reality client link with override name', async () => {
    const link = await buildClientLink(
      'VLESS-Inbound',
      'e963b51b-411a-4293-9c86-f13c6622ec14',
      'Test Node',
      'vpn.example.com',
      443,
      {
        sni: 'dl.google.com',
        pbk: 'test_pub_key',
        sid: 'test_sid',
      },
      { name: 'VLESS-Inbound' }
    );

    expect(link).toContain('vless://e963b51b-411a-4293-9c86-f13c6622ec14@vpn.example.com:443');
    expect(link).toContain('security=reality');
    expect(link).toContain('sni=dl.google.com');
    expect(link).toContain('pbk=test_pub_key');
    expect(link).toContain('sid=test_sid');
    expect(link).toContain('#VLESS-Inbound');
  });

  it('builds a valid Clash proxy object with override name', async () => {
    const clash = await buildClashProxyObject(
      'Node-Reality',
      'e963b51b-411a-4293-9c86-f13c6622ec14',
      'Test Node',
      'vpn.example.com',
      443,
      {
        sni: 'dl.google.com',
        pbk: 'test_pub_key',
        sid: 'test_sid',
      },
      { name: 'Node-Reality' }
    );

    expect(clash.name).toBe('Node-Reality');
    expect(clash.type).toBe('vless');
    expect(clash.server).toBe('vpn.example.com');
    expect(clash.port).toBe(443);
    expect(clash.uuid).toBe('e963b51b-411a-4293-9c86-f13c6622ec14');
    expect(clash.tls).toBe(true);
    expect(clash['reality-opts']['public-key']).toBe('test_pub_key');
    expect(clash['reality-opts']['short-id']).toBe('test_sid');
  });

  it('assigns intelligent default display names: Frankfurt and Moscow', async () => {
    const linkFrankfurt = await buildClientLink(
      'vless-frankfurt',
      'e963b51b-411a-4293-9c86-f13c6622ec14',
      'Glacier',
      'git.nada.mu',
      443
    );
    expect(linkFrankfurt).toContain('#Frankfurt');

    const linkMoscow = await buildClientLink(
      'vless-in',
      'e963b51b-411a-4293-9c86-f13c6622ec14',
      'Glacier',
      'git.nada.mu',
      443
    );
    expect(linkMoscow).toContain('#Moscow');
  });

  it('manages gRPC client cache and invalidation', () => {
    const host = 'unix:///test/path.sock';
    const client1 = getClients(host);
    expect(client1).toHaveProperty('handler');
    expect(client1).toHaveProperty('stats');

    // Should return cached instance
    const client2 = getClients(host);
    expect(client2).toBe(client1);

    // Invalidation
    invalidateClientCache(host);
    const client3 = getClients(host);
    expect(client3).not.toBe(client1);
  });
});
