Xコミュニティ所属チェック Chrome拡張機能 仕様書

## 1. 概要

Twiplaイベントページ上に表示される参加者の **X（旧Twitter）アカウントが特定のXコミュニティに所属しているかを自動判定し、ページ上に表示するChrome拡張機能**を開発する。

本拡張は **拡張機能内のローカルデータベースに Xコミュニティメンバーを蓄積**し、Twiplaページ閲覧時にそのデータベースを照合してコミュニティ所属を判定する。

データベースは一定期間（24時間）有効であり、期限切れ時に自動更新される。

---

# 2. 目的

オフラインイベント（オフ会）などの参加者が

* 特定コミュニティのメンバーか
* そうでないか

を **Twiplaページ上で即時判別できるようにする。**

これにより

* イベント運営の確認作業の効率化
* 参加者のコミュニティ所属確認
* トラブル防止

を目的とする。

---

# 3. 対象サイト

対象ページ

```
https://twipla.jp/*
```

Twiplaイベントページ例

```
https://twipla.jp/events/xxxxxxxx
```

---

# 4. 判定対象

## Twiplaの参加者一覧要素

Twiplaイベントページの参加者一覧は `<li>` 要素で囲まれた以下の構造：

```html
<li>
  <img ... class="lazyload circle" ...>
  &nbsp;
  <a href="/users/{userId}" class="card namelist" n="{displayName}" s="{username}" title="@{username}" target="_self">
    {displayName}
  </a>
</li>
```

### 抽出対象

Twiplaの参加者リンク `<a class="card namelist">` から以下を抽出：

| 要素 | 取得方法 | 用途 |
|-----|--------|------|
| `<a>` タグ | `a.card.namelist` セレクター | バッジ挿入位置 |
| ユーザー名 | `title` 属性から `@` を除去、または `s` 属性から取得 | X コミュニティメンバーと照合 |
| 表示名 | `n` 属性またはテキスト内容 | UI表示用 |

---

## X/Twitter ドメインのリンク （フォールバック）

Twiplaページ内に X/Twitter の直接リンク（プロフィールカード内など）がある場合も対応：

```
https://x.com/{username}
https://twitter.com/{username}
```

---

# 5. 判定対象コミュニティ

対象コミュニティは **1つの固定コミュニティ**とする。

コミュニティURL例

```
https://x.com/i/communities/1861234567890123456
```

ここで使用する値

```
community_id = 1508768613662343173
```

---

# 6. コミュニティメンバー取得方法

Xの内部GraphQL APIを利用してコミュニティメンバーを取得する。

## API エンドポイント

```
https://x.com/i/api/graphql/{queryId}/CommunityMembersSlice
```

### リクエスト形式

```
POST /i/api/graphql/{queryId}/CommunityMembersSlice
Content-Type: application/json
User-Agent: <browser-user-agent>
X-CSRF-Token: <CSRF-token>
X-Client-UUID: <UUID-v4>
Credentials: include

{
  "variables": {
    "community_rest_id": "1508768613662343173",
    "count": 20,
    "cursor": "<pagination_cursor>"
  }
}
```

### 必須ヘッダー

| ヘッダー名 | 説明 | 入手方法 |
|-----------|------|--------|
| `Content-Type` | `application/json` | 固定 |
| `User-Agent` | ブラウザのUser-Agent | navigator.userAgent |
| `X-CSRF-Token` | CSRF トークン | X.com の `ct0` Cookie から取得 |
| `X-Client-UUID` | クライアント識別用UUID | UUID v4 を生成 |
| `Credentials` | `include` | Cookie/Session を含める |

###CORS対応

X.com へのリクエストは twipla.jp ドメインから直接フェッチすると CORS エラーが発生する。

**対応:**
- **Service Worker 経由でリクエストを中継**
  - Content Script から Service Worker へメッセージ送信
  - Service Worker が X.com へ fetch（CORS 不適用）
  - レスポンスをContent Script に返送
  - この方式により CORS エラーを回避

### レスポンス例

```json
{
  "data": {
    "community_by_rest_id": {
      "members_slice": {
        "items": [
          {
            "result": {
              "community_relationship": {
                "user_results": {
                  "result": {
                    "legacy": {
                      "screen_name": "example_user"
                    }
                  }
                }
              }
            }
          }
        ],
        "continuation": "<next_pagination_cursor>"
      }
    }
  }
}
```

---

## QueryID の動的検出

Xは定期的に GraphQL の QueryID を変更するため、**ハードコードされたQueryIDは陳腐化しやすい。**

