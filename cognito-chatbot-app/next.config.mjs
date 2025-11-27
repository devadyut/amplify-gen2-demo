/** @type {import('next').NextConfig} */

// Environment configuration
const amplifyEnv = process.env.AMPLIFY_ENV || 'dev';
const isProduction = amplifyEnv === 'production';
const isStaging = amplifyEnv === 'staging';
const isDevelopment = amplifyEnv === 'dev';

const nextConfig = {
  // Pages Router configuration
  // Using traditional pages/ directory structure with getServerSideProps
  
  // Environment-specific configuration
  // These variables are available at build time and runtime
  env: {
    AMPLIFY_ENV: amplifyEnv,
    IS_PRODUCTION: isProduction.toString(),
    IS_STAGING: isStaging.toString(),
    IS_DEVELOPMENT: isDevelopment.toString(),
  },
  
  // Output configuration for deployment
  output: process.env.NEXT_OUTPUT || 'standalone',
  
  // Optimize for production
  reactStrictMode: true,
  
  // Compression
  compress: true,
  
  // Image optimization
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: isProduction ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Experimental features for Pages Router
  experimental: {
    // Enable optimized package imports for Amplify
    optimizePackageImports: ['aws-amplify'],
  },
  
  // Security headers
  async headers() {
    const headers = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      {
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()'
      },
    ];
    
    // Add HSTS header for production and staging
    if (isProduction || isStaging) {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
      });
    }
    
    return [
      {
        source: '/:path*',
        headers: headers,
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // Logging configuration
  logging: {
    fetches: {
      fullUrl: isDevelopment,
    },
  },
};

export default nextConfig;
