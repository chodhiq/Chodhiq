const name = process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "ChodhiQ";

export const brand = Object.freeze({
  name,
  mark: (process.env.NEXT_PUBLIC_BRAND_MARK?.trim() || (name === "ChodhiQ" ? "Q" : name.charAt(0)) || "Q").toUpperCase(),
  adminTitle: `${name} Admin`,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@chodhiq.co.uk",
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || "office@chodhiq.co.uk",
  securityEmail: process.env.NEXT_PUBLIC_SECURITY_EMAIL?.trim() || "office@chodhiq.co.uk",
  logoPath: process.env.NEXT_PUBLIC_BRAND_LOGO_PATH?.trim() || "/favicon.png",
});
