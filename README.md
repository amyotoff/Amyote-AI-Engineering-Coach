<h1 align="center">🧠 AI Engineer Coach</h1>

<p align="center">
  <em>Fork of <a href="https://github.com/microsoft/ai-engineering-coach">microsoft/ai-engineering-coach</a> with <strong>Antigravity</strong> support &amp; security hardening.</em>
</p>

<p align="center">
<strong>better agentic engineering.</strong><br>
Analyze your AI coding assistant usage — any harness, one dashboard.
</p>

<p align="center">
<a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
<img alt="VS Code 1.118+" src="https://img.shields.io/badge/VS%20Code-1.118%2B-007ACC">
<img alt="Antigravity" src="https://img.shields.io/badge/harness-Antigravity-8B5CF6">
</p>

<br>

<p align="center">
  
https://github.com/user-attachments/assets/9f0239bf-20e0-459f-b137-17cce0edd1b2

</p>

---

## What's different in this fork

| Area | Change |
|------|--------|
| 🔌 **Antigravity harness** | New parser reads `~/.gemini/antigravity-ide/brain/` transcripts — sessions, tool calls, edited files |
| 🔒 **Secure API key** | `llmApiKey` moved from plaintext `settings.json` → VS Code **SecretStorage** |
| 🛡️ **Lint-clean parser** | Zero `any`, complexity ≤ 20, nesting ≤ 4, cross-platform workspace detection |
| 🧪 **Tests** | `parser-antigravity.test.ts` — 8 test cases covering parsing, tools, model extraction |
| ⏱️ **LLM timeout** | Custom LLM endpoint now respects `LLM_REQUEST_TIMEOUT_MS` (90 s) instead of hanging forever |
| 🐛 **Empty harnesses fix** | Worker no longer silently skips all parsing when `enabledHarnesses` is `undefined` |

---

## What it does

AI Engineer Coach reads your local AI session logs and turns them into actionable insights — no data leaves your machine.

- **Track progress** — practice scores, weekly trends, daily activity charts
- **Detect anti-patterns** — 45 rules across prompt quality, session hygiene, code review, tool mastery, and context management
- **Measure output** — AI-generated code volume by language, workspace, model, and harness
- **Discover skills** — find repeated prompts and turn them into reusable skills
- **Score context health** — agentic readiness checks, instruction-file audits, workspace context maps

<details>
<summary><strong>Screenshots</strong></summary>
<br>
<p align="center"><img src="assets/screen-timeline.png" alt="Timeline" width="820"></p>
<p align="center"><img src="assets/screen-output.png" alt="Code Output" width="820"></p>
<p align="center"><img src="assets/screen-consumption.png" alt="Premium Request Consumption" width="820"></p>
<p align="center"><img src="assets/screen-patterns-projects.png" alt="Activity Patterns - Projects" width="820"></p>
<p align="center"><img src="assets/screen-patterns-workhours.png" alt="Activity Patterns - Work Hours" width="820"></p>
<p align="center"><img src="assets/screen-antipatterns.png" alt="Anti-Patterns" width="820"></p>
<p align="center"><img src="assets/screen-skill-finder.png" alt="Skill Finder" width="820"></p>
<p align="center"><img src="assets/screen-context-quality.png" alt="Context Quality" width="820"></p>
<p align="center"><img src="assets/screen-context-management.png" alt="Context Management" width="820"></p>
<p align="center"><img src="assets/screen-learning.png" alt="Learning Center" width="820"></p>
<p align="center"><img src="assets/screen-achievements.png" alt="Achievements" width="820"></p>
<p align="center"><img src="assets/screen-sdlc.png" alt="Agentic SDLC" width="820"></p>
<p align="center"><img src="assets/screen-share.png" alt="Share Your Stats" width="820"></p>
</details>

---

## Quick Start

```bash
git clone https://github.com/amyotoff/Amyote-AI-Engineering-Coach.git
cd Amyote-AI-Engineering-Coach
npm install
npm run package
```

Then install the `.vsix`:

**macOS / Linux**

```bash
code --install-extension ai-engineer-coach-*.vsix
```

**Windows / PowerShell**

```powershell
code --install-extension (Get-ChildItem . -Filter 'ai-engineer-coach-*.vsix' | Select-Object -First 1).FullName
```

1. Open the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run **AI Engineer Coach: Open Dashboard**
3. Navigate pages from the sidebar, filter by workspace or harness

---

## Supported Harnesses

| Harness | Source |
|---------|--------|
| **VS Code** (GitHub Copilot) | Built-in chat & edit session logs |
| **Xcode** (Copilot for Xcode) | Copilot Xcode plugin databases |
| **Claude Code** | `~/.claude/` project sessions |
| **Codex CLI** | `~/.codex/sessions/` rollout logs |
| **OpenCode** | `~/.local/share/opencode/` sessions |
| **Antigravity** ⚡ | `~/.gemini/antigravity-ide/brain/` transcripts |

