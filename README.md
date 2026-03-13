# X Community Checker Chrome Extension

This Google Chrome extension inspects Twipla event pages and displays community membership status for event participants. It automatically checks whether listed participants belong to a specific X (formerly Twitter) community.

## Features

* **Targets Twipla participant lists** and extracts username from `<a class="card namelist">` elements
* Fetches and caches members of a community using X's internal GraphQL API
* **Automatically detects GraphQL QueryID changes** via Service Worker network monitoring
* Displays a green **✔** badge next to participant names if they are community members
* Caches the member list in `chrome.storage.local` for 24 hours to minimize API calls
* Supports username extraction from title attributes (`@username`) and data attributes (`s=username`)

## Installation (for development)

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable *Developer mode* (toggle in the top right).
3. Click **Load unpacked** and select this project's root directory.
4. Visit a Twipla event page (`https://twipla.jp/events/...`) while logged into X and verify badges appear.

---

# セットアップガイド（日本語）

このセクションでは、X Community Checker 拡張機能のセットアップ方法を日本語で説明します。

## 前提条件

- **Google Chrome** ブラウザ（推奨: Chrome 120以上）
- **X.com（旧Twitter）のアカウント**（ログインが必須）
- このリポジトリのファイル一式

## インストール手順

### ステップ1: リポジトリをダウンロード

このリポジトリをローカルマシンにダウンロードします。

```bash
git clone https://github.com/your-repo/twipla_communicate_check.git
cd twipla_communicate_check
```

または、ZIP ファイルでダウンロードして解凍します。

---

### ステップ2: Chrome の開発者モードを有効化

1. Google Chrome を開きます
2. アドレスバーに `chrome://extensions` と入力して Enter
3. ページ右上の **開発者モード** トグルをONにします

![開発者モード有効化](docs/images/developer-mode.png)

---

### ステップ3: 拡張機能を読み込む

1. **「パッケージ化されていない拡張機能を読み込む」** ボタンをクリック
2. ダウンロードした `twipla_communicate_check` フォルダを選択
3. 開く

拡張機能がインストールされて、Chrome の拡張機能リストに表示されます。

---

### ステップ4: X.com にログイン

1. **X.com（旧Twitter）** にアクセス
2. 自分のアカウントでログイン
   - ⚠️ **重要**: 拡張機能は X.com にログインしている状態で動作します
   - ログアウト状態では GraphQL API にアクセスできません

---

### ステップ5: Twipla イベントページで動作確認

1. **Twipla** にアクセス: https://twipla.jp
2. イベント参加者が表示されているページを開く  
   例: https://twipla.jp/events/720351
3. 参加者一覧を確認
   - ✔ **緑色のチェックマーク** = コミュニティメンバー
   - 何もなし = 非メンバー

---

## 初回起動時の注意

### GraphQL QueryID の自動検出

初回起動時に、Service Worker が X.com からの GraphQL QueryID を自動検出します。

- **所要時間**: 1〜2 分
- **実行条件**: X.com へのアクセスがあり、Chrome がアクティブな状態
- **確認方法**: Chrome DevTools のコンソールで以下を確認
  ```
  [X Community Checker] Using QueryID: <検出されたID>
  ```

### コミュニティメンバーリストのキャッシュ

初回アクセス時に、X.com からコミュニティメンバーリストを取得してキャッシュします。

- **所要時間**: 3〜10 秒（メンバー数による）
- **キャッシュ有効期間**: 24 時間
- **確認方法**: ブラウザコンソールで以下を確認
  ```
  [X Community Checker] Fetched members: [Array of usernames]
  ```

---

## よくある質問

### Q1: バッジが表示されません

**A**: 以下を確認してください：

1. **X.com にログインしているか?**
   - ログアウト状態では API アクセスができません

2. **Twipla ページが完全に読み込まれているか?**
   - ページの更新（F5）を試してください

3. **拡張機能が有効になっているか?**
   - `chrome://extensions` で拡張機能が有効（青になっている）か確認

4. **コンソールにエラーが出ていないか?**
   - F12 キーでデベロッパーツールを開き、Console タブでエラーをチェック

---

### Q2: 対象のコミュニティを変更できるか?

**A**: 現在はコミュニティID がハードコードされています。変更するには：

