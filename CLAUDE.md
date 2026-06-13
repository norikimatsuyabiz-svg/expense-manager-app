# CLAUDE.md — 経費管理アプリ 開発ガイド

## 1. 技術スタック

| 要素 | 内容 |
|---|---|
| マークアップ | HTML5 |
| スクリプト | Vanilla JavaScript（ES2020+、フレームワークなし） |
| スタイル | Tailwind CSS（CDN読み込み）+ styles.css（カスタムスタイル） |
| 永続化 | `localStorage`（`expense-records` キー） |
| ビルド | なし（ビルドツール・npm 一切不使用） |
| サーバー | なし（ブラウザで直接 index.html を開くだけで動作） |

---

## 2. ディレクトリ構成

```
経費管理/
├── index.html   # HTMLシェル。レイアウト骨格、CDN読み込み、pane要素の定義
├── app.js       # アプリケーションロジック全体（IIFE で包む）
├── styles.css   # Tailwindで対応できないカスタムスタイル（スクロールバー等）
├── CLAUDE.md    # このファイル
└── spec.md      # 仕様書
```

### 各ファイルの責務

- **index.html**: 構造のみ。`<script>` と `<link>` の読み込み、左ペイン・右ペインのコンテナ定義。ロジックは書かない。
- **app.js**: データ操作（CRUD）・DOM操作・イベント登録・画面切替をすべてここに書く。IIFE で囲んでグローバル汚染を防ぐ。
- **styles.css**: Tailwind CDN で補えない細かいスタイル（カスタムスクロールバー、ハイライトアニメーション等）のみ。

---

## 3. コーディング規約

### 画面切替

右ペインは以下の3つの `id` を持つ要素を `hidden` クラスで切り替える。同時に2つ以上を表示しない。

| ID | 表示タイミング |
|---|---|
| `pane-empty` | 起動時・削除後・ESCキー |
| `pane-detail` | カードクリック・保存後 |
| `pane-form` | 新規登録ボタン・編集ボタン |

切替は必ず `showPane(paneName)` 関数1本を通して行う。直接 `hidden` を付け外しする処理を各所に書かない。

### ID命名規則

| 種別 | 規則 | 例 |
|---|---|---|
| ペイン要素 | `pane-*` | `pane-empty`, `pane-detail`, `pane-form` |
| 静的UI要素 | `kebab-case` | `search-box`, `expense-list`, `summary-total` |
| フォーム入力 | `field-*` | `field-date`, `field-amount`, `field-category` |
| ボタン | `btn-*` | `btn-new`, `btn-save`, `btn-delete`, `btn-edit` |

### 関数の長さ

- **1関数は50行以内**を目安とする。超える場合は責務を分割する。
- 純粋関数（データ変換・バリデーション）とDOM操作関数を混在させない。

### 変数宣言

- `const` を優先する。再代入が必要な場合のみ `let` を使う。
- `var` は使用禁止。

### グローバル汚染禁止

`app.js` のすべてのコードを即時実行関数（IIFE）で包む。

```js
(function () {
  'use strict';
  // すべてのコード
})();
```

### コメント方針

- **なぜそう書いたか（WHY）** が非自明な場合のみ書く。
- 関数名・変数名で自明な内容のコメントは書かない。
- セクション区切りに `// --- セクション名 ---` スタイルの1行コメントは許容する。

---

## 4. データ構造

### 経費1件のオブジェクト

```js
{
  id:        string,   // "exp_" + Date.now() で自動生成
  date:      string,   // "YYYY-MM-DD"（経費発生日）
  category:  string,   // 下記カテゴリ定数のいずれか
  amount:    number,   // 正の整数（0円不可）
  memo:      string,   // 空文字列可
  status:    string,   // "pending" | "settled"
  createdAt: string,   // ISO 8601文字列（new Date().toISOString()）
}
```

### カテゴリ定数

```js
const CATEGORIES = ['交通費', '会議費', '接待費', '消耗品', '通信費', 'その他'];
```

### localStorage

- **キー**: `expense-records`
- **形式**: 経費オブジェクトの配列を `JSON.stringify` した文字列
- **読み書き**: 必ず `loadRecords()` / `saveRecords(records)` を通して行う（直接 `localStorage.setItem` を各所に書かない）

---

## 5. デザイン規約

### 配色

| 用途 | 値 |
|---|---|
| アクセントカラー | `#c15f3c`（Claudeオレンジ） |
| 背景 | `white` / `gray-50` |
| テキスト（主） | `gray-800` |
| テキスト（副） | `gray-500` |

### ステータスバッジ

| ステータス | Tailwindクラス |
|---|---|
| 申請中（pending） | `bg-amber-100 text-amber-700` |
| 精算済（settled） | `bg-green-100 text-green-700` |

### フォント

```css
font-family: "游ゴシック", "Yu Gothic", "游ゴシック体", sans-serif;
```

### レイアウト・サイズ

- 左ペイン: 幅 `380px` 固定、高さ `100vh`、縦スクロール可
- 右ペイン: `flex-1`、高さ `100vh`、縦スクロール可
- PC表示のみ。モバイルBreakpoint対応は不要。

### 角丸・影

- 角丸: `rounded-lg`（8px）で統一
- 影: `shadow-sm` を基本。強調が必要な場面でも `shadow-md` どまり

### ボタンスタイル

| 種別 | スタイル |
|---|---|
| 主アクション（新規・保存） | `bg-[#c15f3c] text-white rounded-lg px-4 py-2` |
| 副アクション（編集・ステータス切替） | `border border-gray-300 text-gray-700 rounded-lg px-4 py-2` |
| 危険アクション（削除） | `text-red-600 border border-red-300 rounded-lg px-4 py-2` |

---

## 6. やってはいけないこと

| 禁止事項 | 理由 |
|---|---|
| `npm install` / `package.json` の作成 | ビルド環境不要。ブラウザで直接開くだけで動作する設計 |
| webpack / Vite / Parcel 等ビルドツールの導入 | 同上 |
| `<script type="module">` + import/export | ローカルファイルのCORSエラーを招くため。すべてIIFE1ファイルで完結させる |
| サーバーサイドコード（Node.js / Python 等） | 技術制約のため |
| 外部APIの呼び出し（fetch / XHR） | 技術制約のため。データはlocalStorageのみ |
| React / Vue / Alpine 等のUIフレームワーク | 技術制約（Vanilla JS のみ）のため |
| グローバルスコープへの変数・関数の露出 | IIFE で囲み、`window.*` に代入しない |
| `var` の使用 | `const` / `let` を使う |
| 1関数50行超の実装 | 責務を分割してテスタビリティを保つ |
