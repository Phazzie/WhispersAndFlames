#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_ORIGIN = "https://jules.googleapis.com";
const API_VERSION = "v1alpha";
const KEYCHAIN_SERVICE = "codex-jules-api";
const OWNER = "Phazzie";
const REPOSITORY = "WhispersAndFlames";
const DELIVERY_BRANCH = "production/core-foundation";
const STARTING_BRANCH = "jules-production-core-v2-prompts";
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

const packets = [
  {
    id: "WF-JULES-TRIAL-FEATURE-002",
    label: "Correct replay-safe commands and pending intents",
    file: "docs/jules/TRIAL_4_REPLAY_SAFE_COMMANDS_V2.md",
  },
  {
    id: "WF-JULES-TRIAL-AI-FEATURE-001",
    label: "Fail-closed AI trust boundary and scripted provider",
    file: "docs/jules/TRIAL_5_AI_TRUST_BOUNDARY_FEATURE.md",
  },
];

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");

function fail(message) {
  throw new Error(message);
}

function runGit(args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function gitPath(relativePath) {
  return resolve(repositoryRoot, runGit(["rev-parse", "--git-path", relativePath]));
}

const stateDirectory = gitPath("jules-feature-trials-v2");
const statePath = join(stateDirectory, "state.json");

function readState() {
  try {
    const parsed = JSON.parse(readFileSync(statePath, "utf8"));
    if (parsed.schemaVersion !== 1 || typeof parsed.sessions !== "object") {
      fail(`Unsupported state schema in ${statePath}`);
    }
    return parsed;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return { schemaVersion: 1, sessions: {} };
  }
}

function writeState(state) {
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  });
}

function getApiKey() {
  try {
    const value = execFileSync(
      "/usr/bin/security",
      ["find-generic-password", "-w", "-s", KEYCHAIN_SERVICE],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 10_000,
      },
    ).trim();
    if (value) return value;
  } catch {
    // Emit only the safe setup instruction below.
  }
  fail(`Jules key unavailable in macOS Keychain service '${KEYCHAIN_SERVICE}'`);
}