1. `content.js` ファイルを開く
2. 以下の行を找す：
   ```javascript
   const COMMUNITY_ID = '1508768613662343173';
   ```
3. コミュニティIDを変更
4. 拡張機能をリロード（`chrome://extensions` で更新ボタンをクリック）

---

### Q3: キャッシュをリセットしたい

**A**: Chrome Dev Tools で以下を実行：

1. F12 キーでデベロッパーツールを開く
2. Console タブで以下を実行：
   ```javascript
   chrome.storage.local.clear(() => console.log('Cache cleared'));
   ```
3. ページを更新（F5）

---

### Q4: X.com の API が変更されたら?

**A**: Service Worker が自動的に新しい QueryID を検出します。

ただし API の大幅な変更があった場合は、手動での拡張機能の更新が必要です。
その場合は GitHub で最新版をダウンロードしてください。

---

## テストの実行（開発者向け）

```bash
# 依存関係のインストール
npm install

# テスト実行
npm test

# ウォッチモード（ファイル変更時に自動実行）
npm run test:watch

# カバレッジレポート
npm run test:coverage
```

---

## トラブルシューティング

### デベロッパーツールでログ確認

```
F12 → Application → Storage → Chrome Storage → local
```

ここで `community_members` と `graphql_query_id` が保存されているか確認できます。

---

## セキュリティとプライバシー

- ✅ パスワードや認証情報は保存されません
- ✅ X.com のセッションクッキーを使用して認証
- ✅ コミュニティメンバーの公開情報のみを扱います
- ✅ ローカルストレージのみを使用（外部サーバーへ送信なし）

---

## サポート

問題が発生した場合：

1. [GitHub Issues](https://github.com/your-repo/twipla_communicate_check/issues) で報告
2. 以下の情報を含めてください：
   - Chrome バージョン
   - コンソールのエラーメッセージ
   - 発生した動作

---

## File structure

```
manifest.json              # MV3 manifest with Service Worker and permissions
background.js              # Service Worker: detects GraphQL QueryID changes
storage.js                 # Promise wrapper around chrome.storage.local
communityApi.js            # GraphQL fetcher + caching logic
content.js                 # DOM manipulation on Twipla pages
utils/
 ├ usernameExtractor.js   # Username extraction and normalization utilities
 └ cacheValidator.js      # Cache validation utilities
tests/
 ├ usernameExtractor.test.js    # Tests for username extraction
 ├ cacheValidator.test.js       # Tests for cache management
 └ README.md                     # Test guide (日本語)
package.json               # npm dependencies and test scripts
jest.config.js             # Jest test configuration
```

## Configuration

* **Community ID**: Hard‑coded in `content.js` as `1508768613662343173`.
* **GraphQL QueryID**: Automatically detected by the Service Worker from x.com network requests and cached in `chrome.storage.local`.  
  If auto‑detection fails, falls back to a known QueryID list.

## How It Works

### Twipla Participant Detection

The extension targets Twipla event pages (e.g., `https://twipla.jp/events/720351`) and processes the participant list:

1. **Extracts usernames** from `<a class="card namelist">` elements using:
   - `s` attribute: Direct username (preferred)
   - `title` attribute: Username in format `@username` (fallback)

2. **Compares** extracted usernames against the community member list

3. **Displays badges** (green `✔`) next to community members in the participant list

### Community Database

- **Source**: X internal GraphQL API (`CommunityMembersSlice` endpoint)
- **Storage**: Chrome local storage
- **Refresh**: Automatically refreshed every 24 hours or when cache expires
- **Size**: Typically 100–10,000 members (~100 KB per cache)

## Notes

* **Twipla Integration**: The extension targets the participant list (`a.card.namelist`) on Twipla event pages. Badges appear as green `✔` characters next to community members' names.
* **X Account Required**: The extension requires you to be logged into X.com for cookie-based authentication to work with the GraphQL API.
* **QueryID Auto‑Detection**: The Service Worker monitors X.com requests and automatically detects GraphQL QueryID changes from the network traffic, eliminating the need to manually update the extension when X's API changes.
* **API Limitation**: This extension uses X's internal (undocumented) GraphQL API. If X significantly changes its API structure, the extension will require updates.
* **Privacy**: No personal data is stored except community member usernames (public information)

## Future enhancements (not implemented)

Refer to the specification for planned features such as multiple communities, blacklist badges, and participation analytics.
