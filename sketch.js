/* ====== タブレット対応版（タッチ操作＆誤タップ防止） ======
  変更点：
  - touchStarted でタップ入力を処理（mousePressed と共通ハンドラ）
  - canvas の touch-action を 'none' にしてスクロール／ピンチを抑制
  - 長押しのコンテキストメニュー無効化
  - user-select 無効化でテキスト選択を防止
  - タップ向けに最小タップサイズを強化（ボタン／パネル）
========================================================= */

/* ====== ゲーム状態 ====== */
let gameState = 'start'; // 'start' | 'countdown' | 'playing' | 'result'
let panels = [];
let prob = null;

let score = { ok:0, total:0 };
const durationMs = 2 * 1000; // 1分
let startMs = 0;

let countdown = { start:0, duration:3000 }; // 3,2,1（3秒）

/* ====== デバッグ ====== */
let debugMode = false;
const dbgBtn = { x:16, y:14, w:160, h:44 }; // タブレット向けに少し大きめ

/* ====== ボタン ====== */
const startBtn = { x:0, y:0, w:320, h:72 };
const retryBtn = { x:0, y:0, w:280, h:68 };
const backBtn  = { x:0, y:0, w:280, h:64 };
const dlBtn    = { x:0, y:0, w:300, h:56 };  // JSONダウンロード（デバッグ専用）
const clearBtn = { x:0, y:0, w:300, h:56 };  // 履歴削除（デバッグ専用）

/* ====== 履歴（ローカル保存あり） ====== */
let history = []; // {ts, ok, total, acc}
let savedThisResult = false;

function setup(){
  const cnv = createCanvas(windowWidth, windowHeight);
  textFont('sans-serif');

  // --- タブレット操作の品質向上 ---
  // 画面スクロールやピンチと競合しないように canvas 側で無効化
  cnv.elt.style.touchAction = 'none';
  // 長押しメニューを無効化
  cnv.elt.oncontextmenu = (e) => e.preventDefault();
  // テキスト選択を抑制（誤タップで選択されないように）
  document.body.style.userSelect = 'none';
  document.body.style.webkitUserSelect = 'none';

  loadHistory();
  makePanels();
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  makePanels();
}

/* ====== メインループ ====== */
function draw(){
  background(247,247,249);
  const base = min(width, height);

  // デバッグ切替ボタン（全画面で表示）
  drawDebugButton();

  // デバッグ時のみ，プレイ中は残り時間・スコア・試行回数を表示
  if(debugMode && gameState === 'playing'){
    const remain = max(0, durationMs - (millis() - startMs));
    const sec = Math.ceil(remain/1000);
    drawTimer(`残り ${sec} 秒`);
    drawDebugMeta();
  }
  // デバッグ時の試行回数表示（結果画面でも）
  if(debugMode && gameState === 'result'){
    drawTrialsAtTop();
  }

  if(gameState === 'start'){
    drawStartScreen();

  }else if(gameState === 'countdown'){
    drawCountdownScreen();

  }else if(gameState === 'playing'){
    // 進行
    const remain = max(0, durationMs - (millis() - startMs));
    if(remain <= 0){
      endGame();
    }

    // 問題
    push();
    textAlign(CENTER, CENTER);
    fill(20);
    textSize(base * 0.12);
    text(prob.expr, width/2, height*0.35);
    pop();

    // パネル
    drawPanels();

  }else if(gameState === 'result'){
    drawResultScreen();
  }
}

/* ====== 画面描画 ====== */
function drawStartScreen(){
  const base = min(width, height);

  // スタートボタン（タブレット向け最低サイズ確保）
  startBtn.w = clamp(min(360, width * 0.7), 260, 420);
  startBtn.h = clamp( Math.max(60, base * 0.08), 60, 88 );
  startBtn.x = (width - startBtn.w)/2;
  startBtn.y = height * 0.55;

  // 説明（タイトルなし）
  push();
  textAlign(CENTER, CENTER);
  noStroke();
  fill(40);
  textSize(base * 0.05);
  text('四則演算（答えは1〜10）', width/2, height*0.35);
  textSize(base * 0.028);
  fill(90);
  text('1分間でできるだけ答えよう', width/2, height*0.42);
  pop();

  // ボタン
  drawButton(startBtn, 'スタート');
}

