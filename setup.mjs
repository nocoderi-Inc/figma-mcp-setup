#!/usr/bin/env node

import { createInterface } from "node:readline";
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { homedir, platform } from "node:os";
import { execSync } from "node:child_process";

const IS_WIN = platform() === "win32";
const HOME = homedir();
const CLAUDE_DIR = join(HOME, ".claude");
const CLAUDE_MCP = join(CLAUDE_DIR, ".mcp.json");
const CODEX_DIR = join(HOME, ".codex");
const CODEX_CONFIG = join(CODEX_DIR, "config.toml");

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};

function log(msg) { console.log(msg); }
function info(msg) { log(`${COLORS.cyan}[INFO]${COLORS.reset} ${msg}`); }
function success(msg) { log(`${COLORS.green}[OK]${COLORS.reset} ${msg}`); }
function warn(msg) { log(`${COLORS.yellow}[WARN]${COLORS.reset} ${msg}`); }
function error(msg) { log(`${COLORS.red}[ERROR]${COLORS.reset} ${msg}`); }

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function banner() {
  log(`
${COLORS.bold}╔══════════════════════════════════════════╗
║   Figma MCP セットアップツール v1.0.0    ║
║   NocodeRI — Claude Code & Codex 対応    ║
╚══════════════════════════════════════════╝${COLORS.reset}
`);
}

function checkNodeVersion() {
  const [major] = process.versions.node.split(".").map(Number);
  if (major < 18) {
    error(`Node.js v18以上が必要です（現在: v${process.versions.node}）`);
    log("  https://nodejs.org からインストールしてください");
    process.exit(1);
  }
  success(`Node.js v${process.versions.node} を検出`);
}

async function askApiKey(rl) {
  log("");
  info("Figma APIキーが必要です");
  log(`  ${COLORS.dim}取得方法: https://www.figma.com/developers/api#access-tokens${COLORS.reset}`);
  log(`  ${COLORS.dim}Figma > Settings > Account > Personal access tokens > Generate${COLORS.reset}`);
  log("");

  const key = await ask(rl, `${COLORS.bold}Figma APIキーを入力:${COLORS.reset} `);
  if (!key || !key.startsWith("figd_")) {
    warn("APIキーは 'figd_' で始まる文字列です。スキップしますか？");
    const skip = await ask(rl, "スキップする場合は y を入力 (y/N): ");
    if (skip.toLowerCase() !== "y") {
      return askApiKey(rl);
    }
    return null;
  }
  return key;
}

function setEnvVar(key, value) {
  if (IS_WIN) {
    try {
      execSync(`setx ${key} "${value}"`, { stdio: "pipe" });
      success(`環境変数 ${key} を設定（Windows setx）`);
    } catch {
      warn(`setx での設定に失敗。手動で環境変数 ${key} を設定してください`);
    }
  } else {
    const shellRc = join(HOME, ".zshrc");
    const bashRc = join(HOME, ".bashrc");
    const target = existsSync(shellRc) ? shellRc : bashRc;

    if (existsSync(target)) {
      const content = readFileSync(target, "utf-8");
      const exportLine = `export ${key}="${value}"`;

      if (content.includes(`export ${key}=`)) {
        const updated = content.replace(
          new RegExp(`export ${key}=.*`),
          exportLine
        );
        writeFileSync(target, updated);
        success(`${target} の ${key} を更新`);
      } else {
        writeFileSync(target, content.trimEnd() + `\n\n# Figma API\n${exportLine}\n`);
        success(`${target} に ${key} を追加`);
      }
    } else {
      writeFileSync(target, `# Figma API\nexport ${key}="${value}"\n`);
      success(`${target} を作成し ${key} を追加`);
    }
  }
}

async function askToolChoice(rl) {
  log("");
  info("使用するAIツールを選択してください:");
  log("  1) Claude Code のみ");
  log("  2) Codex CLI のみ");
  log("  3) 両方");
  log("");

  const choice = await ask(rl, `${COLORS.bold}番号を入力 (1/2/3):${COLORS.reset} `);

  switch (choice.trim()) {
    case "1": return { claude: true, codex: false };
    case "2": return { claude: false, codex: true };
    case "3": return { claude: true, codex: true };
    default:
      warn("1, 2, または 3 を入力してください");
      return askToolChoice(rl);
  }
}

