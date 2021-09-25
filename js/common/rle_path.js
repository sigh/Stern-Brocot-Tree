class RLEPath {
  _rle;
  _size;

  constructor(rle, size) {
    if (rle === undefined) {
      rle = [];
    }
    this._rle = rle;

    if (size === undefined) {
      size = this._rle.reduce((a,b) => a+b, 0n);
    }
    this._size = size;
  }

  clone() {
    return new RLEPath(this._rle.slice(), this._size);
  }

  *items() {
    const rle = this._rle;
    for (let i = 0; i < rle.length; i++) {
      yield [i&1, rle[i]];
    }
  }

  size() {
    return this._size;
  }

  static fromBigInt(n) {
    if (!n) return new RLEPath();
    if (n < 0) throw('RLEPath must be from a positive index.');

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
    return new RLEPath(rle, BigInt(strLen), n);
  }

  toBigInt() {
    const rle = this._rle;

    let isOne = true;
    let bigint = 0n;
    for (let j = 0; j < rle.length; j++) {
      bigint <<= rle[j];
      if (isOne) bigint |= (1n << rle[j])-1n;

      isOne = !isOne;
    }

    return bigint;
  }

  lastBit() {
    return this._rle.length&1;
  }

  appendBit(b) {
    const rle = this._rle;

    if (rle.length == 0) rle.push(0n);

    if (b == this.lastBit()) {
      rle[rle.length-1]++;
    } else {
      rle.push(1n);
    }

    this._size++;
  }

  rightShift(n) {
    if (this._size <= n) {
      this._size = 0n;
      this._rle = [];
      return;
    }

    this._size -= n;

    const rle = this._rle;

    while (n > 0) n -= rle.pop();
    if (n < 0) rle.push(-n);
  }

  reverse() {
    const rle = this._rle;
    if (!rle.length) return;

    // Make sure the path ends in an R-count.
    if (this.lastBit() == 0) rle.push(0n);

    rle.reverse();

    // If there was a leading 0, remove it.
    if (rle[rle.length-1] == 0) rle.pop();

    return;
  }

  suffix(n) {
    if (n >= this._size) return new RLEPath(this._rle.slice(), this._size);
    if (n == 0) return new RLEPath();

    // Find the index to slice from.
    let remaining = this._size-n;
    let i = 0;
    while (i < this._rle.length && remaining >= 0) {
      remaining -= this._rle[i];
      i++;
    }

    let rle;
    if (i%2==0) {
      // We've finished on 0, so add a leading 1.
      rle = this._rle.slice(i-2);
      rle[0] = 0n;
      rle[1] = -remaining;
    } else {
      // We've finished on a 1, so just add the remaining bits.
      rle = this._rle.slice(i-1);
      rle[0] = -remaining;
    }

    return new RLEPath(rle);
  }

  hasPrefix(other) {
    if (other._size > this._size) return false;
    if (other._size === 0n) return true;

    // Ensure all the digits before last one are equal.
    let i = 0;
    for (; i < other._rle.length-1; i++) {
      if (other._rle[i] != this._rle[i]) return false;
    }

    // The last digit can be less than or equal.
    return other._rle[i] <= this._rle[i];
  }

  equals(other) {
    if (this._rle.length != other._rle.length) return false;

    // Same number of bits - find first difference.
    for (let i = 0; i < this._rle.length; i++) {
      if (this._rle[i] !== other._rle[i]) return false;
    }

    return true;
  }

  inc() {
    this._adj(1);
    return this;
  }
  dec() {
    this._adj(0);
    return this;
  }

  _adj(bit) {
    const rle = this._rle;

    // Replace all ab...b with ba...a where a = 1-b;

    // Remove the trailing bs.
    let bs = 0n;
    if (this.lastBit() == bit) {
      bs = rle.pop();
    }

    if (rle.length == 0) throw('Edge of layer');

    // Replace the last !b with a b.
    const as = rle.pop()-1n;
    if (as > 0) {
      rle.push(as, 1n);
    } else {
      if (!rle.length) rle.push(0n, 0n);
      rle[rle.length-1]++;
    }

    // Add the bs number of a.
    if (bs) rle.push(bs);
  }
}

