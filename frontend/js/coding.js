/**
 * coding.js – Coding round engine
 * Handles: question fetching, code editor, submission, and AI evaluation
 */

const API_BASE = ''; // Use relative paths

// ── State ─────────────────────────────────────────────────────────────
let CURRENT_QUESTION = null;
let CODE_CONTENT = '';

// ── DOM refs ──────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const loadingOverlay = $('loading-overlay');
const resultModal = $('result-modal');
const aiFeedback = $('ai-feedback');

// ── Load Question ─────────────────────────────────────────────────────
async function loadCodingQuestion() {
  loadingOverlay.style.display = 'flex';
  
  try {
    const res = await fetch(`${API_BASE}/api/coding/start`, { method: 'GET' });
    
    if (!res.ok) {
      throw new Error('Failed to load question.');
    }

    CURRENT_QUESTION = await res.json();
    renderQuestion();
    loadingOverlay.style.display = 'none';

  } catch (err) {
    loadingOverlay.innerHTML = `
      <div style="text-align: center; color: #ff5470;">
        <h2>⚠️ Error</h2>
        <p>${err.message}</p>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #6c63ff; color: white; border: none; border-radius: 8px; cursor: pointer;">
          Try Again
        </button>
      </div>
    `;
  }
}

// ── Render Question ──────────────────────────────────────────────────
function renderQuestion() {
  if (!CURRENT_QUESTION) return;

  const container = document.querySelector('.coding-container') || document.body;

  const html = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; height: 100vh; padding: 20px;">
      
      <!-- Left: Problem Statement -->
      <div style="overflow-y: auto; padding: 30px; background: rgba(255,255,255,0.05); border-radius: 15px;">
        <h2 style="color: var(--accent-light); margin-bottom: 10px;">${CURRENT_QUESTION.title}</h2>
        <div style="color: #a76bff; margin-bottom: 20px; font-size: 0.9rem;">
          <span style="background: rgba(167,107,255,0.2); padding: 5px 12px; border-radius: 20px;">
            ${CURRENT_QUESTION.difficulty} • ${CURRENT_QUESTION.category}
          </span>
        </div>
        
        <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 30px;">
          ${CURRENT_QUESTION.description}
        </p>

        <div style="background: rgba(108,99,255,0.1); padding: 20px; border-radius: 10px; border-left: 4px solid #6c63ff;">
          <h4 style="color: var(--accent-light); margin-bottom: 10px;">Starter Code:</h4>
          <pre style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; overflow-x: auto; color: #a3e635;">
<code>${CURRENT_QUESTION.starter_code}</code>
          </pre>
        </div>
      </div>

      <!-- Right: Code Editor -->
      <div style="display: flex; flex-direction: column; gap: 15px; padding: 30px; background: rgba(255,255,255,0.05); border-radius: 15px;">
        <h3 style="color: var(--text-primary); margin-bottom: 10px;">Write Your Solution</h3>
        
        <textarea 
          id="code-editor" 
          placeholder="Write your code here..."
          style="
            flex: 1;
            padding: 15px;
            background: rgba(0,0,0,0.4);
            color: #a3e635;
            border: 1px solid rgba(108,99,255,0.3);
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            font-size: 0.95rem;
            resize: none;
            outline: none;
          "
        >${CURRENT_QUESTION.starter_code || ''}</textarea>

        <div style="display: flex; gap: 15px;">
          <button onclick="submitCode()" style="
            flex: 1;
            padding: 12px;
            background: linear-gradient(135deg, #6c63ff, #a76bff);
            color: white;
            border: none;
            border-radius: 10px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            ✓ Submit Solution
          </button>
          
          <button onclick="location.href='/dashboard'" style="
            padding: 12px 30px;
            background: rgba(255,255,255,0.1);
            color: var(--text-primary);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
          " onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  
  // Store reference to code editor
  const editor = document.getElementById('code-editor');
  if (editor) {
    editor.addEventListener('input', (e) => {
      CODE_CONTENT = e.target.value;
    });
    CODE_CONTENT = editor.value;
  }
}

// ── Submit Code ───────────────────────────────────────────────────────
async function submitCode() {
  if (!CURRENT_QUESTION) {
    alert('No question loaded.');
    return;
  }

  if (!CODE_CONTENT.trim()) {
    alert('Please write some code before submitting.');
    return;
  }

  loadingOverlay.style.display = 'flex';
  loadingOverlay.innerHTML = `
    <div style="text-align: center;">
      <div class="spinner" style="width: 60px; height: 60px; border: 4px solid rgba(108,99,255,0.2); border-top-color: #6c63ff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; margin-bottom: 20px;"></div>
      <h2>Evaluating Your Code…</h2>
      <p style="color: var(--text-muted);">This may take a moment</p>
    </div>
  `;

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

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Submission failed.');
    }

    const evaluation = await res.json();
    showEvaluation(evaluation);

  } catch (err) {
    loadingOverlay.innerHTML = `
      <div style="text-align: center; color: #ff5470;">
        <h2>⚠️ Error</h2>
        <p>${err.message}</p>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #6c63ff; color: white; border: none; border-radius: 8px; cursor: pointer;">
          Try Again
        </button>
      </div>
    `;
  }
}

// ── Show Evaluation ───────────────────────────────────────────────────
function showEvaluation(evaluation) {
  loadingOverlay.style.display = 'none';

  const html = `
    <div style="position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); z-index: 1000;">
      <div style="
        background: linear-gradient(135deg, rgba(108,99,255,0.1), rgba(167,107,255,0.1));
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 20px;
        padding: 40px;
        max-width: 700px;
        max-height: 80vh;
        overflow-y: auto;
        backdrop-filter: blur(10px);
      ">
        <h1 style="color: var(--accent-light); margin-bottom: 20px;">✓ Evaluation Complete</h1>

        <div style="background: rgba(255,255,255,0.08); padding: 20px; border-radius: 15px; margin-bottom: 20px;">
          <h3 style="color: var(--accent-light); margin-bottom: 15px;">📝 Question</h3>
          <p style="color: var(--text-primary); font-weight: 600;">${CURRENT_QUESTION.title}</p>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 5px;">${CURRENT_QUESTION.category}</p>
        </div>

        <div style="background: rgba(255,255,255,0.08); padding: 20px; border-radius: 15px; margin-bottom: 20px;">
          <h3 style="color: var(--accent-light); margin-bottom: 15px;">🤖 AI Evaluation</h3>
          <p style="color: var(--text-secondary); line-height: 1.6; white-space: pre-wrap;">
            ${evaluation.evaluation || 'No evaluation available.'}
          </p>
        </div>

        <div style="display: flex; gap: 15px;">
          <button onclick="location.href='/dashboard'" style="
            flex: 1;
            padding: 12px;
            background: linear-gradient(135deg, #6c63ff, #a76bff);
            color: white;
            border: none;
            border-radius: 10px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            Back to Dashboard
          </button>
          
          <button onclick="location.reload()" style="
            flex: 1;
            padding: 12px;
            background: rgba(255,255,255,0.1);
            color: var(--text-primary);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
          " onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
            Try Another Problem
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}

// ── Initialize ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadCodingQuestion);
