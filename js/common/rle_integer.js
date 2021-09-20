class RLEInteger {
  static ONE = (() => {
    let a = new RLEInteger([1n]);
    a.freeze();
    return a;
  })();

  #rle;
  #size;
  #bigint;

  constructor(rle, size, bigint) {
    if (rle === undefined) {
      rle = [];
      size = 0n;
      bigint = 0n;
    }
    this.#rle = rle;

    if (size === undefined) {
      size = this.#rle.reduce((a,b) => a+b, 0n);
    }
    this.#size = size;

    this.#bigint = bigint;
  }

  clone() {
    return new RLEInteger(this.#rle.slice(), this.#size, this.#bigint);
  }

  freeze() {
    this.appendBit = undefined;
    this.rightShift = undefined;
    this.reverse = undefined;
  }

  normalize() {
    // Truncate fom the front until the leading bit in a 1.
    while (this.#rle.length && this.#rle[0] == 0n) {
      this.#rle.shift();
      this.#size -= this.#rle.shift() || 0n;
    }
  }

  copyRLE() {
    return this.#rle.slice();
  }

  size() {
    return this.#size;
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
    if (this.#bigint === undefined) {
      const rle = this.#rle;

      // TODO: Go from opposite direction.
      let isOne = true;
      let bigint = 0n;
      for (let j = 0; j < rle.length; j++) {
        bigint <<= rle[j];
        if (isOne) bigint |= (1n << rle[j])-1n;

        isOne = !isOne;
      }

      this.#bigint = bigint;
    }

    return this.#bigint;
  }

  numLeadingOnes() {
    return this.#size ? this.#rle[0] : 0n;
  }

  appendBit(b, n) {
    if (n === 0n) return;

    let rle = this.#rle;

    if (rle.length == 0) rle.push(0n);

    if (b == rle.length%2) {
      rle[rle.length-1] += n;
    } else {
      rle.push(n);
    }
    this.#size += n;
    this.#bigint = undefined;
  }

  rightShift(n) {
    if (n >= this.#size) {
      this.#rle = [];
      this.#size = 0n;
      this.#bigint = 0n;
      return;
    }

    this.#size -= n;
    this.#bigint = undefined;

    let rle = this.#rle;
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
    let rle = this.#rle;

    const leadingZeros = padToSize > this.#size ? padToSize - this.#size : 0n;

    // Remove all trailing 0s or 0 bits).
    while (rle.length && (rle[rle.length-1] === 0n || rle.length%2 == 0)) {
      this.#size -= rle.pop();
    }
    rle.reverse();
    // In case there were any leading 0s.
    while (rle.length && (rle[rle.length-1] === 0n)) {
      rle.pop();
    }

    this.appendBit(0, leadingZeros);

    this.#bigint = undefined;
  }

  suffix(n) {
    if (n >= this.#size) return new RLEInteger(this.#rle.slice(), this.#size);
    if (n == 0) return new RLEInteger();

    // Find the index to slice from.
    let remaining = this.#size-n;
    let i = 0;
    while (i < this.#rle.length && remaining >= 0) {
      remaining -= this.#rle[i];
      i++;
    }

    let rle;
    if (i%2==0) {
      // We've finished on z 0 section, so truncate them all.
      rle = this.#rle.slice(i);
    } else {
      rle = this.#rle.slice(i-1);
      rle[0] = -remaining;
    }

    return new RLEInteger(rle);
  }

  static cmp(a, b) {
    if (a.#size > b.#size) return 1;
    if (a.#size < b.#size) return -1;

    // Same number of bits - find first difference.
    for (let i = 0; i < a.#rle.length; i++) {
      if (a.#rle[i] > b.#rle[i]) return i%2 ? -1 :  1;
      if (a.#rle[i] < b.#rle[i]) return i%2 ?  1 : -1;
    }

    // Numbers are the same.
    return 0;
  }

  // Add positive numbers.
  static add(a, b) {
    let r = a.#rle.slice();
    let q = b.#rle.slice();

    let result = new RLEInteger();

    r.reverse();
    q.reverse();

    const sizeDiff = a.#size - b.#size;
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
        return [this.#sub(a, b), 1];
      case -1:
        return [this.#sub(b, a), -1];
    }
  }

  // Subtract positive numbers where a > b.
  static #sub(a, b) {
    let r = a.#rle.slice();
    let q = b.#rle.slice();

    let result = new RLEInteger();

    r.reverse();
    q.reverse();

    const sizeDiff = a.#size - b.#size;
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

