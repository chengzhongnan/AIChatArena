import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent 'async_hooks' from being bundled on the client
      // and provide an empty module as a fallback.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,
      };
    }
    return config;
  },
};

export default nextConfig;
