/* ====== ゲーム状態 ====== */
let gameState = 'start'; // 'start' | 'countdown' | 'playing' | 'res
let panels = [];
let prob = null;

let score = { ok:0, total:0 };
const durationMs = 2 * 1000; // 1分
let startMs = 0;

let countdown = { start:0, duration:3000 }; // 3,2,1（3秒）

/* ====== デバッグ ====== */
let debugMode = false;
const dbgBtn = { x:16, y:14, w:140, h:38 };

/* ====== ボタン ====== */
const startBtn = { x:0, y:0, w:260, h:60 };
const retryBtn = { x:0, y:0, w:220, h:56 };
const backBtn  = { x:0, y:0, w:220, h:52 };
const dlBtn    = { x:0, y:0, w:220, h:44 };  // JSONダウンロード（デバッグ専用）
const clearBtn = { x:0, y:0, w:220, h:44 };  // 履歴削除（デバッグ専用）

/* ====== 履歴（ローカル保存あり） ====== */
let history = []; // {ts, ok, total, acc}
let savedThisResult = false;

function setup(){
  createCanvas(windowWidth, windowHeight);
  textFont('sans-serif');
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

  // スタートボタン
  startBtn.w = min(280, width * 0.6);
  startBtn.h = 60;
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
  push();
  noStroke(); fill(0,0,0,18);
  rect(startBtn.x+3, startBtn.y+4, startBtn.w, startBtn.h, 12);

  stroke(0,150); strokeWeight(2); fill(255);
  rect(startBtn.x, startBtn.y, startBtn.w, startBtn.h, 12);

  noStroke(); fill(30); textAlign(CENTER, CENTER); textSize(20);
  text('スタート', startBtn.x + startBtn.w/2, startBtn.y + startBtn.h/2);
  pop();
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
  textSize(base * 0.034);
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
  textSize(base * 0.028);
  text(`スコア：${score.ok} / ${score.total}`, 16, dbgBtn.y + dbgBtn.h + 8);
  text(`試行回数：${trials}`, 16, dbgBtn.y + dbgBtn.h + 8 + base*0.035);
  pop();
}

function drawTrialsAtTop(){
  const base = min(width, height);
  const trials = history.length;
  push();
  textAlign(LEFT, TOP);
  fill(60);
  noStroke();
  textSize(base * 0.028);
  text(`試行回数：${trials}`, 16, dbgBtn.y + dbgBtn.h + 8);
  pop();
}

