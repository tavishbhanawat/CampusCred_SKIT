/* ============================================================
   CampusCred — tests/test-setup.js
   ------------------------------------------------------------
   Universal Node.js / Browser Test Environment Harness.
   Provides:
     - In-memory localStorage & DOM mocks for headless Node.js
     - Module loader & Store initialization
     - Node / Browser test runner adapters
   ============================================================ */
(function () {
  'use strict';

  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

  if (isNode) {
    const fs = require('fs');
    const path = require('path');

    // Create in-memory localStorage
    const storageMap = {};
    const mockStorage = {
      getItem: function (k) { return storageMap.hasOwnProperty(k) ? storageMap[k] : null; },
      setItem: function (k, v) { storageMap[k] = String(v); },
      removeItem: function (k) { delete storageMap[k]; },
      clear: function () { for (let k in storageMap) delete storageMap[k]; }
    };

    // Global environment shims
    global.window = global;
    global.localStorage = mockStorage;
    global.location = { hash: '#/', href: 'https://campuscred.ac.in/#/' };
    global.document = {
      createElement: function (tag) {
        return {
          tagName: tag.toUpperCase(),
          className: '',
          innerHTML: '',
          style: {},
          setAttribute: function () {},
          getAttribute: function () { return ''; },
          addEventListener: function () {},
          querySelector: function () { return null; },
          querySelectorAll: function () { return []; },
          appendChild: function () {}
        };
      },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; }
    };

    // Load scripts in dependency order
    const rootDir = path.resolve(__dirname, '..');
    const scripts = [
      'js/data/mockData.js',
      'js/services/store.js',
      'js/services/activityService.js',
      'js/modules/auth/authService.js',
      'js/modules/profile/profileService.js',
      'js/modules/profile/profileCropper.js',
      'js/modules/certificate/certificateRenderer.js',
      'js/modules/certificate/certificateUpload.js',
      'js/modules/certificate/certificateService.js',
      'js/modules/resume/atsService.js',
      'js/modules/verification/studentVerificationService.js',
      'js/modules/verification/activityVerificationService.js'
    ];

    scripts.forEach(function (relPath) {
      const fullPath = path.join(rootDir, relPath);
      const code = fs.readFileSync(fullPath, 'utf8');
      const fn = new Function('window', 'global', code);
      fn(global, global);
    });

    if (global.CC && global.CC.Store) {
      global.CC.Store.init();
    }
  }
})();
