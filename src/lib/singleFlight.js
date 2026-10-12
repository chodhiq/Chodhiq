export function runSingleFlight(lock, work) {
  if (lock.current) return Promise.resolve(undefined);

  lock.current = true;
  return Promise.resolve()
    .then(work)
    .finally(() => {
      lock.current = false;
    });
}