function drawCountdownScreen(){
  const base = min(width, height);
  const elapsed = millis() - countdown.start;

  // 3,2,1 のみ表示（START! は出さない）
  if(elapsed < countdown.duration){
    const sec = 3 - Math.floor(elapsed / 1000); // 3,2,1（0は表示しない）
    if(sec >= 1){
      push();
      textAlign(CENTER, CENTER);
      noStroke();
      fill(20);
      textSize(base * 0.18);
      text(String(sec), width/2, height*0.40);
      pop();
    }
  }else{
    // カウントダウン終了 -> 開始
    startMs = millis();
    gameState = 'playing';
  }
}

function drawTimer(label){
  const base = min(width, height);
  push();
  textAlign(RIGHT, TOP);
  textSize(base * 0.036);
  fill(30);
  noStroke();
  text(label, width - 16, 14);
  pop();
}

function drawDebugMeta(){
  const base = min(width, height);
  const trials = history.length; // 完了したプレイ回数
  push();
  textAlign(LEFT, TOP);
  fill(60);
  noStroke();
  textSize(base * 0.03);
  text(`スコア：${score.ok} / ${score.total}`, 16, dbgBtn.y + dbgBtn.h + 10);
  text(`試行回数：${trials}`, 16, dbgBtn.y + dbgBtn.h + 10 + base*0.038);
  pop();
}

function drawTrialsAtTop(){
  const base = min(width, height);
  const trials = history.length;
  push();
  textAlign(LEFT, TOP);
  fill(60);
  noStroke();
  textSize(base * 0.03);
  text(`試行回数：${trials}`, 16, dbgBtn.y + dbgBtn.h + 10);
  pop();
}

function drawDebugButton(){
  drawButton(dbgBtn, debugMode ? 'DEBUG: ON' : 'DEBUG: OFF', {
    stroke: debugMode ? color(0,160,110) : color(210),
    textFill: debugMode ? color(0,160,110) : color(40),
    radius: 12
  });
}

function drawResultScreen(){
  const base = min(width, height);

  // 現在ラウンドの結果
  const total = max(1, score.total);
  const acc = Math.round((score.ok / total) * 1000) / 10;

  push();
  textAlign(CENTER, CENTER);
  noStroke();
  fill(20);
  textSize(base * 0.08);
  text('終了！', width/2, height*0.18);

  textSize(base * 0.06);
  text(`スコア：${score.ok} / ${score.total}`, width/2, height*0.28);
  text(`正答率：${acc}%`, width/2, height*0.36);
  pop();

  // これまでの結果（デバッグモードのときのみ表示）＋ DL/削除ボタン
  let yTop = height * 0.44;
  const lineH = max(28, base * 0.038);

  if(debugMode){
    const list = history.slice(-10).reverse();

    // 見出し
    push();
    textAlign(LEFT, TOP);
    fill(30);
    textSize(base * 0.045);
    text('これまでの結果', 16, yTop - lineH*0.9);
    pop();

    // ダウンロード／削除ボタン（右側）
    dlBtn.w = clamp(width * 0.46, 240, 360);
    dlBtn.h = clamp(base * 0.07, 48, 64);
    dlBtn.x = width - dlBtn.w - 16;
    dlBtn.y = yTop - lineH*0.9 - 6;

    clearBtn.w = dlBtn.w;
    clearBtn.h = dlBtn.h;
    clearBtn.x = dlBtn.x;
    clearBtn.y = dlBtn.y + dlBtn.h + 12;

    drawButton(dlBtn, '履歴をJSONでダウンロード');
    drawButton(clearBtn, '履歴を削除', { stroke: color(200,60,60), textFill: color(200,60,60) });

    // 履歴リスト
    push();
    textAlign(LEFT, TOP);
    fill(30);
    textSize(base * 0.032);
    let y = yTop;
    for(const item of list){
      const d = new Date(item.ts);
      const timeStr = fmtDate(d);
      const accStr = (Math.round(item.acc*10)/10).toFixed(1);
      const row = `${timeStr}   ${item.ok} / ${item.total}   (${accStr}%)`;
      text(row, 16, y);
      y += lineH;
    }
    pop();
  }

  // もう一度ボタン
  retryBtn.w = clamp(width * 0.6, 240, 420);
  retryBtn.h = clamp(base * 0.085, 56, 88);
  retryBtn.x = (width - retryBtn.w)/2;
  retryBtn.y = height*0.76;
  drawButton(retryBtn, 'もう一度');

  // スタート画面に戻るボタン
  backBtn.w = retryBtn.w;
  backBtn.h = clamp(base * 0.08, 52, 84);
  backBtn.x = (width - backBtn.w)/2;
  backBtn.y = retryBtn.y + retryBtn.h + 16;
  drawButton(backBtn, 'スタート画面へ', { stroke: color(120) });
}

