export type WorldInput = { type: 'keys'; cells: number[] } | { type: 'running'; value: boolean } | { type: 'save' } | { type: 'load'; buffer: ArrayBuffer };
export interface WorldFrame {
  type: 'frame'; pixels: ArrayBuffer; text: string; cycles: number;
  running: boolean; powered: boolean; status: string; error?: string;
}

export type WorldOutput = WorldFrame | { type: 'checkpoint'; buffer: ArrayBuffer } | { type: 'storage'; busy: boolean; error?: string };
