import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DEFAULT_CONFIG_INI = `[custom]
ruleset=🛑 AdBlock,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list
ruleset=🏠 Local Network,[]GEOIP,LAN
ruleset=🏠 Local Network,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list

ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,gemini.google.com
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,google.com
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,googleapis.com
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,gstatic.com
ruleset=🚀 Proxy,[]DOMAIN-KEYWORD,google
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,ai.com
ruleset=🚀 Proxy,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Gemini/Gemini.list
ruleset=🚀 Proxy,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Google/Google.list

ruleset=DIRECT,[]DOMAIN-SUFFIX,cubecraft.net
ruleset=DIRECT,[]DOMAIN-KEYWORD,cubecraft

ruleset=🇷🇺 RU Traffic,[]GEOIP,RU
ruleset=🇷🇺 RU Traffic,[]DOMAIN-SUFFIX,ru
ruleset=🇷🇺 RU Traffic,[]DOMAIN-SUFFIX,su
ruleset=🇷🇺 RU Traffic,[]DOMAIN-SUFFIX,xn--p1ai
ruleset=🇷🇺 RU Traffic,[]DOMAIN-KEYWORD,yandex
ruleset=🇷🇺 RU Traffic,[]DOMAIN-SUFFIX,yandex.net
ruleset=🇷🇺 RU Traffic,[]DOMAIN-SUFFIX,vk.com
ruleset=🇷🇺 RU Traffic,[]DOMAIN-SUFFIX,mail.ru
ruleset=🇷🇺 RU Traffic,[]DOMAIN-SUFFIX,gosuslugi.ru
ruleset=🇷🇺 RU Traffic,[]DOMAIN-SUFFIX,sberbank.ru
ruleset=🇷🇺 RU Traffic,[]DOMAIN-SUFFIX,tinkoff.ru

ruleset=🚀 Proxy,[]MATCH

custom_proxy_group=🛑 AdBlock\`select\`[]REJECT\`[]DIRECT\`.*
custom_proxy_group=🏠 Local Network\`select\`[]DIRECT\`[]REJECT\`.*
custom_proxy_group=🇷🇺 RU Traffic\`select\`[]DIRECT\`[]REJECT\`.*
custom_proxy_group=🚀 Proxy\`select\`.*\`[]DIRECT\`[]REJECT
`;

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), 'xray', 'config.ini');
    const stat = await fs.stat(configPath);
    if (stat.isFile()) {
      const content = await fs.readFile(configPath, 'utf-8');
      if (content && content.trim().length > 0) {
        return new NextResponse(content, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store, max-age=0',
          },
        });
      }
    }
  } catch (error) {
    console.warn('xray/config.ini file not readable, using fallback:', error);
  }

  return new NextResponse(DEFAULT_CONFIG_INI, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
