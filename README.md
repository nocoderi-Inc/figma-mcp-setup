# Figma MCP セットアップツール

Claude Code / Codex CLI から Figma のデザインを直接作成・編集できるようにするワンコマンドセットアップツール。

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
| Node.js v18以上 | https://nodejs.org |
| Figma Desktop | https://www.figma.com/downloads/ |
| Claude Code or Codex CLI | 社内配布手順に従う |
| Figma APIキー | 下記の取得手順を参照 |

### Figma APIキーの取得

1. https://www.figma.com/developers/api#access-tokens を開く
2. 「Generate new token」をクリック
3. トークン名を入力（例: `mcp-setup`）
4. 生成された `figd_xxxx...` をコピー

## セットアップ（1回だけ）

```bash
npx @nocoderi/figma-mcp-setup
```

対話式で以下を設定します：
1. Figma APIキーの入力
2. AIツールの選択（Claude Code / Codex / 両方）
3. 設定ファイルの自動生成
4. Figmaプラグインのインポート手順の表示

### Figmaプラグインのインポート

セットアップスクリプト完了後、Figma Desktopで以下を実行：

1. **Menu** > **Plugins** > **Development** > **Import plugin from manifest**
2. 表示されたパスの `manifest.json` を選択

> この手順は1回だけ必要です。以後は「最近使ったプラグイン」から起動できます。

## 毎日の使い方

### Step 1: WebSocketサーバーを起動

```bash
npx figma-mcp-start
```

`Claude to Figma WebSocket server running on port 3055` と表示されればOK。

バックグラウンドで起動する場合：
```bash
npx figma-mcp-start --bg      # バックグラウンド起動
npx figma-mcp-start --status   # 状態確認
npx figma-mcp-start --stop     # 停止
```

### Step 2: Figmaプラグインを起動

1. Figma Desktop でデザインファイルを開く
2. **Menu** > **Plugins** > **Development** > **Claude Talk to Figma Plugin**
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

1. WebSocketサーバーが起動しているか確認: `npx figma-mcp-start --status`
2. Figmaプラグインを再起動して新しいチャンネルIDを取得
3. ファイアウォールが localhost:3055 をブロックしていないか確認

### 「FIGMA_API_KEY が設定されていない」と表示される

```bash
# macOS: ターミナルを再起動するか、以下を実行
source ~/.zshrc

# Windows: ターミナルを再起動
```

### セットアップをやり直したい

```bash
npx @nocoderi/figma-mcp-setup
```

何度実行しても安全です（既存設定はバックアップされます）。

## 対応環境

| 項目 | 対応 |
|------|------|
| macOS | ✅ |
| Windows | ✅ |
| Claude Code | ✅ |
| Codex CLI | ✅ |
| Figma 無料プラン | ✅（Dev Mode不要） |

## 制約事項

- Figmaプラグインは手動で起動する必要があります（バックグラウンド常駐不可）
- プラグインを閉じるとWebSocket接続が切れます
- 大量のノード作成（数百以上）ではパフォーマンスが低下する場合があります
