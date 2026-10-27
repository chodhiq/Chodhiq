export function addNonceToScripts(html: string, nonce: string) {
  return html.replace(/<script\b(?![^>]*\bnonce=)([^>]*)>/gi, `<script nonce="${nonce}"$1>`);
}
