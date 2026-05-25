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
        results.push(JSON.parse(line) as AntigravityStep);
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
  if (toolName === 'replace_file_content' || toolName === 'multi_replace_file_content' || toolName === 'write_to_file') {
    return args.TargetFile as string || null;
  }
  return null;
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
    const sessionId = entry.name;
    const transcriptPath = path.join(brainDir, sessionId, '.system_generated', 'logs', 'transcript.jsonl');
    if (!fs.existsSync(transcriptPath)) continue;

    const steps = readJsonlSafe(transcriptPath);
    if (steps.length === 0) continue;

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
        // Finalize previous
        if (currentRequest) {
          requests.push(currentRequest);
        }

        // Try to extract workspace from metadata
        const metadataMatch = step.content?.match(/Other open documents:[\s\S]*- \/Users\/[^/]+\/([^/]+)/);
        if (metadataMatch && metadataMatch[1]) {
          wsName = metadataMatch[1];
        }

        // Extract <USER_REQUEST>...</USER_REQUEST>
        let msgText = step.content || '';
        const reqMatch = msgText.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
        if (reqMatch) {
          msgText = reqMatch[1].trim();
        }

        currentRequest = createRequest({
          requestId: `step-${step.step_index}`,
          timestamp: ts,
          messageText: msgText,
          responseText: '',
          agentName: 'Antigravity',
          agentMode: 'agent',
          modelId: 'Gemini', // Assume Gemini based on Antigravity
          toolsUsed: [],
          editedFiles: [],
          referencedFiles: [],
        });
      } else if (currentRequest && step.source === 'MODEL') {
        if (step.content && typeof step.content === 'string') {
          // If responseText is empty, just assign. If not, append.
          if (currentRequest.responseText) {
            currentRequest.responseText += '\n\n' + step.content;
          } else {
            currentRequest.responseText = step.content;
          }
        }

        if (step.tool_calls && Array.isArray(step.tool_calls)) {
          for (const tc of step.tool_calls) {
            if (tc.name) currentRequest.toolsUsed.push(tc.name);
            if (tc.args) {
              const file = extractTargetFileFromArgs(tc.name, tc.args);
              if (file && !currentRequest.editedFiles.includes(file)) {
                currentRequest.editedFiles.push(file);
              }
            }
          }
        }
      }
    }

    if (currentRequest) {
      requests.push(currentRequest);
    }

    if (requests.length === 0) continue;

    sessions.push(createSession({
      sessionId,
      workspaceId: `antigravity-${wsName}`,
      workspaceName: wsName,
      location: 'terminal',
      harness: 'Antigravity',
      creationDate: firstTs,
      lastMessageDate: lastTs,
      requests,
      hasDevcontainer: false,
    }));
  }

  return sessions;
}
