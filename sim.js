/**
 * core.js 검증 스크립트.  실행:  node sim.js
 *
 * 확인하는 것
 *  1. 결정론  — 같은 생년월일 10회 → 같은 결과인가
 *  2. 분산도  — uniform / inverse 두 모드의 지니·HHI·비앵커비중
 *  3. 달별 후보 수 — 후보가 0인 달은 폴백이 걸린다
 *  4. verified:false 품목 수
 */
import { readFileSync } from "node:fs";
import { assign, simulate, byMonth, metrics, sortForOverview } from "./core.js";

const data = JSON.parse(readFileSync(new URL("./items.json", import.meta.url)));
const items = data.items;

const line = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

/* 1. 결정론 ------------------------------------------------------- */
line("1. 결정론 — 같은 생년월일 10회");
const probes = ["1997-06-12", "2003-01-08", "1988-11-30", "2000-02-29", "1975-07-04"];
const detRows = probes.map((bd) => {
  const runs = Array.from({ length: 10 }, () => assign(bd, items).item.id);
  const uniq = [...new Set(runs)];
  return {
    생년월일: bd,
    배정: assign(bd, items).item.name,
    "고유 결과 수": uniq.length,
    판정: uniq.length === 1 ? "OK" : "실패",
  };
});
console.table(detRows);

// 모드가 다르면 결과도 달라질 수 있어야 정상 (가중치가 실제로 먹는지 확인)
const modeDiff = probes.filter(
  (bd) => assign(bd, items, { mode: "uniform" }).item.id !== assign(bd, items, { mode: "inverse" }).item.id
).length;
console.log(`uniform과 inverse가 갈린 표본: ${modeDiff}/${probes.length}`);

/* 2. 분산도 ------------------------------------------------------- */
line("2. 시뮬레이션 10,000건");
const N = 10000;
const uni = simulate(items, N, { mode: "uniform" });
const inv = simulate(items, N, { mode: "inverse" });
console.table([uni.summary, inv.summary]);

line("2-1. 인지도 등급별 노출 (1=무명 … 5=전국구)");
console.table([
  { mode: "uniform", ...uni.byAwareness },
  { mode: "inverse", ...inv.byAwareness },
]);

line("2-2. 품목별 노출 — 노출이 적은 5개 / 많은 5개 (inverse 기준)");
const ranked = Object.entries(inv.countsById)
  .map(([id, c]) => {
    const it = items.find((i) => i.id === id);
    return { id, 이름: it.name, 인지도: it.awareness, uniform: uni.countsById[id], inverse: c };
  })
  .sort((a, b) => a.inverse - b.inverse);
console.table([...ranked.slice(0, 5), ...ranked.slice(-5)]);

/* 3. 달별 후보 수 ------------------------------------------------- */
line("3. 달별 후보 품목 수 (앵커 제외)");
const nonAnchor = items.filter((i) => !i.isAnchor);
const bm = byMonth(nonAnchor);
const alwaysCount = nonAnchor.filter((i) => i.alwaysAvailable).length;
console.table(
  Array.from({ length: 12 }, (_, k) => {
    const m = k + 1;
    const n = bm[m].length;
    return {
      월: m,
      "제철 후보": n,
      폴백: n === 0 ? `걸림 → 연중 ${alwaysCount}종` : "",
      품목: bm[m].map((i) => i.name).join(", ") || "-",
    };
  })
);

/* 4. 데이터 상태 -------------------------------------------------- */
line("4. 데이터 상태");
const unverified = items.filter((i) => !i.verified);
const noMonths = items.filter((i) => !i.months?.length);
console.table([
  { 항목: "전체 품목", 수: items.length },
  { 항목: "앵커(굴비)", 수: items.filter((i) => i.isAnchor).length },
  { 항목: "verified:true", 수: items.length - unverified.length },
  { 항목: "verified:false", 수: unverified.length },
  { 항목: "months 비어 있음", 수: noMonths.length },
]);
console.log("verified:false —", unverified.map((i) => i.name).join(", "));
console.log("months 없음   —", noMonths.map((i) => i.name).join(", "));

/* 5. 참고: 현실 기준선 가정치와의 대비 ---------------------------- */
line("5. 참고 — 굴비 쏠림 가정 시나리오와의 대비");
const hypothetical = [9000, ...Array(items.length - 1).fill(1000 / (items.length - 1))];
console.table([
  { 시나리오: "가정: 노출 90%가 굴비", 지니계수: +metrics.gini(hypothetical).toFixed(4), HHI: +metrics.hhi(hypothetical).toFixed(4) },
  { 시나리오: "우리 서비스 (uniform)", 지니계수: uni.summary.지니계수, HHI: uni.summary.HHI },
  { 시나리오: "우리 서비스 (inverse)", 지니계수: inv.summary.지니계수, HHI: inv.summary.HHI },
]);
console.log("※ 위 첫 줄은 원자료가 아니라 가정치입니다. 발표에 숫자로 쓰지 마세요.");

/* 6. 정렬 확인 ---------------------------------------------------- */
line("6. sortForOverview — 앵커가 맨 뒤인가");
const sorted = sortForOverview(items);
console.log(sorted.map((i) => `${i.awareness}:${i.name}`).join("  ›  "));