/* ====== 共通ボタン描画 ====== */
function drawButton(btn, label, opt = {}){
  const radius = opt.radius ?? 14;
  const strokeCol = opt.stroke ?? color(0,150);
  const textFill = opt.textFill ?? color(30);

  push();
  // 影
  noStroke(); fill(0,0,0,20);
  rect(btn.x+3, btn.y+4, btn.w, btn.h, radius);

  // 本体
  stroke(strokeCol); strokeWeight(2); fill(255);
  rect(btn.x, btn.y, btn.w, btn.h, radius);

  // ラベル
  noStroke(); fill(textFill); textAlign(CENTER, CENTER);
  textSize(clamp(min(width,height) * 0.03, 16, 24));
  text(label, btn.x + btn.w/2, btn.y + btn.h/2);
  pop();
}

/* ====== パネル ====== */
function makePanels(){
  panels = [];
  const cols = 5, rows = 2;
  const marginX = width * 0.05;
  const gridW = width * 0.90;
  const gap = max(10, gridW * 0.02);
  const cellW = (gridW - gap * (cols - 1)) / cols;

  const base = min(width, height);
  // タブレットでの最小タップ面積を確保（約48dp相当以上）
  const cellH = clamp(min(base * 0.14, cellW * 0.8), 64, 120);
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
  textSize(clamp(base * 0.065, 22, 46));

  for(const p of panels){
    const isHover = mouseX >= p.x && mouseX <= p.x+p.w && mouseY >= p.y && mouseY <= p.y+p.h;
    let face = color(255);
    if(isHover && gameState === 'playing') face = color(245);

    // 影
    noStroke(); fill(0,0,0,18);
    rect(p.x+3, p.y+4, p.w, p.h, 16);

    // 本体
    stroke(210); strokeWeight(2); fill(face);
    rect(p.x, p.y, p.w, p.h, 16);

    // 数字
    noStroke(); fill(30);
    text(p.value, p.x + p.w/2, p.y + p.h/2);
  }
}

/* ====== 入力（マウス／タッチ共通） ====== */
function mousePressed(){
  handlePointerDown(mouseX, mouseY);
}

function touchStarted(){
  // 最初のタッチのみを見る
  if(touches && touches.length > 0){
    const t = touches[0];
    handlePointerDown(t.x, t.y);
  }
  // ブラウザ既定のスクロール等を抑制
  return false;
}

