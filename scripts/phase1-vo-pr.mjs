#!/usr/bin/env node
/**
 * Phase 1 値オブジェクト PR 作成 + イシュークローズ
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
  const action = process.argv[2];

  if (action === "create-pr") {
    const prBody = `## Summary

Phase 1 ドメイン層の値オブジェクト15種を実装。全て不変（readonly）、バリデーション付き。

- **Issue #8**: 基本型 — OrderId, LabelId, Platform(DR-PLT-001), OrderStatus(DR-ORD-003), ShippingMethod(DR-SHP-001), MessageTemplateType
- **Issue #9**: 住所・購入者関連 — PostalCode(DR-ADR-001), Prefecture(DR-ADR-002), Address(DR-ADR-003), BuyerName, PhoneNumber, Buyer
- **Issue #10**: 商品・追跡・メッセージ — Product, TrackingNumber, Message

## 確認事項

- [x] \`npm run test\` — 123テスト全件パス
- [x] \`npm run lint\` — ESLint エラーなし
- [x] \`npm run format:check\` — Prettier フォーマット問題なし
- [x] TypeScript \`strict\` モードでコンパイルエラーなし
- [x] domain 層は他の層を import していない
- [x] 値オブジェクトは全て不変（readonly プロパティ）
- [x] ドメインルール（DR-PLT-001, DR-ORD-003, DR-SHP-001, DR-ADR-001〜003）が実装されている

## Test plan

- [x] 基本型テスト: 47件パス（不正値エラー、equals、toString）
- [x] 住所・購入者テスト: 51件パス（バリデーション、optional対応）
- [x] 商品・追跡・メッセージテスト: 22件パス
- [x] 既存テスト: 3件パス（サンプルテスト）

Closes #8, #9, #10

https://claude.ai/code/session_01QFEBRB2ejdU12sTC5TgjyX`;

    const result = await api("POST", `/repos/${OWNER}/${REPO}/pulls`, {
      title: "Phase 1: 値オブジェクト実装（#8, #9, #10）",
      body: prBody,
      head: "claude/review-desktop-app-progress-bcQMS",
      base: "main",
    });
    if (result.statusCode === 201) {
      console.log(`PR 作成成功: ${result.body.html_url}`);
    } else {
      console.log(`PR 作成失敗 (${result.statusCode}): ${JSON.stringify(result.body).substring(0, 500)}`);
    }
  }

  if (action === "close-issues") {
    for (const num of [8, 9, 10]) {
      const get = await api("GET", `/repos/${OWNER}/${REPO}/issues/${num}`);
      if (get.statusCode === 200) {
        const body = (get.body.body || "").replace(/- \[ \]/g, "- [x]");
        const upd = await api("PATCH", `/repos/${OWNER}/${REPO}/issues/${num}`, {
          state: "closed", state_reason: "completed", body,
        });
        console.log(upd.statusCode === 200
          ? `  ok   #${num}: ${upd.body.title}`
          : `  FAIL #${num}: ${upd.statusCode}`);
      }
      await sleep(500);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
