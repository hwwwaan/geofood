/**
 * 영광 먹거리 배정 서비스 — 핵심 로직
 *
 * 설계 원칙 (SPEC.md 참조)
 *  1. 생년월일은 예측이 아니라 배정 장치다
 *  2. 결과는 결정론적이다 (같은 입력 → 언제나 같은 출력)
 *  3. 근거는 사주가 아니라 제철이다
 *  4. MBTI는 품목을 고르지 않는다. 편집 방향만 정한다
 *  5. 앵커(굴비)는 배정에서 제외하되 전체 목록에는 남긴다
 */

/* ------------------------------------------------------------------ *
 * 1. 결정론적 해시
 * ------------------------------------------------------------------ */

/** FNV-1a 32bit. 같은 문자열은 언제나 같은 정수를 낸다. */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 해시값을 시드로 쓰는 결정론적 난수 (mulberry32). 0 이상 1 미만. */
export function seededRandom(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ *
 * 2. 배정
 * ------------------------------------------------------------------ */

/**
 * @param {string} birthdate  "YYYY-MM-DD"
 * @param {Array}  items      items.json의 items 배열
 * @param {object} opts
 *   - mode: 'uniform' (기본) | 'inverse'
 *       uniform : 후보 품목을 균등 확률로 배정
 *       inverse : 인지도가 낮을수록 뽑힐 확률이 높음
 *   - includeAnchor: 앵커(굴비)를 배정 후보에 넣을지. 기본 false
 * @returns {{item, month, candidateCount, fallback}}
 */
export function assign(birthdate, items, opts = {}) {
  const mode = opts.mode ?? "uniform";
  const includeAnchor = opts.includeAnchor ?? false;

  const month = parseMonth(birthdate);
  const seed = hashString(birthdate);

  const pool = items.filter((it) => includeAnchor || !it.isAnchor);

  // 1순위: 생일 달이 제철인 품목
  let candidates = pool.filter((it) => it.months?.includes(month));
  let fallback = false;

  // 2순위: 제철 품목이 없으면 연중 구매 가능 품목
  if (candidates.length === 0) {
    candidates = pool.filter((it) => it.alwaysAvailable);
    fallback = true;
  }

  // 3순위: 그것도 없으면 전체
  if (candidates.length === 0) {
    candidates = pool;
    fallback = true;
  }

  const weights = candidates.map((it) =>
    mode === "inverse" ? Math.max(1, 6 - (it.awareness ?? 3)) : 1
  );

  const item = weightedPick(candidates, weights, seededRandom(seed));

  return { item, month, candidateCount: candidates.length, fallback };
}

function parseMonth(birthdate) {
  const m = Number(String(birthdate).split("-")[1]);
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    throw new Error(`birthdate 형식이 잘못됐습니다: ${birthdate}`);
  }
  return m;
}

function weightedPick(arr, weights, rng) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

/* ------------------------------------------------------------------ *
 * 3. 문장 조립
 * ------------------------------------------------------------------ */

const MONTH_PHRASE = {
  1: "한겨울", 2: "겨울 끝", 3: "이른 봄", 4: "봄", 5: "늦봄",
  6: "초여름", 7: "한여름", 8: "늦여름", 9: "초가을", 10: "가을",
  11: "늦가을", 12: "초겨울",
};

/** 받침 유무에 따라 조사를 고른다. josa('찰보리쌀','을','를') → '을' */
export function josa(word, withBatchim, withoutBatchim) {
  const last = String(word).trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return withoutBatchim; // 한글 음절이 아니면
  const hasBatchim = (code - 0xac00) % 28 !== 0;
  return hasBatchim ? withBatchim : withoutBatchim;
}

/**
 * 결과 화면 상단 문장.
 * 사주 어투를 쓰지 않는다. 기록의 어투로 쓴다.
 */
export function buildHeadline(birthdate, item, fallback) {
  const [y, m, d] = String(birthdate).split("-").map(Number);
  const season = MONTH_PHRASE[m];
  const eul = josa(item.name, "을", "를");
  if (fallback) {
    return `${y}년 ${m}월 ${d}일. 그 무렵 영광에서는 ${item.name}${eul} 내고 있었습니다.`;
  }
  return `${y}년 ${m}월 ${d}일. ${season}의 영광에서는 ${item.name}${eul} 거두고 있었습니다.`;
}

/**
 * MBTI 편집 방향. 품목 선택에는 관여하지 않는다.
 * mbti가 없으면 기본형(balanced)을 돌려준다.
 */
export function editorialDirection(mbti) {
  if (!mbti || mbti.length !== 4) {
    return { social: "balanced", detail: "balanced", angle: "balanced", structure: "balanced" };
  }
  const m = mbti.toUpperCase();
  return {
    social: m[0] === "E" ? "share" : "solo",        // 나눠 먹기 / 혼자 즐기기
    detail: m[1] === "S" ? "recipe" : "story",       // 조리법·계량 / 유래·이야기
    angle: m[2] === "T" ? "data" : "people",         // 영양·성분 / 만든 사람
    structure: m[3] === "J" ? "steps" : "freeform",  // 단계별 / 대충 응용
  };
}

