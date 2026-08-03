import QRCode from 'qrcode';

export interface NodeLinkInfo {
  nodeName: string;
  address: string;
  port: number;
  inboundTag: string;
  vlessLink: string;
  qrSvg: string;
}

export interface SubscriptionPageData {
  subName: string;
  userName: string;
  subUrl: string;
  subQrSvg: string;
  trafficUp: bigint;
  trafficDown: bigint;
  trafficTotal: bigint;
  lastFetched: Date | null;
  createdAt: Date;
  nodeLinks: NodeLinkInfo[];
}

export function formatBytes(bytes: bigint | number): string {
  const b = Number(bytes);
  if (b <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function generateQrSvg(text: string): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (e) {
    console.error('Failed to generate QR Code SVG:', e);
    return '';
  }
}

export function renderSubscriptionHtml(data: SubscriptionPageData): string {
  const {
    subName,
    userName,
    subUrl,
    subQrSvg,
    trafficUp,
    trafficDown,
    trafficTotal,
    lastFetched,
    nodeLinks,
  } = data;

  const encodedName = encodeURIComponent(subName);
  const encodedSubUrl = encodeURIComponent(subUrl);

  const hiddifyUrl = `hiddify://import/${subUrl}#${encodedName}`;
  const clashUrl = `clash://install-config?url=${encodedSubUrl}&name=${encodedName}`;
  const karingUrl = `karing://import/${subUrl}#${encodedName}`;
  const clashmiUrl = `clashmi://install-config?url=${encodedSubUrl}&name=${encodedName}`;

  const lastFetchedStr = lastFetched
    ? new Date(lastFetched).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Никогда';

  const safeJsSubUrl = escapeJs(subUrl);
  const safeHtmlSubUrl = escapeHtml(subUrl);

  return `<!DOCTYPE html>
<html lang="ru" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Подписка - ${escapeHtml(subName)} | nada.mu</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    body {
      background-color: #0b0f19;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem 1.5rem;
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.12) 0%, transparent 50%),
        radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.08) 0%, transparent 40%);
    }
    .container {
      width: 100%;
      max-width: 1400px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
      padding-top: 0.5rem;
      width: 100%;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .logo-group {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .logo {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: #ffffff;
    }
    .logo span {
      color: #38bdf8;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
      background: rgba(34, 197, 94, 0.1);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #22c55e;
      box-shadow: 0 0 8px #22c55e;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    /* Language Switcher matching nada.mu landing page style */
    .lang-switcher-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      border-radius: 0.375rem;
      background: transparent;
      border: 1px solid rgba(51, 65, 85, 0.5);
      color: #cbd5e1;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .lang-switcher-btn:hover {
      background: rgba(30, 41, 59, 0.8);
      color: #ffffff;
      border-color: rgba(51, 65, 85, 0.8);
    }
    .user-info-bar {
      margin-bottom: 1.5rem;
    }
    .sub-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #f8fafc;
    }
    .sub-user {
      font-size: 0.9375rem;
      color: #94a3b8;
    }
    .main-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      width: 100%;
    }
    @media (min-width: 1024px) {
      .main-grid {
        grid-template-columns: 1.1fr 0.9fr;
        align-items: start;
      }
    }
    .grid-col {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .card {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(51, 65, 85, 0.6);
      border-radius: 1.25rem;
      padding: 1.5rem;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
    }
    .card-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }
    @media (max-width: 640px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
    .stat-item {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(51, 65, 85, 0.4);
      padding: 1rem;
      border-radius: 0.875rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .stat-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stat-value {
      font-size: 1.35rem;
      font-weight: 700;
      margin-top: 0.5rem;
      text-align: center;
      width: 100%;
    }
    .sub-input-group {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }
    .input-field {
      flex: 1;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
      color: #94a3b8;
      font-family: monospace;
      font-size: 0.875rem;
      outline: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      text-decoration: none;
      white-space: nowrap;
    }
    .btn-primary {
      background: #38bdf8;
      color: #0f172a;
    }
    .btn-primary:hover {
      background: #7dd3fc;
      box-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
    }
    .btn-secondary {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
    }
    .btn-secondary:hover {
      background: #334155;
      color: #ffffff;
    }
    .apps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.75rem;
    }
    @media (max-width: 640px) {
      .apps-grid {
        grid-template-columns: 1fr;
      }
    }
    .app-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(51, 65, 85, 0.5);
      border-radius: 0.875rem;
      padding: 0.875rem 1rem;
      color: #f1f5f9;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9375rem;
      transition: all 0.2s ease;
    }
    .app-btn:hover {
      background: rgba(56, 189, 248, 0.1);
      border-color: rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      transform: translateY(-1px);
    }
    .app-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .app-icon-img {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.5rem;
      object-fit: contain;
      flex-shrink: 0;
    }
    .nodes-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
    @media (min-width: 640px) {
      .nodes-grid {
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      }
    }
    .node-item {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(51, 65, 85, 0.4);
      border-radius: 0.875rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0.875rem;
    }
    .node-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .node-title {
      font-weight: 700;
      font-size: 0.9375rem;
      color: #f8fafc;
      margin-bottom: 0.25rem;
    }
    .node-sub {
      font-size: 0.75rem;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .tag-pill {
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.3);
      padding: 0.125rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.6875rem;
      font-weight: 700;
    }
    .node-actions {
      display: flex;
      gap: 0.5rem;
    }
    .node-actions .btn {
      flex: 1;
    }
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      z-index: 999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }
    .modal-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    .modal-card {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 1.5rem;
      padding: 1.75rem;
      max-width: 360px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .qr-container {
      background: #ffffff;
      padding: 1.25rem;
      border-radius: 1rem;
      margin: 1.25rem 0;
      display: inline-block;
    }
    .qr-container svg {
      display: block;
      width: 220px;
      height: 220px;
    }
    .toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #38bdf8;
      color: #0f172a;
      padding: 0.75rem 1.5rem;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 0.875rem;
      box-shadow: 0 10px 25px rgba(56, 189, 248, 0.4);
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      z-index: 1000;
    }
    .toast.show {
      transform: translateX(-50%) translateY(0);
    }
    .tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid #334155;
      padding-bottom: 0.75rem;
      margin-bottom: 1rem;
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-weight: 600;
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      cursor: pointer;
      white-space: nowrap;
    }
    .tab-btn.active {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
    }
    .instructions-content {
      font-size: 0.875rem;
      color: #cbd5e1;
      line-height: 1.6;
    }
    .instructions-content ol {
      padding-left: 1.25rem;
    }
    .instructions-content li {
      margin-bottom: 0.5rem;
    }
    .copy-code-btn {
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      padding: 0.25rem 0.6rem;
      border-radius: 0.375rem;
      font-family: monospace;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      word-break: break-all;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      margin: 0.25rem 0;
    }
    .copy-code-btn:hover {
      background: rgba(56, 189, 248, 0.2);
      border-color: #38bdf8;
      color: #ffffff;
    }
  </style>
</head>
<body>

  <div class="container">
    
    <!-- Header -->
    <header class="header">
      <div class="logo-group">
        <div class="logo">nada<span>.mu</span></div>
        <span class="badge"><span class="dot"></span> <span data-i18n="status_active">Подписка активна</span></span>
      </div>

      <div class="header-right">
        <!-- Language Switcher button in exact nada.mu landing style -->
        <button class="lang-switcher-btn" id="langToggleBtn" onclick="toggleLanguage()" title="Switch Language">
          <span style="font-size: 1.125rem; line-height: 1;" id="langFlag">🇷🇺</span>
          <span id="langCode">RU</span>
        </button>
      </div>
    </header>

    <!-- User Info Bar -->
    <div class="user-info-bar">
      <h1 class="sub-title">${escapeHtml(subName)}</h1>
      <div class="sub-user">
        <span data-i18n="user_label">Пользователь:</span> ${escapeHtml(userName || 'User')}
      </div>
    </div>

    <!-- Main Responsive Grid -->
    <div class="main-grid">
      
      <!-- Left Column -->
      <div class="grid-col">
        
        <!-- Traffic Stats Card (Ordered: Downloaded -> Uploaded -> Total, matching /admin) -->
        <div class="card">
          <div class="card-title">
            <span data-i18n="traffic_title">📊 Использование трафика</span>
            <span style="font-size: 0.75rem; font-weight: 500; color: #64748b;">
              <span data-i18n="updated_label">Обновлено:</span> ${lastFetchedStr}
            </span>
          </div>
          
          <div class="stats-grid">
            <!-- 1. Downloaded (Green ArrowDown, matching /admin) -->
            <div class="stat-item">
              <div class="stat-header" style="color: #4ade80;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <polyline points="19 12 12 19 5 12"></polyline>
                </svg>
                <span data-i18n="downloaded">Downloaded</span>
              </div>
              <div class="stat-value" style="color: #4ade80;">${formatBytes(trafficDown)}</div>
            </div>

            <!-- 2. Uploaded (Blue ArrowUp, matching /admin) -->
            <div class="stat-item">
              <div class="stat-header" style="color: #60a5fa;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
                <span data-i18n="uploaded">Uploaded</span>
              </div>
              <div class="stat-value" style="color: #60a5fa;">${formatBytes(trafficUp)}</div>
            </div>

            <!-- 3. Total (Purple Activity Chart, matching /admin) -->
            <div class="stat-item">
              <div class="stat-header" style="color: #c084fc;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
                <span data-i18n="total_traffic">Total</span>
              </div>
              <div class="stat-value" style="color: #c084fc;">${formatBytes(trafficTotal)}</div>
            </div>
          </div>
        </div>

        <!-- Quick Import Card -->
        <div class="card">
          <div class="card-title" data-i18n="quick_connect">🚀 Быстрое подключение</div>
          
          <div class="sub-input-group">
            <input type="text" readonly value="${safeHtmlSubUrl}" class="input-field" id="subUrlInput">
            <button class="btn btn-primary" onclick="copySubLink()">
              <span data-i18n="copy">📋 Копировать</span>
            </button>
            <button class="btn btn-secondary" onclick="openModal('mainQrModal')">
              <span data-i18n="qr_code">📱 QR-код</span>
            </button>
          </div>

          <div class="apps-grid">
            <!-- Hiddify -->
            <a href="${escapeHtml(hiddifyUrl)}" class="app-btn">
              <div class="app-info">
                <img src="/icons/hiddify.png" alt="Hiddify" class="app-icon-img">
                <div>
                  <div>Hiddify</div>
                  <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">Multi-platform</div>
                </div>
              </div>
              <span>→</span>
            </a>

            <!-- Clash -->
            <a href="${escapeHtml(clashUrl)}" class="app-btn">
              <div class="app-info">
                <img src="/icons/clash.png" alt="Clash" class="app-icon-img">
                <div>
                  <div>Clash</div>
                  <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">Windows / Mac / Linux</div>
                </div>
              </div>
              <span>→</span>
            </a>

            <!-- Clash Android -->
            <a href="${escapeHtml(clashUrl)}" class="app-btn">
              <div class="app-info">
                <img src="/icons/clash-android.png" alt="Clash Android" class="app-icon-img">
                <div>
                  <div>Clash Android</div>
                  <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">Android</div>
                </div>
              </div>
              <span>→</span>
            </a>

            <!-- Karing -->
            <a href="${escapeHtml(karingUrl)}" class="app-btn">
              <div class="app-info">
                <img src="/icons/karing.png" alt="Karing" class="app-icon-img">
                <div>
                  <div>Karing</div>
                  <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">Multi-platform</div>
                </div>
              </div>
              <span>→</span>
            </a>

            <!-- ClashMi -->
            <a href="${escapeHtml(clashmiUrl)}" class="app-btn">
              <div class="app-info">
                <img src="/icons/clashmi.png" alt="ClashMi" class="app-icon-img">
                <div>
                  <div>ClashMi</div>
                  <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">iOS / Android / Mac</div>
                </div>
              </div>
              <span>→</span>
            </a>
          </div>
        </div>

        <!-- Setup Instructions Card -->
        <div class="card">
          <div class="card-title" data-i18n="how_to_connect">📖 Как настроить подключение</div>
          
          <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('androidTab', this)">Android</button>
            <button class="tab-btn" onclick="switchTab('iosTab', this)">iOS</button>
            <button class="tab-btn" onclick="switchTab('desktopTab', this)" data-i18n="tab_desktop">Windows / macOS / Linux</button>
          </div>

          <div id="androidTab" class="tab-content instructions-content">
            <ol id="androidSteps"></ol>
          </div>

          <div id="iosTab" class="tab-content instructions-content" style="display: none;">
            <ol id="iosSteps"></ol>
          </div>

          <div id="desktopTab" class="tab-content instructions-content" style="display: none;">
            <ol id="desktopSteps"></ol>
          </div>
        </div>

      </div>

      <!-- Right Column: Nodes / Locations -->
      <div class="grid-col">
        
        <div class="card">
          <div class="card-title">
            <span><span data-i18n="locations">🌐 Доступные локации</span> (${nodeLinks.length})</span>
          </div>

          <div class="nodes-grid">
            ${nodeLinks.map((node, index) => `
              <div class="node-item">
                <div class="node-header">
                  <div>
                    <div class="node-title">${escapeHtml(node.nodeName)}</div>
                    <div class="node-sub">
                      <span class="tag-pill">${escapeHtml(node.inboundTag)}</span>
                      <span>${escapeHtml(node.address)}:${node.port}</span>
                    </div>
                  </div>
                </div>
                <div class="node-actions">
                  <button class="btn btn-secondary" style="padding: 0.5rem 0.75rem; font-size: 0.8125rem;" onclick="copyToClipboard('${escapeJs(node.vlessLink)}', 'copied_vless')">
                    <span data-i18n="copy_vless">📋 VLESS</span>
                  </button>
                  <button class="btn btn-secondary" style="padding: 0.5rem 0.75rem; font-size: 0.8125rem;" onclick="openModal('nodeQrModal_${index}')">
                    <span data-i18n="qr">📱 QR</span>
                  </button>
                </div>
              </div>

              <!-- Node QR Modal -->
              <div class="modal-overlay" id="nodeQrModal_${index}">
                <div class="modal-card">
                  <h3 style="font-size: 1.125rem; font-weight: 700; color: #f8fafc;">${escapeHtml(node.nodeName)}</h3>
                  <p style="font-size: 0.8125rem; color: #94a3b8; margin-top: 0.25rem;" data-i18n="scan_qr_desc">Отсканируйте в приложении VPN</p>
                  <div class="qr-container">${node.qrSvg}</div>
                  <button class="btn btn-secondary" style="width: 100%; justify-content: center;" onclick="closeModal('nodeQrModal_${index}')" data-i18n="close">Закрыть</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

    </div>

    <!-- Footer -->
    <footer style="text-align: center; font-size: 0.8125rem; color: #64748b; padding: 2rem 0 1rem 0;" id="footerText">
      nada.mu &copy; ${new Date().getFullYear()} &bull; Безопасное и быстрое подключение
    </footer>

  </div>

  <!-- Main QR Modal -->
  <div class="modal-overlay" id="mainQrModal">
    <div class="modal-card">
      <h3 style="font-size: 1.125rem; font-weight: 700; color: #f8fafc;" data-i18n="qr_modal_title">QR-код подписки</h3>
      <p style="font-size: 0.8125rem; color: #94a3b8; margin-top: 0.25rem;" data-i18n="scan_qr_desc">Отсканируйте сканером в VPN-клиенте</p>
      <div class="qr-container">${subQrSvg}</div>
      <button class="btn btn-secondary" style="width: 100%; justify-content: center;" onclick="closeModal('mainQrModal')" data-i18n="close">Закрыть</button>
    </div>
  </div>

  <!-- Toast Notification -->
  <div class="toast" id="toast">Ссылка скопирована!</div>

  <script>
    const globalSubUrl = "${safeJsSubUrl}";

    const i18n = {
      ru: {
        status_active: "Подписка активна",
        user_label: "Пользователь:",
        traffic_title: "📊 Использование трафика",
        updated_label: "Обновлено:",
        downloaded: "Скачано",
        uploaded: "Загружено",
        total_traffic: "Всего",
        quick_connect: "🚀 Быстрое подключение",
        copy: "📋 Копировать",
        qr_code: "📱 QR-код",
        locations: "🌐 Доступные локации",
        copy_vless: "📋 VLESS",
        qr: "📱 QR",
        how_to_connect: "📖 Как настроить подключение",
        tab_desktop: "Windows / macOS / Linux",
        scan_qr_desc: "Отсканируйте в приложении VPN",
        close: "Закрыть",
        qr_modal_title: "QR-код подписки",
        copied_sub: "Ссылка подписки скопирована!",
        copied_vless: "VLESS-ссылка скопирована!",
        copied_toast: "Скопировано в буфер обмена!",
        android_steps: [
          "Установите клиенты или из GitHub: <a href='https://github.com/hiddify/hiddify-app/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Hiddify</a>, <a href='https://github.com/MetaCubeX/ClashMetaForAndroid/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Clash Android</a>, <a href='https://github.com/KaringX/karing/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Karing</a>, <a href='https://github.com/KaringX/clashmi/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>ClashMi</a> или из <a href='https://play.google.com/store/apps/details?id=app.hiddify.com' target='_blank' style='color:#38bdf8; font-weight:600;'>Google Play</a>.",
          "Нажмите кнопку нужного приложения выше на этой странице или скопируйте ссылку подписки.",
          "В приложении нажмите <strong>«Новый профиль»</strong> → <strong>«Добавить из буфера обмена»</strong>.",
          "Включите системный прокси / TUN-режим."
        ],
        ios_steps: [
          "Установите <a href='https://apps.apple.com/us/app/clash-mi/id6744321968' target='_blank' style='color:#38bdf8; font-weight:600;'>ClashMI</a>, <a href='https://apps.apple.com/us/app/hiddify-proxy-vpn/id6596777532' target='_blank' style='color:#38bdf8; font-weight:600;'>Hiddify</a> или <a href='https://apps.apple.com/us/app/karing/id6472431552' target='_blank' style='color:#38bdf8; font-weight:600;'>Karing</a> из App Store.",
          "Нажмите кнопку нужного приложения выше на этой странице для автоматического импорта.",
          "Или отсканируйте <strong>QR-код</strong> подписки в приложении.",
          "Разрешите добавление конфигурации VPN и подключитесь."
        ],
        desktop_steps: [
          "Установите <a href='https://github.com/clash-verge-rev/clash-verge-rev/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Clash</a>, <a href='https://github.com/hiddify/hiddify-app/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Hiddify</a>, <a href='https://github.com/KaringX/karing/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Karing</a> или <a href='https://github.com/KaringX/clashmi/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>ClashMi</a>.",
          "Скопируйте ссылку подписки: <button class='copy-code-btn' onclick='copySubLink()' title='Нажмите для копирования'>${safeHtmlSubUrl} 📋</button> и вставьте в раздел «Подписки / Profiles».",
          "Включите системный прокси / TUN-режим."
        ],
        footer: "nada.mu &copy; ${new Date().getFullYear()} &bull; Безопасное и быстрое подключение"
      },
      en: {
        status_active: "Subscription Active",
        user_label: "User:",
        traffic_title: "📊 Traffic Usage",
        updated_label: "Updated:",
        downloaded: "Downloaded",
        uploaded: "Uploaded",
        total_traffic: "Total",
        quick_connect: "🚀 Quick Connect",
        copy: "📋 Copy",
        qr_code: "📱 QR Code",
        locations: "🌐 Available Locations",
        copy_vless: "📋 VLESS",
        qr: "📱 QR",
        how_to_connect: "📖 How to Connect",
        tab_desktop: "Windows / macOS / Linux",
        scan_qr_desc: "Scan inside your VPN app",
        close: "Close",
        qr_modal_title: "Subscription QR Code",
        copied_sub: "Subscription link copied!",
        copied_vless: "VLESS link copied!",
        copied_toast: "Copied to clipboard!",
        android_steps: [
          "Install clients either from GitHub: <a href='https://github.com/hiddify/hiddify-app/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Hiddify</a>, <a href='https://github.com/MetaCubeX/ClashMetaForAndroid/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Clash Android</a>, <a href='https://github.com/KaringX/karing/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Karing</a>, <a href='https://github.com/KaringX/clashmi/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>ClashMi</a> or from <a href='https://play.google.com/store/apps/details?id=app.hiddify.com' target='_blank' style='color:#38bdf8; font-weight:600;'>Google Play</a>.",
          "Tap the app button above or copy subscription link.",
          "In the app, tap <strong>«New Profile»</strong> → <strong>«Add from Clipboard»</strong>.",
          "Enable system proxy / TUN mode."
        ],
        ios_steps: [
          "Install <a href='https://apps.apple.com/us/app/clash-mi/id6744321968' target='_blank' style='color:#38bdf8; font-weight:600;'>ClashMI</a>, <a href='https://apps.apple.com/us/app/hiddify-proxy-vpn/id6596777532' target='_blank' style='color:#38bdf8; font-weight:600;'>Hiddify</a> or <a href='https://apps.apple.com/us/app/karing/id6472431552' target='_blank' style='color:#38bdf8; font-weight:600;'>Karing</a> from App Store.",
          "Tap the app button above for one-click import.",
          "Or scan the subscription <strong>QR Code</strong> in the app.",
          "Allow VPN configuration and connect."
        ],
        desktop_steps: [
          "Install <a href='https://github.com/clash-verge-rev/clash-verge-rev/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Clash</a>, <a href='https://github.com/hiddify/hiddify-app/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Hiddify</a>, <a href='https://github.com/KaringX/karing/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Karing</a> or <a href='https://github.com/KaringX/clashmi/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>ClashMi</a>.",
          "Copy subscription link: <button class='copy-code-btn' onclick='copySubLink()' title='Click to copy'>${safeHtmlSubUrl} 📋</button> and paste into «Profiles» section.",
          "Enable system proxy / TUN mode."
        ],
        footer: "nada.mu &copy; ${new Date().getFullYear()} &bull; Fast & Secure Connection"
      }
    };

    let currentLang = 'ru';

    function getCookie(name) {
      const value = \`; \${document.cookie}\`;
      const parts = value.split(\`; \${name}=\`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    }

    function initLanguage() {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang');
      const cookieLang = getCookie('NEXT_LOCALE');
      const savedLang = localStorage.getItem('sub_lang');
      
      if (urlLang === 'en' || urlLang === 'ru') {
        currentLang = urlLang;
      } else if (cookieLang === 'en' || cookieLang === 'ru') {
        currentLang = cookieLang;
      } else if (savedLang === 'en' || savedLang === 'ru') {
        currentLang = savedLang;
      } else if (navigator.language && navigator.language.startsWith('en')) {
        currentLang = 'en';
      }

      applyLanguage(currentLang);
    }

    function toggleLanguage() {
      const newLang = currentLang === 'ru' ? 'en' : 'ru';
      applyLanguage(newLang);
    }

    function applyLanguage(lang) {
      currentLang = lang;
      localStorage.setItem('sub_lang', lang);
      document.cookie = \`NEXT_LOCALE=\${lang}; path=/; max-age=31536000\`;
      document.documentElement.lang = lang;

      const flagEl = document.getElementById('langFlag');
      const codeEl = document.getElementById('langCode');
      if (flagEl) flagEl.innerText = lang === 'ru' ? '🇷🇺' : '🇬🇧';
      if (codeEl) codeEl.innerText = lang === 'ru' ? 'RU' : 'EN';

      const dict = i18n[lang] || i18n.ru;

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
          el.innerHTML = dict[key];
        }
      });

      renderSteps('androidSteps', dict.android_steps);
      renderSteps('iosSteps', dict.ios_steps);
      renderSteps('desktopSteps', dict.desktop_steps);

      document.getElementById('footerText').innerHTML = dict.footer;
    }

    function renderSteps(elementId, steps) {
      const el = document.getElementById(elementId);
      if (!el || !steps) return;
      el.innerHTML = steps.map(step => \`<li>\${step}</li>\`).join('');
    }

    function copySubLink() {
      copyToClipboard(globalSubUrl, 'copied_sub');
    }

    function copyToClipboard(text, key) {
      const dict = i18n[currentLang] || i18n.ru;
      const message = dict[key] || dict.copied_toast;

      navigator.clipboard.writeText(text).then(() => {
        showToast(message);
      }).catch(err => {
        console.error('Failed to copy: ', err);
      });
    }

    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.innerText = message;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2500);
    }

    function openModal(id) {
      const modal = document.getElementById(id);
      if (modal) modal.classList.add('active');
    }

    function closeModal(id) {
      const modal = document.getElementById(id);
      if (modal) modal.classList.remove('active');
    }

    function switchTab(tabId, btn) {
      document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      const activeTab = document.getElementById(tabId);
      if (activeTab) activeTab.style.display = 'block';
      if (btn) btn.classList.add('active');
    }

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });

    initLanguage();
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJs(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}
