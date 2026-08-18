/**
 * 최종 발표 슬라이드 생성기.  실행:  node 10-work/slides/build-deck.js
 * 구성안은 30-out/2. 최종 발표자료 구성안.md 다. 내용을 바꿀 때는 그쪽을 먼저 고친다.
 */
const pptx = require("pptxgenjs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");

const p = new pptx();
p.layout = "LAYOUT_WIDE";               // 13.333 × 7.5 in
p.author = "그날, 어디에서는";
p.title = "그날, 어디에서는 — 최종 발표";

const INK="383838", SAGE="7E8C8A", SAGE2="9CACA9", SAGE3="ABBDBA",
      LINE="CED5D2", TINT="F0F3F2", W="FFFFFF", K="000000";
const F = "맑은 고딕";
const M = 0.85;                          // 좌우 여백
const CW = 13.333 - M*2;                 // 본문 폭

const light = () => { const s=p.addSlide(); s.background={color:W}; return s; };
const dark  = () => { const s=p.addSlide(); s.background={color:INK}; return s; };

/** 반복 요소 — 지역 이름 알약. 서비스 화면에 실제로 있는 모양이다. */
function chip(s, text, x, y, opts={}){
  const w = opts.w ?? (0.42 + text.length*0.30);
  const h = opts.h ?? 0.62;
  s.addShape(p.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.31,
    fill: { color: opts.fill ?? W },
    line: { color: opts.line ?? LINE, width: 1 },
  });
  s.addText(text, { x, y, w, h, align:"center", valign:"middle", margin:0,
    fontFace:F, fontSize: opts.size ?? 18, bold: !!opts.bold,
    color: opts.color ?? SAGE });
  return w;
}
function chipRow(s, items, x, y, opts={}){
  let cx = x;
  for (const it of items){
    const on = it === opts.highlight;
    cx += chip(s, it, cx, y, on
      ? { fill: INK, line: INK, color: W, bold:true, size: opts.size, h: opts.h }
      : { size: opts.size, h: opts.h, color: opts.color ?? SAGE, line: opts.line }) + 0.16;
  }
}
const eyebrow = (s, t, color) => s.addText(t, {
  x:M, y:0.55, w:CW, h:0.32, margin:0, fontFace:F, fontSize:13, bold:true,
  charSpacing:2, color: color ?? SAGE });

/* ══ 1. 질문 ══════════════════════════════════════════════ */
{
  const s = dark();
  s.addText("마늘 하면", { x:M, y:2.05, w:CW, h:1.0, margin:0, fontFace:F,
    fontSize:54, color:SAGE3 });
  s.addText("어디가 떠오르세요?", { x:M, y:2.95, w:CW, h:1.3, margin:0, fontFace:F,
    fontSize:72, bold:true, color:W });
  s.addText("그날, 어디에서는  ·  2026. 8. 24.", { x:M, y:6.35, w:CW, h:0.4, margin:0,
    fontFace:F, fontSize:14, color:SAGE2 });
  s.addNotes("실제로 물어보세요. 손을 들게 하거나 한 명을 지목해서 답을 받으세요. 답이 나와야 3번 장이 삽니다.");
}

/* ══ 2. 다들 같은 답 ══════════════════════════════════════ */
{
  const s = light();
  eyebrow(s, "다들 같은 답을 합니다");
  s.addShape(p.ShapeType.roundRect, { x:M, y:2.4, w:3.5, h:1.7, rectRadius:0.85,
    fill:{color:INK}, line:{color:INK} });
  s.addText("의성", { x:M, y:2.4, w:3.5, h:1.7, align:"center", valign:"middle", margin:0,
    fontFace:F, fontSize:60, bold:true, color:W });
  s.addText("여기까지는 성공한 브랜딩입니다.", { x:M+3.9, y:2.75, w:CW-3.9, h:0.6, margin:0,
    fontFace:F, fontSize:26, bold:true, color:INK });
  s.addText("우리는 이걸 부정하려는 게 아닙니다.", { x:M+3.9, y:3.45, w:CW-3.9, h:0.6, margin:0,
    fontFace:F, fontSize:20, color:SAGE });
  s.addNotes("의성이라는 답을 부정하지 마세요. 인정하고 넘어가야 다음 장이 공격이 아니라 발견이 됩니다.");
}

