import functools

DIGITS = 'ABCDEFGHIJKLM_NOPQRSTUVWXYZ'


def coerce_other(f):
    def wrapper(self, other, *args):
        if not isinstance(other, Tryte):
            other = Tryte(other)
        return f(self, other, *args)
    return wrapper


@functools.total_ordering
class Tryte(object):

    def __init__(self, value=0):
        self.value = (value + 364) % 729 - 364

    @staticmethod
    def tribbles_to_value(tribbles):
        assert len(tribbles) == 2
        mst = DIGITS.index(tribbles[0])
        lst = DIGITS.index(tribbles[1])
        return (mst * 27 + lst) - 364

    @classmethod
    def from_tribbles(cls, tribbles):
        return cls(cls.tribbles_to_value(tribbles))

    @classmethod
    def from_trits(cls, trits):
        val = 0
        for trit in trits:
            val = val * 3 + trit
        return cls(val - 364)

    @classmethod
    def from_random(cls):
        return cls(random.randint(-364, 365))

    def __int__(self):
        return self.value

    def tribbles(self):
        mst, lst = divmod(self.value + 364, 27)
        return mst, lst

    def __str__(self):
        mst, lst = self.tribbles()
        return DIGITS[mst] + DIGITS[lst]

    def trits_raw(self):
        val = self.value + 364
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

    @coerce_other
    def __lt__(self, other):
        return self.value < other.value


class Machine(object):

    PC_INDEX = DIGITS.index('P') - 13
    SP_INDEX = DIGITS.index('S') - 13
    Z_INDEX = DIGITS.index('Z') - 13

    def __init__(self):
        self.mem = [Tryte(0) for _ in xrange(729)]

    def load_program(self, prog, offset=-364):
        if isinstance(offset, str):
            offset = Tryte.tribbles_to_value(offset)
        prog = ''.join(prog.split()).upper()
        for x in xrange(0, len(prog), 2):
            self[offset + x/2] = Tryte.from_tribbles(prog[x:x+2])

    def dump_state(self, rowmin=-13, rowmax=13):
        if rowmin == -13 and rowmax == 13:
            print 'Machine state:'
        if rowmin != rowmax:
            print '  ',
        print '  '.join(DIGITS)
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
            a, b = str(self.read_pc())
            return decode_val(a), decode_val(b)

        op, low = str(self.read_pc())

        #print 'op:', op + low

        if op in 'ZOXID':   # 1 operand, write operand
            ref = decode_ref(low)
            if op == 'Z':   # Zero
                self[ref] = Tryte(0)
            elif op == 'O':  # Pop
                self[self.SP_INDEX] -= 1
                self[ref] = self[self[self.SP_INDEX]]
            elif op == 'X':  # Swap tribble
                self[ref] = Tryte.from_tribbles(str(self[ref])[::-1])
            elif op == 'I':  # Increment
                self[ref] += 1
            elif op == 'D':  # Decrement
                self[ref] -= 1
        elif op in 'UC':    # 1 value-only operand
            val = decode_val(low)
            if op == 'U':  # Push
                self[self[self.SP_INDEX]] = val
                self[self.SP_INDEX] += 1
            elif op == 'C':  # Call
                self[self[self.SP_INDEX]] = self[self.PC_INDEX]
                self[self.SP_INDEX] += 1
                self[self.PC_INDEX] = val
        elif op in 'ASPYQBRT':  # 3 operand
            dest = decode_ref(low)
            a, b = decode_vals_from_pc()
            if op == 'A':    # Add
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
                self[dest] = self[a + b]
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
            val = decode_val(low)
            a, b = decode_vals_from_pc()
            self[a + b] = val
        elif op in 'JGLEN':  # jumps
            if low == '_':
                offset = self.read_pc()
            else:
                offset = DIGITS.index(low) - 13
            if op == 'J':
                self[self.PC_INDEX] += offset
            else:
                a, b = decode_vals_from_pc()
                if (op == 'G' and a >= b or
                   op == 'L' and a < b or
                   op == 'E' and a == b or
                   op == 'N' and a != b):
                        self[self.PC_INDEX] += offset
        elif op in 'MVH':  # special
            dest = decode_ref(low)
            val = self.read_pc()
            if op == 'M':  # move a value in memory to dest
                self[dest] = self[val]
            elif op == 'V':  # move a value to dest
                self[dest] = val
            elif op == 'H':
                # TODO: hardware interactions
                pass
        else:
            raise NotImplementedError('OP: %s' % op)


for n in xrange(-364, 365):
    t = Tryte(n)
    assert n == int(t)
    assert t == Tryte.from_tribbles(str(t))

import random


for _ in xrange(100):
    a, b = Tryte.from_random(), Tryte.from_random()
    aandb = a | b
    print a, b, aandb, a.trits(), b.trits(), aandb.trits()

a = Tryte(0)
print a, a.value

m = Machine()

wordlen = 'Zb$RcabQ>czIbJ<$Ma_bOp'
wordlen = 'ZBRCABQOCZIBJHMA_BOP'

m.load_program(wordlen, 'WA')
m.load_program('TEST_STRING_', 'SA')
m.load_program('VASAC_WAVPZZ', 'TA')
m['_P'] = Tryte.from_tribbles('TA')
m['_S'] = Tryte.from_tribbles('AA')

for _ in range(32):
    m.step()
    m.dump_state(0, 0)
    if m[m.PC_INDEX] == 364:
        m.dump_state()
        print m['_A']
        break


random.seed(5)
for _ in range(1000):
    prog = ''.join(random.choice(DIGITS) for _ in xrange(729 * 2))
    m.load_program(prog)
    #m.dump_state()
    for _ in range(100):
        try:
            m.step()
        except NotImplementedError, e:
            print '>>>> NIE', e
            break
    #m.dump_state()
