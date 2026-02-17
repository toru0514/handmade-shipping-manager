#!/usr/bin/env node
/**
 * 全イシューに PR チェックリスト（全イシュー共通）を追記するスクリプト
 */

import http from "http";
import https from "https";
import tls from "tls";

const OWNER = "toru0514";
const REPO = "handmade-shipping-manager";
const TOKEN = process.env.GITHUB_TOKEN;
const PROXY_URL = process.env.HTTPS_PROXY || process.env.https_proxy;

if (!TOKEN) {
  console.error("GITHUB_TOKEN 環境変数を設定してください");
  process.exit(1);
}

const PR_CHECKLIST = `

---

## PR チェックリスト（全イシュー共通）

すべてのPRは、イシュー固有の受け入れ条件に**加えて**、以下を満たすこと。

### 1. テスト

- [ ] 新規・変更コードに対するユニットテストがある
- [ ] \`npm run test\` が全件パスする（既存テスト含む）
- [ ] テストは外部依存（API, DB, ファイルシステム）に依存せず単独実行できる（インフラ層を除く）

### 2. コード品質

- [ ] \`npm run lint\` がエラーなしで通る
- [ ] \`npm run format\` 適用済み（差分なし）
- [ ] TypeScript の \`strict\` モードでコンパイルエラーがない

### 3. アーキテクチャ（レイヤー依存ルール）

ヘキサゴナルアーキテクチャの依存方向を厳守する。

\`\`\`
presentation → application → domain ← infrastructure
\`\`\`

- [ ] **domain 層は他の層を import していない**（最重要）
- [ ] **application 層は infrastructure / presentation を import していない**
- [ ] **application 層はポート（interface）にのみ依存し、具体実装（Adapter）を import していない**
- [ ] infrastructure 層のクラスは必ずドメイン層の Port（interface）を \`implements\` している

### 4. ドメインモデル整合性

\`docs/domain/README.md\` に定義されたルールとの一致を確認する。

- [ ] 値オブジェクトは**不変（immutable）**である（プロパティが \`readonly\`）
- [ ] 集約ルートの操作はドメインルール（DR-XXX）に従っている
- [ ] 集約間は**IDで参照**している（直接オブジェクト参照をしない）
- [ ] OrderStatus は \`pending\` / \`shipped\` の2状態のみ（中間状態を追加しない）
- [ ] ShippingLabel の「伝票発行済み」は OrderStatus ではなく ShippingLabel の**存在**で判断する

### 5. 命名規則（ユビキタス言語）

\`docs/domain/README.md\` のユビキタス言語テーブルに従う。

- [ ] クラス名・変数名がユビキタス言語と一致している（例: \`Order\`, \`Buyer\`, \`ShippingLabel\`）
- [ ] ドメインイベント名が設計ドキュメントと一致している（例: \`OrderRegistered\`, \`OrderShipped\`）
- [ ] ファイルパスが \`docs/architecture/README.md\` のディレクトリ構成と一致している

### 6. 他イシューへの影響確認

- [ ] 他のイシューが依存しているインターフェース（Port）のシグネチャを変更していない（変更する場合は依存イシュー担当者と合意）
- [ ] 共有型（値オブジェクト、エンティティ）のプロパティ追加・削除をしていない（する場合は設計ドキュメントも更新）`;

// ---- HTTP Helper (proxy-aware, from create-issues.mjs) ----

