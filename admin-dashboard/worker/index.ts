/** Cloudflare Worker entry point for the vinext-starter template. */
import {
  handleImageOptimization,
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
  isImageOptimizationPath,
} from 'vinext/server/image-optimization';
import handler from 'vinext/server/app-router-entry';
import { addNonceToScripts } from './security';

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/csp-report')
      return new Response(null, {
        status: 204,
        headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
      });

    if (isImageOptimizationPath(url.pathname)) {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(
        request,
        {
          fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body)
              .transform(width > 0 ? { width } : {})
              .output({ format, quality });
            return result.response();
          },
        },
        allowedWidths,
      );
      const secured = new Response(response.body, response);
      secured.headers.set('X-Content-Type-Options', 'nosniff');
      secured.headers.set('X-Frame-Options', 'DENY');
      secured.headers.set('Referrer-Policy', 'no-referrer');
      secured.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      secured.headers.set('Cache-Control', 'private, no-store');
      return secured;
    }

    const response = await handler.fetch(request, env, ctx);
    const nonceBytes = crypto.getRandomValues(new Uint8Array(18));
    const nonce = btoa(String.fromCharCode(...nonceBytes));
    const isHtml = response.headers.get('content-type')?.includes('text/html') ?? false;
    let rewritten = response;
    if (isHtml && typeof HTMLRewriter !== 'undefined') {
      rewritten = new HTMLRewriter()
        .on('script', { element: (element) => element.setAttribute('nonce', nonce) })
        .transform(response);
    } else if (isHtml) {
      const body = addNonceToScripts(await response.text(), nonce);
      const fallbackHeaders = new Headers(response.headers);
      fallbackHeaders.delete('content-length');
      fallbackHeaders.delete('content-encoding');
      rewritten = new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: fallbackHeaders,
      });
    }
    const headers = new Headers(rewritten.headers);
    if (isHtml) {
      headers.delete('content-length');
      headers.delete('content-encoding');
    }
    const secured = new Response(rewritten.body, {
      status: rewritten.status,
      statusText: rewritten.statusText,
      headers,
    });
    secured.headers.set('X-Content-Type-Options', 'nosniff');
    secured.headers.set('Referrer-Policy', 'no-referrer');
    secured.headers.set('X-Frame-Options', 'DENY');
    secured.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    secured.headers.set(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`,
    );
    secured.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    secured.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    secured.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    secured.headers.set(
      'Reporting-Endpoints',
      `csp="${new URL('/csp-report', request.url).href}"`,
    );
    secured.headers.set(
      'Content-Security-Policy-Report-Only',
      `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; report-to csp; report-uri /csp-report`,
    );
    if (/^\/_next\/static\//.test(url.pathname) || /^\/_vinext\/static\//.test(url.pathname))
      secured.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    else secured.headers.set('Cache-Control', 'private, no-store');
    return secured;
  },
};

export default worker;