/* ══ 3. 반전 ══════════════════════════════════════════════ */
{
  const s = light();
  eyebrow(s, "그런데");
  s.addText("등록된 마늘 산지는 여섯 곳입니다", { x:M, y:1.55, w:CW, h:0.95, margin:0,
    fontFace:F, fontSize:42, bold:true, color:K });
  chipRow(s, ["의성","남해","단양","삼척","창녕","고흥"], M, 3.15,
    { highlight:"의성", size:22, h:0.78 });
  s.addText("지리적 표시 등록 기준. 농림축산식품부 등록현황.", { x:M, y:4.4, w:CW, h:0.4, margin:0,
    fontFace:F, fontSize:14, color:SAGE2 });
  s.addNotes("여기서 멈추고 3초 쉬세요. 설명을 붙이지 마세요. 지역 이름 여섯 개가 스스로 말합니다.");
}

/* ══ 4. 마늘만이 아니다 ═══════════════════════════════════ */
{
  const s = light();
  eyebrow(s, "마늘만이 아닙니다");
  const cards = [["쌀","6곳"],["사과","5곳"],["한우","5곳"],["김","5곳"]];
  const cw = 2.638, gap = 0.36;
  cards.forEach(([name,n],i)=>{
    const x = M + i*(cw+gap);
    s.addShape(p.ShapeType.roundRect, { x, y:1.75, w:cw, h:2.5, rectRadius:0.16,
      fill:{color:TINT}, line:{color:LINE, width:1} });
    s.addText(name, { x, y:2.05, w:cw, h:0.55, align:"center", margin:0,
      fontFace:F, fontSize:24, bold:true, color:SAGE });
    s.addText(n, { x, y:2.7, w:cw, h:1.05, align:"center", margin:0,
      fontFace:"Arial", fontSize:52, bold:true, color:INK });
  });
  s.addText("산지가 여럿인 품목이 19가지입니다.", { x:M, y:4.85, w:CW, h:0.7, margin:0,
    fontFace:F, fontSize:32, bold:true, color:K });
  s.addNotes("네 개만 읽고 넘어가세요. 19가지라는 숫자가 남으면 됩니다.");
}

/* ══ 5. 한 곳뿐인 품목 ════════════════════════════════════ */
{
  const s = light();
  eyebrow(s, "그리고 반대쪽에는");
  s.addText("66", { x:M, y:1.6, w:4.2, h:2.4, margin:0,
    fontFace:"Arial", fontSize:150, bold:true, color:INK });
  s.addText("가지", { x:M+3.5, y:3.05, w:1.5, h:0.7, margin:0,
    fontFace:F, fontSize:32, bold:true, color:SAGE });
  s.addText("등록된 곳이 전국에 한 곳뿐인 품목", { x:M+5.0, y:2.15, w:CW-5.0, h:0.7, margin:0,
    fontFace:F, fontSize:28, bold:true, color:INK });
  s.addText("가려진 게 아니라 아예 알려지지 않은 것들입니다.", { x:M+5.0, y:2.95, w:CW-5.0, h:0.6, margin:0,
    fontFace:F, fontSize:19, color:SAGE });
  chipRow(s, ["장흥매생이","의령망개떡","양구시래기","곡성토란"], M, 4.6, { size:16, h:0.6 });
  s.addNotes("칩에 적힌 네 개를 소리 내 읽으세요. 처음 듣는 이름이라는 반응이 나오면 그게 증거입니다.");
}

/* ══ 6. 지역 편중 ═════════════════════════════════════════ */
{
  const s = light();
  eyebrow(s, "쏠림은 품목만의 일이 아닙니다");
  s.addText("전남 한 곳이 39%를 가져갑니다", { x:M, y:1.15, w:CW, h:0.8, margin:0,
    fontFace:F, fontSize:38, bold:true, color:K });
  s.addChart(p.ChartType.bar, [{
    name:"등록 건수",
    labels:["전남","강원","경북","경남","전북","충남","경기","충북","부산","제주","인천"],
    values:[52,14,12,10,9,8,7,6,4,3,1],
  }], {
    x:M, y:2.15, w:CW, h:3.6,
    barDir:"col", chartColors:[SAGE], showLegend:false,
    showValue:true, dataLabelPosition:"outEnd", dataLabelColor:INK,
    dataLabelFontFace:"Arial", dataLabelFontSize:12,
    catAxisLabelColor:INK, catAxisLabelFontFace:F, catAxisLabelFontSize:13,
    valAxisHidden:true, valGridLine:{style:"none"}, catGridLine:{style:"none"},
    valAxisMaxVal:60,
  });
  s.addText("지역이 없는 품목 8가지(고려인삼 계열)는 뺐습니다. 광역시가 0인 것은 산지가 아니어서입니다.",
    { x:M, y:6.0, w:CW, h:0.4, margin:0, fontFace:F, fontSize:13, color:SAGE2 });
  s.addNotes("주석을 꼭 말하세요. 광역시가 0인 걸 안 짚으면 질의응답에서 먼저 지적당합니다.");
}

