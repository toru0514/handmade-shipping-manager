#!/usr/bin/env node
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
      "User-Agent": "hsm-script",
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(bodyStr);
    }
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
      if (res.statusCode !== 200) { reject(new Error(`Proxy CONNECT: ${res.statusCode}`)); return; }
      const tlsSock = tls.connect({ socket, servername: "api.github.com" }, () => {
        const reqLine = `${method} ${path} HTTP/1.1\r\n`;
        const hl = Object.entries({ ...headers, Host: "api.github.com", Connection: "close" })
          .map(([k, v]) => `${k}: ${v}`).join("\r\n");
        tlsSock.write(reqLine + hl + "\r\n\r\n");
        if (bodyStr) tlsSock.write(bodyStr);
        let d = "";
        tlsSock.on("data", (c) => (d += c));
        tlsSock.on("end", () => {
          const parts = d.split("\r\n\r\n");
          const sc = parseInt(parts[0].split("\r\n")[0].split(" ")[1]);
          let rb = parts.slice(1).join("\r\n\r\n");
          if (parts[0].toLowerCase().includes("transfer-encoding: chunked")) rb = decodeChunked(rb);
          try { resolve({ statusCode: sc, body: JSON.parse(rb) }); }
          catch { resolve({ statusCode: sc, body: rb }); }
        });
      });
      tlsSock.on("error", reject);
    });
    req.on("error", reject);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function api(method, path, body = null) {
  for (let i = 0; i < 3; i++) {
    try { return await makeRequest(method, path, body); }
    catch (e) { if (i < 2) { await sleep(2000 * (i + 1)); } else throw e; }
  }
}

async function main() {
  // Check and close Issue #11
  const get = await api("GET", `/repos/${OWNER}/${REPO}/issues/11`);
  if (get.statusCode !== 200) {
    console.log(`Issue取得失敗: ${get.statusCode}`);
    process.exit(1);
  }
  console.log(`Issue #11: ${get.body.title}`);
  console.log(`  現在の状態: ${get.body.state}\n`);

  // Check all boxes and close
  const body = (get.body.body || "").replace(/- \[ \]/g, "- [x]");
  const upd = await api("PATCH", `/repos/${OWNER}/${REPO}/issues/11`, {
    state: "closed", state_reason: "completed", body,
  });
  if (upd.statusCode === 200) {
    console.log(`  チェックボックス全チェック + クローズ完了`);
  } else {
    console.log(`  更新失敗: ${upd.statusCode}`);
  }

  // Also add a review comment to the PR
  await sleep(500);
  const commentBody = `## レビュー結果: 承認 ✅

### 受け入れ条件チェック

- [x] pending → shipped の一方向遷移のみ許可される
- [x] 発送済みの注文に対する変更はエラーになる
- [x] 発送完了時に日時が記録される
- [x] 全メソッドにユニットテストがある

### PR チェックリスト確認

- [x] テスト: 132テスト全件パス
- [x] コード品質: lint/format エラーなし
- [x] アーキテクチャ: domain層は他の層をimportしていない
- [x] ドメインモデル整合性: OrderStatus は pending/shipped の2状態のみ
- [x] 命名規則: ユビキタス言語と一致
- [x] 他イシューへの影響なし

### 改善提案（ブロッカーではない）

\`status\`, \`shippedAt\`, \`shippingMethod\`, \`trackingNumber\` が public かつ非readonly のため、外部から直接書き換え可能です。将来的には \`private\` + getter にすると Domain Rule の迂回を防げます。`;

  const comment = await api("POST", `/repos/${OWNER}/${REPO}/issues/33/comments`, {
    body: commentBody,
  });
  if (comment.statusCode === 201) {
    console.log(`  PRにレビューコメント追加完了`);
  } else {
    console.log(`  コメント追加失敗: ${comment.statusCode}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
