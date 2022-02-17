import { NS } from "@ns";

export const main = async (ns: NS): Promise<void> => {
  const target = ns.args[0];
  const flags = ns.flags([
    ["uid", ""],
    ["delay", 0],
    ["loop", false],
    ["debug", false],
  ]);

  do {
    if (flags.delay > 0) await ns.sleep(flags.delay);
    if (!flags.debug) await ns.grow(target);
    if (flags.debug) ns.tprint(`${flags.uid} finished executing.`);
  } while (flags.loop);
};