function handlePointerDown(mx, my){
  // デバッグボタン（常時）
  if(hit(mx, my, dbgBtn)){
    debugMode = !debugMode;
    return;
  }

  if(gameState === 'start'){
    if(hit(mx, my, startBtn)){
      startNewRound();
    }
    return;
  }

  if(gameState === 'countdown'){
    return; // カウントダウン中は入力なし
  }

  if(gameState === 'result'){
    if(hit(mx, my, retryBtn)){
      startNewRound();
      return;
    }
    if(hit(mx, my, backBtn)){
      gameState = 'start';
      return;
    }
    // デバッグ専用の操作
    if(debugMode){
      if(hit(mx, my, dlBtn)){
        downloadHistoryJSON();
        return;
      }
      if(hit(mx, my, clearBtn)){
        clearHistoryWithConfirm();
        return;
      }
    }
    return;
  }

  if(gameState !== 'playing') return;

  // 回答
  for(const p of panels){
    if(hit(mx, my, p)){
      checkAnswer(p.value);
      break;
    }
  }
}

function hit(mx, my, r){
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}

/* ====== ラウンド制御 ====== */
function startNewRound(){
  // 準備（この時点では問題を作るが表示はしない）
  score = { ok:0, total:0 };
  nextProblem();
  savedThisResult = false;

  // カウントダウン開始
  countdown.start = millis();
  gameState = 'countdown';
}

function endGame(){
  if(savedThisResult) { gameState = 'result'; return; }
  savedThisResult = true;

  // 結果保存
  const total = Math.max(1, score.total);
  const acc = (score.ok / total) * 100;
  const entry = { ts: Date.now(), ok: score.ok, total: score.total, acc };
  history.push(entry);
  saveHistory();

  gameState = 'result';
}

/* ====== 出題と採点 ====== */
function nextProblem(){
  prob = generateProblem();
}

function checkAnswer(v){
  score.total++;
  if(v === prob.answer) score.ok++;
  nextProblem(); // 即次の問題へ
}

/* ====== 問題生成（答えは必ず1〜10の整数） ====== */
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
    const r = rndInt(1, 9);
    b = rndInt(1, 10 - r);
    a = r + b;
    ans = r;
    expr = `${a} − ${b}`;
  } else if(op === '×'){
    const r = rndInt(1, 10);
    const pairs = [];
    for(let i=1;i<=10;i++){
      if(r % i === 0 && (r / i) <= 10){
        pairs.push([i, r / i]);
      }
    }
    const pick = random(pairs);
    a = pick[0]; b = pick[1];
    ans = r;
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

/* ====== 履歴保存／操作 ====== */
function loadHistory(){
  try{
    const raw = localStorage.getItem('arithmeticQuizHistory');
    history = raw ? JSON.parse(raw) : [];
  }catch(e){
    history = [];
  }
}
function saveHistory(){
  try{
    localStorage.setItem('arithmeticQuizHistory', JSON.stringify(history));
  }catch(e){
    // 失敗時は無視（プライベートブラウズ等）
  }
}
function fmtDate(d){
  // YYYY/MM/DD HH:MM
  const z = (n)=>String(n).padStart(2,'0');
  return `${d.getFullYear()}/${z(d.getMonth()+1)}/${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
}

/* ====== デバッグ専用：JSONダウンロード／履歴削除 ====== */
function downloadHistoryJSON(){
  if(!debugMode) return;

  const payload = {
    exportedAt: new Date().toISOString(),
    trials: history.length,
    history: history
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);

  const fileName = makeExportFileName();
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;

  // iOS Safari 対応：リンクを DOM に追加してからクリック
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearHistoryWithConfirm(){
  if(!debugMode) return;
  if(confirm('履歴をすべて削除しますか？')){
    history = [];
    saveHistory();
  }
}

function makeExportFileName(){
  const d = new Date();
  const z = (n)=>String(n).padStart(2,'0');
  const yyyy = d.getFullYear();
  const mm = z(d.getMonth()+1);
  const dd = z(d.getDate());
  const hh = z(d.getHours());
  const mi = z(d.getMinutes());
  const ss = z(d.getSeconds());
  return `arithmetic_history_${yyyy}${mm}${dd}_${hh}${mi}${ss}.json`;
}

/* ====== ユーティリティ ====== */
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
