import functools
import random


DIGITS = 'ABCDEFGHIJKLM_NOPQRSTUVWXYZ'


def coerce_other(f):
    def wrapper(self, other, *args):
        if not isinstance(other, Tryte):
            if isinstance(other, str):
                other = Tryte.from_tribbles(other)
            else:
                other = Tryte(other)
        return f(self, other, *args)
    return wrapper


def divmod27(x):
    quo = (x * 0x97B5) >> 20
    rem = x - 27 * quo
    return quo, rem


@functools.total_ordering
class Tryte(object):
    def __init__(self, value=0):
        self.value = (value + 9841) % 19683 - 9841

    @staticmethod
    def tribbles_to_value(tribbles):
        assert len(tribbles) == 3
        ht = DIGITS.index(tribbles[0])
        mt = DIGITS.index(tribbles[1])
        lt = DIGITS.index(tribbles[2])
        return (ht * 729 + mt * 27 + lt) - 9841

    @classmethod
    def from_tribbles(cls, tribbles):
        return cls(cls.tribbles_to_value(tribbles))

    @classmethod
    def from_trits(cls, trits):
        val = 0
        for trit in trits:
            val = val * 3 + trit
        return cls(val - 9841)

    @classmethod
    def from_random(cls):
        return cls(random.randint(-9841, 9841))

    def __int__(self):
        return self.value

    def tribbles(self):
        ht, lt = divmod27(self.value + 9841)
        ht, mt = divmod27(ht)
        return ht, mt, lt

    def __str__(self):
        ht, mt, lt = self.tribbles()
        return DIGITS[ht] + DIGITS[mt] + DIGITS[lt]

    def trits_raw(self):
        val = self.value + 9841
        ret = []
        for _ in xrange(6):
            val, rem = divmod(val, 3)
            ret.append(rem)
        return ret[::-1]

    def trits(self):
        return ''.join('T01'[val] for val in self.trits_raw())

    @coerce_other
    def __add__(self, other):
        return Tryte(self.value + other.value)

    @coerce_other
    def __sub__(self, other):
        return Tryte(self.value - other.value)

    def __mul__(self, other):
        return Tryte(self.value * other.value)

    def __div__(self, other):
        return Tryte(self.value / other.value)

    def logic(self, other, fn):
        return Tryte.from_trits(fn(a, b) for a, b in
                                zip(self.trits_raw(), other.trits_raw()))

    def __and__(self, other):
        return self.logic(other, min)

    def __or__(self, other):
        return self.logic(other, max)

    @coerce_other
    def __eq__(self, other):
        return self.value == other.value

    def __ne__(self, other):
        return not self.__eq__(other)

    @coerce_other
    def __lt__(self, other):
        return self.value < other.value


