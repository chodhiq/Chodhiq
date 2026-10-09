const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const legalDirectory = path.join(root, 'project-docs', 'legal');
const manifestPath = path.join(legalDirectory, 'PUBLICATION.json');
const outputPath = path.join(root, 'business-dashboard', 'lib', 'legal-publication.generated.json');
const documents = {
  terms: 'TERMS_OF_SERVICE.md',
  privacy: 'PRIVACY_POLICY.md',
  moderation: 'MODERATION_POLICY.md',
  retention: 'RETENTION_POLICY.md',
};

if (!fs.existsSync(manifestPath)) {
  throw new Error(
    'Create project-docs/legal/PUBLICATION.json from PUBLICATION.example.json after legal review.',
  );
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const required = [
  'publicBaseUrl',
  'privacyEmail',
  'approvedBy',
  'approvedAt',
  'legalReviewedBy',
  'privacyReviewedBy',
];
const missing = required.filter((key) => !String(manifest[key] || '').trim());
if (missing.length)
  throw new Error(`Legal publication approval is incomplete: ${missing.join(', ')}`);
const base = new URL(manifest.publicBaseUrl);
if (base.protocol !== 'https:' || base.pathname !== '/' || base.username || base.password) {
  throw new Error(
    'publicBaseUrl must be the credential-free HTTPS origin that hosts the legal pages.',
  );
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manifest.privacyEmail)) {
  throw new Error('A monitored privacyEmail is required.');
}
if (Number.isNaN(Date.parse(manifest.approvedAt))) {
  throw new Error('approvedAt must be a valid date.');
}

const content = Object.fromEntries(
  Object.entries(documents).map(([key, filename]) => {
    let markdown = fs.readFileSync(path.join(legalDirectory, filename), 'utf8');
    if (/\{\{[A-Z0-9_]+\}\}/.test(markdown)) {
      throw new Error(`${filename} still contains unpublished placeholders.`);
    }
    markdown = markdown
      .replace(/^\*\*Status:\*\*.*(?:\r?\n|$)/m, '')
      .replace(/^## Publication gates[\s\S]*$/m, '')
      .replace(
        /^No (?:version containing|placeholder-bearing version is).*publication\.?\s*$/gm,
        '',
      )
      .trim();
    if (markdown.length < 500) throw new Error(`${filename} is unexpectedly short.`);
    return [key, markdown];
  }),
);
if (!content.privacy.includes(manifest.privacyEmail)) {
  throw new Error('The Privacy Policy contact email must match PUBLICATION.json.');
}
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      approved: true,
      approvedBy: manifest.approvedBy,
      approvedAt: manifest.approvedAt,
      privacyEmail: manifest.privacyEmail,
      documents: content,
    },
    null,
    2,
  )}\n`,
);
console.log(`Legal pages prepared for ${base.origin}; verify all routes before deployment.`);
