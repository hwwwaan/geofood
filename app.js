/**
 * 영광 먹거리 배정 서비스 — 화면
 *
 * 배정·문장·지표 로직은 전부 core.js에 있습니다. 여기서는 그리기만 합니다.
 * 라우팅은 해시 기반이라 결과 URL을 그대로 공유하면 같은 결과가 나옵니다.
 * 생년월일은 저장하지 않습니다. 주소창을 벗어나면 남지 않습니다.
 */

import {
  assign,
  buildHeadline,
  editorialDirection,
  composeBlocks,
  sortForOverview,
  byMonth,
  simulate,
} from "./core.js";

/* ── 데이터 ────────────────────────────────────────────── */

// import.meta.url 기준이라 서브디렉터리(/repo-name/)에 올려도 경로가 안 깨집니다.
const DATA_URL = new URL("./items.json", import.meta.url);

let DATA = null;
const items = () => DATA.items;
const byId = (id) => items().find((i) => i.id === id);

/* ── 작은 도구들 ───────────────────────────────────────── */

const app = document.getElementById("app");
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** [5,6,7,8,9] → "5~9월",  [8,9] → "8~9월",  [3,4,5,10] → "3~5월, 10월" */
function monthLabel(months) {
  if (!months || months.length === 0) return null;
  const s = [...months].sort((a, b) => a - b);
  const runs = [];
  let start = s[0], prev = s[0];
  for (let i = 1; i <= s.length; i++) {
    if (s[i] === prev + 1) { prev = s[i]; continue; }
    runs.push(start === prev ? `${start}` : `${start}~${prev}`);
    start = prev = s[i];
  }
  return runs.join(", ") + "월";
}

/** 제철 표시 한 줄. 연중 품목은 그것도 밝힌다. */
function seasonLine(item) {
  const m = monthLabel(item.months);
  if (m && item.alwaysAvailable) return `${m} 수확 · 연중 구매 가능`;
  if (m) return `${m} 수확`;
  if (item.alwaysAvailable) return "연중 납니다";
  return "수확기 확인 중";
}

const AWARENESS_TEXT = { 1: "무명", 2: "지역 한정", 3: "일부 인지", 4: "널리 알려짐", 5: "전국구" };

function dots(n) {
  const k = Math.min(5, Math.max(1, n ?? 3));
  return `<span class="dots" title="인지도 ${esc(AWARENESS_TEXT[k])}" aria-label="인지도 ${esc(AWARENESS_TEXT[k])}">${"<b>●</b>".repeat(k)}${"○".repeat(5 - k)}</span>`;
}

const checkingBadge = (item) =>
  item.verified ? "" : ` <span class="badge" title="수확기를 영광군 원자료로 아직 확인하지 못했습니다">확인 중</span>`;

/* ── 해시 라우팅 ───────────────────────────────────────── */

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  return { path: path || "", params: new URLSearchParams(qs || "") };
}

const go = (hash) => { location.hash = hash; };

function isValidDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d &&
    y >= 1900 && dt <= new Date()
  );
}

const isValidMbti = (s) => /^[EI][SN][TF][JP]$/.test(String(s || "").toUpperCase());

/* ══════════════════════════════════════════════════════════
 * [1] 입력
 * ══════════════════════════════════════════════════════════ */

const AXES = [
  { name: "관계", a: ["E", "밖으로"], b: ["I", "안으로"] },
  { name: "인식", a: ["S", "감각"], b: ["N", "직관"] },
  { name: "판단", a: ["T", "사고"], b: ["F", "감정"] },
  { name: "생활", a: ["J", "계획"], b: ["P", "즉흥"] },
];