/* ══ 7. 왜 안 풀렸나 ══════════════════════════════════════ */
{
  const s = dark();
  eyebrow(s, "지금까지의 방식", SAGE3);
  s.addText("더 알리기.", { x:M, y:1.9, w:CW, h:0.9, margin:0,
    fontFace:F, fontSize:40, color:SAGE3 });
  s.addText("그런데 알릴수록,\n이미 아는 것이 더 알려집니다.", { x:M, y:2.95, w:CW, h:2.0, margin:0,
    fontFace:F, fontSize:52, bold:true, color:W, lineSpacingMultiple:1.25 });
  s.addText("노출은 인지도를 따라가니까요.", { x:M, y:5.4, w:CW, h:0.5, margin:0,
    fontFace:F, fontSize:20, color:SAGE2 });
  s.addNotes("축제·홍보·쇼핑몰이 다 이 구조입니다. 문제를 푸는 게 아니라 키우는 쪽으로 작동합니다.");
}

/* ══ 8. 우리가 안 한 것 ═══════════════════════════════════ */
{
  const s = light();
  eyebrow(s, "그래서 우리가 안 한 것");
  s.addText("취향을 묻지 않았습니다", { x:M, y:1.4, w:CW, h:0.9, margin:0,
    fontFace:F, fontSize:42, bold:true, color:K });
  s.addShape(p.ShapeType.roundRect, { x:M, y:2.65, w:CW, h:1.5, rectRadius:0.16,
    fill:{color:TINT}, line:{color:LINE, width:1} });
  s.addText("“좋아하는 음식을 고르세요”", { x:M+0.5, y:2.9, w:CW-1.0, h:0.6, margin:0,
    fontFace:F, fontSize:26, bold:true, color:SAGE });
  s.addText("이렇게 물으면 이미 아는 품목으로 몰립니다.", { x:M+0.5, y:3.5, w:CW-1.0, h:0.5, margin:0,
    fontFace:F, fontSize:19, color:INK });
  s.addText("우리가 풀려는 문제를 우리가 강화하게 됩니다.", { x:M, y:4.6, w:CW, h:0.7, margin:0,
    fontFace:F, fontSize:30, bold:true, color:K });
  s.addNotes("이 장이 차별점입니다. 대부분의 추천 서비스는 여기서 반대로 갑니다.");
}

/* ══ 9. 대신 한 것 ════════════════════════════════════════ */
{
  const s = light();
  eyebrow(s, "대신 한 것");
  s.addText("생년월일로 배정합니다", { x:M, y:1.25, w:CW, h:0.9, margin:0,
    fontFace:F, fontSize:42, bold:true, color:K });
  const steps = [["생년월일","묻는 건 이것뿐"],["그날의 수확기","사주가 아니라 제철"],["품목 하나 배정","예측이 아니라 제비뽑기"]];
  const bw = 3.511, bg = 0.55;
  steps.forEach(([t,d],i)=>{
    const x = M + i*(bw+bg);
    s.addShape(p.ShapeType.roundRect, { x, y:2.6, w:bw, h:1.85, rectRadius:0.16,
      fill:{color: i===2 ? INK : TINT}, line:{color: i===2 ? INK : LINE, width:1} });
    s.addText(String(i+1), { x:x+0.3, y:2.8, w:0.6, h:0.45, margin:0,
      fontFace:"Arial", fontSize:15, bold:true, color: i===2 ? SAGE3 : SAGE2 });
    s.addText(t, { x:x+0.3, y:3.25, w:bw-0.6, h:0.5, margin:0,
      fontFace:F, fontSize:22, bold:true, color: i===2 ? W : INK });
    s.addText(d, { x:x+0.3, y:3.78, w:bw-0.6, h:0.45, margin:0,
      fontFace:F, fontSize:14, color: i===2 ? SAGE3 : SAGE });
    if (i < 2) s.addText("→", { x:x+bw+0.06, y:3.25, w:bg-0.12, h:0.5, align:"center", margin:0,
      fontFace:"Arial", fontSize:22, color:SAGE2 });
  });
  s.addText("같은 날짜는 언제나 같은 결과가 나옵니다. 무작위가 아닙니다.",
    { x:M, y:5.0, w:CW, h:0.5, margin:0, fontFace:F, fontSize:19, color:SAGE });
  s.addNotes("'배정'이라는 말을 쓰세요. '추천'이라고 하면 취향 이야기로 되돌아갑니다.");
}

