# Chrome拡張UI優先開発戦略

## UI First の理由

1. **視覚的な進捗確認** - 動作する画面で成果を実感
2. **早期UX検証** - バックエンド実装前にユーザビリティ確認
3. **開発モチベーション** - 見た目の完成で達成感・継続意欲
4. **技術リスク軽減** - Chrome MV3制約を最初に把握

---

## Week 1 詳細: Chrome拡張UI完全実装

### Day 1 (8/27): プロジェクト初期化 + 基本構造

#### Morning: 環境構築 (3時間)
```bash
mkdir hp-planner-chrome-extension
cd hp-planner-chrome-extension
npm init -y
```

#### 1. Manifest V3 設定
```json
{
  "manifest_version": 3,
  "name": "HP Planner",
  "version": "1.0.0",
  "description": "疲労度管理による業務効率化支援",
  "permissions": [
    "storage",
    "alarms",
    "activeTab"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "HP Planner",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "options_page": "options.html"
}
```

#### 2. ディレクトリ構造作成
```
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html
│   ├── options.js
│   └── options.css
├── background/
│   └── background.js
├── icons/
│   └── (アイコンファイル群)
└── lib/
    └── hp-calculator.js
```

#### Afternoon: 基本HTML/CSS (4時間)
- popup.html 基本レイアウト作成
- SVGリング用のCSS設計
- アイコン作成（Figma/Canva）

### Day 2 (8/28): SVGリング実装 + レスポンシブ

#### Morning: SVGリングHP表示 (4時間)
```html
<!-- popup.html -->
<div class="hp-container">
  <svg class="hp-ring" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="40" class="hp-bg-circle"/>
    <circle cx="50" cy="50" r="40" class="hp-progress-circle" 
            stroke-dasharray="251.2" stroke-dashoffset="125.6"/>
  </svg>
  <div class="hp-text">
    <span class="hp-value">75</span>
    <span class="hp-unit">%</span>
  </div>
</div>
```

```css
/* popup.css */
.hp-container {
  position: relative;
  width: 120px;
  height: 120px;
}

.hp-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.hp-progress-circle {
  fill: none;
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease;
}

/* HP値による色分け */
.hp-high { stroke: #4CAF50; }    /* 緑: 60%以上 */
.hp-medium { stroke: #FF9800; }  /* オレンジ: 30-60% */
.hp-low { stroke: #F44336; }     /* 赤: 30%未満 */
```

#### Afternoon: JavaScript HP表示ロジック (4時間)
```javascript
// popup.js
class HPDisplay {
  constructor() {
    this.currentHP = 75; // 初期値
    this.init();
  }

  init() {
    this.updateDisplay();
    this.startPolling();
  }

  updateDisplay() {
    const circle = document.querySelector('.hp-progress-circle');
    const hpValue = document.querySelector('.hp-value');
    const hpText = document.querySelector('.hp-text');
    
    // 円の進捗更新 (0-100% → 0-251.2の円周)
    const circumference = 251.2;
    const offset = circumference - (this.currentHP / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    
    // 色分け
    circle.className = this.getHPColorClass(this.currentHP);
    hpValue.textContent = this.currentHP;
    
    // 追加情報表示
    this.updateSubInfo();
  }

  getHPColorClass(hp) {
    if (hp >= 60) return 'hp-progress-circle hp-high';
    if (hp >= 30) return 'hp-progress-circle hp-medium';
    return 'hp-progress-circle hp-low';
  }

  startPolling() {
    setInterval(() => {
      this.fetchHPData();
    }, 60000); // 60秒ごと
  }

  async fetchHPData() {
    // Week 1: モックデータ
    // Week 2: 実API呼び出しに置き換え
    this.simulateHPChange();
  }

  simulateHPChange() {
    // デモ用: 5分ごとに-0.5減少
    this.currentHP = Math.max(0, this.currentHP - 0.5);
    this.updateDisplay();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new HPDisplay();
});
```

### Day 3 (8/29): モックデータシステム + HP計算

