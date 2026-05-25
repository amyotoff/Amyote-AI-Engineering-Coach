/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* Parse worker entry point.
 * Supports both worker_threads and child-process IPC so parsing can run
 * in an isolated process with its own heap limit.
 */

import { parentPort } from 'worker_threads';
import { stripSessionsForMemory } from './cache';
import { parseAllLogsAsyncDetailed, type LoadProgress } from './parser';
import { installRuntimeDebugHooks, runtimeDebug } from './runtime-debug';

interface ParseWorkerRequest {
  logsDirs?: string[];
}

interface ProgressMessage {
  type: 'progress';
  progress: LoadProgress;
}

const port = parentPort;
const canUseProcessChannel = typeof process.send === 'function';

if (!port && !canUseProcessChannel) throw new Error('parse-worker: no parent channel');

installRuntimeDebugHooks('parse-worker');
runtimeDebug('parse-worker', port ? 'thread-started' : 'process-started');

function send(msg: unknown): void {
  if (port) port.postMessage(msg);
  else if (canUseProcessChannel) process.send?.(msg);
}

function parseWorkerRequest(msg: unknown): ParseWorkerRequest {
  if (typeof msg !== 'object' || msg === null) return {};
  const candidate = msg as { logsDirs?: unknown };
  return {
    logsDirs: Array.isArray(candidate.logsDirs)
      ? candidate.logsDirs.filter((dir): dir is string => typeof dir === 'string')
      : undefined,
  };
}

function onMessage(handler: (msg: ParseWorkerRequest) => void | Promise<void>): void {
  if (port) {
    port.on('message', (msg) => {
      void handler(parseWorkerRequest(msg));
    });
    return;
  }
  process.on('message', (msg) => {
    void handler(parseWorkerRequest(msg));
  });
}

onMessage(async (msg) => {
  try {
    const logsDirs = Array.isArray(msg.logsDirs) ? msg.logsDirs : [];
    runtimeDebug('parse-worker', 'message-start', `logsDirs=${logsDirs.length}`);

    // Throttle verbose intra-workspace progress messages, but always send
    // phase changes, workspace grid plans, and workspace completion updates.
    let lastSendTime = 0;
    let lastPhase = -1;
    let pending: ProgressMessage | null = null;
    const flushPending = () => {
      if (pending) {
        send(pending);
        pending = null;
        lastSendTime = Date.now();
      }
    };

    const enabledHarnesses = process.env.ENABLED_HARNESSES ? JSON.parse(process.env.ENABLED_HARNESSES) : undefined;
    const { result, dirMetas } = await parseAllLogsAsyncDetailed(logsDirs, (progress) => {
      const progressMessage: ProgressMessage = { type: 'progress', progress };
      const now = Date.now();
      // Always send immediately for phase changes, workspace grid updates, or >= 100%.
      if (progress.phase !== lastPhase || progress.workspacePlan || progress.workspaceDone || progress.pct >= 100) {
        flushPending();
        send(progressMessage);
        lastPhase = progress.phase;
        lastSendTime = now;
        return;
      }
      if (now - lastSendTime >= 200) {
        send(progressMessage);
        lastSendTime = now;
        pending = null;
      } else {
        pending = progressMessage;
      }
    }, enabledHarnesses);
    // Flush any final pending progress before sending result.
    flushPending();

    // Keep full text only in the disk cache written by parseAllLogsAsyncDetailed.
    // The parent process receives the memory-efficient representation only.
    stripSessionsForMemory(result.sessions);

    runtimeDebug('parse-worker', 'message-result', `workspaces=${result.workspaces.size} sessions=${result.sessions.length}`);

    send({
      type: 'result',
      payload: {
        result: {
          workspaces: Array.from(result.workspaces.entries()),
          sessions: result.sessions,
          editLocIndex: Array.from(result.editLocIndex.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
          sessionSourceIndex: Array.from(result.sessionSourceIndex.entries()),
        },
        dirMetas,
      },
    });
  } catch (e) {
    runtimeDebug('parse-worker', 'message-error', e);
    send({
      type: 'error',
      message: e instanceof Error ? e.message : String(e),
    });
  }
});