import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { seo } from './scripts/seo.mjs';

// Adds the Cloudflare Web Analytics beacon to production builds when CF_BEACON_TOKEN is set
// (in .env.local or the build environment), so the token never has to live in the repo.
function cloudflareBeacon(token: string | undefined): Plugin {
  return {
    name: 'cloudflare-beacon',
    apply: 'build',
    transformIndexHtml() {
      if (!token) return;
      return [
        {
          tag: 'script',
          attrs: {
            type: 'module',
            src: 'https://static.cloudflareinsights.com/beacon.min.js',
            'data-cf-beacon': JSON.stringify({ token }),
          },
          injectTo: 'body',
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    plugins: [
      react(),
      seo({
        siteUrl: env.SITE_URL,
        verification: { google: env.GOOGLE_SITE_VERIFICATION, bing: env.BING_SITE_VERIFICATION },
        social: { twitterSite: env.TWITTER_SITE, facebookAppId: env.FACEBOOK_APP_ID, fediverseCreator: env.FEDIVERSE_CREATOR },
      }),
      cloudflareBeacon(env.CF_BEACON_TOKEN),
    ],
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 900,
    },
  };
});
