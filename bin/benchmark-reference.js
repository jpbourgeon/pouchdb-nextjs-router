"use strict";

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { spawn, execFileSync } = require("child_process");

const routerRoot = path.resolve(__dirname, "..");
const pouchdbRoot = path.resolve(routerRoot, "../pouchdb");
const resultsRoot = path.resolve(
  routerRoot,
  process.env.BENCHMARK_RESULTS_DIR || "benchmark-results"
);
const seed = process.env.SEED;
const runCount = Number(process.env.BENCHMARK_RUNS || 5);
const testPattern =
  process.env.BENCHMARK_TEST_PATTERN || "tests/integration/test.*.js";

if (!seed) {
  throw new Error("SEED is required for the reference benchmark");
}
if (!Number.isInteger(runCount) || runCount < 1) {
  throw new Error("BENCHMARK_RUNS must be a positive integer");
}

const servers = [
  {
    key: "express",
    label: "Express",
    url: "http://127.0.0.1:3000",
    stateDirectory: path.join(routerRoot, ".benchmark-state/express"),
    command: process.execPath,
    args: [path.join(routerRoot, "bin/start-express-benchmark.js")],
    cwd: routerRoot,
    env: { PORT: "3000" },
  },
  {
    key: "nextjs",
    label: "Next.js",
    url: "http://127.0.0.1:3001/api/pouchdb",
    stateDirectory: path.join(routerRoot, ".pouchdb"),
    command: "npm",
    args: ["start", "--", "--port", "3001"],
    cwd: routerRoot,
    env: {},
  },
];

const measurements = [];
const children = [];
let campaignStatus = "running";
let campaignError = null;

function gitRevision(directory) {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: directory,
    encoding: "utf8",
  }).trim();
}

const metadata = {
  commitSha: process.env.GITHUB_SHA || gitRevision(routerRoot),
  nodeVersion: process.version,
  pouchdbTestVersion: require(path.join(pouchdbRoot, "package.json")).version,
  pouchdbCommit: gitRevision(pouchdbRoot),
  serverPouchdbVersion: require(path.join(
    routerRoot,
    "node_modules/pouchdb/package.json"
  )).version,
  seed,
  runner: process.env.RUNNER_LABEL || "local",
  runnerImage: process.env.ImageOS || "unknown",
  runnerImageVersion: process.env.ImageVersion || "unknown",
  runCount,
  testPattern,
  mochaRetries: 0,
  mochaTimeoutMs: Number(process.env.TIMEOUT || 50000),
  mochaServerProfile: "pouchdb-nextjs-router",
  functionalValidation: process.env.FUNCTIONAL_VALIDATION || "not-run",
  startedAt: new Date().toISOString(),
};

function log(message) {
  process.stdout.write(`${message}\n`);
}

async function request(url, options = {}, expectedStatuses = [200]) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(10000),
  });
  if (!expectedStatuses.includes(response.status)) {
    const body = await response.text();
    throw new Error(
      `${options.method || "GET"} ${url} returned ${response.status}: ${body}`
    );
  }
  return response;
}

