import publication from './legal-publication.generated.json';

export type LegalDocumentKind = keyof typeof publication.documents;

export function legalPublicationReady() {
  return (
    publication.approved === true &&
    Boolean(publication.approvedBy && publication.approvedAt) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publication.privacyEmail) &&
    Object.values(publication.documents).every(
      (document) => document.length > 100 && !/\{\{[A-Z0-9_]+\}\}/.test(document),
    )
  );
}

export function legalDocument(kind: LegalDocumentKind) {
  return legalPublicationReady() ? publication.documents[kind] : null;
}

export function legalPrivacyEmail() {
  return legalPublicationReady() ? publication.privacyEmail : null;
}