function decodeChunked(data) {
  let result = "";
  let remaining = data;
  while (remaining.length > 0) {
    const lineEnd = remaining.indexOf("\r\n");
    if (lineEnd === -1) break;
    const size = parseInt(remaining.substring(0, lineEnd), 16);
    if (size === 0) break;
    result += remaining.substring(lineEnd + 2, lineEnd + 2 + size);
    remaining = remaining.substring(lineEnd + 2 + size + 2);
  }
  return result;
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      "User-Agent": "handmade-shipping-manager-updater",
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) {
      headers["Content-Length"] = Buffer.byteLength(bodyStr);
    }

    if (PROXY_URL) {
      const proxyUrl = new URL(PROXY_URL);
      const proxyAuth =
        proxyUrl.username && proxyUrl.password
          ? "Basic " +
            Buffer.from(
              `${proxyUrl.username}:${proxyUrl.password}`
            ).toString("base64")
          : null;

      const connectOptions = {
        hostname: proxyUrl.hostname,
        port: proxyUrl.port,
        method: "CONNECT",
        path: "api.github.com:443",
        headers: {},
      };
      if (proxyAuth) {
        connectOptions.headers["Proxy-Authorization"] = proxyAuth;
      }

      const proxyReq = http.request(connectOptions);
      proxyReq.on("connect", (res, socket) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
          return;
        }
        const tlsSocket = tls.connect(
          { socket, servername: "api.github.com" },
          () => {
            const reqLine = `${method} ${path} HTTP/1.1\r\n`;
            const headerLines = Object.entries({
              ...headers,
              Host: "api.github.com",
              Connection: "close",
            })
              .map(([k, v]) => `${k}: ${v}`)
              .join("\r\n");
            tlsSocket.write(reqLine + headerLines + "\r\n\r\n");
            if (bodyStr) tlsSocket.write(bodyStr);

            let data = "";
            tlsSocket.on("data", (chunk) => (data += chunk));
            tlsSocket.on("end", () => {
              const parts = data.split("\r\n\r\n");
              const statusLine = parts[0].split("\r\n")[0];
              const statusCode = parseInt(statusLine.split(" ")[1]);
              let responseBody = parts.slice(1).join("\r\n\r\n");
              if (
                parts[0].toLowerCase().includes("transfer-encoding: chunked")
              ) {
                responseBody = decodeChunked(responseBody);
              }
              try {
                resolve({ statusCode, body: JSON.parse(responseBody) });
              } catch {
                resolve({ statusCode, body: responseBody });
              }
            });
          }
        );
        tlsSocket.on("error", reject);
      });
      proxyReq.on("error", reject);
      proxyReq.end();
    } else {
      const urlObj = new URL(`https://api.github.com${path}`);
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + (urlObj.search || ""),
        method,
        headers: { ...headers, Host: urlObj.hostname, Connection: "close" },
      };
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ statusCode: res.statusCode, body: data });
          }
        });
      });
      req.on("error", reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    }
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiCall(method, path, body = null, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await makeRequest(method, path, body);
      if (result.statusCode === 403 && result.body?.message?.includes("rate limit")) {
        console.log("  Rate limited, waiting 60s...");
        await sleep(60000);
        continue;
      }
      return result;
    } catch (e) {
      if (i < retries - 1) {
        console.log(`  Retry ${i + 1}/${retries}: ${e.message}`);
        await sleep(2000 * (i + 1));
      } else throw e;
    }
  }
}

// ---- Main ----

async function main() {
  console.log("=== 全イシューに PR チェックリストを追記 ===\n");

  // 全イシューを取得（ページネーション対応）
  let allIssues = [];
  let page = 1;
  while (true) {
    const result = await apiCall(
      "GET",
      `/repos/${OWNER}/${REPO}/issues?state=open&per_page=100&page=${page}`
    );
    if (result.statusCode !== 200) {
      console.error(`イシュー取得失敗 (${result.statusCode}):`, result.body);
      process.exit(1);
    }
    // PRを除外（issuesエンドポイントはPRも返す）
    const issues = result.body.filter((i) => !i.pull_request);
    allIssues = allIssues.concat(issues);
    if (result.body.length < 100) break;
    page++;
  }

  console.log(`${allIssues.length} 件のイシューを取得しました\n`);

  // イシュー番号順にソート
  allIssues.sort((a, b) => a.number - b.number);

  let updated = 0;
  let skipped = 0;

  for (const issue of allIssues) {
    // 既にチェックリストが含まれている場合はスキップ
    if (issue.body && issue.body.includes("PR チェックリスト（全イシュー共通）")) {
      console.log(`  skip #${issue.number}: ${issue.title} — 既に追記済み`);
      skipped++;
      continue;
    }

    const newBody = (issue.body || "") + PR_CHECKLIST;
    const result = await apiCall(
      "PATCH",
      `/repos/${OWNER}/${REPO}/issues/${issue.number}`,
      { body: newBody }
    );

    if (result.statusCode === 200) {
      console.log(`  ok   #${issue.number}: ${issue.title}`);
      updated++;
    } else {
      console.log(
        `  FAIL #${issue.number}: ${issue.title} — (${result.statusCode}): ${JSON.stringify(result.body).substring(0, 200)}`
      );
    }
    await sleep(500); // Rate limit 対策
  }

  console.log(`\n=== 完了: ${updated} 件更新 / ${skipped} 件スキップ ===`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
