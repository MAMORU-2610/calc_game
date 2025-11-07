let panels = [];          // 1〜10のパネル
let prob = null;          // 現在の問題 {expr, answer}
let score = { ok:0, total:0 };
let debugMode = false;
let dbgButton;

function setup(){
   const c = createCanvas(windowWidth, windowHeight);
  textFont('sans-serif');
  makePanels();
  nextProblem();
  createDebugToggle();
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  makePanels();
}

function draw(){
  background(247,247,249);
  const base = min(width, height);

  // タイトル
  noStroke();
  fill(50);
  textAlign(LEFT, TOP);
  textSize(base * 0.03);
  text('四則演算クイズ', 16, 12);

  if(debugMode){
    textAlign(RIGHT, TOP);
    text(`スコア：${score.ok} / ${score.total}`, width - 16, 12);
  }

  // 問題（中央）
  push();
  textAlign(CENTER, CENTER);
  fill(20);
  textSize(base * 0.12);
  text(prob.expr, width/2, height*0.35);
  pop();

  // パネル描画
  drawPanels();
}

// ===== パネル関連 ====
function makePanels(){
  panels = [];
  const cols = 5, rows = 2;
  const marginX = width * 0.05;
  const gridW = width * 0.90;
  const gap = max(6, gridW * 0.015);
  const cellW = (gridW - gap * (cols - 1)) / cols;

  const base = min(width, height);
  const cellH = min(base * 0.12, cellW * 0.75);
  const topY = height * 0.60;

  let n = 1;
  for(let r=0; r<rows; r++){
    for(let c=0; c<cols; c++){
      const x = marginX + c * (cellW + gap);
      const y = topY + r * (cellH + gap);
      panels.push({ x, y, w: cellW, h: cellH, value: n++ });
    }
  }
}

function drawPanels(){
  const base = min(width, height);
  textAlign(CENTER, CENTER);
  textSize(base * 0.06);

  for(const p of panels){
    const isHover = mouseX >= p.x && mouseX <= p.x+p.w && mouseY >= p.y && mouseY <= p.y+p.h;

    // 影
    noStroke();
    fill(0,0,0,18);
    rect(p.x+3, p.y+4, p.w, p.h, 16);

    // 本体
    stroke(210);
    strokeWeight(2);
    fill(isHover ? 245 : 255);
    rect(p.x, p.y, p.w, p.h, 16);

    // 数字
    noStroke();
    fill(30);
    text(p.value, p.x + p.w/2, p.y + p.h/2);
  }
}

// ===== 入力（マウス／タッチ両対応） =====
function handleSelectAt(px, py){
  for(const p of panels){
    if(px >= p.x && px <= p.x+p.w && py >= p.y && py <= p.y+p.h){
      checkAnswer(p.value);   // 画面演出は出さずに採点のみ
      nextProblem();          // 即時で次の問題へ
      break;
    }
  }
}

function mousePressed(){      // マウス・タッチ（多くの環境で合成される）対応
  handleSelectAt(mouseX, mouseY);
}

function touchStarted(){      // タッチ専用（ネイティブ座標で確実に拾う）
  if(touches && touches.length){
    const t = touches[0];
    handleSelectAt(t.x, t.y);
  }else{
    handleSelectAt(mouseX, mouseY);
  }
  return false; // ページスクロール等の既定動作を抑止
}

// ===== 出題と採点 =====
function nextProblem(){
  prob = generateProblem();
}

function checkAnswer(v){
  score.total++;
  if(v === prob.answer) score.ok++;
}

// ===== 問題生成（答えは必ず1〜10の整数） =====
function generateProblem(){
  const ops = ['+', '−', '×', '÷'];
  const op = random(ops);
  let a, b, ans, expr;

  if(op === '+'){
    a = rndInt(1, 9);
    b = rndInt(1, 10 - a);
    ans = a + b;
    expr = `${a} + ${b}`;
  } else if(op === '−'){
    const r = rndInt(1, 9);   // 答え
    b = rndInt(1, 10 - r);
    a = r + b;
    ans = r;
    expr = `${a} − ${b}`;
  } else if(op === '×'){
    const r = rndInt(1, 10);
    const pairs = [];
    for(let i=1;i<=10;i++){
      if(r % i === 0 && (r / i) <= 10) pairs.push([i, r / i]);
    }
    const pick = random(pairs);
    a = pick[0]; b = pick[1];
    ans = a * b;
    expr = `${a} × ${b}`;
  } else { // ÷
    const r = rndInt(1, 10);
    b = rndInt(1, 10);
    a = r * b;
    ans = r;
    expr = `${a} ÷ ${b}`;
  }
  return { expr, answer: ans };
}

function rndInt(minV, maxV){
  return Math.floor(random(minV, maxV + 1));
}

// ===== デバッグ切替ボタン =====
function createDebugToggle(){
  dbgButton = createButton('デバッグ：OFF');
  dbgButton.addClass('dbg-btn');
  dbgButton.mousePressed(() => {
    debugMode = !debugMode;
    dbgButton.html(debugMode ? 'デバッグ：ON（スコア表示）' : 'デバッグ：OFF');
  });
}