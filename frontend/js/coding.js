/**
 * coding.js – Coding round engine
 * Handles: question fetching, code editor, submission, and AI evaluation
 * INTEGRATED WITH AntiCheat module
 */

const API_BASE = ''; // Use relative paths

// ── State ─────────────────────────────────────────────────────────────
let CURRENT_QUESTION = null;
let CODE_CONTENT = '';
let ROUND_ACTIVE = false;

// ── DOM refs ──────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const loadingOverlay = $('loading-overlay');
const mainContainer = $('main-container');
const loadingTitle = $('loading-title');
const loadingMsg = $('loading-msg');
const spinner = $('loading-spinner');
const startConfirm = $('start-confirm');
const startBtn = $('real-start-btn');
const terminatedOverlay = $('terminated-overlay');
const terminateReason = $('terminate-reason');

// ── Load Question ─────────────────────────────────────────────────────
async function loadCodingQuestion() {
  try {
    const res = await fetch(`${API_BASE}/api/coding/start`, { method: 'GET' });
    
    if (!res.ok) throw new Error('Failed to load question.');

    CURRENT_QUESTION = await res.json();
    
    // Show start confirm instead of auto-starting
    spinner.classList.add('hidden');
    loadingTitle.textContent = 'Coding Challenge Ready';
    loadingMsg.textContent = 'This round requires fullscreen. Tab switching or exiting fullscreen will terminate the session.';
    startConfirm.classList.remove('hidden');

  } catch (err) {
    loadingTitle.textContent = '⚠️ Error';
    loadingMsg.textContent = err.message;
    loadingMsg.style.color = '#ff5470';
    spinner.classList.add('hidden');
  }
}

// ── Start Round (Fullscreen + AntiCheat) ──────────────────────────
startBtn.addEventListener('click', async () => {
  const ok = await AntiCheat.requestFullscreen(document.documentElement);
  if (!ok) {
    alert('Fullscreen is required to enter the coding round.');
    return;
  }

  ROUND_ACTIVE = true;
  loadingOverlay.classList.add('hidden');
  mainContainer.classList.remove('hidden');

  // We don't have a backend session_id for coding yet, so we use a dummy
  AntiCheat.start('coding_round', onTerminated);
  
  renderQuestion();
});

function onTerminated(reason) {
  ROUND_ACTIVE = false;
  mainContainer.classList.add('hidden');
  
  const messages = {
    tab_switch: 'You switched tabs or windows.',
    window_blur: 'Focus was lost from the coding window.',
    fullscreen_exit: 'You exited fullscreen mode.',
    page_close: 'The page was closed.'
  };

  terminateReason.textContent = messages[reason] || 'A security rule was violated.';
  terminatedOverlay.classList.remove('hidden');
}

// ── Render Question ──────────────────────────────────────────────────
function renderQuestion() {
  if (!CURRENT_QUESTION) return;

  const html = `
    <div class="coding-layout">
      
      <!-- Left: Problem Statement -->
      <div class="panel">
        <h2 style="color: #6c63ff; margin-bottom: 10px;">${CURRENT_QUESTION.title}</h2>
        <div style="margin-bottom: 20px;">
          <span style="background: rgba(108,99,255,0.2); padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; color: #a76bff;">
            ${CURRENT_QUESTION.difficulty} • ${CURRENT_QUESTION.category}
          </span>
        </div>
        
        <div class="problem-content">
          <p>${CURRENT_QUESTION.description.replace(/\n/g, '<br>')}</p>
        </div>

        <div style="background: rgba(108,99,255,0.1); padding: 20px; border-radius: 12px; border-left: 4px solid #6c63ff; margin-top: 30px;">
          <h4 style="margin-bottom: 10px; color: #6c63ff;">Starter Code:</h4>
          <pre style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; overflow-x: auto; color: #a3e635; font-size: 0.9rem;"><code>${CURRENT_QUESTION.starter_code}</code></pre>
        </div>
      </div>

      <!-- Right: Code Editor -->
      <div class="panel">
        <h3 style="margin-bottom: 15px;">Write Your Solution</h3>
        
        <div class="editor-container" style="flex: 1; display: flex; flex-direction: column;">
          <textarea 
            id="code-editor" 
            placeholder="# Write your Python code here..."
          >${CURRENT_QUESTION.starter_code || ''}</textarea>

          <div style="display: flex; gap: 15px; margin-top: 5px;">
            <button onclick="submitCode()" class="btn-primary" style="flex: 1;">
              ✓ Submit Solution
            </button>
            
            <button onclick="confirmExit()" style="padding: 0 25px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; cursor: pointer;">
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  mainContainer.innerHTML = html;
  
  const editor = $('code-editor');
  if (editor) {
    editor.addEventListener('input', (e) => {
      CODE_CONTENT = e.target.value;
    });
    CODE_CONTENT = editor.value;
  }
}

function confirmExit() {
  if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
    AntiCheat.stop();
    location.href = '/dashboard';
  }
}

// ── Submit Code ───────────────────────────────────────────────────────
async function submitCode() {
  if (!CODE_CONTENT.trim()) {
    alert('Please write some code before submitting.');
    return;
  }

  // Stop anti-cheat so we can show result modal (which might trigger blur/focus issues if not handled)
  AntiCheat.stop();

  loadingOverlay.classList.remove('hidden');
  spinner.classList.remove('hidden');
  loadingTitle.textContent = 'Evaluating...';
  loadingMsg.textContent = 'AI is analyzing your logic and efficiency.';
  startConfirm.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/api/coding/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: CURRENT_QUESTION.id,
        code: CODE_CONTENT,
        language: 'python',
        email: localStorage.getItem('user_email') || ''
      }),
    });

    if (!res.ok) throw new Error('Submission failed.');

    const evaluation = await res.json();
    showEvaluation(evaluation);

  } catch (err) {
    loadingTitle.textContent = '⚠️ Error';
    loadingMsg.textContent = err.message;
    spinner.classList.add('hidden');
    // Allow restart or resume if error
    setTimeout(() => location.reload(), 3000);
  }
}

// ── Show Evaluation ───────────────────────────────────────────────────
function showEvaluation(evaluation) {
  loadingOverlay.classList.add('hidden');

  const html = `
    <div class="overlay">
      <div class="test-card" style="max-width: 800px; max-height: 85vh; overflow-y: auto;">
        <h1 style="color: #6c63ff; margin-bottom: 25px;">Assessment Complete</h1>

        <div style="background: rgba(108,99,255,0.05); padding: 25px; border-radius: 15px; text-align: left; margin-bottom: 25px;">
          <h3 style="color: #6c63ff; margin-bottom: 10px;">${CURRENT_QUESTION.title}</h3>
          <p style="color: var(--text-secondary); white-space: pre-wrap; line-height: 1.7;">
            ${evaluation.evaluation}
          </p>
        </div>

        <div style="display: flex; gap: 15px;">
          <button onclick="location.href='/dashboard'" class="btn-primary" style="flex: 1;">
            Back to Dashboard
          </button>
          <button onclick="location.reload()" style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 14px; border-radius: 12px; cursor: pointer; font-weight: 700;">
            Try Another
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}

// ── Initialize ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadCodingQuestion);
