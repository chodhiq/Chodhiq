interface Fetcher { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> }
interface D1Database { prepare(query: string): D1PreparedStatement; batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]> }
interface D1PreparedStatement { bind(...values: unknown[]): D1PreparedStatement; run<T = unknown>(): Promise<T>; first<T = unknown>(): Promise<T | null>; all<T = unknown>(): Promise<T> }
declare class HTMLRewriter {
  on(selector: string, handlers: { element(element: { setAttribute(name: string, value: string): void }): void }): HTMLRewriter;
  transform(response: Response): Response;
}
