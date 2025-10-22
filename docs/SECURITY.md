# Security Best Practices & Implementation Guide

This document outlines the security measures implemented in the Whispers and Flames application and provides guidelines for maintaining and improving security.

## 🔒 Security Features Implemented

### 1. **Content Security Policy (CSP)**

Location: `src/middleware.ts`

Our CSP headers prevent XSS, clickjacking, and other injection attacks:

```typescript
Content-Security-Policy:
  - default-src 'self'
  - script-src 'self' 'unsafe-eval' 'unsafe-inline'  // Note: Required for Next.js dev mode
  - style-src 'self' 'unsafe-inline'  // Required for CSS-in-JS
  - img-src 'self' data: [trusted domains]
  - font-src 'self' data:
  - connect-src 'self' [API domains]
  - object-src 'none'
  - base-uri 'self'
  - form-action 'self'
  - frame-ancestors 'none'
  - upgrade-insecure-requests
```

**Additional Headers:**

- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `Referrer-Policy: no-referrer` - Privacy protection
- `Permissions-Policy` - Disables unnecessary browser features

### 2. **Input Sanitization**

Location: `src/lib/utils/security.ts`

All user input is sanitized before storage or display:

```typescript
// XSS Prevention
sanitizeHtml(input); // Removes dangerous HTML tags and scripts
escapeHtml(input); // Escapes special characters for safe display

// DoS Prevention
truncateInput(input, maxLength); // Limits input size

// Path Traversal Prevention
sanitizePath(path); // Removes directory traversal attempts
```

**Usage in Game Updates:**

```typescript
// src/app/api/game/update/route.ts
if (typeof answer === 'string') {
  sanitizedAnswers[playerId] = sanitizeHtml(truncateInput(answer, 5000));
}
```

### 3. **Rate Limiting**

Location: `src/lib/utils/security.ts`

Protection against brute force and DoS attacks:

- **Authentication Endpoints:**
  - Sign-in: 5 attempts per minute per IP
  - Sign-up: 3 attempts per hour per IP

```typescript
if (!checkRateLimit(`signin:${clientIp}`, 5, 60000)) {
  return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
}
```

### 4. **CSRF Protection**

Location: `src/lib/utils/csrf.ts`

Double Submit Cookie pattern implementation:

```typescript
// Generate token on login
const csrfToken = generateCsrfToken(sessionId);

// Validate on state-changing operations
if (!validateCsrfToken(sessionId, requestToken)) {
  return { error: 'Invalid CSRF token' };
}
```

**To implement in API routes:**

1. Return CSRF token in response headers
2. Require token in `x-csrf-token` header for POST/PUT/DELETE
3. Validate token before processing request

### 5. **Secure Session Management**

Location: `src/app/api/auth/*/route.ts`

HTTP-only cookies with secure attributes:

```typescript
response.cookies.set('session', token, {
  httpOnly: true, // Prevents XSS access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'lax', // CSRF protection
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
});
```

### 6. **Password Security**

Location: `src/lib/auth.ts`

**Current Implementation:**

- SHA-256 hashing (basic)
- Minimum 6 characters

**⚠️ RECOMMENDED UPGRADE:**

```typescript
// Replace with bcrypt for production
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const SALT_ROUNDS = 12;
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### 7. **Error Handling**

Location: `src/components/error-boundary.tsx`

React Error Boundaries prevent app crashes:

```typescript
<ErrorBoundary fallback={<CustomErrorUI />}>
  <YourComponent />
</ErrorBoundary>
```

### 8. **Structured Logging**

Location: `src/lib/utils/logger.ts`

Comprehensive logging for security events:

```typescript
import { logger, logSecurityEvent } from '@/lib/utils/logger';

// Log security events
logSecurityEvent('failed_login_attempt', 'medium', {
  ip: clientIp,
  email: email,
});

// Log API requests
logApiRequest('POST', '/api/game/create', 200, 150, userId);

// Log errors
logger.error('Database connection failed', error, { userId });
```

---

## 🚨 Known Security Limitations

### 1. **In-Memory Storage**

- **Issue:** All data lost on restart, no persistence
- **Risk:** Data loss, no audit trail
- **Recommendation:** Implement PostgreSQL or Redis with encryption at rest

### 2. **Weak Password Hashing**

- **Issue:** SHA-256 without proper salting
- **Risk:** Rainbow table attacks
- **Recommendation:** Upgrade to bcrypt with salt rounds ≥ 12

### 3. **Missing CSRF Protection in Practice**

- **Issue:** CSRF utilities created but not fully implemented
- **Risk:** State-changing requests vulnerable to CSRF
- **Recommendation:** Add CSRF validation to all POST/PUT/DELETE endpoints

### 4. **No Email Verification**

- **Issue:** Users can register with any email
- **Risk:** Account takeover, spam
- **Recommendation:** Implement email verification flow

### 5. **Session Token Rotation**

- **Issue:** Tokens don't rotate on privilege changes
- **Risk:** Session fixation attacks
- **Recommendation:** Rotate tokens on role/permission changes

### 6. **AI Response Validation**

- **Issue:** AI-generated content not validated for malicious content
- **Risk:** AI-generated XSS or inappropriate content
- **Recommendation:** Validate AI responses before displaying

---

## 📋 Security Checklist for New Features

When adding new features, ensure:

- [ ] **Input Validation**
  - [ ] All user inputs validated with Zod schemas
  - [ ] Inputs sanitized with `sanitizeHtml()` or `escapeHtml()`
  - [ ] Input length limited with `truncateInput()`

- [ ] **Authentication & Authorization**
  - [ ] Routes require authentication where needed
  - [ ] User permissions checked before operations
  - [ ] Session validated on each request

- [ ] **Rate Limiting**
  - [ ] Public endpoints have rate limits
  - [ ] Sensitive operations (auth, payments) have strict limits

- [ ] **CSRF Protection**
  - [ ] State-changing operations require CSRF token
  - [ ] Token validated before processing

- [ ] **Error Handling**
  - [ ] Errors caught and logged
  - [ ] Generic error messages shown to users (no sensitive info)
  - [ ] Error boundaries wrap components

- [ ] **Logging**
  - [ ] Security events logged with `logSecurityEvent()`
  - [ ] API requests logged with `logApiRequest()`
  - [ ] Errors logged with `logger.error()`

- [ ] **Testing**
  - [ ] Security test cases added
  - [ ] Input validation tested with edge cases
  - [ ] Authentication/authorization tested

---

## 🔧 Maintenance Tasks

### Weekly

- [ ] Review security logs for suspicious activity
- [ ] Check for failed login attempts patterns
- [ ] Monitor rate limit triggers

### Monthly

- [ ] Update dependencies with `npm audit fix`
- [ ] Review and update CSP headers
- [ ] Test authentication flows
- [ ] Review error logs

### Quarterly

- [ ] Security audit of codebase
- [ ] Penetration testing
- [ ] Update security documentation
- [ ] Review and rotate secrets/API keys

---

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

---

## 🚀 Future Security Enhancements

Priority recommendations for improving security:

1. **Upgrade Password Hashing** - Implement bcrypt
2. **Full CSRF Implementation** - Add to all state-changing endpoints
3. **Database Migration** - Move to PostgreSQL with encryption
4. **Email Verification** - Implement verification flow
5. **Two-Factor Authentication** - Add 2FA option
6. **Security Monitoring** - Integrate with Sentry or similar
7. **API Key Management** - Implement key rotation
8. **Content Validation** - Validate AI-generated content
9. **WebSocket Security** - When implementing real-time features
10. **Regular Security Audits** - Automated scanning and manual review
