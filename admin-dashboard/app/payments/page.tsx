import { PaymentsOperationsPage } from "../components/enhanced-list-pages";
import { AdminShell } from "../components/admin-shell";
import { Page } from "../components/ui";

export default function PaymentsPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_MONETISATION?.trim().toLowerCase() !== "true") {
    return <AdminShell title="Payments"><Page title="Payments paused" note="Payment operations are disabled for the initial launch."><section className="panel empty">No payment controls are available.</section></Page></AdminShell>;
  }
  return <PaymentsOperationsPage />;
}