function setupClaudeCode() {
  log("");
  info("Claude Code の MCP 設定を構成中...");

  if (!existsSync(CLAUDE_DIR)) {
    mkdirSync(CLAUDE_DIR, { recursive: true });
  }

  const templatePath = new URL("./templates/mcp.json", import.meta.url);
  const template = JSON.parse(readFileSync(templatePath, "utf-8"));

  if (existsSync(CLAUDE_MCP)) {
    // バックアップ
    const backupPath = `${CLAUDE_MCP}.bak`;
    copyFileSync(CLAUDE_MCP, backupPath);
    info(`既存設定をバックアップ: ${backupPath}`);

    // マージ
    try {
      const existing = JSON.parse(readFileSync(CLAUDE_MCP, "utf-8"));
      existing.mcpServers = existing.mcpServers || {};
      Object.assign(existing.mcpServers, template.mcpServers);
      writeFileSync(CLAUDE_MCP, JSON.stringify(existing, null, 2) + "\n");
      success("既存の .mcp.json にFigma MCPサーバーをマージ");
    } catch {
      writeFileSync(CLAUDE_MCP, JSON.stringify(template, null, 2) + "\n");
      warn("既存ファイルのパースに失敗。新規作成しました");
    }
  } else {
    writeFileSync(CLAUDE_MCP, JSON.stringify(template, null, 2) + "\n");
    success(`.mcp.json を新規作成: ${CLAUDE_MCP}`);
  }
}

function setupCodex() {
  log("");
  info("Codex CLI の MCP 設定を構成中...");

  if (!existsSync(CODEX_DIR)) {
    mkdirSync(CODEX_DIR, { recursive: true });
  }

  const templatePath = new URL("./templates/codex-mcp.toml", import.meta.url);
  const tomlContent = readFileSync(templatePath, "utf-8");

  if (existsSync(CODEX_CONFIG)) {
    const existing = readFileSync(CODEX_CONFIG, "utf-8");

    if (existing.includes("[mcp_servers.claude-talk-to-figma]")) {
      info("Codex設定にFigma MCPは既に存在。スキップ");
      return;
    }

    // バックアップ
    const backupPath = `${CODEX_CONFIG}.bak`;
    copyFileSync(CODEX_CONFIG, backupPath);
    info(`既存設定をバックアップ: ${backupPath}`);

    writeFileSync(CODEX_CONFIG, existing.trimEnd() + "\n\n" + tomlContent);
    success("既存の config.toml にFigma MCP設定を追記");
  } else {
    writeFileSync(CODEX_CONFIG, tomlContent);
    success(`config.toml を新規作成: ${CODEX_CONFIG}`);
  }
}

function installPlugin() {
  log("");
  info("claude-talk-to-figma-mcp パッケージをインストール中...");

  try {
    execSync("npm install -g claude-talk-to-figma-mcp@latest", {
      stdio: "pipe",
      timeout: 120000,
    });
    success("claude-talk-to-figma-mcp をグローバルインストール完了");
  } catch (e) {
    warn("グローバルインストールに失敗。npx経由で利用可能です");
    log(`  ${COLORS.dim}エラー: ${e.message}${COLORS.reset}`);
  }

  // プラグインのmanifest.jsonパスを特定
  let manifestPath = "";
  try {
    const npmRoot = execSync("npm root -g", { encoding: "utf-8" }).trim();
    manifestPath = join(npmRoot, "claude-talk-to-figma-mcp", "src", "claude_mcp_plugin", "manifest.json");
  } catch {
    manifestPath = join(HOME, "claude-talk-to-figma-mcp", "src", "claude_mcp_plugin", "manifest.json");
  }

  if (!existsSync(manifestPath)) {
    manifestPath = join(HOME, "claude-talk-to-figma-mcp", "src", "claude_mcp_plugin", "manifest.json");
  }

  return manifestPath;
}

