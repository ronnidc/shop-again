import { resolve } from 'node:path';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  // WXT builds Manifest V2 for Firefox by default. One version everywhere keeps
  // all three browsers on the same APIs.
  manifestVersion: 3,
  webExt: {
    binaries: {
      // The script explains why Firefox cannot be started directly on macOS.
      ...(process.platform === 'darwin' && {
        firefox: resolve('scripts/firefox-via-open.sh'),
      }),
    },
  },
  manifest: ({ browser }) => ({
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['activeTab'],
    // Chrome and Edge warn about manifest keys they do not know.
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          // Permanent once the first version is uploaded to AMO.
          id: 'shop-again@ronnidc',
          data_collection_permissions: {
            required: ['none'],
          },
        },
      },
    }),
  }),
});