/* ══ 10. 시연 ═════════════════════════════════════════════ */
{
  const s = dark();
  eyebrow(s, "직접 해보시죠", SAGE3);
  s.addImage({ path: path.join(ROOT, "20-assets/QR_발표장용.png"),
    x:M, y:1.75, w:3.5, h:3.5 });
  s.addText("지금 찍어보세요", { x:M+4.2, y:2.2, w:CW-4.2, h:0.8, margin:0,
    fontFace:F, fontSize:40, bold:true, color:W });
  s.addText("hwwwaan.github.io/geofood", { x:M+4.2, y:3.1, w:CW-4.2, h:0.5, margin:0,
    fontFace:"Arial", fontSize:20, color:SAGE3 });
  s.addText("설치도 로그인도 없습니다. 생년월일만 넣으면 됩니다.",
    { x:M+4.2, y:3.85, w:CW-4.2, h:0.5, margin:0, fontFace:F, fontSize:17, color:SAGE2 });
  s.addText("심사위원 생일 → 결과 → 같은 이름 다른 곳 → 그 지역 → 전체 목록 → 시도 배치도",
    { x:M, y:5.75, w:CW, h:0.5, margin:0, fontFace:F, fontSize:15, color:SAGE });
  s.addNotes("개인 결과에서 오래 끌지 마세요. '같은 이름 다른 곳'과 전체 목록에서 멈춰야 문제가 전달됩니다. 인터넷이 끊기면 녹화본으로 넘어가세요.");
}

/* ══ 11. 설계 원칙 ════════════════════════════════════════ */
{
  const s = light();
  eyebrow(s, "지킨 것 셋");
  const rules = [
    ["취향을 묻지 않는다", "물으면 아는 품목으로 몰립니다"],
    ["같은 날은 같은 결과", "무작위면 ‘내 것’이라는 느낌이 사라집니다"],
    ["인지도를 추정하지 않는다", "134개를 눈대중으로 매기면 근거가 사라집니다"],
  ];
  rules.forEach(([t,d],i)=>{
    const y = 1.55 + i*1.55;
    s.addShape(p.ShapeType.ellipse, { x:M, y, w:0.68, h:0.68,
      fill:{color:INK}, line:{color:INK} });
    s.addText(String(i+1), { x:M, y, w:0.68, h:0.68, align:"center", valign:"middle",
      margin:0, fontFace:"Arial", fontSize:20, bold:true, color:W });
    s.addText(t, { x:M+1.0, y:y-0.06, w:CW-1.0, h:0.55, margin:0,
      fontFace:F, fontSize:28, bold:true, color:INK });
    s.addText(d, { x:M+1.0, y:y+0.52, w:CW-1.0, h:0.5, margin:0,
      fontFace:F, fontSize:17, color:SAGE });
  });
  s.addNotes("세 번째가 우리 차별점입니다. 대부분의 팀은 여기서 추정치를 씁니다.");
}

