/* ============================================================
   CampusCred — js/app.js
   Hash router, auth guards and boot.
   Routes are declared as a table so adding a page means adding
   one entry — nothing else changes.
   ============================================================ */
(function (global) {
  'use strict';
  const CC = global.CC;
  const UI = CC.UI;

  const app = document.getElementById('app');

  /* ---------- route table ---------- */
  // kind: public | guest | app
  const ROUTES = [
    { path: '/', kind: 'public', page: function () { return CC.LandingPage; } },
    { path: '/login', kind: 'guest', page: function () { return CC.LoginPage; } },

    // Public verification + portfolio + credentials
    { path: '/verify', kind: 'public', page: function () { return CC.PublicPages.verify; }, deep: true },
    { path: '/portfolio', kind: 'public', page: function () { return CC.PublicPages.portfolio; }, deep: true },
    { path: '/credentials', kind: 'public', page: function () { return CC.PublicPages.credentials; }, deep: true },

    // Student
    { path: '/student/dashboard', kind: 'app', role: 'student', page: function () { return CC.StudentPages.dashboard; } },
    { path: '/student/add', kind: 'app', role: 'student', page: function () { return CC.StudentPages.add; } },
    { path: '/student/activities', kind: 'app', role: 'student', page: function () { return CC.StudentPages.activities; } },
    { path: '/student/verify-cert', kind: 'app', role: 'student', page: function () { return CC.StudentPages.verifyCert; } },
    { path: '/student/portfolio', kind: 'app', role: 'student', page: function () { return CC.StudentPages.portfolio; } },
    { path: '/student/resume', kind: 'app', role: 'student', page: function () { return CC.StudentPages.resume; } },
    { path: '/student/links', kind: 'app', role: 'student', page: function () { return CC.StudentPages.links; } },
    { path: '/student/notifications', kind: 'app', role: 'student', page: function () { return CC.StudentPages.notifications; } },
    { path: '/student/profile', kind: 'app', role: 'student', page: function () { return CC.StudentPages.profile; } },

    // Faculty
    { path: '/faculty/dashboard', kind: 'app', role: 'faculty', page: function () { return CC.FacultyPages.dashboard; } },
    { path: '/faculty/students', kind: 'app', role: 'faculty', page: function () { return CC.FacultyPages.students; } },
    { path: '/faculty/pending', kind: 'app', role: 'faculty', page: function () { return CC.FacultyPages.pending; } },
    { path: '/faculty/verify', kind: 'app', role: 'faculty', page: function () { return CC.FacultyPages.verifyDetail; }, deep: true },
    { path: '/faculty/reviewed', kind: 'app', role: 'faculty', page: function () { return CC.FacultyPages.reviewed; } },
    { path: '/faculty/history', kind: 'app', role: 'faculty', page: function () { return CC.FacultyPages.history; } },
    { path: '/faculty/profile', kind: 'app', role: 'faculty', page: function () { return CC.FacultyPages.profile; } },

    // Admin
    { path: '/admin/dashboard', kind: 'app', role: 'admin', page: function () { return CC.AdminPages.dashboard; } },
    { path: '/admin/students', kind: 'app', role: 'admin', page: function () { return CC.AdminPages.students; } },
    { path: '/admin/faculty', kind: 'app', role: 'admin', page: function () { return CC.AdminPages.faculty; } },
    { path: '/admin/activities', kind: 'app', role: 'admin', page: function () { return CC.AdminPages.activities; } },
    { path: '/admin/analytics', kind: 'app', role: 'admin', page: function () { return CC.AdminPages.analytics; } },
    { path: '/admin/reports', kind: 'app', role: 'admin', page: function () { return CC.AdminPages.reports; } },
    { path: '/admin/verify', kind: 'app', role: 'admin', page: function () { return CC.AdminPages.verify; }, deep: true },
    { path: '/admin/profile', kind: 'app', role: 'admin', page: function () { return CC.AdminPages.profile; } },
    { path: '/admin/settings', kind: 'app', role: 'admin', page: function () { return CC.AdminPages.settings; } }
  ];

  /* ---------- parsing ---------- */
  function parseHash() {
    let hash = location.hash || '#/';
    if (hash.charAt(0) === '#') hash = hash.slice(1);
    if (!hash || hash === '/') return { path: '/', segments: [], query: {} };

    // strip in-page anchors like #features (landing page sections)
    if (hash.charAt(0) !== '/') return { path: '/', segments: [], query: {} };

    const qIndex = hash.indexOf('?');
    let query = {};
    if (qIndex !== -1) {
      hash.slice(qIndex + 1).split('&').forEach(function (pair) {
        const kv = pair.split('=');
        if (kv[0]) query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
      hash = hash.slice(0, qIndex);
    }

    const clean = hash.replace(/\/+$/, '') || '/';
    const segments = clean.split('/').filter(Boolean).map(decodeURIComponent);
    return { path: '/' + segments.join('/'), segments: segments, query: query, raw: clean };
  }

  function matchRoute(parsed) {
    // exact match first
    for (let i = 0; i < ROUTES.length; i++) {
      if (ROUTES[i].path === parsed.path) {
        return { route: ROUTES[i], params: [] };
      }
    }
    // deep routes: match prefix, remaining segments are params
    for (let i = 0; i < ROUTES.length; i++) {
      const r = ROUTES[i];
      if (!r.deep) continue;
      if (parsed.path === r.path || parsed.path.indexOf(r.path + '/') === 0) {
        const params = parsed.segments.slice(r.path.split('/').filter(Boolean).length);
        return { route: r, params: params };
      }
    }
    return null;
  }

  /* ---------- render helpers ---------- */
  /* Pages may export either a plain render function
     (view, params, query) or an object with a .render method.
     Normalise both shapes before invoking. */
  function asFn(page) {
    if (typeof page === 'function') return page;
    if (page && typeof page.render === 'function') return page.render.bind(page);
    throw new TypeError('Page is not renderable: ' + Object.prototype.toString.call(page));
  }

  function renderPublic(page, params, query) {
    app.innerHTML = '';
    const view = document.createElement('div');
    app.appendChild(view);
    asFn(page)(view, params, query);
    window.scrollTo(0, 0);
  }

  function renderAppShell(route, params, query) {
    const session = CC.AuthService.session();
    const user = CC.AuthService.currentUser();

    if (!session || !user) {
      UI.warning('Please sign in', 'You need to be logged in to open that page.');
      location.hash = '#/login';
      return;
    }
    if (session.role !== route.role) {
      UI.info('Access limited', 'That page belongs to a different role. Taking you to your dashboard.');
      location.hash = CC.AuthService.homeFor(session.role);
      return;
    }

    const hashForTitle = '#' + route.path;
    app.innerHTML = CC.Shell.render({
      role: session.role,
      hash: hashForTitle,
      user: user,
      pageHTML: UI.loading('Loading…')
    });

    CC.Shell.bind(app, function (queryText) {
      // Global search routes to the right list page per role
      if (session.role === 'student') location.hash = '#/student/activities?search=' + encodeURIComponent(queryText);
      else if (session.role === 'faculty') location.hash = '#/faculty/pending?search=' + encodeURIComponent(queryText);
      else location.hash = '#/admin/activities?search=' + encodeURIComponent(queryText);
    });

    const pageHost = app.querySelector('#page');
    try {
      const pageFn = asFn(route.page());
      pageFn(pageHost, { params: params, query: query, role: session.role, user: user, refreshBadge: function () {
        // re-render shell badge counts without losing page state
        const badgeHost = app.querySelector('.nav-item[href="#/student/notifications"] .nav-badge');
        const count = CC.ActivityService.unreadCount(user.id);
        if (badgeHost) {
          if (count) { badgeHost.textContent = count; } else { badgeHost.remove(); }
        } else if (count && session.role === 'student') {
          const link = app.querySelector('.nav-item[href="#/student/notifications"]');
          if (link) link.insertAdjacentHTML('beforeend', '<span class="nav-badge">' + count + '</span>');
        }
      } });
    } catch (err) {
      console.error('[CampusCred Router Error]', err);
      if (pageHost) {
        pageHost.innerHTML = UI.empty({
          icon: 'alert',
          title: 'Unable to load page',
          message: 'An error occurred while loading this view: ' + (err.message || 'Unknown error'),
          action: 'Return to Dashboard'
        });
        const actBtn = pageHost.querySelector('[data-empty-action]');
        if (actBtn) actBtn.addEventListener('click', function () {
          location.hash = CC.AuthService.homeFor(session.role);
        });
      }
    }

    window.scrollTo(0, 0);
  }

  function renderNotFound(parsed) {
    app.innerHTML =
      '<div class="landing">' +
        '<div class="public-body" style="text-align:center;padding-top:80px">' +
          '<div class="es-icon" style="width:76px;height:76px;border-radius:50%;background:var(--bg-subtle);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;color:var(--text-400)">' +
            CC.icon('search', 34) + '</div>' +
          '<h1 style="font-size:26px">Page not found</h1>' +
          '<p class="text-muted mt-8">The route <span class="mono">' + UI.esc(parsed.path) + '</span> does not exist.</p>' +
          '<div class="flex-center mt-24" style="justify-content:center">' +
            '<a class="btn btn-primary" href="#/">Go to homepage</a>' +
            '<a class="btn btn-outline" href="#/login">Open demo login</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ---------- main router ---------- */
  function navigate() {
    const parsed = parseHash();
    const matched = matchRoute(parsed);

    if (!matched) { renderNotFound(parsed); return; }
    const route = matched.route;
    const query = parsed.query || {};

    if (route.path === '/' ) {
      renderPublic(CC.LandingPage, matched.params, query);
      return;
    }

    if (route.path === '/login') {
      const session = CC.AuthService.session();
      if (session && !query.addAccount && !query.switch && !query.tab) {
        // Already signed in and not adding/switching account — go to the dashboard
        location.hash = CC.AuthService.homeFor(session.role);
        return;
      }
      renderPublic(CC.LoginPage, { role: query.role || 'student' }, query);
      return;
    }

    if (route.kind === 'public') {
      renderPublic(route.page(), matched.params, query);
      return;
    }

    if (route.kind === 'app') {
      // Deep search queries are passed through to page via location.hash parsing
      renderAppShell(route, matched.params, query);
      return;
    }
  }

  /* Handle in-page anchor links on the landing page without
     treating them as routes. */
  window.addEventListener('hashchange', navigate);

  /* ---------- boot ---------- */
  function boot() {
    CC.Store.init();
    const session = CC.AuthService.session();

    // Default entry: landing page, or the user's dashboard when a session exists
    if (!location.hash || location.hash === '#' || location.hash === '#/') {
      if (session) location.hash = CC.AuthService.homeFor(session.role);
      else location.hash = '#/';
    }

    navigate();

    // Report the profile so tooling knows the stack
    try { global.parent && global.parent.postMessage && global.parent.postMessage({ type: 'campuscred-ready' }, '*'); } catch (e) { /* noop */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose for debugging in the console
  CC.routes = ROUTES;
})(window);
