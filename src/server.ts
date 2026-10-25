import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { applySecurityHeaders } from "./lib/security-headers.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url=new URL(request.url);
      if(url.pathname.length>1 && url.pathname.endsWith('/')) {url.pathname=url.pathname.slice(0,-1);return applySecurityHeaders(Response.redirect(url.toString(),301));}
      if(url.pathname==='/robots.txt')return applySecurityHeaders(new Response('User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /app\nSitemap: '+url.origin+'/sitemap.xml',{headers:{'Content-Type':'text/plain'}}));
      if(url.pathname==='/sitemap.xml')return applySecurityHeaders(new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'+url.origin+'/</loc></url></urlset>',{headers:{'Content-Type':'application/xml'}}));
      if(url.pathname==='/app'||url.pathname.startsWith('/app/'))return applySecurityHeaders(Response.redirect(url.origin+'/',302));
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      if(response.status===404&&(response.headers.get('content-type')||'').includes('text/html'))return applySecurityHeaders(new Response(renderErrorPage(404),{status:404,headers:{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex, follow'}}));
      return applySecurityHeaders(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return applySecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
