/**
 * Vercel Edge Function - API Proxy
 *
 * Solves mixed content security issue:
 * - Frontend on HTTPS (Vercel)
 * - Backend on HTTP (VPS)
 * - Browser blocks HTTP requests from HTTPS pages
 *
 * Solution:
 * - Frontend requests go to /api/proxy/* (HTTPS, same domain)
 * - This function forwards to HTTP backend internally
 * - Browser only sees HTTPS requests
 */

import { NextRequest, NextResponse } from 'next/server'

// Backend configuration
const BACKEND_URL = process.env.BACKEND_API_URL || 'http://185.202.236.71:4000'

export const runtime = 'edge' // Use Edge Runtime for better performance

/**
 * Proxy all requests to backend
 * Supports: GET, POST, PUT, DELETE, PATCH
 */
async function proxyRequest(request: NextRequest, method: string) {
  try {
    // Extract path from URL
    const url = new URL(request.url)
    const path = url.pathname.replace('/api/proxy/', '')

    // Build backend URL
    const backendUrl = `${BACKEND_URL}/api/${path}${url.search}`

    console.log(`[Proxy] ${method} ${backendUrl}`)

    // Forward request to backend
    const headers = new Headers()

    // Copy relevant headers (exclude host, origin)
    request.headers.forEach((value, key) => {
      if (!['host', 'origin', 'referer'].includes(key.toLowerCase())) {
        headers.set(key, value)
      }
    })

    // Add CORS headers for backend
    headers.set('Origin', BACKEND_URL)

    // Make request to backend
    const response = await fetch(backendUrl, {
      method,
      headers,
      body: method !== 'GET' && method !== 'HEAD' ? await request.text() : undefined,
      // Don't follow redirects automatically
      redirect: 'manual',
    })

    // Create response with backend data
    const data = await response.text()

    // Build response headers
    const responseHeaders = new Headers()

    // Copy backend response headers
    response.headers.forEach((value, key) => {
      responseHeaders.set(key, value)
    })

    // Add CORS headers for frontend
    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', '*')

    // Return proxied response
    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error(`[Proxy] Error:`, error)

    return NextResponse.json(
      {
        error: 'Proxy Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
}

export async function GET(request: NextRequest) {
  return proxyRequest(request, 'GET')
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, 'POST')
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request, 'PUT')
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request, 'DELETE')
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request, 'PATCH')
}

export async function OPTIONS(request: NextRequest) {
  // Handle CORS preflight
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  })
}
