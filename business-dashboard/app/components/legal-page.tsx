import type { ReactNode } from 'react';
import Link from 'next/link';

const localLinks: Record<string, string> = {
  './MODERATION_POLICY.md': '/moderation-policy',
  './RETENTION_POLICY.md': '/retention-policy',
};

function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(text.slice(cursor, index));
    if (match[1]) {
      const href = localLinks[match[2]] || match[2];
      parts.push(
        href.startsWith('/') || href.startsWith('https://') ? (
          <a key={index} href={href} rel={href.startsWith('https://') ? 'noreferrer' : undefined}>
            {match[1]}
          </a>
        ) : (
          match[1]
        ),
      );
    } else if (match[3]) parts.push(<strong key={index}>{match[3]}</strong>);
    else parts.push(match[4]);
    cursor = index + match[0].length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function documentBlocks(markdown: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let paragraph: string[] = [];
  let list: string[] = [];
  let table: string[] = [];
  const flush = () => {
    if (paragraph.length) {
      blocks.push(<p key={blocks.length}>{inline(paragraph.join(' '))}</p>);
      paragraph = [];
    }
    if (list.length) {
      blocks.push(
        <ul key={blocks.length}>
          {list.map((item, index) => (
            <li key={index}>{inline(item)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
    if (table.length) {
      blocks.push(<pre key={blocks.length}>{table.join('\n')}</pre>);
      table = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith('#')) {
      flush();
      const level = line.match(/^#+/)?.[0].length || 1;
      const heading = line.replace(/^#+\s*/, '');
      if (level === 1) blocks.push(<h1 key={blocks.length}>{inline(heading)}</h1>);
      else if (level === 2) blocks.push(<h2 key={blocks.length}>{inline(heading)}</h2>);
      else blocks.push(<h3 key={blocks.length}>{inline(heading)}</h3>);
    } else if (line.startsWith('- ')) {
      if (paragraph.length || table.length) flush();
      list.push(line.slice(2));
    } else if (line.startsWith('|')) {
      if (paragraph.length || list.length) flush();
      table.push(line);
    } else {
      if (list.length || table.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

export default function LegalPage({ markdown }: { markdown: string }) {
  return (
    <main className="legal-shell">
      <nav aria-label="Legal pages" className="legal-nav">
        <Link href="/">ChodhiQ</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/delete-account">Delete account</Link>
      </nav>
      <article className="legal-document">{documentBlocks(markdown)}</article>
    </main>
  );
}
