# Performance Optimization Guide

This document outlines performance optimization strategies and best practices for the Whispers and Flames application.

## 📊 Current Performance Baseline

- **Bundle Size**: ~1.3GB node_modules (needs optimization)
- **First Contentful Paint (FCP)**: Not measured (need Lighthouse audit)
- **Time to Interactive (TTI)**: Not measured
- **Largest Contentful Paint (LCP)**: Not measured

---

## 🎯 Performance Goals

- FCP < 1.8s
- LCP < 2.5s
- TTI < 3.8s
- First Input Delay (FID) < 100ms
- Cumulative Layout Shift (CLS) < 0.1
- Bundle size < 200KB (gzipped)

---

## ✅ Quick Wins (High Impact, Low Effort)

### 1. **Image Optimization**

Use Next.js Image component for automatic optimization:

```tsx
// Before
<img src="/profile.jpg" alt="Profile" width={200} height={200} />;

// After
import Image from 'next/image';

<Image
  src="/profile.jpg"
  alt="Profile"
  width={200}
  height={200}
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>;
```

### 2. **Lazy Loading**

```tsx
// Lazy load heavy components
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function MyPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 3. **Code Splitting**

```tsx
// Route-based code splitting (automatic in Next.js)
// app/game/page.tsx → separate chunk
// app/profile/page.tsx → separate chunk

// Dynamic imports for heavy features
const generateVisualMemory = async () => {
  const module = await import('@/lib/image-generation');
  return module.generateSessionImage(...);
};
```

### 4. **Memoization**

```tsx
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive components
const ExpensiveList = memo(({ items }) => {
  return items.map((item) => <Item key={item.id} {...item} />);
});

// Memoize expensive calculations
const GameStep = ({ gameState }) => {
  const sortedPlayers = useMemo(
    () => gameState.players.sort((a, b) => a.name.localeCompare(b.name)),
    [gameState.players]
  );

  const handleClick = useCallback(
    () => {
      // Handler logic
    },
    [
      /* dependencies */
    ]
  );

  return <div>{/* UI */}</div>;
};
```

---

## 🏗️ Architecture-Level Optimizations

### 1. **Bundle Analysis**

```bash
# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Add to next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // Next.js config
});

# Run analysis
ANALYZE=true npm run build
```

### 2. **Tree Shaking**

```tsx
// Import only what you need
// Bad
import _ from 'lodash';

// Good
import debounce from 'lodash/debounce';
```

### 3. **Dynamic Imports**

```tsx
// Heavy libraries loaded on-demand
const confetti = async () => {
  const module = await import('canvas-confetti');
  return module.default;
};

const fireConfetti = async () => {
  const fire = await confetti();
  fire({
    /* options */
  });
};
```

### 4. **Font Optimization**

```tsx
// next/font for automatic font optimization
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

---

## 🚀 Network Optimizations

### 1. **API Response Caching**

```tsx
// Add cache headers to API routes
export async function GET(request: Request) {
  const data = await fetchData();

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

### 2. **Request Deduplication**

```tsx
// Prevent duplicate simultaneous requests
const requestCache = new Map<string, Promise<any>>();

async function fetchWithDedup<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (requestCache.has(key)) {
    return requestCache.get(key);
  }

  const promise = fetcher().finally(() => {
    requestCache.delete(key);
  });

  requestCache.set(key, promise);
  return promise;
}

// Usage
const data = await fetchWithDedup('game:123', () => fetch('/api/game/123').then((r) => r.json()));
```

### 3. **Optimistic UI Updates**

```tsx
const updateGame = async (updates: Partial<GameState>) => {
  // Immediately update UI
  setGameState((prev) => ({ ...prev, ...updates }));

  try {
    // Send to server
    await fetch('/api/game/update', {
      method: 'POST',
      body: JSON.stringify(updates),
    });
  } catch (error) {
    // Revert on error
    setGameState(previousState);
    showError('Update failed');
  }
};
```

### 4. **WebSocket for Real-time Updates**

Replace polling with WebSocket:

```tsx
// Instead of polling every 2 seconds
useEffect(() => {
  const interval = setInterval(() => {
    fetchGameState();
  }, 2000);
  return () => clearInterval(interval);
}, []);

