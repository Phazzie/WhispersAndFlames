/**
 * CSRF Protection Middleware
 * Validates CSRF tokens for state-mutating requests
 */

import { NextResponse } from 'next/server';
import { generateCsrfToken, validateCsrfToken, getCsrfTokenFromRequest } from '@/lib/utils/csrf';

/**
 * Validates CSRF token from request
 * Returns error response if validation fails, null if valid
 */
export function validateCsrf(request: Request, sessionId: string): NextResponse | null {
  const csrfToken = getCsrfTokenFromRequest(request);

  if (!csrfToken) {
    return NextResponse.json(
      { error: { code: 'CSRF_TOKEN_MISSING', message: 'CSRF token required' } },
      { status: 403 }
    );
  }

  if (!validateCsrfToken(sessionId, csrfToken)) {
    return NextResponse.json(
      { error: { code: 'CSRF_TOKEN_INVALID', message: 'Invalid or expired CSRF token' } },
      { status: 403 }
    );
  }

  return null; // Valid
}

/**
 * Generates a CSRF token for a session and returns it in response headers
 */
export function addCsrfTokenToResponse(response: NextResponse, sessionId: string): NextResponse {
  const token = generateCsrfToken(sessionId);
  response.headers.set('X-CSRF-Token', token);
  return response;
}
