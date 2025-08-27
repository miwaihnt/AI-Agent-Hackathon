/**
 * HP Planner Chrome Extension - Popup Script
 * HP表示・計算・通知機能を管理
 */

class HPDisplay {
  constructor() {
    this.currentHP = 75; // 初期値
    this.lastUpdate = Date.now();
    this.notifications = new NotificationSystem(this);
    this.init();
  }

  async init() {
    try {
      // 保存されたHP値を読み込み
      await this.loadHP();
      
      // UI更新
      this.updateDisplay();
      
      // イベントリスナー設定
      this.bindEvents();
      
      // ポーリング開始
      this.startPolling();
      
      // 閾値チェック
      this.notifications.checkThresholds(this.currentHP);
      
    } catch (error) {
      console.error('HP Display initialization failed:', error);
      this.showError('初期化に失敗しました');
    }
  }

  async loadHP() {
    try {
      const result = await chrome.storage.local.get(['currentHP', 'lastUpdate']);
      if (result.currentHP !== undefined) {
        this.currentHP = result.currentHP;
      }
      if (result.lastUpdate) {
        this.lastUpdate = result.lastUpdate;
      }
    } catch (error) {
      console.warn('HP読み込みエラー、デフォルト値を使用:', error);
    }
  }

  async saveHP() {
    try {
      await chrome.storage.local.set({
        currentHP: this.currentHP,
        lastUpdate: this.lastUpdate
      });
    } catch (error) {
      console.error('HP保存エラー:', error);
    }
  }

  updateDisplay() {
    const circle = document.querySelector('.hp-progress-circle');
    const hpValue = document.querySelector('.hp-value');
    const hpStatus = document.querySelector('.hp-status');
    const hpReason = document.querySelector('.hp-reason');
    const hpTime = document.querySelector('.hp-time');
    
    if (!circle || !hpValue) return;
    
    // 円の進捗更新 (0-100% → 0-251.2の円周)
    const circumference = 251.2;
    const progress = Math.max(0, Math.min(100, this.currentHP));
    const offset = circumference - (progress / 100) * circumference;
    
    circle.style.strokeDashoffset = offset;
    
    // 色分け・クラス更新
    circle.setAttribute('class', 'hp-progress-circle ' + this.getHPColorClass(progress));
    
    // 数値更新
    hpValue.textContent = Math.round(progress);
    
    // ステータス更新
    if (hpStatus) {
      const statusInfo = this.getHPStatusInfo(progress);
      hpStatus.textContent = statusInfo.text;
      hpStatus.className = 'hp-status ' + statusInfo.class;
    }
    
    // 理由・時間更新
    if (hpReason) {
      hpReason.textContent = this.getHPReason();
    }
    
    if (hpTime) {
      hpTime.textContent = '最終更新: ' + this.formatTime(this.lastUpdate);
    }
  }

  getHPColorClass(hp) {
    if (hp >= 60) return 'hp-high';
    if (hp >= 30) return 'hp-medium'; 
    if (hp >= 15) return 'hp-low';
    return 'hp-critical';
  }

  getHPStatusInfo(hp) {
    if (hp >= 70) return { text: '良好', class: '' };
    if (hp >= 50) return { text: '普通', class: '' };
    if (hp >= 30) return { text: '疲労', class: 'warning' };
    if (hp >= 15) return { text: '要注意', class: 'warning' };
    return { text: '危険', class: 'critical' };
  }

