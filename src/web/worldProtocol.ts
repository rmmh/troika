export interface WorldInspection {
  machine: string; machines: string[]; memory: ArrayBuffer; cycles: number;
  labels: [string, number][];
}
export type WorldInput = { type: 'inspect'; machine: string | null } | { type: 'keys'; cells: number[] } | { type: 'running'; value: boolean } | { type: 'save' } | { type: 'load'; buffer: ArrayBuffer };
export interface WorldFrame {
  type: 'frame'; pixels: ArrayBuffer; text: string; cycles: number;
  running: boolean; powered: boolean; status: string; error?: string;
  inspection?: WorldInspection;
  npc?: { visits: number; errors: number; status: number; text: string };
}

export type WorldOutput = WorldFrame | { type: 'checkpoint'; buffer: ArrayBuffer } | { type: 'storage'; busy: boolean; error?: string };
