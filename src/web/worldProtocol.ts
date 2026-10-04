import type { ChatView } from '../world/chat';
export interface WorldInspection {
  machine: string; machines: string[]; memory: ArrayBuffer; cycles: number;
  labels: [string, number][];
  sleep: { remaining: number } | null;
}
export type WorldInput = {type: 'audio'; enabled: boolean} | {type: 'save-snapshot'} | {type: 'load-snapshot'; buffer: ArrayBuffer} | { type: 'chat'; client: number; action: 'say' | 'join' | 'leave' | 'retry'; text?: string; room?: number } | { type: 'inspect'; machine: string | null } | { type: 'keys'; cells: number[] } | { type: 'running'; value: boolean } | { type: 'save' } | { type: 'load'; buffer: ArrayBuffer };
export interface WorldFrame {
  type: 'frame'; pixels: ArrayBuffer; text: string; cycles: number;
  running: boolean; powered: boolean; status: string; error?: string;
  audio?: ArrayBuffer;
  inspection?: WorldInspection;
  chat?: ChatView[];
  npc?: { visits: number; errors: number; status: number; text: string };
}

export type WorldOutput = WorldFrame | {type: 'snapshot'; buffer: ArrayBuffer} | { type: 'checkpoint'; buffer: ArrayBuffer } | { type: 'storage'; busy: boolean; error?: string };
