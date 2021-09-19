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
    // Note: can be faster with base-16 but code is more complicated.
    return BigInt(n.toString(2).length - 1);
  }
}

class RLEInteger {
  static ONE = (() => {
    let a = new RLEInteger([1n]);
    a.freeze();
    return a;
  })();

  constructor(rle, size, bigint) {
    if (rle === undefined) {
      rle = [];
      size = 0n;
      bigint = 0n;
    }
    this._rle = rle;

    if (size === undefined) {
      size = this._rle.reduce((a,b) => a+b, 0n);
    }
    this._size = size;

    this._bigint = bigint;
  }

  check() {
    if (this._rle && this._rle[0] < 0) throw('negative');
  }

  clone() {
    return new RLEInteger(this._rle.slice(), this._size, this._bigint);
  }

  freeze() {
    this.appendBit = undefined;
    this.rightShift = undefined;
    this.reverse = undefined;
  }

  normalize() {
    // Truncate fom the front until the leading bit in a 1.
    while (this._rle.length && this._rle[0] == 0n) {
      this._rle.shift();
      this._size -= this._rle.shift() || 0n;
    }
  }

  copyRLE() {
    return this._rle.slice();
  }

  size() {
    return this._size;
  }

  static fromBigInt(n) {
    if (!n) return new RLEInteger();
    if (n < 0) throw('RLEInteger must be positive.');

    const str = n.toString(2);
    const strLen = str.length;

    let rle = [];
    let i = 0;
    let curChar = '1';
    while (i < strLen) {
      const startI = i;
      while (str[i] === curChar) i++;
      rle.push(BigInt(i-startI));

      curChar = str[i];
    }
    return new RLEInteger(rle, BigInt(strLen), n);
  }

  toBigInt() {
    if (this._bigint === undefined) {
      const rle = this._rle;

      // TODO: Go from opposite direction.
      let isOne = true;
      let bigint = 0n;
      for (let j = 0; j < rle.length; j++) {
        bigint <<= rle[j];
        if (isOne) bigint |= (1n << rle[j])-1n;

        isOne = !isOne;
      }

      this._bigint = bigint;
    }

    return this._bigint;
  }

  numLeadingOnes() {
    return this._size ? this._rle[0] : 0n;
  }

  appendBit(b, n) {
    if (n === 0n) return;

    let rle = this._rle;

    if (rle.length == 0) rle.push(0n);

    if (b == rle.length%2) {
      rle[rle.length-1] += n;
    } else {
      rle.push(n);
    }
    this._size += n;
    this._bigint = undefined;
  }

  rightShift(n) {
    if (n >= this._size) {
      this._rle = [];
      this._size = 0n;
      this._bigint = 0n;
      return;
    }

    this._size -= n;
    this._bigint = undefined;

    let rle = this._rle;
    while (n > 0) {
      const lastValue = rle[rle.length-1]
      if (lastValue <= n) {
        n -= lastValue;
        rle.pop();
      } else {
        rle[rle.length-1] -= n;
        n = 0n;
      }
    }
  }

  reverse(padToSize) {
    let rle = this._rle;

    const leadingZeros = padToSize > this._size ? padToSize - this._size : 0n;

    // Remove all trailing 0s or 0 bits).
    while (rle.length && (rle[rle.length-1] === 0n || rle.length%2 == 0)) {
      this._size -= rle.pop();
    }
    rle.reverse();
    // In case there were any leading 0s.
    while (rle.length && (rle[rle.length-1] === 0n)) {
      rle.pop();
    }

    this.appendBit(0, leadingZeros);

    this._bigint = undefined;
  }

  suffix(n) {
    if (n >= this._size) return new RLEInteger(this._rle.slice(), this._size);
    if (n == 0) return new RLEInteger();

    // Find the index to slice from.
    let remaining = this._size-n;
    let i = 0;
    while (i < this._rle.length && remaining >= 0) {
      remaining -= this._rle[i];
      i++;
    }

    let rle;
    if (i%2==0) {
      // We've finished on z 0 section, so truncate them all.
      rle = this._rle.slice(i);
    } else {
      rle = this._rle.slice(i-1);
      rle[0] = -remaining;
    }

    return new RLEInteger(rle);
  }

  static cmp(a, b) {
    if (a._size > b._size) return 1;
    if (a._size < b._size) return -1;

    // Same number of bits - find first difference.
    for (let i = 0; i < a._rle.length; i++) {
      if (a._rle[i] > b._rle[i]) return i%2 ? -1 :  1;
      if (a._rle[i] < b._rle[i]) return i%2 ?  1 : -1;
    }

    // Numbers are the same.
    return 0;
  }

  // Add positive numbers.
  static add(a, b) {
    let r = a._rle.slice();
    let q = b._rle.slice();

    let result = new RLEInteger();

    r.reverse();
    q.reverse();

    const sizeDiff = a._size - b._size;
    if (sizeDiff < 0) {
      r.push(-sizeDiff);
      r.push(0n);
    } else if (sizeDiff > 0) {
      q.push(sizeDiff);
      q.push(0n);
    }

    let carry = 0;
    while (r.length && q.length) {
      // Choose the smaller value, and subtract it from both.
      const v = r[0] < q[0] ? r[0] : q[0];
      r[0] -= v;
      q[0] -= v;

      // Figure out the current values of the bits.
      let bitSum = r.length%2 + q.length%2;

      if (bitSum == 0) {
        result.appendBit(carry, 1n);
        result.appendBit(bitSum, v-1n);
        carry = 0;
      } else if (bitSum == 1) {
        result.appendBit(1-carry, v);
        // carry remains.
      } else {
        result.appendBit(carry, 1n);
        result.appendBit(1, v-1n);
        carry = 1;
      }

      // Remove the used up entries.
      if (r[0] == 0) r.shift();
      if (q[0] == 0) q.shift();
    }

    if (carry) {
      result.appendBit(carry, 1n);
    }

    result.reverse();

    return result;
  }

  static sub(a, b) {
    switch (this.cmp(a, b)) {
      case 0:
        return [new RLEInteger(), 0];
      case 1:
        return [this._sub(a, b), 1];
      case -1:
        return [this._sub(b, a), -1];
    }
  }

  // Subtract positive numbers where a > b.
  static _sub(a, b) {
    let r = a._rle.slice();
    let q = b._rle.slice();

    let result = new RLEInteger();

    r.reverse();
    q.reverse();

    const sizeDiff = a._size - b._size;
    if (sizeDiff < 0) {
      r.push(-sizeDiff);
      r.push(0n);
    } else if (sizeDiff > 0) {
      q.push(sizeDiff);
      q.push(0n);
    }

    let borrow = 0;
    while (r.length && q.length) {
      // Choose the smaller value, and subtract it from both.
      const v = r[0] < q[0] ? r[0] : q[0];
      r[0] -= v;
      q[0] -= v;

      // Figure out the current values of the bits.
      let bitSum = r.length%2 - q.length%2;

      if (bitSum == 1) {
        result.appendBit(1-borrow, 1n);
        result.appendBit(bitSum, v-1n);
        borrow = 0;
      } else if (bitSum == 0) {
        result.appendBit(borrow, v);
      } else if (bitSum == -1) {
        result.appendBit(1-borrow, 1n);
        result.appendBit(0, v-1n);
        borrow = 1;
      }

      // Remove the used up entries.
      if (r[0] == 0) r.shift();
      if (q[0] == 0) q.shift();
    }

    result.reverse();

    if (borrow) {
      throw('subtraction result is negative: ' +  result);
    }

    return result;
  }
}
