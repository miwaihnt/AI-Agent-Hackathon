# HP Planner 技術検証項目

## Phase 1 必須検証項目（8/27-9/3）

### 1. Google Cloud Platform 基盤検証

#### 1.1 Firebase プロジェクト初期化
- [ ] **課金設定**: $300クーポン適用・予算アラート設定
- [ ] **IAM設定**: サービスアカウント作成・権限付与
- [ ] **API有効化**: Cloud Functions, Firestore, Vertex AI, Scheduler
- [ ] **ローカル認証**: `gcloud auth` + サービスアカウントキー

**検証基準**: Firebase CLI でプロジェクト操作が可能

#### 1.2 Cloud Functions v2 動作確認
- [ ] **ローカル開発**: Functions Framework起動・デバッグ
- [ ] **デプロイテスト**: `gcloud functions deploy` 成功
- [ ] **HTTP呼び出し**: cURL/Postman でレスポンス確認
- [ ] **ログ出力**: Cloud Logging でログ確認可能

**検証基準**: "Hello World" Functions が正常稼働

#### 1.3 Firestore データベース設計
- [ ] **コレクション設計**: users, hp_logs, weather_data, configs
- [ ] **セキュリティルール**: 最小権限・匿名アクセス設定
- [ ] **CRUD操作**: Create/Read/Update/Delete 全操作確認
- [ ] **インデックス**: クエリ最適化・複合インデックス

**検証基準**: Node.js SDK でデータ操作が可能

---

### 2. AI・外部API統合検証

#### 2.1 Vertex AI Gemini 接続確認
```javascript
// 検証用コード例
const { VertexAI } = require('@google-cloud/vertexai');
const vertex = new VertexAI({
  project: 'your-project-id',
  location: 'us-central1'
});

// テストプロンプト
const prompt = "天気が晴れ、最高気温32度の日のHP初期値理由を1文で説明して";
```

- [ ] **認証成功**: サービスアカウント権限で API 呼び出し
- [ ] **レスポンス取得**: JSON形式でテキスト生成結果
- [ ] **エラーハンドリング**: API制限・ネットワークエラー対応
- [ ] **コスト確認**: トークン使用量・料金計算

**検証基準**: 安定してテキスト生成・JSON出力が可能

#### 2.2 Open-Meteo API 天気取得
```javascript
// 検証用エンドポイント
const weatherAPI = 'https://api.open-meteo.com/v1/forecast?latitude=35.6762&longitude=139.6503&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max';
```

- [ ] **データ取得**: 東京の天気予報7日分取得成功
- [ ] **JSON解析**: temperature, precipitation 値抽出
- [ ] **エラー処理**: API障害時のフォールバック
- [ ] **レート制限**: 呼び出し頻度制限の確認

**検証基準**: 天気データから HP ベース値算出が可能

---

### 3. Chrome拡張 MV3 動作確認

#### 3.1 Manifest V3 基本構成
```json
{
  "manifest_version": 3,
  "name": "HP Planner",
  "version": "1.0.0",
  "permissions": ["storage", "alarms"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }],
  "action": {
    "default_popup": "popup.html"
  }
}
```

- [ ] **権限確認**: 最小権限でAPI呼び出し・ストレージ操作
- [ ] **Service Worker**: バックグラウンド処理・アラーム設定
- [ ] **Content Script**: ページ注入・DOM操作
- [ ] **Popup/Options**: 設定画面・デバッグ情報表示

**検証基準**: Chrome Developer Mode で拡張が正常動作

#### 3.2 Chrome ↔ Cloud Functions 通信
- [ ] **CORS設定**: Functions側でOrigin許可設定
- [ ] **認証方式**: API Key / JWT トークン決定
- [ ] **データ交換**: JSON形式でHP値・設定値送受信
- [ ] **エラーハンドリング**: ネットワーク障害・タイムアウト対応

**検証基準**: 拡張からFunctions呼び出しでデータ取得成功

---

### 4. HP計算ロジック検証

#### 4.1 基本計算式実装
```javascript
function calculateHP(currentHP, timeDelta, activities) {
  const naturalDecay = 0.5 * (timeDelta / 15); // 15分あたり0.5減少
  let activityCost = 0;
  
  activities.forEach(activity => {
    const typeCost = TYPE_COEFFICIENTS[activity.type] || 1.0;
    const lengthCost = 1 + (activity.minutes / 60) * 0.2;
    const attendeeCost = Math.max(0, activity.attendees - 2) * 0.2;
    activityCost += typeCost * lengthCost * attendeeCost;
  });
  
  return Math.max(0, Math.min(100, currentHP - naturalDecay - activityCost));
}
```

- [ ] **自然減衰**: 0.5/15分の正確な減少
- [ ] **会議コスト**: type/length/attendee係数適用
- [ ] **境界値**: 0-100範囲でのclamp処理
- [ ] **単体テスト**: 各計算パターンの結果検証

**検証基準**: 手計算と一致する結果が出力される

