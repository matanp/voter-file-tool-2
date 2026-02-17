/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const POSTHOG_ASSETS_HOST = process.env.NEXT_PUBLIC_POSTHOG_ASSETS_HOST;

const nextConfig: NextConfig = {
  // :OHNO: look into this
  output: "standalone" /* for docker hosting */,
  reactStrictMode: true,

  /**
   * If you are using `appDir` then you must comment the below `i18n` config out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${POSTHOG_ASSETS_HOST}/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${POSTHOG_HOST}/:path*`,
      },
      {
        source: "/ingest/decide",
        destination: `${POSTHOG_HOST}/decide`,
      },
    ];
  },
  // Next.js types the webpack config param as `any`; no way to narrow it without
  // installing webpack's type declarations as a dev dependency.
  /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
  webpack: (config, { isServer }) => {
    if (!isServer && Array.isArray(config.externals)) {
      config.externals.push("keyv", "got", "cacheable-request");
    }
    return config;
  },
  /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
};

const sentryConfig = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "matan-co",
  project: "voter-file-tool",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
  },

  // Route browser requests through Sentry rewrite to circumvent ad-blockers
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  automaticVercelMonitors: true,
};

const config = withSentryConfig(nextConfig, sentryConfig);

export default config;
