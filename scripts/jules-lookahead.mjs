#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_ORIGIN = "https://jules.googleapis.com";
const API_VERSION = "v1alpha";
const API_SCHEMA_CHECKED = "2026-07-20";
const KEYCHAIN_SERVICE = "codex-jules-api";
const OWNER = "Phazzie";
const REPOSITORY = "WhispersAndFlames";
const STARTING_BRANCH = "production/core-foundation";
const CODE_BASE_SHA = "a0cae22b228e2d0f655b37aa140bf3e0bd70b80e";
const TERMINAL_STATES = new Set(["COMPLETED", "FAILED"]);
const KNOWN_STATES = new Set([
  "STATE_UNSPECIFIED",
  "QUEUED",
  "PLANNING",
  "AWAITING_PLAN_APPROVAL",
  "AWAITING_USER_FEEDBACK",
  "IN_PROGRESS",
  "PAUSED",
  "FAILED",
  "COMPLETED",
]);

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");

const packets = [
  {
    id: "WF-JULES-H1-ARCH-001",
    label: "Production architecture hostile review",
    file: "docs/jules/HORIZON_1_ARCHITECTURE_REVIEW.md",
    requiredSections: [
      "BASE_EVIDENCE",
      "VERDICT",
      "FINDINGS",
      "FREEZE_MANIFEST",
      "FIRST_PRODUCTION_SLICE",
      "OPEN_QUESTIONS",
      "NO_CHANGE_ATTESTATION",
    ],
  },
  {
    id: "WF-JULES-H2-PRIVACY-001",
    label: "Privacy recovery and accessibility test oracle",
    file: "docs/jules/HORIZON_2_PRIVACY_TEST_ORACLE.md",
    requiredSections: [
      "BASE_EVIDENCE",
      "ORACLE_ASSUMPTIONS",
      "REQUIREMENT_TEST_MAP",
      "DETERMINISTIC_FIXTURES",
      "CONCURRENCY_SCHEDULES",
      "PROJECTION_LEAKAGE_MATRIX",
      "ACCESSIBILITY_ORACLE",
      "BLOCKED_ORACLES",
      "TOP_TEN_FIRST",
      "CONTRACT_GAPS",
      "NO_CHANGE_ATTESTATION",
    ],
  },
  {
    id: "WF-JULES-H3-DATA-001",
    label: "RLS realtime retention and cleanup attack design",
    file: "docs/jules/HORIZON_3_RLS_RETENTION_ATTACK_DESIGN.md",
    requiredSections: [
      "BASE_EVIDENCE",
      "DATA_CLASSIFICATION",
      "MINIMUM_SCHEMA_SHAPE",
      "RLS_GRANT_MATRIX",
      "RPC_ATOMICITY_MATRIX",
      "ATTACK_CATALOG",
      "REALTIME_PROOF",
      "RETENTION_STATE_MACHINE",
      "LOCAL_TEST_HARNESS",
      "FREEZE_BLOCKERS",
      "NO_CHANGE_ATTESTATION",
    ],
  },
];

function fail(message) {
  throw new Error(message);
}

function runGit(args, options = {}) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
    ...options,
  }).trim();
}

function gitPath(relativePath) {
  const path = runGit(["rev-parse", "--git-path", relativePath]);
  return resolve(repositoryRoot, path);
}

const stateDirectory = gitPath("jules-lookahead");
const statePath = join(stateDirectory, "state.json");
const resultsDirectory = join(stateDirectory, "results");
const launchLockPath = join(stateDirectory, "launch.lock");

let cachedApiKey;

function readState() {
  try {
    const parsed = JSON.parse(readFileSync(statePath, "utf8"));
    if (parsed.schemaVersion !== 1 || typeof parsed.sessions !== "object") {
      fail(`Unsupported controller state schema in ${statePath}`);
    }
    return parsed;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return {
      schemaVersion: 1,
      apiVersion: API_VERSION,
      apiSchemaChecked: API_SCHEMA_CHECKED,
      sessions: {},
    };
  }
}

function writeState(state) {
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  });
}

function getApiKey() {
  if (cachedApiKey) return cachedApiKey;
  const environmentKey = process.env.JULES_API_KEY?.trim();
  if (environmentKey) {
    cachedApiKey = environmentKey;
    return cachedApiKey;
  }

  try {
    const keychainKey = execFileSync(
      "/usr/bin/security",
      ["find-generic-password", "-w", "-s", KEYCHAIN_SERVICE],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 10_000,
      },
    ).trim();
    if (keychainKey) {
      cachedApiKey = keychainKey;
      return cachedApiKey;
    }
  } catch {
    // The caller receives a safe setup instruction below. Never print a key.
  }

  fail(
    `Jules API key unavailable. Generate it in Jules settings and store it in macOS Keychain service '${KEYCHAIN_SERVICE}'; never paste it into chat or the repository.`,
  );
}

function acquireLaunchLock() {
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  let descriptor;
  try {
    descriptor = openSync(launchLockPath, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") {
      fail(
        `Another launch may be active; inspect and remove stale lock only after proving no launch process remains: ${launchLockPath}`,
      );
    }
    throw error;
  }
  writeFileSync(
    descriptor,
    `${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`,
  );
  return () => {
    closeSync(descriptor);
    unlinkSync(launchLockPath);
  };
}

function asObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`Jules ${API_VERSION} schema drift: ${label} is not an object`);
  }
  return value;
}

function asString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`Jules ${API_VERSION} schema drift: ${label} is not a non-empty string`);
  }
  return value;
}

function validateSession(value, { requireState = true } = {}) {
  const session = asObject(value, "session");
  asString(session.name, "session.name");
  asString(session.id, "session.id");
  asString(session.title, "session.title");
  let state = session.state;
  if (!requireState && (state === undefined || state === null || state === "")) {
    state = "STATE_UNSPECIFIED";
    session.state = state;
  } else {
    state = asString(state, "session.state");
  }
  if (!KNOWN_STATES.has(state)) {
    fail(`Jules ${API_VERSION} schema drift: unknown session state '${state}'`);
  }
  return session;
}

async function apiRequest(path, { method = "GET", body } = {}) {
  const key = getApiKey();
  const response = await fetch(`${API_ORIGIN}/${API_VERSION}${path}`, {
    method,
    headers: {
      "x-goog-api-key": key,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  const text = await response.text();
  let parsed = {};
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      fail(
        `Jules API returned non-JSON data (HTTP ${response.status}); refusing to interpret an unknown schema`,
      );
    }
  }

  if (!response.ok) {
    const safeMessage =
      typeof parsed?.error?.message === "string"
        ? parsed.error.message
        : `HTTP ${response.status}`;
    fail(`Jules API request failed: ${safeMessage}`);
  }

  return parsed;
}

async function listAll(path, collectionName) {
  const all = [];
  let pageToken;
  do {
    const parameters = new URLSearchParams({ pageSize: "100" });
    if (pageToken) parameters.set("pageToken", pageToken);
    const page = asObject(
      await apiRequest(`${path}?${parameters.toString()}`),
      `${collectionName} page`,
    );
    const values = page[collectionName] ?? [];
    if (!Array.isArray(values)) {
      fail(`Jules ${API_VERSION} schema drift: ${collectionName} is not an array`);
    }
    all.push(...values);
    pageToken = page.nextPageToken;
    if (pageToken !== undefined && typeof pageToken !== "string") {
      fail(`Jules ${API_VERSION} schema drift: nextPageToken is not a string`);
    }
  } while (pageToken);
  return all;
}

function resolveRemoteHead() {
  const ref = `refs/heads/${STARTING_BRANCH}`;
  const output = runGit(["ls-remote", "--heads", "origin", ref]);
  const [sha, returnedRef, ...extra] = output.split(/\s+/);
  if (!sha || returnedRef !== ref || extra.length > 0) {
    fail(`Could not resolve exactly one remote ${ref}`);
  }

  try {
    runGit(["cat-file", "-e", `${sha}^{commit}`]);
    runGit(["merge-base", "--is-ancestor", CODE_BASE_SHA, sha]);
  } catch {
    fail(
      `Remote head ${sha} is not a locally known descendant of production-code base ${CODE_BASE_SHA}; fetch and inspect before launch`,
    );
  }

  const changedPaths = runGit([
    "diff",
    "--name-only",
    `${CODE_BASE_SHA}..${sha}`,
  ])
    .split("\n")
    .filter(Boolean);
  const forbidden = changedPaths.filter(
    (path) =>
      path !== "PROJECT_STATUS.md" &&
      path !== "docs/PRODUCTION_CORE_EXEC_PLAN.md" &&
      path !== "scripts/jules-lookahead.mjs" &&
      !path.startsWith("docs/jules/"),
  );
  if (forbidden.length > 0) {
    fail(
      `Remote branch contains non-control changes after ${CODE_BASE_SHA}: ${forbidden.join(", ")}`,
    );
  }

  return { sha, changedPaths };
}

async function resolveSource() {
  const sources = await listAll("/sources", "sources");
  const matches = sources.filter(
    (source) =>
      source?.githubRepo?.owner === OWNER &&
      source?.githubRepo?.repo === REPOSITORY,
  );
  if (matches.length !== 1) {
    fail(
      `Expected one connected Jules source for ${OWNER}/${REPOSITORY}; found ${matches.length}`,
    );
  }
  const source = asObject(matches[0], "source");
  asString(source.name, "source.name");
  const branches = source.githubRepo?.branches;
  if (
    Array.isArray(branches) &&
    !branches.some((branch) => branch?.displayName === STARTING_BRANCH)
  ) {
    fail(`Jules source does not currently advertise branch ${STARTING_BRANCH}`);
  }
  return source;
}

function selectPackets(selector = "all") {
  if (selector === "all") return packets;
  const packet = packets.find((candidate) => candidate.id === selector);
  if (!packet) {
    fail(`Unknown packet '${selector}'. Use one of: ${packets.map((p) => p.id).join(", ")}`);
  }
  return [packet];
}

function readRemotePacket(packet, sourceSha) {
  let task;
  let blobSha;
  try {
    task = runGit(["show", `${sourceSha}:${packet.file}`]);
    blobSha = runGit(["rev-parse", `${sourceSha}:${packet.file}`]);
  } catch {
    fail(
      `${packet.id} packet is not committed at remote source SHA ${sourceSha}; commit/push before launch`,
    );
  }
  return { task, blobSha };
}

function buildPrompt(packet, sourceSha, changedPaths) {
  const { task, blobSha } = readRemotePacket(packet, sourceSha);
  const prompt = [
    "WHISPERS AND FLAMES JULES CONTROL HEADER",
    `PACKET_ID: ${packet.id}`,
    `PACKET_BLOB_SHA: ${blobSha}`,
    `EXPECTED_SESSION_SOURCE_SHA: ${sourceSha}`,
    `FROZEN_PRODUCTION_CODE_BASE_SHA: ${CODE_BASE_SHA}`,
    `EXPECTED_BRANCH: ${STARTING_BRANCH}`,
    `EXPECTED_CONTROL_DELTA_JSON: ${JSON.stringify(changedPaths)}`,
    `API_VERSION: ${API_VERSION}`,
    "PLAN_APPROVAL_REQUIRED: true",
    "AUTOMATIC_PR: forbidden and disabled",
    "CHANGESET_ARTIFACTS: forbidden; any such artifact invalidates the result",
    "FINAL_CONTROL_JSON: required exactly once in the final agent message and validated literally",
    "This is pre-freeze advisory analysis. It cannot be promoted as implementation.",
    "--- BEGIN AUTHORITATIVE PACKET ---",
    task,
    "--- END AUTHORITATIVE PACKET ---",
  ].join("\n");
  return { prompt, blobSha };
}

function sessionTitle(packet, sourceSha) {
  return `${packet.id} @ ${sourceSha.slice(0, 12)} — ${packet.label}`;
}

async function listSessions() {
  return (await listAll("/sessions", "sessions")).map((session) =>
    validateSession(session, { requireState: false }),
  );
}

async function listActivities(sessionId) {
  const activities = await listAll(
    `/sessions/${encodeURIComponent(sessionId)}/activities`,
    "activities",
  );
  return activities
    .map((activity, index) => {
      const validated = asObject(activity, `activity[${index}]`);
      asString(validated.id, `activity[${index}].id`);
      asString(validated.createTime, `activity[${index}].createTime`);
      return validated;
    })
    .sort((left, right) => left.createTime.localeCompare(right.createTime));
}

async function check() {
  const { sha, changedPaths } = resolveRemoteHead();
  const source = await resolveSource();
  console.log(`Ready: ${OWNER}/${REPOSITORY}`);
  console.log(`Source: ${source.name}`);
  console.log(`Branch: ${STARTING_BRANCH}`);
  console.log(`Remote source SHA: ${sha}`);
  console.log(`Production-code base: ${CODE_BASE_SHA}`);
  console.log(
    `Allowed control delta: ${changedPaths.length === 0 ? "none" : changedPaths.join(", ")}`,
  );
  console.log(`API schema: ${API_VERSION}, checked ${API_SCHEMA_CHECKED}`);
}

async function launchUnlocked(selector) {
  const selected = selectPackets(selector);
  const { sha, changedPaths } = resolveRemoteHead();
  const source = await resolveSource();
  const state = readState();
  const remoteSessions = await listSessions();

  for (const packet of selected) {
    const latestRemote = resolveRemoteHead();
    if (
      latestRemote.sha !== sha ||
      !sameStringArray(latestRemote.changedPaths, changedPaths)
    ) {
      fail(
        `Remote ${STARTING_BRANCH} moved during launch preparation; no further sessions were created`,
      );
    }
    const title = sessionTitle(packet, sha);
    const { prompt, blobSha } = buildPrompt(packet, sha, changedPaths);
    const stateEntry = state.sessions[packet.id];
    const packetMatches = remoteSessions.filter((session) =>
      session.title.startsWith(`${packet.id} @ `),
    );
    if (packetMatches.length > 1) {
      fail(
        `${packet.id} has ${packetMatches.length} remote sessions; approve none until manually reconciled`,
      );
    }
    const remoteMatch = packetMatches[0];

    if (stateEntry?.id && stateEntry.title !== title) {
      fail(
        `${packet.id} is already bound to source ${stateEntry.sourceSha}; use a new packet revision ID instead of overwriting history`,
      );
    }

    if (remoteMatch && remoteMatch.title !== title) {
      fail(
        `${packet.id} already exists at another source SHA; use a new packet revision ID instead of launching it again`,
      );
    }

    if (remoteMatch) {
      state.sessions[packet.id] = {
        ...stateEntry,
        packetId: packet.id,
        packetFile: packet.file,
        packetBlobSha: blobSha,
        sourceSha: sha,
        changedPaths,
        title,
        name: remoteMatch.name,
        id: remoteMatch.id,
        url: remoteMatch.url,
        state: remoteMatch.state,
        reconciledAt: new Date().toISOString(),
      };
      writeState(state);
      console.log(`${packet.id}: existing ${remoteMatch.state} session ${remoteMatch.id}`);
      continue;
    }

    if (stateEntry?.id) {
      fail(
        `${packet.id} state references session ${stateEntry.id}, but it was not returned by Jules; reconcile deletion/account state manually before any retry`,
      );
    }

    if (stateEntry?.launchStatus === "POSTING") {
      fail(
        `${packet.id} has an ambiguous prior POST recorded at ${stateEntry.launchAttemptTime}; reconcile Jules sessions manually before retrying`,
      );
    }

    state.sessions[packet.id] = {
      packetId: packet.id,
      packetFile: packet.file,
      packetBlobSha: blobSha,
      sourceSha: sha,
      changedPaths,
      title,
      launchStatus: "POSTING",
      launchAttemptTime: new Date().toISOString(),
    };
    writeState(state);

    try {
      const created = validateSession(
        await apiRequest("/sessions", {
          method: "POST",
          body: {
            prompt,
            title,
            sourceContext: {
              source: source.name,
              githubRepoContext: { startingBranch: STARTING_BRANCH },
            },
            requirePlanApproval: true,
          },
        }),
      );
      state.sessions[packet.id] = {
        ...state.sessions[packet.id],
        launchStatus: "CREATED",
        name: created.name,
        id: created.id,
        url: created.url,
        state: created.state,
        createTime: created.createTime,
      };
      writeState(state);
      console.log(`${packet.id}: created ${created.id} (${created.state})`);
      if (created.url) console.log(`  ${created.url}`);
    } catch (error) {
      writeState(state);
      throw new Error(
        `${packet.id} create result is ambiguous or failed; do not retry until list-session reconciliation. ${error.message}`,
      );
    }
  }
}

async function launch(selector) {
  const releaseLock = acquireLaunchLock();
  try {
    await launchUnlocked(selector);
  } finally {
    releaseLock();
  }
}

function findPlan(activities) {
  const generated = [...activities]
    .reverse()
    .find((activity) => activity.planGenerated?.plan);
  if (!generated) return undefined;
  const plan = asObject(generated.planGenerated.plan, "plan");
  if (!Array.isArray(plan.steps)) {
    fail(`Jules ${API_VERSION} schema drift: plan.steps is not an array`);
  }
  return plan;
}

function planDigest(plan) {
  const protectedPlan = {
    id: plan.id,
    steps: plan.steps.map((step) => ({
      id: step.id,
      index: step.index,
      title: step.title,
      description: step.description,
    })),
  };
  return createHash("sha256")
    .update(JSON.stringify(protectedPlan))
    .digest("hex");
}

function printPlan(plan) {
  if (!plan) {
    console.log("  Plan: not available");
    return;
  }
  console.log(`  Plan ${plan.id ?? "unknown"}:`);
  for (const step of plan.steps) {
    console.log(`    ${Number(step.index) + 1}. ${step.title}: ${step.description}`);
  }
  console.log(`  Plan digest: ${planDigest(plan)}`);
}

async function status(selector) {
  const selected = selectPackets(selector);
  const state = readState();
  for (const packet of selected) {
    const entry = state.sessions[packet.id];
    if (!entry?.id) {
      console.log(`${packet.id}: not launched`);
      continue;
    }
    const session = validateSession(
      await apiRequest(`/sessions/${encodeURIComponent(entry.id)}`),
    );
    const activities = await listActivities(entry.id);
    const plan = findPlan(activities);
    state.sessions[packet.id] = {
      ...entry,
      state: session.state,
      updateTime: session.updateTime,
      activityCount: activities.length,
      lastCheckedAt: new Date().toISOString(),
    };
    console.log(`${packet.id}: ${session.state} (${entry.id})`);
    printPlan(plan);
    const last = activities.at(-1);
    if (last?.description) console.log(`  Latest: ${last.description}`);
  }
  writeState(state);
}

function planHasWriteIntent(plan) {
  const text = plan.steps
    .flatMap((step) => [step.title ?? "", step.description ?? ""])
    .join("\n");
  const hardForbidden = [
    /\b(commit|push|pull request|merge|deploy|install|migration|checkout|switch branch)\b/i,
    /\b(edit|modify|update|create|add|delete|remove|rename|implement|refactor|write|generate)\b[^\n]{0,60}\b(file|code|test|schema|package|config|branch|setting|docs?|migration)\b/i,
    /\b(npm|pnpm|yarn|pip|brew|git commit|git push)\b/i,
    /\b(apply[_ -]?patch|patch file|write to disk|network mutation)\b/i,
    /(^|[\s/:])\.env(?:[.\s/]|$)|\bprintenv\b|\benv\s|security\s+find-generic-password/i,
  ];
  return hardForbidden.find((pattern) => pattern.test(text));
}

async function approve(packetId, confirmedDigest) {
  const [packet] = selectPackets(packetId);
  const state = readState();
  const entry = state.sessions[packet.id];
  if (!entry?.id) fail(`${packet.id} has not been launched`);
  const session = validateSession(
    await apiRequest(`/sessions/${encodeURIComponent(entry.id)}`),
  );
  if (session.state !== "AWAITING_PLAN_APPROVAL") {
    fail(`${packet.id} is ${session.state}, not AWAITING_PLAN_APPROVAL`);
  }
  const activities = await listActivities(entry.id);
  const plan = findPlan(activities);
  if (!plan) fail(`${packet.id} has no retrievable plan`);
  printPlan(plan);
  const actualDigest = planDigest(plan);
  if (!confirmedDigest || confirmedDigest !== actualDigest) {
    fail(
      `${packet.id} requires the exact displayed plan digest as a third argument after human review`,
    );
  }
  const forbiddenPattern = planHasWriteIntent(plan);
  if (forbiddenPattern) {
    fail(
      `${packet.id} plan contains possible write/external-change intent (${forbiddenPattern}); reject or correct it instead of approving`,
    );
  }
  await apiRequest(`/sessions/${encodeURIComponent(entry.id)}:approvePlan`, {
    method: "POST",
    body: {},
  });
  state.sessions[packet.id] = {
    ...entry,
    state: "PLAN_APPROVED",
    planId: plan.id,
    planDigest: actualDigest,
    planApprovedAt: new Date().toISOString(),
  };
  writeState(state);
  console.log(`${packet.id}: read-only-intent plan approved`);
}

function collectAgentMessages(activities) {
  return activities
    .map((activity) => activity.agentMessaged?.agentMessage)
    .filter((message) => typeof message === "string" && message.trim())
    .map((message) => message.trim());
}

function inspectArtifacts(activities) {
  const errors = [];

  for (const activity of activities) {
    if (activity.artifacts === undefined) continue;
    if (!Array.isArray(activity.artifacts)) {
      errors.push(`activity ${activity.id} artifacts is not an array`);
      continue;
    }
    for (const [index, value] of activity.artifacts.entries()) {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        errors.push(`activity ${activity.id} artifact ${index} is not an object`);
        continue;
      }
      const keys = Object.keys(value);
      if (keys.length !== 1 || !["changeSet", "bashOutput", "media"].includes(keys[0])) {
        errors.push(
          `activity ${activity.id} artifact ${index} has unknown shape: ${keys.join(",") || "empty"}`,
        );
        continue;
      }
      if (value.changeSet !== undefined) {
        errors.push(`activity ${activity.id} emitted a forbidden changeSet`);
        continue;
      }
      if (value.media !== undefined) {
        errors.push(`activity ${activity.id} emitted unexpected media`);
        continue;
      }
      const output = value.bashOutput;
      if (
        !output ||
        typeof output !== "object" ||
        typeof output.command !== "string" ||
        typeof output.output !== "string" ||
        !Number.isInteger(output.exitCode)
      ) {
        errors.push(`activity ${activity.id} has malformed bashOutput`);
        continue;
      }
      if (!isAllowedReadOnlyCommand(output.command)) {
        errors.push(`activity ${activity.id} ran a command outside the read-only allowlist`);
      }
    }
  }
  return errors;
}

