import { Skeleton } from './components/ui';
import { PageHeader } from './components/ui';

export default function Loading() {
  return (
    <main className="route-loading page" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading this workspace</span>
      <PageHeader eyebrow="Loading workspace" title="Loading this page" description="Preparing the latest operations data." />
      <Skeleton rows={4} />
      <section className="panel" aria-label="Loading records"><Skeleton rows={6} /></section>
    </main>
  );
}
