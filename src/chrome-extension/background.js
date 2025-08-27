/**
 * HP Planner Chrome Extension - Background Service Worker
 * HP計算・定期更新・データ管理を担当
 */

class BackgroundManager {
  constructor() {
    this.currentHP = 75; // 初期値
    this.lastUpdate = Date.now();
    this.settings = {};
    this.init();
  }

  async init() {
    try {
      // 設定読み込み
      await this.loadSettings();
      
      // 保存されたHP値読み込み
      await this.loadHP();
      
      // アラーム設定（1分ごと）
      this.setupAlarms();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      console.log('HP Planner Background initialized');
    } catch (error) {
      console.error('Background initialization failed:', error);
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['hpPlannerSettings']);
      this.settings = result.hpPlannerSettings || this.getDefaultSettings();
    } catch (error) {
      console.warn('Settings load failed, using defaults:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
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
    }
  }

  async saveHP() {
    try {
      await chrome.storage.local.set({
        currentHP: this.currentHP,
        lastUpdate: this.lastUpdate
      });
    } catch (error) {
      console.error('HP save failed:', error);
    }
  }

  setupAlarms() {
    // 既存のアラームをクリア
    chrome.alarms.clearAll();
    
    // 1分ごとのHP更新アラーム
    chrome.alarms.create('hpUpdate', { 
      delayInMinutes: 1, 
      periodInMinutes: 1 
    });
    
    // 1時間ごとの天気取得アラーム
    chrome.alarms.create('weatherUpdate', {
      delayInMinutes: 60,
      periodInMinutes: 60
    });
  }

