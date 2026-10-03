import { fromTribbles } from './tryte';

export const SOUND_DEVICE_ID = 6; // tribble S
export const APU_SAMPLE_RATE = 19683; // 3^9 Hz: one sample per 27 CPU cycles
export const APU_CYCLES_PER_SAMPLE = 27;

export const REG_SOUND_MASTER = fromTribbles('_SA');
export const REG_SOUND_ENABLE = fromTribbles('_SB');
export const REG_SOUND_IRQ = fromTribbles('_SC');
export const REG_SOUND_STATUS = fromTribbles('_SD');

export const REG_PULSE1_CTRL = fromTribbles('_SE');
export const REG_PULSE1_PERIOD = fromTribbles('_SF');
export const REG_PULSE1_VOL = fromTribbles('_SG');
export const REG_PULSE1_ENV = fromTribbles('_SH');

export const REG_PULSE2_CTRL = fromTribbles('_SI');
export const REG_PULSE2_PERIOD = fromTribbles('_SJ');
export const REG_PULSE2_VOL = fromTribbles('_SK');
export const REG_PULSE2_ENV = fromTribbles('_SL');

export const REG_WAVE_CTRL = fromTribbles('_SM');
export const REG_WAVE_ENV = fromTribbles('_S_');
export const REG_WAVE_PERIOD = fromTribbles('_SN');
export const REG_WAVE_VOL = fromTribbles('_SO');
export const REG_WAVE_BASE = fromTribbles('_SP');

export const REG_NOISE_CTRL = fromTribbles('_SQ');
export const REG_NOISE_PERIOD = fromTribbles('_SR');
export const REG_NOISE_VOL = fromTribbles('_SS');
export const REG_NOISE_ENV = fromTribbles('_ST');

export const REG_SAMPLE_CTRL = fromTribbles('_SU');
export const REG_SAMPLE_RATE = fromTribbles('_SV');
export const REG_SAMPLE_VOL = fromTribbles('_SW');
export const REG_SAMPLE_START = fromTribbles('_SX');
export const REG_SAMPLE_LENGTH = fromTribbles('_SY');
export const REG_SAMPLE_ENV = fromTribbles('_SZ');

export const REG_NOISE_SEED = REG_NOISE_ENV; // historical name for _ST
export const REG_SAMPLE_LOOP = REG_SAMPLE_ENV; // historical name for _SZ

export const SOUND_IRQ_SAMPLE_END = 3;
