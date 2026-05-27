export const contactEmails = {
  support: process.env.NEXT_PUBLIC_YENTL_SUPPORT_EMAIL || "support@yentl.it",
  privacy: process.env.NEXT_PUBLIC_YENTL_PRIVACY_EMAIL || "privacy@yentl.it",
  accessibility: process.env.NEXT_PUBLIC_YENTL_ACCESSIBILITY_EMAIL || "accessibility@yentl.it",
};

export function mailto(email: string, subject: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
