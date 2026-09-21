import { SubscriptionsPage } from "../components/phase2-pages";
import { AdminShell } from "../components/admin-shell";
import { Page } from "../components/ui";

export default function SubscriptionsRoute() {
  if (process.env.NEXT_PUBLIC_ENABLE_MONETISATION?.trim().toLowerCase() !== "true") {
    return <AdminShell title="Subscriptions"><Page title="Subscriptions paused" note="Subscription operations are disabled for the initial launch."><section className="panel empty">No subscription controls are available.</section></Page></AdminShell>;
  }
  return <SubscriptionsPage />;
}