#### Morning: モックデータ設計 (3時間)
```javascript
// lib/mock-data.js
const MOCK_WEATHER_DATA = {
  "2025-08-29": {
    temperature_2m_max: 32.5,
    temperature_2m_min: 24.1,
    precipitation_probability_max: 20
  }
};

const MOCK_MEETING_DATA = [
  {
    id: 1,
    title: "週次定例会議",
    start: "09:00",
    duration: 60,
    attendees: 8,
    type: "報告",
    description: "各チーム進捗共有"
  },
  {
    id: 2, 
    title: "新機能ブレインストーミング",
    start: "14:00",
    duration: 90,
    attendees: 5,
    type: "ブレスト",
    description: "Q4新機能のアイデア出し"
  }
];

const MOCK_HP_COEFFICIENTS = {
  type: {
    "決定": 2.0,
    "ブレスト": 2.5,
    "報告": 1.0,
    "1on1": 1.5,
    "レビュー": 2.0,
    "企画": 2.0,
    "面談": 2.8,
    "ワークショップ": 2.2,
    "雑談": 0.8,
    "作業": 1.2
  },
  lengthScale: 0.2,
  attendeeStep: 0.2,
  vague: 1.5,
  naturalDecay: 0.5
};
```

#### Afternoon: HP計算ロジック実装 (4時間)
```javascript
// lib/hp-calculator.js
class HPCalculator {
  constructor(coefficients = MOCK_HP_COEFFICIENTS) {
    this.coef = coefficients;
  }

  calculateBaseHP(weather) {
    const { temperature_2m_max: tmax, temperature_2m_min: tmin, 
            precipitation_probability_max: rainProb } = weather;
    
    let baseHP = 100;
    baseHP -= Math.max(0, tmax - 30) * 1.2;  // 暑さ影響
    baseHP -= Math.max(0, 18 - tmin) * 0.5;  // 寒さ影響  
    baseHP -= (rainProb / 100) * 10;         // 雨確率影響
    
    return Math.max(30, Math.min(100, Math.round(baseHP)));
  }

  calculateMeetingCost(meeting, timeDelta = 15) {
    const typeCost = this.coef.type[meeting.type] || 1.0;
    const lengthCost = 1 + (meeting.duration / 60) * this.coef.lengthScale;
    const attendeeCost = Math.max(0, meeting.attendees - 2) * this.coef.attendeeStep;
    
    // 15分あたりのコスト
    const totalCost = typeCost * lengthCost * (1 + attendeeCost);
    return (totalCost * timeDelta) / meeting.duration;
  }

  updateHP(currentHP, timeDelta, meetings = []) {
    // 自然減衰
    const naturalDecay = this.coef.naturalDecay * (timeDelta / 15);
    
    // 会議コスト
    const meetingCost = meetings.reduce((cost, meeting) => 
      cost + this.calculateMeetingCost(meeting, timeDelta), 0);
    
    const newHP = currentHP - naturalDecay - meetingCost;
    return Math.max(0, Math.min(100, Math.round(newHP)));
  }
}
```

### Day 4 (8/30): トースト通知システム

#### Morning: 通知UI実装 (4時間)
```html
<!-- popup.html に追加 -->
<div id="toast-container" class="toast-container">
  <!-- 動的に通知を挿入 -->
</div>
```

```css
/* popup.css */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.toast {
  background: white;
  border-left: 4px solid #FF9800;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  padding: 16px;
  margin-bottom: 8px;
  min-width: 300px;
  animation: slideIn 0.3s ease;
}

.toast-warning { border-color: #FF9800; }
.toast-critical { border-color: #F44336; }

.toast-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.toast-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.toast-btn-primary {
  background: #2196F3;
  color: white;
}

.toast-btn-secondary {
  background: #E0E0E0;
  color: #333;
}
```

