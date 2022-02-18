export interface Tool {
  name: string;
  path: string;
  cost: number;
}

export interface Toolkit {
  [name: string]: Tool;
}

export interface Process {
  pid: number;
  host: Server;
}

export enum JobType {
  hack = "hack",
  grow = "grow",
  weak = "weak",
}

export interface JobTimes {
  duration: number;
  end: number;
}

export interface Job {
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
