/**
 * Weather Service for HP Planner
 * Open-Meteo API を使用した天気データ取得
 */

const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Open-Meteo API エンドポイント（東京）
const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast" +
  "?latitude=35.6762&longitude=139.6503" +
  "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
  "&timezone=Asia%2FTokyo&forecast_days=1";

/**
 * 天気データを取得してベースHPを計算
 */
async function fetchWeatherData() {
  try {
    logger.info("Fetching weather data from Open-Meteo API");

    // Open-Meteo API から天気データを取得
    const response = await fetch(WEATHER_API_URL);
    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    logger.info("Weather data retrieved successfully", {data});

    // データ抽出
    const daily = data.daily;
    const weatherData = {
      date: daily.time[0],
      temperature_2m_max: daily.temperature_2m_max[0],
      temperature_2m_min: daily.temperature_2m_min[0],
      precipitation_probability_max: daily.precipitation_probability_max[0],
    };

    // ベースHP計算
    const baseHP = calculateBaseHP(weatherData);
    const reason = generateHPReason(weatherData, baseHP);

    const result = {
      ...weatherData,
      baseHP,
      reason,
      fetchedAt: admin.firestore.Timestamp.now(),
      location: "tokyo",
    };

    logger.info("Weather processing completed", {result});
    return result;
  } catch (error) {
    logger.error("Weather data fetch failed", {error: error.message});
    throw new Error(`Weather API error: ${error.message}`);
  }
}

/**
 * 天気データからベースHPを計算
 */
function calculateBaseHP(weather) {
  const {temperature_2m_max: tmax, temperature_2m_min: tmin, precipitation_probability_max: rainProb} = weather;

  let baseHP = 100;

  // 暑さ影響
  if (tmax > 30) {
    baseHP -= Math.max(0, tmax - 30) * 1.2;
  }

  // 寒さ影響
  if (tmin < 18) {
    baseHP -= Math.max(0, 18 - tmin) * 0.5;
  }

  // 雨確率影響
  baseHP -= (rainProb / 100) * 10;

  // 30-100の範囲でクリップ
  return Math.max(30, Math.min(100, Math.round(baseHP)));
}

/**
 * HP理由文を生成（シンプル版）
 */
function generateHPReason(weather, baseHP) {
  const {temperature_2m_max: tmax, temperature_2m_min: tmin, precipitation_probability_max: rainProb} = weather;

  const conditions = [];

  if (tmax > 32) {
    conditions.push("暑さで疲労しやすい");
  } else if (tmax > 28) {
    conditions.push("やや暑め");
  } else if (tmax < 15) {
    conditions.push("寒くて体力消耗");
  } else {
    conditions.push("良好な気温");
  }

  if (rainProb > 70) {
    conditions.push("雨で気分が重い");
  } else if (rainProb > 40) {
    conditions.push("雨の可能性");
  } else {
    conditions.push("天候安定");
  }

  return `${conditions.join("、")}な一日です (HP: ${baseHP}%)`;
}

/**
 * HTTP エンドポイント: 現在の天気データ取得
 */
const getCurrentWeather = onRequest({
  cors: true,
  maxInstances: 5,
}, async (req, res) => {
  try {
    logger.info("Weather API endpoint called", {method: req.method, ip: req.ip});

    // CORS ヘッダー設定
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(200).send("");
      return;
    }

    // 天気データ取得
    const weatherResult = await fetchWeatherData();

    // Firestoreに保存
    const db = admin.firestore();
    const today = new Date().toISOString().split("T")[0];
    await db.collection("weather").doc(today).set(weatherResult);

    logger.info("Weather data saved to Firestore", {date: today});

    res.status(200).json({
      success: true,
      data: weatherResult,
    });
  } catch (error) {
    logger.error("Weather endpoint error", {error: error.message});
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * スケジュール実行: 毎日6時に天気データを更新
 */
const updateWeatherDaily = onSchedule({
  schedule: "0 6 * * *", // 毎日06:00 JST
  timeZone: "Asia/Tokyo",
}, async (event) => {
  try {
    logger.info("Daily weather update started");

    const weatherResult = await fetchWeatherData();

    // Firestoreに保存
    const db = admin.firestore();
    const today = new Date().toISOString().split("T")[0];
    await db.collection("weather").doc(today).set(weatherResult);

    logger.info("Daily weather update completed", {
      date: today,
      baseHP: weatherResult.baseHP,
      reason: weatherResult.reason,
    });
  } catch (error) {
    logger.error("Daily weather update failed", {error: error.message});
    throw error;
  }
});

module.exports = {
  getCurrentWeather,
  updateWeatherDaily,
  fetchWeatherData,
  calculateBaseHP,
};
