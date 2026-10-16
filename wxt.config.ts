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
  zip: {
    // Mozilla's reviewers rebuild the extension from the sources zip, so it
    // carries the Node version and leaves out the store material.
    includeSources: ['**/*', '.nvmrc'],
    excludeSources: ['store/**'],
  },
  manifest: ({ browser, mode }) => ({
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    homepage_url: 'https://github.com/ronnidc/shop-again',
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
          // Desktop reads data_collection_permissions from 140, Android from
          // 142, and the linter holds Android to this minimum when there is
          // no gecko_android key, so 142 keeps the lint clean.
          strict_min_version: '142.0',
          data_collection_permissions: {
            required: ['none'],
          },
        },
        // No gecko_android key: AMO reads Android compatibility from the
        // manifest alone and lists the extension for Firefox for Android the
        // moment the key is there. The right-click menu and the badge do not
        // exist on Android, and the background registers the menu listener
        // unconditionally, so Android waits for a version tried on a phone.
      },
    }),
  }),
});
