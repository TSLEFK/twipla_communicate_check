Xコミュニティ所属チェック Chrome拡張機能 仕様書

## 1. 概要

Twiplaイベントページ上に表示される参加者の **X（旧Twitter）アカウントが特定のXコミュニティに所属しているかを自動判定し、ページ上に表示するChrome拡張機能**を開発する。

本拡張は **Twiplaページ閲覧時のみ動作**し、ページ内に存在するXアカウントリンクを検出してコミュニティ所属を確認する。

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

Twiplaページ内に存在する以下のリンク

```
https://x.com/{username}
https://twitter.com/{username}
```

これらの `{username}` を抽出し、コミュニティ所属判定を行う。

---

# 5. 判定対象コミュニティ

対象コミュニティは **1つの固定コミュニティ**とする。

コミュニティURL例

```
https://x.com/i/communities/1861234567890123456
```

ここで使用する値

```
community_id = 1861234567890123456
```

---

# 6. コミュニティメンバー取得方法

Xの内部GraphQL APIを利用してコミュニティメンバーを取得する。

API例

```
https://x.com/i/api/graphql/{queryId}/CommunityMembers
```

必要パラメータ

```
communityId
cursor (ページング用)
count
```

取得レスポンス例

```json
{
  "data": {
    "communityMembersSlice": {
      "items": [
        {
          "user_results": {
            "result": {
              "legacy": {
                "screen_name": "example_user"
              }
            }
          }
        }
      ]
    }
  }
}
```

取得する値

```
screen_name
```

---

# 7. データ取得仕様

## 初回アクセス時

1. GraphQL APIからコミュニティメンバー取得
2. 全ページ取得（cursorによるページング）
3. メンバー一覧をローカル保存

保存場所

```
chrome.storage.local
```

保存データ例

```json
{
  "community_members": [
    "userA",
    "userB",
    "userC"
  ],
  "lastUpdated": 1700000000
}
```

---

## キャッシュ仕様

キャッシュ時間

```
1時間
```

キャッシュが有効な場合

```
API呼び出しを行わない
```

---

# 8. Twiplaページ処理

Twiplaページロード時に以下を実行する。

### 1. ページ内リンク取得

```
a[href*="x.com/"]
a[href*="twitter.com/"]
```

### 2. username抽出

```
https://x.com/{username}
```

↓

```
username
```

---

### 3. コミュニティ所属判定

```
members.includes(username)
```

---

### 4. ページ表示

所属ユーザーのリンクの後ろにバッジ表示

例

```
@userA   ✔ Community
@userB
@userC   ✔ Community
```

表示仕様

```
色: 緑
文字: ✔ Community
フォント: bold
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
storage
```

---

## host_permissions

```
https://x.com/*
```

---

## content_scripts

対象

```
https://twipla.jp/*
```

---

# 10. ファイル構成

```
x-community-checker/
 ├ manifest.json
 ├ content.js
 ├ communityApi.js
 └ storage.js
```

---

# 11. 処理フロー

```
Twiplaページロード
      ↓
content.js起動
      ↓
コミュニティメンバー取得
      ↓
Twipla内Xリンク検出
      ↓
username抽出
      ↓
コミュニティメンバーと照合
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

# 16. 制約事項

Xの内部GraphQL APIは

```
非公開API
```

のため

```
queryId変更
```

などにより動作が変更される可能性がある。

その場合は拡張の更新が必要となる。

---

# 17. 成功条件

Twiplaイベントページを開いた際に

```
コミュニティ所属ユーザーが自動表示される
```

こと。
