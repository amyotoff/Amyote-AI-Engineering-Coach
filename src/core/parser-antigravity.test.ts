/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* Tests for the Antigravity session parser — verifies transcript.jsonl parsing,
 * model extraction, workspace name detection, and tool call tracking. */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect } from 'vitest';
import { parseAntigravitySessions } from './parser-antigravity';

/** Create a temporary brain directory with a single session transcript, run the test, then clean up. */
function withAntigravityTranscript(lines: object[], run: (brainDir: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'antigravity-parser-test-'));
  const sessionId = 'test-session-111';
  const logsDir = path.join(root, sessionId, '.system_generated', 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  const file = path.join(logsDir, 'transcript.jsonl');
  fs.writeFileSync(file, lines.map(l => JSON.stringify(l)).join('\n'), 'utf-8');
  try { run(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

describe('parseAntigravitySessions', () => {
  it('parses a basic session with USER_INPUT and MODEL steps', () => {
    withAntigravityTranscript([
      { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE',
        created_at: '2026-05-25T10:00:00Z',
        content: '<USER_REQUEST>\nПривет, помоги с кодом\n</USER_REQUEST>' },
      { step_index: 1, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE',
        created_at: '2026-05-25T10:00:05Z',
        content: 'Конечно! Вот решение:\n```typescript\nconsole.log("hello");\n```' },
    ], (brainDir) => {
      const sessions = parseAntigravitySessions(brainDir);
      expect(sessions).toHaveLength(1);
      const s = sessions[0];
      expect(s.harness).toBe('Antigravity');
      expect(s.sessionId).toBe('test-session-111');
      expect(s.requests).toHaveLength(1);
      expect(s.requests[0].messageText).toBe('Привет, помоги с кодом');
      expect(s.requests[0].responseText).toContain('console.log');
      expect(s.requests[0].agentName).toBe('Antigravity');
    });
  });

  it('extracts tool calls and edited files from MODEL steps', () => {
    withAntigravityTranscript([
      { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE',
        created_at: '2026-05-25T11:00:00Z',
        content: '<USER_REQUEST>\nОтредактируй файл\n</USER_REQUEST>' },
      { step_index: 1, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE',
        created_at: '2026-05-25T11:00:05Z',
        content: 'Редактирую файл...',
        tool_calls: [
          { name: 'replace_file_content', args: { TargetFile: '/Users/alice/proj/src/index.ts', ReplacementContent: 'new code' } },
          { name: 'run_command', args: { CommandLine: 'npm test' } },
        ] },
    ], (brainDir) => {
      const sessions = parseAntigravitySessions(brainDir);
      expect(sessions).toHaveLength(1);
      const req = sessions[0].requests[0];
      expect(req.toolsUsed).toEqual(['replace_file_content', 'run_command']);
      expect(req.editedFiles).toEqual(['/Users/alice/proj/src/index.ts']);
    });
  });

  it('extracts model ID from USER_SETTINGS_CHANGE events', () => {
    withAntigravityTranscript([
      { step_index: 0, source: 'SYSTEM', type: 'USER_INPUT', status: 'DONE',
        created_at: '2026-05-25T12:00:00Z',
        content: 'The user changed setting `Model Selection` from None to Claude Opus 4.6 (Thinking).' },
      { step_index: 1, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE',
        created_at: '2026-05-25T12:00:01Z',
        content: '<USER_REQUEST>\nтест\n</USER_REQUEST>' },
      { step_index: 2, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE',
        created_at: '2026-05-25T12:00:05Z',
        content: 'ответ' },
    ], (brainDir) => {
      const sessions = parseAntigravitySessions(brainDir);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].requests[0].modelId).toBe('Claude');
    });
  });

  it('falls back to "Antigravity" model when no settings change present', () => {
    withAntigravityTranscript([
      { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE',
        created_at: '2026-05-25T13:00:00Z',
        content: '<USER_REQUEST>\nтест\n</USER_REQUEST>' },
      { step_index: 1, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE',
        created_at: '2026-05-25T13:00:05Z',
        content: 'ответ' },
    ], (brainDir) => {
      const sessions = parseAntigravitySessions(brainDir);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].requests[0].modelId).toBe('Antigravity');
    });
  });

  it('handles multiple requests within a single session', () => {
    withAntigravityTranscript([
      { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE',
        created_at: '2026-05-25T14:00:00Z',
        content: '<USER_REQUEST>\nпервый запрос\n</USER_REQUEST>' },
      { step_index: 1, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE',
        created_at: '2026-05-25T14:00:05Z',
        content: 'ответ 1' },
      { step_index: 2, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE',
        created_at: '2026-05-25T14:01:00Z',
        content: '<USER_REQUEST>\nвторой запрос\n</USER_REQUEST>' },
      { step_index: 3, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE',
        created_at: '2026-05-25T14:01:05Z',
        content: 'ответ 2' },
    ], (brainDir) => {
      const sessions = parseAntigravitySessions(brainDir);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].requests).toHaveLength(2);
      expect(sessions[0].requests[0].messageText).toBe('первый запрос');
      expect(sessions[0].requests[1].messageText).toBe('второй запрос');
    });
  });

  it('returns empty array for non-existent brain directory', () => {
    const sessions = parseAntigravitySessions('/non/existent/path');
    expect(sessions).toEqual([]);
  });

  it('skips sessions without transcript.jsonl', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'antigravity-parser-test-'));
    const sessionDir = path.join(root, 'empty-session');
    fs.mkdirSync(sessionDir, { recursive: true });
    try {
      const sessions = parseAntigravitySessions(root);
      expect(sessions).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('extracts workspace name from file paths (cross-platform)', () => {
    withAntigravityTranscript([
      { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE',
        created_at: '2026-05-25T15:00:00Z',
        content: '<USER_REQUEST>\nтест\n</USER_REQUEST>\nOther open documents:\n- /Users/alice/my-project/src/index.ts' },
      { step_index: 1, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE',
        created_at: '2026-05-25T15:00:05Z',
        content: 'ok' },
    ], (brainDir) => {
      const sessions = parseAntigravitySessions(brainDir);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].workspaceName).toBe('my-project');
    });
  });
});
