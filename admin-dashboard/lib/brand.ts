const name = process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "ChodhiQ";

export const brand = Object.freeze({
  name,
  mark: (process.env.NEXT_PUBLIC_BRAND_MARK?.trim() || (name === "ChodhiQ" ? "Q" : name.charAt(0)) || "Q").toUpperCase(),
  adminTitle: `${name} Admin`,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@chodhiq.app",
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || "privacy@chodhiq.app",
  securityEmail: process.env.NEXT_PUBLIC_SECURITY_EMAIL?.trim() || "security@chodhiq.app",
  logoPath: process.env.NEXT_PUBLIC_BRAND_LOGO_PATH?.trim() || "/favicon.png",
});