  setupEventListeners() {
    // アラームイベント
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'hpUpdate') {
        this.updateHP();
      } else if (alarm.name === 'weatherUpdate') {
        this.updateWeather();
      }
    });

    // メッセージイベント
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 非同期レスポンス
    });

    // インストール・起動時の初期化
    chrome.runtime.onInstalled.addListener(() => {
      this.onInstalled();
    });

    chrome.runtime.onStartup.addListener(() => {
      this.init();
    });
  }

  async onInstalled() {
    console.log('HP Planner installed');
    
    // 初期HP値設定
    await this.saveHP();
    
    // 天気データ初回取得
    if (this.settings.debug.enableMockData) {
      await this.updateWeatherMock();
    } else {
      await this.updateWeather();
    }
  }

  async updateHP() {
    try {
      const now = Date.now();
      const timeDeltaMinutes = (now - this.lastUpdate) / (1000 * 60);
      
      // 1分以上経過している場合のみ更新
      if (timeDeltaMinutes >= 1) {
        const timeDelta15min = Math.min(15, timeDeltaMinutes); // 最大15分で制限
        
        // 自然減衰計算
        const naturalDecay = this.settings.coefficients.naturalDecay * (timeDelta15min / 15);
        
        // 新しいHP値計算
        const newHP = Math.max(0, Math.min(100, this.currentHP - naturalDecay));
        
        if (newHP !== this.currentHP) {
          this.currentHP = newHP;
          this.lastUpdate = now;
          await this.saveHP();
          
          // ポップアップに通知
          this.notifyHPUpdate(newHP);
          
          if (this.settings.debug.enableDebugLogs) {
            console.log(`HP updated: ${newHP.toFixed(1)}% (decay: ${naturalDecay.toFixed(1)})`);
          }
        }
      }
    } catch (error) {
      console.error('HP update failed:', error);
    }
  }

  async updateWeather() {
    try {
      if (this.settings.debug.enableMockData) {
        return await this.updateWeatherMock();
      }
      
      // 実際のOpen-Meteo API呼び出し (Week 2で実装)
      // 現在はモックデータを使用
      await this.updateWeatherMock();
    } catch (error) {
      console.error('Weather update failed:', error);
      // フォールバック: モックデータ使用
      await this.updateWeatherMock();
    }
  }

  async updateWeatherMock() {
    // モック天気データ
    const mockWeather = {
      temperature_2m_max: 28 + Math.random() * 8, // 28-36℃
      temperature_2m_min: 18 + Math.random() * 6, // 18-24℃
      precipitation_probability_max: Math.random() * 60 // 0-60%
    };
    
    // ベースHP計算
    const baseHP = this.calculateBaseHP(mockWeather);
    
    // HPを天気ベースに調整（6時間かけてゆっくり適用）
    const targetHP = Math.max(this.currentHP * 0.8, baseHP);
    const adjustment = (targetHP - this.currentHP) * 0.1; // 10%ずつ調整
    
    this.currentHP = Math.max(0, Math.min(100, this.currentHP + adjustment));
    this.lastUpdate = Date.now();
    await this.saveHP();
    
    // 天気情報を保存
    await chrome.storage.local.set({
      weatherData: mockWeather,
      weatherTimestamp: Date.now(),
      baseHP: baseHP
    });
    
    if (this.settings.debug.enableDebugLogs) {
      console.log('Weather updated (mock):', mockWeather);
      console.log('Base HP calculated:', baseHP);
    }
  }

  calculateBaseHP(weather) {
    const { temperature_2m_max: tmax, temperature_2m_min: tmin, precipitation_probability_max: rainProb } = weather;
    
    let baseHP = 100;
    baseHP -= Math.max(0, tmax - 30) * 1.2;  // 暑さ影響
    baseHP -= Math.max(0, 18 - tmin) * 0.5;  // 寒さ影響
    baseHP -= (rainProb / 100) * 10;         // 雨確率影響
    
    return Math.max(30, Math.min(100, Math.round(baseHP)));
  }

  calculateMeetingCost(meeting, timeDelta = 15) {
    const coef = this.settings.coefficients;
    
    const typeCost = coef.type[meeting.type] || 1.0;
    const lengthCost = 1 + (meeting.duration / 60) * coef.lengthScale;
    const attendeeCost = Math.max(0, meeting.attendees - 2) * coef.attendeeStep;
    
    // 15分あたりのコスト
    const totalCost = typeCost * lengthCost * (1 + attendeeCost);
    return (totalCost * timeDelta) / meeting.duration;
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'GET_HP':
          sendResponse({ hp: this.currentHP });
          break;
          
        case 'FORCE_UPDATE_HP':
          await this.updateHP();
          sendResponse({ hp: this.currentHP });
          break;
          
        case 'SETTINGS_UPDATED':
          this.settings = message.settings;
          await chrome.storage.sync.set({ hpPlannerSettings: this.settings });
          sendResponse({ success: true });
          break;
          
        case 'SIMULATE_MEETING':
          await this.simulateMeeting(message.meeting);
          sendResponse({ success: true, hp: this.currentHP });
          break;
          
        case 'RESET_HP':
          this.currentHP = 75;
          this.lastUpdate = Date.now();
          await this.saveHP();
          this.notifyHPUpdate(this.currentHP);
          sendResponse({ success: true, hp: this.currentHP });
          break;
          
        case 'GET_DEBUG_INFO':
          const debugInfo = await this.getDebugInfo();
          sendResponse({ debugInfo });
          break;
          
        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ error: error.message });
    }
  }

  async simulateMeeting(meeting) {
    const meetingCost = this.calculateMeetingCost(meeting, 15);
    const newHP = Math.max(0, this.currentHP - meetingCost);
    
    this.currentHP = newHP;
    this.lastUpdate = Date.now();
    await this.saveHP();
    
    this.notifyHPUpdate(newHP);
    
    if (this.settings.debug.enableDebugLogs) {
      console.log(`Meeting simulated: ${meeting.title}, Cost: ${meetingCost.toFixed(1)}, New HP: ${newHP.toFixed(1)}%`);
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

  async getDebugInfo() {
    const weatherData = await chrome.storage.local.get(['weatherData', 'weatherTimestamp', 'baseHP']);
    
    return {
      currentHP: this.currentHP.toFixed(1),
      lastUpdate: new Date(this.lastUpdate).toISOString(),
      weather: weatherData.weatherData,
      weatherTime: weatherData.weatherTimestamp ? new Date(weatherData.weatherTimestamp).toISOString() : null,
      baseHP: weatherData.baseHP,
      coefficients: this.settings.coefficients,
      thresholds: this.settings.thresholds,
      uptime: Date.now() - this.lastUpdate
    };
  }
}

// Service Worker起動時に初期化
try {
  const backgroundManager = new BackgroundManager();
  
  // グローバルアクセス用（開発・デバッグ）
  self.backgroundManager = backgroundManager;
  
} catch (error) {
  console.error('Background Manager initialization failed:', error);
}