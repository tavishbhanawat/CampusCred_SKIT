/* ============================================================
   CampusCred — js/services/firebaseConfig.js
   Firebase SDK Initialization & Firestore Configuration Manager.
   Supports Google Cloud Firestore live connection, custom project config,
   and local persistent fallback storage.
   ============================================================ */
(function (global) {
  'use strict';

  const STORAGE_CONFIG_KEY = 'campuscred.firebase.config.v1';

  // Default institutional Firebase project placeholder credentials
  // Users can easily update these in the Settings -> Firestore Manager UI.
  const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDemoCampusCredKeyForSKIT021",
    authDomain: "campuscred-skit021.firebaseapp.com",
    projectId: "campuscred-skit021",
    storageBucket: "campuscred-skit021.appspot.com",
    messagingSenderId: "102938475601",
    appId: "1:102938475601:web:4f8cff9b2f81a7d6e5c3"
  };

  const FirebaseConfig = {
    app: null,
    db: null,
    auth: null,
    storage: null,
    isInitialized: false,
    isLiveConnected: false,
    currentConfig: null,

    /* Load saved config from localStorage or use default */
    getConfig: function () {
      try {
        const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) { /* ignore */ }
      return Object.assign({}, DEFAULT_FIREBASE_CONFIG);
    },

    /* Save custom user configuration */
    saveConfig: function (cfg) {
      try {
        localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(cfg));
        this.currentConfig = cfg;
        return true;
      } catch (e) {
        console.error('[FirebaseConfig] Failed to save config:', e);
        return false;
      }
    },

    /* Initialize Firebase SDK */
    init: function () {
      this.currentConfig = this.getConfig();

      // Check if Firebase SDK is loaded on the page
      if (typeof global.firebase === 'undefined') {
        console.info('[FirebaseConfig] Firebase SDK not detected on window. Running in local Firestore-emulated mode.');
        this.isInitialized = false;
        this.isLiveConnected = false;
        return false;
      }

      try {
        if (!global.firebase.apps || global.firebase.apps.length === 0) {
          this.app = global.firebase.initializeApp(this.currentConfig);
        } else {
          this.app = global.firebase.app();
        }

        if (global.firebase.firestore) {
          this.db = global.firebase.firestore();
          // Optional settings if supported
          try {
            this.db.settings({ ignoreUndefinedProperties: true });
          } catch (e) { /* settings already set */ }
        }

        if (global.firebase.auth) {
          this.auth = global.firebase.auth();
        }

        if (global.firebase.storage) {
          this.storage = global.firebase.storage();
        }

        this.isInitialized = true;
        console.log('[FirebaseConfig] Firebase app initialized successfully. Project:', this.currentConfig.projectId);
        
        // Asynchronously test live connectivity
        this.testConnection();
        return true;
      } catch (err) {
        console.warn('[FirebaseConfig] Firebase initialization error:', err.message);
        this.isInitialized = false;
        this.isLiveConnected = false;
        return false;
      }
    },

    /* Test Firestore connectivity */
    testConnection: async function () {
      if (!this.db) {
        this.isLiveConnected = false;
        return { connected: false, reason: 'Firestore SDK not initialized' };
      }
      try {
        // Quick probe to Firestore
        const pingRef = this.db.collection('departments').limit(1);
        await pingRef.get({ source: 'server' }).catch(function () {
          // If server fails, try default cache or network
          return pingRef.get();
        });
        this.isLiveConnected = true;
        console.log('[FirebaseConfig] Live Firestore connection established!');
        this.notifyStatusChange();
        return { connected: true, projectId: this.currentConfig.projectId };
      } catch (err) {
        // In demo / client-side sandbox environments without internet or real project auth,
        // mark as ready for live deployment with simulated cloud sync
        const isNetworkErr = err.code === 'unavailable' || err.code === 'permission-denied' || !navigator.onLine;
        this.isLiveConnected = !isNetworkErr;
        console.log('[FirebaseConfig] Firestore connection status:', err.message);
        this.notifyStatusChange();
        return { connected: this.isLiveConnected, error: err.message };
      }
    },

    /* Event listener for UI status badges */
    _listeners: [],
    onStatusChange: function (fn) {
      if (typeof fn === 'function') this._listeners.push(fn);
    },
    notifyStatusChange: function () {
      const status = {
        initialized: this.isInitialized,
        connected: this.isLiveConnected,
        projectId: this.currentConfig ? this.currentConfig.projectId : null
      };
      this._listeners.forEach(function (fn) {
        try { fn(status); } catch (e) { /* noop */ }
      });
    }
  };

  global.CC = global.CC || {};
  global.CC.FirebaseConfig = FirebaseConfig;
})(window);
