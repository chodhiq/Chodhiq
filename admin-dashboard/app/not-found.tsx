import Link from './components/admin-link';
import { EmptyState } from './components/ui';

export default function NotFound() {
  return (
    <main className="route-error">
      <EmptyState title="Page not found" detail="Check the address or return to the dashboard." />
      <Link className="primary" href="/">Go to dashboard</Link>
    </main>
  );
}
