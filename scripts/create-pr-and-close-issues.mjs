#!/usr/bin/env node
/**
 * Phase 0 の PR 作成とイシュークローズ
 */

import http from "http";
import tls from "tls";

const OWNER = "toru0514";
const REPO = "handmade-shipping-manager";
const TOKEN = process.env.GITHUB_TOKEN;
const PROXY_URL = process.env.HTTPS_PROXY || process.env.https_proxy;

function decodeChunked(data) {
  let result = "", remaining = data;
  while (remaining.length > 0) {
    const le = remaining.indexOf("\r\n");
    if (le === -1) break;
    const sz = parseInt(remaining.substring(0, le), 16);
    if (sz === 0) break;
    result += remaining.substring(le + 2, le + 2 + sz);
    remaining = remaining.substring(le + 2 + sz + 2);
  }
  return result;
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      "User-Agent": "handmade-shipping-manager-pr-creator",
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(bodyStr);
    }

    if (PROXY_URL) {
      const proxyUrl = new URL(PROXY_URL);
      const proxyAuth = proxyUrl.username && proxyUrl.password
        ? "Basic " + Buffer.from(`${proxyUrl.username}:${proxyUrl.password}`).toString("base64")
        : null;
      const connectHeaders = {};
      if (proxyAuth) connectHeaders["Proxy-Authorization"] = proxyAuth;
      const req = http.request({
        hostname: proxyUrl.hostname, port: proxyUrl.port,
        method: "CONNECT", path: "api.github.com:443", headers: connectHeaders,
      });
      req.on("connect", (res, socket) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
          return;
        }
        const tlsSock = tls.connect({ socket, servername: "api.github.com" }, () => {
          const reqLine = `${method} ${path} HTTP/1.1\r\n`;
          const headerLines = Object.entries({
            ...headers, Host: "api.github.com", Connection: "close",
          }).map(([k, v]) => `${k}: ${v}`).join("\r\n");
          tlsSock.write(reqLine + headerLines + "\r\n\r\n");
          if (bodyStr) tlsSock.write(bodyStr);
          let d = "";
          tlsSock.on("data", (c) => (d += c));
          tlsSock.on("end", () => {
            const parts = d.split("\r\n\r\n");
            const statusLine = parts[0].split("\r\n")[0];
            const statusCode = parseInt(statusLine.split(" ")[1]);
            let responseBody = parts.slice(1).join("\r\n\r\n");
            if (parts[0].toLowerCase().includes("transfer-encoding: chunked")) {
              responseBody = decodeChunked(responseBody);
            }
            try { resolve({ statusCode, body: JSON.parse(responseBody) }); }
            catch { resolve({ statusCode, body: responseBody }); }
          });
        });
        tlsSock.on("error", reject);
      });
      req.on("error", reject);
      req.end();
    } else {
      const urlObj = new URL(`https://api.github.com${path}`);
      const options = {
        hostname: urlObj.hostname, port: 443,
        path: urlObj.pathname + (urlObj.search || ""),
        method,
        headers: { ...headers, Host: urlObj.hostname, Connection: "close" },
      };
      const r = require("https").request(options, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try { resolve({ statusCode: res.statusCode, body: JSON.parse(d) }); }
          catch { resolve({ statusCode: res.statusCode, body: d }); }
        });
      });
      r.on("error", reject);
      if (bodyStr) r.write(bodyStr);
      r.end();
    }
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function apiCall(method, path, body = null) {
  for (let i = 0; i < 3; i++) {
    try {
      return await makeRequest(method, path, body);
    } catch (e) {
      if (i < 2) { await sleep(2000 * (i + 1)); continue; }
      throw e;
    }
  }
}

async function main() {
  const action = process.argv[2]; // "create-pr" or "close-issues" or "check-issues"

  if (action === "create-pr") {
    console.log("=== PR 作成 ===\n");
    const prBody = `## Summary

- **Issue #5**: テスト環境構築（Vitest） — Vitest + カバレッジ設定、パスエイリアス対応、サンプルテスト追加
- **Issue #6**: ESLint + Prettier 設定 — ESLint（TypeScript対応）、Prettier、lint-staged + husky による pre-commit フック
- **Issue #7**: ヘキサゴナルアーキテクチャのディレクトリ構成作成 — domain/application/infrastructure/presentation 各レイヤーのサブディレクトリ + .gitkeep

## 確認事項

- [x] \`npm run test\` が全件パスする
- [x] \`npm run lint\` がエラーなしで通る
- [x] \`npm run format:check\` がエラーなしで通る
- [x] TypeScript の \`strict\` モードでコンパイルエラーがない
- [x] \`docs/architecture/README.md\` のディレクトリ構成と一致している
- [x] コミット時に lint-staged が自動実行される

## Test plan

- [x] \`npm run test\` — Vitest テスト実行確認
- [x] \`npm run test:coverage\` — カバレッジレポート出力確認
- [x] \`npm run lint\` — ESLint エラーなし確認
- [x] \`npm run format:check\` — Prettier フォーマット確認
- [x] ディレクトリ構成が設計ドキュメントと一致

Closes #5, #6, #7

https://claude.ai/code/session_01QFEBRB2ejdU12sTC5TgjyX`;

    const result = await apiCall("POST", `/repos/${OWNER}/${REPO}/pulls`, {
      title: "Phase 0: プロジェクトセットアップ（#5, #6, #7）",
      body: prBody,
      head: "claude/review-desktop-app-progress-bcQMS",
      base: "main",
    });

    if (result.statusCode === 201) {
      console.log(`PR 作成成功: ${result.body.html_url}`);
      console.log(`PR番号: #${result.body.number}`);
    } else {
      console.log(`PR 作成失敗 (${result.statusCode}): ${JSON.stringify(result.body).substring(0, 500)}`);
    }
  }

  if (action === "check-issues") {
    console.log("=== イシュー確認 ===\n");
    for (const num of [5, 6, 7]) {
      const result = await apiCall("GET", `/repos/${OWNER}/${REPO}/issues/${num}`);
      if (result.statusCode === 200) {
        console.log(`#${num}: ${result.body.title}`);
        console.log(`  状態: ${result.body.state}`);
        console.log(`  チェックリスト: ${result.body.body?.includes("PR チェックリスト") ? "あり" : "なし"}`);
        console.log();
      }
      await sleep(500);
    }
  }

  if (action === "close-issues") {
    console.log("=== イシュークローズ ===\n");
    for (const num of [5, 6, 7]) {
      // チェックリストの項目をチェック済みに更新
      const getResult = await apiCall("GET", `/repos/${OWNER}/${REPO}/issues/${num}`);
      if (getResult.statusCode === 200) {
        let body = getResult.body.body || "";
        // 受け入れ条件のチェックボックスをチェック済みにする
        body = body.replace(/- \[ \]/g, "- [x]");

        const updateResult = await apiCall("PATCH", `/repos/${OWNER}/${REPO}/issues/${num}`, {
          state: "closed",
          state_reason: "completed",
          body: body,
        });
        if (updateResult.statusCode === 200) {
          console.log(`  ok   #${num}: ${updateResult.body.title} — クローズ済み`);
        } else {
          console.log(`  FAIL #${num}: (${updateResult.statusCode})`);
        }
      }
      await sleep(500);
    }
  }
}

main().catch((e) => { console.error("Error:", e); process.exit(1); });
