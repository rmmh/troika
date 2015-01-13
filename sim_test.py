#!/usr/bin/env python

import unittest

import sim


def test_divmod27():
    for x in xrange(40000):
        assert sim.divmod27(x) == divmod(x, 27)


MAX_TRYTE = 3**9/2


def test_round_trip():
    for n in xrange(-MAX_TRYTE, MAX_TRYTE + 1):
        assert int(sim.Tryte(n)) == n
        assert n == sim.Tryte.tribbles_to_value(str(sim.Tryte(n)))


def test_eq():
    assert sim.Tryte(0) == sim.Tryte(0)
    assert sim.Tryte(1) != sim.Tryte(-1)
    assert False == (sim.Tryte(0) != sim.Tryte(0))


def test_wrap():
    assert -MAX_TRYTE == int(sim.Tryte(MAX_TRYTE+1))


def run_test(func, inputs, outputs):
    m = sim.Machine()
    func_len = m.set_memory(func, '_AA')
    m['__P'] = sim.Tryte.from_tribbles('_AA')

    data_ptr = 14
    for n, arg in enumerate(inputs, -13):
        if isinstance(arg, int):
            m[n] = sim.Tryte(arg)
        else:
            m.set_memory(arg, data_ptr)
            m[n] = sim.Tryte(data_ptr)
            data_ptr += len(arg)/3 + 1  # +1 for null-terminated strings

    m.dump_state()

    for _ in range(1000):
        if m[m.PC_INDEX] == -364 + func_len or m[m[m.PC_INDEX]] == 'OPS':
            break
        m.step()
    for n, out in enumerate(outputs, -13):
        assert m[n] == out, \
            'output #%d should be %r, but is %r' % (n+14, out, int(m[n]))


class TestPrograms(object):
    def test_add(self):
        run_test('AABAACAAD', [1, 2, 3, 4], [1+2+3+4])

    def test_arithmetic(self):
        run_test('AABSCDPEFAACAAE', [1, 2, 3, 4, 5, 6], [(1+2)+(3-4)+(5*6)])

    def test_strlen(self):
        run_test('MBARCAECZJ_OIANJ_ISABOPS', ['TEST_STRING_', 'foo'],
                 [len('TEST_STRING_')/3])


if __name__ == '__main__':
    unittest.main()
