/**
 * Vercel API Proxy Route
 *
 * Proxies all requests from /api/backend/* to VPS backend at http://185.202.236.71:4000
 * This solves the mixed content issue (HTTPS frontend → HTTP backend)
 */

// Use Node.js runtime instead of Edge (Edge doesn't allow direct IP access)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VPS_BACKEND_URL = 'http://185.202.236.71:4000';

/**
 * Proxy GET requests to VPS backend
 */
export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'GET');
}

/**
 * Proxy POST requests to VPS backend
 */
export async function POST(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'POST');
}

/**
 * Proxy PUT requests to VPS backend
 */
export async function PUT(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'PUT');
}

/**
 * Proxy DELETE requests to VPS backend
 */
export async function DELETE(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'DELETE');
}

/**
 * Proxy PATCH requests to VPS backend
 */
export async function PATCH(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'PATCH');
}

/**
 * Core proxy logic - forwards request to VPS backend
 */
async function proxyRequest(
  request: Request,
  pathSegments: string[],
  method: string
) {
  try {
    // Build target URL
    const url = new URL(request.url);
    const path = pathSegments.join('/');
    const targetUrl = `${VPS_BACKEND_URL}/${path}${url.search}`;

    console.log(`[Proxy] ${method} ${targetUrl}`);

    // Build headers (exclude host)
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Don't forward these headers
      if (!['host', 'connection', 'keep-alive'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    // Build request options
    const options: RequestInit = {
      method,
      headers,
    };

    // Include body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = await request.text();
    }

    // Make request to VPS backend
    const response = await fetch(targetUrl, options);

    // Get response body
    const responseBody = await response.text();

    // Build response headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Forward most headers
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // Add CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Return proxied response
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Proxy error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}
