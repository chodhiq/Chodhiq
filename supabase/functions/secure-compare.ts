// Constant-time comparison for shared secrets. Both values are hashed first, so the
// comparison time does not depend on where the strings differ or on their length.
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const x = new Uint8Array(hashA);
  const y = new Uint8Array(hashB);
  let difference = 0;
  for (let index = 0; index < x.length; index++) difference |= x[index] ^ y[index];
  return difference === 0;
}

// True when the supplied value matches at least one configured secret.
// Checks every configured secret so timing does not reveal which one matched.
export async function matchesAnySecret(
  supplied: string | null,
  secrets: Array<string | undefined>,
): Promise<boolean> {
  if (!supplied) return false;
  let matched = false;
  for (const secret of secrets) {
    if (secret && (await timingSafeEqual(supplied, secret))) matched = true;
  }
  return matched;
}
