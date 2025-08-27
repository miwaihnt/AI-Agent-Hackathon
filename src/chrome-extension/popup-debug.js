/**
 * HP Planner Chrome Extension - Debug Version
 * 初期化エラーを詳しく表示するバージョン
 */

class HPDisplayDebug {
  constructor() {
    this.currentHP = 75; // 初期値
    this.lastUpdate = Date.now();
    this.initStep = 0;
    this.init();
  }

  async init() {
    try {
      console.log('HP Display Debug: Starting initialization...');
      
      // Step 1: DOM要素確認
      this.initStep = 1;
      this.checkDOMElements();
      console.log('Step 1: DOM elements OK');
      
      // Step 2: Chrome API確認
      this.initStep = 2;
      await this.checkChromeAPIs();
      console.log('Step 2: Chrome APIs OK');
      
      // Step 3: HP値読み込み
      this.initStep = 3;
      await this.loadHP();
      console.log('Step 3: HP loaded:', this.currentHP);
      
      // Step 4: UI更新
      this.initStep = 4;
      this.updateDisplay();
      console.log('Step 4: Display updated');
      
      // Step 5: イベントリスナー
      this.initStep = 5;
      this.bindEvents();
      console.log('Step 5: Events bound');
      
      // 成功メッセージ
      this.showMessage('初期化完了', 'success');
      console.log('HP Display Debug: Initialization completed successfully');
      
    } catch (error) {
      console.error(`HP Display initialization failed at step ${this.initStep}:`, error);
      this.showError(`初期化失敗 (Step ${this.initStep}): ${error.message}`);
      
      // フォールバック: 最小限の表示
      this.fallbackDisplay();
    }
  }

  checkDOMElements() {
    const requiredElements = [
      '.hp-progress-circle',
      '.hp-value',
      '.hp-status',
      '.hp-reason',
      '.hp-time'
    ];
    
    for (const selector of requiredElements) {
      const element = document.querySelector(selector);
      if (!element) {
        throw new Error(`Required DOM element not found: ${selector}`);
      }
    }
  }

  async checkChromeAPIs() {
    // Chrome runtime API
    if (!chrome || !chrome.runtime) {
      throw new Error('Chrome runtime API not available');
    }
    
    // Chrome storage API
    if (!chrome.storage || !chrome.storage.local) {
      throw new Error('Chrome storage API not available');
    }
    
    // 簡単なストレージテスト
    try {
      await chrome.storage.local.set({ test: 'ok' });
      const result = await chrome.storage.local.get(['test']);
      if (result.test !== 'ok') {
        throw new Error('Chrome storage test failed');
      }
      await chrome.storage.local.remove(['test']);
    } catch (error) {
      throw new Error('Chrome storage API test failed: ' + error.message);
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
      console.warn('HP load failed, using default:', error);
      // デフォルト値を使用（エラーにしない）
    }
  }

  updateDisplay() {
    try {
      const circle = document.querySelector('.hp-progress-circle');
      const hpValue = document.querySelector('.hp-value');
      const hpStatus = document.querySelector('.hp-status');
      const hpReason = document.querySelector('.hp-reason');
      const hpTime = document.querySelector('.hp-time');
      
      if (!circle || !hpValue) {
        throw new Error('Critical display elements not found');
      }
      
      // 円の進捗更新
      const circumference = 251.2;
      const progress = Math.max(0, Math.min(100, this.currentHP));
      const offset = circumference - (progress / 100) * circumference;
      
      circle.style.strokeDashoffset = offset;
      circle.className = 'hp-progress-circle ' + this.getHPColorClass(progress);
      
      // 数値更新
      hpValue.textContent = Math.round(progress);
      
      // その他の更新（エラーが出ても継続）
      try {
        if (hpStatus) {
          const statusInfo = this.getHPStatusInfo(progress);
          hpStatus.textContent = statusInfo.text;
          hpStatus.className = 'hp-status ' + statusInfo.class;
        }
        
        if (hpReason) {
          hpReason.textContent = '晴れで過ごしやすい一日です (Debug Mode)';
        }
        
        if (hpTime) {
          hpTime.textContent = '最終更新: ' + this.formatTime(this.lastUpdate);
        }
      } catch (error) {
        console.warn('Secondary display updates failed:', error);
      }
      
    } catch (error) {
      throw new Error('Display update failed: ' + error.message);
    }
  }

  bindEvents() {
    try {
      // 設定ボタン
      const settingsBtn = document.getElementById('settingsBtn');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
          try {
            chrome.runtime.openOptionsPage();
          } catch (error) {
            console.error('Settings open failed:', error);
          }
        });
      }

      // 更新ボタン
      const refreshBtn = document.getElementById('refreshBtn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          this.forceUpdate();
        });
      }

      // 休憩ボタン
      const breakBtn = document.getElementById('breakBtn');
      if (breakBtn) {
        breakBtn.addEventListener('click', () => {
          this.simulateBreak();
        });
      }
      
    } catch (error) {
      throw new Error('Event binding failed: ' + error.message);
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

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  async forceUpdate() {
    try {
      this.currentHP = Math.max(0, this.currentHP - 0.5);
      this.lastUpdate = Date.now();
      this.updateDisplay();
      await this.saveHP();
      this.showMessage('HP更新完了', 'success');
    } catch (error) {
      console.error('Force update failed:', error);
      this.showError('更新に失敗しました');
    }
  }

  simulateBreak() {
    try {
      this.currentHP = Math.min(100, this.currentHP + 5);
      this.lastUpdate = Date.now();
      this.updateDisplay();
      this.saveHP();
      this.showMessage('5分休憩完了 (+5 HP)', 'success');
    } catch (error) {
      console.error('Simulate break failed:', error);
      this.showError('休憩機能エラー');
    }
  }

  async saveHP() {
    try {
      await chrome.storage.local.set({
        currentHP: this.currentHP,
        lastUpdate: this.lastUpdate
      });
    } catch (error) {
      console.warn('HP save failed:', error);
    }
  }

  fallbackDisplay() {
    try {
      // 最小限の表示
      const hpValue = document.querySelector('.hp-value');
      const hpStatus = document.querySelector('.hp-status');
      
      if (hpValue) hpValue.textContent = '75';
      if (hpStatus) hpStatus.textContent = 'デバッグモード';
      
    } catch (error) {
      console.error('Fallback display failed:', error);
    }
  }

  showMessage(text, type = 'success') {
    console.log(`Message (${type}):`, text);
    
    try {
      // 簡単なメッセージ表示
      const container = document.querySelector('.container');
      if (container) {
        const message = document.createElement('div');
        message.style.cssText = `
          position: fixed; top: 10px; left: 10px; right: 10px;
          background: ${type === 'success' ? '#4CAF50' : '#F44336'};
          color: white; padding: 8px; border-radius: 4px;
          font-size: 12px; z-index: 1000;
        `;
        message.textContent = text;
        document.body.appendChild(message);
        
        setTimeout(() => {
          if (message.parentNode) message.remove();
        }, 3000);
      }
    } catch (error) {
      console.warn('Message display failed:', error);
    }
  }

  showError(text) {
    this.showMessage(text, 'error');
  }
}

// DOM読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, starting HP Display Debug...');
  try {
    const hpDisplay = new HPDisplayDebug();
    window.hpDisplayDebug = hpDisplay;
  } catch (error) {
    console.error('HP Display Debug creation failed:', error);
  }
});