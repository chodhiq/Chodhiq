/** Creates a promise queue for work that must never overlap. */
export function createSerialQueue() {
  let tail = Promise.resolve();
  return {
    runExclusive(work) {
      const result = tail.then(work, work);
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}