/* ══ 12. 어떻게 재나 ══════════════════════════════════════ */
{
  const s = light();
  eyebrow(s, "성과를 어떻게 재나");
  s.addText("참여자 수가 아니라, 얼마나 고르게 퍼졌는지", { x:M, y:1.15, w:CW, h:0.8, margin:0,
    fontFace:F, fontSize:34, bold:true, color:K });
  const stats = [["134 / 134","전부 노출됐습니다", true],["0.0132","HHI · 완전 균등은 0.0075", false],["10,000","무작위 생년월일 시뮬레이션", false]];
  const sw = 3.584, sg = 0.44;
  stats.forEach(([n,d,on],i)=>{
    const x = M + i*(sw+sg);
    s.addShape(p.ShapeType.roundRect, { x, y:2.4, w:sw, h:2.35, rectRadius:0.16,
      fill:{color: on ? INK : TINT}, line:{color: on ? INK : LINE, width:1} });
    s.addText(n, { x:x+0.28, y:2.85, w:sw-0.56, h:1.0, margin:0,
      fontFace:"Arial", fontSize: 44, bold:true, color: on ? W : INK });
    s.addText(d, { x:x+0.28, y:3.9, w:sw-0.56, h:0.6, margin:0,
      fontFace:F, fontSize:16, color: on ? SAGE3 : SAGE });
  });
  s.addText("영광 22종일 때는 21개만 노출됐고, 한 품목이 석 달을 독식했습니다.",
    { x:M, y:5.25, w:CW, h:0.5, margin:0, fontFace:F, fontSize:18, color:SAGE });
  s.addNotes("지니계수 정의를 설명하지 마세요. 134개가 전부 나왔다는 한 줄이면 됩니다.");
}

/* ══ 13. 못 하는 것 ═══════════════════════════════════════ */
{
  const s = light();
  eyebrow(s, "지금 못 하는 것");
  s.addText("먼저 말씀드립니다", { x:M, y:1.1, w:CW, h:0.75, margin:0,
    fontFace:F, fontSize:36, bold:true, color:K });
  const gaps = [
    ["현실 기준선이 없습니다","실제 노출이 어디에 쏠렸는지 재지 않았습니다. 그래서 ‘개선했다’는 아직 못 합니다"],
    ["수확기는 작물 일반 기준입니다","등록 지역의 실제 수확기를 확인한 값이 아닙니다. 화면에도 그렇게 적어뒀습니다"],
    ["연중 품목이 열두 배 유리합니다","고칠 수 있는데 일부러 안 고쳤습니다. 고치면 지표가 뜻을 잃습니다"],
  ];
  gaps.forEach(([t,d],i)=>{
    const y = 2.15 + i*1.5;
    s.addShape(p.ShapeType.roundRect, { x:M, y, w:CW, h:1.22, rectRadius:0.14,
      fill:{color:TINT}, line:{color:LINE, width:1} });
    s.addText(t, { x:M+0.42, y:y+0.14, w:CW-0.84, h:0.5, margin:0,
      fontFace:F, fontSize:22, bold:true, color:INK });
    s.addText(d, { x:M+0.42, y:y+0.64, w:CW-0.84, h:0.45, margin:0,
      fontFace:F, fontSize:15, color:SAGE });
  });
  s.addNotes("세 번째는 약점이 아니라 선택으로 말하세요. '고칠 수 있는데 일부러 안 고쳤습니다. 고치면 지표가 뜻을 잃습니다.'");
}

/* ══ 14. 닫는 문장 ════════════════════════════════════════ */
{
  const s = dark();
  s.addText("지리적 표시로 등록된 먹거리는 134가지입니다.", { x:M, y:1.9, w:CW, h:0.8, margin:0,
    fontFace:F, fontSize:30, color:SAGE3 });
  s.addText("그런데 우리가 제일 잘 아는 이름 하나는,\n이 목록에 없습니다.", { x:M, y:2.8, w:CW, h:2.1, margin:0,
    fontFace:F, fontSize:42, bold:true, color:W, lineSpacingMultiple:1.3 });
  chip(s, "영광굴비", M, 5.0, { fill:W, line:W, color:INK, bold:true, size:26, h:0.85, w:2.9 });
  s.addText("2021년부터 등록을 시도하고 있습니다. 아직 안 됐습니다.",
    { x:M+3.15, y:5.2, w:CW-3.15, h:0.5, margin:0, fontFace:F, fontSize:19, color:SAGE2 });
  s.addNotes("여기서 끝냅니다. 덧붙이지 마세요. 앞에서 굴비를 미리 꺼내면 이 장이 죽습니다.");
}

const OUT = path.join(ROOT, "30-out/4. 최종 발표 슬라이드.pptx");
p.writeFile({ fileName: OUT }).then(()=>console.log("wrote", OUT));
