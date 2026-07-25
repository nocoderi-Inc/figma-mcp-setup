---
name: url-to-figma
description: URLや画像からFigmaデザインを生成。URLならcomputed styles抽出でピクセルパーフェクト変換、画像なら視覚解釈で再現。
---

# URL / 画像 → Figma 変換スキル

WebページのURLや画像ファイルを受け取り、Figmaデザインに変換するスキル。

## 前提条件

このスキルを実行する前に、以下を確認すること:

1. **Figma MCPに接続済み**であること（`join_channel` でチャンネルIDに接続）
2. **Chrome MCP**が利用可能であること（URL変換の場合）

接続していない場合は、ユーザーに以下を案内:
- WebSocketサーバー起動: `npx -p claude-talk-to-figma-mcp@latest claude-talk-to-figma-mcp-socket`
- Figma Desktopでプラグイン起動 → チャンネルIDをコピー
- `join_channel` で接続

## 入力判定

ユーザーの入力を分析し、以下のモードを自動選択する:

| 入力 | モード | 判定基準 |
|------|--------|---------|
| URL（http/https） | **DOM抽出モード** | `https?://` で始まる文字列 |
| 画像ファイルパス + 「配置して」 | **画像配置モード** | ファイル拡張子が .png/.jpg/.jpeg/.gif/.webp/.svg |
| 画像ファイルパス + 「再現して」「作って」 | **画像再現モード** | 画像パス + デザイン再現を示す動詞 |
| HTML文字列 | **DOM抽出モード** | `<` で始まるHTMLマークアップ |

判断に迷う場合はユーザーに確認する。

---

## モード1: DOM抽出モード（URL → Figma）

### 概要

Webページの全要素のcomputed stylesを機械的に抽出し、Figmaノードに1:1マッピングする。
トークン効率が良く、ピクセルパーフェクトに近い精度が出る。

### 手順

#### Step 1: Chrome MCPでページにアクセス

chrome MCP スキルを最初に呼び出すこと（`Skill tool with skill: "claude-in-chrome"`）。

3つのビューポートサイズで順番に処理する: **375px（Mobile）, 768px（Tablet）, 1024px（Desktop）**

各サイズについて:

```
1. mcp__claude-in-chrome__resize_window でブラウザサイズを変更
   - width: 375 / 768 / 1024
   - height: 900

2. mcp__claude-in-chrome__navigate でURLにアクセス
   - ページが完全にロードされるまで待機

3. mcp__claude-in-chrome__computer でスクリーンショットを取得
   - action: "screenshot"
   - 結果を参照画像として保持
```

#### Step 2: DOM Walker でcomputed styles抽出

`mcp__claude-in-chrome__javascript_tool` で以下のスクリプトを実行:

