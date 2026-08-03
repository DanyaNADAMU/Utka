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
  const base64SubUrl = Buffer.from(subUrl).toString('base64');

  const hiddifyUrl = `hiddify://import/${subUrl}#${encodedName}`;
  const clashUrl = `clash://install-config?url=${encodedSubUrl}&name=${encodedName}`;
  const singboxUrl = `sing-box://import-remote-profile?url=${encodedSubUrl}#${encodedName}`;
  const shadowrocketUrl = `sub://${base64SubUrl}`;

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
      padding: 1.5rem 1rem;
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.12) 0%, transparent 50%),
        radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.08) 0%, transparent 40%);
    }
    .container {
      width: 100%;
      max-width: 760px;
    }
    .header {
      text-align: center;
      margin-bottom: 2rem;
      padding-top: 1rem;
    }
    .logo {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: #ffffff;
      margin-bottom: 0.5rem;
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
    .card {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(51, 65, 85, 0.6);
      border-radius: 1.25rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
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
      margin-bottom: 0.5rem;
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
    }
    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 0.375rem;
    }
    .stat-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: #38bdf8;
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
      grid-template-columns: repeat(2, 1fr);
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
    .app-icon {
      width: 2rem;
      height: 2rem;
      border-radius: 0.5rem;
      background: rgba(56, 189, 248, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.125rem;
    }
    .node-item {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(51, 65, 85, 0.4);
      border-radius: 0.875rem;
      padding: 1rem;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    @media (max-width: 640px) {
      .node-item {
        flex-direction: column;
        align-items: flex-start;
      }
      .node-actions {
        width: 100%;
        display: flex;
        gap: 0.5rem;
      }
      .node-actions .btn {
        flex: 1;
      }
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
      <div class="logo">nada<span>.mu</span></div>
      <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-top: 0.5rem;">
        <span class="badge"><span class="dot"></span> Подписка активна</span>
      </div>
      <h1 style="font-size: 1.5rem; font-weight: 700; margin-top: 1rem; color: #f8fafc;">
        ${escapeHtml(subName)}
      </h1>
      <p style="font-size: 0.875rem; color: #94a3b8; margin-top: 0.25rem;">
        Пользователь: ${escapeHtml(userName || 'Пользователь')}
      </p>
    </header>

    <!-- Stats Card -->
    <div class="card">
      <div class="card-title">
        <span>📊 Использование трафика</span>
        <span style="font-size: 0.75rem; font-weight: 500; color: #64748b;">Обновлено: ${lastFetchedStr}</span>
      </div>
      
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Всего трафика</div>
          <div class="stat-value">${formatBytes(trafficTotal)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Загружено (Down)</div>
          <div class="stat-value" style="color: #4ade80;">${formatBytes(trafficDown)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Отправлено (Up)</div>
          <div class="stat-value" style="color: #c084fc;">${formatBytes(trafficUp)}</div>
        </div>
      </div>
    </div>

    <!-- Quick Import Card -->
    <div class="card">
      <div class="card-title">🚀 Быстрое подключение</div>
      
      <div class="sub-input-group">
        <input type="text" readonly value="${escapeHtml(subUrl)}" class="input-field" id="subUrlInput">
        <button class="btn btn-primary" onclick="copyToClipboard('${escapeJs(subUrl)}', 'Ссылка подписки скопирована!')">
          📋 Копировать
        </button>
        <button class="btn btn-secondary" onclick="openModal('mainQrModal')">
          📱 QR-код
        </button>
      </div>

      <div class="apps-grid">
        <a href="${escapeHtml(hiddifyUrl)}" class="app-btn">
          <div class="app-info">
            <div class="app-icon">🚀</div>
            <div>
              <div>Hiddify Next</div>
              <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">Multi-platform</div>
            </div>
          </div>
          <span>→</span>
        </a>

        <a href="${escapeHtml(clashUrl)}" class="app-btn">
          <div class="app-info">
            <div class="app-icon">🐱</div>
            <div>
              <div>Clash / Verge</div>
              <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">Windows / Mac</div>
            </div>
          </div>
          <span>→</span>
        </a>

        <a href="${escapeHtml(singboxUrl)}" class="app-btn">
          <div class="app-info">
            <div class="app-icon">📦</div>
            <div>
              <div>Sing-Box</div>
              <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">iOS / Android / Desktop</div>
            </div>
          </div>
          <span>→</span>
        </a>

        <a href="${escapeHtml(shadowrocketUrl)}" class="app-btn">
          <div class="app-info">
            <div class="app-icon">🚀</div>
            <div>
              <div>Shadowrocket</div>
              <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">iOS</div>
            </div>
          </div>
          <span>→</span>
        </a>
      </div>
    </div>

    <!-- Nodes Card -->
    <div class="card">
      <div class="card-title">🌐 Доступные локации (${nodeLinks.length})</div>

      ${nodeLinks.map((node, index) => `
        <div class="node-item">
          <div>
            <div class="node-title">${escapeHtml(node.nodeName)}</div>
            <div class="node-sub">
              <span class="tag-pill">${escapeHtml(node.inboundTag)}</span>
              <span>${escapeHtml(node.address)}:${node.port}</span>
            </div>
          </div>
          <div class="node-actions">
            <button class="btn btn-secondary" style="padding: 0.5rem 0.875rem; font-size: 0.8125rem;" onclick="copyToClipboard('${escapeJs(node.vlessLink)}', 'VLESS-ссылка скопирована!')">
              📋 VLESS
            </button>
            <button class="btn btn-secondary" style="padding: 0.5rem 0.875rem; font-size: 0.8125rem;" onclick="openModal('nodeQrModal_${index}')">
              📱 QR
            </button>
          </div>
        </div>

        <!-- Node QR Modal -->
        <div class="modal-overlay" id="nodeQrModal_${index}">
          <div class="modal-card">
            <h3 style="font-size: 1.125rem; font-weight: 700; color: #f8fafc;">${escapeHtml(node.nodeName)}</h3>
            <p style="font-size: 0.8125rem; color: #94a3b8; margin-top: 0.25rem;">Отсканируйте в приложении VPN</p>
            <div class="qr-container">${node.qrSvg}</div>
            <button class="btn btn-secondary" style="width: 100%; justify-content: center;" onclick="closeModal('nodeQrModal_${index}')">Закрыть</button>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Instructions Card -->
    <div class="card">
      <div class="card-title">📖 Как настроить подключение</div>
      
      <div class="tabs">
        <button class="tab-btn active" onclick="switchTab('androidTab', this)">Android</button>
        <button class="tab-btn" onclick="switchTab('iosTab', this)">iOS (iPhone)</button>
        <button class="tab-btn" onclick="switchTab('windowsTab', this)">Windows</button>
        <button class="tab-btn" onclick="switchTab('macTab', this)">macOS</button>
      </div>

      <div id="androidTab" class="tab-content instructions-content">
        <ol>
          <li>Установите приложение <strong>Hiddify Next</strong> из Google Play.</li>
          <li>Нажмите кнопку <strong>«Hiddify Next →»</strong> выше на этой странице или скопируйте ссылку подписки.</li>
          <li>В приложении нажмите <strong>«Новый профиль»</strong> → <strong>«Добавить из буфера обмена»</strong>.</li>
          <li>Нажмите кнопку подключения для старта VPN.</li>
        </ol>
      </div>

      <div id="iosTab" class="tab-content instructions-content" style="display: none;">
        <ol>
          <li>Установите <strong>Hiddify</strong>, <strong>Shadowrocket</strong> или <strong>Streisand</strong> из App Store.</li>
          <li>Нажмите кнопку нужного приложения выше на этой странице для автоматического импорта.</li>
          <li>Или отсканируйте <strong>QR-код</strong> подписки в приложении.</li>
          <li>Разрешите добавление конфигурации VPN и подключитесь.</li>
        </ol>
      </div>

      <div id="windowsTab" class="tab-content instructions-content" style="display: none;">
        <ol>
          <li>Скачайте и установите <strong>Hiddify Next</strong> или <strong>Clash Verge Rev</strong>.</li>
          <li>Нажмите кнопку импорта на этой странице или скопируйте URL подписки.</li>
          <li>Вставьте ссылку в раздел «Подписки / Profiles» и нажмите «Обновить».</li>
          <li>Включите системный прокси / TUN-режим.</li>
        </ol>
      </div>

      <div id="macTab" class="tab-content instructions-content" style="display: none;">
        <ol>
          <li>Скачайте <strong>Hiddify Next</strong> или <strong>Clash Verge Rev for macOS</strong>.</li>
          <li>Нажмите кнопку быстрой добавления выше на этой странице.</li>
          <li>Активируйте TUN-режим или системный прокси для фильтрации трафика.</li>
        </ol>
      </div>
    </div>

    <footer style="text-align: center; font-size: 0.8125rem; color: #64748b; padding: 1.5rem 0;">
      nada.mu &copy; ${new Date().getFullYear()} &bull; Безопасное и быстрое подключение
    </footer>

  </div>

  <!-- Main QR Modal -->
  <div class="modal-overlay" id="mainQrModal">
    <div class="modal-card">
      <h3 style="font-size: 1.125rem; font-weight: 700; color: #f8fafc;">QR-код подписки</h3>
      <p style="font-size: 0.8125rem; color: #94a3b8; margin-top: 0.25rem;">Отсканируйте сканером в VPN-клиенте</p>
      <div class="qr-container">${subQrSvg}</div>
      <button class="btn btn-secondary" style="width: 100%; justify-content: center;" onclick="closeModal('mainQrModal')">Закрыть</button>
    </div>
  </div>

  <!-- Toast Notification -->
  <div class="toast" id="toast">Ссылка скопирована!</div>

  <script>
    function copyToClipboard(text, message) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(message || 'Скопировано в буфер обмена!');
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

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });
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