---

## Pages

### Observe

| Page | Description |
|------|-------------|
| **Dashboard** | Practice scores with week-over-week trends, daily activity chart, top workspace stats |
| **Timeline** | Gantt-style session timeline with per-day drill-down and overlap detection |
| **Coding Moments** | Screenshot gallery from AI coding sessions with story reels and workspace filtering |

### Measure

| Page | Description |
|------|-------------|
| **Output** | Generated code volume by language, model usage table |
| **Burndown** | Monthly AI token budget progress with projections *(temporarily disabled)* |
| **Patterns** | 7×24 activity heatmap and work-life balance signals |

### Improve

| Page | Description |
|------|-------------|
| **Anti-Patterns** | Five practice score cards with severity ratings, concrete actions, and example prompts. 45 editable markdown rules plus a coverage heatmap |
| **Rule Editor** | Create, edit, and tune detection rules visually or as raw markdown. Live-test against your data |
| **Rule Playground** | Interactive REPL for the rule DSL with field browser, function catalog, and metric list |
| **Data Explorer** | Browse session fields, view distributions, run ad-hoc filters |
| **Skill Finder** | Discover repeated prompt patterns and matching community skills from the open-source catalog |
| **Context Health** | Overall context score, agentic readiness checklist, workspace context map, AI-powered instruction-file review |

### Level Up

| Page | Description |
|------|-------------|
| **Learning Center** | Personalized quizzes and code-comparison rounds generated from your actual usage |
| **Achievements** | XP-based progression with Bronze → Silver → Gold → Diamond tiers |
| **Agentic SDLC** | How you use AI across the full software-development lifecycle |
| **Share** | Generate a shareable stat card |

---

## Configuration

### VS Code Settings (`Cmd+,` / `Ctrl+,`)

| Setting | Description |
|---------|-------------|
| **`aiEngineerCoach.enabledHarnesses`** | Select which AI assistant logs to parse. Uncheck "VS Code" to skip Copilot's large logs and focus on Antigravity, Claude, Codex, etc. |
| **`aiEngineerCoach.llmEndpoint`** | Custom OpenAI-compatible LLM endpoint (e.g. `http://localhost:11434/v1/chat/completions` for Ollama). If empty, uses GitHub Copilot's built-in model. |
| **`aiEngineerCoach.llmModel`** | Model ID for the custom endpoint (e.g. `llama3`, `gemini-2.5-pro`). |

### Commands (`Cmd+Shift+P` / `Ctrl+Shift+P`)

| Command | Description |
|---------|-------------|
| **AI Engineer Coach: Open Dashboard** | Launch the main dashboard |
| **AI Engineer Coach: Reload Data** | Force re-parse all session logs |
| **AI Engineer Coach: Set Custom LLM API Key** | Securely store your API key in VS Code SecretStorage (never written to `settings.json`) |
| **AI Engineer Coach: Review Local Rule Approvals** | Approve or revoke trust for custom rule files found on disk |

---

## Privacy & Security

- **Local by default** — data leaves your machine only when you explicitly invoke an AI-powered feature or configure a custom LLM endpoint. All session parsing, analytics, and dashboards run entirely on your machine.
- **Read-only** — the extension never modifies your session files
- **No telemetry** — the extension does not phone home or collect usage data
- **Secure key storage** — custom LLM API keys are stored in VS Code SecretStorage, not in plaintext settings
- **Restricted external links** — the dashboard can only open `https://` links to a fixed allowlist of hosts (GitHub and social-share sites); arbitrary URIs are rejected

### Which features send data to an LLM

The AI-powered features below send the relevant context (session metadata, code snippets, prompts) to the configured language model — VS Code's built-in Copilot model by default, or your **custom LLM endpoint** if set. Everything else stays local.

- **Skill authoring** — generating or filling in skill content
- **Learning quizzes** — generating practice questions from your sessions
- **Resource recommendations** — suggesting docs/articles relevant to your work
- **Code comparisons & "Did You Know" insights** — generating snippet comparisons and tips
- **AI triage & catalog discovery** — ranking skills and discovering catalog items
- **Context / memory review** — extracting facts and reviewing rule/context files
- **Explanations & SDLC analysis** — on-demand explanations and SDLC tool/repo analysis

These run only when you explicitly trigger them. If neither Copilot nor a custom endpoint is available, the features are skipped and no data is sent.

---

## Upstream

This fork tracks [microsoft/ai-engineering-coach](https://github.com/microsoft/ai-engineering-coach). Original project by Sanjay Singh, Joy Distelbrink, Tamas Boncz, and Aymen Furter.

## License

[MIT](LICENSE)

## Disclaimer

This project is based on an open-source community effort by Microsoft employees. It is **not** an official Microsoft product and is not part of any Microsoft service or support offering. It is provided as-is with no warranties or guarantees.