function installSkill() {
  log("");
  info("url-to-figma スキルをインストール中...");

  const skillDir = join(HOME, ".claude", "skills", "url-to-figma");
  const skillFile = join(skillDir, "SKILL.md");

  if (existsSync(skillFile)) {
    info("url-to-figma スキルは既にインストール済み。上書きします");
  }

  mkdirSync(skillDir, { recursive: true });

  try {
    const skillSource = new URL("./skills/url-to-figma/SKILL.md", import.meta.url);
    const content = readFileSync(skillSource, "utf-8");
    writeFileSync(skillFile, content);
    success("url-to-figma スキルをインストール完了");
    log(`  ${COLORS.dim}使い方: Claude Codeで「このURLをFigma化して: https://...」${COLORS.reset}`);
  } catch (e) {
    warn("スキルのインストールに失敗");
    log(`  ${COLORS.dim}手動コピー: skills/url-to-figma/SKILL.md → ~/.claude/skills/url-to-figma/SKILL.md${COLORS.reset}`);
  }
}

function showPluginInstructions(manifestPath) {
  log("");
  log(`${COLORS.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  log(`${COLORS.bold}  Figma プラグインのインポート（手動）${COLORS.reset}`);
  log(`${COLORS.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  log("");
  log("  以下の手順でFigmaプラグインをインポートしてください:");
  log("");
  log("  1. Figma Desktop を開く");
  log("  2. Menu > Plugins > Development > Import plugin from manifest");
  log(`  3. 以下のファイルを選択:`);
  log(`     ${COLORS.cyan}${manifestPath}${COLORS.reset}`);
  log("");
  log(`  ${COLORS.dim}※ この手順は1回だけ必要です${COLORS.reset}`);
}

function showDailyUsage() {
  log("");
  log(`${COLORS.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  log(`${COLORS.bold}  毎日の使い方${COLORS.reset}`);
  log(`${COLORS.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  log("");
  log("  Step 1: WebSocketサーバーを起動");
  log(`    ${COLORS.cyan}npx -p claude-talk-to-figma-mcp@latest claude-talk-to-figma-mcp-socket${COLORS.reset}`);
  log("");
  log("  Step 2: Figma Desktop でプラグインを起動");
  log("    Menu > Plugins > Development > Claude Talk to Figma Plugin");
  log("    → チャンネルID（緑のボックス内）をコピー");
  log("");
  log("  Step 3: AIツールで接続");
  log(`    ${COLORS.dim}Claude Code:${COLORS.reset} 「Figmaに接続して、チャンネル: xxxxx」`);
  log(`    ${COLORS.dim}Codex CLI:${COLORS.reset}   「Connect to Figma, channel: xxxxx」`);
  log("");
  log(`  ${COLORS.green}フレーム作成、テキスト追加、色変更、Auto Layout...${COLORS.reset}`);
  log(`  ${COLORS.green}すべてAIから直接操作できます！${COLORS.reset}`);
}

async function main() {
  banner();
  checkNodeVersion();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // 1. APIキー
    const apiKey = await askApiKey(rl);
    if (apiKey) {
      setEnvVar("FIGMA_API_KEY", apiKey);
    } else {
      warn("APIキーをスキップ。後で ~/.zshrc (macOS) または setx (Windows) で設定してください");
    }

    // 2. AIツール選択
    const tools = await askToolChoice(rl);

    // 3. 設定ファイル生成
    if (tools.claude) setupClaudeCode();
    if (tools.codex) setupCodex();

    // 4. プラグインインストール
    const manifestPath = installPlugin();

    // 5. スキルインストール（Claude Code選択時のみ）
    if (tools.claude) installSkill();

    // 6. 手順表示
    showPluginInstructions(manifestPath);
    showDailyUsage();

    log("");
    log(`${COLORS.green}${COLORS.bold}セットアップ完了！${COLORS.reset}`);
    log(`${COLORS.dim}ターミナルを再起動して環境変数を反映してください${COLORS.reset}`);
    log("");
  } finally {
    rl.close();
  }
}

main().catch((e) => {
  error(e.message);
  process.exit(1);
});