```javascript
(function() {
  const MAX_DEPTH = 10;
  const MIN_SIZE = 2;

  function parseColor(c) {
    if (!c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)') return null;
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null;
    return { r: +m[1]/255, g: +m[2]/255, b: +m[3]/255 };
  }

  function parsePx(v) {
    if (!v) return 0;
    const n = parseFloat(v);
    return isNaN(n) ? 0 : Math.round(n);
  }

  function parseShadow(s) {
    if (!s || s === 'none') return null;
    const m = s.match(/rgba?\([^)]+\)\s+(-?\d+)px\s+(-?\d+)px\s+(-?\d+)px/);
    if (!m) return null;
    const cm = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    return {
      x: +m[1], y: +m[2], blur: +m[3],
      color: cm ? { r: +cm[1]/255, g: +cm[2]/255, b: +cm[3]/255, a: cm[4] ? +cm[4] : 1 } : null
    };
  }

  function extract(el, depth) {
    if (depth > MAX_DEPTH) return [];
    const results = [];
    const children = el.children;
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      const tag = node.tagName;
      if (['SCRIPT','STYLE','NOSCRIPT','META','LINK','BR','WBR'].includes(tag)) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) continue;
      const s = getComputedStyle(node);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') continue;

      const bg = parseColor(s.backgroundColor);
      const color = parseColor(s.color);
      const shadow = parseShadow(s.boxShadow);
      const borderW = parsePx(s.borderWidth);
      const borderColor = borderW > 0 ? parseColor(s.borderColor) : null;
      const radius = parsePx(s.borderRadius);
      const isImg = tag === 'IMG';
      const isFlex = s.display === 'flex' || s.display === 'inline-flex';

      let text = null;
      for (let j = 0; j < node.childNodes.length; j++) {
        if (node.childNodes[j].nodeType === 3 && node.childNodes[j].textContent.trim()) {
          text = (text || '') + node.childNodes[j].textContent.trim() + ' ';
        }
      }
      if (text) text = text.trim();

      const entry = {
        tag,
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      };

      if (text) entry.text = text;
      if (bg) entry.bg = bg;
      if (color) entry.color = color;
      if (s.fontSize) entry.fontSize = parsePx(s.fontSize);
      if (s.fontWeight && s.fontWeight !== '400') entry.fontWeight = s.fontWeight;
      if (s.fontFamily) entry.fontFamily = s.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      if (s.textAlign && s.textAlign !== 'start') entry.textAlign = s.textAlign;
      if (s.lineHeight && s.lineHeight !== 'normal') entry.lineH = parsePx(s.lineHeight);
      if (radius > 0) entry.radius = radius;
      if (borderW > 0 && borderColor) { entry.borderW = borderW; entry.borderColor = borderColor; }
      if (shadow) entry.shadow = shadow;
      if (parsePx(s.opacity) < 1) entry.opacity = parseFloat(s.opacity);
      if (isFlex) {
        entry.flex = {
          dir: s.flexDirection === 'column' ? 'V' : 'H',
          gap: parsePx(s.gap),
          align: s.alignItems,
          justify: s.justifyContent,
        };
      }
      if (s.paddingTop || s.paddingRight || s.paddingBottom || s.paddingLeft) {
        const pt = parsePx(s.paddingTop), pr = parsePx(s.paddingRight);
        const pb = parsePx(s.paddingBottom), pl = parsePx(s.paddingLeft);
        if (pt || pr || pb || pl) entry.pad = { t: pt, r: pr, b: pb, l: pl };
      }
      if (isImg) entry.imgSrc = node.src || node.currentSrc;
      if (s.backgroundImage && s.backgroundImage !== 'none') entry.bgImg = true;
      if (s.overflow === 'hidden') entry.clip = true;

      const childNodes = extract(node, depth + 1);
      if (childNodes.length > 0) entry.children = childNodes;

      results.push(entry);
    }
    return results;
  }

  return JSON.stringify(extract(document.body, 0));
})()
```

#### Step 3: JSONからFigmaノードを生成

抽出したJSONを使い、以下のルールで**機械的に**Figmaノードを生成する。
Claudeが「解釈」するのではなく、マッピングテーブルに従って変換すること。

**最初にルートフレームを作成:**
```
get_pages → 最初のページIDを取得
create_frame(name: "Mobile 375 - {domain}", x: 0, y: 0, w: 375, h: ページ高さ, parentId: pageId)
※ 768は x: 500, 1024は x: 1100 にオフセットして並べる
```

**各要素のマッピング:**

1. **コンテナ要素（div, section, nav, header, footer, main, article, ul, ol, li, form）:**
   ```
   create_frame(x, y, w, h, parentId, fillColor: bg)
   → flex がある場合: set_auto_layout(layoutMode: flex.dir === 'V' ? 'VERTICAL' : 'HORIZONTAL', itemSpacing: flex.gap, paddingTop/Right/Bottom/Left: pad)
   → radius がある場合: set_corner_radius(radius)
   → borderW がある場合: set_stroke_color(borderColor) — strokeWeight は borderW
   → shadow がある場合: set_effects([{type: 'DROP_SHADOW', offsetX: shadow.x, offsetY: shadow.y, radius: shadow.blur, color: shadow.color}])
   → clip がある場合: clipsContent = true（set_auto_layout の一部として）
   ```

2. **テキスト要素（text プロパティがある要素）:**
   ```
   create_text(text, x, y, fontSize, parentId)
   → set_font_name(fontFamily, fontWeightToStyle(fontWeight))
   → set_font_size(fontSize)
   → set_fill_color(color)  ※テキストの色
   → textAlign がある場合: set_text_align(textAlign)
   → lineH がある場合: set_line_height(lineH)
   ```