// Use WebSocket
useEffect(() => {
  const ws = new WebSocket('ws://localhost:3000/game/123');

  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    setGameState(update);
  };

  return () => ws.close();
}, []);
```

---

## 🎨 Rendering Optimizations

### 1. **Skeleton Loaders**

```tsx
function GamePage() {
  const { data, isLoading } = useGame();

  if (isLoading) {
    return <GameSkeleton />;
  }

  return <GameContent data={data} />;
}

function GameSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
    </div>
  );
}
```

### 2. **Virtual Scrolling**

For long lists, use virtual scrolling:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function LargeList({ items }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. **Reduced Motion**

```tsx
// tailwind.config.ts
export default {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
};

// Component
<div className="animate-fade-in motion-reduce:animate-none">{content}</div>;
```

---

## 📦 Build Optimizations

### 1. **Production Build Configuration**

```typescript
// next.config.ts
const nextConfig = {
  // Enable SWC minification
  swcMinify: true,

  // Compress images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Enable experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },

  // Reduce bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};
```

### 2. **Compression**

```typescript
// Add compression middleware
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Enable Brotli/gzip
  if (!response.headers.has('Content-Encoding')) {
    response.headers.set('Accept-Encoding', 'br, gzip, deflate');
  }

  return response;
}
```

---

## 🔍 Monitoring & Measurement

### 1. **Web Vitals**

```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### 2. **Custom Performance Logging**

```tsx
import { logPerformance } from '@/lib/utils/logger';

// Measure component render time
useEffect(() => {
  const start = performance.now();

  return () => {
    const duration = performance.now() - start;
    logPerformance('component-render', duration, 'ms', {
      component: 'GameStep',
    });
  };
}, []);

// Measure API response time
const fetchData = async () => {
  const start = performance.now();
  const response = await fetch('/api/data');
  const duration = performance.now() - start;

  logPerformance('api-request', duration, 'ms', {
    endpoint: '/api/data',
    status: response.status,
  });

  return response.json();
};
```

### 3. **Lighthouse CI**

```bash
# Install Lighthouse CI
npm install --save-dev @lhci/cli

# Run audit
npx lhci autorun --collect.url=http://localhost:3000
```

---

## ✅ Performance Checklist

### Before Production Release

- [ ] Run bundle analyzer to identify large dependencies
- [ ] Implement lazy loading for routes and heavy components
- [ ] Add skeleton loaders for loading states
- [ ] Optimize all images with next/image
- [ ] Enable compression (gzip/Brotli)
- [ ] Add cache headers to API routes
- [ ] Remove console.logs in production
- [ ] Run Lighthouse audit (score > 90)
- [ ] Test on slow 3G network
- [ ] Test on low-end devices

### Ongoing Monitoring

- [ ] Monitor bundle size on each build
- [ ] Track Core Web Vitals
- [ ] Review slow API endpoints monthly
- [ ] Optimize database queries as needed
- [ ] Update dependencies regularly

---

## 🎯 Priority Improvements for This Project

### Immediate (Sprint 2)

1. ✅ Add bundle analyzer to identify large dependencies
2. ✅ Implement lazy loading for game routes
3. ✅ Add skeleton loaders for loading states
4. ✅ Replace polling with WebSocket/SSE
5. ✅ Add React.memo to heavy components

### Short-term (Sprint 3)

1. Optimize images with next/image
2. Implement request deduplication
3. Add optimistic UI updates
4. Enable compression
5. Add caching strategy

### Long-term (Sprint 4)

1. Implement service worker for offline support
2. Add PWA capabilities
3. Optimize for mobile performance
4. Implement virtual scrolling where needed
5. Advanced caching with Redis

---

## 📚 Resources

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev Performance](https://web.dev/performance/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Core Web Vitals](https://web.dev/vitals/)
- [Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

---

**Last Updated**: Current
**Next Review**: After implementing Sprint 2 improvements