async function apiRequest(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API_ORIGIN}/${API_VERSION}${path}`, {
    method,
    headers: {
      "x-goog-api-key": getApiKey(),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const responseText = await response.text();
  let parsed = {};
  if (responseText) {
    try {
      parsed = JSON.parse(responseText);
    } catch {
      fail(`Jules returned non-JSON data with HTTP ${response.status}`);
    }
  }
  if (!response.ok) {
    const message =
      typeof parsed?.error?.message === "string"
        ? parsed.error.message
        : `HTTP ${response.status}`;
    fail(`Jules request failed: ${message}`);
  }
  return parsed;
}

async function listAll(path, collectionName) {
  const values = [];
  let pageToken;
  do {
    const query = new URLSearchParams({ pageSize: "100" });
    if (pageToken) query.set("pageToken", pageToken);
    const page = await apiRequest(`${path}?${query.toString()}`);
    if (!Array.isArray(page[collectionName] ?? [])) {
      fail(`Jules schema drift: ${collectionName} is not an array`);
    }
    values.push(...(page[collectionName] ?? []));
    pageToken = page.nextPageToken;
    if (pageToken !== undefined && typeof pageToken !== "string") {
      fail("Jules schema drift: nextPageToken is not a string");
    }
  } while (pageToken);
  return values;
}

function validateSessionIdentity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("Jules schema drift: session is not an object");
  }
  for (const key of ["id", "name", "title"]) {
    if (typeof value[key] !== "string" || !value[key]) {
      fail(`Jules schema drift: session.${key} is invalid`);
    }
  }
  return value;
}

function validateSession(value) {
  validateSessionIdentity(value);
  if (typeof value.state !== "string" || !KNOWN_STATES.has(value.state)) {
    fail(`Jules schema drift: unknown session state '${value.state}'`);
  }
  return value;
}

function validateCreatedSession(value) {
  validateSessionIdentity(value);
  if (value.state !== undefined && !KNOWN_STATES.has(value.state)) {
    fail(`Jules schema drift: unknown created-session state '${value.state}'`);
  }
  return value;
}

function selectPacket(selector) {
  const packet = packets.find((candidate) => candidate.id === selector);
  if (!packet) {
    fail(`Choose one packet: ${packets.map(({ id }) => id).join(", ")}`);
  }
  return packet;
}

function resolveExactRemoteHead(branch) {
  const ref = `refs/heads/${branch}`;
  const result = runGit(["ls-remote", "--heads", "origin", ref]);
  const [sha, returnedRef, ...extra] = result.split(/\s+/);
  if (!sha || returnedRef !== ref || extra.length) {
    fail(`Expected exactly one remote ${ref}`);
  }
  return sha;
}

function verifyLaunchBase() {
  const deliverySha = resolveExactRemoteHead(DELIVERY_BRANCH);
  const aliasSha = resolveExactRemoteHead(STARTING_BRANCH);
  if (deliverySha !== aliasSha) {
    fail(
      `${STARTING_BRANCH} is ${aliasSha}, not current ${DELIVERY_BRANCH} ${deliverySha}`,
    );
  }
  if (runGit(["status", "--porcelain=v1"])) {
    fail("Canonical worktree is dirty; commit the control artifacts before launch");
  }
  if (runGit(["rev-parse", "HEAD"]) !== deliverySha) {
    fail("Local HEAD does not equal the exact remote delivery head");
  }
  return deliverySha;
}

async function resolveSource() {
  const sources = await listAll("/sources", "sources");
  const matches = sources.filter(
    (source) =>
      source?.githubRepo?.owner === OWNER &&
      source?.githubRepo?.repo === REPOSITORY,
  );
  if (matches.length !== 1 || typeof matches[0].name !== "string") {
    fail(`Expected one connected Jules source for ${OWNER}/${REPOSITORY}`);
  }
  return matches[0];
}

function packetPrompt(packet, sourceSha) {
  const packetText = runGit(["show", `${sourceSha}:${packet.file}`]);
  const packetBlobSha = runGit(["rev-parse", `${sourceSha}:${packet.file}`]);
  return {
    packetBlobSha,
    prompt: [
      "WHISPERS AND FLAMES CONTROLLED IMPLEMENTATION TRIAL",
      `PACKET_ID: ${packet.id}`,
      `PACKET_BLOB_SHA: ${packetBlobSha}`,
      `EXPECTED_SESSION_SOURCE_SHA: ${sourceSha}`,
      `STARTING_BRANCH_ALIAS: ${STARTING_BRANCH}`,
      `REQUIRED_PR_TARGET: ${DELIVERY_BRANCH}`,
      "PLAN_APPROVAL_REQUIRED: true",
      "DO_NOT_READ_OTHER_TRIAL_BRANCHES_OR_PRS: true",
      "AUTOMATIC_MERGE_OR_DEPLOY: forbidden",
      "ENVIRONMENT_FILES_OR_VALUES: forbidden",
      "The packet below is the complete implementation contract. If it conflicts with repository instructions outside the root-authorized exceptions it names, stop SCOPE_GAP.",
      "--- BEGIN AUTHORITATIVE EXECPLAN ---",
      packetText,
      "--- END AUTHORITATIVE EXECPLAN ---",
    ].join("\n"),
  };
}

function sessionTitle(packet, sourceSha) {
  return `${packet.id} @ ${sourceSha.slice(0, 12)} — ${packet.label}`;
}

async function launch(selector) {
  const packet = selectPacket(selector);
  const sourceSha = verifyLaunchBase();
  const source = await resolveSource();
  const title = sessionTitle(packet, sourceSha);
  const sessions = (await listAll("/sessions", "sessions")).filter(
    (session) => session?.title === title,
  );
  if (sessions.length > 1) {
    fail(`Found ${sessions.length} sessions for exact title; reconcile manually`);
  }
  const state = readState();
  if (sessions.length === 1) {
    const session = validateSession(sessions[0]);
    state.sessions[packet.id] = {
      ...state.sessions[packet.id],
      id: session.id,
      name: session.name,
      url: session.url,
      title,
      sourceSha,
      state: session.state,
      launchStatus: "RECONCILED",
      reconciledAt: new Date().toISOString(),
    };
    writeState(state);
    console.log(`${packet.id}: existing ${session.state} session ${session.id}`);
    return;
  }
  if (state.sessions[packet.id]?.launchStatus === "POSTING") {
    fail(
      `Prior POST for ${packet.id} is unresolved; wait for exact-title reconciliation`,
    );
  }
  if (state.sessions[packet.id]?.id) {
    fail(`Local state already binds ${packet.id}; reconcile before another POST`);
  }
  const { prompt, packetBlobSha } = packetPrompt(packet, sourceSha);
  state.sessions[packet.id] = {
    title,
    sourceSha,
    packetBlobSha,
    launchStatus: "POSTING",
    launchAttemptTime: new Date().toISOString(),
  };
  writeState(state);
  const created = validateCreatedSession(
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
    id: created.id,
    name: created.name,
    url: created.url,
    state: created.state ?? "STATE_UNSPECIFIED",
    createTime: created.createTime,
  };
  writeState(state);
  console.log(`${packet.id}: created ${created.id} (${created.state})`);
  if (created.url) console.log(created.url);
}

async function activities(sessionId) {
  const values = await listAll(
    `/sessions/${encodeURIComponent(sessionId)}/activities`,
    "activities",
  );
  return values.sort((left, right) =>
    String(left.createTime).localeCompare(String(right.createTime)),
  );
}

function findPlan(values) {
  return [...values]
    .reverse()
    .find((activity) => activity?.planGenerated?.plan)?.planGenerated?.plan;
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
  if (!plan || !Array.isArray(plan.steps)) {
    console.log("Plan: not available");
    return;
  }
  for (const [position, step] of plan.steps.entries()) {
    const displayIndex = Number.isInteger(step.index) ? step.index + 1 : position + 1;
    console.log(`${displayIndex}. ${step.title}: ${step.description}`);
  }
  console.log(`Plan digest: ${planDigest(plan)}`);
}

async function status(selector) {
  const packet = selectPacket(selector);
  const state = readState();
  const entry = state.sessions[packet.id];
  if (!entry?.id) fail(`${packet.id} is not launched`);
  const session = validateSession(
    await apiRequest(`/sessions/${encodeURIComponent(entry.id)}`),
  );
  const sessionActivities = await activities(entry.id);
  const plan = findPlan(sessionActivities);
  state.sessions[packet.id] = {
    ...entry,
    state: session.state,
    updateTime: session.updateTime,
    lastCheckedAt: new Date().toISOString(),
  };
  writeState(state);
  console.log(`${packet.id}: ${session.state} (${session.id})`);
  printPlan(plan);
  const latestDescription = sessionActivities.at(-1)?.description;
  if (latestDescription) console.log(`Latest: ${latestDescription}`);
}

async function messages(selector) {
  const packet = selectPacket(selector);
  const state = readState();
  const entry = state.sessions[packet.id];
  if (!entry?.id) fail(`${packet.id} is not launched`);
  const sessionActivities = await activities(entry.id);
  const messages = sessionActivities.flatMap((activity) => {
    const values = [];
    if (typeof activity?.agentMessaged?.agentMessage === "string") {
      values.push({ originator: "agent", text: activity.agentMessaged.agentMessage });
    }
    if (typeof activity?.userMessaged?.userMessage === "string") {
      values.push({ originator: "user", text: activity.userMessaged.userMessage });
    }
    return values;
  });
  if (!messages.length) {
    console.log(`${packet.id}: no messages`);
    return;
  }
  console.log(`${packet.id}: ${messages.length} message(s)`);
  for (const message of messages) {
    console.log(`\n[${message.originator}]\n${message.text}`);
  }
}

function forbiddenPlanText(plan) {
  const text = plan.steps
    .flatMap((step) => [step.title ?? "", step.description ?? ""])
    .join("\n");
  const forbidden = [
    /(^|[\s/:])\.env(?:[.\s/]|$)|printenv|environment\s+values?/i,
    /\b(merge|deploy|release|production deployment|fresh-main|legacy checkout)\b/i,
    /\b(package\.json|package-lock|npm install|dependency upgrade|supabase|migration)\b/i,
    /\b(PR\s*#?8[12]|jules-5984020699228841651|jules-11259483656580049044)\b/i,
  ];
  return forbidden.find((pattern) => pattern.test(text));
}

async function approve(selector, confirmedDigest) {
  const packet = selectPacket(selector);
  const state = readState();
  const entry = state.sessions[packet.id];
  if (!entry?.id) fail(`${packet.id} is not launched`);
  const session = validateSession(
    await apiRequest(`/sessions/${encodeURIComponent(entry.id)}`),
  );
  if (session.state !== "AWAITING_PLAN_APPROVAL") {
    fail(`${packet.id} is ${session.state}, not AWAITING_PLAN_APPROVAL`);
  }
  const plan = findPlan(await activities(entry.id));
  if (!plan || !Array.isArray(plan.steps)) fail("No valid plan is available");
  printPlan(plan);
  const digest = planDigest(plan);
  if (!confirmedDigest || confirmedDigest !== digest) {
    fail("Approval requires the exact printed plan digest after human review");
  }
  const forbidden = forbiddenPlanText(plan);
  if (forbidden) {
    fail(`Plan contains forbidden scope or behavior: ${forbidden}`);
  }
  await apiRequest(`/sessions/${encodeURIComponent(entry.id)}:approvePlan`, {
    method: "POST",
    body: {},
  });
  state.sessions[packet.id] = {
    ...entry,
    state: "PLAN_APPROVED",
    planId: plan.id,
    planDigest: digest,
    planApprovedAt: new Date().toISOString(),
  };
  writeState(state);
  console.log(`${packet.id}: plan approved`);
}

async function feedback(selector, confirmedDigest, prompt) {
  const packet = selectPacket(selector);
  const state = readState();
  const entry = state.sessions[packet.id];
  if (!entry?.id) fail(`${packet.id} is not launched`);
  const session = validateSession(
    await apiRequest(`/sessions/${encodeURIComponent(entry.id)}`),
  );
  if (session.state !== "AWAITING_PLAN_APPROVAL") {
    fail(`${packet.id} is ${session.state}, not AWAITING_PLAN_APPROVAL`);
  }
  const plan = findPlan(await activities(entry.id));
  if (!plan || !Array.isArray(plan.steps)) fail("No valid plan is available");
  printPlan(plan);
  const digest = planDigest(plan);
  if (!confirmedDigest || confirmedDigest !== digest) {
    fail("Feedback requires the exact printed plan digest after human review");
  }
  if (typeof prompt !== "string" || prompt.trim().length < 20) {
    fail("Feedback must be a substantive non-empty message");
  }
  await apiRequest(`/sessions/${encodeURIComponent(entry.id)}:sendMessage`, {
    method: "POST",
    body: { prompt: prompt.trim() },
  });
  const feedbackSentAt = new Date().toISOString();
  const planFeedback = Array.isArray(entry.planFeedback)
    ? entry.planFeedback
    : [];
  state.sessions[packet.id] = {
    ...entry,
    state: "PLAN_FEEDBACK_SENT",
    feedbackOnPlanDigest: digest,
    feedbackSentAt,
    planFeedback: [...planFeedback, { planDigest: digest, sentAt: feedbackSentAt }],
  };
  writeState(state);
  console.log(`${packet.id}: plan feedback sent; do not approve the old digest`);
}

async function message(selector, prompt) {
  const packet = selectPacket(selector);
  const state = readState();
  const entry = state.sessions[packet.id];
  if (!entry?.id) fail(`${packet.id} is not launched`);
  const session = validateSession(
    await apiRequest(`/sessions/${encodeURIComponent(entry.id)}`),
  );
  if (new Set(["FAILED", "COMPLETED"]).has(session.state)) {
    fail(`${packet.id} is terminal (${session.state})`);
  }
  if (typeof prompt !== "string" || prompt.trim().length < 20) {
    fail("Message must be a substantive non-empty value");
  }
  await apiRequest(`/sessions/${encodeURIComponent(entry.id)}:sendMessage`, {
    method: "POST",
    body: { prompt: prompt.trim() },
  });
  const sentAt = new Date().toISOString();
  const sentMessages = Array.isArray(entry.sentMessages) ? entry.sentMessages : [];
  state.sessions[packet.id] = {
    ...entry,
    state: session.state,
    sentMessages: [...sentMessages, { sentAt, purpose: "operator-message" }],
  };
  writeState(state);
  console.log(`${packet.id}: message sent while ${session.state}`);
}

function selfTest() {
  const safePlan = {
    id: "safe",
    steps: [
      {
        id: "1",
        index: 0,
        title: "Implement replay records",
        description: "Edit the authorized game files and focused tests",
      },
    ],
  };
  if (forbiddenPlanText(safePlan)) fail("Self-test rejected a safe plan");
  for (const value of ["Read .env.local", "Deploy release", "Copy PR #81", "Edit package-lock"]) {
    const unsafe = {
      id: "unsafe",
      steps: [{ id: "1", index: 0, title: value, description: value }],
    };
    if (!forbiddenPlanText(unsafe)) fail(`Self-test accepted: ${value}`);
  }
  if (planDigest(safePlan).length !== 64) fail("Self-test produced bad digest");
  console.log("Feature-trial controller self-test passed");
}

function usage() {
  console.log(`Usage:
  node scripts/jules-feature-trials.mjs self-test
  node scripts/jules-feature-trials.mjs launch PACKET_ID
  node scripts/jules-feature-trials.mjs status PACKET_ID
  node scripts/jules-feature-trials.mjs messages PACKET_ID
  node scripts/jules-feature-trials.mjs message PACKET_ID "MESSAGE"
  node scripts/jules-feature-trials.mjs feedback PACKET_ID PLAN_DIGEST "MESSAGE"
  node scripts/jules-feature-trials.mjs approve PACKET_ID PLAN_DIGEST

Starting alias: ${STARTING_BRANCH}
Required PR target: ${DELIVERY_BRANCH}`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case "self-test":
      if (args.length) fail("self-test takes no arguments");
      selfTest();
      break;
    case "launch":
      if (args.length !== 1) fail("launch requires one packet ID");
      await launch(args[0]);
      break;
    case "status":
      if (args.length !== 1) fail("status requires one packet ID");
      await status(args[0]);
      break;
    case "messages":
      if (args.length !== 1) fail("messages requires one packet ID");
      await messages(args[0]);
      break;
    case "message":
      if (args.length !== 2) {
        fail("message requires packet ID and one quoted message");
      }
      await message(args[0], args[1]);
      break;
    case "feedback":
      if (args.length !== 3) {
        fail("feedback requires packet ID, plan digest, and one quoted message");
      }
      await feedback(args[0], args[1], args[2]);
      break;
    case "approve":
      if (args.length !== 2) fail("approve requires packet ID and digest");
      await approve(args[0], args[1]);
      break;
    default:
      usage();
      if (command) process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`jules-feature-trials: ${error.message}`);
  process.exitCode = 1;
});
