#!/usr/bin/env node
import http from "http";
import tls from "tls";

const PROXY_URL = process.env.HTTPS_PROXY || process.env.https_proxy;
const TOKEN = process.env.GITHUB_TOKEN;

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

function fetchIssue(num) {
  return new Promise((resolve, reject) => {
    const proxyUrl = new URL(PROXY_URL);
    const req = http.request({
      hostname: proxyUrl.hostname, port: proxyUrl.port,
      method: "CONNECT", path: "api.github.com:443", headers: {},
    });
    req.on("connect", (res, socket) => {
      const tlsSock = tls.connect({ socket, servername: "api.github.com" }, () => {
        const headers = [
          `GET /repos/toru0514/handmade-shipping-manager/issues/${num} HTTP/1.1`,
          "Host: api.github.com",
          "User-Agent: checker",
          "Accept: application/vnd.github+json",
          `Authorization: Bearer ${TOKEN}`,
          "X-GitHub-Api-Version: 2022-11-28",
          "Connection: close", "", "",
        ].join("\r\n");
        tlsSock.write(headers);
        let d = "";
        tlsSock.on("data", (c) => (d += c));
        tlsSock.on("end", () => {
          const parts = d.split("\r\n\r\n");
          let body = parts.slice(1).join("\r\n\r\n");
          if (parts[0].toLowerCase().includes("transfer-encoding: chunked")) {
            body = decodeChunked(body);
          }
          try { resolve(JSON.parse(body)); } catch { resolve(null); }
        });
      });
      tlsSock.on("error", reject);
    });
    req.on("error", reject);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const checks = [5, 14, 29];
  for (const num of checks) {
    try {
      const issue = await fetchIssue(num);
      if (!issue || !issue.body) { console.log(`#${num}: 取得失敗`); continue; }
      const has = issue.body.includes("PR チェックリスト（全イシュー共通）");
      const sections = ["1. テスト", "2. コード品質", "3. アーキテクチャ", "4. ドメインモデル整合性", "5. 命名規則", "6. 他イシューへの影響確認"];
      const allSections = sections.every((s) => issue.body.includes(s));
      console.log(`#${num} ${issue.title}`);
      console.log(`  チェックリスト有無: ${has ? "OK" : "NG"}`);
      console.log(`  全6セクション: ${allSections ? "OK" : "NG"}`);
      console.log();
    } catch (e) {
      console.log(`#${num}: エラー — ${e.message}`);
    }
    await sleep(1000);
  }
}

main();
