import fs from 'fs/promises';
import path from 'path';

export const DEFAULT_CONFIG_INI = `[custom]
; Default mode: rule-based routing
clash_mode=rule

; 1. Ad blocking
ruleset=🛑 AdBlock,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list

; 2. Local Area Network
ruleset=🏠 Local Network,[]GEOIP,LAN,no-resolve
ruleset=🏠 Local Network,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list

; 3. Direct downloads & P2P torrents to protect VPS bandwidth and prevent DMCA abuse
ruleset=DIRECT,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Download.list

; 4. Gaming and direct bypass rules
ruleset=DIRECT,[]DOMAIN-SUFFIX,cubecraft.net
ruleset=DIRECT,[]DOMAIN-KEYWORD,cubecraft

; 6. AI services & international ecosystems
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,openai.com
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,chatgpt.com
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,oaistatic.com
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,oaiusercontent.com
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,claude.ai
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,anthropic.com
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,ai.com
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,gemini.google.com
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,google.com
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,googleapis.com
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,gstatic.com
ruleset=🚀 Proxy,[]DOMAIN-SUFFIX,googleusercontent.com
ruleset=🚀 Proxy,[]DOMAIN-KEYWORD,google
ruleset=🚀 Proxy,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Gemini/Gemini.list
ruleset=🚀 Proxy,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Google/Google.list
ruleset=🚀 Proxy,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Telegram/Telegram.list

; 7. Domestic Russian traffic direct
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
ruleset=🇷🇺 RU Traffic,[]DOMAIN-SUFFIX,t-bank.ru
ruleset=🇷🇺 RU Traffic,[]GEOIP,RU,no-resolve

; 8. Default fallback for international traffic
ruleset=🚀 Proxy,[]MATCH

custom_proxy_group=🛑 AdBlock\`select\`[]REJECT\`[]DIRECT\`.*
custom_proxy_group=🏠 Local Network\`select\`[]DIRECT\`[]REJECT\`.*
custom_proxy_group=🇷🇺 RU Traffic\`select\`[]DIRECT\`[]REJECT\`.*
custom_proxy_group=🚀 Proxy\`select\`.*\`[]DIRECT\`[]REJECT
`;

export async function getConfigIniContent(): Promise<string> {
  try {
    const configPath = process.env.CONFIG_INI_PATH || path.join(process.cwd(), 'xray', 'config.ini');
    const stat = await fs.stat(configPath);
    if (stat.isFile()) {
      const content = await fs.readFile(configPath, 'utf-8');
      if (content && content.trim().length > 0) {
        return content;
      }
    }
  } catch {
    // File not readable or does not exist, use default
  }
  return DEFAULT_CONFIG_INI;
}
