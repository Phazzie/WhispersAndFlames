import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// E2E_FAKE_SERVICES=1 swaps Clerk and the xAI calls for local fakes in e2e/fakes
// so Playwright can drive the whole game without real accounts or network.
// It only applies to `next dev`; a production build refuses it outright.
const useE2eFakes = process.env.E2E_FAKE_SERVICES === '1';
if (useE2eFakes && process.env.NODE_ENV === 'production') {
  throw new Error('E2E_FAKE_SERVICES must never be set for a production build');
}

const e2eAliases = {
  '@clerk/nextjs/server$': path.join(projectRoot, 'e2e/fakes/clerk-nextjs-server.ts'),
  '@clerk/nextjs$': path.join(projectRoot, 'e2e/fakes/clerk-nextjs.tsx'),
};
// App modules are reached through the tsconfig `@/` path, which resolves after
// aliases, so swap them by their resolved file instead.
const e2eModuleSwaps = [
  [/[\\/]src[\\/]ai[\\/]genkit\.ts$/, path.join(projectRoot, 'e2e/fakes/genkit.ts')],
  [/[\\/]src[\\/]lib[\\/]xai-image\.ts$/, path.join(projectRoot, 'e2e/fakes/xai-image.ts')],
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { webpack }) => {
    if (useE2eFakes) {
      config.resolve.alias = { ...config.resolve.alias, ...e2eAliases };
      for (const [pattern, replacement] of e2eModuleSwaps) {
        config.plugins.push(
          new webpack.NormalModuleReplacementPlugin(pattern, (resource) => {
            if (resource.createData?.resource) resource.createData.resource = replacement;
          })
        );
      }
    }
    return config;
  },

  // Use standalone for Docker, default for Vercel
  // Vercel automatically optimizes the build
  output: process.env.VERCEL ? undefined : 'standalone',

  // Enable type checking and linting during builds for safety
  // This ensures type errors are caught before deployment
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
