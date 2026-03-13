# テスト構成ガイド

このディレクトリには、Chrome 拡張機能に影響を与えない形でのユニットテストが含まれています。

## 概要

拡張機能の動作に直接影響を与えずに、ロジック部分のテストを実施するために以下を実装しました：

### テスト対象

- **utils/usernameExtractor.js** - ユーザー名の抽出と正規化ロジック
- **utils/cacheValidator.js** - キャッシュ有効性チェック機能

### テストフレームワーク

- **Jest** - Node.js ベースのテストフレームワーク（Chrome API 依存なし）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. テストの実行

すべてのテストを実行：
```bash
npm test
```

ウォッチモード（ファイル変更時に自動実行）：
```bash
npm run test:watch
```

カバレッジレポート付きで実行：
```bash
npm run test:coverage
```

## テストファイル構成

```
tests/
 ├ usernameExtractor.test.js    - ユーザー名抽出関数のテスト
 └ cacheValidator.test.js       - キャッシュ検証関数のテスト
```

## テストの特徴

### ✅ 拡張機能への影響なし

- テストは Chrome API（`chrome.storage`, `chrome.runtime` など）に依存していません
- Node.js 環境で実行可能で、拡張機能の実際の動作環境を必要としません
- テストの追加・変更は拡張機能のコードに影響を与えません

### ✅ 既存コードの変更なし

- 新しい `utils/` ディレクトリに純粋な関数を配置
- 既存の `content.js`, `communityApi.js` などは変更していません
- テスト可能な形で関数を再利用可能にしています

### ✅ CI/CD 対応

- package.json に テストスクリプトを追加済み
- Jest 設定ファイルで容易にカスタマイズ可能

## テストケース一覧

### usernameExtractor.test.js

| テスト | 説明 |
|--------|------|
| `extractUsernameFromTwiplaLink` | Twipla リンク要素からのユーザー名抽出 |
| `normalizeUsername` | ユーザー名の正規化（@ 除去、小文字化） |
| `isMember` | メンバーリストへの所属確認 |

### cacheValidator.test.js

| テスト | 説明 |
|--------|------|
| `isCacheValid` | キャッシュの有効性チェック |
| `getCacheTimeRemaining` | キャッシュの残り有効期限計算 |
| `createCacheObject` | キャッシュオブジェクトの作成 |

## 実装例

既存のコードから関数を利用する場合：

```javascript
// content.js の代わりに utils を使用
const { isMember } = require('../utils/usernameExtractor');

const members = ['okojo417', 'kakaro_tto'];
const username = 'okojo417';

if (isMember(username, members)) {
  appendBadge(link);
}
```

## カバレッジ

テストスイートは以下の関数をカバーしています：

- `extractUsernameFromTwiplaLink()` - ユーザー名抽出
- `normalizeUsername()` - ユーザー名正規化
- `isMember()` - メンバー確認
- `isCacheValid()` - キャッシュ有効性
- `getCacheTimeRemaining()` - キャッシュ残存時間
- `createCacheObject()` - キャッシュ作成

## 今後の拡張

テスト対象を拡張する場合：

1. `utils/` に純粋な関数として機能を実装
2. `tests/` にテストファイルを追加
3. `npm test` で実行・検証

このアプローチにより、拡張機能の安定性を確保しながら、段階的に機能を追加できます。
