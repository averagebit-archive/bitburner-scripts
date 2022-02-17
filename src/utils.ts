import { NS } from "@ns";

/** Formats numbers to a readable '$0.000a' string. */
export const formatMoney = (ns: NS, amount: number): string =>
  ns.nFormat(amount, "$0.000a");

/** Formats time to a readable '00:00' string. */
export const formatTime = (ns: NS, time: number): string =>
  ns.tFormat(time, "00:00");

/** Formats ram to a readable string. */
export const formatRam = (ram: number): string =>
  `${Math.round(ram).toLocaleString()} GB`;

/** Logs a message optionally to terminal and/or with a toast notification. */
export const log = (
  ns: NS,
  message = "",
  tprint = false,
  toast: string // success, info, warning, error
): void => {
  ns.print(message);
  if (tprint) ns.tprint(message);
  if (toast) ns.toast(message, toast);
  return message;
};

/** Returns an array of all scanned servers hostnames. */
export const getServers = (ns: NS): string[] => {
  const servers = [];
  const discovered = [];
  const stack = ["home"];

  while (stack.length > 0) {
    const node = stack.pop();
    for (const child of ns.scan(node)) {
      if (!discovered.includes(node)) discovered.push(node);
      if (!discovered.includes(child)) stack.push(child);
    }
  }

  for (const hostname of discovered) {
    servers.push(hostname);
  }

  return servers;
};