function viewHome() {
  app.innerHTML = `
    <div class="stack-lg">
      <header>
        <p class="eyebrow">전남 영광</p>
        <h1>당신이 태어난 날,<br>영광에서는 무엇을 거두고 있었을까요</h1>
        <p class="lead">
          생년월일을 넣으면 그 무렵 영광에서 나던 먹거리 하나를 배정합니다.
          점을 보는 게 아니라 그날의 수확기를 찾는 것입니다.
        </p>
      </header>

      <section>
        <label class="field-label" for="bd">생년월일</label>
        <p class="field-help">1900년 이후, 오늘까지.</p>
        <input type="date" id="bd" min="1900-01-01" max="${new Date().toISOString().slice(0, 10)}"
               autocomplete="bday" required>
      </section>

      <section>
        <label class="field-label">MBTI <span class="badge">선택</span></label>
        <p class="field-help">품목은 생년월일이 정합니다. MBTI는 그 품목을 어떻게 소개할지만 정합니다.</p>
        <div id="axes">
          ${AXES.map((ax, i) => `
            <div class="axis">
              <span class="axis-name">${esc(ax.name)}</span>
              <div class="axis-opts" role="group" aria-label="${esc(ax.name)}">
                ${[ax.a, ax.b].map(([L, ko]) => `
                  <button type="button" class="opt" data-axis="${i}" data-v="${L}" aria-pressed="false">
                    <b>${L}</b> ${esc(ko)}
                  </button>`).join("")}
              </div>
            </div>`).join("")}
        </div>
        <p class="mbti-readout" id="readout"></p>
      </section>

      <div class="stack">
        <button class="btn" id="submit" disabled>결과 보기</button>
        <a class="btn btn-ghost" href="#/map">MBTI 없이 전체 목록부터 보기</a>
      </div>

      <p class="foot-note">
        생년월일은 브라우저에 저장하지 않습니다. 서버로 보내지도 않습니다.
        모든 계산은 이 페이지 안에서 끝납니다.
      </p>
    </div>`;

  const picked = [null, null, null, null];
  const readout = app.querySelector("#readout");
  const submit = app.querySelector("#submit");
  const bd = app.querySelector("#bd");

  function refresh() {
    const done = picked.every(Boolean);
    readout.innerHTML = done
      ? `선택함 <span class="num">${picked.join("")}</span> · 다시 누르면 해제됩니다`
      : picked.some(Boolean) ? "네 축을 모두 고르면 반영됩니다. 건너뛰어도 됩니다." : "";
    submit.disabled = !isValidDate(bd.value);
  }

  app.querySelector("#axes").addEventListener("click", (e) => {
    const btn = e.target.closest(".opt");
    if (!btn) return;
    const i = Number(btn.dataset.axis);
    picked[i] = picked[i] === btn.dataset.v ? null : btn.dataset.v;
    app.querySelectorAll(`.opt[data-axis="${i}"]`).forEach((b) =>
      b.setAttribute("aria-pressed", String(picked[i] === b.dataset.v))
    );
    refresh();
  });

  bd.addEventListener("input", refresh);
  submit.addEventListener("click", () => {
    if (!isValidDate(bd.value)) return;
    const m = picked.every(Boolean) ? `&m=${picked.join("")}` : "";
    go(`/result?d=${bd.value}${m}`);
  });
  refresh();
}

/* ══════════════════════════════════════════════════════════
 * [2] 결과
 * ══════════════════════════════════════════════════════════ */

