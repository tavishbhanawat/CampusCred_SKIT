/* ============================================================
   CampusCred — js/services/store.js
   ------------------------------------------------------------
   Data Store & Cache Layer.
   Connects to Google Cloud Firestore (via CC.FirestoreService)
   and mirrors the 13 Firestore collections in localStorage so
   the application works online, offline, and in demo mode.
   Also manages multi-account session persistence.
   ============================================================ */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'campuscred.db.v1';
  const SESSION_KEY = 'campuscred.session.v1';
  const ACCOUNTS_KEY = 'campuscred.accounts.v1';

  const Store = {
    db: null,

    /* ---------- boot / persistence ---------- */
    init: function () {
      let loaded = null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) loaded = JSON.parse(raw);
      } catch (e) { loaded = null; }

      // Check if schema requires upgrade to include authentic original certificates and Firestore schemas
      const needsUpgrade = !loaded || !loaded.users || !loaded.departments || !loaded.activityCategories || !loaded.meta || (loaded.meta.version || 0) < 6 || !loaded.studentRegistrations;

      if (!loaded || !loaded.meta || !loaded.activities || !loaded.students || (loaded.meta.version || 0) < 6 || !loaded.studentRegistrations) {
        const fresh = global.MockData.buildDatabase();
        if (loaded && loaded.students) {
          // Preserve any newly registered student accounts (IDs other than the old demo STU-1001..STU-1014)
          const registeredStudents = (loaded.students || []).filter(function (s) {
            return !s.id.match(/^STU-100[1-9]$|^STU-101[0-4]$/);
          });
          registeredStudents.forEach(function (regS) {
            if (!fresh.students.some(function (fs) { return fs.id === regS.id; })) {
              fresh.students.push(regS);
            }
          });
          const regIds = new Set(registeredStudents.map(function (s) { return s.id; }));
          const registeredActivities = (loaded.activities || []).filter(function (a) {
            return regIds.has(a.studentId);
          });
          registeredActivities.forEach(function (regA) {
            fresh.activities.push(regA);
          });
        }
        if (loaded && loaded.studentRegistrations && loaded.studentRegistrations.length) {
          loaded.studentRegistrations.forEach(function (r) {
            if (!fresh.studentRegistrations.some(function (fr) { return fr.id === r.id || fr.email === r.email; })) {
              fresh.studentRegistrations.push(r);
            }
          });
        }
        if (loaded && loaded.faculty && loaded.faculty.length) {
          // Preserve any newly added faculty verifier accounts (IDs other than the old demo FAC-202..FAC-206)
          const addedFaculty = (loaded.faculty || []).filter(function (f) {
            return f.isCustom || !f.id.match(/^FAC-20[2-6]$/);
          });
          addedFaculty.forEach(function (af) {
            if (!fresh.faculty.some(function (ff) { return ff.id === af.id; })) {
              fresh.faculty.push(af);
            }
          });
        }
        if (loaded && loaded.facultyProfiles && loaded.facultyProfiles.length) {
          if (!fresh.facultyProfiles) fresh.facultyProfiles = [];
          loaded.facultyProfiles.forEach(function (fp) {
            if (!fresh.facultyProfiles.some(function (ffp) { return ffp.uid === fp.uid; })) {
              fresh.facultyProfiles.push(fp);
            }
          });
        }
        loaded = fresh;
        this.db = loaded;
      } else {
        this.db = loaded;
      }

      // Sanitize old demo session or active accounts if obsolete
      try {
        const session = this.getSession();
        if (session && ((session.userId.match(/^STU-100[2-9]$|^STU-101[0-4]$/) && !session.isCustom) || (session.userId.match(/^FAC-20[2-6]$/) && !session.isCustom))) {
          if (session.role === 'student') {
            this.setSession({
              userId: 'STU-1001', role: 'student', name: 'Aarav Sharma', email: 'aarav.sharma@campuscred.demo',
              department: 'Computer Science & Engineering', designation: '2023CS041', color: 1, startedAt: Date.now()
            });
          } else if (session.role === 'faculty') {
            this.setSession({
              userId: 'FAC-201', role: 'faculty', name: 'Dr. Rohit Mehta', email: 'rohit.mehta@campuscred.demo',
              department: 'Computer Science & Engineering', designation: 'Associate Professor & Verification Head', color: 1, startedAt: Date.now()
            });
          }
        }
        let acts = this.getActiveAccounts();
        if (acts && acts.length) {
          acts = acts.filter(function (a) {
            return !a.userId.match(/^STU-100[2-9]$|^STU-101[0-4]$/) && !(a.userId.match(/^FAC-20[2-6]$/) && !a.isCustom);
          });
          this.saveActiveAccounts(acts);
        }
      } catch (e) { /* ignore */ }

      // Initialize Firebase SDK if available
      if (global.CC && global.CC.FirebaseConfig) {
        try { global.CC.FirebaseConfig.init(); } catch (e) { /* ignore */ }
      }

      // Seed / normalize Firestore collections if upgraded
      if (needsUpgrade && global.CC && global.CC.FirestoreService) {
        try {
          global.CC.FirestoreService.seedFirestore();
        } catch (e) {
          console.warn('[CampusCred Store] Firestore auto-seed warning:', e);
        }
      }

      this.persist();
      return this.db;
    },

    reset: function () {
      this.db = global.MockData.buildDatabase();
      if (global.CC && global.CC.FirestoreService) {
        try { global.CC.FirestoreService.seedFirestore(); } catch (e) { /* ignore */ }
      }
      this.persist();
      return this.db;
    },

    persist: function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
      } catch (e) {
        // Quota or private mode — the app still works in-memory for this session.
        console.warn('[CampusCred] Could not persist demo data:', e && e.message);
      }
    },

    /* ---------- helpers ---------- */
    uid: function (prefix) {
      return (prefix || 'ID') + '-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100);
    },

    today: function () {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },

    /* Simulated network latency so loading states are visible in the demo. */
    delay: function (ms) {
      const wait = ms == null ? (180 + Math.random() * 260) : ms;
      return new Promise(function (resolve) { setTimeout(resolve, wait); });
    },

    clone: function (v) { return JSON.parse(JSON.stringify(v)); },

    /* ---------- single session ---------- */
    getSession: function () {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },

    setSession: function (session) {
      try {
        if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        else localStorage.removeItem(SESSION_KEY);
      } catch (e) { /* ignore */ }
    },

    /* ---------- multiple accounts storage ---------- */
    getActiveAccounts: function () {
      try {
        const raw = localStorage.getItem(ACCOUNTS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    },

    saveActiveAccounts: function (accounts) {
      try {
        if (accounts && accounts.length) {
          localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
        } else {
          localStorage.removeItem(ACCOUNTS_KEY);
        }
      } catch (e) { /* ignore */ }
    }
  };

  global.CC = global.CC || {};
  global.CC.Store = Store;
})(window);