function drawDebugButton(){
  push();
  // 影
  noStroke();
  fill(0,0,0,18);
  rect(dbgBtn.x+3, dbgBtn.y+4, dbgBtn.w, dbgBtn.h, 10);

  // 本体
  stroke( debugMode ? color(0,160,110) : 210 );
  strokeWeight(2);
  fill(255);
  rect(dbgBtn.x, dbgBtn.y, dbgBtn.w, dbgBtn.h, 10);

  // ラベル
  noStroke();
  fill( debugMode ? color(0,160,110) : 40 );
  textAlign(CENTER, CENTER);
  textSize(16);
  text(debugMode ? 'DEBUG: ON' : 'DEBUG: OFF', dbgBtn.x + dbgBtn.w/2, dbgBtn.y + dbgBtn.h/2);
  pop();
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
  const lineH = max(24, base * 0.035);

  if(debugMode){
    const list = history.slice(-10).reverse();

    // 見出し
    push();
    textAlign(LEFT, TOP);
    fill(30);
    textSize(base * 0.04);
    text('これまでの結果', 16, yTop - lineH*0.9);
    pop();

    // ダウンロード／削除ボタン（右上）
    dlBtn.w = min(260, width * 0.45);
    dlBtn.h = 44;
    dlBtn.x = width - dlBtn.w - 16;
    dlBtn.y = yTop - lineH*0.9 - 6;

    clearBtn.w = dlBtn.w;
    clearBtn.h = 44;
    clearBtn.x = dlBtn.x;
    clearBtn.y = dlBtn.y + dlBtn.h + 8;

    // DL
    push();
    noStroke(); fill(0,0,0,18);
    rect(dlBtn.x+3, dlBtn.y+4, dlBtn.w, dlBtn.h, 10);
    stroke(0,150); strokeWeight(2); fill(255);
    rect(dlBtn.x, dlBtn.y, dlBtn.w, dlBtn.h, 10);
    noStroke(); fill(30); textAlign(CENTER, CENTER); textSize(16);
    text('履歴をJSONでダウンロード', dlBtn.x + dlBtn.w/2, dlBtn.y + dlBtn.h/2);
    pop();

    // クリア
    push();
    noStroke(); fill(0,0,0,18);
    rect(clearBtn.x+3, clearBtn.y+4, clearBtn.w, clearBtn.h, 10);
    stroke(200,60,60); strokeWeight(2); fill(255);
    rect(clearBtn.x, clearBtn.y, clearBtn.w, clearBtn.h, 10);
    noStroke(); fill(200,60,60); textAlign(CENTER, CENTER); textSize(16);
    text('履歴を削除', clearBtn.x + clearBtn.w/2, clearBtn.y + clearBtn.h/2);
    pop();

    // 履歴リスト
    push();
    textAlign(LEFT, TOP);
    fill(30);
    textSize(base * 0.028);
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
  retryBtn.w = min(260, width * 0.5);
  retryBtn.h = 56;
  retryBtn.x = (width - retryBtn.w)/2;
  retryBtn.y = height*0.76;

  push();
  noStroke(); fill(0,0,0,20);
  rect(retryBtn.x+3, retryBtn.y+4, retryBtn.w, retryBtn.h, 12);

  stroke(0,150); strokeWeight(2); fill(255);
  rect(retryBtn.x, retryBtn.y, retryBtn.w, retryBtn.h, 12);

  noStroke(); fill(30); textAlign(CENTER, CENTER); textSize(20);
  text('もう一度', retryBtn.x + retryBtn.w/2, retryBtn.y + retryBtn.h/2);
  pop();

  // スタート画面に戻るボタン
  backBtn.w = min(260, width * 0.5);
  backBtn.h = 52;
  backBtn.x = (width - backBtn.w)/2;
  backBtn.y = retryBtn.y + retryBtn.h + 14;

  push();
  noStroke(); fill(0,0,0,18);
  rect(backBtn.x+3, backBtn.y+4, backBtn.w, backBtn.h, 12);

  stroke(120); strokeWeight(2); fill(255);
  rect(backBtn.x, backBtn.y, backBtn.w, backBtn.h, 12);

  noStroke(); fill(30); textAlign(CENTER, CENTER); textSize(18);
  text('スタート画面へ', backBtn.x + backBtn.w/2, backBtn.y + backBtn.h/2);
  pop();
}

/* ====== パネル ====== */
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

/* ====== 入力 ====== */
function mousePressed(){
  // デバッグボタン（常時）
  if(hit(mouseX, mouseY, dbgBtn)){
    debugMode = !debugMode;
    return;
  }

  if(gameState === 'start'){
    if(hit(mouseX, mouseY, startBtn)){
      startNewRound();
    }
    return;
  }

  if(gameState === 'countdown'){
    return; // カウントダウン中は入力なし
  }

  if(gameState === 'result'){
    if(hit(mouseX, mouseY, retryBtn)){
      startNewRound();
      return;
    }
    if(hit(mouseX, mouseY, backBtn)){
      gameState = 'start';
      return;
    }
    // デバッグ専用の操作
    if(debugMode){
      if(hit(mouseX, mouseY, dlBtn)){
        downloadHistoryJSON();
        return;
      }
      if(hit(mouseX, mouseY, clearBtn)){
        clearHistoryWithConfirm();
        return;
      }
    }
    return;
  }

  if(gameState !== 'playing') return;

  // 回答
  for(const p of panels){
    if(hit(mouseX, mouseY, p)){
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
  // デバッグモードのみ機能
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
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearHistoryWithConfirm(){
  // デバッグモードのみ機能
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