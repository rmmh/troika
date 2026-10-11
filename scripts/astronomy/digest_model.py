"""Storage prediction for the DE441 digest; corrections restore quantized JPL coefficients.

The same ordered binary64 arithmetic is implemented in digest.ts. Prediction
quality affects compressed size only; accuracy is audited on the corrected data.
"""

import numpy as np

PI = 3.141592653589793
COUNTS = [14, 10, 13, 11, 8, 7, 6, 6, 6, 13, 11]
PIECES = [4, 2, 2, 1, 1, 1, 1, 1, 1, 8, 2]
QUANTA = [8000] * 9 + [400, 1000]


def sincos(phase):
    quadrant = np.floor(phase / (PI / 2) + 0.5)
    x = phase - quadrant * (PI / 2)
    xx = x * x
    s = 1 / 355687428096000
    for term in [
        -1 / 1307674368000,
        1 / 6227020800,
        -1 / 39916800,
        1 / 362880,
        -1 / 5040,
        1 / 120,
        -1 / 6,
        1,
    ]:
        s = term + xx * s
    sine = x * s
    c = 1 / 20922789888000
    for term in [
        -1 / 87178291200,
        1 / 479001600,
        -1 / 3628800,
        1 / 40320,
        -1 / 720,
        1 / 24,
        -1 / 2,
        1,
    ]:
        c = term + xx * c
    q = quadrant.astype(np.int64) % 4
    return np.choose(q, [sine, c, -sine, -c]), np.choose(q, [c, -sine, -c, sine])


def compose(c, alpha, beta, n):
    """Compose Chebyshev coefficient columns with alpha + beta*T1."""
    requested = n
    n = max(n, len(c))
    result = np.zeros((len(alpha), 3, n))
    before = np.zeros((len(alpha), n))
    before[:, 0] = 1
    current = np.zeros_like(before)
    current[:, 0] = alpha
    current[:, 1] = beta
    for k in range(len(c)):
        basis = before if k == 0 else current
        result += basis[:, None, :] * c[k][None, :, None]
        if k:
            following = 2 * alpha[:, None] * current - before
            for j in range(n):
                if j + 1 < n:
                    following[:, j + 1] += beta * current[:, j]
                following[:, abs(j - 1)] += beta * current[:, j]
            before, current = current, following
    return result[:, :, :requested]


def predict(model, coefficients, body, records):
    n = COUNTS[body]
    pieces = records * PIECES[body]
    width = 32 / PIECES[body]
    mids = (np.arange(pieces) + 0.5) * width
    if model["kind"] == "polynomial":
        at = np.floor(mids / model["widthDays"]).astype(int)
        alpha = 2 * (mids - at * model["widthDays"]) / model["widthDays"] - 1
        beta = np.full(pieces, width / model["widthDays"])
        # A different coarse polynomial applies to each native piece.
        output = np.zeros((pieces, 3, n))
        for i in np.unique(at):
            mask = at == i
            output[mask] = compose(coefficients[i], alpha[mask], beta[mask], n)
        return output
    duration = records * 32
    alpha = 2 * mids / duration - 1
    beta = np.full(pieces, width / duration)
    output = compose(coefficients[: model["trend"] + 1], alpha, beta, n)
    offset = model["trend"] + 1
    for frequency, bessel in zip(model["frequencies"], model["bessel"]):
        sine, cosine = sincos((2 * PI * frequency) * mids)
        wave_cos = np.empty((pieces, n + 2))
        wave_sin = np.empty_like(wave_cos)
        for k, j in enumerate(bessel):
            factor = (1 if k == 0 else 2) * (-1 if (k // 2) % 2 else 1) * j
            wave_cos[:, k] = factor * (cosine if k % 2 == 0 else -sine)
            wave_sin[:, k] = factor * (sine if k % 2 == 0 else cosine)
        for wave in [wave_cos, wave_sin]:
            amp = compose(coefficients[offset : offset + 3], alpha, beta, 3)
            offset += 3
            for k in range(n):
                first = (
                    wave[:, 0] + wave[:, 2] * 0.5
                    if k == 1
                    else (wave[:, abs(k - 1)] + wave[:, k + 1]) * 0.5
                )
                if k == 0:
                    first = wave[:, 1] * 0.5
                second = (
                    wave[:, 0] + wave[:, 4] * 0.5
                    if k == 2
                    else (wave[:, abs(k - 2)] + wave[:, k + 2]) * 0.5
                )
                if k == 0:
                    second = wave[:, 2] * 0.5
                output[:, :, k] += (
                    amp[:, :, 0] * wave[:, k, None]
                    + amp[:, :, 1] * first[:, None]
                    + amp[:, :, 2] * second[:, None]
                )
    return output
