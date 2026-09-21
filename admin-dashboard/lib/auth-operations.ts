export async function withAuthTimeout<T>(work: PromiseLike<T>, timeoutMs = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(work),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("auth_timeout")), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function signInErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
  if (code === "invalid_credentials") return "Email or password is incorrect. Check your details and try again.";
  if (code === "email_not_confirmed") return "Confirm your email address before signing in.";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit") return "Too many attempts. Wait a few minutes and try again.";
  if (error instanceof Error && error.message === "auth_timeout") return "Sign-in timed out. Check your connection and try again.";
  return "Unable to sign in. Check your connection and try again. If this continues, contact an administrator.";
}