  getHPReason() {
    // モックデータ - Week 2でAI生成に置き換え
    const reasons = [
      '晴れで過ごしやすい一日です',
      '雨で湿度が高めです',
      '気温が高く疲れやすい日です',
      '涼しくて集中しやすい環境です'
    ];
    return reasons[Math.floor(Date.now() / (1000 * 60 * 60 * 6)) % reasons.length];
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  bindEvents() {
    // 設定ボタン
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }

    // 更新ボタン
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        await this.forceUpdate();
      });
    }

    // 休憩ボタン
    const breakBtn = document.getElementById('breakBtn');
    if (breakBtn) {
      breakBtn.addEventListener('click', () => {
        this.notifications.addBreak(5);
      });
    }

    // バックグラウンドからのメッセージ受信
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'HP_UPDATED') {
        this.currentHP = message.hp;
        this.lastUpdate = Date.now();
        this.updateDisplay();
        this.notifications.checkThresholds(this.currentHP);
      }
    });
  }

  async forceUpdate() {
    try {
      // バックグラウンドスクリプトに更新要求
      const response = await chrome.runtime.sendMessage({
        type: 'FORCE_UPDATE_HP'
      });
      
      if (response && response.hp !== undefined) {
        this.currentHP = response.hp;
        this.lastUpdate = Date.now();
        this.updateDisplay();
        this.notifications.checkThresholds(this.currentHP);
        
        this.showToast({
          type: 'success',
          title: 'HP更新完了',
          message: `現在のHP: ${Math.round(this.currentHP)}%`
        });
      }
    } catch (error) {
      console.error('HP更新エラー:', error);
      this.showError('更新に失敗しました');
    }
  }

  startPolling() {
    // 60秒ごとに更新チェック
    setInterval(async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_HP'
        });
        
        if (response && response.hp !== undefined && response.hp !== this.currentHP) {
          this.currentHP = response.hp;
          this.lastUpdate = Date.now();
          this.updateDisplay();
          this.notifications.checkThresholds(this.currentHP);
        }
      } catch (error) {
        // バックグラウンドスクリプトが応答しない場合は無視
        console.warn('Background script not responding:', error);
      }
    }, 60000); // 60秒
  }

  showToast(config) {
    this.notifications.createToast(config);
  }

  showError(message) {
    this.showToast({
      type: 'critical',
      title: 'エラー',
      message: message
    });
  }

  // 開発・デバッグ用メソッド
  simulateHPChange(delta) {
    this.currentHP = Math.max(0, Math.min(100, this.currentHP + delta));
    this.lastUpdate = Date.now();
    this.updateDisplay();
    this.saveHP();
    this.notifications.checkThresholds(this.currentHP);
  }
}

/**
 * 通知・トーストシステム
 */
