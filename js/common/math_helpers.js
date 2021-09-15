class MathHelpers {
  // Find integers `sign`, `int` and `exponent` such that:
  //   x = (-1**sign) * int * 2**exponent
  static getFloatParts(x) {
    let float = new Float64Array(1);
    let bytes = new Uint8Array(float.buffer);

    float[0] = x;

    const sign = bytes[7] >> 7;
    const exponent = BigInt(
      ((bytes[7] & 0x7f) << 4 | bytes[6] >> 4) - 0x3ff - 52);

    let n = BigInt((bytes[6] & 0x0f) | 0x10);
    for (let i = 5; i >= 0; i--) {
      n = (n << 8n) | BigInt(bytes[i]);
    }

    return {
      sign: sign,
      exponent: exponent,
      int: n,
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
    return BigInt(n.toString(2).length - 1);
  }
}


