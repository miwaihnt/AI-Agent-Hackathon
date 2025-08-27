# HP Planner Chrome拡張 テスト・セットアップガイド

## 🚀 Chrome拡張のインストール手順

### 1. 開発者モードで拡張を読み込み

1. **Chrome拡張管理画面を開く**
   ```
   chrome://extensions/
   ```

2. **デベロッパーモードを有効化**
   - 右上の「デベロッパーモード」をONにする

3. **拡張機能を読み込み**
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `src/chrome-extension` フォルダを選択

4. **読み込み確認**
   - 拡張一覧に「HP Planner」が表示される
   - エラーがないことを確認

### 2. アイコン生成（必要に応じて）

1. **アイコン生成ページを開く**
   ```
   file:///path/to/src/chrome-extension/icons/create-icons.html
   ```

2. **アイコンをダウンロード**
   - HP値を調整してデザイン確認
   - 「全サイズダウンロード」で icon16.png, icon32.png, icon48.png, icon128.png を取得
   - `src/chrome-extension/icons/` フォルダに配置

3. **拡張を再読み込み**
   - Chrome拡張管理画面で🔄ボタンをクリック

## ✅ 基本動作テスト

### テスト1: ポップアップ表示
- [ ] ツールバーのアイコンをクリック
- [ ] ポップアップが320px幅で表示される
- [ ] SVGリングでHP値（75%）が表示される
- [ ] 色が緑色（hp-high）で表示される

### テスト2: HP表示・計算
- [ ] HP値がリアルタイムで表示される
- [ ] 1分待つとHP値が0.5減少する
- [ ] 60%以下で色がオレンジに変わる
- [ ] 30%以下で色が赤に変わる

### テスト3: トースト通知
- [ ] コンソールで `window.hpDisplay.simulateHPChange(-30)` 実行
- [ ] HP値が45%になり、オレンジ色表示
- [ ] さらに `window.hpDisplay.simulateHPChange(-15)` 実行  
- [ ] HP値が30%未満になり、トースト通知が表示される

### テスト4: 設定画面
- [ ] 拡張アイコンを右クリック → オプション
- [ ] 設定画面が新しいタブで開く
- [ ] 係数スライダーが動作する
- [ ] チェックボックスの状態が保存される

### テスト5: 休憩機能
- [ ] HP値を25%以下に下げる
- [ ] 「10分休憩を追加」ボタンをクリック
- [ ] .icsファイルがダウンロードされる
- [ ] HP値が回復する（+10）

### テスト6: デバッグ機能
- [ ] 設定画面のデバッグセクション
- [ ] 「HP値リセット」で75%に戻る
- [ ] 「テスト会議実行」でHP値が減少する
- [ ] 「データエクスポート」でJSONファイルがダウンロードされる

## 🛠️ トラブルシューティング

### よくある問題

#### 1. 拡張が読み込めない
```
Error: Manifest version 3 is not supported
```
**解決策**: Chrome 88+ を使用してください

#### 2. ポップアップが表示されない
**確認事項**:
- popup.html, popup.js が存在するか
- manifest.json の "action" 設定が正しいか
- Console でエラーが出ていないか

#### 3. SVGリングが表示されない
**確認事項**:
- popup.css が読み込まれているか
- SVG要素のstroke-dashoffset計算が正しいか
- Console で JavaScript エラーがないか

#### 4. HP値が更新されない
**確認事項**:
- background.js が動作しているか
- Chrome拡張の Service Worker が起動しているか
- chrome.storage.local 権限があるか

### デバッグ手順

#### 1. Console でのデバッグ
```javascript
// ポップアップConsoleで実行
window.hpDisplay.currentHP          // 現在のHP値確認
window.hpDisplay.simulateHPChange(-10)  // HP値を10減少
window.debugHP.test()               // デバッグテスト実行
```

#### 2. Background Script デバッグ
```
chrome://extensions/
```
- HP Planner の「詳細」
- 「バックグラウンドページを検査」
- Console でログ確認

#### 3. Storage デバッグ
```javascript
// 保存されたデータ確認
chrome.storage.local.get(null, console.log);
chrome.storage.sync.get(null, console.log);

// データクリア
chrome.storage.local.clear();
chrome.storage.sync.clear();
```

## 📊 パフォーマンステスト

### メモリ使用量確認
1. `chrome://extensions/` で HP Planner の詳細
2. 「メモリ」使用量をチェック
3. 目標: 10MB未満

### CPU使用量確認
1. Chrome Task Manager (Shift+Esc)
2. HP Planner のCPU使用率確認
3. 目標: 通常時1%未満

### レスポンス時間測定
```javascript
// ポップアップ開く時間
console.time('popup-open');
// アイコンクリック
// ポップアップ表示完了時
console.timeEnd('popup-open');
// 目標: 500ms未満
```

## 🔄 継続的テスト

### 毎日の動作確認
- [ ] ポップアップ表示・HP表示
- [ ] 自動更新（1分待機）
- [ ] 通知システム
- [ ] 設定画面

### 週次の動作確認  
- [ ] 長時間稼働テスト（8時間）
- [ ] メモリリーク確認
- [ ] 様々なHP値での動作
- [ ] エラーハンドリング

## 📱 本番環境テスト（Week 2以降）

### API統合後の追加テスト
- [ ] Open-Meteo API 接続
- [ ] Cloud Functions 呼び出し
- [ ] Firestore データ保存・読み込み
- [ ] エラー時のフォールバック動作

### AI Agent統合後のテスト
- [ ] Vertex AI Gemini 接続
- [ ] 4つのAgent動作確認
- [ ] JSON出力パース
- [ ] レスポンス時間測定

## 📈 テスト結果記録

### テスト実行ログ
```
日時: 2025-08-27
テスト実行者: [Your Name]
Chrome Version: [Version]

基本動作テスト:
✅ ポップアップ表示: OK
✅ HP表示: OK (75% → 74.5% after 1min)
✅ 色変化: OK (緑→オレンジ→赤)
✅ トースト通知: OK
✅ 設定画面: OK
✅ 休憩機能: OK (.ics download)
✅ デバッグ機能: OK

パフォーマンス:
- メモリ使用量: 8.2MB
- CPU使用率: 0.3%
- ポップアップ表示時間: 234ms

課題・改善点:
- 特になし

次回テスト予定: 2025-08-28
```

---

この手順に従って、Chrome拡張の基本機能をテストし、Week 1の完成度を確認してください！