async function waitForHealth(server) {
  const deadline = Date.now() + 60000;
  let lastError;
  while (Date.now() < deadline) {
    if (server.process.exitCode !== null) {
      throw new Error(
        `${server.label} exited before its health check (code ${server.process.exitCode})`
      );
    }
    try {
      await request(`${server.url}/`, { method: "HEAD" });
      log(`${server.label} health check passed at ${server.url}`);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`${server.label} health check failed: ${lastError}`);
}

function startServer(server) {
  const logPath = path.join(resultsRoot, `${server.key}-server.log`);
  const logStream = fs.createWriteStream(logPath, { flags: "a" });
  const child = spawn(server.command, server.args, {
    cwd: server.cwd,
    env: { ...process.env, ...server.env },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  child.on("error", (error) => {
    logStream.write(`Server process error: ${error.stack || error}\n`);
  });
  server.process = child;
  server.logStream = logStream;
  children.push(server);
  log(`Started ${server.label} once for the campaign (PID ${child.pid})`);
}

async function stopServers() {
  for (const server of children) {
    if (server.process.exitCode === null && server.process.pid) {
      try {
        process.kill(-server.process.pid, "SIGTERM");
      } catch (error) {
        if (error.code !== "ESRCH") {
          log(`Unable to stop ${server.label}: ${error.message}`);
        }
      }
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  for (const server of children) {
    if (server.process.exitCode === null && server.process.pid) {
      try {
        process.kill(-server.process.pid, "SIGKILL");
      } catch (error) {
        if (error.code !== "ESRCH") {
          log(`Unable to kill ${server.label}: ${error.message}`);
        }
      }
    }
    server.logStream.end();
  }
}

async function resetState(server) {
  await fsp.mkdir(server.stateDirectory, { recursive: true });
  const entries = await fsp.readdir(server.stateDirectory);
  for (const entry of entries) {
    await fsp.rm(path.join(server.stateDirectory, entry), {
      recursive: true,
      force: true,
    });
  }
  const remaining = await fsp.readdir(server.stateDirectory);
  if (remaining.length !== 0) {
    throw new Error(`${server.label} state reset did not complete`);
  }
  await request(`${server.url}/`, { method: "HEAD" });
  log(`${server.label} state reset and verified`);
}

async function warmup(server) {
  const database = encodeURIComponent(`benchmark-warmup-${server.key}`);
  const databaseUrl = `${server.url}/${database}`;
  const documentUrl = `${databaseUrl}/representative-document`;
  const jsonHeaders = { "content-type": "application/json" };

  await request(`${server.url}/`);
  await request(
    databaseUrl,
    { method: "PUT", headers: jsonHeaders, body: "{}" },
    [201]
  );
  await request(
    documentUrl,
    {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({ warmed: true }),
    },
    [201]
  );
  await request(documentUrl);
  await request(databaseUrl, { method: "DELETE" });
  log(`${server.label} warmup completed (not measured)`);
}

function probeDesignFilterSupport() {
  const output = execFileSync(
    process.execPath,
    [path.join(routerRoot, "bin/probe-server-pouchdb.js")],
    { cwd: routerRoot, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
  ).trim();
  if (output !== "0" && output !== "1") {
    throw new Error(`Unexpected design filter probe result: ${output}`);
  }
  return output;
}

async function runSuite(server, pair, designFilterSupport) {
  const logPath = path.join(resultsRoot, `${server.key}-${pair}.log`);
  const logStream = fs.createWriteStream(logPath);
  const started = process.hrtime.bigint();
  const child = spawn("bash", ["./bin/test-node.sh"], {
    cwd: pouchdbRoot,
    env: {
      ...process.env,
      BAIL: "1",
      BENCHMARK: "1",
      BENCHMARK_TEST_PATTERN: testPattern,
      CLIENT: "node",
      COUCH_HOST: server.url,
      SEED: seed,
      // Keep the harness profile identical. The actual server type is detected
      // from its HTTP welcome response; this variable only gates documented
      // capability exceptions in the upstream suite.
      SERVER: metadata.mochaServerProfile,
      SERVER_POUCHDB_SUPPORTS_DESIGN_FILTER: designFilterSupport,
      TIMEOUT: String(metadata.mochaTimeoutMs),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  child.stdout.pipe(logStream, { end: false });
  child.stderr.pipe(logStream, { end: false });

  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  const durationSeconds =
    Number(process.hrtime.bigint() - started) / 1_000_000_000;
  await new Promise((resolve) => logStream.end(resolve));

  if (exitCode !== 0) {
    throw new Error(
      `${server.label} #${pair} failed with exit code ${exitCode}; campaign invalid`
    );
  }

  const measurement = {
    pair,
    server: server.key,
    label: server.label,
    seconds: durationSeconds,
  };
  measurements.push(measurement);
  log(`${server.label} #${pair}   ${durationSeconds.toFixed(3)} s`);
  await writeResults();
}

function statistics(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const median =
    sorted.length % 2 === 1
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const variance =
    values.length > 1
      ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        (values.length - 1)
      : 0;
  return {
    runs: values.length,
    mean,
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    standardDeviation: Math.sqrt(variance),
  };
}

function analysis() {
  const express = measurements
    .filter((measurement) => measurement.server === "express")
    .map((measurement) => measurement.seconds);
  const nextjs = measurements
    .filter((measurement) => measurement.server === "nextjs")
    .map((measurement) => measurement.seconds);
  const pairs = [];
  for (
    let index = 0;
    index < Math.min(express.length, nextjs.length);
    index += 1
  ) {
    const delta = nextjs[index] - express[index];
    pairs.push({
      pair: index + 1,
      express: express[index],
      nextjs: nextjs[index],
      delta,
      deltaPercent: (delta / express[index]) * 100,
    });
  }
  if (express.length === 0 || nextjs.length === 0) {
    return { pairs };
  }
  const expressStats = statistics(express);
  const nextjsStats = statistics(nextjs);
  const meanDelta = nextjsStats.mean - expressStats.mean;
  return {
    express: expressStats,
    nextjs: nextjsStats,
    meanDelta,
    meanDeltaPercent: (meanDelta / expressStats.mean) * 100,
    pairedMeanDelta:
      pairs.reduce((sum, pair) => sum + pair.delta, 0) / pairs.length,
    pairedMeanDeltaPercent:
      pairs.reduce((sum, pair) => sum + pair.deltaPercent, 0) / pairs.length,
    pairs,
  };
}

function seconds(value) {
  return value === undefined ? "—" : `${value.toFixed(3)} s`;
}

function percent(value) {
  return value === undefined
    ? "—"
    : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function markdownReport(result) {
  const currentAnalysis = result.analysis;
  const lines = [
    "# PouchDB reference benchmark",
    "",
    `- Status: **${result.status}**`,
    `- Commit SHA: \`${metadata.commitSha}\``,
    `- Node: \`${metadata.nodeVersion}\``,
    `- PouchDB server: \`${metadata.serverPouchdbVersion}\` (identical for both servers)`,
    `- PouchDB test checkout: \`${metadata.pouchdbTestVersion}\` / \`${metadata.pouchdbCommit}\``,
    `- Runner: \`${metadata.runner}\``,
    `- Runner image: \`${metadata.runnerImage}\` / \`${metadata.runnerImageVersion}\``,
    `- SEED: \`${metadata.seed}\``,
    `- Runs: \`${metadata.runCount}\` per server`,
    `- Mocha retries during measurements: \`${metadata.mochaRetries}\``,
    `- Mocha timeout: \`${metadata.mochaTimeoutMs} ms\``,
    `- Mocha server profile: \`${metadata.mochaServerProfile}\` (identical for both targets)`,
    `- Functional validation: \`${metadata.functionalValidation}\``,
    "",
    "## Paired measurements",
    "",
    "| Run | Express | Next.js | Delta | Delta % |",
    "| ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const pair of currentAnalysis.pairs) {
    lines.push(
      `| ${pair.pair} | ${seconds(pair.express)} | ${seconds(
        pair.nextjs
      )} | ${seconds(pair.delta)} | ${percent(pair.deltaPercent)} |`
    );
  }
  if (currentAnalysis.express && currentAnalysis.nextjs) {
    lines.push(
      "",
      "## Aggregate statistics",
      "",
      "Sample standard deviation is reported; no confidence interval is inferred from five pairs.",
      "",
      "| Server | Runs | Mean | Median | Min | Max | Std dev |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
      `| Express | ${currentAnalysis.express.runs} | ${seconds(
        currentAnalysis.express.mean
      )} | ${seconds(currentAnalysis.express.median)} | ${seconds(
        currentAnalysis.express.min
      )} | ${seconds(currentAnalysis.express.max)} | ${seconds(
        currentAnalysis.express.standardDeviation
      )} |`,
      `| Next.js | ${currentAnalysis.nextjs.runs} | ${seconds(
        currentAnalysis.nextjs.mean
      )} | ${seconds(currentAnalysis.nextjs.median)} | ${seconds(
        currentAnalysis.nextjs.min
      )} | ${seconds(currentAnalysis.nextjs.max)} | ${seconds(
        currentAnalysis.nextjs.standardDeviation
      )} |`,
      "",
      `- Delta of means, Express → Next.js: **${seconds(
        currentAnalysis.meanDelta
      )} / ${percent(currentAnalysis.meanDeltaPercent)}**`,
      `- Mean paired delta (Bᵢ − Aᵢ): **${seconds(
        currentAnalysis.pairedMeanDelta
      )} / ${percent(currentAnalysis.pairedMeanDeltaPercent)}**`
    );
  }
  if (result.error) {
    lines.push("", "## Failure", "", `\`${result.error}\``);
  }
  return `${lines.join("\n")}\n`;
}

async function writeResults() {
  const result = {
    metadata,
    status: campaignStatus,
    error: campaignError,
    measurements,
    analysis: analysis(),
  };
  const markdown = markdownReport(result);
  await fsp.writeFile(
    path.join(resultsRoot, "results.json"),
    `${JSON.stringify(result, null, 2)}\n`
  );
  const csv = ["pair,server,seconds"]
    .concat(
      measurements.map(
        (measurement) =>
          `${measurement.pair},${
            measurement.server
          },${measurement.seconds.toFixed(9)}`
      )
    )
    .join("\n");
  await fsp.writeFile(path.join(resultsRoot, "measurements.csv"), `${csv}\n`);
  await fsp.writeFile(path.join(resultsRoot, "results.md"), markdown);
  return markdown;
}

async function main() {
  await fsp.rm(resultsRoot, { recursive: true, force: true });
  await fsp.mkdir(resultsRoot, { recursive: true });
  log(`Commit SHA: ${metadata.commitSha}`);
  log(`Node: ${metadata.nodeVersion}`);
  log(`PouchDB test checkout: ${metadata.pouchdbCommit}`);
  log(`PouchDB server version (both): ${metadata.serverPouchdbVersion}`);
  log(`Runner: ${metadata.runner}`);
  log(`SEED: ${metadata.seed}`);
  log(`Runs per server: ${metadata.runCount}`);
  log(`Workload: ${metadata.testPattern}; Mocha --retries 0`);

  const designFilterSupport = probeDesignFilterSupport();
  for (const server of servers) {
    await resetStateBeforeStart(server);
    startServer(server);
  }
  await Promise.all(servers.map(waitForHealth));
  for (const server of servers) {
    await warmup(server);
    await resetState(server);
  }

  for (let pair = 1; pair <= runCount; pair += 1) {
    for (const server of servers) {
      await resetState(server);
      await runSuite(server, pair, designFilterSupport);
    }
  }
  campaignStatus = "passed";
}

async function resetStateBeforeStart(server) {
  await fsp.rm(server.stateDirectory, { recursive: true, force: true });
  await fsp.mkdir(server.stateDirectory, { recursive: true });
}

(async () => {
  try {
    await main();
  } catch (error) {
    campaignStatus = "invalid";
    campaignError = error.stack || String(error);
    process.exitCode = 1;
    log(campaignError);
  } finally {
    metadata.finishedAt = new Date().toISOString();
    await stopServers();
    const markdown = await writeResults();
    if (process.env.GITHUB_STEP_SUMMARY) {
      await fsp.appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
    }
  }
})();
