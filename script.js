// =============================================
// HELPER FUNCTIONS
// =============================================

// Precedence table: * aur / ka weight zyada hai + aur - se
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 };

// Kya yeh character ek operator hai?
function isOp(c) {
  return c in PREC;
  // 'in' keyword object mein key check karta hai
}

// Kya yeh string ek valid number hai?
function isNum(s) {
  return !isNaN(parseFloat(s)) && isFinite(s);
  // parseFloat("5") = 5  (number hai)
  // parseFloat("+") = NaN (number nahi)
}

// =============================================
// STEP 1: TOKENIZE
// Expression string ko array mein todna
// "3 + 5 * 2" → ["3", "+", "5", "*", "2"]
// =============================================

function tokenize(expr) {
  const tokens = [];
  const parts = expr.trim().split(/\s+/); // spaces se split karo

  for (const p of parts) {
    if (!p) continue; // empty string skip karo

    // Sirf valid tokens accept karo
    if (isNum(p) || isOp(p) || p === '(' || p === ')') {
      tokens.push(p);
    } else {
      return null; // invalid token — error return karo
    }
  }

  return tokens.length ? tokens : null;
}

// =============================================
// STEP 2: INFIX → POSTFIX (Shunting Yard Algorithm)
// "3 + 5 * 2" → "3 5 2 * +"
//
// Algorithm rules:
// 1. Number milا → directly output mein daal do
// 2. '(' milا → stack mein push karo
// 3. ')' milا → '(' milne tak stack se pop karke output mein daalo
// 4. Operator milа → 
//    - Jab tak stack ke top ka precedence >= current ka ho, pop karo output mein
//    - Phir current operator ko stack mein push karo
// 5. End mein → bache hue sab operators output mein daal do
// =============================================

// Hum steps array return karte hain taaki animate kar sakein
function buildSteps(tokens) {
  const steps = [];  // har step ka snapshot
  const stack = [];  // operator stack
  const output = []; // output queue (postfix expression banti hai yahan)

  // Helper: current state ka snapshot save karo
  const snap = (msg, activeIdx) => {
    steps.push({
      stack: [...stack],   // copy — reference nahi
      output: [...output],
      msg,
      activeIdx,           // kaun sa token active hai abhi
      phase: 'infix'
    });
  };

  snap('Starting Infix → Postfix conversion', -1);

  // Har token process karo
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    if (isNum(t)) {
      // NUMBER: directly output mein
      output.push(t);
      snap(`Number ${t} → goes directly to output`, i);

    } else if (t === '(') {
      // LEFT PAREN: stack mein push karo
      stack.push(t);
      snap(`'(' pushed to operator stack`, i);

    } else if (t === ')') {
      // RIGHT PAREN: '(' milne tak sab output mein daal do
      while (stack.length && stack[stack.length - 1] !== '(') {
        output.push(stack.pop()); // pop and push to output
      }
      stack.pop(); // '(' ko discard karo
      snap(`')' found → popped operators until '('`, i);

    } else if (isOp(t)) {
      // OPERATOR: precedence check karo
      // Jab tak top ka precedence >= current ka ho, pop karo
      while (
        stack.length &&
        isOp(stack[stack.length - 1]) &&
        PREC[stack[stack.length - 1]] >= PREC[t]
      ) {
        output.push(stack.pop());
      }
      stack.push(t); // ab current operator push karo
      snap(`Operator ${t} (precedence ${PREC[t]}) pushed to stack`, i);
    }
  }

  // Remaining operators → output mein
  while (stack.length) {
    output.push(stack.pop());
  }
  snap('All tokens done → remaining operators moved to output', -1);

  // Postfix expression ready hai
  const postfix = [...output];

  // =============================================
  // STEP 3: EVALUATE POSTFIX
  // "3 5 2 * +" ko evaluate karo
  //
  // Rules:
  // 1. Number milا → stack mein push
  // 2. Operator milа → stack se do numbers pop karo, calculate karo, result push karo
  // =============================================

  const evalStack = [];

  const evalSnap = (msg, activeIdx) => {
    steps.push({
      stack: [...evalStack],
      output: [...postfix], // postfix tokens same rehte hain eval phase mein
      msg,
      activeIdx,
      phase: 'eval'
    });
  };

  evalSnap('Starting evaluation of postfix expression', -1);

  for (let i = 0; i < postfix.length; i++) {
    const t = postfix[i];

    if (isNum(t)) {
      evalStack.push(parseFloat(t)); // number → stack mein
      evalSnap(`Number ${t} → pushed to stack`, i);

    } else if (isOp(t)) {
      const b = evalStack.pop(); // second operand
      const a = evalStack.pop(); // first operand
      // NOTE: b pehle pop hota hai, a baad mein — order matter karta hai!

      let result;
      if (t === '+') result = a + b;
      else if (t === '-') result = a - b;
      else if (t === '*') result = a * b;
      else if (t === '/') result = a / b;

      evalStack.push(result);
      evalSnap(`${a} ${t} ${b} = ${result} → pushed to stack`, i);
    }
  }

  // Final step
  steps.push({
    stack: [...evalStack],
    output: [...postfix],
    msg: `Final result: ${evalStack[0]}`,
    activeIdx: -1,
    phase: 'done',
    result: evalStack[0],
    postfix: postfix.join(' ')
  });

  return steps;
}

