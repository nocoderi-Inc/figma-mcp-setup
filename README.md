# Figma MCP セットアップツール

Claude Code / Codex CLI から Figma のデザインを直接作成・編集できるようにするセットアップツール。

## これは何？

AIエージェント（Claude Code, Codex CLI）からFigmaに接続し、以下の操作を実行できます：

- フレーム・テキスト・図形の**作成**
- 色・フォント・Auto Layout の**変更**
- ノードの移動・リサイズ・**削除**
- コンポーネントの活用・デザイン分析

```
AIエージェント → MCP Server → WebSocket → Figmaプラグイン → デザイン操作
```

## 必要なもの

| 項目 | 入手先 |
|------|--------|
| Node.js v18以上 | 下記のインストール手順を参照 |
| Figma Desktop | https://www.figma.com/downloads/ |
| Claude Code or Codex CLI | 社内配布手順に従う |
| Figma APIキー | 下記の取得手順を参照 |

### Node.js のインストール

Node.js が未インストールの場合、以下の手順でインストールしてください。

**macOS:**
1. https://nodejs.org を開く
2. 「LTS（推奨版）」のボタンをクリックしてダウンロード
3. ダウンロードした `.pkg` ファイルをダブルクリックしてインストール
4. ターミナルを開いて `node --version` と入力し、バージョンが表示されればOK

**Windows:**
1. https://nodejs.org を開く
2. 「LTS（推奨版）」のボタンをクリックしてダウンロード
3. ダウンロードした `.msi` ファイルをダブルクリックしてインストール（設定はすべてデフォルトでOK）
4. コマンドプロンプトまたはPowerShellを開いて `node --version` と入力し、バージョンが表示されればOK

### ターミナルの開き方

**macOS:** Spotlight（Cmd + Space）で「ターミナル」と検索して開く
**Windows:** スタートメニューで「PowerShell」と検索して開く

### Figma APIキーの取得

1. Figma にログインした状態で https://www.figma.com/developers/api#access-tokens を開く
2. 「Personal access tokens」セクションの「Generate new token」をクリック
3. トークン名を入力（例: `mcp-setup`）
4. 「Generate token」をクリック
5. 表示された `figd_xxxx...` で始まる文字列をコピー（**このページを閉じると二度と表示されません**）

## セットアップ（1回だけ）

ターミナル（macOS）またはPowerShell（Windows）を開いて、以下をコピペして Enter：

```bash
npx github:nocoderi-Inc/figma-mcp-setup
```

対話式で以下を聞かれます：
1. **Figma APIキー** → 上で取得した `figd_xxxx...` を貼り付け
2. **AIツールの選択** → 番号を入力（1: Claude Code / 2: Codex / 3: 両方）
3. 設定ファイルが自動生成されます

### Figmaプラグインのインポート

セットアップ完了時に表示される `manifest.json` のパスを使って：

1. **Figma Desktop** を開く
2. 左上の **Figma メニュー** > **Plugins** > **Development** > **Import plugin from manifest...**
3. 表示されたパスの `manifest.json` ファイルを選択

> この手順は1回だけ必要です。以後は「最近使ったプラグイン」から起動できます。

## 毎日の使い方

### Step 1: WebSocketサーバーを起動

ターミナルで以下を実行：

```bash
npx -p claude-talk-to-figma-mcp@latest claude-talk-to-figma-mcp-socket
```

`Claude to Figma WebSocket server running on port 3055` と表示されればOK。

> このターミナルは**開いたまま**にしておいてください（閉じるとサーバーが止まります）。

### Step 2: Figmaプラグインを起動

1. Figma Desktop でデザインファイルを開く
2. 右クリック > **Plugins** > **Development** > **Claude Talk to Figma Plugin**
3. 表示される**チャンネルID**（緑のボックス内の太字コード）をコピー

### Step 3: AIから接続

**Claude Code の場合：**
```
Figmaに接続して、チャンネルID: abc123
```

**Codex CLI の場合：**
```
Connect to Figma, channel: abc123
```

接続完了後、自然言語でデザイン操作を指示できます。

## できること一覧

### 作成（Create）
| 操作 | 説明 |
|------|------|
| `create_frame` | レイアウトコンテナ |
| `create_rectangle` | 矩形（ボタン、背景等） |
| `create_text` | テキスト要素 |
| `create_ellipse` | 円・楕円 |
| `create_polygon` | 多角形 |
| `create_star` | 星形 |
| `create_page` | 新規ページ |
| `clone_node` | ノード複製 |
| `group_nodes` | グループ化 |

### 更新（Update）
| 操作 | 説明 |
|------|------|
| `set_fill_color` | 塗りの色 |
| `set_stroke_color` | 線の色 |
| `set_corner_radius` | 角丸 |
| `set_auto_layout` | Auto Layout |
| `set_effects` | シャドウ・ブラー |
| `move_node` | 位置変更 |
| `resize_node` | サイズ変更 |
| `set_text_content` | テキスト内容 |
| `set_font_name` | フォント |
| `set_font_size` | フォントサイズ |
| `set_image_fill` | 画像の適用 |

### 読み取り（Read）
| 操作 | 説明 |
|------|------|
| `get_document_info` | ドキュメント情報 |
| `get_selection` | 選択中の要素 |
| `get_node_info` | 要素の詳細 |
| `scan_text_nodes` | テキスト一覧 |
| `get_styles` | スタイル一覧 |
| `export_node_as_image` | 画像エクスポート |

### 削除（Delete）
| 操作 | 説明 |
|------|------|
| `delete_node` | ノード削除 |
| `delete_page` | ページ削除 |

## プロンプト例

```
「ダッシュボードのUIを作って。サイドナビ、ヘッダー、メトリクスカード4枚」

「選択中のボタンの色を #E63946 に変更して、角丸を8pxに」

「ドキュメント内の全テキストのコントラスト比を確認して」

「チームライブラリからButtonコンポーネントを配置して」
```

## トラブルシューティング

### 「node: command not found」と表示される

Node.js がインストールされていません。上記の「Node.js のインストール」手順に従ってください。

### WebSocketサーバーが起動しない

```bash
# Node.jsのバージョン確認
node --version  # v18以上が必要

# ポート3055が使用中か確認
# macOS:
lsof -i :3055
# Windows:
netstat -ano | findstr :3055
```

### プラグインが接続できない

1. WebSocketサーバーが起動しているか確認（ターミナルに `running on port 3055` と表示されているか）
2. Figmaプラグインを一度閉じて再起動し、新しいチャンネルIDを取得
3. ファイアウォールが localhost:3055 をブロックしていないか確認

### 「FIGMA_API_KEY が設定されていない」と表示される

```bash
# macOS: ターミナルを再起動するか、以下を実行
source ~/.zshrc

# Windows: ターミナル（PowerShell）を再起動
```

### セットアップをやり直したい

```bash
npx github:nocoderi-Inc/figma-mcp-setup
```

何度実行しても安全です（既存設定はバックアップされます）。

## 対応環境

| 項目 | 対応 |
|------|------|
| macOS | OK |
| Windows | OK |
| Claude Code | OK |
| Codex CLI | OK |
| Figma 無料プラン | OK（Dev Mode不要） |

## 制約事項

- Figmaプラグインは手動で起動する必要があります（バックグラウンド常駐不可）
- プラグインを閉じるとWebSocket接続が切れます
- WebSocketサーバーのターミナルを閉じると接続が切れます
- 大量のノード作成（数百以上）ではパフォーマンスが低下する場合があります