#### Afternoon: 通知ロジック + .ics生成 (4時間)
```javascript
// popup.js に追加
class NotificationSystem {
  constructor(hpDisplay) {
    this.hpDisplay = hpDisplay;
    this.lastNotificationTime = {};
  }

  checkThresholds(currentHP) {
    const now = Date.now();
    
    if (currentHP <= 10 && this.shouldNotify('critical', now)) {
      this.showCriticalNotification();
    } else if (currentHP <= 25 && this.shouldNotify('warning', now)) {
      this.showWarningNotification();
    } else if (currentHP <= 40 && this.shouldNotify('caution', now)) {
      this.showCautionNotification();
    }
  }

  shouldNotify(type, now) {
    const lastTime = this.lastNotificationTime[type] || 0;
    const cooldown = 30 * 60 * 1000; // 30分
    return (now - lastTime) > cooldown;
  }

  showWarningNotification() {
    this.createToast({
      type: 'warning',
      title: 'HP低下警告 (25%)',
      message: '疲労が蓄積しています。10分休憩をお勧めします。',
      actions: [
        { text: '10分休憩を追加', action: () => this.addBreak(10) },
        { text: '後で', action: () => this.dismissToast() }
      ]
    });
    
    this.lastNotificationTime['warning'] = Date.now();
  }

  createToast(config) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${config.type}`;
    toast.innerHTML = `
      <div class="toast-title">${config.title}</div>
      <div class="toast-message">${config.message}</div>
      <div class="toast-actions">
        ${config.actions.map(action => 
          `<button class="toast-btn toast-btn-primary" onclick="${action.action}">${action.text}</button>`
        ).join('')}
      </div>
    `;
    
    document.getElementById('toast-container').appendChild(toast);
    
    // 10秒後自動削除
    setTimeout(() => toast.remove(), 10000);
  }

  addBreak(minutes) {
    // .ics ファイル生成・ダウンロード
    const icsContent = this.generateICS(minutes);
    this.downloadICS(icsContent, `break-${minutes}min.ics`);
    this.dismissToast();
  }

  generateICS(minutes) {
    const now = new Date();
    const start = new Date(now.getTime() + 5 * 60000); // 5分後開始
    const end = new Date(start.getTime() + minutes * 60000);
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HP Planner//Break//EN
BEGIN:VEVENT
UID:break-${Date.now()}@hp-planner
DTSTAMP:${this.formatDate(now)}
DTSTART:${this.formatDate(start)}
DTEND:${this.formatDate(end)}
SUMMARY:🛌 HP回復ブレイク (${minutes}分)
DESCRIPTION:HP Planner による自動休憩提案
END:VEVENT
END:VCALENDAR`;
  }

  downloadICS(content, filename) {
    const blob = new Blob([content], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatDate(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
}
```

### Day 5 (8/31): Options設定画面

#### Morning: Options画面UI (3時間)
```html
<!-- options.html -->
<!DOCTYPE html>
<html>
<head>
  <title>HP Planner 設定</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>HP Planner 設定</h1>
    </header>
    
    <section class="section">
      <h2>HP計算係数</h2>
      <div class="coef-grid">
        <div class="coef-item">
          <label>自然減衰 (/15分)</label>
          <input type="range" id="naturalDecay" min="0" max="2" step="0.1" value="0.5">
          <span class="coef-value">0.5</span>
        </div>
        
        <div class="coef-item">
          <label>会議タイプ係数 - 決定</label>
          <input type="range" id="typeDecision" min="0.5" max="4" step="0.1" value="2.0">
          <span class="coef-value">2.0</span>
        </div>
        
        <!-- 他の係数も同様 -->
      </div>
    </section>
    
    <section class="section">
      <h2>通知設定</h2>
      <div class="notification-settings">
        <label>
          <input type="checkbox" id="enableNotifications" checked>
          通知を有効化
        </label>
        
        <div class="threshold-settings">
          <div>
            <label>注意閾値</label>
            <input type="range" id="cautionThreshold" min="20" max="60" value="40">
            <span class="threshold-value">40%</span>
          </div>
          
          <div>
            <label>警告閾値</label>
            <input type="range" id="warningThreshold" min="10" max="40" value="25">
            <span class="threshold-value">25%</span>
          </div>
          
          <div>
            <label>危険閾値</label>
            <input type="range" id="criticalThreshold" min="5" max="20" value="10">
            <span class="threshold-value">10%</span>
          </div>
        </div>
      </div>
    </section>
    
    <section class="section">
      <h2>デバッグ・開発</h2>
      <div class="debug-controls">
        <label>
          <input type="checkbox" id="enableMockData" checked>
          モックデータを使用
        </label>
        
        <button id="resetHP">HP値をリセット</button>
        <button id="simulateMeeting">会議をシミュレート</button>
        <button id="exportData">データをエクスポート</button>
      </div>
      
      <div class="debug-info">
        <h3>デバッグ情報</h3>
        <pre id="debugOutput"></pre>
      </div>
    </section>
  </div>
  
  <script src="options.js"></script>
</body>
</html>
```

#### Afternoon: 設定保存・読み込み (4時間)
```javascript
// options.js
class OptionsManager {
  constructor() {
    this.settings = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.bindEvents();
    this.updateUI();
  }

  async loadSettings() {
    const result = await chrome.storage.sync.get([
      'coefficients',
      'thresholds', 
      'notifications',
      'debug'
    ]);
    
    this.settings = {
      coefficients: result.coefficients || MOCK_HP_COEFFICIENTS,
      thresholds: result.thresholds || { caution: 40, warning: 25, critical: 10 },
      notifications: result.notifications || { enabled: true },
      debug: result.debug || { enableMockData: true }
    };
  }

  bindEvents() {
    // 係数スライダー
    document.querySelectorAll('input[type="range"]').forEach(slider => {
      slider.addEventListener('input', (e) => {
        this.updateCoefficient(e.target.id, parseFloat(e.target.value));
      });
    });

    // チェックボックス
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.updateSetting(e.target.id, e.target.checked);
      });
    });

    // デバッグボタン
    document.getElementById('resetHP').addEventListener('click', () => {
      this.resetHP();
    });

    document.getElementById('simulateMeeting').addEventListener('click', () => {
      this.simulateMeeting();
    });
  }

  async updateCoefficient(key, value) {
    // 係数更新・保存
    if (key.startsWith('type')) {
      const meetingType = key.replace('type', '');
      this.settings.coefficients.type[meetingType] = value;
    } else {
      this.settings.coefficients[key] = value;
    }
    
    await this.saveSettings();
    this.updateDebugInfo();
  }

  async saveSettings() {
    await chrome.storage.sync.set(this.settings);
    
    // popup.js に設定変更を通知
    chrome.runtime.sendMessage({
      type: 'SETTINGS_UPDATED',
      settings: this.settings
    });
  }

  updateDebugInfo() {
    const debugOutput = document.getElementById('debugOutput');
    debugOutput.textContent = JSON.stringify({
      currentHP: 'N/A', // popup から取得
      coefficients: this.settings.coefficients,
      lastCalculation: 'N/A'
    }, null, 2);
  }

  async resetHP() {
    // HP値を初期値にリセット
    await chrome.storage.local.set({ currentHP: 75 });
    this.updateDebugInfo();
    alert('HP値を75にリセットしました');
  }

  simulateMeeting() {
    // テスト用会議データで HP計算実行
    const testMeeting = {
      title: "テスト会議",
      duration: 60,
      attendees: 5,
      type: "決定"
    };
    
    chrome.runtime.sendMessage({
      type: 'SIMULATE_MEETING',
      meeting: testMeeting
    });
    
    alert('テスト会議をシミュレートしました');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});
```

### Day 6 (9/1): 統合・ポーリング・ローカルストレージ

#### Morning: データ永続化 (3時間)
```javascript
// lib/storage-manager.js
class StorageManager {
  constructor() {
    this.cache = {};
  }

  async saveHP(hp, timestamp = Date.now()) {
    const hpLog = {
      value: hp,
      timestamp: timestamp,
      id: `hp_${timestamp}`
    };
    
    // ローカルストレージに保存
    await chrome.storage.local.set({
      currentHP: hp,
      [`hpLog_${timestamp}`]: hpLog
    });
    
    this.cache.currentHP = hp;
  }

  async loadHP() {
    if (this.cache.currentHP) {
      return this.cache.currentHP;
    }
    
    const result = await chrome.storage.local.get(['currentHP']);
    this.cache.currentHP = result.currentHP || 75; // デフォルト値
    return this.cache.currentHP;
  }

  async getHPHistory(hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const allData = await chrome.storage.local.get(null);
    
    return Object.values(allData)
      .filter(item => item.timestamp && item.timestamp > cutoff && item.value !== undefined)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  async saveSettings(settings) {
    await chrome.storage.sync.set({ hpPlannerSettings: settings });
  }

  async loadSettings() {
    const result = await chrome.storage.sync.get(['hpPlannerSettings']);
    return result.hpPlannerSettings || {};
  }
}
```

#### Afternoon: Background Service Worker (4時間)
```javascript
// background/background.js
class BackgroundManager {
  constructor() {
    this.storage = new StorageManager();
    this.calculator = new HPCalculator();
    this.init();
  }

  init() {
    // アラーム設定（60秒ごと）
    chrome.alarms.create('hpUpdate', { 
      delayInMinutes: 1, 
      periodInMinutes: 1 
    });
    
    // イベントリスナー
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'hpUpdate') {
        this.updateHP();
      }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 非同期レスポンス
    });
  }

  async updateHP() {
    try {
      const currentHP = await this.storage.loadHP();
      const settings = await this.storage.loadSettings();
      
      // 15分単位の更新
      const lastUpdate = await this.getLastUpdateTime();
      const now = Date.now();
      const timeDelta = Math.min(15, (now - lastUpdate) / (1000 * 60)); // 最大15分
      
      if (timeDelta >= 1) { // 1分以上経過時のみ更新
        const newHP = this.calculator.updateHP(currentHP, timeDelta);
        await this.storage.saveHP(newHP);
        await this.setLastUpdateTime(now);
        
        // ポップアップに通知
        this.notifyHPUpdate(newHP);
      }
    } catch (error) {
      console.error('HP更新エラー:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'GET_HP':
        const hp = await this.storage.loadHP();
        sendResponse({ hp });
        break;
        
      case 'SETTINGS_UPDATED':
        // 設定が更新された場合の処理
        this.calculator = new HPCalculator(message.settings.coefficients);
        sendResponse({ success: true });
        break;
        
      case 'SIMULATE_MEETING':
        await this.simulateMeeting(message.meeting);
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  notifyHPUpdate(newHP) {
    // ポップアップが開いている場合に通知
    chrome.runtime.sendMessage({
      type: 'HP_UPDATED',
      hp: newHP
    }).catch(() => {
      // ポップアップが閉じている場合は無視
    });
  }

  async getLastUpdateTime() {
    const result = await chrome.storage.local.get(['lastHPUpdate']);
    return result.lastHPUpdate || Date.now();
  }

  async setLastUpdateTime(timestamp) {
    await chrome.storage.local.set({ lastHPUpdate: timestamp });
  }

  async simulateMeeting(meeting) {
    const currentHP = await this.storage.loadHP();
    const meetingCost = this.calculator.calculateMeetingCost(meeting, 15);
    const newHP = Math.max(0, currentHP - meetingCost);
    
    await this.storage.saveHP(newHP);
    this.notifyHPUpdate(newHP);
  }
}

// Service Worker 起動
new BackgroundManager();
```

### Day 7 (9/2): Week 1 統合テスト・調整

#### Morning: E2Eテストシナリオ (3時間)
1. **拡張インストール・初期化**
   - Chrome Developer Mode で読み込み
   - アイコン表示・初期HP値75%確認
   
2. **基本HP表示・更新**
   - SVGリング正常表示
   - 60秒ごとの自動更新（-0.5減少）
   - 色変化（緑→オレンジ→赤）確認

3. **設定画面動作**
   - Options画面開く・係数変更
   - 設定保存・反映確認
   - デバッグボタン動作

4. **通知システム**
   - HP 40%, 25%, 10% 到達時のトースト
   - .ics ファイル生成・ダウンロード
   - 通知クールダウン動作

#### Afternoon: UI/UX最適化・バグ修正 (4時間)
- レスポンシブデザイン調整
- アニメーション・トランジション改善
- エラーハンドリング強化
- パフォーマンス測定・最適化

### Week 1 完了判定基準
- [ ] Chrome拡張が Developer Mode で正常動作
- [ ] SVGリング HP表示（0-100%）が正確
- [ ] 60秒ポーリングで HP自動更新
- [ ] 40%/25%/10% 閾値でトースト通知
- [ ] Options画面で係数調整可能
- [ ] .ics ファイル生成・ダウンロード機能
- [ ] モックデータで全機能テスト完了

**Week 1成功時**: 完全に動作するChrome拡張（モックデータ）が完成  
**Week 2移行条件**: 上記7項目すべてクリア

---

## 実装優先度

### P0 (必須・Week 1必達)
- SVGリング HP表示
- 基本HP計算・自動更新
- トースト通知システム
- モックデータ駆動

### P1 (重要・Week 2早期)
- 実API統合（天気・Firestore）
- Chrome ↔ Cloud Functions 通信
- エラーハンドリング

### P2 (推奨・Week 3)
- AI Agent統合
- 高度な設定・カスタマイズ
- パフォーマンス最適化

この**UI First**アプローチで、確実に動作する基盤を1週間で構築しましょう！