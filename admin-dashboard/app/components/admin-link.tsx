import type { ComponentPropsWithoutRef } from "react";

type AdminLinkProps = ComponentPropsWithoutRef<"a"> & { href: string };

// Admin routes use document navigation deliberately. The client router cancels
// the native click before loading its transition modules/RSC payload, so a failed
// transition can strand the user on the previous page. A regular anchor also
// works before hydration and preserves browser back, new-tab and hash behavior.
// AdminProvider restores the persisted Supabase session on the destination.
export default function AdminLink({ children, ...props }: AdminLinkProps) {
  return <a {...props}>{children}</a>;
}
