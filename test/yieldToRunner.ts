import { beforeEach } from 'vitest';

// Vitest batches task updates on a 100 ms timer. Let that batch and its IPC
// acknowledgement finish before a CPU-bound native simulation blocks the
// worker's event loop. A single setImmediate can run before the batch is sent.
beforeEach(() => new Promise<void>(resolve => setTimeout(resolve, 120)));
