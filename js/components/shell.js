/* ============================================================
   CampusCred — js/components/shell.js
   ------------------------------------------------------------
   Role-based sidebar + topbar layout used by all dashboards.
   Features:
     - Multi-Account Switcher dropdown
     - Firestore Database Connection & Collections Status modal
     - Responsive navigation and search
   ============================================================ */
(function (global) {
  'use strict';
  const CC = global.CC;
  const icon = CC.icon, logo = CC.logo, UI = CC.UI;

  /* ---------- navigation config per role ---------- */
  const NAV = {
    student: [
      { section: 'Overview' },
      { path: '#/student/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { section: 'Achievements' },
      { path: '#/student/add', label: 'Add Activity', icon: 'plusCircle' },
      { path: '#/student/activities', label: 'My Activities', icon: 'list' },
      { path: '#/student/verify-cert', label: 'Verify Certificate', icon: 'shield' },
      { path: '#/student/portfolio', label: 'My Portfolio', icon: 'award' },
      { section: 'Career' },
      { path: '#/student/resume', label: 'Resume & ATS Score', icon: 'fileText' },
      { path: '#/student/links', label: 'Social Links', icon: 'link' },
      { section: 'Account' },
      { path: '#/student/notifications', label: 'Notifications', icon: 'bell', badge: 'notifications' },
      { path: '#/student/profile', label: 'Profile', icon: 'user' }
    ],
    faculty: [
      { section: 'Verification' },
      { path: '#/faculty/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { path: '#/faculty/students', label: 'Student Verifications', icon: 'graduation', badge: 'pendingStudents' },
      { path: '#/faculty/pending', label: 'Pending Activities', icon: 'inbox', badge: 'pendingQueue' },
      { path: '#/faculty/reviewed', label: 'Reviewed Submissions', icon: 'checkCircle' },
      { path: '#/faculty/history', label: 'Verification History', icon: 'history' },
      { section: 'Account' },
      { path: '#/faculty/profile', label: 'Profile', icon: 'user' }
    ],
    admin: [
      { section: 'Overview' },
      { path: '#/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { section: 'Management' },
      { path: '#/admin/students', label: 'Students', icon: 'graduation', badge: 'pendingStudents' },
      { path: '#/admin/faculty', label: 'Faculty', icon: 'users' },
      { path: '#/admin/activities', label: 'Activities', icon: 'list' },
      { section: 'Insights' },
      { path: '#/admin/analytics', label: 'Analytics', icon: 'barChart' },
      { path: '#/admin/reports', label: 'Reports', icon: 'download' },
      { section: 'Tools & Account' },
      { path: '#/admin/verify', label: 'Certificate Verification', icon: 'qr' },
      { path: '#/admin/profile', label: 'Admin Profile', icon: 'user' },
      { path: '#/admin/settings', label: 'Settings', icon: 'settings' }
    ]
  };

  const TITLES = {
    '#/student/dashboard': ['Dashboard', 'Your participation record at a glance'],
    '#/student/add': ['Add Activity', 'Submit a new achievement for faculty verification'],
    '#/student/activities': ['My Activities', 'Search and filter all your submissions'],
    '#/student/verify-cert': ['Certificate Verifier', 'Verify certificate authenticity using ID, QR code, or document upload'],
    '#/student/portfolio': ['My Portfolio', 'Your verified digital achievement record'],
    '#/student/resume': ['Resume & ATS Score', 'Auto-built verified resume with ATS score & improvement analysis'],
    '#/student/links': ['Social Links', 'Professional links shown on your public portfolio'],
    '#/student/notifications': ['Notifications', 'Verification updates and faculty remarks'],
    '#/student/profile': ['Profile', 'Your academic details and portfolio settings'],
    '#/faculty/dashboard': ['Faculty Dashboard', 'Verification workload and recent decisions'],
    '#/faculty/students': ['Student Profile Verifications', 'Review enrollment credentials and approve or reject student registrations'],
    '#/faculty/pending': ['Pending Activities', 'Review student submissions and proofs'],
    '#/faculty/reviewed': ['Reviewed Submissions', 'Your previous approve / reject decisions'],
    '#/faculty/history': ['Verification History', 'Full audit trail of your reviews'],
    '#/faculty/verify': ['Verify Submission', 'Review proof and record your decision'],
    '#/faculty/profile': ['Faculty Profile', 'Your verifier details'],
    '#/admin/dashboard': ['Admin Dashboard', 'College-wide participation overview'],
    '#/admin/students': ['Students', 'Manage student records and verification approvals'],
    '#/admin/faculty': ['Faculty / Verifiers', 'Manage authorized verifiers'],
    '#/admin/activities': ['Activities', 'All participation records college-wide'],
    '#/admin/analytics': ['Analytics', 'Interactive participation insights'],
    '#/admin/reports': ['Reports', 'Download college-wide reports'],
    '#/admin/verify': ['Certificate Verification', 'Validate a certificate ID or QR code'],
    '#/admin/profile': ['Admin Profile', 'Manage administrator credentials, contact information, and authority scope'],
    '#/admin/settings': ['Settings', 'Firestore Database controls and platform settings']
  };

  const ROLE_LABEL = { student: 'Student Portal', faculty: 'Faculty / Verifier', admin: 'Administrator' };

  function badgeCount(kind) {
    const session = CC.AuthService.session();
    if (!session) return 0;
    if (kind === 'notifications') return CC.ActivityService.unreadCount(session.userId);
    if (kind === 'pendingQueue') {
      const fac = CC.AuthService.currentUser();
      return fac ? CC.VerificationService.pendingQueue(fac).length : 0;
    }
    if (kind === 'pendingStudents') {
      return CC.AuthService.getPendingStudentRegistrations ? CC.AuthService.getPendingStudentRegistrations().length : 0;
    }
    return 0;
  }

  const Shell = {
    NAV: NAV,
    TITLES: TITLES,

    /* Build the full app chrome. pageHTML goes into .page */
    render: function (opts) {
      const role = opts.role;
      const current = opts.hash;
      const user = opts.user;
      const nav = NAV[role] || [];
      const activeAccounts = CC.AuthService.getActiveAccounts();
      const otherAccounts = activeAccounts.filter(a => a.userId !== user.id && a.userId !== user.uid);

      let navHTML = '';
      nav.forEach(function (item) {
        if (item.section) {
          navHTML += '<div class="nav-section-title">' + UI.esc(item.section) + '</div>';
          return;
        }
        const active = current === item.path || current.indexOf(item.path + '/') === 0 ||
          (item.path === '#/faculty/pending' && current.indexOf('#/faculty/verify') === 0);
        const count = item.badge ? badgeCount(item.badge) : 0;
        navHTML += '<a class="nav-item' + (active ? ' active' : '') + '" href="' + item.path + '">' +
          icon(item.icon, 18) +
          '<span>' + UI.esc(item.label) + '</span>' +
          (count ? '<span class="nav-badge">' + count + '</span>' : '') +
        '</a>';
      });

      const title = TITLES[current] || ['', ''];
      const unread = CC.ActivityService.unreadCount(user.id || user.uid);
      const isFirestoreReady = CC.FirestoreService ? CC.FirestoreService.isLive() : false;

      return '' +
      '<div class="app-shell">' +
        '<aside class="sidebar" id="sidebar" aria-label="Main navigation">' +
          '<div class="sidebar-brand">' + logo(38, true) +
            '<div><div class="brand-name">CampusCred</div><div class="brand-sub">SKIT021</div></div>' +
          '</div>' +
          '<div class="sidebar-role">' + icon(role === 'admin' ? 'shield' : role === 'faculty' ? 'book' : 'graduation', 14) +
            UI.esc(ROLE_LABEL[role]) + '</div>' +
          '<nav class="sidebar-nav">' + navHTML + '</nav>' +
          '<div class="sidebar-foot">' +
            '<span>Every Achievement Counts.</span>' +
            '<span class="code-chip">SKIT021</span>' +
          '</div>' +
        '</aside>' +
        '<div class="sidebar-overlay" id="sidebarOverlay"></div>' +
        '<div class="main-col">' +
          '<header class="topbar">' +
            '<button class="icon-btn bare menu-btn" id="menuBtn" type="button" aria-label="Open menu">' + icon('menu', 20) + '</button>' +
            '<div>' +
              '<div class="topbar-title">' + UI.esc(title[0]) + '</div>' +
              '<div class="topbar-sub">' + UI.esc(title[1]) + '</div>' +
            '</div>' +
            '<div class="topbar-spacer"></div>' +

            '<!-- Global search -->' +
            '<div class="topbar-search">' + icon('search', 16) +
              '<input class="input" id="globalSearch" type="search" placeholder="Search activities, students…" aria-label="Search" />' +
            '</div>' +

            '<!-- Firestore Database Status Pill -->' +
            '<button class="db-status-pill' + (isFirestoreReady ? ' is-live' : '') + '" id="dbStatusBtn" type="button" title="View Firestore 13-Collection Database Console">' +
              '<span class="db-status-dot"></span>' +
              '<span class="db-status-label">Firestore ' + (isFirestoreReady ? 'Live' : 'Connected') + '</span>' +
            '</button>' +

            (role === 'student' ?
              '<span class="bell-wrap"><a href="#/student/notifications" class="icon-btn" aria-label="Notifications">' + icon('bell', 18) + '</a>' +
              (unread ? '<span class="bell-dot">' + unread + '</span>' : '') + '</span>' : '') +

            '<div class="dropdown" style="position:relative">' +
              '<button class="user-chip" id="userChip" type="button" aria-haspopup="true" aria-expanded="false">' +
                UI.avatar(user.name, user.color, 'sm') +
                '<span class="user-meta">' +
                  '<span class="user-name">' + UI.esc(user.name.split(' ')[0]) + '</span>' +
                  '<span class="user-role">' + UI.esc(ROLE_LABEL[role]) + '</span>' +
                '</span>' +
                icon('chevronDown', 14) +
              '</button>' +

              '<div class="user-menu" id="userMenu">' +
                '<div class="menu-head">' +
                  '<div class="n">' + UI.esc(user.name) + '</div>' +
                  '<div class="e">' + UI.esc(user.email) + '</div>' +
                  '<span class="badge badge-sm mt-4 ' + (role === 'admin' ? 'badge-primary' : (role === 'faculty' ? 'badge-info' : 'badge-neutral')) + '">' + UI.esc(ROLE_LABEL[role]) + '</span>' +
                '</div>' +

                '<!-- Multi-User Account Switcher Section -->' +
                '<div class="menu-section-label">' + icon('users', 13) + ' Active Accounts (' + activeAccounts.length + ')</div>' +
                (otherAccounts.length ?
                  '<div class="other-accounts-list">' +
                    otherAccounts.map(function (acc) {
                      return '<button class="other-account-item" type="button" data-switch-uid="' + acc.userId + '">' +
                        UI.avatar(acc.name, acc.color, 'xs') +
                        '<div class="oai-meta">' +
                          '<div class="oai-name">' + UI.esc(acc.name) + '</div>' +
                          '<div class="oai-role">' + UI.esc(ROLE_LABEL[acc.role] || acc.role) + '</div>' +
                        '</div>' +
                        '<span class="oai-badge">Switch</span>' +
                      '</button>';
                    }).join('') +
                  '</div>' :
                  '<div class="text-small text-muted" style="padding:4px 12px 8px;font-size:11.5px">No other active logins. Add more below.</div>') +

                '<a class="menu-link text-primary" href="#/login?tab=directory&addAccount=true" style="font-weight:600">' +
                  icon('plusCircle', 15) + 'Add another account' +
                '</a>' +

                '<div class="menu-sep"></div>' +

                '<a class="menu-link" href="' + (role === 'student' ? '#/student/profile' : role === 'faculty' ? '#/faculty/profile' : '#/admin/settings') + '">' +
                  icon('user', 16) + 'Profile &amp; Settings' +
                '</a>' +

                '<button class="menu-link" type="button" id="openDbModalBtn">' +
                  icon('database', 16) + 'Firestore Database Console' +
                '</button>' +

                (role !== 'admin' ? '<a class="menu-link" href="#/verify">' + icon('qr', 16) + 'Verify a Certificate</a>' : '') +

                '<div class="menu-sep"></div>' +

                '<button class="menu-link danger" type="button" id="logoutBtn">' +
                  icon('logout', 16) + 'Sign out this account' +
                '</button>' +

                (activeAccounts.length > 1 ?
                  '<button class="menu-link danger" type="button" id="logoutAllBtn" style="font-size:12px;opacity:0.85">' +
                    icon('xCircle', 14) + 'Sign out all (' + activeAccounts.length + ') accounts' +
                  '</button>' : '') +

              '</div>' +
            '</div>' +
          '</header>' +
          '<main class="page" id="page">' + (opts.pageHTML || '') + '</main>' +
        '</div>' +
      '</div>';
    },

    /* Bind shell interactions after render. */
    bind: function (root, onSearch) {
      const sidebar = root.querySelector('#sidebar');
      const overlay = root.querySelector('#sidebarOverlay');
      const menuBtn = root.querySelector('#menuBtn');

      function closeMenu() {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
      }
      if (menuBtn) menuBtn.addEventListener('click', function () {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
      });
      if (overlay) overlay.addEventListener('click', closeMenu);
      root.querySelectorAll('.nav-item').forEach(function (a) {
        a.addEventListener('click', function () { setTimeout(closeMenu, 40); });
      });

      // User dropdown
      const chip = root.querySelector('#userChip');
      const menu = root.querySelector('#userMenu');
      if (chip && menu) {
        chip.addEventListener('click', function (e) {
          e.stopPropagation();
          menu.classList.toggle('open');
          chip.setAttribute('aria-expanded', menu.classList.contains('open') ? 'true' : 'false');
        });
        document.addEventListener('click', function (e) {
          if (!menu.contains(e.target) && !chip.contains(e.target)) {
            menu.classList.remove('open');
            chip.setAttribute('aria-expanded', 'false');
          }
        });
      }

      // Switch Account buttons in dropdown
      root.querySelectorAll('[data-switch-uid]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          const targetUid = btn.getAttribute('data-switch-uid');
          try {
            const res = CC.AuthService.switchAccount(targetUid);
            UI.success('Account Switched', 'Signed in as ' + res.user.name + ' (' + res.role + ').');
            location.hash = CC.AuthService.homeFor(res.role);
          } catch (err) {
            UI.error('Switch Failed', err.message);
          }
        });
      });

      // Log out single account
      const logout = root.querySelector('#logoutBtn');
      if (logout) logout.addEventListener('click', function () {
        UI.confirm({
          title: 'Sign out of current account?',
          message: 'You will be signed out of this account. Any other active accounts will remain signed in.',
          acceptText: 'Sign out',
          tone: 'primary'
        }).then(function (ok) {
          if (!ok) return;
          const nextAccount = CC.AuthService.logout();
          if (nextAccount) {
            UI.info('Switched account', 'Now signed in as ' + nextAccount.name);
            location.hash = CC.AuthService.homeFor(nextAccount.role);
          } else {
            UI.success('Signed out', 'Signed out successfully.');
            location.hash = '#/';
          }
        });
      });

      // Log out all accounts
      const logoutAll = root.querySelector('#logoutAllBtn');
      if (logoutAll) logoutAll.addEventListener('click', function () {
        UI.confirm({
          title: 'Sign out of all accounts?',
          message: 'All concurrent multi-user sessions will be cleared on this browser.',
          acceptText: 'Sign out all',
          tone: 'danger'
        }).then(function (ok) {
          if (!ok) return;
          CC.AuthService.logoutAll();
          UI.success('All accounts signed out', 'Returned to landing page.');
          location.hash = '#/';
        });
      });

      // Firestore Database Status Modal Trigger
      const dbStatusBtn = root.querySelector('#dbStatusBtn');
      const openDbModalBtn = root.querySelector('#openDbModalBtn');
      function showFirestoreModal() {
        Shell.openFirestoreModal();
      }
      if (dbStatusBtn) dbStatusBtn.addEventListener('click', showFirestoreModal);
      if (openDbModalBtn) openDbModalBtn.addEventListener('click', showFirestoreModal);

      // Global search → jumps to the right list page with the query
      const search = root.querySelector('#globalSearch');
      if (search && onSearch) {
        search.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && search.value.trim()) onSearch(search.value.trim());
        });
      }
    },

    /* Open Firestore 13-Collection Database Console Modal */
    openFirestoreModal: function () {
      const stats = CC.FirestoreService ? CC.FirestoreService.getStats() : {};
      const cfg = CC.FirebaseConfig ? CC.FirebaseConfig.getConfig() : {};
      const isLive = CC.FirestoreService ? CC.FirestoreService.isLive() : false;

      const html = '' +
      '<div class="firestore-modal-content">' +
        '<div class="callout ' + (isLive ? 'success' : 'info') + ' mb-16" style="padding:12px 16px">' +
          '<div style="font-weight:700;font-size:14px;margin-bottom:2px">' +
            icon(isLive ? 'checkCircle' : 'shield', 17) + ' Google Cloud Firestore Architecture' +
          '</div>' +
          '<div style="font-size:13px;line-height:1.5">' +
            'Project ID: <code>' + UI.esc(cfg.projectId || 'campuscred-skit021') + '</code> · ' +
            'Normalized institutional data model with 13 collections, zero-join read caches, and SHA-256 certificate verification signatures.' +
          '</div>' +
        '</div>' +

        '<h4 style="margin-bottom:10px;font-size:14px">Collection Document Counts</h4>' +
        '<div class="fs-collections-grid">' +
          '<div class="fs-coll-card"><div class="fs-num">' + stats.users + '</div><div class="fs-name">users</div></div>' +
          '<div class="fs-coll-card"><div class="fs-num">' + stats.studentProfiles + '</div><div class="fs-name">studentProfiles</div></div>' +
          '<div class="fs-coll-card"><div class="fs-num">' + stats.facultyProfiles + '</div><div class="fs-name">facultyProfiles</div></div>' +
          '<div class="fs-coll-card"><div class="fs-num">' + stats.departments + '</div><div class="fs-name">departments</div></div>' +
          '<div class="fs-coll-card"><div class="fs-num">' + stats.courses + '</div><div class="fs-name">courses</div></div>' +
          '<div class="fs-coll-card"><div class="fs-num">' + stats.activityCategories + '</div><div class="fs-name">activityCategories</div></div>' +
          '<div class="fs-coll-card"><div class="fs-num">' + stats.activities + '</div><div class="fs-name">activities</div></div>' +
          '<div class="fs-coll-card"><div class="fs-num">' + stats.certificates + '</div><div class="fs-name">certificates</div></div>' +
          '<div class="fs-coll-card"><div class="fs-num">' + stats.verificationHistory + '</div><div class="fs-name">verificationHistory</div></div>' +
          '<div class="fs-coll-card"><div class="fs-num">' + stats.studentSkills + '</div><div class="fs-name">studentSkills</div></div>' +
          '<div class="fs-coll-card"><div class="fs-num">' + stats.studentProjects + '</div><div class="fs-name">studentProjects</div></div>' +
          '<div class="fs-coll-card"><div class="fs-num">' + stats.studentLinks + '</div><div class="fs-name">studentLinks</div></div>' +
          '<div class="fs-coll-card"><div class="fs-num">' + stats.resumeSettings + '</div><div class="fs-name">resumeSettings</div></div>' +
          '<div class="fs-coll-card"><div class="fs-num">' + stats.auditLogs + '</div><div class="fs-name">auditLogs</div></div>' +
          '<div class="fs-coll-card"><div class="fs-num">' + stats.notifications + '</div><div class="fs-name">notifications</div></div>' +
        '</div>' +

        '<div class="mt-20 flex-between" style="border-top:1px solid var(--border);padding-top:16px">' +
          '<button type="button" class="btn btn-outline btn-sm" id="seedFirestoreBtn">' +
            icon('refresh', 14) + ' Re-seed / Sync All 13 Collections' +
          '</button>' +
          '<a href="#/admin/settings" class="btn btn-primary btn-sm">' +
            icon('settings', 14) + ' Advanced Database Settings' +
          '</a>' +
        '</div>' +
      '</div>';

      UI.modal({
        title: 'Firestore Database Console (13 Collections)',
        content: html,
        width: '680px'
      });

      const seedBtn = document.getElementById('seedFirestoreBtn');
      if (seedBtn) {
        seedBtn.addEventListener('click', function () {
          seedBtn.classList.add('is-disabled');
          seedBtn.innerHTML = '<span class="spinner"></span> Seeding Firestore collections…';

          CC.FirestoreService.seedFirestore(function (p) {
            console.log('[Firestore Seeder]', p.message);
          }).then(function (res) {
            UI.success('Database Synchronized', 'Seeded all 13 Firestore collections (' + res.totalDocuments + ' documents).');
            setTimeout(function () {
              const modalClose = document.querySelector('.modal-close');
              if (modalClose) modalClose.click();
              location.reload();
            }, 800);
          }).catch(function (err) {
            UI.error('Seeding error', err.message);
            seedBtn.classList.remove('is-disabled');
            seedBtn.innerHTML = icon('refresh', 14) + ' Re-seed / Sync All 13 Collections';
          });
        });
      }
    }
  };

  global.CC = global.CC || {};
  global.CC.Shell = Shell;
})(window);