function isAllowedReadOnlyCommand(command) {
  if (
    !command ||
    /[\n\r;&|><`$]/.test(command) ||
    command.includes("$(") ||
    /(^|[\s/:])\.env(?:[.\s/]|$)/i.test(command) ||
    /(^|\s)-(delete|exec|execdir|ok|okdir|fprint|fprintf)(?:\s|$)/.test(command) ||
    /\bsed\b[^\n]*(^|\s)(--in-place(?:=\S*)?|-[A-Za-z]*i[A-Za-z]*)(?:\s|$)/.test(command) ||
    /\s--output(?:=|\s)/.test(command) ||
    /(^|\s)["']?(\/|~\/|\.\.\/)/.test(command)
  ) {
    return false;
  }
  const trimmed = command.trim();
  const allowed = [
    /^pwd$/,
    /^ls(?:\s|$)/,
    /^cat(?:\s|$)/,
    /^head(?:\s|$)/,
    /^tail(?:\s|$)/,
    /^wc(?:\s|$)/,
    /^stat(?:\s|$)/,
    /^test(?:\s|$)/,
    /^rg(?:\s|$)/,
    /^grep(?:\s|$)/,
    /^sed\s+-n(?:\s|$)/,
    /^find(?:\s|$)/,
    /^git\s+(status|rev-parse|merge-base|diff|show|log|ls-files|grep|symbolic-ref)(?:\s|$)/,
    /^git\s+branch\s+--show-current$/,
  ];
  return allowed.some((pattern) => pattern.test(trimmed));
}

function sameStringArray(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function collectBashOutputs(activities) {
  const outputs = [];
  for (const activity of activities) {
    if (!Array.isArray(activity.artifacts)) continue;
    for (const artifact of activity.artifacts) {
      if (artifact?.bashOutput) outputs.push(artifact.bashOutput);
    }
  }
  return outputs;
}

function validateGitEvidence(activities, entry) {
  const errors = [];
  const outputs = collectBashOutputs(activities);
  const command = {
    branch: "git branch --show-current",
    head: "git rev-parse HEAD",
    status: "git status --porcelain=v1",
    ancestor: `git merge-base --is-ancestor ${CODE_BASE_SHA} HEAD`,
    delta: `git diff --name-only ${CODE_BASE_SHA}..HEAD`,
    finalDiff: "git diff --exit-code",
  };
  const matches = (expected) =>
    outputs
      .map((output, index) => ({ output, index }))
      .filter(({ output }) => output.command.trim() === expected);
  const requireOne = (label, expected) => {
    const found = matches(expected);
    if (found.length !== 1) {
      errors.push(`${label} evidence count is ${found.length}, expected 1`);
      return undefined;
    }
    return found[0];
  };

  const branch = requireOne("branch", command.branch);
  if (
    branch &&
    (branch.output.exitCode !== 0 || branch.output.output.trim() !== STARTING_BRANCH)
  ) {
    errors.push("branch command did not prove the expected branch");
  }
  const head = requireOne("HEAD", command.head);
  if (
    head &&
    (head.output.exitCode !== 0 || head.output.output.trim() !== entry.sourceSha)
  ) {
    errors.push("HEAD command did not prove the expected source SHA");
  }
  const ancestor = requireOne("ancestor", command.ancestor);
  if (
    ancestor &&
    (ancestor.output.exitCode !== 0 || ancestor.output.output.trim() !== "")
  ) {
    errors.push("merge-base command did not prove code-base ancestry");
  }
  const delta = requireOne("control delta", command.delta);
  if (delta) {
    const paths = delta.output.output
      .split(/\r?\n/)
      .map((path) => path.trim())
      .filter(Boolean);
    if (delta.output.exitCode !== 0 || !sameStringArray(paths, entry.changedPaths)) {
      errors.push("git diff --name-only did not prove the controller-bound delta");
    }
  }

  const statuses = matches(command.status);
  if (statuses.length < 2) {
    errors.push(`clean-status evidence count is ${statuses.length}, expected at least 2`);
  } else {
    const [initial] = statuses;
    const final = statuses.at(-1);
    if (
      initial.output.exitCode !== 0 ||
      initial.output.output.trim() !== "" ||
      final.output.exitCode !== 0 ||
      final.output.output.trim() !== ""
    ) {
      errors.push("initial or final worktree status was not clean");
    }
    const finalDiff = requireOne("final diff", command.finalDiff);
    if (
      finalDiff &&
      (finalDiff.index <= final.index ||
        finalDiff.output.exitCode !== 0 ||
        finalDiff.output.output.trim() !== "")
    ) {
      errors.push("final git diff evidence was missing, dirty, or out of order");
    }
  }
  return errors;
}

function validateControlEnvelope(finalMessage, packet, entry) {
  const errors = [];
  const matches = [
    ...finalMessage.matchAll(
      /<JULES_CONTROL_JSON>\s*([\s\S]*?)\s*<\/JULES_CONTROL_JSON>/g,
    ),
  ];
  if (matches.length !== 1) {
    return [`expected exactly one JULES_CONTROL_JSON envelope; found ${matches.length}`];
  }

  let control;
  try {
    control = JSON.parse(matches[0][1]);
  } catch {
    return ["JULES_CONTROL_JSON is not valid JSON"];
  }
  if (!control || typeof control !== "object" || Array.isArray(control)) {
    return ["JULES_CONTROL_JSON is not an object"];
  }

  const expectedKeys = [
    "packetId",
    "packetBlobSha",
    "branch",
    "sessionSourceSha",
    "productionCodeBaseSha",
    "changedSinceCodeBase",
    "initialStatusPorcelain",
    "finalStatusPorcelain",
    "finalDiffExitCode",
    "environmentValuesRead",
    "filesChanged",
    "branchesOrPrsCreated",
    "externalSettingsOrDeploymentsChanged",
  ];
  const unknownKeys = Object.keys(control).filter(
    (key) => !expectedKeys.includes(key),
  );
  const missingKeys = expectedKeys.filter(
    (key) => !Object.hasOwn(control, key),
  );
  if (unknownKeys.length) errors.push(`unknown control keys: ${unknownKeys.join(",")}`);
  if (missingKeys.length) errors.push(`missing control keys: ${missingKeys.join(",")}`);

  const exactValues = [
    ["packetId", packet.id],
    ["packetBlobSha", entry.packetBlobSha],
    ["branch", STARTING_BRANCH],
    ["sessionSourceSha", entry.sourceSha],
    ["productionCodeBaseSha", CODE_BASE_SHA],
    ["initialStatusPorcelain", ""],
    ["finalStatusPorcelain", ""],
  ];
  for (const [key, expected] of exactValues) {
    if (control[key] !== expected) errors.push(`${key} does not match expected value`);
  }
  if (!sameStringArray(control.changedSinceCodeBase, entry.changedPaths)) {
    errors.push("changedSinceCodeBase does not match the controller-bound delta");
  }
  if (control.finalDiffExitCode !== 0) errors.push("finalDiffExitCode is not 0");
  for (const key of [
    "environmentValuesRead",
    "filesChanged",
    "branchesOrPrsCreated",
    "externalSettingsOrDeploymentsChanged",
  ]) {
    if (control[key] !== false) errors.push(`${key} is not false`);
  }
  return errors;
}

function validateSessionPrompt(session, packet, entry) {
  if (typeof session.prompt !== "string") {
    return ["completed session did not return its prompt for source binding"];
  }
  const requiredLines = [
    `PACKET_ID: ${packet.id}`,
    `PACKET_BLOB_SHA: ${entry.packetBlobSha}`,
    `EXPECTED_SESSION_SOURCE_SHA: ${entry.sourceSha}`,
    `EXPECTED_CONTROL_DELTA_JSON: ${JSON.stringify(entry.changedPaths)}`,
  ];
  return requiredLines
    .filter((line) => !session.prompt.includes(line))
    .map((line) => `session prompt missing binding: ${line}`);
}

function assertSelfTest(condition, message) {
  if (!condition) fail(`controller self-test failed: ${message}`);
}

function selfTest() {
  const historicalSession = {
    name: "sessions/historical",
    id: "historical",
    title: "Historical session",
  };
  assertSelfTest(
    validateSession(structuredClone(historicalSession), { requireState: false }).state ===
      "STATE_UNSPECIFIED",
    "historical list session without state was rejected",
  );
  let activeMissingStateRejected = false;
  try {
    validateSession(structuredClone(historicalSession));
  } catch {
    activeMissingStateRejected = true;
  }
  assertSelfTest(
    activeMissingStateRejected,
    "actively managed session without state was accepted",
  );
  const packet = packets[0];
  const entry = {
    packetBlobSha: "packet-blob-test",
    sourceSha: "source-sha-test",
    changedPaths: ["PROJECT_STATUS.md", "docs/PRODUCTION_CORE_EXEC_PLAN.md"],
  };
  const control = {
    packetId: packet.id,
    packetBlobSha: entry.packetBlobSha,
    branch: STARTING_BRANCH,
    sessionSourceSha: entry.sourceSha,
    productionCodeBaseSha: CODE_BASE_SHA,
    changedSinceCodeBase: entry.changedPaths,
    initialStatusPorcelain: "",
    finalStatusPorcelain: "",
    finalDiffExitCode: 0,
    environmentValuesRead: false,
    filesChanged: false,
    branchesOrPrsCreated: false,
    externalSettingsOrDeploymentsChanged: false,
  };
  const message = `<JULES_CONTROL_JSON>\n${JSON.stringify(control)}\n</JULES_CONTROL_JSON>`;
  assertSelfTest(
    validateControlEnvelope(message, packet, entry).length === 0,
    "valid control envelope was rejected",
  );
  const wrongSource = message.replace(entry.sourceSha, "wrong-source");
  assertSelfTest(
    validateControlEnvelope(wrongSource, packet, entry).some((error) =>
      error.includes("sessionSourceSha"),
    ),
    "wrong source SHA was accepted",
  );
  assertSelfTest(
    inspectArtifacts([
      {
        id: "safe",
        artifacts: [
          { bashOutput: { command: "git status --porcelain=v1", output: "", exitCode: 0 } },
        ],
      },
    ]).length === 0,
    "safe read-only command was rejected",
  );
  assertSelfTest(
    inspectArtifacts([{ id: "change", artifacts: [{ changeSet: {} }] }]).length > 0,
    "changeSet was accepted",
  );
  assertSelfTest(
    inspectArtifacts([{ id: "unknown", artifacts: [{ futureArtifact: {} }] }]).length > 0,
    "unknown artifact was accepted",
  );
  assertSelfTest(
    inspectArtifacts([
      {
        id: "unsafe",
        artifacts: [
          { bashOutput: { command: "apply_patch < update.diff", output: "", exitCode: 0 } },
        ],
      },
    ]).length > 0,
    "mutating command was accepted",
  );
  const evidenceActivities = [
    {
      id: "evidence",
      artifacts: [
        { bashOutput: { command: "git branch --show-current", output: `${STARTING_BRANCH}\n`, exitCode: 0 } },
        { bashOutput: { command: "git rev-parse HEAD", output: `${entry.sourceSha}\n`, exitCode: 0 } },
        { bashOutput: { command: "git status --porcelain=v1", output: "", exitCode: 0 } },
        {
          bashOutput: {
            command: `git merge-base --is-ancestor ${CODE_BASE_SHA} HEAD`,
            output: "",
            exitCode: 0,
          },
        },
        {
          bashOutput: {
            command: `git diff --name-only ${CODE_BASE_SHA}..HEAD`,
            output: `${entry.changedPaths.join("\n")}\n`,
            exitCode: 0,
          },
        },
        { bashOutput: { command: "git status --porcelain=v1", output: "", exitCode: 0 } },
        { bashOutput: { command: "git diff --exit-code", output: "", exitCode: 0 } },
      ],
    },
  ];
  assertSelfTest(
    inspectArtifacts(evidenceActivities).length === 0 &&
      validateGitEvidence(evidenceActivities, entry).length === 0,
    "valid machine Git evidence was rejected",
  );
  const wrongHeadEvidence = structuredClone(evidenceActivities);
  wrongHeadEvidence[0].artifacts[1].bashOutput.output = "wrong-source\n";
  assertSelfTest(
    validateGitEvidence(wrongHeadEvidence, entry).some((error) =>
      error.includes("HEAD command"),
    ),
    "wrong machine-recorded HEAD was accepted",
  );
  for (const bypass of [
    "cat ./.env",
    "sed -n -i '1p' PROJECT_STATUS.md",
    "git diff --output=report.txt",
    "git show HEAD:./.env",
  ]) {
    assertSelfTest(!isAllowedReadOnlyCommand(bypass), `command bypass was accepted: ${bypass}`);
  }
  const safePlan = {
    id: "plan-safe",
    steps: [
      { id: "1", index: 0, title: "Inspect", description: "Read current contracts" },
      { id: "2", index: 1, title: "Analyze", description: "Return findings in chat" },
    ],
  };
  assertSelfTest(!planHasWriteIntent(safePlan), "safe plan was rejected");
  assertSelfTest(
    planHasWriteIntent({
      id: "plan-unsafe",
      steps: [
        { id: "1", index: 0, title: "Update docs", description: "Modify plan files" },
      ],
    }),
    "write-oriented plan was accepted",
  );
  assertSelfTest(
    planHasWriteIntent({
      id: "plan-secret",
      steps: [
        { id: "1", index: 0, title: "Inspect", description: "Read secrets with cat ./.env" },
      ],
    }),
    "environment-read plan was accepted",
  );
  assertSelfTest(planDigest(safePlan).length === 64, "plan digest is malformed");
  const releaseLock = acquireLaunchLock();
  let concurrentLaunchBlocked = false;
  try {
    acquireLaunchLock();
  } catch {
    concurrentLaunchBlocked = true;
  } finally {
    releaseLock();
  }
  assertSelfTest(concurrentLaunchBlocked, "concurrent launch lock was bypassed");
  console.log("Controller self-test passed");
}

async function harvest(selector) {
  const selected = selectPackets(selector);
  const state = readState();
  mkdirSync(resultsDirectory, { recursive: true, mode: 0o700 });

  for (const packet of selected) {
    const entry = state.sessions[packet.id];
    if (!entry?.id) {
      console.log(`${packet.id}: not launched`);
      continue;
    }
    const session = validateSession(
      await apiRequest(`/sessions/${encodeURIComponent(entry.id)}`),
    );
    if (!TERMINAL_STATES.has(session.state)) {
      console.log(`${packet.id}: ${session.state}; not terminal, not harvested`);
      continue;
    }
    const activities = await listActivities(entry.id);
    const messages = collectAgentMessages(activities);
    const combined = messages.join("\n\n");
    const finalMessage = messages.at(-1) ?? "";
    const missingSections = packet.requiredSections.filter(
      (section) => !finalMessage.includes(section),
    );
    const validationErrors = [
      ...validateSessionPrompt(session, packet, entry),
      ...inspectArtifacts(activities),
      ...validateGitEvidence(activities, entry),
      ...validateControlEnvelope(finalMessage, packet, entry),
      ...missingSections.map((section) => `final message missing section ${section}`),
    ];
    if (session.state !== "COMPLETED") {
      validationErrors.push(`session ended in ${session.state}`);
    }
    const accepted = validationErrors.length === 0;

    const resultPath = join(resultsDirectory, `${packet.id}.md`);
    const metadata = [
      `# ${packet.id} Jules Result`,
      "",
      `- Session: ${entry.id}`,
      `- URL: ${entry.url ?? "unavailable"}`,
      `- State: ${session.state}`,
      `- Expected session source: ${entry.sourceSha}`,
      `- Frozen production-code base: ${CODE_BASE_SHA}`,
      `- Missing required sections: ${missingSections.length ? missingSections.join(", ") : "none"}`,
      `- Validation errors: ${validationErrors.length ? validationErrors.join("; ") : "none"}`,
      `- Controller verdict: ${accepted ? "FORMAT_VALID_ADVISORY" : "REJECTED"}`,
      "",
      "## Agent messages",
      "",
      combined || "No agent message was returned.",
      "",
    ].join("\n");
    writeFileSync(resultPath, metadata, { mode: 0o600 });
    state.sessions[packet.id] = {
      ...entry,
      state: session.state,
      harvestedAt: new Date().toISOString(),
      resultPath,
      controllerVerdict: accepted ? "FORMAT_VALID_ADVISORY" : "REJECTED",
      missingSections,
      validationErrors,
    };
    console.log(`${packet.id}: ${accepted ? "harvested advisory" : "rejected"} -> ${resultPath}`);
  }
  writeState(state);
}

