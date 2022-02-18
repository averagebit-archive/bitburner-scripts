import { NS } from "@ns";
import { Tool, Toolkit } from "/definitions";

export class Tool {
  constructor(ns: NS, path: string) {
    this.createTool(ns, path);
  }

  createTool(ns: NS, path: string): void {
    this.path = path;
    this.cost = ns.getScriptRam(this.path);
    this.name = path.replace(/(\/.+\/)/, "").replace(/(\..+)/, "");
  }
}

/** Returns an object with an instance of each tool. */
export const buildToolkit = (
  ns: NS,
  paths = [
    "/tools/grow.js",
    "/tools/hack.js",
    "/tools/share.js",
    "/tools/weak.js",
  ]
): Toolkit => {
  const tools = {};

  for (const path of paths) {
    const tool = new Tool(ns, path);
    tools[tool.name] = tool;
  }

  return tools;
};