function viewResult(params) {
  const d = params.get("d");
  const mRaw = params.get("m");
  const mode = params.get("mode") === "inverse" ? "inverse" : "uniform";

  if (!isValidDate(d)) return viewError("생년월일이 올바르지 않습니다.", "다시 입력하기", "#/");

  const mbti = isValidMbti(mRaw) ? mRaw.toUpperCase() : null;
  const { item, month, fallback, candidateCount } = assign(d, items(), { mode });
  const direction = editorialDirection(mbti);
  const blocks = composeBlocks(item, direction);

  const tagline = blocks.find((b) => b.type === "tagline")?.text;
  const body = blocks.filter((b) => b.type === "note" && b.text); // 실제 내용이 있는 블록만 그린다
  // 아직 채울 데이터가 없는 블록. 빈 칸을 만들지 않고 하단에 한 줄로 묶는다.
  const PENDING_LABEL = {
    producer: "만든 사람",
    facts: "성분과 규격",
    howto: "조리법",
    serving: "먹는 방식",
  };
  const missing = blocks.map((b) => PENDING_LABEL[b.type]).filter(Boolean);

  const sellers = item.sellers ?? [];

  app.innerHTML = `
    <div class="stack-lg appear">
      <p class="headline">${esc(buildHeadline(d, item, fallback))}</p>

      <section class="item-card">
        <p class="item-name">${esc(item.name)}${checkingBadge(item)}</p>
        <p class="item-meta">${esc(item.category)} · ${esc(seasonLine(item))}</p>
        ${tagline ? `<p class="item-tagline">${esc(tagline)}</p>` : ""}
      </section>

      ${fallback ? `
        <p class="foot-note">
          ${month}월에 수확기가 잡힌 품목이 아직 없어, 연중 나는 것 중에서 배정했습니다.
          겨울 품목 자료는 채우는 중입니다.
        </p>` : ""}

      ${body.filter((b) => b.type === "note").map((b) => `
        <section>
          <p class="block-label">이야기</p>
          <p>${esc(b.text)}</p>
        </section>`).join("")}

      <section>
        <p class="block-label">왜 몰랐을까</p>
        <p class="why">${esc(item.why)}</p>
      </section>

      <section>
        <p class="block-label">어디서 사나</p>
        ${sellers.length
          ? `<div class="sellers">${sellers.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)} ↗</a>`).join("")}</div>`
          : `<p class="foot-note">품목별 판매처 링크는 아직 채우지 못했습니다.
             산지 쇼핑몰 두 곳입니다.</p>
             <div class="sellers" style="margin-top:10px">
               <a href="https://www.ygmall.kr" target="_blank" rel="noopener">영광몰 ↗</a>
               <a href="https://www.ygmarket.net" target="_blank" rel="noopener">영광마켓 ↗</a>
             </div>`}
      </section>

      <hr class="divider">

      <div class="stack">
        <a class="btn" href="#/map">영광에는 이런 게 몇 개나 더 있을까요</a>
        <button class="btn btn-ghost" id="share">결과 주소 복사</button>
        <a class="btn btn-ghost" href="#/">다른 날짜로 해보기</a>
      </div>

      <p class="foot-note">
        ${mbti ? `MBTI <span class="num">${esc(mbti)}</span> 를 소개 방향에만 썼습니다.
          같은 날짜면 MBTI가 달라도 품목은 같습니다.` : "MBTI 없이 기본형으로 보여드렸습니다."}
        ${missing.length ? `<br>${esc(missing.join(", "))}은 자료가 아직 없어 접어뒀습니다.` : ""}
        <br>${month}월 후보 ${candidateCount}종 가운데 하나입니다.
        ${mode === "inverse" ? "인지도 역가중 모드로 뽑았습니다." : ""}
      </p>
    </div>`;

  app.querySelector("#share").addEventListener("click", async (e) => {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: "그날 영광에서는", url });
      else { await navigator.clipboard.writeText(url); e.target.textContent = "복사했습니다"; }
    } catch { /* 사용자가 취소한 경우 */ }
  });
}

/* ══════════════════════════════════════════════════════════
 * [3] 전체 지도 — 이 화면이 핵심
 * ══════════════════════════════════════════════════════════ */

let mapMode = "list";

function viewMap() {
  const sorted = sortForOverview(items());
  const anchors = sorted.filter((i) => i.isAnchor);
  const rest = sorted.filter((i) => !i.isAnchor);

  app.innerHTML = `
    <div class="stack-lg">
      <header>
        <p class="eyebrow">전체 목록</p>
        <h1>영광에서 나는 것 <span class="num">${items().length}</span>가지</h1>
        <p class="lead">덜 알려진 것부터 놓았습니다. 아는 이름은 맨 아래에 있습니다.</p>
      </header>

      <div class="toggle" role="group" aria-label="보기 방식">
        <button type="button" data-view="list" aria-pressed="${mapMode === "list"}">인지도 순</button>
        <button type="button" data-view="month" aria-pressed="${mapMode === "month"}">달력 순</button>
      </div>

      <section id="mapbody"></section>

      <section class="claim">
        영광에는 지리적 표시로 등록된 먹거리가 여섯 가지 있습니다.<br>
        찰쌀, 보리쌀, 한우, 고추, 고춧가루, 모싯잎송편.<br>
        <strong>굴비는 그 목록에 없습니다.</strong>
        <span class="kicker">우리가 아는 하나가, 영광이 가진 전부는 아닙니다.</span>
      </section>

      <p class="foot-note">
        지리적 표시 등록 현황은 특허청 원자료로 확인하는 중입니다.
        「확인 중」 배지가 붙은 품목은 수확기를 영광군 자료로 아직 맞춰보지 못했습니다.
      </p>

      <div class="stack">
        <a class="btn btn-ghost" href="#/impact">노출이 얼마나 고르게 퍼졌는지 보기</a>
        <a class="btn btn-ghost" href="#/">내 날짜로 하나 받아보기</a>
      </div>
    </div>`;

  const bodyEl = app.querySelector("#mapbody");

  function renderBody() {
    bodyEl.innerHTML = mapMode === "list" ? listHTML(rest, anchors) : monthHTML();
  }

  app.querySelector(".toggle").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-view]");
    if (!b) return;
    mapMode = b.dataset.view;
    app.querySelectorAll(".toggle button").forEach((x) =>
      x.setAttribute("aria-pressed", String(x.dataset.view === mapMode))
    );
    renderBody();
  });

  renderBody();
}

function listHTML(rest, anchors) {
  const row = (item, n) => `
    <li>
      <span class="rank num">${n}</span>
      <div class="row-main">
        <p class="row-name">${esc(item.name)}${checkingBadge(item)}</p>
        <p class="row-tagline">${esc(item.tagline)}</p>
        <p class="row-sub">
          <span>${esc(item.category)}</span>
          <span>${esc(seasonLine(item))}</span>
          <span>${dots(item.awareness)}</span>
        </p>
      </div>
    </li>`;

  return `
    <ul class="list">${rest.map((it, i) => row(it, i + 1)).join("")}</ul>
    <div class="anchor-slot">
      <ul class="list">${anchors.map((it, i) => row(it, rest.length + i + 1)).join("")}</ul>
      <p class="anchor-caption">그리고 굴비. 우리가 아는 하나.</p>
    </div>`;
}

function monthHTML() {
  const bm = byMonth(items());
  return `
    <div>
      ${Array.from({ length: 12 }, (_, k) => {
        const m = k + 1;
        const list = bm[m];
        return `
          <div class="month-row">
            <span class="month-no num">${m}월</span>
            <div class="chips">
              ${list.length
                ? list.map((i) => `<span class="chip">${esc(i.name)}</span>`).join("")
                : `<span class="chip-empty">수확기 자료 없음</span>`}
            </div>
          </div>`;
      }).join("")}
    </div>
    <p class="foot-note" style="margin-top:14px">
      연중 나는 품목은 여기에 안 보입니다. 수확기가 잡힌 것만 놓았습니다.
      비어 있는 달은 아직 채우지 못한 자리입니다.
    </p>`;
}

/* ══════════════════════════════════════════════════════════
 * 노출 분산도 — 원칙 6. 성과는 참여자 수가 아니라 이 숫자다
 * ══════════════════════════════════════════════════════════ */

function viewImpact() {
  app.innerHTML = `<p class="lead">계산하는 중…</p>`;

  setTimeout(() => {
    const N = 10000;
    const uni = simulate(items(), N, { mode: "uniform" });
    const inv = simulate(items(), N, { mode: "inverse" });
    const max = Math.max(...Object.values(inv.countsById), ...Object.values(uni.countsById));

    const ranked = Object.entries(uni.countsById)
      .map(([id, c]) => ({ item: byId(id), uni: c, inv: inv.countsById[id] }))
      .sort((a, b) => b.uni - a.uni);

    app.innerHTML = `
      <div class="stack-lg">
        <header>
          <p class="eyebrow">노출 분산도</p>
          <h1>몇 명이 봤는지가 아니라,<br>얼마나 고르게 퍼졌는지</h1>
          <p class="lead">
            무작위 생년월일 <span class="num">${N.toLocaleString()}</span>건을 넣어 돌린 결과입니다.
            이 페이지에서 지금 계산했습니다.
          </p>
        </header>

        <section class="card">
          <table class="data">
            <thead><tr><th>지표</th><th>균등</th><th>인지도 역가중</th></tr></thead>
            <tbody>
              <tr><td>지니계수 (0에 가까울수록 고름)</td><td class="num">${uni.summary.지니계수}</td><td class="num">${inv.summary.지니계수}</td></tr>
              <tr><td>HHI (완전 균등 ${uni.summary.완전균등HHI})</td><td class="num">${uni.summary.HHI}</td><td class="num">${inv.summary.HHI}</td></tr>
              <tr><td>굴비 밖 품목이 가진 비중</td><td class="num">${(uni.summary.비앵커비중 * 100).toFixed(0)}%</td><td class="num">${(inv.summary.비앵커비중 * 100).toFixed(0)}%</td></tr>
              <tr><td>노출된 품목</td><td class="num">${uni.summary.노출된품목수}/${uni.summary.품목수}</td><td class="num">${inv.summary.노출된품목수}/${inv.summary.품목수}</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>품목별 노출</h2>
          <p class="lead">균등 모드 기준으로 줄을 세웠습니다.</p>
          <table class="data" style="margin-top:14px">
            <tbody>
              ${ranked.map((r) => `
                <tr>
                  <td style="width:40%">${esc(r.item.name)}</td>
                  <td style="width:45%;text-align:left"><span class="bar" style="display:block;width:${Math.max(2, (r.uni / max) * 100)}%"></span></td>
                  <td class="num">${r.uni}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </section>

        <section class="card">
          <h2>솔직하게 남는 것</h2>
          <div class="stack" style="margin-top:12px">
            <p>굴비는 배정에서 빠지므로 굴비 밖 비중은 언제나 100%입니다. 이 숫자는 성과가 아니라 설계의 결과입니다.</p>
            <p>지니계수가 <span class="num">0</span>으로 가지 않는 이유는 인지도가 아니라 달력입니다.
              수확기 자료가 있는 달에 품목이 몰려 있어서, 그 달에 태어난 사람은 몇 안 되는 후보 중에서 받습니다.</p>
            <p>인지도 역가중을 켜도 지표가 크게 안 바뀝니다. 가중치는 그 달의 후보 안에서만 작동하는데,
              편중은 후보 수 자체에서 생기기 때문입니다.</p>
            <p><strong>현실 기준선은 아직 없습니다.</strong> 굴비에 노출이 얼마나 쏠려 있는지를 재지 않았으므로
              「우리가 개선했다」는 말은 지금 못 합니다. 위 숫자는 우리 서비스 안에서의 분포입니다.</p>
          </div>
        </section>

        <a class="btn btn-ghost" href="#/map">전체 목록으로</a>
      </div>`;
  }, 0);
}

/* ── 오류 ──────────────────────────────────────────────── */

function viewError(msg, cta, href) {
  app.innerHTML = `
    <div class="stack-lg">
      <h1>${esc(msg)}</h1>
      <a class="btn" href="${esc(href)}">${esc(cta)}</a>
    </div>`;
}

/* ── 라우터 ────────────────────────────────────────────── */

function route() {
  const { path, params } = parseHash();
  if (path === "result") viewResult(params);
  else if (path === "map") viewMap();
  else if (path === "impact") viewImpact();
  else viewHome();
  window.scrollTo(0, 0);
}

(async function start() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(res.status);
    DATA = await res.json();
  } catch (e) {
    viewError("품목 자료를 불러오지 못했습니다.", "다시 시도", location.href);
    return;
  }
  window.addEventListener("hashchange", route);
  route();
})();
