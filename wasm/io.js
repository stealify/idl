const POINTER_WIDTH = 32 / 8;

/**
 * Write pointer to position in memory
 *
 * @param {WebAssembly.Memory} memory
 * @param {Pointer} destination
 * @param {Pointer} data
 * @returns {void}
 */
function writeI32(memory, destination, data) {
  const memoryView = new Uint8Array(memory.buffer);
  let buffer = new ArrayBuffer(POINTER_WIDTH);

  const slicePtr = new DataView(buffer);
  slicePtr.setInt32(0, data, true);

  let byteBuffer = new Uint8Array(buffer);

  for (let i = 0; i < POINTER_WIDTH; i++) {
    memoryView[destination + i] = byteBuffer[i];
  }
}

/**
 * Create a slice of `[ptr, len]` from data (by allocating a buffer)
 *
 * @param {WebAssembly.Memory} memory
 * @param {Uint8Array} data
 * @param {(length: number) => Pointer} alloc
 * @returns {Pointer} Pointer to `[Pointer, number]` pair
 */
function newSlice(memory, alloc, data) {
  const len = data.length;
  const sliceData = alloc(len);
  const memView = new Uint8Array(memory.buffer);

  for (let i = 0; i < len; i++) {
    memView[sliceData + i] = data[i];
  }

  const ptr = alloc(2 * POINTER_WIDTH);
  writeI32(memory, ptr, sliceData);
  writeI32(memory, ptr + POINTER_WIDTH, len);

  return ptr;
}

/**
 * Retrieve `[ptr, len]` from position `offset` in `memory`
 *
 * @param {WebAssembly.Memory} memory
 * @param {Pointer} inPointer
 * @returns {[Pointer, number]}
 */
function extractSlice(memory, inPointer) {
  /**
   * @param {Uint8Array} bytes
   */
  const iterToI32 = bytes => {
    const view = new DataView(bytes.buffer);
    return view.getUint32(0, true);
  };

  /**
   * @param {number} ptr
   */
  const getI32 = function(ptr) {
    return new Uint8Array(memory.buffer).slice(ptr, ptr + POINTER_WIDTH);
  };

  const outPointer = iterToI32(getI32(inPointer));
  const length = iterToI32(getI32(inPointer + POINTER_WIDTH));

  return [outPointer, length];
}

/**
 * @param {WebAssembly.Memory} memory
 * @param {Pointer} pointer
 * @param {number} length
 * @return {Uint8Array}
 */
function getSliceData(memory, pointer, length) {
  /**
   * @param {Pointer} ptr
   * @param {number} len
   */
  const getData = function*(ptr, len) {
    const memView = new Uint8Array(memory.buffer);
    for (let index = 0; index < len; index++) {
      if (memView[ptr] === undefined) {
        throw new Error(`Tried to read undef mem at ${ptr}`);
      }
      yield memView[ptr + index];
    }
  };

  return new Uint8Array(getData(pointer, length));
}

module.exports = {
  extractSlice,
  getSliceData,
  newSlice,
};
