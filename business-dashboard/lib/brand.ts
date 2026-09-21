const name = process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "ChodhiQ";

export const brand = Object.freeze({
  name,
  mark: (process.env.NEXT_PUBLIC_BRAND_MARK?.trim() || (name === "ChodhiQ" ? "Q" : name.charAt(0)) || "Q").toUpperCase(),
  businessTitle: `${name} Business`,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@chodhiq.app",
  businessEmail: process.env.NEXT_PUBLIC_BUSINESS_EMAIL?.trim() || "business@chodhiq.app",
  billingEmail: process.env.NEXT_PUBLIC_BILLING_EMAIL?.trim() || "billing@chodhiq.app",
  logoPath: process.env.NEXT_PUBLIC_BRAND_LOGO_PATH?.trim() || "/favicon.png",
});
