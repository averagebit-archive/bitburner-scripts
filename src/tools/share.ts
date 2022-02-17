import { NS } from "@ns";

export const main = async (ns: NS): Promise<void> => {
  const flags = ns.flags([["loop", false]]);
  const uid = ns.args.length > 0 ? ns.args[0] : "share";

  do {
    await ns.share(target);
    ns.tprint(`${uid} finished executing.`);
  } while (flags.loop);
};
