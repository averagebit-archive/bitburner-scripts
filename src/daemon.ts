import { NS } from "@ns";
import { Server } from "/server";
import { getServers, log as logUtil } from "/utils";
import { buildToolkit } from "/toolkit";

let _ns = null; // Global ns instance for convenience sake

const log = (...args): void => logUtil(_ns, ...args);

enum JobType {
  hack = "hack",
  grow = "grow",
  weak = "weak",
}

interface Process {
  pid: number;
  host: Server;
}

interface JobTimes {
  duration: number;
  end: number;
}

interface Job {
  readonly tool: Tool;
  readonly threads: number;
  readonly target: Server;
  readonly type: JobType;
  host: Server;
  links: Job[];
  times: JobTimes;
  pid: number;
  uid: string;
}

class Job implements Job {
  constructor(tool, threads, target, type) {
    this.type = type;
    this.tool = tool;
    this.target = target;
    this.threads = threads;
    this.links = [];
    this.times = {
      duration: 0,
      end: 0,
    };

    this.updateTimes();
  }

  /** Sets the job duration depending on the job type. */
  public updateTimes(): void {
    const now = Date.now();

    if (this.type === JobType.hack)
      this.times.duration = this.target.times.hack;

    if (this.type === JobType.grow)
      this.times.duration = this.target.times.grow;

    if (this.type === JobType.weak)
      this.times.duration = this.target.times.weak;

    this.times.end = now + this.times.duration;
  }

  /** Handles job execution and returns the job instance if successful. */
  public execute(ns: NS): Job | boolean {
    this.updateTimes();

    const process = execute(
      ns,
      this.tool,
      this.threads,
      this.target,
      "--uid",
      `${this.type}-${this.times.end}`
      // "--delay",
      // this.times.duration,
      // "--debug"
    );

    if (!process) return false;

    this.host = process.host;
    this.pid = process.pid;

    log(
      `Executing '${this.type}' job against '${this.target.hostname}' on '${this.host.hostname}', expected to end at ${this.times.end}`
    );

    return this;
  }

  /** Returns true if the provided job type exists in one of the linked jobs of the instance. */
  public hasLinkType(type: JobType): boolean {
    let hasLinkType = false;

    for (const job of this.links) {
      if (job.type === type) hasLinkType = true;
    }

    return hasLinkType;
  }

  /** Returns the job object if the process is still alive. */
  public isRunning(ns: NS): Job | boolean {
    if (!this.host) return false;
    if (ns.isRunning(this.pid, this.host.hostname)) return this;
    return false;
  }

  /** Kills the running job process and returns the job object if successful. */
  public kill(ns: NS): Job | boolean {
    if (this.isRunning(ns))
      if (ns.kill(this.pid, this.host.hostname)) return this;
    return false;
  }
}

/** Returns an array of all potential hosts. */
const getHosts = (ns: NS): Server[] => {
  const hosts = [];
  const servers = getServers(ns);

  for (const server of servers) {
    const host = new Server(ns, server);
    hosts.push(host);
  }

  return hosts
    .filter((host) => host.canRoot)
    .filter((host) => host.ram > 0)
    .sort((a, b) => b.freeRam - a.freeRam);
};

/** Uploads tools to all potential hosts. */
const uploadTools = async (ns: NS): void => {
  const hosts = getHosts(ns);
  const tools = buildToolkit(ns);

  for (const host of hosts) {
    for (const tool in tools) {
      await ns.scp(tools[tool].path, host.hostname);
    }
  }
};

/** Handles tool execution and thread allocation. */
const execute = (
  ns: NS,
  tool: Tool,
  threads: number,
  target: Server,
  ...args
): Process => {
  const hosts = getHosts(ns);
  const process = {};

  let threadsRequired = threads;

  // TODO: Handle preferred hosts and option to disable thread splitting
  while (threadsRequired > 0) {
    for (const host of hosts) {
      const threadsFree = Math.floor(host.freeRam / tool.cost);
      const threadsUsed = Math.min(threadsFree, threadsRequired);

      // In case of job being split across multiple hosts due to insufficient threads
      // we store the last host/pid as that's what we track for scheduling.
      process.host = host;
      process.pid = ns.exec(
        tool.path,
        host.hostname,
        threadsUsed,
        target.hostname,
        ...args
      );

      threadsRequired -= threadsUsed;
      if (threadsRequired < 1) break;
    }
  }

  if (!process.pid) return false;
  return process;
};

export const main = async (ns: NS): Promise<void> => {
  ns.disableLog("ALL");

  _ns = ns;
  // TODO: Handle finding, sorting and preparing the most optimal target(s)
  const target = new Server(ns, "phantasy");
  const tools = buildToolkit(ns);
  const queue = [];

  while (true) {
    const now = Date.now();
    await uploadTools(ns);

    for (const [index, job] of queue.entries()) {
      if (now >= job.times.end && !job.isRunning(ns)) queue.splice(index, 1);
    }

    target.updateMetrics(ns);

    const hack = new Job(tools.hack, target.threads.hack, target, JobType.hack);

    const grow = new Job(
      tools.grow,
      target.threads.growAfterHack,
      target,
      JobType.grow
    );

    const weak = new Job(
      tools.weak,
      target.threads.weakAfterGrow + target.threads.weakAfterHack,
      target,
      JobType.weak
    );

    // TODO: Handle switching target, multiple targets and share/exp grind with remaining threads
    // TODO: Reduce job offsets
    if (queue.length === 0) {
      weak.execute(ns);
      queue.push(weak);
    }

    const maxCycles = 10;
    const cyclesQueued = queue.filter(
      (job) => job.type === JobType.weak
    ).length;

    if (target.hasMinSecurity) {
      for (const job of queue) {
        if (job.type === JobType.weak) {
          if (
            cyclesQueued < maxCycles &&
            !job.hasLinkType(JobType.weak) &&
            weak.times.end >= job.times.end + 300
          ) {
            weak.execute(ns);
            job.links.push(weak);
            queue.push(weak);
          }

          if (
            !job.hasLinkType(JobType.grow) &&
            grow.times.end >= job.times.end - 100 &&
            grow.times.end < job.times.end
          ) {
            grow.execute(ns);
            job.links.push(grow);
            queue.push(grow);
          }

          if (
            !job.hasLinkType(JobType.hack) &&
            hack.times.end >= job.times.end - 200 &&
            hack.times.end <= job.times.end - 100
          ) {
            hack.execute(ns);
            job.links.push(hack);
            queue.push(hack);
          }
        }

        if (
          job.type === JobType.hack &&
          job.times.end >= now - 300 &&
          !target.hasMaxMoney
        ) {
          job.kill(ns);
        }
      }
    }

    await ns.sleep(20);
  }
};