// =============================================
// UI FUNCTIONS — DOM update karna
// =============================================

let steps = [];   // saare steps stored here
let curStep = 0;  // current step index
let tokens = [];  // current expression tokens

function startVisualize() {
  const expr = document.getElementById('expr').value;
  const errBox = document.getElementById('error-box');
  errBox.classList.add('hidden');

  // Tokenize karo
  tokens = tokenize(expr);
  if (!tokens) {
    errBox.textContent = 'Invalid! Use numbers and operators (+, -, *, /) separated by spaces.';
    errBox.classList.remove('hidden');
    return;
  }

  // Steps generate karo
  steps = buildSteps(tokens);
  curStep = 0;

  // UI show karo
  document.getElementById('panels').style.display = 'grid';
  document.getElementById('controls').style.display = 'flex';
  document.getElementById('phase-badge').classList.remove('hidden');
  document.getElementById('result-section').classList.add('hidden');
  document.getElementById('step-log').innerHTML = '';

  renderTokens(); // tokens row banao
  renderStep();   // pehla step show karo
}

// Tokens row render karo (colored chips)
function renderTokens() {
  const row = document.getElementById('tokens-row');
  row.innerHTML = '';

  tokens.forEach((t, i) => {
    const el = document.createElement('span');
    // Type ke hisaab se color class
    const cls = isNum(t) ? 'tok-num' : (t === '(' || t === ')') ? 'tok-paren' : 'tok-op';
    el.className = `token ${cls}`;
    el.textContent = t;
    el.id = `tok-${i}`; // id se later highlight kar sakein
    row.appendChild(el);
  });
}

// Current step ka UI update karo
function renderStep() {
  const s = steps[curStep];

  // Prev/Next buttons enable/disable
  document.getElementById('btn-prev').disabled = curStep === 0;
  document.getElementById('btn-next').disabled = curStep === steps.length - 1;

  // Active token highlight karo
  document.querySelectorAll('.token').forEach(el => el.classList.remove('tok-active'));
  if (s.activeIdx >= 0) {
    const el = document.getElementById(`tok-${s.activeIdx}`);
    if (el) el.classList.add('tok-active');
  }

  // Phase badge update karo
  const badge = document.getElementById('phase-badge');
  if (s.phase === 'infix') {
    badge.textContent = 'Phase 1: Infix → Postfix';
    badge.className = 'phase-badge phase-infix';
  } else {
    badge.textContent = 'Phase 2: Evaluating postfix';
    badge.className = 'phase-badge phase-eval';
  }

  // Labels update karo
  const isEval = s.phase === 'eval' || s.phase === 'done';
  document.getElementById('stack-label').textContent = isEval ? 'Eval stack' : 'Operator stack';
  document.getElementById('output-label').textContent = isEval ? 'Postfix tokens' : 'Output queue';

  // Stack render karo
  const sv = document.getElementById('stack-vis');
  sv.innerHTML = '';
  s.stack.forEach(v => {
    const el = document.createElement('span');
    el.className = `stack-item ${isNaN(v) ? 'si-op' : 'si-num'}`;
    el.textContent = v;
    sv.appendChild(el);
    // column-reverse CSS ki wajah se yeh UPAR stack hoga automatically
  });

  // Output queue render karo
  const ov = document.getElementById('output-vis');
  ov.innerHTML = '';
  s.output.forEach(v => {
    const el = document.createElement('span');
    const cls = isNum(String(v)) ? 'tok-num' : (v === '(' || v === ')') ? 'tok-paren' : 'tok-op';
    el.className = `token ${cls}`;
    el.textContent = v;
    ov.appendChild(el);
  });

  // Step log mein entry add karo
  const log = document.getElementById('step-log');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  // HTML formatting for colored text in log
  entry.innerHTML = `${curStep + 1}. ` + s.msg
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="num">$1</span>')
    .replace(/([+\-*/])/g, '<span class="op">$1</span>');
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight; // auto-scroll to bottom

  // Done phase mein result dikha do
  if (s.phase === 'done') {
    const rs = document.getElementById('result-section');
    rs.classList.remove('hidden');
    document.getElementById('result-num').textContent =
      Number.isInteger(s.result) ? s.result : s.result.toFixed(4);
    document.getElementById('postfix-display').textContent = 'Postfix: ' + s.postfix;
  }
}

// Step forward (Next button)
function stepForward() {
  if (curStep < steps.length - 1) {
    curStep++;
    renderStep();
  }
}

// Step backward (Prev button)
function stepBack() {
  if (curStep > 0) {
    curStep--;
    // Log clear karo aur re-render karo
    document.getElementById('step-log').innerHTML = '';
    document.getElementById('result-section').classList.add('hidden');
    // Saare steps 0 se curStep tak dobara replay karo log ke liye
    const savedStep = curStep;
    curStep = 0;
    for (let i = 0; i <= savedStep; i++) {
      curStep = i;
      renderStep();
    }
  }
}

// Run All — saare steps ek saath
function runAll() {
  while (curStep < steps.length - 1) {
    curStep++;
    renderStep();
  }
}