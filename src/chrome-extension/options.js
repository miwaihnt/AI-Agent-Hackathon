/**
 * HP Planner Chrome Extension - Options Script
 * 設定画面の管理・保存・デバッグ機能
 */

class OptionsManager {
  constructor() {
    this.settings = {};
    this.defaultSettings = {};
    this.init();
  }

  async init() {
    try {
      // デフォルト設定を取得
      this.defaultSettings = await this.getDefaultSettings();
      
      // 現在の設定を読み込み
      await this.loadSettings();
      
      // UI要素にイベントリスナーを設定
      this.bindEvents();
      
      // UIを現在の設定で更新
      this.updateUI();
      
      // デバッグ情報を初期表示
      await this.updateDebugInfo();
      
      console.log('Options Manager initialized');
    } catch (error) {
      console.error('Options initialization failed:', error);
      this.showMessage('設定の初期化に失敗しました', 'error');
    }
  }

  async getDefaultSettings() {
    // Background scriptからデフォルト設定を取得
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_DEBUG_INFO'
      });
      
      if (response && response.debugInfo) {
        return {
          coefficients: response.debugInfo.coefficients,
          thresholds: response.debugInfo.thresholds,
          notifications: { enabled: true },
          ai: {
            enableHPPlanner: true,
            enableMeetingAnalyzer: true,
            enableMeetingNavigator: true,
            enableBreakInserter: true
          },
          debug: {
            enableMockData: true,
            enableDebugLogs: false
          }
        };
      }
    } catch (error) {
      console.warn('Failed to get default settings from background:', error);
    }
    
    // フォールバック: ハードコード値
    return {
      coefficients: {
        naturalDecay: 0.5,
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
        contextE: 1.0,
        travelD: 0.4
      },
      thresholds: {
        caution: 40,
        warning: 25,
        critical: 10
      },
      notifications: {
        enabled: true
      },
      ai: {
        enableHPPlanner: true,
        enableMeetingAnalyzer: true,
        enableMeetingNavigator: true,
        enableBreakInserter: true
      },
      debug: {
        enableMockData: true,
        enableDebugLogs: false
      }
    };
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['hpPlannerSettings']);
      this.settings = result.hpPlannerSettings || this.defaultSettings;
    } catch (error) {
      console.warn('Settings load failed, using defaults:', error);
      this.settings = this.defaultSettings;
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({ hpPlannerSettings: this.settings });
      
      // Background scriptに設定変更を通知
      await chrome.runtime.sendMessage({
        type: 'SETTINGS_UPDATED',
        settings: this.settings
      });
      
      this.showMessage('設定を保存しました', 'success');
      return true;
    } catch (error) {
      console.error('Settings save failed:', error);
      this.showMessage('設定の保存に失敗しました', 'error');
      return false;
    }
  }

  bindEvents() {
    // 係数スライダー
    this.bindSliderEvents();
    
    // 閾値スライダー
    this.bindThresholdEvents();
    
    // チェックボックス
    this.bindCheckboxEvents();
    
    // デバッグボタン
    this.bindDebugButtonEvents();
    
    // フッターボタン
    this.bindFooterButtonEvents();
  }

  bindSliderEvents() {
    const sliders = [
      'naturalDecay', 'typeDecision', 'typeBrainstorm', 'typeReport',
      'lengthScale', 'attendeeStep'
    ];
    
    sliders.forEach(sliderId => {
      const slider = document.getElementById(sliderId);
      if (slider) {
        slider.addEventListener('input', (e) => {
          this.updateCoefficient(sliderId, parseFloat(e.target.value));
        });
      }
    });
  }

  bindThresholdEvents() {
    const thresholds = ['cautionThreshold', 'warningThreshold', 'criticalThreshold'];
    
    thresholds.forEach(thresholdId => {
      const slider = document.getElementById(thresholdId);
      if (slider) {
        slider.addEventListener('input', (e) => {
          this.updateThreshold(thresholdId, parseInt(e.target.value));
        });
      }
    });
  }

  bindCheckboxEvents() {
    const checkboxes = [
      'enableNotifications', 'enableHPPlanner', 'enableMeetingAnalyzer',
      'enableMeetingNavigator', 'enableBreakInserter', 'enableMockData', 'enableDebugLogs'
    ];
    
    checkboxes.forEach(checkboxId => {
      const checkbox = document.getElementById(checkboxId);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          this.updateSetting(checkboxId, e.target.checked);
        });
      }
    });
  }

  bindDebugButtonEvents() {
    // HP値リセット
    const resetHPBtn = document.getElementById('resetHP');
    if (resetHPBtn) {
      resetHPBtn.addEventListener('click', async () => {
        await this.resetHP();
      });
    }

    // テスト会議実行
    const simulateMeetingBtn = document.getElementById('simulateMeeting');
    if (simulateMeetingBtn) {
      simulateMeetingBtn.addEventListener('click', async () => {
        await this.simulateMeeting();
      });
    }

    // 通知テスト
    const testNotificationBtn = document.getElementById('testNotification');
    if (testNotificationBtn) {
      testNotificationBtn.addEventListener('click', () => {
        this.testNotification();
      });
    }

    // データエクスポート
    const exportDataBtn = document.getElementById('exportData');
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', async () => {
        await this.exportData();
      });
    }
  }

  bindFooterButtonEvents() {
    // デフォルトに戻す
    const resetDefaultsBtn = document.getElementById('resetDefaults');
    if (resetDefaultsBtn) {
      resetDefaultsBtn.addEventListener('click', () => {
        this.resetToDefaults();
      });
    }

    // 設定を保存
    const saveSettingsBtn = document.getElementById('saveSettings');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', async () => {
        await this.saveSettings();
      });
    }
  }

  updateCoefficient(key, value) {
    // 係数の種類に応じて更新
    switch (key) {
      case 'naturalDecay':
      case 'lengthScale':
      case 'attendeeStep':
        this.settings.coefficients[key] = value;
        break;
      case 'typeDecision':
        this.settings.coefficients.type['決定'] = value;
        break;
      case 'typeBrainstorm':
        this.settings.coefficients.type['ブレスト'] = value;
        break;
      case 'typeReport':
        this.settings.coefficients.type['報告'] = value;
        break;
    }
    
    // 表示値を更新（単位付き）
    const valueSpan = document.querySelector(`#${key} + .slider-label-right + .coef-value`) || 
                     document.querySelector(`#${key} + .slider-container .coef-value`);
    if (valueSpan) {
      let displayText;
      switch (key) {
        case 'naturalDecay':
          displayText = `${value.toFixed(1)} HP`;
          break;
        case 'typeDecision':
        case 'typeBrainstorm':
        case 'typeReport':
          displayText = `${value.toFixed(1)} 倍`;
          break;
        case 'attendeeStep':
          displayText = `${value.toFixed(2)} / 人`;
          break;
        default:
          displayText = value.toFixed(1);
      }
      valueSpan.textContent = displayText;
    }
    
    // 自動保存
    this.debouncedSave();
  }

  updateThreshold(key, value) {
    switch (key) {
      case 'cautionThreshold':
        this.settings.thresholds.caution = value;
        break;
      case 'warningThreshold':
        this.settings.thresholds.warning = value;
        break;
      case 'criticalThreshold':
        this.settings.thresholds.critical = value;
        break;
    }
    
    // 表示値を更新
    const valueSpan = document.querySelector(`#${key} + .slider-container .threshold-value`);
    if (valueSpan) {
      valueSpan.textContent = `${value}%`;
    }
    
    // 自動保存
    this.debouncedSave();
  }

  updateSetting(key, value) {
    switch (key) {
      case 'enableNotifications':
        this.settings.notifications.enabled = value;
        break;
      case 'enableHPPlanner':
        this.settings.ai.enableHPPlanner = value;
        break;
      case 'enableMeetingAnalyzer':
        this.settings.ai.enableMeetingAnalyzer = value;
        break;
      case 'enableMeetingNavigator':
        this.settings.ai.enableMeetingNavigator = value;
        break;
      case 'enableBreakInserter':
        this.settings.ai.enableBreakInserter = value;
        break;
      case 'enableMockData':
        this.settings.debug.enableMockData = value;
        break;
      case 'enableDebugLogs':
        this.settings.debug.enableDebugLogs = value;
        break;
    }
    
    // 自動保存
    this.debouncedSave();
  }

  // デバウンス付き自動保存（1秒後に保存）
  debouncedSave() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveSettings();
    }, 1000);
  }

  updateUI() {
    // 係数スライダー
    this.updateSlider('naturalDecay', this.settings.coefficients.naturalDecay);
    this.updateSlider('typeDecision', this.settings.coefficients.type['決定']);
    this.updateSlider('typeBrainstorm', this.settings.coefficients.type['ブレスト']);
    this.updateSlider('typeReport', this.settings.coefficients.type['報告']);
    this.updateSlider('lengthScale', this.settings.coefficients.lengthScale);
    this.updateSlider('attendeeStep', this.settings.coefficients.attendeeStep);
    
    // 閾値スライダー
    this.updateThresholdSlider('cautionThreshold', this.settings.thresholds.caution);
    this.updateThresholdSlider('warningThreshold', this.settings.thresholds.warning);
    this.updateThresholdSlider('criticalThreshold', this.settings.thresholds.critical);
    
    // チェックボックス
    this.updateCheckbox('enableNotifications', this.settings.notifications.enabled);
    this.updateCheckbox('enableHPPlanner', this.settings.ai.enableHPPlanner);
    this.updateCheckbox('enableMeetingAnalyzer', this.settings.ai.enableMeetingAnalyzer);
    this.updateCheckbox('enableMeetingNavigator', this.settings.ai.enableMeetingNavigator);
    this.updateCheckbox('enableBreakInserter', this.settings.ai.enableBreakInserter);
    this.updateCheckbox('enableMockData', this.settings.debug.enableMockData);
    this.updateCheckbox('enableDebugLogs', this.settings.debug.enableDebugLogs);
  }

  updateSlider(id, value) {
    const slider = document.getElementById(id);
    const valueSpan = document.querySelector(`#${id} + .slider-container .coef-value`);
    
    if (slider) {
      slider.value = value;
    }
    if (valueSpan) {
      valueSpan.textContent = value.toFixed(1);
    }
  }

  updateThresholdSlider(id, value) {
    const slider = document.getElementById(id);
    const valueSpan = document.querySelector(`#${id} + .slider-container .threshold-value`);
    
    if (slider) {
      slider.value = value;
    }
    if (valueSpan) {
      valueSpan.textContent = `${value}%`;
    }
  }

  updateCheckbox(id, checked) {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = checked;
    }
  }

  async resetHP() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'RESET_HP'
      });
      
      if (response && response.success) {
        this.showMessage(`HP値を75%にリセットしました`, 'success');
        await this.updateDebugInfo();
      } else {
        throw new Error('Reset failed');
      }
    } catch (error) {
      console.error('HP reset failed:', error);
      this.showMessage('HP値のリセットに失敗しました', 'error');
    }
  }

  async simulateMeeting() {
    const testMeetings = [
      { title: "週次定例会議", duration: 60, attendees: 8, type: "報告" },
      { title: "緊急意思決定会議", duration: 30, attendees: 5, type: "決定" },
      { title: "ブレインストーミング", duration: 90, attendees: 6, type: "ブレスト" },
      { title: "1on1面談", duration: 45, attendees: 2, type: "1on1" }
    ];
    
    const meeting = testMeetings[Math.floor(Math.random() * testMeetings.length)];
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SIMULATE_MEETING',
        meeting: meeting
      });
      
      if (response && response.success) {
        this.showMessage(`テスト会議「${meeting.title}」を実行しました (HP: ${response.hp.toFixed(1)}%)`, 'success');
        await this.updateDebugInfo();
      } else {
        throw new Error('Simulation failed');
      }
    } catch (error) {
      console.error('Meeting simulation failed:', error);
      this.showMessage('会議シミュレーションに失敗しました', 'error');
    }
  }

  testNotification() {
    // Chrome通知API使用（実際の実装ではpopup.jsの通知システムを使用）
    this.showMessage('通知テスト: この機能は実装中です', 'success');
  }

  async exportData() {
    try {
      // 現在の設定とデバッグ情報をエクスポート
      const debugInfo = await chrome.runtime.sendMessage({
        type: 'GET_DEBUG_INFO'
      });
      
      const exportData = {
        timestamp: new Date().toISOString(),
        settings: this.settings,
        debugInfo: debugInfo ? debugInfo.debugInfo : null
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `hp-planner-export-${Date.now()}.json`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      this.showMessage('データをエクスポートしました', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      this.showMessage('データのエクスポートに失敗しました', 'error');
    }
  }

  resetToDefaults() {
    if (confirm('全ての設定をデフォルト値に戻しますか？')) {
      this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
      this.updateUI();
      this.saveSettings();
      this.showMessage('設定をデフォルトに戻しました', 'success');
    }
  }

  async updateDebugInfo() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_DEBUG_INFO'
      });
      
      const debugOutput = document.getElementById('debugOutput');
      if (debugOutput && response && response.debugInfo) {
        debugOutput.textContent = JSON.stringify(response.debugInfo, null, 2);
      } else {
        debugOutput.textContent = 'デバッグ情報の取得に失敗しました';
      }
    } catch (error) {
      console.error('Debug info update failed:', error);
      const debugOutput = document.getElementById('debugOutput');
      if (debugOutput) {
        debugOutput.textContent = `エラー: ${error.message}`;
      }
    }
  }

  showMessage(text, type = 'success') {
    // 既存のメッセージを削除
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    // 新しいメッセージを作成
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    
    // ヘッダーの後に挿入
    const header = document.querySelector('.header');
    if (header) {
      header.insertAdjacentElement('afterend', message);
      
      // 3秒後に自動削除
      setTimeout(() => {
        if (message.parentNode) {
          message.remove();
        }
      }, 3000);
    }
  }
}

// DOM読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => {
  try {
    const optionsManager = new OptionsManager();
    
    // 開発用: グローバルアクセス
    if (typeof window !== 'undefined') {
      window.optionsManager = optionsManager;
    }
  } catch (error) {
    console.error('Options Manager initialization failed:', error);
  }
});