function usage() {
  console.log(`Usage:
  node scripts/jules-lookahead.mjs check
  node scripts/jules-lookahead.mjs self-test
  node scripts/jules-lookahead.mjs launch [all|PACKET_ID]
  node scripts/jules-lookahead.mjs status [all|PACKET_ID]
  node scripts/jules-lookahead.mjs approve PACKET_ID PLAN_DIGEST
  node scripts/jules-lookahead.mjs harvest [all|PACKET_ID]

State and harvested output stay under .git/jules-lookahead and never contain the API key.`);
}

async function main() {
  const [command, selector = "all", confirmation, ...extra] = process.argv.slice(2);
  if (extra.length > 0) fail("Too many arguments");
  switch (command) {
    case "check":
      if (confirmation !== undefined) fail("check takes no extra arguments");
      await check();
      break;
    case "self-test":
      if (selector !== "all" || confirmation !== undefined) {
        fail("self-test takes no arguments");
      }
      selfTest();
      break;
    case "launch":
      if (confirmation !== undefined) fail("launch takes at most one selector");
      await launch(selector);
      break;
    case "status":
      if (confirmation !== undefined) fail("status takes at most one selector");
      await status(selector);
      break;
    case "approve":
      if (selector === "all") fail("approve requires one explicit PACKET_ID");
      await approve(selector, confirmation);
      break;
    case "harvest":
      if (confirmation !== undefined) fail("harvest takes at most one selector");
      await harvest(selector);
      break;
    default:
      usage();
      if (command) process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`jules-lookahead: ${error.message}`);
  process.exitCode = 1;
});