#### 4.2 天気→ベースHP算出
```javascript
function calculateBaseHP(weather) {
  const tmax = weather.temperature_2m_max;
  const tmin = weather.temperature_2m_min;
  const rainProb = weather.precipitation_probability_max;
  
  let baseHP = 100;
  baseHP -= Math.max(0, tmax - 30) * 1.2;  // 暑さ影響
  baseHP -= Math.max(0, 18 - tmin) * 0.5;  // 寒さ影響
  baseHP -= (rainProb / 100) * 10;         // 雨確率影響
  
  return Math.max(30, Math.min(100, baseHP)); // 30-100範囲
}
```

- [ ] **気温影響**: 最高/最低気温での減少計算
- [ ] **降水確率**: 雨予報でのHP減少
- [ ] **最低保証**: 30未満にならない制約
- [ ] **テストケース**: 様々な天気パターンでの動作確認

**検証基準**: 天気条件に応じた妥当なHP初期値が算出

---

### 5. パフォーマンス・制限値確認

#### 5.1 Cloud Functions 性能測定
- [ ] **コールドスタート**: 初回起動時間（目標: 3秒以内）
- [ ] **ウォームスタート**: 2回目以降レスポンス（目標: 500ms以内）
- [ ] **メモリ使用量**: 実行時メモリ消費（上限: 256MB）
- [ ] **同時実行**: 複数リクエスト処理能力

**検証基準**: レスポンス時間・メモリ使用量が許容範囲

#### 5.2 API制限・コスト確認
- [ ] **Vertex AI制限**: 月間トークン数・リクエスト制限
- [ ] **Open-Meteo制限**: 1日あたりAPI呼び出し上限
- [ ] **Firestore制限**: 読み書き操作数・ストレージ容量
- [ ] **予算監視**: $300クーポン消費率・自動停止設定

**検証基準**: ハッカソン期間中の予算内で運用可能

---

### 6. セキュリティ・プライバシー検証

#### 6.1 データ保護
- [ ] **PII最小化**: 個人識別情報の収集・保存最小限
- [ ] **データ暗号化**: Firestore保存時・通信時暗号化
- [ ] **アクセス制御**: Firestore Security Rules適用
- [ ] **ログ管理**: 機密情報の非記録設定

**検証基準**: 個人情報保護・セキュリティ要件満足

#### 6.2 Chrome拡張セキュリティ
- [ ] **Content Security Policy**: XSS攻撃対策
- [ ] **Permission最小化**: 必要最小限の権限要求
- [ ] **外部通信**: HTTPS通信・証明書検証
- [ ] **ローカルストレージ**: 機密データの暗号化保存

**検証基準**: Chrome Web Store 審査基準準拠（将来対応）

---

### 7. 統合テスト シナリオ

#### 7.1 E2Eテストフロー
```
1. 天気データ取得 (06:00 Cloud Scheduler)
   ↓
2. ベースHP算出 + Gemini理由生成
   ↓
3. Firestore保存・Chrome拡張通知
   ↓
4. ユーザーHP確認・会議予定入力
   ↓
5. HP減少計算・閾値判定
   ↓
6. ブレイク提案・会議最適化提案
```

- [ ] **フルフロー**: 天気→HP→提案まで一連動作
- [ ] **エラー回復**: 各段階でのエラー時フォールバック
- [ ] **データ整合性**: HP値・ログデータの正確性
- [ ] **タイミング**: 定期実行・リアルタイム更新

**検証基準**: 24時間連続で安定動作

#### 7.2 負荷・障害テスト
- [ ] **多重リクエスト**: 同時アクセス処理能力
- [ ] **API障害**: 外部API停止時の代替処理
- [ ] **ネットワーク分断**: オフライン時の動作継続
- [ ] **データ破損**: 異常データでのエラーハンドリング

**検証基準**: 異常状況でも基本機能が維持される

---

## 技術選択リスク評価

### 高リスク項目（要代替案検討）
1. **Vertex AI Gemini**: 新しいAPI・制限不明 → OpenAI API 代替準備
2. **Chrome MV3**: Service Worker制限 → Popup中心設計
3. **Open-Meteo**: API変更可能性 → 他天気API（有料）バックアップ

### 中リスク項目（監視必要）  
1. **Cloud Functions v2**: コールドスタート → 定期Warm-up設定
2. **Firestore コスト**: 読み書き課金 → クエリ最適化・キャッシュ活用
3. **Chrome拡張配布**: ストア審査不要 → サイドロード手順明確化

### 低リスク項目（問題発生時対応）
1. **Firebase Hosting**: デプロイ失敗 → GitHub Pages 代替
2. **Remote Config**: 設定変更 → ハードコード値フォールバック
3. **SVG描画**: ブラウザ互換性 → Canvas描画代替

---

## 検証完了判定基準

### Phase 1 完了条件（9/3までに全て達成）
- [ ] 全技術スタックが単体で動作確認済み
- [ ] E2E基本フローが手動実行可能
- [ ] 重要リスクに対する代替案準備完了
- [ ] コスト見積もり・予算管理体制確立

**次フェーズ移行可否**: 上記4項目すべてクリア時のみ Phase 2 開始

---

**作成日**: 2025-08-27  
**更新**: 検証実施後に結果・対策を追記