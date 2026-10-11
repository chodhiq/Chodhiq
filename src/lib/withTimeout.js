/** @param {() => unknown | Promise<unknown>} work @param {number} timeoutMs @param {string} message @param {string} code */
export function withTimeout(work, timeoutMs, message, code) {
  let timer;
  return Promise.race([
    Promise.resolve().then(work),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error(message), { code })), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}