### 対応戦略

**ネットワークインターセプション** を用いて実際のQueryIDを自動検出：

1. **Service Worker でネットワークをモニタリング**
   - X.comへのGET/POSTリクエストをフック
   - GraphQL APIリクエストのプロトコルを解析
   - 実際に使用されているQueryIDを抽出

2. **検出結果をStorage に保存**
   ```json
   {
     "queryId": "bJL6MePns78FJAY930RqDQ",
     "queryIdDetectedAt": 1710381600000
   }
   ```

3. **フォールバック機構**
   - Service Worker で自動検出できない場合
   - 事前登録された複数のQueryID候補を順序試行

### 実装詳細

- Service Worker (background.js) で `chrome.webRequest` または `fetch` をインターセプト
- X.com ドメインへのGET/POSTで `graphql/%s/CommunityMembersSlice` パターンを検出
- マッチしたQueryIDをローカルストレージに保存
- 次回以降、保存されたQueryIDを優先的に使用

---

# 7. データベース仕様

## 目的

Xコミュニティメンバーの一覧を拡張機能内のローカルデータベースに保持し、Twiplaページロード時に数十〜数千規模のメンバーリストから高速に照合できるようにする。

---

## データベース構成

### 保存場所

```
chrome.storage.local
```

### 保存データ構造

```json
{
  "community_members": [
    "userA",
    "userB",
    "userC"
  ],
  "lastUpdated": 1700000000,
  "communityId": "1508768613662343173"
}
```

### 各フィールド

| フィールド | 型 | 説明 |
|----------|-----|------|
| community_members | string[] | コミュニティに所属するユーザー名（screen_name）の配列 |
| lastUpdated | number | データベース更新時刻（Unix timestamp in milliseconds） |
| communityId | string | 対象コミュニティID |

---

## データベース更新フロー

### 初期データ取得

1. Twiplaページロード時、データベースを確認
2. データベースが空 **または** キャッシュが有効期限切れ の場合：
   - GraphQL APIからコミュニティメンバー全件取得（ページング対応）
   - データベースに上書き保存
3. データベースが有効な場合：
   - API呼び出しをスキップ
   - 保存済みデータベースを使用

### キャッシュ有効期限

```
24時間（86400000ミリ秒）
```

有効期限を超過した場合、次のTwiplaページロード時に自動更新される。

---

## メモリ効率

想定するコミュニティサイズ：**100人〜10000人**

- 10,000ユーザーのscreen_nameリスト（平均10文字） = 約100KB
- chrome.storage.local の容量制限： **10MB**

パフォーマンス上の問題なし。

---

# 8. Twiplaページ処理

Twiplaイベント参加者一覧ページ（`https://twipla.jp/events/{eventId}`）で以下を実行する。

---

## 処理フロー

### 1. 参加者リンク要素の取得

**対象セレクター:**

```javascript
document.querySelectorAll('a.card.namelist')
```

**各参加者情報:**
- ユーザー名は `title` 属性（`@username` 形式）または `s` 属性から取得
- 例: `<a title="@okojo417" s="okojo417">` → username = `okojo417`

---

### 2. ユーザー名の抽出

```javascript
// title 属性から @ を除去
const username = link.getAttribute('title').replace(/^@/, '');

// または s 属性から直接取得
const username = link.getAttribute('s');
```

---

### 3. コミュニティ所属判定

```javascript
members.includes(username)
```

---

### 4. バッジ表示

所属ユーザーのリンク **直後** にバッジを挿入

**HTML構造(変更前):**
```html
<li>
  <img ... >
  &nbsp;
  <a class="card namelist" ...>らむ茶</a>
</li>
```

**HTML構造(変更後):**
```html
<li>
  <img ... >
  &nbsp;
  <a class="card namelist" ...>らむ茶</a>
  <span class="community-badge" style="color: green; font-weight: bold;">✔</span>
</li>
```

**バッジ仕様:**

| 属性 | 値 |
|------|-----|
| 文字 | `✔` |
| 色 | `#22c55e` (緑) |
| フォント | bold |
| マージン | `0 0 0 4px` (左マージン 4px) |

---

### 5. 重複チェック

同じユーザーが複数回表示される場合、バッジは1回のみ追加

**実装例:**
```javascript
const processed = new Set();
document.querySelectorAll('a.card.namelist').forEach((link) => {
  const username = link.getAttribute('s');
  if (!processed.has(username)) {
    if (members.includes(username)) {
      appendBadge(link);
    }
    processed.add(username);
  }
});
```

