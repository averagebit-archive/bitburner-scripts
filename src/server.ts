import { NS } from "@ns";
import { formatMoney, formatRam } from "/utils";

const HACK_THREAD_HARDENING = 0.002; // ns.growthAnalyzeSecurity(1)
const GROW_THREAD_HARDENING = 0.004; // ns.hackAnalyzeSecurity(1)
const WEAKEN_THREAD_POTENCY = 0.05;

export class Server {
  constructor(
    ns: NS,
    hostname: string,
    percentage = 0.5,
    offset = 100,
    cores = 1
  ) {
    this.ns = ns;
    this.hostname = hostname;
    this.percentage = percentage;
    this.cores = cores;

    this.times = {};
    this.threads = {};
    this.delays = {};

    this.offset = offset;

    this.updateMetrics(ns);
  }

  /** Updates all properties and metrics of the server instance. */
  updateMetrics(ns: NS): void {
    const player = ns.getPlayer();
    const so = ns.getServer(this.hostname);

    this.cores = so.cpuCores;
    this.hasBackdoor = so.backdoorInstalled;
    this.maxMoney = so.moneyMax;
    this.money = so.moneyAvailable;
    this.purchased = so.purchasedByPlayer;
    this.ram = so.maxRam;
    this.usedRam = so.ramUsed;
    this.requiredHackLevel = so.requiredHackingSkill;
    this.hasRoot = so.hasAdminRights;
    this.openPorts = so.openPortCount;
    this.requiredPorts = so.numOpenPortsRequired;
    this.security = so.hackDifficulty;
    this.minSecurity = so.minDifficulty;
    this.freeRam = this.ram - this.usedRam;
    this.hasMinSecurity = this.minSecurity === this.security;
    this.hasMaxMoney = this.money === this.maxMoney;
    this.isPrepared = this.hasMinSecurity && this.hasMaxMoney;
    this.canRoot = this.requiredHackLevel <= player.hacking;
    this.shouldRoot =
      !this.hostname.startsWith("hacknet-node-") &&
      !this.purchased &&
      this.maxMoney > 0 &&
      this.hostname !== "home" &&
      this.canRoot;

    // Following metrics are irrelevant for servers not meetings these conditions and calculations for most will fail
    if (!this.shouldRoot) return this;

    // Set security of the original server object to minimum for formula calculations
    so.hackDifficulty = this.minSecurity;

    // Times
    this.times.hack = Math.ceil(ns.formulas.hacking.hackTime(so, player));
    this.times.grow = Math.ceil(ns.formulas.hacking.growTime(so, player));
    this.times.weak = Math.ceil(ns.formulas.hacking.weakenTime(so, player));
    this.times.cycle = this.weakenTime + this.offset * 4;

    // Delays
    this.delays.hack = this.times.weak - this.times.hack - this.offset;
    this.delays.growAfterHack = this.times.weak - this.times.grow + this.offset;
    this.delays.weakAfterGrow = this.offset * 2;
    this.delays.weakAfterHack = 0;

    // Hack threads
    // const effectivePercentage = percentPerThread * this.threads.hack;
    const percentPerThread = ns.formulas.hacking.hackPercent(so, player);
    this.threads.hack = Math.floor(this.percentage / percentPerThread);
    const hackSecurityEffect = HACK_THREAD_HARDENING * this.threads.hack;

    // Grow threads
    const growFactor = this.maxMoney / Math.max(this.money, 1);
    const growFactorAfterHack = 1 / (1 - this.threads.hack * percentPerThread);
    this.threads.grow = Math.ceil(
      ns.growthAnalyze(this.hostname, growFactor, this.cores)
    );
    this.threads.growAfterHack = Math.ceil(
      ns.growthAnalyze(this.hostname, growFactorAfterHack, this.cores)
    );
    const growSecurityEffect =
      GROW_THREAD_HARDENING * this.threads.growAfterHack;

    // Weaken threads
    this.threads.weak = Math.ceil(
      (this.security - this.minSecurity) / WEAKEN_THREAD_POTENCY
    );
    this.threads.weakAfterHack = Math.ceil(
      hackSecurityEffect / WEAKEN_THREAD_POTENCY
    );
    this.threads.weakAfterGrow = Math.ceil(
      growSecurityEffect / WEAKEN_THREAD_POTENCY
    );
  }
}

export const main = async (ns: NS): Promise<void> => {
  const hostname = ns.args[0];
  const server = new Server(ns, hostname);

  ns.tprint(`
    hostname              : ${server.hostname}
    --- Specifications
    cores                 : ${server.cores}
    ram                   : ${formatRam(server.ram)}
    usedRam               : ${formatRam(server.usedRam)}
    freeRam               : ${formatRam(server.freeRam)}
    --- Money
    money                 : ${formatMoney(ns, server.money)}
    maxMoney              : ${formatMoney(ns, server.maxMoney)}
    hasMaxMoney           : ${server.hasMaxMoney}
    --- Security
    security              : ${server.security}
    minSecurity           : ${server.minSecurity}
    hasMinSecurity        : ${server.hasMinSecurity}
    --- Additional information
    hasRoot               : ${server.hasRoot}
    canRoot               : ${server.canRoot}
    shouldRoot            : ${server.shouldRoot}
    hasBackdoor           : ${server.hasBackdoor}
    requiredHackLevel     : ${server.requiredHackLevel}
    requiredPorts         : ${server.requiredPorts}
    openPorts             : ${server.openPorts}
    purchased             : ${server.purchased}
    isPrepared            : ${server.isPrepared}
    --- Times
    times.hack            : ${server.times.hack}
    times.grow            : ${server.times.grow}
    times.weak            : ${server.times.weak}
    offset                : ${server.offset}
    --- Delays
    delays.hack           : ${server.delays.hack}
    delays.weakAfterHack  : ${server.delays.weakAfterHack}
    delays.growAfterHack  : ${server.delays.growAfterHack}
    delays.weakAfterGrow  : ${server.delays.weakAfterGrow}
    --- Threads
    threads.hack          : ${server.threads.hack}
    threads.grow          : ${server.threads.grow}
    threads.weak          : ${server.threads.weak}
    threads.growAfterHack : ${server.threads.growAfterHack}
    threads.weakAfterHack : ${server.threads.weakAfterHack}
    threads.weakAfterGrow : ${server.threads.weakAfterGrow}
  `);
};