3. **画像要素（imgSrc がある、または bgImg === true）:**
   ```
   create_rectangle(x, y, w, h, parentId)
   → imgSrc がある場合: set_image_fill(nodeId, imgSrc, "url")
   → bgImg の場合: スクリーンショットから該当領域を切り出してbase64で配置
     （切り出しが困難な場合、要素のスクショを個別に取得）
   → radius がある場合: set_corner_radius(radius)
   ```

4. **その他の可視要素（bg があるがテキストなし）:**
   ```
   create_rectangle(x, y, w, h, parentId, fillColor: bg)
   → radius, border, shadow を同様に適用
   ```

**fontWeight → Figma style 変換表:**
| fontWeight | style |
|-----------|-------|
| 100 | Thin |
| 200 | Extra Light |
| 300 | Light |
| 400 | Regular |
| 500 | Medium |
| 600 | Semi Bold |
| 700 | Bold |
| 800 | Extra Bold |
| 900 | Black |

**座標の扱い:**
- DOM Walker が返す x, y はビューポート相対
- Figma のルートフレーム内に配置するため、ルートフレームの x, y をオフセットとして引く
- 子要素は親要素相対の座標に変換（parent.x を引く）

#### Step 4: 参照スクリーンショットを配置

各サイズのスクショを、生成したフレームの右隣に参照画像として配置:
```
create_rectangle(ルートフレームの右 + 50, y, w, h, pageId, name: "Reference - Mobile")
→ スクショをbase64でset_image_fill
```

### 大規模ページの対応

要素数が200を超える場合:
1. まずトップレベルの要素だけ処理（depth 1-2）
2. 主要セクションごとに分割して処理
3. ユーザーに「全体のうちどのセクションを詳細化しますか？」と確認

---

## モード2: 画像配置モード

### 手順

1. ファイルパスを受け取る
2. Bash で base64 エンコード:
   ```bash
   # macOS
   base64 -i /path/to/image.png
   # Linux
   base64 /path/to/image.png
   ```
3. 画像サイズを取得:
   ```bash
   # macOS (sips)
   sips -g pixelWidth -g pixelHeight /path/to/image.png
   # または file コマンド / identify コマンド
   ```
4. Figma に配置:
   ```
   get_pages → pageId
   create_frame(name: "画像名", x: 0, y: 0, w: 画像幅, h: 画像高, parentId: pageId)
   set_image_fill(frameId, base64data, "base64", "FILL")
   ```

---

## モード3: 画像再現モード

### 手順

1. 画像ファイルを Read ツールで読み込む（Claude の multimodal で視覚的に解析）
2. UI構造を解釈:
   - レイアウト構造（ヘッダー、サイド、メイン、フッター等）
   - 色使い（背景色、テキスト色、アクセント色）
   - タイポグラフィ（サイズ、ウェイトの階層）
   - コンポーネント（ボタン、カード、リスト等）
3. Figma MCP で再構築:
   - まず大枠のフレーム構造を作成
   - 次にセクションごとにコンポーネントを配置
   - 色・フォント・余白を設定
4. 元画像を隣に配置して比較できるようにする:
   ```
   create_frame(name: "Reference", x: 元フレームの右 + 50, ...)
   set_image_fill(base64 of original image)
   ```

### 精度について

このモードは Approach A（Claude解釈）のため、ピクセルパーフェクトではない。
レイアウト構造と色は概ね再現できるが、細かいスペーシングやフォントは近似になる。
ユーザーには「概ね80%程度の再現度です。微調整が必要な箇所があれば指示してください」と伝えること。

---

## エラーハンドリング

| エラー | 対応 |
|--------|------|
| Figma未接続 | `join_channel` を案内 |
| Chrome MCP未利用 | `claude-in-chrome` スキルの呼び出しを案内 |
| ページロード失敗 | URLの確認を依頼、タイムアウト時はリトライ |
| DOM Walker の JSON が巨大 | depth を下げて再実行、またはセクション分割 |
| フォントがFigmaにない | 最も近いシステムフォントで代替、ユーザーに通知 |
| 画像のCORS制限 | base64フォールバック（スクショから切り出し） |
