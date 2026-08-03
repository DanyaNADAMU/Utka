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

// Client icons from /home/danya/Projects/icons/ProxyVPN Client Icons/
const hiddifyIconBase64 = "data:image/png;base64,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";
const clashIconBase64 = "data:image/png;base64,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";
const karingIconBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAEOElEQVRogc2ZX4hVVRTGv2+dOU+aM001QxR6MImE1LwwetADkYhghY/98UGp0IMEQRFRRBIEEQZBvRQCkYkWlPQQwRCZ2h+eCgt6EKIiEwt1Zpw5c845e22cffd392HuvWvu3HvXzF3YvXvO/q211/r2P2utvfdapZR4L5gA4GngSeA+4H4/7nK/fxe4H/gKeBp4XUrZt2i0wQW+E3gc+BrA9x8F/gKeBu73Y4PPA48AD/oxp7TWFwsdswp/tXwz0y/q/7+c/wngTf/9Z8DngH2+j1kEvgU426+53a8N/L/bL262H7MBwM+p900/P1u+t2P1XWp922bT6jttFIBn/Dov+fmeGfS+r0o51Yq2l388DazM1O/0tUuAHwE8B+xveO0j8/y2D6yWzY6fvgC869deV5P+p/x2u5t8t6V5pP+9x8A48BLwnJvLw/53t9l/hZ/ngJv8upfK+m7w9eZc201+vgvgbeBhYKffb8+g82b0eQ04B9ztxzeA1/yee/y+r2Tq/y3zW1Wzbfp879d+6dcN5+lJ4EvgXmBNg967Wupz102+1Yx4xW3iGv+5+N26ebrs080p555/0l9cM0h9j2b0bZ7vXwK+88s3zW46f/z364DP/XrfAPgB+Dugbwf8vN7M572+LwP/Ar/7uY5M3a2L4E33wZ1+ngHwFjDg937h5+9gWjM9rT+c4X+81fH+1L0wA5ztl4z4+X7gI2DCz2+N1bX58G33yU2A/7y7mX/vH6Z3kU+02F5b2u3Xq31hQesC24D3gD3Ag606Vl2c6114q1X7fQo41q7t5ZivW1w1q8vF2l6K+Ua6/vXFhE4Cg8C8R6qZqQ9a6oM55j82lP+eP3b97b0uX3Xy3WvW/gawA+j0a1+a6YfL+PzO16f0oQ+6fD03x+c3Ab+lPvwE8LpfrgPeA9pztD/m9wW9eY+2qX+pmeZ6c3wuC/fCJeAe4AXgbWB33lmtcK2/ePcCz/o7p/Z7M4/tD7b/1kXWn58a5g8f3e5p7r5e04BdwNfA18B9/ng3sB+4DdgH7AbamfpJfx0A9gDbMnU/7PfdH2x/wB8L/br7/brG7+8AfgM6s32kHl9LzT+n+p/3c72b8h5/7g12zG1+3vH7e4D3A1sNfJtXl1wX6uW/G1gV9h0D9gHf+P2eD9tO+3XG0vG0lF8Efp2r7+WcTzWp311g210+Z9V5y+/Lff834FPgsVzXN/s9C0zW7LszNf+mmnv6dIu38zGg3XbM533P190XWpmnw5bU7A8/j2V+7nU233d/y18t3qLqH+23f1lK+f6i+fD17wB+BD71b12u5a2NttO4e13v/7h7c+2rU7e852vj/Qx86FvY9b6/bvl/3a6eP/8v0C/0iP2tS9j27lJ+zRfl896f5b/V+9wKPBvV1+i8+n63s9T03Fh/6W5jRj7912jZfT56Dqj92e1N13pX05q9wM+d6eBmv3/X0X7r0f54tG/+A4C5dY2i67yOAAAAAElFTkSuG6M=";

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

  const lastFetchedStr = lastFetched
    ? new Date(lastFetched).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Никогда';

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
      grid-template-columns: repeat(3, 1fr);
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
            <input type="text" readonly value="${escapeHtml(subUrl)}" class="input-field" id="subUrlInput">
            <button class="btn btn-primary" onclick="copyToClipboard('${escapeJs(subUrl)}', 'copied_sub')">
              <span data-i18n="copy">📋 Копировать</span>
            </button>
            <button class="btn btn-secondary" onclick="openModal('mainQrModal')">
              <span data-i18n="qr_code">📱 QR-код</span>
            </button>
          </div>

          <div class="apps-grid">
            <!-- Hiddify Next Official Icon -->
            <a href="${escapeHtml(hiddifyUrl)}" class="app-btn">
              <div class="app-info">
                <img src="${hiddifyIconBase64}" alt="Hiddify" class="app-icon-img">
                <div>
                  <div>Hiddify Next</div>
                  <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">Multi-platform</div>
                </div>
              </div>
              <span>→</span>
            </a>

            <!-- Clash / Verge Official Icon -->
            <a href="${escapeHtml(clashUrl)}" class="app-btn">
              <div class="app-info">
                <img src="${clashIconBase64}" alt="Clash" class="app-icon-img">
                <div>
                  <div>Clash / Verge</div>
                  <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">Windows / Mac / Linux</div>
                </div>
              </div>
              <span>→</span>
            </a>

            <!-- Karing Official Icon -->
            <a href="${escapeHtml(karingUrl)}" class="app-btn">
              <div class="app-info">
                <img src="${karingIconBase64}" alt="Karing" class="app-icon-img">
                <div>
                  <div>Karing</div>
                  <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">Multi-platform</div>
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
            <button class="tab-btn" onclick="switchTab('iosTab', this)">iOS (iPhone)</button>
            <button class="tab-btn" onclick="switchTab('windowsTab', this)">Windows</button>
            <button class="tab-btn" onclick="switchTab('macTab', this)">macOS</button>
            <button class="tab-btn" onclick="switchTab('linuxTab', this)">Linux</button>
          </div>

          <div id="androidTab" class="tab-content instructions-content">
            <ol id="androidSteps"></ol>
          </div>

          <div id="iosTab" class="tab-content instructions-content" style="display: none;">
            <ol id="iosSteps"></ol>
          </div>

          <div id="windowsTab" class="tab-content instructions-content" style="display: none;">
            <ol id="windowsSteps"></ol>
          </div>

          <div id="macTab" class="tab-content instructions-content" style="display: none;">
            <ol id="macSteps"></ol>
          </div>

          <div id="linuxTab" class="tab-content instructions-content" style="display: none;">
            <ol id="linuxSteps"></ol>
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
    const subUrlText = "${escapeJs(subUrl)}";

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
        scan_qr_desc: "Отсканируйте в приложении VPN",
        close: "Закрыть",
        qr_modal_title: "QR-код подписки",
        copied_sub: "Ссылка подписки скопирована!",
        copied_vless: "VLESS-ссылка скопирована!",
        copied_toast: "Скопировано в буфер обмена!",
        android_steps: [
          "Установите приложение <strong>Hiddify Next</strong> из Google Play.",
          "Нажмите кнопку <strong>«Hiddify Next →»</strong> выше на этой странице или скопируйте ссылку подписки.",
          "В приложении нажмите <strong>«Новый профиль»</strong> → <strong>«Добавить из буфера обмена»</strong>.",
          "Нажмите кнопку подключения для старта VPN."
        ],
        ios_steps: [
          "Установите <strong>Hiddify</strong> или <strong>Karing</strong> из App Store.",
          "Нажмите кнопку нужного приложения выше на этой странице для автоматического импорта.",
          "Или отсканируйте <strong>QR-код</strong> подписки в приложении.",
          "Разрешите добавление конфигурации VPN и подключитесь."
        ],
        windows_steps: [
          "Скачайте и установите <strong>Hiddify Next</strong>, <strong>Clash Verge Rev</strong> или <strong>Karing</strong>.",
          "Нажмите кнопку импорта на этой странице или скопируйте URL подписки.",
          "Вставьте ссылку в раздел «Подписки / Profiles» и нажмите «Обновить».",
          "Включите системный прокси / TUN-режим."
        ],
        mac_steps: [
          "Скачайте <strong>Hiddify Next</strong>, <strong>Clash Verge Rev</strong> или <strong>Karing</strong>.",
          "Нажмите кнопку быстрой добавления выше на этой странице.",
          "Активируйте TUN-режим или системный прокси для фильтрации трафика."
        ],
        linux_steps: [
          "Установите <a href='https://github.com/clash-verge-rev/clash-verge-rev/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Clash Verge Rev</a>, <a href='https://github.com/hiddify/hiddify-app/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Hiddify</a> или <a href='https://github.com/KaringX/karing/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Karing</a>.",
          "Импортируйте ссылку подписки (<code style='background:rgba(30,41,59,0.8); padding:0.125rem 0.375rem; border-radius:0.25rem; font-size:0.8125rem; color:#38bdf8;'>\" + subUrlText + \"</code>) в приложение.",
          "Включите TUN / VPN режим."
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
        scan_qr_desc: "Scan inside your VPN app",
        close: "Close",
        qr_modal_title: "Subscription QR Code",
        copied_sub: "Subscription link copied!",
        copied_vless: "VLESS link copied!",
        copied_toast: "Copied to clipboard!",
        android_steps: [
          "Install <strong>Hiddify Next</strong> from Google Play.",
          "Tap <strong>«Hiddify Next →»</strong> above or copy subscription link.",
          "In the app, tap <strong>«New Profile»</strong> → <strong>«Add from Clipboard»</strong>.",
          "Tap the connect button to start VPN."
        ],
        ios_steps: [
          "Install <strong>Hiddify</strong> or <strong>Karing</strong> from App Store.",
          "Tap the app button above for one-click import.",
          "Or scan the subscription <strong>QR Code</strong> in the app.",
          "Allow VPN configuration and connect."
        ],
        windows_steps: [
          "Download and install <strong>Hiddify Next</strong>, <strong>Clash Verge Rev</strong> or <strong>Karing</strong>.",
          "Tap import above or copy subscription URL.",
          "Paste link into «Profiles» section and click «Update».",
          "Enable system proxy / TUN mode."
        ],
        mac_steps: [
          "Download <strong>Hiddify Next</strong>, <strong>Clash Verge Rev</strong> or <strong>Karing</strong>.",
          "Tap quick import button above.",
          "Activate TUN mode or system proxy."
        ],
        linux_steps: [
          "Install <a href='https://github.com/clash-verge-rev/clash-verge-rev/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Clash Verge Rev</a>, <a href='https://github.com/hiddify/hiddify-app/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Hiddify</a> or <a href='https://github.com/KaringX/karing/releases/latest' target='_blank' style='color:#38bdf8; font-weight:600;'>Karing</a>.",
          "Import subscription link (<code style='background:rgba(30,41,59,0.8); padding:0.125rem 0.375rem; border-radius:0.25rem; font-size:0.8125rem; color:#38bdf8;'>\" + subUrlText + \"</code>) into the app.",
          "Enable TUN / VPN mode."
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
      renderSteps('windowsSteps', dict.windows_steps);
      renderSteps('macSteps', dict.mac_steps);
      renderSteps('linuxSteps', dict.linux_steps);

      document.getElementById('footerText').innerHTML = dict.footer;
    }

    function renderSteps(elementId, steps) {
      const el = document.getElementById(elementId);
      if (!el || !steps) return;
      el.innerHTML = steps.map(step => \`<li>\${step}</li>\`).join('');
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
