class MathHelpers {
  // Part a Javascript Number `x` into parts such that:
  //   x = sign * mantissa * 2**exponent
  //   x = sign * intMantissa * 2**intExponent
  // Where:
  //   1 <= mantissa < 2
  //   intMantissa is an integer.
  // Based on: https://stackoverflow.com/a/17156580
  static getNumberParts(x) {
    let float = new Float64Array(1);
    let bytes = new Uint8Array(float.buffer);

    float[0] = x;

    // Extract the sign (first bit).
    const sign = bytes[7] >> 7;
    // Extract the exponent (next 11 bits).
    const exponent = ((bytes[7] & 0x7f) << 4 | bytes[6] >> 4) - 0x3ff;

    // Set e to 1023 (0x3ff), so that the exponent is now 0.
    // This will give the unscaled mantissa.
    bytes[7] = 0x3f;
    bytes[6] |= 0xf0;
    const mantissa = float[0];

    // Set e so that the exponent is now 52.
    // This will give the mantissa scaled up to an integer.
    bytes[7] = 0x43;
    bytes[6] &= 0x3f;
    const intMantissa = float[0];

    return {
      sign: sign == 0 ? 1 : -1,
      exponent: exponent,
      mantissa: mantissa,
      intMantissa: intMantissa,
      intExponent: exponent-52,
    }
  }

  // Find the continued fraction for p/q
  // `p` and `q` MUST be BigInts.
  static findContinuedFractionBigInt(p, q) {
    let rem = p%q;
    let aList = [p/q]

    while (rem) {
      [p, q] = [q, rem];
      rem = p%q;
      aList.push(p/q);
    }

    return aList;
  }

  static evalContinuedFrac(cf) {
    let [a, b] = [1n, 0n];
    for (let i = cf.length-1; i>=0 ; i--) {
      [a, b] = [a*BigInt(cf[i]) + b, a];
    }
    return [a,b];
  }

  static _DECIMAL_DIGITS = 15n;
  static _DECIMAL_SCALE = 10n**15n;

  static fracToDecimal(a, b) {
    const intStr = (a/b).toString();
    const rem = a%b;

    if (rem == 0) return intStr;

    // Scale remainder by the number of decimal places.
    const scaledRem = rem * this._DECIMAL_SCALE;
    // Determine the digits, adding ellipses if there are still more.
    let fracStr = (scaledRem / b).toString();
    if (scaledRem % b !== 0n) fracStr += '…';
    // Truncate trailing zeros.
    fracStr = fracStr.replace(/0+$/, '');

    return intStr + '.' + fracStr;
  }

  static log2BigInt(n) {
    // Note: can be faster with base-16 but code is more complicated.
    return BigInt(n.toString(2).length - 1);
  }

  static parseAsFraction(str) {
    str = str.trim();
    let found;

    try {
      found = str.match(/^\d+$/);
      if (found) {
        return [BigInt(found[0]), 1n];
      }
      found = str.match(/^(\d+)\s*\/\s*(\d+)$/);
      if (found) {
        return [BigInt(found[1]), BigInt(found[2])];
      }
      found = str.match(/^(\d*)[.](\d+)$/);
      if (found) {
        const intPart = BigInt(found[1]);
        const fracPart = BigInt(found[2]);
        const scale = 10n**BigInt(found[2].length);
        return [intPart*scale+fracPart, scale];
      }
    } catch (e) { /* ignore */ }

    return undefined;
  }

  static gcd(a, b) {
    while (b) {
      [a, b] = [b, a%b];
    }
    return a;
  }
}
