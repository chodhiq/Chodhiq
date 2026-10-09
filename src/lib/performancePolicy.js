export function performancePolicy(totalMemory) {
  const lowMemory = Number.isFinite(totalMemory) && totalMemory > 0 && totalMemory <= 3 * 1024 ** 3;
  return {
    lowMemory,
    initialRows: lowMemory ? 3 : 5,
    renderBatch: lowMemory ? 3 : 5,
    listWindow: lowMemory ? 5 : 7,
    uploadWidth: lowMemory ? 1080 : 1440,
  };
}
