/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* Antigravity session parser
 *
 * Data layout:
 *   ~/.gemini/antigravity-ide/brain/<session-id>/.system_generated/logs/transcript.jsonl
 *
 * Each session has a transcript JSONL. Each line is an agent step.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Session, SessionRequest } from './types';
import { assertTrustedPath, createRequest, createSession } from './parser-shared';

interface AntigravityStep {
  step_index: number;
  source: string;
  type: string;
  status: string;
  created_at: string;
  content?: string;
  thinking?: string;
  tool_calls?: Array<{ name: string; args: Record<string, unknown> }>;
}

export function findAntigravityDirs(): string[] {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const p = path.join(home, '.gemini', 'antigravity-ide', 'brain');
  return fs.existsSync(p) ? [p] : [];
}

function readJsonlSafe(filePath: string): AntigravityStep[] {
  const results: AntigravityStep[] = [];
  try {
    assertTrustedPath(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const parsed: unknown = JSON.parse(line);
        if (parsed && typeof parsed === 'object') {
          results.push(parsed as AntigravityStep);
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    /* ignore unreadable */
  }
  return results;
}

function extractTargetFileFromArgs(toolName: string, args: Record<string, unknown>): string | null {
  const editTools = new Set(['replace_file_content', 'multi_replace_file_content', 'write_to_file']);
  if (editTools.has(toolName)) {
    const target = args.TargetFile;
    return typeof target === 'string' ? target : null;
  }
  return null;
}

/**
 * Attempt to extract a workspace name from transcript content.
 * Works cross-platform: handles Unix (/Users/x/ or /home/x/) and Windows (C:\Users\x\) paths.
 */
function extractWorkspaceName(content: string | undefined): string | null {
  if (!content) return null;
  // Cross-platform: match /Users/<user>/<workspace> or /home/<user>/<workspace> or C:\Users\<user>\<workspace>
  const match = content.match(/(?:\/Users\/[^/]+\/|\/home\/[^/]+\/|[A-Z]:\\Users\\[^\\]+\\)([^/\\\s]+)/);
  return match?.[1] ?? null;
}

/**
 * Attempt to extract the model name from a USER_SETTINGS_CHANGE step or
 * other metadata in the transcript.
 */
function extractModelId(steps: AntigravityStep[]): string {
  for (const step of steps) {
    if (!step.content) continue;
    // Look for Model Selection changes e.g. "changed setting `Model Selection` from ... to Claude Opus 4.6"
    const settingsMatch = step.content.match(/Model Selection.*?to\s+(.+?)[\s.()]/);
    if (settingsMatch) {
      return settingsMatch[1].trim();
    }
  }
  return 'Antigravity'; // fallback — don't assume Gemini
}

/** Collect tool usage and edited files from a MODEL step into the current request. */
function processModelStep(step: AntigravityStep, request: SessionRequest): void {
  if (step.content && typeof step.content === 'string') {
    request.responseText = request.responseText
      ? `${request.responseText}\n\n${step.content}`
      : step.content;
  }

  if (!step.tool_calls || !Array.isArray(step.tool_calls)) return;

  for (const tc of step.tool_calls) {
    if (tc.name) request.toolsUsed.push(tc.name);
    if (!tc.args) continue;
    const file = extractTargetFileFromArgs(tc.name, tc.args);
    if (file && !request.editedFiles.includes(file)) {
      request.editedFiles.push(file);
    }
  }
}

export function parseAntigravitySessions(brainDir: string): Session[] {
  const sessions: Session[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(brainDir, { withFileTypes: true });
  } catch {
    return sessions;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const session = parseOneSession(brainDir, entry.name);
    if (session) sessions.push(session);
  }

  return sessions;
}

function parseOneSession(brainDir: string, sessionId: string): Session | null {
  const transcriptPath = path.join(brainDir, sessionId, '.system_generated', 'logs', 'transcript.jsonl');
  if (!fs.existsSync(transcriptPath)) return null;

  const steps = readJsonlSafe(transcriptPath);
  if (steps.length === 0) return null;

  const modelId = extractModelId(steps);
  const requests: SessionRequest[] = [];
  let currentRequest: SessionRequest | null = null;
  let firstTs: number | null = null;
  let lastTs: number | null = null;
  let wsName = 'Antigravity Workspace';

  for (const step of steps) {
    const ts = step.created_at ? new Date(step.created_at).getTime() : null;
    if (ts && (!firstTs || ts < firstTs)) firstTs = ts;
    if (ts && (!lastTs || ts > lastTs)) lastTs = ts;

    if (step.type === 'USER_INPUT') {
      if (currentRequest) requests.push(currentRequest);

      const extracted = extractWorkspaceName(step.content);
      if (extracted) wsName = extracted;

      // Extract <USER_REQUEST>...</USER_REQUEST>
      let msgText = step.content || '';
      const reqMatch = msgText.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
      if (reqMatch) msgText = reqMatch[1].trim();

      currentRequest = createRequest({
        requestId: `step-${step.step_index}`,
        timestamp: ts,
        messageText: msgText,
        responseText: '',
        agentName: 'Antigravity',
        agentMode: 'agent',
        modelId,
        toolsUsed: [],
        editedFiles: [],
        referencedFiles: [],
      });
    } else if (currentRequest && step.source === 'MODEL') {
      processModelStep(step, currentRequest);
    }
  }

  if (currentRequest) requests.push(currentRequest);
  if (requests.length === 0) return null;

  return createSession({
    sessionId,
    workspaceId: `antigravity-${wsName}`,
    workspaceName: wsName,
    location: 'terminal',
    harness: 'Antigravity',
    creationDate: firstTs,
    lastMessageDate: lastTs,
    requests,
    hasDevcontainer: false,
  });
}
