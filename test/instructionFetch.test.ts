import {expect, test} from 'vitest';
import {assemble} from '../src/asm/assemble';
import {Machine, REG_P} from '../src/core/machine';

function word(source: string) {
  const result = assemble(source);
  expect(result.diagnostics).toEqual([]);
  expect(result.chunks[0]!.data).toHaveLength(1);
  return result.chunks[0]!.data[0]!;
}

test('instruction decoding observes changed code and restored memory at the same PC', () => {
  const m = new Machine();
  m.poke(1000, word('M A 3')); m.poke(REG_P, 1000);
  const initial = m.captureCpuState();
  m.step(); expect(m.peek(-13)).toBe(3);
  m.poke(1000, word('M A 7')); m.poke(REG_P, 1000);
  m.step(); expect(m.peek(-13)).toBe(7);
  m.restoreCpuState(initial);
  m.step(); expect(m.peek(-13)).toBe(3); expect(m.cycles).toBe(1);
});

test('instruction decoding fetches changing MMIO exactly once per instruction', () => {
  const m = new Machine(), words = [word('M A 3'), word('M A 7')];
  let reads = 0;
  m.attach({id: 4, read: () => words[reads++]!});
  m.poke(REG_P, 95); m.step(); expect(m.peek(-13)).toBe(3);
  m.poke(REG_P, 95); m.step(); expect(m.peek(-13)).toBe(7);
  expect(reads).toBe(2); expect(m.cycles).toBe(2);
});

test('CPU literal opcodes expose every operand pair including memory, offset, immediate, PC and Z', () => {
  const m=new Machine();
  for(const opcode of [9,-5]) { // V (literal move), I (literal add)
    for(let hi=-13;hi<=13;hi++)for(let lo=-13;lo<=13;lo++) {
      m.reset();for(let r=-13;r<=13;r++)m.poke(r,37);
      m.poke(REG_P,1000);m.poke(1000,opcode*729+hi*27+lo);
      const extra=hi===2?13*729+5*27:2000; // Z/135, or absolute memory 2000
      m.poke(1001,extra);m.poke(2000,37);m.poke(135,37);
      m.step();
      const target=hi===-1?2000:hi===2?135:hi;
      if(hi!==0) {
        const before=hi===13?0:hi===REG_P?1001:37;
        expect(m.peek(target),`opcode${opcode} hi${hi} lo${lo}`).toBe(opcode===9?lo:before+lo);
      }
      expect(m.cycles).toBe(hi===0?2:hi===-1||hi===2?(opcode===9?3:4):1);
      if(hi!==REG_P)expect(m.peek(REG_P)).toBe(hi===0||hi===-1||hi===2?1002:1001);
    }
  }
});

test('CPU relative jumps preserve all 729 signed high/low displacements at wrapped fetch addresses', () => {
  const m=new Machine();
  for(const pc of [1000,9841])for(let hi=-13;hi<=13;hi++)for(let lo=-13;lo<=13;lo++) {
    m.reset();m.poke(pc,-4*729+hi*27+lo);m.poke(REG_P,pc);m.step();
    const destination=pc+1+hi*27+lo;
    const expected=((destination+9841)%19683+19683)%19683-9841;
    expect(m.peek(REG_P)).toBe(expected);expect(m.cycles).toBe(1);
  }
});
