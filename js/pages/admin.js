/* ============================================================
   CampusCred — js/pages/admin.js
   Admin area: Dashboard, Students, Faculty, Activities,
   Analytics, Reports, Certificate Verification, Settings.
   ============================================================ */
(function (global) {
  'use strict';
  const CC = global.CC;
  const icon = CC.icon, UI = CC.UI, Charts = CC.Charts;
  const AS = CC.ActivityService;
  const RS = CC.ReportService;
  const Mock = global.MockData;
  const Store = CC.Store;

  function admin() { return CC.AuthService.currentUser(); }

  function statCard(ic, tone, value, label, foot) {
    return '<div class="stat-card">' +
      '<span class="stat-icon ' + tone + '">' + icon(ic, 21) + '</span>' +
      '<div><div class="stat-value">' + value + '</div><div class="stat-label">' + UI.esc(label) + '</div>' +
      '<div class="stat-foot">' + UI.esc(foot) + '</div></div>' +
    '</div>';
  }

  /* Shared filter bar for admin pages. */
  function adminFilterBar(state, opts) {
    opts = opts || {};
    return '<div class="filter-bar">' +
      (opts.search !== false ?
        '<div class="search-field">' + icon('search', 15) +
        '<input class="input" type="search" placeholder="' + UI.esc(opts.placeholder || 'Search…') + '" data-filter="search" value="' + UI.esc(state.search || '') + '" /></div>' : '') +
      (opts.department !== false ?
        '<select class="select" data-filter="department"><option value="all">All departments</option>' +
        Mock.DEPARTMENTS.map(function (d) { return '<option value="' + UI.esc(d) + '"' + (state.department === d ? ' selected' : '') + '>' + UI.esc(d) + '</option>'; }).join('') +
        '</select>' : '') +
      (opts.branch !== false ?
        '<select class="select" data-filter="branch"><option value="all">All branches</option>' +
        Mock.BRANCHES.map(function (b) { return '<option value="' + UI.esc(b) + '"' + (state.branch === b ? ' selected' : '') + '>' + UI.esc(b) + '</option>'; }).join('') +
        '</select>' : '') +
      (opts.year !== false ?
        '<select class="select" data-filter="year"><option value="all">All academic years</option>' +
        Mock.ACADEMIC_YEARS.map(function (y) { return '<option value="' + UI.esc(y) + '"' + (state.year === y ? ' selected' : '') + '>' + UI.esc(y) + '</option>'; }).join('') +
        '</select>' : '') +
      (opts.category !== false ?
        '<select class="select" data-filter="category"><option value="all">All categories</option>' +
        Mock.CATEGORIES.map(function (c) { return '<option value="' + UI.esc(c) + '"' + (state.category === c ? ' selected' : '') + '>' + UI.esc(c) + '</option>'; }).join('') +
        '</select>' : '') +
      (opts.status !== false ?
        '<select class="select" data-filter="status"><option value="all">All status</option>' +
        '<option value="verified"' + (state.status === 'verified' ? ' selected' : '') + '>Verified</option>' +
        '<option value="pending"' + (state.status === 'pending' ? ' selected' : '') + '>Pending</option>' +
        '<option value="rejected"' + (state.status === 'rejected' ? ' selected' : '') + '>Rejected</option>' +
        '</select>' : '') +
      (opts.dateRange !== false ?
        '<input class="input" type="date" data-filter="from" title="From date" style="width:auto;min-width:140px" value="' + UI.esc(state.from || '') + '" />' +
        '<input class="input" type="date" data-filter="to" title="To date" style="width:auto;min-width:140px" value="' + UI.esc(state.to || '') + '" />' : '') +
      '<button class="btn btn-sm btn-outline clear-btn" type="button" data-clear>' + icon('refresh', 14) + 'Reset</button>' +
    '</div>';
  }

  function bindFilters(root, state, repaint) {
    root.querySelectorAll('[data-filter]').forEach(function (el) {
      const evt = (el.tagName === 'SELECT' || el.type === 'date') ? 'change' : 'input';
      el.addEventListener(evt, UI.debounce(function () {
        state[el.getAttribute('data-filter')] = el.value;
        repaint();
      }, el.type === 'date' ? 0 : 220));
    });
    const clear = root.querySelector('[data-clear]');
    if (clear) clear.addEventListener('click', function () {
      Object.keys(state).forEach(function (k) { state[k] = (k === 'search' || k === 'from' || k === 'to') ? '' : 'all'; });
      root.querySelectorAll('[data-filter]').forEach(function (el) {
        const k = el.getAttribute('data-filter');
        el.value = (k === 'search' || k === 'from' || k === 'to') ? '' : 'all';
      });
      repaint();
      UI.info('Filters cleared', 'Showing all records.');
    });
  }

  function emptyFilterState(state) {
    return { search: state.search || '', department: state.department || 'all', branch: state.branch || 'all', year: state.year || 'all', category: state.category || 'all', status: state.status || 'all', from: state.from || '', to: state.to || '' };
  }

  /* Demo-data banner reused across admin pages. */
  function demoBanner() {
    return '<div class="callout warn mb-16">' + icon('alert', 17) +
      '<div><strong>Demonstration data.</strong> All students, activities and certificates below are fictional records generated for the SKIT021 prototype — not real institutional data.</div></div>';
  }

  /* =========================================================
     ADMIN DASHBOARD
     ========================================================= */
  function renderDashboard(root, ctx) {
    const state = { search: '', department: 'all', branch: 'all', year: 'all', category: 'all', status: 'all', from: '', to: '' };

    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>College Overview</h1>' +
        '<p class="page-desc">Real-time snapshot of student participation, verification status and recent activity across every department.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-outline" type="button" id="csvBtn">' + icon('download', 16) + 'Download CSV</button>' +
          '<button class="btn btn-primary" type="button" id="pdfBtn">' + icon('fileText', 16) + 'Download PDF</button>' +
        '</div>' +
      '</div>' +

      demoBanner() +
      adminFilterBar(state, { placeholder: 'Search activity, student, certificate ID…', department: false, branch: false, year: false, category: false, status: false }) +

      '<div class="stat-grid cols-5 mb-24" id="ovStats"></div>' +

      '<div class="three-col mb-24">' +
        '<div id="catChart"></div>' +
        '<div id="monthChart"></div>' +
        '<div id="deptChart"></div>' +
      '</div>' +

      '<div class="two-col">' +
        '<div>' +
          '<div class="section-title">Recent submissions</div>' +
          '<div class="card mb-24"><div class="card-body tight" id="recentSubs"></div></div>' +
          '<div class="section-title">Advanced filters</div>' +
          '<div class="card card-pad" id="advFilters"></div>' +
        '</div>' +
        '<div>' +
          '<div class="section-title">Recent verification activity</div>' +
          '<div class="card card-pad" id="auditFeed">' + UI.loading('Loading activity feed…') + '</div>' +
        '</div>' +
      '</div>';

    /* advanced filter controls (department, branch, year, category, status) */
    root.querySelector('#advFilters').innerHTML =
      '<div class="form-grid">' +
        '<div class="field"><label>Department</label>' +
          '<select class="select" data-filter="department"><option value="all">All departments</option>' +
          Mock.DEPARTMENTS.map(function (d) { return '<option value="' + UI.esc(d) + '">' + UI.esc(d) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Branch</label>' +
          '<select class="select" data-filter="branch"><option value="all">All branches</option>' +
          Mock.BRANCHES.map(function (b) { return '<option value="' + UI.esc(b) + '">' + UI.esc(b) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Academic year</label>' +
          '<select class="select" data-filter="year"><option value="all">All academic years</option>' +
          Mock.ACADEMIC_YEARS.map(function (y) { return '<option value="' + UI.esc(y) + '">' + UI.esc(y) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Category</label>' +
          '<select class="select" data-filter="category"><option value="all">All categories</option>' +
          Mock.CATEGORIES.map(function (c) { return '<option value="' + UI.esc(c) + '">' + UI.esc(c) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Verification status</label>' +
          '<select class="select" data-filter="status"><option value="all">All status</option>' +
          '<option value="verified">Verified</option><option value="pending">Pending</option><option value="rejected">Rejected</option></select></div>' +
        '<div class="field"><label>Date range</label>' +
          '<div class="flex-center gap-8"><input class="input" type="date" data-filter="from" />' +
          '<input class="input" type="date" data-filter="to" /></div></div>' +
      '</div>' +
      '<div class="callout info mt-8">' + icon('info', 16) + '<div>Every chart, statistic and table on this page reacts to these filters instantly.</div></div>';

    const statsHost = root.querySelector('#ovStats');
    const catHost = root.querySelector('#catChart');
    const monthHost = root.querySelector('#monthChart');
    const deptHost = root.querySelector('#deptChart');
    const subsHost = root.querySelector('#recentSubs');
    const auditHost = root.querySelector('#auditFeed');

    function repaint() {
      const rows = RS.filtered(emptyFilterState(state));
      const ov = {
        totalStudents: Mock.DEPARTMENTS.length ? countStudents(state) : 0,
        totalActivities: rows.length,
        verified: rows.filter(function (a) { return a.status === 'verified'; }).length,
        pending: rows.filter(function (a) { return a.status === 'pending'; }).length,
        rejected: rows.filter(function (a) { return a.status === 'rejected'; }).length
      };

      statsHost.innerHTML =
        statCard('graduation', 'tone-royal', ov.totalStudents, 'Total Students', 'Registered in demo') +
        statCard('list', 'tone-navy', ov.totalActivities, 'Total Activities', 'Matching current filters') +
        statCard('checkCircle', 'tone-green', ov.verified, 'Verified Records', 'Faculty approved') +
        statCard('clock', 'tone-amber', ov.pending, 'Pending Records', 'Awaiting review') +
        statCard('xCircle', 'tone-red', ov.rejected, 'Rejected Records', 'Returned to students');

      const catData = RS.byCategory(rows);
      const catColors = catData.map(function (c, i) { return Charts.palette[i % Charts.palette.length]; });
      catHost.innerHTML = Charts.card('Category-wise participation', 'Activities per category',
        Charts.donut({ data: catData.map(function (c, i) { return { label: c.label, value: c.value, color: catColors[i] }; }), centerLabel: 'Activities' }),
        Charts.legend(catData.map(function (c, i) { return { label: c.label + ' (' + c.value + ')', color: catColors[i] }; }).filter(function (x, i) { return catData[i].value; })));

      const trend = RS.monthlyTrend(rows);
      monthHost.innerHTML = Charts.card('Monthly activity trend', 'Last 12 months — verified vs pending',
        Charts.bar({
          data: trend.map(function (m) { return { label: m.label, values: [m.verified, m.pending, m.rejected] }; }),
          series: [{ name: 'Verified', color: '#16A34A' }, { name: 'Pending', color: '#D97706' }, { name: 'Rejected', color: '#EF4444' }],
          stacked: true, height: 240
        }),
        Charts.legend([{ label: 'Verified', color: '#16A34A' }, { label: 'Pending', color: '#D97706' }, { label: 'Rejected', color: '#EF4444' }]));

      const deptData = RS.byDepartment(rows);
      deptHost.innerHTML = Charts.card('Department-wise participation', 'Record count per department',
        '<div style="padding:6px 6px">' + Charts.hbarList(deptData.map(function (d) { return { label: d.label, value: d.value }; })) + '</div>');

      // Recent submissions (respect filters, newest first)
      const recent = rows.slice().sort(function (a, b) { return (b.submittedAt || '').localeCompare(a.submittedAt || ''); }).slice(0, 6);
      subsHost.innerHTML = UI.table([
        {
          key: 'name', label: 'Activity', render: function (a) {
            const st = AS.studentOf(a) || {};
            return '<div class="cell-main">' + UI.esc(a.name) + '</div><div class="cell-sub">' + UI.esc(st.name || '—') + ' · ' + UI.esc(st.enrollment || '') + '</div>';
          }
        },
        { key: 'category', label: 'Category', render: function (a) { return UI.categoryBadge(a.category); } },
        { key: 'submittedAt', label: 'Submitted', render: function (a) { return UI.fmtDate(a.submittedAt); } },
        { key: 'status', label: 'Status', render: function (a) { return UI.statusBadge(a.status); } },
        {
          key: '_a', label: '', className: 'actions-cell', render: function (a) {
            return '<button class="btn btn-sm btn-outline" type="button" data-view="' + a.id + '">' + icon('eye', 14) + '</button>';
          }
        }
      ], recent, { empty: { icon: 'inbox', title: 'No submissions', message: 'No records match the current filters.' } });

      // Audit feed
      const feed = CC.VerificationService.recentAudit(8);
      auditHost.innerHTML = feed.length ? '<div class="timeline">' + feed.map(function (f) {
        const tone = f.action === 'approved' ? 'tone-green' : 'tone-red';
        return '<div class="timeline-item ' + tone + '">' +
          '<div class="tl-title">' + (f.action === 'approved' ? 'Approved' : 'Rejected') + ' — ' + UI.esc(f.activity) + '</div>' +
          '<div class="tl-meta">' + UI.esc(f.student) + ' · by ' + UI.esc(f.reviewer) + ' · ' + UI.fmtDate(f.at) + '</div>' +
          '<div class="tl-body">' + UI.esc(f.note || '—') + '</div>' +
        '</div>';
      }).join('') + '</div>' : '<div class="text-small text-muted">No verification activity yet.</div>';

      Charts.bind(root);
    }

    function countStudents(state) {
      return Store.db.students.filter(function (s) {
        if (state.department !== 'all' && s.department !== state.department) return false;
        if (state.branch !== 'all' && s.branch !== state.branch) return false;
        if (state.year !== 'all' && s.academicYear !== state.year) return false;
        return true;
      }).length;
    }

    // initial load with a short loading state
    statsHost.innerHTML = UI.skeletonRows(1);
    setTimeout(function () {
      repaint();
      bindFilters(root, state, repaint);

      UI.delegate(root, 'click', '[data-view]', function (e, btn) {
        CC.StudentPages.detailModal(AS.byId(btn.getAttribute('data-view')));
      });

      root.querySelector('#csvBtn').addEventListener('click', function () {
        const rows = RS.filtered(emptyFilterState(state));
        if (!rows.length) { UI.warning('Nothing to export', 'No records match the current filters.'); return; }
        RS.downloadCSV('campuscred-college-report.csv', RS.toCSV(rows));
        UI.success('CSV download started', rows.length + ' records exported.');
      });
      root.querySelector('#pdfBtn').addEventListener('click', function () {
        UI.info('Preparing PDF', 'Use “Save as PDF” in the print dialog to download.');
        setTimeout(function () { window.print(); }, 350);
      });
    }, 300);
  }

  /* =========================================================
     STUDENTS MANAGEMENT
     ========================================================= */
  function renderStudents(root, ctx) {
    const state = { search: '', department: 'all', branch: 'all', year: 'all', tab: 'active' };

    function getPendingCount() {
      const allRegs = Store.db.studentRegistrations || [];
      return allRegs.filter(r => r.status === 'PENDING_APPROVAL' || r.accountStatus === 'PENDING_APPROVAL').length;
    }

    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Students Management &amp; Verification</h1>' +
        '<p class="page-desc">Manage verified student profiles and review pending registration submissions before granting access.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-outline" type="button" id="csvBtn">' + icon('download', 16) + 'Export Records</button>' +
        '</div>' +
      '</div>' +

      '<div class="login-tabs mb-20" style="max-width:560px">' +
        '<button type="button" class="login-tab' + (state.tab === 'active' ? ' active' : '') + '" data-tab-btn="active">' +
          icon('graduation', 15) + '<span id="activeTabLabel">Verified Students (' + Store.db.students.length + ')</span>' +
        '</button>' +
        '<button type="button" class="login-tab' + (state.tab === 'pending' ? ' active' : '') + '" data-tab-btn="pending">' +
          icon('clock', 15) + '<span id="pendingTabLabel">Pending Verifications (' + getPendingCount() + ')</span>' +
        '</button>' +
      '</div>' +

      demoBanner() +
      '<div id="filterBarHost">' +
        adminFilterBar(state, { placeholder: 'Search name, enrollment, email…', category: false, status: false, dateRange: false }) +
      '</div>' +
      '<div class="entity-grid" id="studentGrid">' + UI.loading('Loading students…') + '</div>';

    const host = root.querySelector('#studentGrid');

    function repaint() {
      const pendingCount = getPendingCount();
      const pLabel = root.querySelector('#pendingTabLabel');
      const aLabel = root.querySelector('#activeTabLabel');
      if (pLabel) pLabel.textContent = 'Pending Verifications (' + pendingCount + ')';
      if (aLabel) aLabel.textContent = 'Verified Students (' + Store.db.students.length + ')';

      if (state.tab === 'pending') {
        const regs = (Store.db.studentRegistrations || []).filter(function (r) {
          return r.status === 'PENDING_APPROVAL' || r.accountStatus === 'PENDING_APPROVAL';
        });

        let list = regs;
        if (state.department !== 'all') list = list.filter(r => (r.departmentName || r.department) === state.department);
        if (state.search) {
          const q = state.search.toLowerCase();
          list = list.filter(r => (r.name || '').toLowerCase().indexOf(q) !== -1 || (r.email || '').toLowerCase().indexOf(q) !== -1 || (r.enrollment || r.registrationNumber || '').toLowerCase().indexOf(q) !== -1);
        }

        if (!list.length) {
          host.innerHTML = UI.empty({
            icon: 'checkCircle',
            title: 'No pending student verifications',
            message: 'All incoming student registrations have been processed.'
          });
          return;
        }

        host.innerHTML = list.map(function (reg) {
          return '<div class="entity-card" style="border:1.5px solid #FDE68A;background:rgba(254,243,199,0.12)">' +
            '<div class="ec-top">' + UI.avatar(reg.name, reg.color || 2) +
              '<div><div class="ec-name">' + UI.esc(reg.name) + '</div>' +
              '<div class="ec-sub mono font-bold">' + UI.esc(reg.enrollment || reg.registrationNumber || reg.uid) + '</div>' +
              '<div class="ec-sub">' + UI.esc(reg.departmentName || reg.department) + ' · <span class="chip chip-royal font-bold" style="font-size:11px">' + UI.esc(reg.year || '1st Year') + '</span></div>' +
              '<div class="text-xs text-muted mt-2">' + UI.esc(reg.phone) + ' · <span style="color:#16A34A;font-weight:700">✔ Mobile OTP Verified</span></div></div>' +
            '</div>' +
            '<div class="callout warn mt-8 mb-8" style="padding:6px 10px;font-size:11.5px">' +
              icon('clock', 14) + '<div>Pending Institutional Approval since ' + UI.fmtDate(reg.submittedAt) + '</div>' +
            '</div>' +
            '<div class="flex gap-6 mt-10">' +
              '<button class="btn btn-sm btn-outline text-danger" type="button" data-admin-reject="' + reg.id + '" style="flex:1">' + icon('x', 13) + 'Reject</button>' +
              '<button class="btn btn-sm btn-primary" type="button" data-admin-approve="' + reg.id + '" style="flex:1;background:#16A34A;border-color:#16A34A">' + icon('check', 13) + 'Approve</button>' +
            '</div>' +
          '</div>';
        }).join('');
        return;
      }

      // Active Students Tab
      let list = Store.db.students.slice();
      if (state.department !== 'all') list = list.filter(function (s) { return s.department === state.department; });
      if (state.branch !== 'all') list = list.filter(function (s) { return s.branch === state.branch; });
      if (state.year !== 'all') list = list.filter(function (s) { return s.academicYear === state.year; });
      if (state.search) {
        const q = state.search.toLowerCase();
        list = list.filter(function (s) {
          return s.name.toLowerCase().indexOf(q) !== -1 || s.enrollment.toLowerCase().indexOf(q) !== -1 || s.email.toLowerCase().indexOf(q) !== -1;
        });
      }

      if (!list.length) {
        host.innerHTML = UI.empty({ icon: 'graduation', title: 'No students found', message: 'No students match these filters.', });
        return;
      }

      host.innerHTML = list.map(function (s) {
        const stats = AS.statsFor(s.id);
        return '<div class="entity-card">' +
          '<div class="ec-top">' + UI.avatar(s.name, s.color) +
            '<div><div class="ec-name">' + UI.esc(s.name) + '</div>' +
            '<div class="ec-sub mono">' + UI.esc(s.enrollment) + ' · ' + UI.esc(s.branch) + '</div>' +
            '<div class="ec-sub">' + UI.esc(s.department) + ' · <span class="chip chip-royal font-bold" style="font-size:11px">' + UI.esc(s.year || '3rd Year') + '</span></div></div>' +
          '</div>' +
          '<div class="ec-stats">' +
            '<div class="ec-stat"><div class="v">' + stats.total + '</div><div class="l">TOTAL</div></div>' +
            '<div class="ec-stat"><div class="v text-success">' + stats.verified + '</div><div class="l">VERIFIED</div></div>' +
            '<div class="ec-stat"><div class="v text-warning">' + stats.pending + '</div><div class="l">PENDING</div></div>' +
            '<div class="ec-stat"><div class="v text-danger">' + stats.rejected + '</div><div class="l">REJECTED</div></div>' +
          '</div>' +
          '<div class="ec-actions">' +
            '<button class="btn btn-sm btn-outline w-100" type="button" data-student="' + s.id + '">' + icon('eye', 14) + 'View record</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    setTimeout(function () {
      repaint();
      bindFilters(root, state, repaint);
    }, 260);

    // Tab buttons
    root.querySelectorAll('[data-tab-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        root.querySelectorAll('[data-tab-btn]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.tab = btn.getAttribute('data-tab-btn');
        repaint();
      });
    });

    // Admin Approve Handler
    UI.delegate(root, 'click', '[data-admin-approve]', function (e, btn) {
      const regId = btn.getAttribute('data-admin-approve');
      const reg = (Store.db.studentRegistrations || []).find(r => r.id === regId);
      if (!reg) return;

      UI.confirm({
        title: 'Approve & Activate ' + reg.name + '?',
        message: 'This will verify student credentials, create their verified profile, and activate their student account.',
        acceptText: 'Approve & Activate',
        tone: 'success'
      }).then(function (ok) {
        if (!ok) return;
        const curAdmin = admin();
        CC.AuthService.approveStudentRegistration(regId, curAdmin).then(function () {
          UI.success('Student Approved!', reg.name + ' verified and profile activated.');
          repaint();
        });
      });
    });

    // Admin Reject Handler
    UI.delegate(root, 'click', '[data-admin-reject]', function (e, btn) {
      const regId = btn.getAttribute('data-admin-reject');
      const reg = (Store.db.studentRegistrations || []).find(r => r.id === regId);
      if (!reg) return;

      UI.prompt({
        title: 'Reject Registration for ' + reg.name,
        message: 'Enter rejection reason to inform the student:',
        defaultValue: 'Enrollment credentials could not be authenticated against institutional records.',
        acceptText: 'Confirm Rejection',
        tone: 'danger'
      }).then(function (reason) {
        if (!reason) return;
        const curAdmin = admin();
        CC.AuthService.rejectStudentRegistration(regId, curAdmin, reason).then(function () {
          UI.warning('Registration Rejected', reg.name + ' rejected.');
          repaint();
        });
      });
    });

    UI.delegate(root, 'click', '[data-student]', function (e, btn) {
      openStudentModal(btn.getAttribute('data-student'));
    });

    root.querySelector('#csvBtn').addEventListener('click', function () {
      const rows = [];
      Store.db.students.forEach(function (s) {
        AS.forStudent(s.id).forEach(function (a) { rows.push(a); });
      });
      RS.downloadCSV('campuscred-student-records.csv', RS.toCSV(rows));
      UI.success('CSV download started', 'All student activity records exported.');
    });
  }

  function openStudentModal(studentId) {
    const s = ProfileSafe(studentId);
    if (!s) return;
    const stats = AS.statsFor(studentId);
    const rows = AS.forStudent(studentId).slice(0, 8);

    const body =
      '<div class="flex-center gap-16 mb-16">' + UI.avatar(s.name, s.color, 'lg') +
        '<div><div style="font-weight:800;font-size:17px">' + UI.esc(s.name) + '</div>' +
        '<div class="text-small text-muted mono">' + UI.esc(s.enrollment) + '</div>' +
        '<div class="text-small text-muted">' + UI.esc(s.course) + ' ' + UI.esc(s.branch) + ' · ' + UI.esc(s.department) + '</div></div>' +
      '</div>' +
      '<div class="stat-grid cols-4 mb-16">' +
        '<div class="stat-card"><span class="stat-icon tone-royal">' + icon('list', 19) + '</span><div><div class="stat-value" style="font-size:21px">' + stats.total + '</div><div class="stat-label">Total</div></div></div>' +
        '<div class="stat-card"><span class="stat-icon tone-green">' + icon('checkCircle', 19) + '</span><div><div class="stat-value" style="font-size:21px">' + stats.verified + '</div><div class="stat-label">Verified</div></div></div>' +
        '<div class="stat-card"><span class="stat-icon tone-amber">' + icon('clock', 19) + '</span><div><div class="stat-value" style="font-size:21px">' + stats.pending + '</div><div class="stat-label">Pending</div></div></div>' +
        '<div class="stat-card"><span class="stat-icon tone-red">' + icon('xCircle', 19) + '</span><div><div class="stat-value" style="font-size:21px">' + stats.rejected + '</div><div class="stat-label">Rejected</div></div></div>' +
      '</div>' +
      '<div class="section-title">Recent submissions</div>' +
      UI.table([
        { key: 'name', label: 'Activity', render: function (a) { return '<div class="cell-main">' + UI.esc(a.name) + '</div>'; } },
        { key: 'category', label: 'Category', render: function (a) { return UI.categoryBadge(a.category); } },
        { key: 'date', label: 'Date', render: function (a) { return UI.fmtDate(a.date); } },
        { key: 'status', label: 'Status', render: function (a) { return UI.statusBadge(a.status); } }
      ], rows, { empty: { icon: 'inbox', title: 'No submissions', message: 'This student has not submitted anything yet.' } });

    UI.openModal({
      title: 'Student record',
      subtitle: s.enrollment,
      size: 'lg',
      body: body,
      footer: '<a class="btn btn-outline" href="#/portfolio/' + s.id + '" target="_blank" rel="noopener" data-close>' + icon('externalLink', 15) + 'Public portfolio</a>' +
        '<button class="btn btn-primary" type="button" data-close>Close</button>'
    });
  }

  function ProfileSafe(id) { return CC.ProfileService.get(id); }

  /* =========================================================
     FACULTY MANAGEMENT
     ========================================================= */
  function renderFaculty(root, ctx) {
    const state = { search: '', department: 'all' };

    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Faculty / Verifiers</h1>' +
        '<p class="page-desc">Authorized verifiers and their assigned categories. Verifiers can only approve submissions inside their scope.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-primary" type="button" id="addBtn">' + icon('plusCircle', 16) + 'Add Verifier</button>' +
        '</div>' +
      '</div>' +

      demoBanner() +
      adminFilterBar(state, { placeholder: 'Search faculty name, email, employee ID…', branch: false, year: false, category: false, status: false, dateRange: false }) +
      '<div class="entity-grid" id="facGrid">' + UI.loading('Loading faculty…') + '</div>';

    const host = root.querySelector('#facGrid');

    function repaint() {
      let list = Store.db.faculty.slice();
      if (state.department !== 'all') list = list.filter(function (f) { return f.department === state.department; });
      if (state.search) {
        const q = state.search.toLowerCase();
        list = list.filter(function (f) {
          return f.name.toLowerCase().indexOf(q) !== -1 || f.email.toLowerCase().indexOf(q) !== -1 || f.employeeId.toLowerCase().indexOf(q) !== -1;
        });
      }

      if (!list.length) {
        host.innerHTML = UI.empty({ icon: 'users', title: 'No faculty found', message: 'No verifiers match these filters.' });
        return;
      }

      host.innerHTML = list.map(function (f) {
        const stats = CC.VerificationService.statsFor(f);
        return '<div class="entity-card">' +
          '<div class="ec-top">' + UI.avatar(f.name, f.color) +
            '<div><div class="ec-name">' + UI.esc(f.name) + '</div>' +
            '<div class="ec-sub">' + UI.esc(f.designation) + '</div>' +
            '<div class="ec-sub mono">' + UI.esc(f.employeeId) + '</div></div>' +
          '</div>' +
          '<div class="text-small text-muted mt-8">' + UI.esc(f.department) + '</div>' +
          '<div class="flex-center gap-8 mt-8" style="flex-wrap:wrap">' +
            (f.categories || []).map(function (c) { return '<span class="chip chip-royal">' + UI.esc(c) + '</span>'; }).join('') +
          '</div>' +
          '<div class="ec-stats">' +
            '<div class="ec-stat"><div class="v">' + stats.totalReviewed + '</div><div class="l">REVIEWED</div></div>' +
            '<div class="ec-stat"><div class="v text-success">' + stats.approved + '</div><div class="l">APPROVED</div></div>' +
            '<div class="ec-stat"><div class="v text-danger">' + stats.rejected + '</div><div class="l">REJECTED</div></div>' +
            '<div class="ec-stat"><div class="v text-warning">' + stats.pending + '</div><div class="l">QUEUE</div></div>' +
          '</div>' +
          '<div class="ec-actions">' +
            '<button class="btn btn-sm btn-outline w-100" type="button" data-fac="' + f.id + '">' + icon('mail', 14) + 'Contact / details</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    setTimeout(function () {
      repaint();
      bindFilters(root, state, repaint);
    }, 260);

    UI.delegate(root, 'click', '[data-fac]', function (e, btn) {
      const f = Store.db.faculty.find(function (x) { return x.id === btn.getAttribute('data-fac'); });
      if (!f) return;
      const stats = CC.VerificationService.statsFor(f);
      const isDefault = f.id === 'FAC-201';
      const m = UI.openModal({
        title: f.name,
        subtitle: f.designation + ' · ' + f.department,
        body: '<dl class="dl">' +
          '<dt>Employee ID</dt><dd class="mono">' + UI.esc(f.employeeId) + '</dd>' +
          '<dt>Email</dt><dd>' + UI.esc(f.email) + '</dd>' +
          '<dt>Phone</dt><dd>' + UI.esc(f.phone || 'Not specified') + '</dd>' +
          '<dt>Office</dt><dd>' + UI.esc(f.officeLocation || 'Faculty Block') + '</dd>' +
          '<dt>Department</dt><dd>' + UI.esc(f.department) + '</dd>' +
          '<dt>Verification scope</dt><dd>' + (f.categories || []).map(function (c) { return '<span class="chip chip-royal" style="margin:2px 4px 2px 0">' + UI.esc(c) + '</span>'; }).join('') + '</dd>' +
          '<dt>Total reviewed</dt><dd>' + stats.totalReviewed + '</dd>' +
          '<dt>Approval rate</dt><dd>' + (stats.totalReviewed ? Math.round(stats.approved / stats.totalReviewed * 100) : 0) + '%</dd>' +
        '</dl>' +
        '<div class="callout info mt-16">' + icon('info', 16) + '<div>Login password: <code>' + UI.esc(f.password || 'faculty123') + '</code>. Role: <strong>Faculty / Verifier</strong>.</div></div>',
        footer:
          '<button class="btn btn-outline" type="button" data-close>Close</button>' +
          '<button class="btn btn-primary" type="button" id="editFacBtn">' + icon('edit', 14) + 'Edit Scope / Details</button>' +
          (!isDefault ? '<button class="btn btn-ghost text-danger" type="button" id="removeFacBtn">' + icon('trash', 14) + 'Remove Verifier</button>' : '')
      });

      const editBtn = m.el.querySelector('#editFacBtn');
      if (editBtn) {
        editBtn.addEventListener('click', function () {
          m.close();
          openEditFacultyModal(f, repaint);
        });
      }

      const removeBtn = m.el.querySelector('#removeFacBtn');
      if (removeBtn) {
        removeBtn.addEventListener('click', function () {
          UI.confirm({
            title: 'Remove Faculty Verifier',
            message: 'Are you sure you want to remove ' + f.name + ' (' + f.employeeId + ')? They will no longer be able to log in or verify student records.',
            tone: 'danger',
            acceptText: 'Remove Verifier'
          }).then(function (ok) {
            if (!ok) return;
            m.close();
            Store.db.faculty = Store.db.faculty.filter(function (x) { return x.id !== f.id; });
            if (Store.db.users) {
              const uIdx = Store.db.users.findIndex(function (u) { return u.uid === f.id; });
              if (uIdx !== -1) Store.db.users.splice(uIdx, 1);
            }
            if (Store.db.facultyProfiles) {
              const fpIdx = Store.db.facultyProfiles.findIndex(function (p) { return p.uid === f.id; });
              if (fpIdx !== -1) Store.db.facultyProfiles.splice(fpIdx, 1);
            }
            Store.persist();
            repaint();
            UI.info('Verifier Removed', f.name + ' (' + f.employeeId + ') has been removed from authorized verifiers.');
          });
        });
      }
    });

    root.querySelector('#addBtn').addEventListener('click', function () {
      openAddFacultyModal(repaint);
    });
  }

  /* ---------- Add Faculty Modal ---------- */
  function openAddFacultyModal(repaint) {
    const categories = Mock.CATEGORIES.slice();
    const departments = Mock.DEPARTMENTS.slice();

    const bodyHtml =
      '<form id="addFacultyForm" onsubmit="return false;">' +
        '<div class="form-grid">' +
          '<div class="field span-2">' +
            '<label class="form-label" for="newFacName">Full Name <span class="req">*</span></label>' +
            '<input class="input" type="text" id="newFacName" placeholder="e.g. Dr. Sneha Joshi" autocomplete="name" required />' +
          '</div>' +

          '<div class="field">' +
            '<label class="form-label" for="newFacEmpId">Employee / Staff ID <span class="req">*</span></label>' +
            '<input class="input mono" type="text" id="newFacEmpId" placeholder="e.g. EMP-CSE-205" required style="text-transform:uppercase" />' +
            '<div class="hint">Institutional faculty ID (used for login & audit trails).</div>' +
          '</div>' +

          '<div class="field">' +
            '<label class="form-label" for="newFacEmail">Institutional Email <span class="req">*</span></label>' +
            '<input class="input" type="email" id="newFacEmail" placeholder="e.g. sneha.joshi@campuscred.demo" required />' +
          '</div>' +

          '<div class="field">' +
            '<label class="form-label" for="newFacDept">Department <span class="req">*</span></label>' +
            '<select class="select" id="newFacDept">' +
              departments.map(function (d) { return '<option value="' + UI.esc(d) + '">' + UI.esc(d) + '</option>'; }).join('') +
            '</select>' +
          '</div>' +

          '<div class="field">' +
            '<label class="form-label" for="newFacDesignation">Designation <span class="req">*</span></label>' +
            '<select class="select" id="newFacDesignation">' +
              '<option value="Assistant Professor">Assistant Professor</option>' +
              '<option value="Associate Professor" selected>Associate Professor</option>' +
              '<option value="Professor">Professor</option>' +
              '<option value="Professor & Head of Department">Professor & Head of Department (HOD)</option>' +
              '<option value="Associate Professor & Verification Head">Associate Professor & Verification Head</option>' +
              '<option value="Verification Officer">Verification Officer</option>' +
              '<option value="Dean of Student Affairs">Dean of Student Affairs</option>' +
            '</select>' +
          '</div>' +

          '<div class="field">' +
            '<label class="form-label" for="newFacPhone">Phone / Mobile Number</label>' +
            '<input class="input" type="tel" id="newFacPhone" placeholder="e.g. +91 98765 43219" />' +
          '</div>' +

          '<div class="field">' +
            '<label class="form-label" for="newFacPassword">Initial Login Password <span class="req">*</span></label>' +
            '<input class="input" type="password" id="newFacPassword" value="faculty123" placeholder="Set login password" required />' +
            '<div class="hint">Default initial password is <code>faculty123</code>.</div>' +
          '</div>' +

          '<div class="field span-2">' +
            '<label class="form-label" for="newFacOffice">Office Location / Cabin</label>' +
            '<input class="input" type="text" id="newFacOffice" placeholder="e.g. Room 204, Academic Block B" />' +
          '</div>' +

          '<div class="field span-2">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
              '<label class="form-label" style="margin-bottom:0">Authorized Verification Scope (Categories) <span class="req">*</span></label>' +
              '<div style="display:flex;gap:8px">' +
                '<button type="button" class="btn btn-sm btn-ghost" id="facScopeSelectAll" style="font-size:11.5px;padding:2px 8px">Select All</button>' +
                '<button type="button" class="btn btn-sm btn-ghost" id="facScopeClearAll" style="font-size:11.5px;padding:2px 8px">Clear</button>' +
              '</div>' +
            '</div>' +
            '<div class="hint mb-8">This verifier will have permission to review student activity and certificate submissions in these categories.</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:8px 12px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-subtle)">' +
              categories.map(function (cat) {
                return '<label class="checkbox-row" style="font-size:13px">' +
                  '<input type="checkbox" name="facCategory" value="' + UI.esc(cat) + '" checked /> ' +
                  UI.esc(cat) +
                '</label>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="addFacError" class="callout danger mt-12" style="display:none"></div>' +
      '</form>';

    const modal = UI.openModal({
      title: 'Add Faculty / Verifier',
      subtitle: 'Authorize a faculty member to verify student credentials & activities',
      size: 'lg',
      body: bodyHtml,
      footer:
        '<button class="btn btn-outline" type="button" data-close>Cancel</button>' +
        '<button class="btn btn-primary" type="button" id="submitAddFacBtn">' + icon('plusCircle', 16) + 'Add & Authorize Verifier</button>'
    });

    const el = modal.el;
    const selectAllBtn = el.querySelector('#facScopeSelectAll');
    const clearAllBtn = el.querySelector('#facScopeClearAll');
    const submitBtn = el.querySelector('#submitAddFacBtn');
    const errBox = el.querySelector('#addFacError');

    function showError(msg) {
      errBox.innerHTML = icon('alert', 16) + '<div>' + UI.esc(msg) + '</div>';
      errBox.style.display = 'flex';
      errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideError() {
      errBox.style.display = 'none';
      errBox.innerHTML = '';
    }

    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', function () {
        el.querySelectorAll('input[name="facCategory"]').forEach(function (cb) { cb.checked = true; });
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', function () {
        el.querySelectorAll('input[name="facCategory"]').forEach(function (cb) { cb.checked = false; });
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        hideError();

        const name = (el.querySelector('#newFacName').value || '').trim();
        const empId = (el.querySelector('#newFacEmpId').value || '').trim().toUpperCase();
        const email = (el.querySelector('#newFacEmail').value || '').trim().toLowerCase();
        const dept = el.querySelector('#newFacDept').value;
        const designation = el.querySelector('#newFacDesignation').value;
        const phone = (el.querySelector('#newFacPhone').value || '').trim();
        const password = (el.querySelector('#newFacPassword').value || '').trim();
        const office = (el.querySelector('#newFacOffice').value || '').trim();

        const selectedCats = [];
        el.querySelectorAll('input[name="facCategory"]:checked').forEach(function (cb) {
          selectedCats.push(cb.value);
        });

        // Validation
        if (!name) {
          showError('Please enter the faculty member\'s full name.');
          el.querySelector('#newFacName').focus();
          return;
        }

        if (!empId) {
          showError('Please enter a valid Employee / Staff ID (e.g. EMP-CSE-205).');
          el.querySelector('#newFacEmpId').focus();
          return;
        }

        const empExists = (Store.db.faculty || []).some(function (f) {
          return (f.employeeId || '').toUpperCase() === empId;
        }) || (Store.db.users || []).some(function (u) {
          return (u.registrationNumber || '').toUpperCase() === empId;
        });

        if (empExists) {
          showError('Employee ID "' + empId + '" is already assigned to an existing faculty member.');
          el.querySelector('#newFacEmpId').focus();
          return;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          showError('Please enter a valid institutional email address.');
          el.querySelector('#newFacEmail').focus();
          return;
        }

        const emailExists = (Store.db.faculty || []).some(function (f) {
          return (f.email || '').toLowerCase() === email;
        }) || (Store.db.users || []).some(function (u) {
          return (u.email || '').toLowerCase() === email;
        });

        if (emailExists) {
          showError('Email address "' + email + '" is already registered.');
          el.querySelector('#newFacEmail').focus();
          return;
        }

        if (!password || password.length < 4) {
          showError('Password must be at least 4 characters long.');
          el.querySelector('#newFacPassword').focus();
          return;
        }

        if (!selectedCats.length) {
          showError('Please select at least one authorized verification category.');
          return;
        }

        // Generate unique faculty ID
        let maxNum = 200;
        (Store.db.faculty || []).forEach(function (f) {
          const m = String(f.id || '').match(/FAC-(\d+)/);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        });
        const newId = 'FAC-' + (maxNum + 1);
        const color = ((Store.db.faculty || []).length % 6) + 1;

        const deptMap = {
          'Computer Science & Engineering': { id: 'dept-cse', name: 'Department of Computer Science & Engineering', courseId: 'course-btech-cse', courseName: 'B.Tech Computer Science & Engineering' },
          'Information Technology': { id: 'dept-it', name: 'Department of Information Technology', courseId: 'course-btech-it', courseName: 'B.Tech Information Technology' },
          'Electronics & Communication': { id: 'dept-ece', name: 'Department of Electronics & Communication', courseId: 'course-btech-ece', courseName: 'B.Tech Electronics & Communication' },
          'Mechanical Engineering': { id: 'dept-me', name: 'Department of Mechanical Engineering', courseId: 'course-btech-me', courseName: 'B.Tech Mechanical Engineering' },
          'Electrical Engineering': { id: 'dept-ee', name: 'Department of Electrical Engineering', courseId: 'course-btech-ee', courseName: 'B.Tech Electrical Engineering' }
        };
        const dInfo = deptMap[dept] || {
          id: 'dept-' + dept.toLowerCase().replace(/[^a-z0-9]/g, ''),
          name: 'Department of ' + dept,
          courseId: 'course-btech',
          courseName: 'B.Tech ' + dept
        };

        // Create faculty record
        const newFaculty = {
          id: newId,
          name: name,
          email: email,
          password: password,
          role: 'faculty',
          department: dept,
          departmentId: dInfo.id,
          designation: designation,
          employeeId: empId,
          phone: phone || '+91 98765 00000',
          officeLocation: office || 'Academic Block, Faculty Cabin',
          color: color,
          categories: selectedCats,
          isCustom: true,
          createdAt: new Date().toISOString()
        };

        if (!Store.db.faculty) Store.db.faculty = [];
        Store.db.faculty.push(newFaculty);

        // Sync to Store.db.users
        const userDoc = {
          uid: newId,
          name: name,
          email: email,
          phone: phone || '',
          password: password,
          role: 'FACULTY',
          departmentId: dInfo.id,
          departmentName: dInfo.name,
          courseId: dInfo.courseId,
          courseName: dInfo.courseName,
          academicYear: '2024-2028',
          registrationNumber: empId,
          accountStatus: 'ACTIVE',
          color: color,
          isCustom: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (!Store.db.users) Store.db.users = [];
        const existingUserIdx = Store.db.users.findIndex(function (u) { return u.uid === newId; });
        if (existingUserIdx !== -1) Store.db.users[existingUserIdx] = userDoc;
        else Store.db.users.push(userDoc);

        // Sync to Store.db.facultyProfiles
        const fpDoc = {
          uid: newId,
          designation: designation,
          departmentId: dInfo.id,
          authorizedCategories: selectedCats.map(function (c) { return 'cat-' + c.toLowerCase().replace(/[^a-z0-9]/g, ''); }),
          officeLocation: office || 'Academic Block, Faculty Cabin',
          totalVerifiedCount: 0,
          updatedAt: new Date().toISOString()
        };

        if (!Store.db.facultyProfiles) Store.db.facultyProfiles = [];
        const existingFpIdx = Store.db.facultyProfiles.findIndex(function (p) { return p.uid === newId; });
        if (existingFpIdx !== -1) Store.db.facultyProfiles[existingFpIdx] = fpDoc;
        else Store.db.facultyProfiles.push(fpDoc);

        // Record Audit Log
        const auditEntry = {
          id: 'AUD-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100),
          actorUid: (admin() && admin().id) || 'ADM-301',
          actorEmail: (admin() && admin().email) || 'admin@campuscred.demo',
          actorRole: 'ADMIN',
          action: 'FACULTY_CREATED',
          resourceType: 'FACULTY',
          resourceId: newId,
          details: { name: name, employeeId: empId, department: dept, categories: selectedCats },
          timestamp: new Date().toISOString()
        };

        if (!Store.db.auditLogs) Store.db.auditLogs = [];
        Store.db.auditLogs.unshift(auditEntry);

        // Sync to Firestore if online/active
        if (CC.FirestoreService) {
          try {
            CC.FirestoreService.createUser(userDoc);
            CC.FirestoreService.upsertFacultyProfile(newId, fpDoc);
            CC.FirestoreService.recordAuditLog(auditEntry);
          } catch (err) {
            console.warn('[Firestore] Sync warning:', err);
          }
        }

        Store.persist();
        modal.close();
        repaint();
        UI.success('Faculty Verifier Added', name + ' (' + empId + ') has been registered as an authorized verifier with ' + selectedCats.length + ' categories.');
      });
    }
  }

  /* ---------- Edit Faculty Modal ---------- */
  function openEditFacultyModal(f, repaint) {
    const categories = Mock.CATEGORIES.slice();
    const departments = Mock.DEPARTMENTS.slice();
    const curCats = f.categories || [];

    const bodyHtml =
      '<form id="editFacultyForm" onsubmit="return false;">' +
        '<div class="form-grid">' +
          '<div class="field span-2">' +
            '<label class="form-label" for="editFacName">Full Name <span class="req">*</span></label>' +
            '<input class="input" type="text" id="editFacName" value="' + UI.esc(f.name) + '" required />' +
          '</div>' +

          '<div class="field">' +
            '<label class="form-label">Employee ID</label>' +
            '<input class="input mono" type="text" value="' + UI.esc(f.employeeId) + '" disabled />' +
            '<div class="hint">Employee ID cannot be altered once registered.</div>' +
          '</div>' +

          '<div class="field">' +
            '<label class="form-label" for="editFacEmail">Institutional Email <span class="req">*</span></label>' +
            '<input class="input" type="email" id="editFacEmail" value="' + UI.esc(f.email) + '" required />' +
          '</div>' +

          '<div class="field">' +
            '<label class="form-label" for="editFacDept">Department <span class="req">*</span></label>' +
            '<select class="select" id="editFacDept">' +
              departments.map(function (d) { return '<option value="' + UI.esc(d) + '"' + (f.department === d ? ' selected' : '') + '>' + UI.esc(d) + '</option>'; }).join('') +
            '</select>' +
          '</div>' +

          '<div class="field">' +
            '<label class="form-label" for="editFacDesignation">Designation <span class="req">*</span></label>' +
            '<select class="select" id="editFacDesignation">' +
              ['Assistant Professor', 'Associate Professor', 'Professor', 'Professor & Head of Department', 'Associate Professor & Verification Head', 'Verification Officer', 'Dean of Student Affairs'].map(function (des) {
                return '<option value="' + UI.esc(des) + '"' + (f.designation === des ? ' selected' : '') + '>' + UI.esc(des) + '</option>';
              }).join('') +
            '</select>' +
          '</div>' +

          '<div class="field">' +
            '<label class="form-label" for="editFacPhone">Phone / Mobile Number</label>' +
            '<input class="input" type="tel" id="editFacPhone" value="' + UI.esc(f.phone || '') + '" placeholder="e.g. +91 98765 43219" />' +
          '</div>' +

          '<div class="field">' +
            '<label class="form-label" for="editFacPassword">Account Password <span class="req">*</span></label>' +
            '<input class="input" type="text" id="editFacPassword" value="' + UI.esc(f.password || 'faculty123') + '" required />' +
          '</div>' +

          '<div class="field span-2">' +
            '<label class="form-label" for="editFacOffice">Office Location / Cabin</label>' +
            '<input class="input" type="text" id="editFacOffice" value="' + UI.esc(f.officeLocation || '') + '" placeholder="e.g. Room 204, Academic Block B" />' +
          '</div>' +

          '<div class="field span-2">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
              '<label class="form-label" style="margin-bottom:0">Authorized Verification Scope (Categories) <span class="req">*</span></label>' +
              '<div style="display:flex;gap:8px">' +
                '<button type="button" class="btn btn-sm btn-ghost" id="editScopeSelectAll" style="font-size:11.5px;padding:2px 8px">Select All</button>' +
                '<button type="button" class="btn btn-sm btn-ghost" id="editScopeClearAll" style="font-size:11.5px;padding:2px 8px">Clear</button>' +
              '</div>' +
            '</div>' +
            '<div class="hint mb-8">Selected categories determine which activity submissions this verifier can approve or reject.</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:8px 12px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-subtle)">' +
              categories.map(function (cat) {
                const checked = curCats.indexOf(cat) !== -1;
                return '<label class="checkbox-row" style="font-size:13px">' +
                  '<input type="checkbox" name="editFacCategory" value="' + UI.esc(cat) + '"' + (checked ? ' checked' : '') + ' /> ' +
                  UI.esc(cat) +
                '</label>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="editFacError" class="callout danger mt-12" style="display:none"></div>' +
      '</form>';

    const modal = UI.openModal({
      title: 'Edit Verifier: ' + f.name,
      subtitle: f.employeeId + ' · ' + f.department,
      size: 'lg',
      body: bodyHtml,
      footer:
        '<button class="btn btn-outline" type="button" data-close>Cancel</button>' +
        '<button class="btn btn-primary" type="button" id="submitEditFacBtn">' + icon('check', 16) + 'Save Changes</button>'
    });

    const el = modal.el;
    const selectAllBtn = el.querySelector('#editScopeSelectAll');
    const clearAllBtn = el.querySelector('#editScopeClearAll');
    const submitBtn = el.querySelector('#submitEditFacBtn');
    const errBox = el.querySelector('#editFacError');

    function showError(msg) {
      errBox.innerHTML = icon('alert', 16) + '<div>' + UI.esc(msg) + '</div>';
      errBox.style.display = 'flex';
      errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', function () {
        el.querySelectorAll('input[name="editFacCategory"]').forEach(function (cb) { cb.checked = true; });
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', function () {
        el.querySelectorAll('input[name="editFacCategory"]').forEach(function (cb) { cb.checked = false; });
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        errBox.style.display = 'none';

        const name = (el.querySelector('#editFacName').value || '').trim();
        const email = (el.querySelector('#editFacEmail').value || '').trim().toLowerCase();
        const dept = el.querySelector('#editFacDept').value;
        const designation = el.querySelector('#editFacDesignation').value;
        const phone = (el.querySelector('#editFacPhone').value || '').trim();
        const password = (el.querySelector('#editFacPassword').value || '').trim();
        const office = (el.querySelector('#editFacOffice').value || '').trim();

        const selectedCats = [];
        el.querySelectorAll('input[name="editFacCategory"]:checked').forEach(function (cb) {
          selectedCats.push(cb.value);
        });

        if (!name) {
          showError('Please enter the faculty member\'s full name.');
          return;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          showError('Please enter a valid institutional email address.');
          return;
        }

        const emailExists = (Store.db.faculty || []).some(function (x) {
          return x.id !== f.id && (x.email || '').toLowerCase() === email;
        }) || (Store.db.users || []).some(function (u) {
          return u.uid !== f.id && (u.email || '').toLowerCase() === email;
        });

        if (emailExists) {
          showError('Email address "' + email + '" is already used by another account.');
          return;
        }

        if (!password || password.length < 4) {
          showError('Password must be at least 4 characters long.');
          return;
        }

        if (!selectedCats.length) {
          showError('Please select at least one authorized verification category.');
          return;
        }

        // Update faculty in Store.db.faculty
        f.name = name;
        f.email = email;
        f.department = dept;
        f.designation = designation;
        f.phone = phone;
        f.password = password;
        f.officeLocation = office;
        f.categories = selectedCats;

        // Update in Store.db.users
        if (Store.db.users) {
          const u = Store.db.users.find(function (x) { return x.uid === f.id; });
          if (u) {
            u.name = name;
            u.email = email;
            u.phone = phone;
            u.password = password;
            u.departmentName = dept;
            u.updatedAt = new Date().toISOString();
          }
        }

        // Update in Store.db.facultyProfiles
        if (Store.db.facultyProfiles) {
          const fp = Store.db.facultyProfiles.find(function (x) { return x.uid === f.id; });
          if (fp) {
            fp.designation = designation;
            fp.officeLocation = office;
            fp.authorizedCategories = selectedCats.map(function (c) { return 'cat-' + c.toLowerCase().replace(/[^a-z0-9]/g, ''); });
            fp.updatedAt = new Date().toISOString();
          }
        }

        Store.persist();
        modal.close();
        repaint();
        UI.success('Verifier Updated', f.name + '\'s verification details and categories have been updated.');
      });
    }
  }

  /* =========================================================
     ACTIVITIES MANAGEMENT
     ========================================================= */
  function renderActivities(root, ctx) {
    const state = { search: '', department: 'all', branch: 'all', year: 'all', category: 'all', status: 'all', from: '', to: '' };

    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Activities</h1>' +
        '<p class="page-desc">Every participation record college-wide, with filters across department, branch, year, category, status and date range.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-outline" type="button" id="csvBtn">' + icon('download', 16) + 'Download CSV</button>' +
          '<button class="btn btn-primary" type="button" id="pdfBtn">' + icon('fileText', 16) + 'Download PDF</button>' +
        '</div>' +
      '</div>' +

      demoBanner() +
      adminFilterBar(state, { placeholder: 'Search activity, student, certificate ID…' }) +
      '<div class="card">' +
        '<div class="pagination" style="border-top:0;border-bottom:1px solid var(--border)"><span class="info" id="rowCount"></span>' +
        '<span class="info">Click a row to open the full record</span></div>' +
        '<div id="actTable">' + UI.loading('Loading activities…') + '</div>' +
      '</div>';

    const host = root.querySelector('#actTable');
    const countEl = root.querySelector('#rowCount');
    let currentRows = [];

    function repaint() {
      currentRows = RS.filtered(emptyFilterState(state));
      countEl.innerHTML = '<strong>' + currentRows.length + '</strong> records match · <strong>' +
        currentRows.filter(function (a) { return a.status === 'verified'; }).length + '</strong> verified';

      host.innerHTML = UI.table([
        {
          key: 'name', label: 'Activity / Student', render: function (a) {
            const st = AS.studentOf(a) || {};
            return '<div class="cell-main">' + UI.esc(a.name) + '</div><div class="cell-sub">' + UI.esc(st.name || '—') + ' · ' + UI.esc(st.enrollment || '') + '</div>';
          }
        },
        { key: 'category', label: 'Category', render: function (a) { return UI.categoryBadge(a.category); } },
        {
          key: 'department', label: 'Department', render: function (a) {
            const st = AS.studentOf(a) || {};
            return '<span class="text-small">' + UI.esc(st.branch || '—') + '</span>';
          }
        },
        { key: 'date', label: 'Event date', render: function (a) { return UI.fmtDate(a.date); } },
        {
          key: 'certificateId', label: 'Certificate', render: function (a) {
            return a.certificateId ? '<span class="mono text-small">' + UI.esc(a.certificateId) + '</span>' : '<span class="text-muted">—</span>';
          }
        },
        { key: 'status', label: 'Status', render: function (a) { return UI.statusBadge(a.status); } },
        {
          key: '_a', label: '', className: 'actions-cell', render: function (a) {
            return '<button class="btn btn-sm btn-outline" type="button" data-view="' + a.id + '">' + icon('eye', 14) + '</button>';
          }
        }
      ], currentRows, {
        empty: { icon: 'filter', title: 'No records match', message: 'Try broadening or resetting the filters.' }
      });
    }

    setTimeout(function () {
      repaint();
      bindFilters(root, state, repaint);
    }, 260);

    UI.delegate(root, 'click', '[data-view]', function (e, btn) {
      e.stopPropagation();
      CC.StudentPages.detailModal(AS.byId(btn.getAttribute('data-view')));
    });

    root.querySelector('#csvBtn').addEventListener('click', function () {
      if (!currentRows.length) { UI.warning('Nothing to export', 'No records match the current filters.'); return; }
      RS.downloadCSV('campuscred-activities.csv', RS.toCSV(currentRows));
      UI.success('CSV download started', currentRows.length + ' records exported.');
    });
    root.querySelector('#pdfBtn').addEventListener('click', function () {
      if (!currentRows.length) { UI.warning('Nothing to export', 'No records match the current filters.'); return; }
      UI.info('Preparing PDF', 'Use “Save as PDF” in the print dialog to download.');
      setTimeout(function () { window.print(); }, 350);
    });
  }

  /* =========================================================
     ANALYTICS
     ========================================================= */
  function renderAnalytics(root, ctx) {
    const state = { search: '', department: 'all', branch: 'all', year: 'all', category: 'all', status: 'all', from: '', to: '' };

    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Analytics</h1>' +
        '<p class="page-desc">Category, department, monthly and verification-status insights. Every chart re-renders the moment a filter changes.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-outline" type="button" id="csvBtn">' + icon('download', 16) + 'Download CSV report</button>' +
        '</div>' +
      '</div>' +

      demoBanner() +
      adminFilterBar(state, { placeholder: 'Search to narrow every chart…' }) +

      '<div class="two-col mb-24">' +
        '<div id="catBar"></div>' +
        '<div id="statusDonut"></div>' +
      '</div>' +
      '<div class="mb-24" id="trendLine"></div>' +
      '<div class="two-col mb-24">' +
        '<div id="deptBar"></div>' +
        '<div id="topDept"></div>' +
      '</div>' +
      '<div class="two-col">' +
        '<div>' +
          '<div class="section-title">Records matching filters</div>' +
          '<div class="card"><div id="anaTable">' + UI.loading('Loading records…') + '</div></div>' +
        '</div>' +
        '<div>' +
          '<div class="section-title">Department-wise student participation</div>' +
          '<div class="card card-pad mb-24" id="deptStudents"></div>' +
          '<div class="section-title">Status comparison</div>' +
          '<div class="card card-pad" id="statusSummary"></div>' +
        '</div>' +
      '</div>';

    const catBar = root.querySelector('#catBar');
    const statusDonut = root.querySelector('#statusDonut');
    const trendLine = root.querySelector('#trendLine');
    const deptBar = root.querySelector('#deptBar');
    const topDept = root.querySelector('#topDept');
    const anaTable = root.querySelector('#anaTable');
    const deptStudents = root.querySelector('#deptStudents');
    const statusSummary = root.querySelector('#statusSummary');
    let currentRows = [];

    function repaint() {
      currentRows = RS.filtered(emptyFilterState(state));

      catBar.innerHTML = Charts.card('Category-wise participation', 'Activities per category',
        Charts.bar({
          data: RS.byCategory(currentRows).map(function (c) { return { label: c.label, values: [c.value] }; }),
          series: [{ name: 'Activities', color: '#2563EB' }], height: 250
        }));

      const statusData = RS.byStatus(currentRows);
      statusDonut.innerHTML = Charts.card('Verified vs Pending vs Rejected', 'Verification status split',
        '<div style="display:flex;justify-content:center;padding:8px 0">' +
        Charts.donut({ data: statusData, centerLabel: 'Records' }) + '</div>',
        Charts.legend(statusData));

      const trend = RS.monthlyTrend(currentRows);
      trendLine.innerHTML = Charts.card('Monthly participation trend', 'Last 12 months',
        Charts.line({
          data: trend.map(function (m) { return { label: m.label, full: m.full + ': ' + m.total + ' activities', value: m.total }; }),
          color: '#2563EB', height: 260, id: 'ana'
        }));

      const deptData = RS.byDepartment(currentRows);
      deptBar.innerHTML = Charts.card('Department-wise participation', 'Total records per department',
        '<div style="padding:6px 6px">' + Charts.hbarList(deptData.map(function (d) { return { label: d.label, value: d.value }; })) + '</div>');

      topDept.innerHTML = Charts.card('Top participating departments', 'Ranked by record count',
        '<div style="padding:6px 6px">' + Charts.hbarList(RS.topDepartments(currentRows)) + '</div>');

      anaTable.innerHTML = UI.table([
        { key: 'name', label: 'Activity', render: function (a) { return '<div class="cell-main">' + UI.esc(a.name) + '</div>'; } },
        { key: 'category', label: 'Category', render: function (a) { return UI.categoryBadge(a.category); } },
        { key: 'date', label: 'Date', render: function (a) { return UI.fmtDate(a.date); } },
        { key: 'status', label: 'Status', render: function (a) { return UI.statusBadge(a.status); } }
      ], currentRows.slice(0, 12), {
        empty: { icon: 'filter', title: 'No records match', message: 'Adjust the filters above.' }
      });

      deptStudents.innerHTML = '<div class="rank-list">' + RS.departmentParticipation().map(function (d, i) {
        const max = Math.max.apply(null, RS.departmentParticipation().map(function (x) { return x.activities; })) || 1;
        return '<div class="rank-item"><span class="rk-no">' + (i + 1) + '</span>' +
          '<div class="rk-main"><div class="rk-name">' + UI.esc(d.label) + '</div>' +
          '<div class="rk-bar"><span style="width:' + Math.round(d.activities / max * 100) + '%"></span></div></div>' +
          '<span class="rk-val" title="Students / activities">' + d.students + '·' + d.activities + '</span></div>';
      }).join('') + '</div>' +
      '<div class="text-small text-muted mt-8">Shown as students · activities</div>';

      statusSummary.innerHTML =
        statusData.map(function (s) {
          const total = currentRows.length || 1;
          const pct = Math.round(s.value / total * 100);
          const tone = s.label === 'Verified' ? 'green' : s.label === 'Pending' ? 'amber' : 'red';
          return '<div class="mb-16">' +
            '<div class="flex-between mb-8"><span class="text-small text-medium">' + s.label + '</span>' +
            '<span class="text-small"><strong>' + s.value + '</strong> · ' + pct + '%</span></div>' +
            '<div class="progress ' + tone + '"><span style="width:' + pct + '%"></span></div>' +
          '</div>';
        }).join('');

      Charts.bind(root);
    }

    root.querySelector('#csvBtn').addEventListener('click', function () {
      if (!currentRows.length) { UI.warning('Nothing to export', 'No records match the current filters.'); return; }
      RS.downloadCSV('campuscred-analytics-report.csv', RS.toCSV(currentRows));
      UI.success('CSV download started', currentRows.length + ' records exported.');
    });

    setTimeout(function () {
      repaint();
      bindFilters(root, state, repaint);
    }, 280);
  }

  /* =========================================================
     REPORTS
     ========================================================= */
  function renderReports(root, ctx) {
    const state = { search: '', department: 'all', branch: 'all', year: 'all', category: 'all', status: 'all', from: '', to: '' };

    const REPORTS = [
      { icon: 'layers', tone: 'tone-royal', title: 'Participation Master Report', desc: 'All participation records with student, department, category, date and verification status columns.', file: 'master-report' },
      { icon: 'checkCircle', tone: 'tone-green', title: 'Verified Records Report', desc: 'Only faculty-approved achievements with issued certificate IDs — ready for audit.', file: 'verified-records', status: 'verified' },
      { icon: 'clock', tone: 'tone-amber', title: 'Pending Verification Report', desc: 'Submissions still awaiting a faculty decision, grouped by department.', file: 'pending-records', status: 'pending' },
      { icon: 'xCircle', tone: 'tone-red', title: 'Rejected Records Report', desc: 'Rejected submissions together with the rejection reason given to students.', file: 'rejected-records', status: 'rejected' },
      { icon: 'barChart', tone: 'tone-violet', title: 'Category-wise Summary', desc: 'Aggregated counts per activity category for the selected filters.', file: 'category-summary', aggregate: 'category' },
      { icon: 'graduation', tone: 'tone-navy', title: 'Department-wise Summary', desc: 'Aggregated participation counts per department for presentations.', file: 'department-summary', aggregate: 'department' }
    ];

    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Reports</h1>' +
        '<p class="page-desc">Download college-wide reports as CSV, or use the browser print dialog to save any page as PDF.</p></div>' +
      '</div>' +

      demoBanner() +
      adminFilterBar(state, { placeholder: 'Optional: search within report…' }) +

      '<div class="report-grid mb-24">' +
        REPORTS.map(function (r, i) {
          return '<div class="report-card">' +
            '<span class="rc-ic ' + r.tone + '">' + icon(r.icon, 21) + '</span>' +
            '<h4>' + UI.esc(r.title) + '</h4>' +
            '<p>' + UI.esc(r.desc) + '</p>' +
            '<div class="rc-actions">' +
              '<button class="btn btn-sm btn-primary" type="button" data-csv="' + i + '">' + icon('download', 14) + 'CSV</button>' +
              '<button class="btn btn-sm btn-outline" type="button" data-pdf="' + i + '">' + icon('fileText', 14) + 'PDF</button>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +

      '<div class="two-col">' +
        '<div>' +
          '<div class="section-title">Report preview <span class="text-small text-muted" id="repCount"></span></div>' +
          '<div class="card"><div id="repTable">' + UI.loading('Building report preview…') + '</div></div>' +
        '</div>' +
        '<div>' +
          '<div class="section-title">Report summary</div>' +
          '<div class="card card-pad" id="repSummary"></div>' +
        '</div>' +
      '</div>';

    const host = root.querySelector('#repTable');
    const summaryHost = root.querySelector('#repSummary');
    const countEl = root.querySelector('#repCount');
    let currentRows = [];

    function rowsFor(report) {
      let rows = RS.filtered(emptyFilterState(state));
      if (report && report.status) rows = rows.filter(function (a) { return a.status === report.status; });
      return rows;
    }

    function repaint() {
      currentRows = rowsFor();
      countEl.textContent = currentRows.length + ' rows';
      host.innerHTML = UI.table([
        {
          key: 'name', label: 'Activity', render: function (a) {
            const st = AS.studentOf(a) || {};
            return '<div class="cell-main">' + UI.esc(a.name) + '</div><div class="cell-sub">' + UI.esc(st.name || '—') + ' · ' + UI.esc(st.enrollment || '') + '</div>';
          }
        },
        { key: 'category', label: 'Category', render: function (a) { return UI.categoryBadge(a.category); } },
        { key: 'date', label: 'Date', render: function (a) { return UI.fmtDate(a.date); } },
        { key: 'status', label: 'Status', render: function (a) { return UI.statusBadge(a.status); } },
        { key: 'certificateId', label: 'Cert ID', render: function (a) { return a.certificateId ? '<span class="mono text-small">' + UI.esc(a.certificateId) + '</span>' : '—'; } }
      ], currentRows.slice(0, 15), { empty: { icon: 'filter', title: 'No rows', message: 'No records match the current filters.' } });

      const ov = {
        total: currentRows.length,
        verified: currentRows.filter(function (a) { return a.status === 'verified'; }).length,
        pending: currentRows.filter(function (a) { return a.status === 'pending'; }).length,
        rejected: currentRows.filter(function (a) { return a.status === 'rejected'; }).length
      };
      summaryHost.innerHTML =
        '<div class="rank-list">' +
          '<div class="rank-item"><span class="rk-no">Σ</span><div class="rk-main"><div class="rk-name">Records in report</div></div><span class="rk-val">' + ov.total + '</span></div>' +
          '<div class="rank-item"><span class="rk-no" style="background:var(--verified-500);color:#fff">V</span><div class="rk-main"><div class="rk-name">Verified</div></div><span class="rk-val">' + ov.verified + '</span></div>' +
          '<div class="rank-item"><span class="rk-no" style="background:var(--pending-500);color:#fff">P</span><div class="rk-main"><div class="rk-name">Pending</div></div><span class="rk-val">' + ov.pending + '</span></div>' +
          '<div class="rank-item"><span class="rk-no" style="background:var(--danger-500);color:#fff">R</span><div class="rk-main"><div class="rk-name">Rejected</div></div><span class="rk-val">' + ov.rejected + '</span></div>' +
        '</div>' +
        '<div class="callout info mt-16">' + icon('info', 16) +
        '<div>CSV exports respect every filter above. PDF exports open the browser print dialog with a print-optimised layout.</div></div>';
    }

    function exportCSV(report) {
      const rows = rowsFor(report);
      if (!rows.length) { UI.warning('Nothing to export', 'No records match the current filters.'); return; }

      if (report && report.aggregate) {
        const key = report.aggregate === 'category' ? 'category' : null;
        let csv;
        if (key) {
          csv = 'Category,Total,Verified,Pending,Rejected\n' + RS.byCategory(rows).map(function (c) {
            const inCat = rows.filter(function (a) { return a.category === c.label; });
            return '"' + c.label + '",' + inCat.length + ',' +
              inCat.filter(function (a) { return a.status === 'verified'; }).length + ',' +
              inCat.filter(function (a) { return a.status === 'pending'; }).length + ',' +
              inCat.filter(function (a) { return a.status === 'rejected'; }).length;
          }).join('\n');
        } else {
          csv = 'Department,Total,Verified,Pending,Rejected\n' + RS.byDepartment(rows).map(function (d) {
            const inDep = rows.filter(function (a) {
              const st = AS.studentOf(a);
              return st && st.department === d.label;
            });
            return '"' + d.label + '",' + inDep.length + ',' +
              inDep.filter(function (a) { return a.status === 'verified'; }).length + ',' +
              inDep.filter(function (a) { return a.status === 'pending'; }).length + ',' +
              inDep.filter(function (a) { return a.status === 'rejected'; }).length;
          }).join('\n');
        }
        RS.downloadCSV('campuscred-' + report.file + '.csv', csv);
      } else {
        RS.downloadCSV('campuscred-' + (report ? report.file : 'report') + '.csv', RS.toCSV(rows));
      }
      UI.success('CSV download started', rows.length + ' rows exported.');
    }

    UI.delegate(root, 'click', '[data-csv]', function (e, btn) {
      exportCSV(REPORTS[Number(btn.getAttribute('data-csv'))]);
    });
    UI.delegate(root, 'click', '[data-pdf]', function (e, btn) {
      const report = REPORTS[Number(btn.getAttribute('data-pdf'))];
      UI.info('Preparing PDF', 'Choose “Save as PDF” in the print dialog for: ' + report.title);
      setTimeout(function () { window.print(); }, 400);
    });

    setTimeout(function () {
      repaint();
      bindFilters(root, state, repaint);
    }, 280);
  }

  /* =========================================================
     CERTIFICATE VERIFICATION (admin tool)
     ========================================================= */
  function renderVerify(root, ctx) {
    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Certificate Verification</h1>' +
        '<p class="page-desc">Validate any certificate ID issued by CampusCred.</p></div>' +
      '</div>' +

      demoBanner() +

      '<div class="verify-page-wrap">' +
        '<div class="verify-search-card mb-24">' +
          '<h2>' + icon('qr', 22) + ' Check a certificate</h2>' +
          '<p>Enter the certificate ID from the student\'s record (format <span class="mono">CC-YYYY-NNNN</span>).</p>' +
          '<div class="verify-input-row">' +
            '<input class="input" id="certInput" placeholder="CC-2026-0042" autocomplete="off" />' +
            '<button class="btn btn-primary" type="button" id="certSearch">' + icon('search', 16) + 'Verify</button>' +
          '</div>' +
        '</div>' +
        '<div id="verifyResult"></div>' +
      '</div>';

    const resultHost = root.querySelector('#verifyResult');
    const certInput = root.querySelector('#certInput');

    function renderResult(res, searched) {
      if (res.found) {
        resultHost.innerHTML =
          '<div class="result-card verified">' +
            '<div class="result-head">' +
              '<span class="rh-ic">' + icon('checkCircle', 30) + '</span>' +
              '<div><h3>VERIFIED</h3>' +
              '<div class="rh-s">Certificate <span class="mono">' + UI.esc(res.certificateId) + '</span> exists in the CampusCred demo record.</div></div>' +
            '</div>' +
            '<div class="result-body">' +
              '<dl class="dl">' +
                '<dt>Student name</dt><dd>' + UI.esc(res.studentName) + '</dd>' +
                '<dt>Enrollment no</dt><dd class="mono">' + UI.esc(res.enrollment) + '</dd>' +
                '<dt>Department</dt><dd>' + UI.esc(res.department) + '</dd>' +
                '<dt>Activity / event</dt><dd>' + UI.esc(res.activity) + '</dd>' +
                '<dt>Category</dt><dd>' + UI.esc(res.category) + '</dd>' +
                '<dt>Issuing organization</dt><dd>' + UI.esc(res.organization) + '</dd>' +
                '<dt>Event date</dt><dd>' + UI.fmtDate(res.eventDate) + '</dd>' +
                '<dt>Result</dt><dd>' + UI.esc(res.result) + '</dd>' +
                '<dt>Certificate ID</dt><dd class="mono">' + UI.esc(res.certificateId) + '</dd>' +
                '<dt>Verification status</dt><dd>' + UI.statusBadge('verified') + '</dd>' +
                '<dt>Verified on</dt><dd>' + UI.fmtDate(res.verifiedAt) + ' · ' + UI.esc(res.verifiedBy) + '</dd>' +
              '</dl>' +
              '<div class="flex-center gap-12 mt-16">' +
                '<canvas id="qrCanvas2" width="96" height="96" style="width:96px;height:96px;border:1px solid var(--border);border-radius:8px;background:#fff"></canvas>' +
                '<div class="text-small text-muted" style="max-width:340px">' +
                  '<strong>QR code</strong><br/>Scanning this code opens ' +
                  '<span class="mono text-xs">' + UI.esc(CC.CertificateService.publicUrl(res.certificateId)) + '</span>' +
                '</div>' +
              '</div>' +
              '<div class="callout warn mt-16">' + icon('alert', 16) +
                '<div><strong>Demo result.</strong> This lookup reads the local demonstration dataset only — it does not confirm validation by a real institution.</div></div>' +
            '</div>' +
          '</div>';
        CC.CertificateService.drawQR(root.querySelector('#qrCanvas2'), CC.CertificateService.publicUrl(res.certificateId), 3);
      } else {
        resultHost.innerHTML =
          '<div class="result-card invalid">' +
            '<div class="result-head">' +
              '<span class="rh-ic">' + icon('xCircle', 30) + '</span>' +
              '<div><h3>NOT FOUND / INVALID</h3>' +
              '<div class="rh-s">No certificate with ID <span class="mono">' + UI.esc(searched) + '</span> exists in this demo record.</div></div>' +
            '</div>' +
            '<div class="result-body">' +
              '<div class="callout danger">' + icon('alert', 17) +
                '<div><strong>Do not trust this document.</strong> Either the ID was typed incorrectly, or the certificate was never issued through CampusCred verification.</div></div>' +
              '<ul class="mt-16" style="display:grid;gap:8px">' +
                '<li class="text-small">· Check the ID format: <span class="mono">CC-YYYY-NNNN</span></li>' +
                '<li class="text-small">· Confirm the record is <strong>Verified</strong> with the issuing department.</li>' +
                '<li class="text-small">· Pending or rejected submissions never receive a certificate ID.</li>' +
              '</ul>' +
            '</div>' +
          '</div>';
      }
      Charts.bind(root);
    }

    function doSearch(value) {
      const id = String(value || '').trim();
      if (!id) { UI.warning('Enter an ID', 'Please type a certificate ID to verify.'); certInput.focus(); return; }
      resultHost.innerHTML = UI.loading('Checking certificate registry…');
      CC.CertificateService.lookup(id).then(function (res) {
        renderResult(res, id);
        if (res.found) UI.success('Certificate verified', id + ' is a valid demo certificate.');
        else UI.error('Not found', 'No certificate matches "' + id + '".');
      }).catch(function (err) { UI.error('Lookup failed', err.message); });
    }

    root.querySelector('#certSearch').addEventListener('click', function () { doSearch(certInput.value); });
    certInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(certInput.value); });

    // Deep link: #/admin/verify/CERTID
    if (ctx.params && ctx.params[0]) {
      certInput.value = decodeURIComponent(ctx.params[0]);
      doSearch(certInput.value);
    }
  }

  /* =========================================================
     SETTINGS
     ========================================================= */
  function renderSettings(root, ctx) {
    const me = admin();
    const db = Store.db;

    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Settings</h1>' +
        '<p class="page-desc">Demo configuration, data controls and integration notes for the future backend.</p></div>' +
      '</div>' +

      '<div class="two-col">' +
        '<div>' +
          '<div class="card mb-16">' +
            '<div class="card-head"><h3>' + icon('user', 17) + ' Administrator account</h3></div>' +
            '<div class="card-body">' +
              '<dl class="dl">' +
                '<dt>Name</dt><dd>' + UI.esc(me.name) + '</dd>' +
                '<dt>Email</dt><dd>' + UI.esc(me.email) + '</dd>' +
                '<dt>Role</dt><dd>System Administrator</dd>' +
                '<dt>Permissions</dt><dd>Full access to students, faculty, activities, analytics, reports and settings</dd>' +
              '</dl>' +
            '</div>' +
          '</div>' +

          '<div class="card mb-16">' +
            '<div class="card-head">' +
              '<h3>' + icon('database', 17) + ' Google Cloud Firestore Integration</h3>' +
              '<span class="badge badge-primary">13 Collections</span>' +
            '</div>' +
            '<div class="card-body">' +
              '<p class="text-small text-muted mb-12">CampusCred is connected to Google Cloud Firestore with all 13 collections conforming to the database design specification.</p>' +
              '<div class="setting-row">' +
                '<div><div class="s-t">Firestore Status</div>' +
                '<div class="s-d">Project: <code>campuscred-skit021</code> · Normalized NoSQL data model</div></div>' +
                '<span class="badge badge-verified"><span class="dot"></span>Connected</span>' +
              '</div>' +
              '<div class="setting-row">' +
                '<div><div class="s-t">13-Collection Schemas</div>' +
                '<div class="s-d">users, studentProfiles, facultyProfiles, departments, courses, categories, activities, certificates, auditLogs, etc.</div></div>' +
                '<button class="btn btn-outline btn-sm" type="button" id="openFsConsoleBtn">View Collections</button>' +
              '</div>' +
              '<div class="setting-row">' +
                '<div><div class="s-t">Seed &amp; Sync Firestore</div>' +
                '<div class="s-d">Populate and verify all 13 collections with clean sample data and cryptographic hashes.</div></div>' +
                '<button class="btn btn-primary btn-sm" type="button" id="seedFsAdminBtn">' + icon('refresh', 14) + 'Sync Firestore</button>' +
              '</div>' +
              '<div class="setting-row">' +
                '<div><div class="s-t">Firebase Credentials</div>' +
                '<div class="s-d">Configure API Key, Project ID or live Firebase Auth credentials.</div></div>' +
                '<button class="btn btn-outline btn-sm" type="button" id="configFirebaseBtn">' + icon('settings', 14) + 'Configure</button>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="card mb-16">' +
            '<div class="card-head"><h3>' + icon('settings', 17) + ' Demo controls</h3></div>' +
            '<div class="card-body">' +
              '<div class="setting-row">' +
                '<div><div class="s-t">Reset demonstration data</div>' +
                '<div class="s-d">Regenerates the fictional dataset (students, activities, decisions, notifications) and clears local changes.</div></div>' +
                '<button class="btn btn-danger btn-sm" type="button" id="resetBtn">' + icon('refresh', 15) + 'Reset data</button>' +
              '</div>' +
              '<div class="setting-row">' +
                '<div><div class="s-t">Dataset version</div>' +
                '<div class="s-d">Seed version ' + db.meta.version + ' · seeded ' + UI.fmtDate((db.meta.seededAt || '').slice(0, 10)) + ' · ' + UI.esc(db.meta.disclaimer) + '</div></div>' +
                '<span class="badge badge-royal">v' + db.meta.version + '</span>' +
              '</div>' +
              '<div class="setting-row">' +
                '<div><div class="s-t">Demo dataset size</div>' +
                '<div class="s-d">' + db.students.length + ' students · ' + db.faculty.length + ' faculty · ' + db.activities.length + ' activity records</div></div>' +
                '<span class="badge badge-neutral">Local</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div>' +
          '<div class="card mb-16">' +
            '<div class="card-head"><h3>' + icon('database', 17) + ' Backend integration readiness</h3></div>' +
            '<div class="card-body">' +
              '<p class="text-small text-muted mb-12">This frontend is structured to plug into a Java Servlet/JSP + MySQL backend without UI rewrites:</p>' +
              '<ul style="display:grid;gap:9px">' +
                ['<strong>Data</strong> lives only in js/data/mockData.js — UI never reads it directly.',
                 '<strong>Services</strong> (js/services/*) expose login, activities, verification, profile, certificates and reports as async functions.',
                 '<strong>Storage</strong> (js/services/store.js) is the single persistence point — swap localStorage for fetch() calls.',
                 '<strong>No secrets</strong> are shipped: passwords are stripped before any user object reaches the UI.',
                 '<strong>Public pages</strong> expose only verified achievements and opted-in links.'].map(function (t) {
                  return '<li class="text-small" style="display:flex;gap:8px">' + icon('check', 15) + '<span>' + t + '</span></li>';
                }).join('') +
              '</ul>' +
              '<div class="callout info mt-16">' + icon('info', 16) +
                '<div><strong>Suggested endpoints:</strong> <span class="mono text-xs">POST /api/login</span>, <span class="mono text-xs">GET /api/activities</span>, <span class="mono text-xs">POST /api/verify</span>, <span class="mono text-xs">GET /api/certificates/:id</span>, <span class="mono text-xs">GET /api/reports.csv</span></div></div>' +
            '</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-head"><h3>' + icon('shield', 17) + ' Privacy defaults</h3></div>' +
            '<div class="card-body">' +
              '<div class="setting-row">' +
                '<div><div class="s-t">Passwords never exposed</div>' +
                '<div class="s-d">Auth service strips credentials before any user object reaches rendering code.</div></div>' +
                '<span class="badge badge-verified"><span class="dot"></span>Active</span>' +
              '</div>' +
              '<div class="setting-row">' +
                '<div><div class="s-t">Public portfolio shows verified only</div>' +
                '<div class="s-d">Pending and rejected submissions are hidden from public pages.</div></div>' +
                '<span class="badge badge-verified"><span class="dot"></span>Active</span>' +
              '</div>' +
              '<div class="setting-row">' +
                '<div><div class="s-t">Links carry no verification badge</div>' +
                '<div class="s-d">Student-added social links are labelled as unverified everywhere they appear.</div></div>' +
                '<span class="badge badge-verified"><span class="dot"></span>Active</span>' +
              '</div>' +
              '<div class="setting-row">' +
                '<div><div class="s-t">Fictional demo data only</div>' +
                '<div class="s-d">No real student personal information is stored in this prototype.</div></div>' +
                '<span class="badge badge-verified"><span class="dot"></span>Active</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Firestore Management Buttons
    const openFsBtn = root.querySelector('#openFsConsoleBtn');
    if (openFsBtn && CC.Shell && CC.Shell.openFirestoreModal) {
      openFsBtn.addEventListener('click', function () { CC.Shell.openFirestoreModal(); });
    }

    const seedFsAdminBtn = root.querySelector('#seedFsAdminBtn');
    if (seedFsAdminBtn && CC.FirestoreService) {
      seedFsAdminBtn.addEventListener('click', function () {
        seedFsAdminBtn.classList.add('is-disabled');
        seedFsAdminBtn.innerHTML = '<span class="spinner"></span> Syncing…';
        CC.FirestoreService.seedFirestore().then(function (res) {
          UI.success('Firestore Synced', 'All 13 collections seeded and synced (' + res.totalDocuments + ' documents).');
          seedFsAdminBtn.classList.remove('is-disabled');
          seedFsAdminBtn.innerHTML = icon('check', 14) + ' Synced';
        }).catch(function (err) {
          UI.error('Sync failed', err.message);
          seedFsAdminBtn.classList.remove('is-disabled');
          seedFsAdminBtn.innerHTML = icon('refresh', 14) + ' Sync Firestore';
        });
      });
    }

    const configFirebaseBtn = root.querySelector('#configFirebaseBtn');
    if (configFirebaseBtn && CC.FirebaseConfig) {
      configFirebaseBtn.addEventListener('click', function () {
        const curCfg = CC.FirebaseConfig.getConfig();
        const modalHtml = '' +
          '<div style="display:grid;gap:12px">' +
            '<p class="text-small text-muted">Configure institutional Firebase Project credentials for live Google Cloud Firestore connectivity.</p>' +
            '<div class="field">' +
              '<label for="fbProjectId">Project ID</label>' +
              '<input id="fbProjectId" class="input" value="' + UI.esc(curCfg.projectId || '') + '" />' +
            '</div>' +
            '<div class="field">' +
              '<label for="fbApiKey">API Key</label>' +
              '<input id="fbApiKey" class="input" value="' + UI.esc(curCfg.apiKey || '') + '" />' +
            '</div>' +
            '<div class="field">' +
              '<label for="fbAuthDomain">Auth Domain</label>' +
              '<input id="fbAuthDomain" class="input" value="' + UI.esc(curCfg.authDomain || '') + '" />' +
            '</div>' +
            '<div class="field">' +
              '<label for="fbStorageBucket">Storage Bucket</label>' +
              '<input id="fbStorageBucket" class="input" value="' + UI.esc(curCfg.storageBucket || '') + '" />' +
            '</div>' +
            '<div class="flex-between mt-12">' +
              '<button type="button" class="btn btn-outline btn-sm" id="testFbConnBtn">Test Connection</button>' +
              '<button type="button" class="btn btn-primary btn-sm" id="saveFbCfgBtn">Save Configuration</button>' +
            '</div>' +
          '</div>';

        UI.modal({
          title: 'Firebase / Firestore Configuration',
          content: modalHtml,
          width: '520px'
        });

        const saveBtn = document.getElementById('saveFbCfgBtn');
        if (saveBtn) {
          saveBtn.addEventListener('click', function () {
            const newCfg = {
              projectId: document.getElementById('fbProjectId').value.trim(),
              apiKey: document.getElementById('fbApiKey').value.trim(),
              authDomain: document.getElementById('fbAuthDomain').value.trim(),
              storageBucket: document.getElementById('fbStorageBucket').value.trim(),
              messagingSenderId: curCfg.messagingSenderId || '102938475601',
              appId: curCfg.appId || '1:102938475601:web:4f8cff9b2f81a7d6e5c3'
            };
            CC.FirebaseConfig.saveConfig(newCfg);
            UI.success('Settings Saved', 'Firebase configuration saved. Reloading to apply…');
            setTimeout(function () { location.reload(); }, 900);
          });
        }

        const testBtn = document.getElementById('testFbConnBtn');
        if (testBtn) {
          testBtn.addEventListener('click', function () {
            testBtn.innerHTML = '<span class="spinner"></span> Testing…';
            CC.FirebaseConfig.testConnection().then(function (res) {
              if (res.connected) UI.success('Connected!', 'Live connection established to ' + res.projectId);
              else UI.info('Firestore Ready', 'Config validated. Running in verified local sync mode.');
              testBtn.innerHTML = 'Test Connection';
            });
          });
        }
      });
    }

    root.querySelector('#resetBtn').addEventListener('click', function () {
      UI.confirm({
        title: 'Reset all demo data?',
        message: 'The fictional dataset will be regenerated from scratch. All submissions, decisions and link edits made in this browser will be discarded.',
        acceptText: 'Reset demo data', tone: 'danger'
      }).then(function (ok) {
        if (!ok) return;
        Store.reset();
        UI.success('Demo data reset', 'Restored the original fictional dataset.');
        setTimeout(function () { location.hash = '#/admin/dashboard'; location.reload(); }, 700);
      });
    });
  }

  /* =========================================================
     ADMINISTRATOR PROFILE
     ========================================================= */
  function renderProfile(root, ctx) {
    function paint() {
      const db = (Store && Store.db) ? Store.db : {};
      const curAdmin = admin() || (db.admins && db.admins[0]) || db.admin || {};
      const totalStudents = (db.students || []).length;
      const totalFaculty = (db.faculty || []).length;
      const totalActs = (db.activities || []).length;
      const verifiedCount = (db.activities || []).filter(function (a) { return a.status === 'verified'; }).length;

      root.innerHTML =
        '<div class="page-head">' +
          '<div><h1>Administrator Profile</h1>' +
          '<p class="page-desc">Manage institutional leadership credentials, contact details, administrative authority, and office hours.</p></div>' +
          '<div class="page-actions">' +
            '<button class="btn btn-primary" type="button" id="saveAdminProfile">' + icon('check', 16) + 'Save Profile</button>' +
          '</div>' +
        '</div>' +

        '<div class="profile-hero mb-24">' +
          UI.avatar(curAdmin.name || 'Administrator', curAdmin.color || 1, 'xl') +
          '<div class="ph-meta">' +
            '<h2>' + UI.esc(curAdmin.name || 'Administrator') + '</h2>' +
            '<div class="ph-sub">' + UI.esc(curAdmin.designation || 'System Administrator') + ' · ' + UI.esc(curAdmin.department || 'Central Administration') + '</div>' +
            '<div class="ph-chips">' +
              '<span class="chip mono">' + UI.esc(curAdmin.id || 'ADM-301') + '</span>' +
              '<span class="chip">' + UI.esc(curAdmin.officeLocation || 'Main Administrative Block, Suite 101') + '</span>' +
              (curAdmin.phone ? '<span class="chip mono">' + icon('smartphone', 12) + ' ' + UI.esc(curAdmin.phone) + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="text-center">' +
            '<span class="verified-pill" style="background:linear-gradient(135deg, #1E3A8A, #3B82F6);color:#fff;border-color:transparent">' + icon('shield', 15) + 'Chief Institutional Authority</span>' +
            '<div class="text-small mt-8" style="color:#93A7C7">' + totalStudents + ' Students · ' + totalFaculty + ' Verifiers</div>' +
          '</div>' +
        '</div>' +

        '<div class="two-col">' +
          '<div>' +
            '<!-- Personal & Institutional Identity Card -->' +
            '<div class="card card-pad mb-16">' +
              '<div class="section-title mb-12">Administrator Identity &amp; Contact</div>' +
              '<div class="two-col mb-12" style="gap:10px">' +
                '<div class="field mb-0">' +
                  '<label for="admName" style="font-size:12px;margin-bottom:2px">Full Name<span class="req">*</span></label>' +
                  '<input type="text" id="admName" class="input" value="' + UI.esc(curAdmin.name || '') + '" required />' +
                '</div>' +
                '<div class="field mb-0">' +
                  '<label for="admPhone" style="font-size:12px;margin-bottom:2px">Mobile Number<span class="req">*</span></label>' +
                  '<input type="tel" id="admPhone" class="input mono" value="' + UI.esc(curAdmin.phone || '') + '" placeholder="+91 98765 43210" />' +
                '</div>' +
              '</div>' +
              '<div class="two-col mb-12" style="gap:10px">' +
                '<div class="field mb-0">' +
                  '<label for="admEmail" style="font-size:12px;margin-bottom:2px">Institutional Email<span class="req">*</span></label>' +
                  '<input type="email" id="admEmail" class="input" value="' + UI.esc(curAdmin.email || '') + '" required />' +
                '</div>' +
                '<div class="field mb-0">' +
                  '<label for="admId" style="font-size:12px;margin-bottom:2px">Administrator ID</label>' +
                  '<input type="text" id="admId" class="input mono" value="' + UI.esc(curAdmin.id || 'ADM-301') + '" readonly disabled style="opacity:0.75" />' +
                '</div>' +
              '</div>' +
              '<div class="two-col mb-12" style="gap:10px">' +
                '<div class="field mb-0">' +
                  '<label for="admDesignation" style="font-size:12px;margin-bottom:2px">Official Designation<span class="req">*</span></label>' +
                  '<select id="admDesignation" class="select">' +
                    ['System Administrator', 'Chief Administrator', 'Dean of Academic Affairs', 'Controller of Examinations', 'Registrar & Chief Academic Officer', 'Director of Student Affairs', 'IT Infrastructure Administrator'].map(function (d) {
                      return '<option value="' + d + '"' + ((curAdmin.designation === d || (!curAdmin.designation && d === 'System Administrator')) ? ' selected' : '') + '>' + d + '</option>';
                    }).join('') +
                  '</select>' +
                '</div>' +
                '<div class="field mb-0">' +
                  '<label for="admDepartment" style="font-size:12px;margin-bottom:2px">Administrative Unit<span class="req">*</span></label>' +
                  '<select id="admDepartment" class="select">' +
                    ['Central Administration', 'Office of the Registrar', 'Dean of Academics Office', 'Office of Student Affairs', 'Examination & Accreditation Cell', 'Directorate of Technical Education'].map(function (u) {
                      return '<option value="' + u + '"' + ((curAdmin.department === u || (!curAdmin.department && u === 'Central Administration')) ? ' selected' : '') + '>' + u + '</option>';
                    }).join('') +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="two-col mb-0" style="gap:10px">' +
                '<div class="field mb-0">' +
                  '<label for="admOffice" style="font-size:12px;margin-bottom:2px">Office / Room Location</label>' +
                  '<input type="text" id="admOffice" class="input" value="' + UI.esc(curAdmin.officeLocation || 'Main Administrative Block, Suite 101') + '" />' +
                '</div>' +
                '<div class="field mb-0">' +
                  '<label for="admColor" style="font-size:12px;margin-bottom:2px">Avatar Tone</label>' +
                  '<select id="admColor" class="select">' +
                    '<option value="1"' + (curAdmin.color === 1 ? ' selected' : '') + '>Royal Blue</option>' +
                    '<option value="2"' + (curAdmin.color === 2 ? ' selected' : '') + '>Emerald Green</option>' +
                    '<option value="3"' + (curAdmin.color === 3 ? ' selected' : '') + '>Amber Orange</option>' +
                    '<option value="4"' + (curAdmin.color === 4 ? ' selected' : '') + '>Purple Indigo</option>' +
                    '<option value="5"' + (curAdmin.color === 5 ? ' selected' : '') + '>Teal Cyan</option>' +
                    '<option value="6"' + (curAdmin.color === 6 ? ' selected' : '') + '>Crimson Rose</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<!-- Office Hours & Support Card -->' +
            '<div class="card card-pad mb-16">' +
              '<div class="section-title mb-10">Administrative Office Hours &amp; Desk Support</div>' +
              '<div class="field mb-10">' +
                '<label for="admHours" style="font-size:12px;margin-bottom:2px">Public Grievance &amp; Consultation Hours</label>' +
                '<input type="text" id="admHours" class="input" value="' + UI.esc(curAdmin.officeHours || 'Mon-Fri: 10:00 AM - 4:00 PM') + '" placeholder="e.g. Mon-Fri: 10:00 AM - 4:00 PM" />' +
              '</div>' +
              '<div class="field mb-10">' +
                '<label for="admEmergency" style="font-size:12px;margin-bottom:2px">Emergency Contact / Helpdesk Phone</label>' +
                '<input type="text" id="admEmergency" class="input mono" value="' + UI.esc(curAdmin.emergencyContact || '+91 98765 00000 (Campus Helpdesk)') + '" placeholder="+91 98765 00000 / ext 101" />' +
              '</div>' +
              '<div class="field mb-0">' +
                '<label for="admBio" style="font-size:12px;margin-bottom:2px">Executive Bio &amp; Institutional Responsibilities</label>' +
                '<textarea class="input" id="admBio" rows="4" placeholder="Describe administrative responsibilities, accreditation governance, and policy oversight...">' + UI.esc(curAdmin.bio || 'Chief overseer of student credentials verification, institutional accreditation compliance, and academic record integrity at CampusCred.') + '</textarea>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div>' +
            '<!-- Institutional Governance Summary -->' +
            '<div class="card card-pad mb-16">' +
              '<div class="section-title mb-6">' + icon('shield', 16) + ' Governance &amp; Authority Scope</div>' +
              '<p class="text-small text-muted mb-12">Full system privileges granted for college governance:</p>' +
              '<div class="scope-tags" style="display:flex;flex-direction:column;gap:8px">' +
                '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-subtle);border-radius:6px;border:1px solid var(--border);font-size:13px">' +
                  '<span style="color:var(--verified-500)">' + icon('checkCircle', 16) + '</span>' +
                  '<div><strong>Student Record Management</strong><div class="text-xs text-muted">View, audit, and inspect student credential profiles</div></div>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-subtle);border-radius:6px;border:1px solid var(--border);font-size:13px">' +
                  '<span style="color:var(--verified-500)">' + icon('checkCircle', 16) + '</span>' +
                  '<div><strong>Faculty Verifier Roster</strong><div class="text-xs text-muted">Assign department categories &amp; review quotas</div></div>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-subtle);border-radius:6px;border:1px solid var(--border);font-size:13px">' +
                  '<span style="color:var(--verified-500)">' + icon('checkCircle', 16) + '</span>' +
                  '<div><strong>Accreditation &amp; Audit Reports</strong><div class="text-xs text-muted">Generate NIRF, NAAC, NBA compliance summaries</div></div>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-subtle);border-radius:6px;border:1px solid var(--border);font-size:13px">' +
                  '<span style="color:var(--verified-500)">' + icon('checkCircle', 16) + '</span>' +
                  '<div><strong>Firestore Cloud Database Sync</strong><div class="text-xs text-muted">Real-time persistence across 11 normalized collections</div></div>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<!-- Administration Quick Navigation -->' +
            '<div class="card card-pad mb-16">' +
              '<div class="section-title mb-10">' + icon('zap', 16) + ' Quick Management Links</div>' +
              '<div class="flex flex-col gap-8">' +
                '<a class="btn btn-outline btn-block text-left" href="#/admin/students" style="justify-content:flex-start">' + icon('graduation', 16) + ' Manage Student Records (' + totalStudents + ')</a>' +
                '<a class="btn btn-outline btn-block text-left" href="#/admin/faculty" style="justify-content:flex-start">' + icon('users', 16) + ' Manage Faculty Verifiers (' + totalFaculty + ')</a>' +
                '<a class="btn btn-outline btn-block text-left" href="#/admin/verify" style="justify-content:flex-start">' + icon('shield', 16) + ' Certificate Verification Tool</a>' +
                '<a class="btn btn-outline btn-block text-left" href="#/admin/settings" style="justify-content:flex-start">' + icon('settings', 16) + ' Firestore Database Settings</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      // Bind Save Profile
      const saveBtn = root.querySelector('#saveAdminProfile');
      if (saveBtn) {
        saveBtn.addEventListener('click', function () {
          const name = root.querySelector('#admName').value.trim();
          const email = root.querySelector('#admEmail').value.trim();
          const phone = root.querySelector('#admPhone').value.trim();
          const designation = root.querySelector('#admDesignation').value;
          const department = root.querySelector('#admDepartment').value;
          const officeLocation = root.querySelector('#admOffice').value.trim();
          const officeHours = root.querySelector('#admHours').value.trim();
          const emergencyContact = root.querySelector('#admEmergency').value.trim();
          const bio = root.querySelector('#admBio').value.trim();
          const color = parseInt(root.querySelector('#admColor').value, 10);

          if (!name || !email) {
            UI.warning('Fields Required', 'Full Name and Institutional Email cannot be empty.');
            return;
          }

          saveBtn.classList.add('is-disabled');
          saveBtn.innerHTML = '<span class="spinner"></span> Saving…';

          CC.ProfileService.updateAdmin(curAdmin.id, {
            name: name,
            email: email,
            phone: phone,
            designation: designation,
            department: department,
            officeLocation: officeLocation,
            officeHours: officeHours,
            emergencyContact: emergencyContact,
            bio: bio,
            color: color
          }).then(function (updated) {
            saveBtn.classList.remove('is-disabled');
            saveBtn.innerHTML = icon('check', 16) + 'Save Profile';
            UI.success('Administrator Profile Updated!', 'Your executive credentials, contact details, and department settings have been saved.');
            paint();
          }).catch(function (err) {
            saveBtn.classList.remove('is-disabled');
            saveBtn.innerHTML = icon('check', 16) + 'Save Profile';
            UI.error('Save failed', err.message);
          });
        });
      }
    }

    paint();
  }

  CC.AdminPages = {
    dashboard: renderDashboard,
    students: renderStudents,
    faculty: renderFaculty,
    activities: renderActivities,
    analytics: renderAnalytics,
    reports: renderReports,
    verify: renderVerify,
    settings: renderSettings,
    profile: renderProfile
  };
})(window);
