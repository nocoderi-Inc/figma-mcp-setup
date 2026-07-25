# Changelog

バージョン管理は [Semantic Versioning](https://semver.org/lang/ja/) に準拠します。

## バージョンの読み方

`v1.2.3` の場合：
- **1** (メジャー) — 互換性のない大きな変更（社員に再セットアップを依頼する必要あり）
- **2** (マイナー) — 新機能の追加（既存ユーザーへの影響なし）
- **3** (パッチ) — バグ修正・ドキュメント改善

## バージョンアップの手順

```bash
# 1. package.json の version を更新
# 2. CHANGELOG.md にリリースノートを追記
# 3. コミット & タグ作成
git add -A
git commit -m "release: v1.1.0 — 新機能の説明"
git tag v1.1.0
git push && git push --tags
```

タグを作ると GitHub の [Releases](https://github.com/nocoderi-Inc/figma-mcp-setup/releases) ページに表示されます。

---

## [1.1.0] - 2026-07-26

### 新機能: url-to-figma スキル

- **URL → Figma変換**: Webページのcomputed stylesを機械抽出し、ほぼピクセルパーフェクトにFigmaデザインを生成
  - 3サイズ自動生成（375px / 768px / 1024px）
  - CSS→Figmaプロパティの機械的マッピング（色、フォント、Auto Layout、shadow等）
- **画像 → Figma配置**: ローカル画像をbase64経由でFigmaに直接配置
- **画像 → デザイン再現**: スクリーンショットからClaude視覚解釈でUI再構築
- セットアップ時にスキルを `~/.claude/skills/url-to-figma/` に自動インストール

## [1.0.0] - 2026-07-25

### 初回リリース

- 対話式セットアップスクリプト（`setup.mjs`）
- WebSocketサーバー起動スクリプト（`start.mjs`）
- Claude Code（`.mcp.json`）設定の自動生成
- Codex CLI（`config.toml`）設定の自動生成
- macOS / Windows クロスプラットフォーム対応
- 日本語README・トラブルシューティング