class NotificationSystem {
  constructor(hpDisplay) {
    this.hpDisplay = hpDisplay;
    this.lastNotificationTime = {};
    this.toastContainer = document.getElementById('toast-container');
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

  showCriticalNotification() {
    this.createToast({
      type: 'critical',
      title: '🚨 HP危険レベル (10%)',
      message: '至急休憩が必要です。10分休憩を強く推奨します。',
      actions: [
        { text: '10分休憩', action: () => this.addBreak(10) },
        { text: '今は無理', action: () => this.dismissToast() }
      ]
    });
    
    this.lastNotificationTime['critical'] = Date.now();
  }

  showWarningNotification() {
    this.createToast({
      type: 'warning', 
      title: '⚠️ HP警告 (25%)',
      message: '疲労が蓄積しています。10分休憩をお勧めします。',
      actions: [
        { text: '10分休憩を追加', action: () => this.addBreak(10) },
        { text: '後で', action: () => this.dismissToast() }
      ]
    });
    
    this.lastNotificationTime['warning'] = Date.now();
  }

  showCautionNotification() {
    this.createToast({
      type: 'warning',
      title: '💡 HP注意 (40%)',
      message: 'そろそろ休憩タイムです。5分ブレイクはいかがですか？',
      actions: [
        { text: '5分ブレイク', action: () => this.addBreak(5) },
        { text: '後で', action: () => this.dismissToast() }
      ]
    });
    
    this.lastNotificationTime['caution'] = Date.now();
  }

  createToast(config) {
    if (!this.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${config.type}`;
    
    let actionsHTML = '';
    if (config.actions) {
      actionsHTML = `
        <div class="toast-actions">
          ${config.actions.map((action, index) => 
            `<button class="toast-btn toast-btn-${index === 0 ? 'primary' : 'secondary'}" 
                     data-action="${index}">${action.text}</button>`
          ).join('')}
        </div>
      `;
    }
    
    toast.innerHTML = `
      <div class="toast-title">${config.title}</div>
      <div class="toast-message">${config.message}</div>
      ${actionsHTML}
    `;
    
    // アクションボタンのイベントリスナー
    if (config.actions) {
      toast.querySelectorAll('[data-action]').forEach((btn, index) => {
        btn.addEventListener('click', () => {
          config.actions[index].action();
          toast.remove();
        });
      });
    }
    
    this.toastContainer.appendChild(toast);
    
    // 10秒後自動削除（アクションがない場合）
    if (!config.actions) {
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 10000);
    }
  }

  addBreak(minutes) {
    try {
      // .ics ファイル生成・ダウンロード
      const icsContent = this.generateICS(minutes);
      this.downloadICS(icsContent, `hp-planner-break-${minutes}min.ics`);
      
      // HP回復シミュレート（実際は休憩後に適用）
      const recoveryAmount = minutes; // 1分 = 1HP回復
      this.hpDisplay.simulateHPChange(recoveryAmount);
      
      this.createToast({
        type: 'success',
        title: '休憩予定を追加しました',
        message: `${minutes}分の休憩予定をカレンダーにダウンロードできます。`
      });
      
    } catch (error) {
      console.error('休憩追加エラー:', error);
      this.createToast({
        type: 'critical',
        title: 'エラー',
        message: '休憩予定の追加に失敗しました。'
      });
    }
  }

  generateICS(minutes) {
    const now = new Date();
    const start = new Date(now.getTime() + 5 * 60000); // 5分後開始
    const end = new Date(start.getTime() + minutes * 60000);
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HP Planner//Break//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:hp-planner-break-${Date.now()}@hp-planner.local
DTSTAMP:${this.formatICSDate(now)}
DTSTART:${this.formatICSDate(start)}
DTEND:${this.formatICSDate(end)}
SUMMARY:🛌 HP回復ブレイク (${minutes}分)
DESCRIPTION:HP Planner による疲労度管理に基づく休憩提案\\n\\n現在のHP: ${Math.round(this.hpDisplay.currentHP)}%\\n推奨休憩時間: ${minutes}分\\n\\n※この休憩により約${minutes}HP回復予定
CATEGORIES:PERSONAL,HEALTH
PRIORITY:5
STATUS:TENTATIVE
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`;
  }

  formatICSDate(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  downloadICS(content, filename) {
    const blob = new Blob([content], { type: 'text/calendar; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Chrome拡張でのダウンロード
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // メモリクリーンアップ
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  dismissToast() {
    // 最新のトーストを削除
    const toasts = this.toastContainer.querySelectorAll('.toast');
    if (toasts.length > 0) {
      toasts[toasts.length - 1].remove();
    }
  }
}

// DOM読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => {
  try {
    const hpDisplay = new HPDisplay();
    
    // 開発用: グローバルにアクセス可能にする
    if (typeof window !== 'undefined') {
      window.hpDisplay = hpDisplay;
    }
  } catch (error) {
    console.error('HP Planner initialization failed:', error);
  }
});

// 開発用: コンソールからHP値を変更できるようにする
if (typeof window !== 'undefined') {
  window.debugHP = {
    set: (value) => window.hpDisplay?.simulateHPChange(value - window.hpDisplay.currentHP),
    add: (delta) => window.hpDisplay?.simulateHPChange(delta),
    test: () => {
      console.log('HP Display Test');
      console.log('Current HP:', window.hpDisplay?.currentHP);
      window.hpDisplay?.simulateHPChange(-10); // 10減少テスト
    }
  };
}