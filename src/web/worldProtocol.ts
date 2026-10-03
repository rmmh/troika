export type WorldInput = { type: 'keys'; cells: number[] } | { type: 'running'; value: boolean };
export interface WorldFrame {
  type: 'frame'; pixels: ArrayBuffer; text: string; cycles: number;
  running: boolean; powered: boolean; status: string; error?: string;
}