---

# 9. Chrome拡張仕様

## Manifest Version

```
Manifest v3
```

---

## 必要権限

```
storage          - データベースとQueryID保存
cookies          - X.com CSRF トークン (ct0) の読み取り
webRequest       - GraphQL QueryID自動検出
```

---

## host_permissions

```
https://x.com/*
https://twipla.jp/*
```

---

## background_scripts (Service Worker)

**QueryID の動的検出用**

```javascript
// background.js
// X.comへのリクエストをインターセプトして、GraphQL QueryIDを自動検出
// HTTP レスポンスヘッダまたはリクエスト URL から実際のQueryIDを抽出
```

---

## content_scripts

対象ページ：

```
https://twipla.jp/*
```

スクリプト：

```
storage.js, communityApi.js, content.js
```

---

# 10. ファイル構成

```
x-community-checker/
 ├ manifest.json
 ├ background.js          (Service Worker; QueryID自動検出)
 ├ content.js             (Twiplaページ内リンク走査)
 ├ communityApi.js        (GraphQL API呼び出し＆キャッシュ)
 └ storage.js             (chrome.storage.local ラッパー)
```

---

# 11. 処理フロー

```
Twiplaページロード
      ↓
DB有効期限確認
      ↓
[有効期限切れ？]
      ├─ YES: GraphQL APIからメンバー取得
      |       ↓
      |       DBに保存
      |       ↓
      └─→ DB内のメンバーリスト取得
      ↓
参加者リンク検出（a.card.namelist）
      ↓
username抽出
      ↓
DBのメンバーリストと照合
      ↓
所属ユーザーにバッジ表示
```

---

# 12. 想定コミュニティサイズ

```
100人〜10000人
```

パフォーマンス対策

* ローカルキャッシュ使用
* API取得は最小限

---

# 13. 将来拡張（予定）

将来的に以下機能の追加を想定

### ブラックリスト共有

```
特定ユーザーの警告表示
```

例

```
⚠ blacklist
```

---

### 複数コミュニティ対応

```
複数community_id
```

---

### Twipla参加者分析

```
コミュニティ所属率表示
```

例

```
参加者 42名
コミュニティ所属 31名
```

---

# 14. 非機能要件

動作ブラウザ

```
Google Chrome
```

推奨

```
Chrome 120以上
```

---

# 15. セキュリティ

本拡張は以下のデータのみ扱う

```
公開XユーザーID
コミュニティメンバー情報
```

パスワードや認証情報は保存しない。

X APIアクセスは

```
ブラウザログインセッション
```

を利用する。

---

# 16. 制約事項と対応

## Xの内部GraphQL APIについて

Xの内部GraphQL APIは **非公開API** であるため、以下のような変更がありえる：

```
- QueryID の変更
- エンドポイントのURL構造変更
- レスポンス構造の変更
```

---

## QueryID 変更への自動対応

本拡張は **Service Worker による自動検出** で、QueryID変更に対応する：

### 動作フロー

1. **X.com への リクエストをモニタリング**
   - Service Workerが X.com へのネットワークリクエストをフック
   - `graphql/.../CommunityMembersSlice` パターンを検出

2. **QueryID を自動抽出**
   - リクエストURLから実際のQueryIDを抽出
   - `chrome.storage.local` に保存

3. **次回以降、保存されたQueryIDを優先使用**
   - APIコール時に自動的に保存されたQueryIDを参照

### 自動検出が失敗した場合

- フォールバック：複数の既知QueryID候補をリスト化
- 順序試行（リトライ機構）
- すべて失敗時：コンソール警告 + 拡張の機能停止

---

## その他の変更への対応

**エンドポイントURLやレスポンス構造が変更された場合、手動での拡張更新が必要。**

---

# 17. 成功条件

Twiplaイベント参加者一覧ページ（`https://twipla.jp/events/{eventId}`）を開いた際に、以下が確認できること：

```
✔ バッジがコミュニティ所属ユーザーの名前の右隣に表示される
```

**表示例：**

```
ユーザーA      ← バッジなし（非メンバー）
ユーザーB  ✔   ← 緑色チェックマーク（メンバー）
ユーザーC      ← バッジなし（非メンバー）
ユーザーD  ✔   ← 緑色チェックマーク（メンバー）
```

**要件：**
- ✅ コミュニティメンバーのみバッジが表示
- ✅ バッジは（`✔`）の形で、緑色（#22c55e）
- ✅ ユーザー一覧の読み込み完了時に自動的に実行