class Machine(object):
    PC_INDEX = DIGITS.index('P') - 13
    SP_INDEX = DIGITS.index('S') - 13
    Z_INDEX = DIGITS.index('Z') - 13

    def __init__(self):
        self.mem = [Tryte(0) for _ in xrange(3**9)]

    def set_memory(self, data, offset=-364):
        if isinstance(offset, str):
            offset = Tryte.tribbles_to_value(offset)
        data = ''.join(data.split()).upper()
        for x in xrange(0, len(data), 3):
            self[offset + x/3] = Tryte.from_tribbles(data[x:x+3])
        return len(data)/3

    def dump_state(self, rowmin=-13, rowmax=13):
        if rowmin == -13 and rowmax == 13:
            print 'Machine state:'
            print '   '.join(DIGITS)
        for row_n in xrange(rowmin, rowmax + 1):
            offset = row_n * 27 - 13
            row = DIGITS[row_n + 13] + ' ' if rowmin != rowmax else ''
            row += ' '.join(str(self[offset + n]) for n in xrange(27))
            print row

    def __getitem__(self, index):
        if isinstance(index, str):
            index = Tryte.tribbles_to_value(index)
        index = int(index)
        if index == self.Z_INDEX:
            return Tryte(0)
        return self.mem[index + 364]

    def __setitem__(self, index, value):
        if isinstance(index, str):
            index = Tryte.tribbles_to_value(index)
        assert isinstance(value, Tryte)
        self.mem[int(index) + 364] = value

    def read_pc(self):
        ret = self[self[self.PC_INDEX]]
        self[self.PC_INDEX] += 1
        return ret

    def step(self):
        def decode_ref(r):
            if r == '_':
                return self.Z_INDEX
            elif r == 'N':
                return self.read_pc()
            return DIGITS.index(r) - 13

        def decode_val(v):
            if v == '_':
                return self.read_pc()
            elif v == 'N':
                return self[self.read_pc()]
            return self[DIGITS.index(v) - 13]

        def decode_vals_from_pc():
            a, b, c = str(self.read_pc())
            return decode_val(a), decode_val(b)

        op, hi, lo = str(self.read_pc())

        if op in 'ZOXD':   # 1 operand, write operand
            ref = decode_ref(lo)
            if op == 'Z':   # Zero
                self[ref] = Tryte(0)
            elif op == 'O':  # Pop
                self[self.SP_INDEX] += 1
                self[ref] = self[self[self.SP_INDEX]]
            elif op == 'X':  # Swap tribble
                self[ref] = Tryte.from_tribbles(str(self[ref])[::-1])
            elif op == 'D':  # Decrement
                self[ref] -= 1
        elif op in 'UC':    # 1 value-only operand
            val = decode_val(lo)
            if op == 'U':  # Push
                self[self[self.SP_INDEX]] = val
                self[self.SP_INDEX] -= 1
            elif op == 'C':  # Call
                self[self[self.SP_INDEX]] = self[self.PC_INDEX]
                self[self.SP_INDEX] -= 1
                self[self.PC_INDEX] = val
        elif op in 'WARMSPYB':  # 2 operand
            dest = decode_ref(hi)
            a = decode_val(hi)
            b = decode_val(lo)
            if op == 'M':
                self[dest] = b
            elif op == 'A':    # Add
                self[dest] = a + b
            elif op == 'S':  # Sub
                self[dest] = a - b
            elif op == 'P':  # Product
                self[dest] = a * b
            elif op == 'Q':
                if b == 0:
                    self[dest] = Tryte(0)
                else:
                    self[dest] = a / b
            elif op == 'B':  # Both (And)
                self[dest] = a & b
            elif op == 'Y':  # Any (Or)
                self[dest] = a | b
            elif op == 'R':  # Read a+b to dest
                self[dest] = self[b]
            elif op == 'T':  # Perform tritwise logical operation
                # actually 4 operand
                logic_results = self.read_pc().trits_raw()
                logic_combos = ((0, 0), (0, 1), (0, 2), (1, 1), (1, 2), (2, 2))
                logic_map = {}
                for (ta, tb), res in zip(logic_combos, logic_results):
                    logic_map[ta, tb] = res
                    logic_map[tb, ta] = res
                self[dest] = a.logic(b, logic_map.get)
        elif op == 'W':  # Write value-only to a+b
            val = decode_val(lo)
            a, b = decode_vals_from_pc()
            self[a + b] = val
        elif op == 'J':
            offset = (DIGITS.index(lo) - 13) + (DIGITS.index(hi) - 13) * 27
            self[self.PC_INDEX] += offset
        elif op in 'GLEN':  # conditional predicates
            a = decode_val(hi)
            b = decode_val(lo)
            if (op == 'G' and a < b or
               op == 'L' and a >= b or
               op == 'E' and a != b or
               op == 'N' and a == b):
                self[self.PC_INDEX] += 1
        elif op == 'I':  # special
            dest = decode_ref(hi)
            val = (DIGITS.index(lo) - 13)
            self[dest] += val
        else:
            raise NotImplementedError('OP: %s' % op)


if __name__ == '__main__':
    m = Machine()
    random.seed(5)
    for _ in range(1000):
        prog = ''.join(random.choice(DIGITS) for _ in xrange(729 * 2))
        m.set_memory(prog)
        #m.dump_state()
        for _ in range(100):
            try:
                m.step()
            except NotImplementedError, e:
                print '>>>> NIE', e
                break
        #m.dump_state()
