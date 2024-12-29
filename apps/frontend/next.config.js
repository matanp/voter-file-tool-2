/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const POSTHOG_ASSETS_HOST = process.env.NEXT_PUBLIC_POSTHOG_ASSETS_HOST;

/** @type {import("next").NextConfig} */
const config = {
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
  redirects: async () => {
    return [
      {
        source: "/",
        destination: "/recordsearch",
        permanent: true,
      },
    ];
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
};

export default config;
