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
  manifest: ({ browser, mode }) => ({
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage', 'activeTab', 'scripting', 'contextMenus'],
    // No site access at install. The user gives access to one shop at a time,
    // which is what lets the banner show there.
    optional_host_permissions: ['*://*/*'],
    // A test shop on localhost gets its banner without a permission prompt,
    // in development only.
    ...(mode === 'development' && {
      host_permissions: ['*://localhost/*'],
    }),
    // Chrome and Edge warn about manifest keys they do not know.
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          // Permanent once the first version is uploaded to AMO.
          id: 'shop-again@ronnidc',
          // The first versions that read data_collection_permissions, on
          // desktop and on Android.
          strict_min_version: '140.0',
          data_collection_permissions: {
            required: ['none'],
          },
        },
        gecko_android: {
          strict_min_version: '142.0',
        },
      },
    }),
  }),
});