/** 편집 방향에 따라 본문 블록 순서를 정한다. UI에서 이 순서대로 렌더링. */
export function composeBlocks(item, direction) {
  const blocks = [];
  blocks.push({ type: "tagline", text: item.tagline });

  if (direction.detail === "story") {
    blocks.push({ type: "note", text: item.note });
  }
  if (direction.angle === "people") {
    blocks.push({ type: "producer", text: null }); // 생산자 데이터 연결 지점
  }
  if (direction.angle === "data") {
    blocks.push({ type: "facts", text: null });    // 성분·규격 데이터 연결 지점
  }
  if (direction.detail === "recipe") {
    blocks.push({
      type: "howto",
      text: null,
      hint: direction.structure === "steps" ? "단계별로" : "대충 해도 되는 방식으로",
    });
  }
  blocks.push({
    type: "serving",
    text: direction.social === "share" ? "여럿이 나눠 먹는 법" : "혼자 한 끼로 먹는 법",
  });
  blocks.push({ type: "why", text: item.why });    // 앵커 그림자 심는 지점
  return blocks;
}

/* ------------------------------------------------------------------ *
 * 4. 임팩트 측정
 * ------------------------------------------------------------------ */

export const metrics = {
  /** 지니계수. 0=완전 균등, 1=완전 집중. 핵심 지표. */
  gini(counts) {
    const v = [...counts].sort((a, b) => a - b);
    const n = v.length;
    const sum = v.reduce((a, b) => a + b, 0);
    if (n === 0 || sum === 0) return 0;
    let acc = 0;
    for (let i = 0; i < n; i++) acc += (i + 1) * v[i];
    return (2 * acc) / (n * sum) - (n + 1) / n;
  },

  /** 허핀달 지수(HHI). 낮을수록 분산. 1/n이 완전 균등. */
  hhi(counts) {
    const sum = counts.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0;
    return counts.reduce((a, c) => a + (c / sum) ** 2, 0);
  },

  /** 앵커(굴비) 외 품목이 차지한 노출 비중. 1에 가까울수록 좋음. */
  nonAnchorShare(countsById, items) {
    const anchors = new Set(items.filter((i) => i.isAnchor).map((i) => i.id));
    let total = 0;
    let nonAnchor = 0;
    for (const [id, c] of Object.entries(countsById)) {
      total += c;
      if (!anchors.has(id)) nonAnchor += c;
    }
    return total === 0 ? 0 : nonAnchor / total;
  },

  /** 인지도 등급별 노출 분포. 저인지 품목에 얼마나 갔는지 확인용. */
  byAwareness(countsById, items) {
    const map = Object.fromEntries(items.map((i) => [i.id, i.awareness ?? 3]));
    const out = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const [id, c] of Object.entries(countsById)) {
      out[map[id] ?? 3] += c;
    }
    return out;
  },
};

/* ------------------------------------------------------------------ *
 * 5. 시뮬레이션 — 발표 임팩트 슬라이드의 숫자를 만드는 곳
 * ------------------------------------------------------------------ */

/**
 * 무작위 생년월일 n건을 돌려 노출 분포와 지표를 산출한다.
 * 발표에 쓸 숫자는 여기서 나온다.
 *
 * 사용 예:
 *   const items = (await (await fetch('./items.json')).json()).items;
 *   console.table(simulate(items, 10000, { mode: 'uniform' }).summary);
 */
export function simulate(items, n = 10000, opts = {}) {
  const countsById = Object.fromEntries(items.map((i) => [i.id, 0]));
  const rng = seededRandom(20260817); // 시뮬레이션 자체도 재현 가능하게

  for (let k = 0; k < n; k++) {
    const y = 1950 + Math.floor(rng() * 60);
    const m = 1 + Math.floor(rng() * 12);
    const d = 1 + Math.floor(rng() * 28);
    const bd = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const { item } = assign(bd, items, opts);
    countsById[item.id] += 1;
  }

  const counts = Object.values(countsById);
  return {
    countsById,
    summary: {
      n,
      mode: opts.mode ?? "uniform",
      품목수: items.length,
      노출된품목수: counts.filter((c) => c > 0).length,
      지니계수: Number(metrics.gini(counts).toFixed(4)),
      HHI: Number(metrics.hhi(counts).toFixed(4)),
      완전균등HHI: Number((1 / items.length).toFixed(4)),
      비앵커비중: Number(metrics.nonAnchorShare(countsById, items).toFixed(4)),
    },
    byAwareness: metrics.byAwareness(countsById, items),
  };
}

/* ------------------------------------------------------------------ *
 * 6. 전체 목록 정렬 — [3] 화면용
 * ------------------------------------------------------------------ */

/** 인지도 낮은 순으로 정렬하고 앵커를 맨 뒤로 보낸다. */
export function sortForOverview(items) {
  return [...items].sort((a, b) => {
    if (a.isAnchor !== b.isAnchor) return a.isAnchor ? 1 : -1;
    return (a.awareness ?? 3) - (b.awareness ?? 3);
  });
}

/** 월별 타임라인용. 1~12월에 무엇이 나는지. */
export function byMonth(items) {
  const out = {};
  for (let m = 1; m <= 12; m++) {
    out[m] = items.filter((i) => i.months?.includes(m));
  }
  return out;
}
