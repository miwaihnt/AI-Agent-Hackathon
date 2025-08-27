/**
 * HP Planner Cloud Functions
 * 天気データ取得・HP計算・AI Agent機能
 */

const {setGlobalOptions} = require("firebase-functions");
const admin = require("firebase-admin");

// Firebase Admin初期化
admin.initializeApp();

// コスト制御: 最大10インスタンス
setGlobalOptions({maxInstances: 10});

// Weather Service
const weatherService = require("./weather");

// 天気関連の関数をエクスポート
exports.getCurrentWeather = weatherService.getCurrentWeather;
exports.updateWeatherDaily = weatherService.updateWeatherDaily;
