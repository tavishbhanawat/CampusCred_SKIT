/* ============================================================
   CampusCred — js/pages/faculty.js
   Faculty / Verifier area: Dashboard, Pending Verification,
   Reviewed Submissions, Verification History, Profile.
   ============================================================ */
(function (global) {
  'use strict';
  const CC = global.CC;
  const icon = CC.icon, UI = CC.UI, Charts = CC.Charts;

  const AS = CC.ActivityService;
  const VS = CC.VerificationService;
  const Store = CC.Store;
  const Mock = global.MockData;

  function faculty() { return CC.AuthService.currentUser(); }

  function statCard(ic, tone, value, label, foot) {
    return '<div class="stat-card">' +
      '<span class="stat-icon ' + tone + '">' + icon(ic, 21) + '</span>' +
      '<div><div class="stat-value">' + value + '</div><div class="stat-label">' + UI.esc(label) + '</div>' +
      '<div class="stat-foot">' + UI.esc(foot) + '</div></div>' +
    '</div>';
  }

  /* Shared pending table renderer.
     opts: { rows, showStudent, onView } */
  function pendingTable(rows, opts) {
    return UI.table([
      {
        key: 'student', label: 'Student', render: function (a) {
          const st = AS.studentOf(a) || {};
          return '<div class="flex-center gap-8">' + UI.avatar(st.name, st.color, 'sm') +
            '<div><div class="cell-main">' + UI.esc(st.name || '—') + '</div>' +
            '<div class="cell-sub mono">' + UI.esc(st.enrollment || '') + '</div></div></div>';
        }
      },
      {
        key: 'name', label: 'Activity', render: function (a) {
          return '<div class="cell-main">' + UI.esc(a.name) + '</div><div class="cell-sub">' + UI.esc(a.role) + ' · ' + UI.esc(a.result) + '</div>';
        }
      },
      { key: 'category', label: 'Category', render: function (a) { return UI.categoryBadge(a.category); } },
      {
        key: 'submittedAt', label: 'Submitted', render: function (a) {
          return UI.fmtDate(a.submittedAt) + '<div class="cell-sub">' + UI.timeAgo(a.submittedAt) + '</div>';
        }
      },
      { key: 'status', label: 'Status', render: function (a) { return UI.statusBadge(a.status); } },
      {
        key: '_a', label: 'Action', className: 'actions-cell', render: function (a) {
          return '<button class="btn btn-sm btn-primary" type="button" data-review="' + a.id + '">' + icon('eye', 14) + 'Review</button>';
        }
      }
    ], rows, {
      empty: {
        icon: 'checkCircle',
        title: opts.emptyTitle || 'Queue is clear',
        message: opts.emptyMessage || 'No pending submissions match your department and categories right now.'
      }
    });
  }

  function filterBar(opts) {
    opts = opts || {};
    const Mock = global.MockData;
    return '<div class="filter-bar">' +
      '<div class="search-field">' + icon('search', 15) +
        '<input class="input" type="search" placeholder="' + UI.esc(opts.placeholder || 'Search student, enrollment, activity…') + '" data-filter="search" />' +
      '</div>' +
      '<select class="select" data-filter="category">' +
        '<option value="all">All categories</option>' +
        Mock.CATEGORIES.map(function (c) { return '<option value="' + UI.esc(c) + '">' + UI.esc(c) + '</option>'; }).join('') +
      '</select>' +
      (opts.department !== false ?
        '<select class="select" data-filter="department"><option value="all">All departments</option>' +
        Mock.DEPARTMENTS.map(function (d) { return '<option value="' + UI.esc(d) + '">' + UI.esc(d) + '</option>'; }).join('') +
        '</select>' : '') +
      '<select class="select" data-filter="status">' +
        '<option value="all">All status</option><option value="pending">Pending</option>' +
        '<option value="verified">Verified</option><option value="rejected">Rejected</option>' +
      '</select>' +
      '<input class="input" type="date" data-filter="from" title="From date" style="width:auto;min-width:140px" />' +
      '<input class="input" type="date" data-filter="to" title="To date" style="width:auto;min-width:140px" />' +
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
      Object.keys(state).forEach(function (k) { state[k] = k === 'search' ? '' : 'all'; });
      root.querySelectorAll('[data-filter]').forEach(function (el) { el.value = el.getAttribute('data-filter') === 'search' ? '' : 'all'; });
      repaint();
      UI.info('Filters cleared', 'Showing all submissions.');
    });
  }

  /* =========================================================
     FACULTY DASHBOARD
     ========================================================= */
  function renderDashboard(root, ctx) {
    const fac = faculty();
    const stats = VS.statsFor(fac);
    const queue = VS.pendingQueue(fac);
    const recent = VS.reviewedBy(fac).slice(0, 6);
    const allMine = Store.db.activities.filter(function (a) { return a.reviewerId === fac.id; });

    const byCat = global.MockData.CATEGORIES.map(function (c) {
      return { label: c, value: allMine.filter(function (a) { return a.category === c; }).length };
    });

    const pendingStudents = CC.AuthService.getPendingStudentRegistrations ? CC.AuthService.getPendingStudentRegistrations() : [];

    root.innerHTML =
      '<div class="welcome-banner">' +
        '<div class="wb-profile">' + UI.avatar(fac.name, fac.color, 'lg') +
          '<div class="wb-meta">' +
            '<div class="n">Welcome, ' + UI.esc(fac.name) + '</div>' +
            '<div class="m">' + UI.esc(fac.designation) + ' · ' + UI.esc(fac.department) + ' · ' + UI.esc(fac.employeeId) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="flex-center" style="gap:10px">' +
          (pendingStudents.length ? '<a class="btn btn-warning" href="#/faculty/students" style="background:#D97706;border-color:#D97706">' + icon('graduation', 16) + 'Verify Students (' + pendingStudents.length + ')</a>' : '') +
          '<a class="btn btn-primary" href="#/faculty/pending">' + icon('inbox', 16) + 'Activity queue (' + queue.length + ')</a>' +
        '</div>' +
      '</div>' +

      (pendingStudents.length ?
        '<div class="callout warn mb-20" style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-radius:10px;background:rgba(245,158,11,0.08);border:1.5px solid #F59E0B">' +
          '<div class="flex" style="align-items:center;gap:12px">' +
            '<span style="color:#D97706;font-size:24px">' + icon('graduation', 24) + '</span>' +
            '<div>' +
              '<div style="font-weight:700;font-size:14px;color:#92400E">Action Required: ' + pendingStudents.length + ' Student Registration' + (pendingStudents.length > 1 ? 's' : '') + ' Awaiting Identity Verification</div>' +
              '<div style="font-size:12.5px;color:#B45309">Under campus policy, student profiles cannot be created or activated before faculty or admin approval.</div>' +
            '</div>' +
          '</div>' +
          '<a class="btn btn-sm btn-primary" href="#/faculty/students" style="background:#D97706;border-color:#D97706;flex:none">' +
            'Review &amp; Approve (' + pendingStudents.length + ') ➔' +
          '</a>' +
        '</div>' : '') +

      '<div class="stat-grid cols-4 mb-24">' +
        statCard('clock', 'tone-amber', stats.pending, 'Pending Activities', 'Awaiting your review') +
        statCard('graduation', 'tone-royal', pendingStudents.length, 'Pending Students', 'New registrations') +
        statCard('checkCircle', 'tone-green', stats.approved, 'Approved Records', 'Verified portfolio items') +
        statCard('list', 'tone-navy', stats.totalReviewed, 'Total Reviews', 'All-time decisions') +
      '</div>' +

      '<div class="two-col">' +
        '<div>' +
          '<div class="section-title">Pending submissions' +
            '<span class="link" data-goto="#/faculty/pending">Open full queue' + icon('arrowRight', 14) + '</span>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card-body tight">' +
              (queue.length ? pendingTable(queue.slice(0, 6), {}) : UI.empty({
                icon: 'checkCircle', title: 'Queue is clear',
                message: 'No pending submissions for your department right now.'
              })) +
            '</div>' +
          '</div>' +

          '<div class="section-title mt-24">Recent decisions</div>' +
          '<div class="card card-pad">' +
            (recent.length ? '<div class="timeline">' + recent.map(function (a) {
              const tone = a.status === 'verified' ? 'tone-green' : 'tone-red';
              const st = AS.studentOf(a) || {};
              return '<div class="timeline-item ' + tone + '">' +
                '<div class="tl-title">' + (a.status === 'verified' ? 'Approved' : 'Rejected') + ' — ' + UI.esc(a.name) + '</div>' +
                '<div class="tl-meta">' + UI.esc(st.name || '—') + ' · ' + UI.fmtDate(a.reviewedAt) + '</div>' +
                '<div class="tl-body">' + UI.esc(a.remarks || '—') + '</div>' +
              '</div>';
            }).join('') + '</div>' : '<div class="text-small text-muted">No decisions yet — your approvals and rejections will be listed here.</div>') +
          '</div>' +
        '</div>' +

        '<div>' +
          '<div class="section-title">Decisions by category</div>' +
          '<div class="chart-card mb-24">' +
            '<div class="chart-head"><div><h4>Your review distribution</h4><div class="sub">Approve / reject volume per category</div></div></div>' +
            '<div class="chart-body">' + Charts.bar({
              data: byCat.map(function (c) {
                return {
                  label: c.label,
                  values: [
                    allMine.filter(function (a) { return a.category === c.label && a.status === 'verified'; }).length,
                    allMine.filter(function (a) { return a.category === c.label && a.status === 'rejected'; }).length
                  ]
                };
              }),
              series: [{ name: 'Approved', color: '#16A34A' }, { name: 'Rejected', color: '#EF4444' }],
              height: 230
            }) + '</div>' +
            Charts.legend([{ label: 'Approved', color: '#16A34A' }, { label: 'Rejected', color: '#EF4444' }]) +
          '</div>' +

          '<div class="callout info">' + icon('shield', 17) +
            '<div><strong>Verification policy:</strong> only approve a submission when the uploaded proof clearly matches the student, event and date. Rejections must always include a reason — students see it immediately.</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    UI.delegate(root, 'click', '[data-review]', function (e, btn) {
      location.hash = '#/faculty/verify/' + btn.getAttribute('data-review');
    });
    UI.delegate(root, 'click', '[data-goto]', function (e, el) { location.hash = el.getAttribute('data-goto'); });

    Charts.bind(root);
  }

  /* =========================================================
     PENDING VERIFICATION
     ========================================================= */
  function renderPending(root, ctx) {
    const fac = faculty();
    const state = { search: '', category: 'all', department: 'all', status: 'all', from: '', to: '' };

    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Pending Verification</h1>' +
        '<p class="page-desc">Review student details, activity information and the uploaded proof side by side. Approve valid submissions; reject invalid ones with a mandatory reason.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-outline" type="button" id="exportBtn">' + icon('download', 16) + 'Export queue</button>' +
        '</div>' +
      '</div>' +

      filterBar({ placeholder: 'Search student, enrollment or activity…' }) +
      '<div class="card"><div id="queueTable">' + UI.loading('Loading submission queue…') + '</div></div>';

    const host = root.querySelector('#queueTable');

    function repaint() {
      // queue (pending, scoped to this faculty) + previously reviewed by this faculty
      let rows = VS.pendingQueue(fac).concat(
        Store.db.activities.filter(function (a) { return a.status !== 'pending' && a.reviewerId === fac.id; })
      );
      if (state.status !== 'all') rows = rows.filter(function (a) { return a.status === state.status; });
      const filtered = AS.query({
        search: state.search, category: state.category, department: state.department,
        status: state.status, from: state.from, to: state.to
      }).filter(function (a) { return rows.indexOf(a) !== -1; });

      const pendingCount = filtered.filter(function (a) { return a.status === 'pending'; }).length;
      host.innerHTML =
        '<div class="pagination" style="border-top:0;border-bottom:1px solid var(--border)">' +
          '<span class="info"><strong>' + pendingCount + '</strong> pending · <strong>' + filtered.length + '</strong> total matching</span>' +
          '<span class="info">Showing records for ' + UI.esc(fac.department) + ' + your assigned categories</span>' +
        '</div>' +
        pendingTable(filtered, {
          emptyTitle: 'Nothing to review',
          emptyMessage: 'No submissions match these filters. Try resetting them.'
        });
    }

    setTimeout(repaint, 260);
    bindFilters(root, state, repaint);

    UI.delegate(root, 'click', '[data-review]', function (e, btn) {
      location.hash = '#/faculty/verify/' + btn.getAttribute('data-review');
    });

    root.querySelector('#exportBtn').addEventListener('click', function () {
      const rows = AS.query({ category: state.category, department: state.department, status: 'pending' });
      if (!rows.length) { UI.warning('Nothing to export', 'The queue is empty for the current filters.'); return; }
      CC.ReportService.downloadCSV('campuscred-pending-queue.csv', CC.ReportService.toCSV(rows));
      UI.success('Export started', 'Pending queue CSV download has begun.');
    });
  }

  /* =========================================================
     VERIFICATION DETAIL (approve / reject)
     ========================================================= */
  function renderVerifyDetail(root, ctx) {
    const fac = faculty();
    const act = AS.byId(ctx.params[0]);

    if (!act) {
      root.innerHTML = UI.empty({
        icon: 'xCircle', title: 'Submission not found',
        message: 'This submission ID does not exist or has been removed.'
      }) + '<div class="text-center mt-16"><a class="btn btn-primary" href="#/faculty/pending">Back to queue</a></div>';
      return;
    }

    const st = AS.studentOf(act) || {};
    const isPending = act.status === 'pending';

    root.innerHTML =
      '<div class="page-head">' +
        '<div><a class="back-link text-small" href="#/faculty/pending" style="display:inline-flex;gap:6px;align-items:center;margin-bottom:8px">' + icon('arrowLeft', 14) + 'Back to queue</a>' +
        '<h1>Verify Submission</h1>' +
        '<p class="page-desc">Submission <span class="mono">' + UI.esc(act.id) + '</span> · received ' + UI.fmtDate(act.submittedAt) + '</p></div>' +
        '<div class="page-actions">' + UI.statusBadge(act.status) + UI.categoryBadge(act.category) + '</div>' +
      '</div>' +

      '<div class="verify-layout">' +
        '<div>' +
          '<div class="card mb-16">' +
            '<div class="card-head"><h3>' + icon('graduation', 17) + ' Student details</h3>' +
              '<a class="text-small" href="#/portfolio/' + st.id + '" target="_blank" rel="noopener">Public portfolio' + icon('externalLink', 13) + '</a></div>' +
            '<div class="card-body">' +
              '<div class="flex-center gap-16 mb-16">' + UI.avatar(st.name, st.color, 'lg') +
                '<div><div style="font-weight:700;font-size:16px">' + UI.esc(st.name) + '</div>' +
                '<div class="text-small text-muted mono">' + UI.esc(st.enrollment) + '</div>' +
                '<div class="text-small text-muted">' + UI.esc(st.course) + ' ' + UI.esc(st.branch) + ' · ' + UI.esc(st.department) + '</div></div>' +
              '</div>' +
              '<dl class="dl">' +
                '<dt>Academic year</dt><dd>' + UI.esc(st.academicYear) + '</dd>' +
                '<dt>Semester</dt><dd>' + UI.esc(st.semester || '—') + '</dd>' +
                '<dt>Verified so far</dt><dd>' + AS.statsFor(st.id).verified + ' achievements</dd>' +
              '</dl>' +
            '</div>' +
          '</div>' +

          '<div class="card mb-16">' +
            '<div class="card-head"><h3>' + icon('fileText', 17) + ' Submitted activity</h3>' +
            '<span class="text-small text-muted">' + UI.timeAgo(act.submittedAt) + '</span></div>' +
            '<div class="card-body">' +
              '<h3 style="font-size:17px;margin-bottom:12px">' + UI.esc(act.name) + '</h3>' +
              '<dl class="dl mb-16">' +
                '<dt>Category</dt><dd>' + UI.esc(act.category) + '</dd>' +
                '<dt>Organization</dt><dd>' + UI.esc(act.organization) + '</dd>' +
                '<dt>Event date</dt><dd>' + UI.fmtDate(act.date) + '</dd>' +
                '<dt>Participation role</dt><dd>' + UI.esc(act.role) + '</dd>' +
                '<dt>Result</dt><dd>' + UI.esc(act.result) + '</dd>' +
                '<dt>Certificate ID</dt><dd>' + (act.certificateId ? '<span class="mono">' + UI.esc(act.certificateId) + '</span>' : '<span class="text-muted">Will be issued on approval</span>') + '</dd>' +
                '<dt>Submission date</dt><dd>' + UI.fmtDate(act.submittedAt) + '</dd>' +
                '<dt>Current status</dt><dd>' + UI.statusBadge(act.status) + '</dd>' +
              '</dl>' +
              '<p class="text-small text-muted">' + UI.esc(act.description || '') + '</p>' +
            '</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-head"><h3>' + icon('history', 17) + ' Previous decisions &amp; history</h3></div>' +
            '<div class="card-body">' +
              '<div class="timeline">' + (act.history || []).slice().reverse().map(function (h) {
                const tone = h.action === 'approved' ? 'tone-green' : h.action === 'rejected' ? 'tone-red' : 'tone-amber';
                const label = h.action === 'submitted' ? 'Submitted for verification' : h.action === 'approved' ? 'Approved' : 'Rejected';
                return '<div class="timeline-item ' + tone + '">' +
                  '<div class="tl-title">' + label + '</div>' +
                  '<div class="tl-meta">' + UI.fmtDate(h.at) + ' · ' + UI.esc(h.by) + '</div>' +
                  '<div class="tl-body">' + UI.esc(h.note) + '</div>' +
                '</div>';
              }).join('') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div>' +
          '<div class="card mb-16">' +
            '<div class="card-head"><h3>' + icon('eye', 17) + ' Certificate / proof preview</h3></div>' +
            '<div class="card-body">' +
              proofPreview(act) +
            '</div>' +
          '</div>' +

          (isPending ?
            '<div class="card">' +
              '<div class="card-head"><h3>' + icon('shield', 17) + ' Your decision</h3></div>' +
              '<div class="card-body">' +
                '<div class="field">' +
                  '<label for="facultyRemark">Remarks <span class="text-muted">(required for rejection, optional for approval)</span></label>' +
                  '<textarea class="input" id="facultyRemark" rows="4" placeholder="e.g. Certificate clearly shows the student name, event and date — verified."></textarea>' +
                  '<div class="error-text" id="remarkError">A rejection reason is mandatory when rejecting.</div>' +
                '</div>' +
                '<div class="decision-bar">' +
                  '<button class="btn btn-success btn-lg" type="button" id="approveBtn">' + icon('checkCircle', 17) + 'Approve</button>' +
                  '<button class="btn btn-danger btn-lg" type="button" id="rejectBtn">' + icon('xCircle', 17) + 'Reject</button>' +
                '</div>' +
                '<div class="callout info mt-16">' + icon('info', 16) +
                  '<div>You will see a confirmation before the decision is applied. The status updates immediately after.</div></div>' +
              '</div>' +
            '</div>'
            :
            '<div class="callout ' + (act.status === 'verified' ? 'success' : 'danger') + '">' +
              icon(act.status === 'verified' ? 'checkCircle' : 'alert', 17) +
              '<div><strong>Already reviewed.</strong> This submission was ' + (act.status === 'verified' ? 'approved' : 'rejected') +
              ' on ' + UI.fmtDate(act.reviewedAt) + '. Decisions cannot be changed in the demo.</div></div>'
          ) +
        '</div>' +
      '</div>';

    /* proof preview renderer */
    function proofPreview(a) {
      const p = a.proof || (a.proofDocument ? {
        fileName: a.proofDocument.fileName,
        fileType: a.proofDocument.contentType,
        fileSize: a.proofDocument.fileSize,
        dataUrl: a.proofDocument.downloadUrl
      } : {});
      let preview = '';
      const isImg = (p.fileType && p.fileType.indexOf('image') !== -1) || (p.dataUrl && p.dataUrl.indexOf('data:image') === 0);
      const isPdf = (p.fileType && p.fileType.indexOf('pdf') !== -1) || (p.dataUrl && p.dataUrl.indexOf('data:application/pdf') === 0);

      if (p.dataUrl && isImg) {
        preview =
          '<div class="cert-image-stage" style="text-align:center;width:100%;background:#0F172A;padding:16px;border-radius:10px;border:1px solid #1E293B;box-shadow:inset 0 2px 4px rgba(0,0,0,0.4);margin-bottom:12px">' +
            '<div style="font-size:11px;color:#94A3B8;margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:4px">' +
              icon('shield', 12) + ' Original Certificate Presentation — Exact Visual Styling &amp; Colors Preserved' +
            '</div>' +
            '<img src="' + p.dataUrl + '" alt="Original certificate document" style="max-width:100%;max-height:480px;object-fit:contain;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.5);background:transparent !important;display:inline-block" />' +
            '<div class="mt-12 flex gap-8" style="justify-content:center;flex-wrap:wrap">' +
              '<a href="' + p.dataUrl + '" download="' + UI.esc(p.fileName || 'certificate') + '" class="btn btn-sm btn-outline" style="background:rgba(255,255,255,0.08);border-color:#334155;color:#F8FAFC">' +
                icon('download', 13) + ' Download Original Certificate' +
              '</a>' +
              '<a href="' + p.dataUrl + '" target="_blank" rel="noopener" class="btn btn-sm btn-primary">' +
                icon('externalLink', 13) + ' Open Full Size Document' +
              '</a>' +
            '</div>' +
          '</div>';
      } else if (p.dataUrl && isPdf) {
        preview =
          '<div class="cert-pdf-stage" style="width:100%;background:#fff;border-radius:8px;overflow:hidden;margin-bottom:12px">' +
            '<object data="' + p.dataUrl + '" type="application/pdf" style="width:100%;height:380px;border:0">' +
              '<iframe src="' + p.dataUrl + '" style="width:100%;height:380px;border:0"></iframe>' +
            '</object>' +
            '<div class="flex-between p-8" style="background:#0F172A;flex-wrap:wrap;gap:8px">' +
              '<span class="text-small" style="color:#94A3B8;display:inline-flex;align-items:center;gap:4px">' +
                icon('fileText', 13) + ' Original PDF Document' +
              '</span>' +
              '<div class="flex gap-8">' +
                '<a href="' + p.dataUrl + '" download="' + UI.esc(p.fileName || 'certificate.pdf') + '" class="btn btn-sm btn-outline" style="color:#F8FAFC;border-color:#334155">' +
                  icon('download', 13) + ' Download PDF' +
                '</a>' +
                '<a href="' + p.dataUrl + '" target="_blank" rel="noopener" class="btn btn-sm btn-primary">' +
                  icon('externalLink', 13) + ' Open PDF in New Window' +
                '</a>' +
              '</div>' +
            '</div>' +
          '</div>';
      } else {
        preview =
          '<div style="padding:20px;background:rgba(255,255,255,0.05);border-radius:8px;border:1px solid rgba(255,255,255,0.1);text-align:center;color:#F8FAFC;margin-bottom:12px">' +
            '<div style="font-weight:700;font-size:14px;margin-bottom:4px">' + icon('fileText', 16) + ' Original Document Attachment on File</div>' +
            '<div class="text-small" style="color:#94A3B8;margin-bottom:10px">' + UI.esc(p.fileName || (a.name + '-certificate.pdf')) + ' · ' + UI.esc(p.fileType || 'Official Document') + '</div>' +
            (p.dataUrl ? '<a href="' + p.dataUrl + '" download="' + UI.esc(p.fileName || 'certificate') + '" class="btn btn-sm btn-outline">' + icon('download', 13) + ' Download Original File</a>' : '') +
          '</div>';
      }

      return '<div class="cert-preview">' + preview +
        '<div class="file-chip w-100" style="margin-top:0">' +
          '<span class="f-ic">' + icon('fileText', 18) + '</span>' +
          '<div><div class="f-name">' + UI.esc(p.fileName || 'Original Document Attached') + '</div>' +
          '<div class="f-meta">' + UI.esc(p.fileType || 'Document') + ' · ' + UI.fmtSize(p.fileSize || 240000) + '</div></div>' +
        '</div>' +
        '<div class="preview-note">' + icon('shield', 13) + ' Original student certificate verified and authenticated against official records.</div>' +
      '</div>';
    }

    /* decision actions */
    const remarkEl = root.querySelector('#facultyRemark');
    if (isPending) {
      root.querySelector('#approveBtn').addEventListener('click', function () {
        const remark = remarkEl.value.trim();
        UI.confirm({
          title: 'Approve this submission?',
          message: '<strong>' + UI.esc(act.name) + '</strong> by ' + UI.esc(st.name) + ' (' + UI.esc(st.enrollment) + ') will be marked <strong>Verified</strong>, issued a certificate ID and added to the student\'s verified portfolio and resume.',
          acceptText: 'Approve submission', tone: 'success'
        }).then(function (ok) {
          if (!ok) return;
          VS.approve(act.id, fac, remark).then(function () {
            UI.success('Approved', '“' + act.name + '” is now a verified achievement.');
            location.hash = '#/faculty/pending';
          }).catch(function (err) { UI.error('Approval failed', err.message); });
        });
      });

      root.querySelector('#rejectBtn').addEventListener('click', function () {
        const remark = remarkEl.value.trim();
        if (!remark) {
          remarkEl.closest('.field').classList.add('has-error');
          remarkEl.focus();
          UI.warning('Rejection reason required', 'Students must see why their submission was rejected.');
          return;
        }
        remarkEl.closest('.field').classList.remove('has-error');
        UI.confirm({
          title: 'Reject this submission?',
          message: '<strong>' + UI.esc(act.name) + '</strong> by ' + UI.esc(st.name) + ' will be marked <strong>Rejected</strong>. The student will see your reason and can resubmit.',
          acceptText: 'Reject submission', tone: 'danger'
        }).then(function (ok) {
          if (!ok) return;
          VS.reject(act.id, fac, remark).then(function () {
            UI.success('Rejected', 'The student has been notified with your remarks.');
            location.hash = '#/faculty/pending';
          }).catch(function (err) { UI.error('Rejection failed', err.message); });
        });
      });

      remarkEl.addEventListener('input', function () {
        if (remarkEl.value.trim()) remarkEl.closest('.field').classList.remove('has-error');
      });
    }

    Charts.bind(root);
  }

  /* =========================================================
     REVIEWED SUBMISSIONS
     ========================================================= */
  function renderReviewed(root, ctx) {
    const fac = faculty();
    const state = { search: '', category: 'all', department: 'all', status: 'verified', from: '', to: '' };

    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Reviewed Submissions</h1>' +
        '<p class="page-desc">Every submission you have approved or rejected, with your remarks.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-outline" type="button" id="exportBtn">' + icon('download', 16) + 'Export CSV</button>' +
        '</div>' +
      '</div>' +

      '<div class="tabs" id="revTabs">' +
        '<button class="tab" type="button" data-status="verified">Approved</button>' +
        '<button class="tab" type="button" data-status="rejected">Rejected</button>' +
        '<button class="tab active" type="button" data-status="all">All reviewed</button>' +
      '</div>' +

      filterBar({ placeholder: 'Search student or activity…', department: false }) +
      '<div class="card"><div id="revTable">' + UI.loading('Loading reviewed submissions…') + '</div></div>';

    const host = root.querySelector('#revTable');

    function repaint() {
      let rows = VS.reviewedBy(fac);
      if (state.status !== 'all') rows = rows.filter(function (a) { return a.status === state.status; });
      rows = AS.query({
        search: state.search, category: state.category,
        status: state.status === 'all' ? 'all' : state.status, from: state.from, to: state.to
      }).filter(function (a) { return rows.indexOf(a) !== -1; });

      host.innerHTML = UI.table([
        {
          key: 'student', label: 'Student', render: function (a) {
            const st = AS.studentOf(a) || {};
            return '<div class="cell-main">' + UI.esc(st.name || '—') + '</div><div class="cell-sub mono">' + UI.esc(st.enrollment || '') + '</div>';
          }
        },
        { key: 'name', label: 'Activity', render: function (a) { return '<div class="cell-main">' + UI.esc(a.name) + '</div><div class="cell-sub">' + UI.esc(a.category) + '</div>'; } },
        { key: 'reviewedAt', label: 'Decided on', render: function (a) { return UI.fmtDate(a.reviewedAt); } },
        { key: 'status', label: 'Decision', render: function (a) { return UI.statusBadge(a.status); } },
        { key: 'remarks', label: 'Your remarks', render: function (a) { return '<span class="text-small">' + UI.esc(a.remarks || '—') + '</span>'; } },
        {
          key: '_a', label: '', className: 'actions-cell', render: function (a) {
            return '<button class="btn btn-sm btn-outline" type="button" data-review="' + a.id + '">' + icon('eye', 14) + 'View</button>';
          }
        }
      ], rows, {
        empty: { icon: 'inbox', title: 'No reviewed submissions', message: 'Your approve / reject decisions will appear here.' }
      });
    }

    setTimeout(repaint, 240);
    bindFilters(root, state, repaint);

    root.querySelectorAll('[data-status]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        root.querySelectorAll('[data-status]').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        state.status = tab.getAttribute('data-status');
        repaint();
      });
    });

    UI.delegate(root, 'click', '[data-review]', function (e, btn) {
      location.hash = '#/faculty/verify/' + btn.getAttribute('data-review');
    });

    root.querySelector('#exportBtn').addEventListener('click', function () {
      const rows = VS.reviewedBy(fac);
      if (!rows.length) { UI.warning('Nothing to export', 'You have no reviewed submissions yet.'); return; }
      CC.ReportService.downloadCSV('campuscred-reviewed-submissions.csv', CC.ReportService.toCSV(rows));
      UI.success('Export started', 'CSV download has begun.');
    });
  }

  /* =========================================================
     VERIFICATION HISTORY
     ========================================================= */
  function renderHistory(root, ctx) {
    const fac = faculty();
    const history = VS.historyFor(fac);
    const stats = VS.statsFor(fac);

    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Verification History</h1>' +
        '<p class="page-desc">A complete audit trail of your verification decisions — useful for department reviews and audits.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-outline" type="button" id="exportBtn">' + icon('download', 16) + 'Export history</button>' +
        '</div>' +
      '</div>' +

      '<div class="stat-grid cols-4 mb-24">' +
        statCard('list', 'tone-royal', stats.totalReviewed, 'Total decisions', 'All time') +
        statCard('checkCircle', 'tone-green', stats.approved, 'Approvals', 'Verified records') +
        statCard('xCircle', 'tone-red', stats.rejected, 'Rejections', 'Returned with remarks') +
        statCard('inbox', 'tone-amber', stats.pending, 'Still pending', 'In your queue') +
      '</div>' +

      '<div class="card">' +
        '<div class="card-head"><h3>' + icon('history', 17) + ' Decision log</h3>' +
        '<span class="text-small text-muted">' + history.length + ' entries</span></div>' +
        '<div class="card-body">' +
          (history.length ? '<div class="timeline">' + history.map(function (h) {
            const tone = h.action === 'verified' ? 'tone-green' : 'tone-red';
            return '<div class="timeline-item ' + tone + '">' +
              '<div class="tl-title">' + (h.action === 'verified' ? 'Approved' : 'Rejected') + ' · ' + UI.esc(h.activity) + '</div>' +
              '<div class="tl-meta">' + UI.esc(h.student) + ' · ' + UI.esc(h.category) + ' · ' + UI.fmtDate(h.at) + '</div>' +
              '<div class="tl-body">' + UI.esc(h.remarks || '—') + '</div>' +
            '</div>';
          }).join('') + '</div>' :
            UI.empty({ icon: 'history', title: 'No history yet', message: 'Review your first pending submission to start the audit trail.', action: 'Open queue' })) +
        '</div>' +
      '</div>';

    const emptyBtn = root.querySelector('[data-empty-action]');
    if (emptyBtn) emptyBtn.addEventListener('click', function () { location.hash = '#/faculty/pending'; });

    root.querySelector('#exportBtn').addEventListener('click', function () {
      if (!history.length) { UI.warning('Nothing to export', 'Your decision log is empty.'); return; }
      const rows = VS.reviewedBy(fac);
      CC.ReportService.downloadCSV('campuscred-verification-history.csv', CC.ReportService.toCSV(rows));
      UI.success('Export started', 'History CSV download has begun.');
    });
  }

  /* =========================================================
     FACULTY PROFILE
     ========================================================= */
  function renderProfile(root, ctx) {
    const fac = faculty() || (Store && Store.db && Store.db.faculty && Store.db.faculty[0]) || {};
    const stats = (fac && fac.id) ? VS.statsFor(fac) : { totalReviewed: 0, approved: 0, rejected: 0, pending: 0 };

    function paint() {
      const current = faculty() || fac || {};
      const currentCats = current.categories || [];

      root.innerHTML =
        '<div class="page-head">' +
          '<div><h1>Faculty Profile &amp; Verifier Scope</h1>' +
          '<p class="page-desc">Edit your verifier identity, contact information, department affiliation, and authorized categories.</p></div>' +
          '<div class="page-actions">' +
            '<button class="btn btn-primary" type="button" id="saveFacProfile">' + icon('check', 16) + 'Save Profile</button>' +
          '</div>' +
        '</div>' +

        '<div class="profile-hero mb-24">' +
          UI.avatar(current.name, current.color, 'xl') +
          '<div class="ph-meta">' +
            '<h2>' + UI.esc(current.name) + '</h2>' +
            '<div class="ph-sub">' + UI.esc(current.designation || 'Faculty Member') + ' · ' + UI.esc(current.department) + '</div>' +
            '<div class="ph-chips">' +
              '<span class="chip mono">' + UI.esc(current.employeeId || current.id) + '</span>' +
              '<span class="chip">' + UI.esc(current.officeLocation || 'Academic Block') + '</span>' +
              (current.phone ? '<span class="chip mono">' + icon('smartphone', 12) + ' ' + UI.esc(current.phone) + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="text-center">' +
            '<span class="verified-pill">' + icon('shield', 15) + 'Authorized Verifier</span>' +
            '<div class="text-small mt-8" style="color:#93A7C7">' + stats.totalReviewed + ' decisions recorded</div>' +
          '</div>' +
        '</div>' +

        '<div class="two-col">' +
          '<div>' +
            '<!-- Personal & Contact Details Card -->' +
            '<div class="card card-pad mb-16">' +
              '<div class="section-title mb-12">Personal &amp; Institutional Credentials</div>' +
              '<div class="two-col mb-12" style="gap:10px">' +
                '<div class="field mb-0">' +
                  '<label for="fName" style="font-size:12px;margin-bottom:2px">Full Name<span class="req">*</span></label>' +
                  '<input type="text" id="fName" class="input" value="' + UI.esc(current.name || '') + '" required />' +
                '</div>' +
                '<div class="field mb-0">' +
                  '<label for="fPhone" style="font-size:12px;margin-bottom:2px">Mobile Number<span class="req">*</span></label>' +
                  '<input type="tel" id="fPhone" class="input mono" value="' + UI.esc(current.phone || '') + '" placeholder="+91 98765 43210" />' +
                '</div>' +
              '</div>' +
              '<div class="two-col mb-12" style="gap:10px">' +
                '<div class="field mb-0">' +
                  '<label for="fEmail" style="font-size:12px;margin-bottom:2px">Institutional Email<span class="req">*</span></label>' +
                  '<input type="email" id="fEmail" class="input" value="' + UI.esc(current.email || '') + '" required />' +
                '</div>' +
                '<div class="field mb-0">' +
                  '<label for="fEmpId" style="font-size:12px;margin-bottom:2px">Staff / Employee ID<span class="req">*</span></label>' +
                  '<input type="text" id="fEmpId" class="input mono" value="' + UI.esc(current.employeeId || '') + '" required />' +
                '</div>' +
              '</div>' +
              '<div class="two-col mb-12" style="gap:10px">' +
                '<div class="field mb-0">' +
                  '<label for="fDesignation" style="font-size:12px;margin-bottom:2px">Designation<span class="req">*</span></label>' +
                  '<select id="fDesignation" class="select">' +
                    ['Assistant Professor', 'Associate Professor', 'Professor', 'Professor & HOD', 'Lab Director', 'Dean of Academics'].map(function (des) {
                      return '<option value="' + des + '"' + (current.designation === des ? ' selected' : '') + '>' + des + '</option>';
                    }).join('') +
                  '</select>' +
                '</div>' +
                '<div class="field mb-0">' +
                  '<label for="fDepartment" style="font-size:12px;margin-bottom:2px">Department<span class="req">*</span></label>' +
                  '<select id="fDepartment" class="select">' +
                    global.MockData.DEPARTMENTS.map(function (d) {
                      return '<option value="' + UI.esc(d) + '"' + (current.department === d ? ' selected' : '') + '>' + UI.esc(d) + '</option>';
                    }).join('') +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="two-col mb-0" style="gap:10px">' +
                '<div class="field mb-0">' +
                  '<label for="fOffice" style="font-size:12px;margin-bottom:2px">Office / Cabin Location</label>' +
                  '<input type="text" id="fOffice" class="input" value="' + UI.esc(current.officeLocation || 'Academic Block 3, Lab 204') + '" />' +
                '</div>' +
                '<div class="field mb-0">' +
                  '<label for="fColor" style="font-size:12px;margin-bottom:2px">Avatar Tone</label>' +
                  '<select id="fColor" class="select">' +
                    '<option value="1"' + (current.color === 1 ? ' selected' : '') + '>Royal Blue</option>' +
                    '<option value="2"' + (current.color === 2 ? ' selected' : '') + '>Emerald Green</option>' +
                    '<option value="3"' + (current.color === 3 ? ' selected' : '') + '>Amber Orange</option>' +
                    '<option value="4"' + (current.color === 4 ? ' selected' : '') + '>Purple Indigo</option>' +
                    '<option value="5"' + (current.color === 5 ? ' selected' : '') + '>Teal Cyan</option>' +
                    '<option value="6"' + (current.color === 6 ? ' selected' : '') + '>Crimson Rose</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<!-- Bio & Office Hours Card -->' +
            '<div class="card card-pad mb-16">' +
              '<div class="section-title mb-10">Academic Background &amp; Office Hours</div>' +
              '<div class="field mb-10">' +
                '<label for="fHours" style="font-size:12px;margin-bottom:2px">Student Consultation Hours</label>' +
                '<input type="text" id="fHours" class="input" value="' + UI.esc(current.officeHours || 'Mon-Fri: 11:30 AM - 1:00 PM') + '" placeholder="e.g. Mon-Fri: 11:00 AM - 1:00 PM" />' +
              '</div>' +
              '<div class="field mb-0">' +
                '<label for="fBio" style="font-size:12px;margin-bottom:2px">Research Interests &amp; Bio</label>' +
                '<textarea class="input" id="fBio" rows="4" placeholder="Briefly describe your specialization, research domains, and academic background...">' + UI.esc(current.bio || '') + '</textarea>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div>' +
            '<!-- Authorized Verification Scope -->' +
            '<div class="card card-pad mb-16">' +
              '<div class="section-title mb-6">Authorized Verification Scope</div>' +
              '<p class="text-small text-muted mb-12">Select activity categories you are permitted to evaluate and verify:</p>' +
              '<div id="catCheckboxes" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
                global.MockData.CATEGORIES.map(function (c) {
                  const checked = currentCats.includes(c) || currentCats.includes('*');
                  return '<label class="checkbox-row" style="font-size:12.5px;padding:6px 8px;background:var(--bg-subtle);border-radius:6px;border:1px solid var(--border)">' +
                    '<input type="checkbox" name="facCat" value="' + UI.esc(c) + '"' + (checked ? ' checked' : '') + ' /> ' + UI.esc(c) +
                  '</label>';
                }).join('') +
              '</div>' +
            '</div>' +

            '<!-- Workload & Stats Summary -->' +
            '<div class="card mb-16">' +
              '<div class="card-head"><h3>' + icon('barChart', 17) + ' Your Verification Impact</h3></div>' +
              '<div class="card-body">' +
                '<div class="rank-list">' +
                  '<div class="rank-item"><span class="rk-no">1</span><div class="rk-main"><div class="rk-name">Approved submissions</div>' +
                  '<div class="rk-bar"><span style="width:' + (stats.totalReviewed ? Math.round(stats.approved / stats.totalReviewed * 100) : 0) + '%;background:var(--verified-500)"></span></div></div>' +
                  '<span class="rk-val">' + stats.approved + '</span></div>' +
                  '<div class="rank-item"><span class="rk-no">2</span><div class="rk-main"><div class="rk-name">Rejected submissions</div>' +
                  '<div class="rk-bar"><span style="width:' + (stats.totalReviewed ? Math.round(stats.rejected / stats.totalReviewed * 100) : 0) + '%;background:var(--danger-500)"></span></div></div>' +
                  '<span class="rk-val">' + stats.rejected + '</span></div>' +
                  '<div class="rank-item"><span class="rk-no">3</span><div class="rk-main"><div class="rk-name">Awaiting decision in queue</div>' +
                  '<div class="rk-bar"><span style="width:40%;background:var(--pending-500)"></span></div></div>' +
                  '<span class="rk-val">' + stats.pending + '</span></div>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<a class="btn btn-outline btn-block mb-12" href="#/faculty/pending">' + icon('inbox', 16) + 'Open Verification Queue</a>' +
          '</div>' +
        '</div>';

      // Save Faculty Profile Button Handler
      const saveBtn = root.querySelector('#saveFacProfile');
      if (saveBtn) {
        saveBtn.addEventListener('click', function () {
          const name = root.querySelector('#fName').value.trim();
          const email = root.querySelector('#fEmail').value.trim();
          const phone = root.querySelector('#fPhone').value.trim();
          const employeeId = root.querySelector('#fEmpId').value.trim();
          const designation = root.querySelector('#fDesignation').value;
          const department = root.querySelector('#fDepartment').value;
          const officeLocation = root.querySelector('#fOffice').value.trim();
          const officeHours = root.querySelector('#fHours').value.trim();
          const bio = root.querySelector('#fBio').value.trim();
          const color = parseInt(root.querySelector('#fColor').value, 10);

          const selectedCats = [];
          root.querySelectorAll('input[name="facCat"]:checked').forEach(function (cb) {
            selectedCats.push(cb.value);
          });

          if (!name || !email || !employeeId) {
            UI.warning('Fields Required', 'Full Name, Institutional Email, and Staff ID cannot be empty.');
            return;
          }

          saveBtn.classList.add('is-disabled');
          saveBtn.innerHTML = '<span class="spinner"></span> Saving…';

          CC.ProfileService.updateFaculty(fac.id, {
            name: name,
            email: email,
            phone: phone,
            employeeId: employeeId,
            designation: designation,
            department: department,
            officeLocation: officeLocation,
            officeHours: officeHours,
            bio: bio,
            color: color,
            categories: selectedCats.length ? selectedCats : ['*']
          }).then(function (updated) {
            saveBtn.classList.remove('is-disabled');
            saveBtn.innerHTML = icon('check', 16) + 'Save Profile';
            UI.success('Faculty Profile Updated!', 'Your contact, department, and verification scope details have been saved.');
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

  /* =========================================================
     STUDENT PROFILE VERIFICATIONS (Primary Requirement 5)
     Mandatory verification workflow before any student profile
     can be created or activated.
     ========================================================= */
  function renderStudentVerifications(root, ctx) {
    const fac = faculty();
    const state = { search: '', status: 'PENDING_APPROVAL', department: 'all' };

    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Student Profile Verifications</h1>' +
        '<p class="page-desc">Review and authenticate newly submitted student registrations. Under institutional policy, student accounts cannot be created or activated until an authorized faculty member or administrator approves their credentials.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-outline" type="button" id="exportRegsBtn">' + icon('download', 16) + 'Export List</button>' +
        '</div>' +
      '</div>' +

      '<div class="filter-bar">' +
        '<div class="search-field">' + icon('search', 15) +
          '<input class="input" type="search" placeholder="Search name, enrollment, mobile, email…" data-filter="search" value="' + UI.esc(state.search) + '" />' +
        '</div>' +
        '<select class="select" data-filter="status">' +
          '<option value="all">All Statuses</option>' +
          '<option value="PENDING_APPROVAL" selected>Pending Approval Only</option>' +
          '<option value="APPROVED">Approved &amp; Active</option>' +
          '<option value="REJECTED">Rejected</option>' +
        '</select>' +
        '<select class="select" data-filter="department">' +
          '<option value="all">All Departments</option>' +
          global.MockData.DEPARTMENTS.map(function (d) { return '<option value="' + UI.esc(d) + '">' + UI.esc(d) + '</option>'; }).join('') +
        '</select>' +
        '<button class="btn btn-sm btn-outline clear-btn" type="button" id="clearFiltersBtn">' + icon('refresh', 14) + 'Reset</button>' +
      '</div>' +

      '<div id="regsMetrics" class="stat-grid cols-4 mb-20"></div>' +
      '<div id="regsListHost"></div>';

    const metricsHost = root.querySelector('#regsMetrics');
    const listHost = root.querySelector('#regsListHost');

    function repaint() {
      const allRegs = (CC.AuthService.getAllStudentRegistrations ? CC.AuthService.getAllStudentRegistrations() : (Store.db.studentRegistrations || [])).slice();
      const pendingCount = allRegs.filter(r => r.status === 'PENDING_APPROVAL' || r.accountStatus === 'PENDING_APPROVAL').length;
      const approvedCount = allRegs.filter(r => r.status === 'APPROVED' || r.accountStatus === 'ACTIVE').length;
      const rejectedCount = allRegs.filter(r => r.status === 'REJECTED' || r.accountStatus === 'REJECTED').length;

      metricsHost.innerHTML =
        statCard('clock', 'tone-amber', pendingCount, 'Pending Verification', 'Awaiting authenticity review') +
        statCard('checkCircle', 'tone-green', approvedCount, 'Approved Students', 'Active verified profiles') +
        statCard('xCircle', 'tone-red', rejectedCount, 'Rejected Requests', 'Invalid credentials') +
        statCard('users', 'tone-royal', allRegs.length, 'Total Registrations', 'All incoming requests');

      let filtered = allRegs;
      if (state.status !== 'all') {
        filtered = filtered.filter(function (r) {
          if (state.status === 'PENDING_APPROVAL') return r.status === 'PENDING_APPROVAL' || r.accountStatus === 'PENDING_APPROVAL';
          if (state.status === 'APPROVED') return r.status === 'APPROVED' || r.accountStatus === 'ACTIVE';
          if (state.status === 'REJECTED') return r.status === 'REJECTED' || r.accountStatus === 'REJECTED';
          return true;
        });
      }
      if (state.department !== 'all') {
        filtered = filtered.filter(function (r) {
          return (r.departmentName || r.department) === state.department;
        });
      }
      if (state.search) {
        const q = state.search.toLowerCase();
        filtered = filtered.filter(function (r) {
          return (r.name || '').toLowerCase().indexOf(q) !== -1 ||
                 (r.email || '').toLowerCase().indexOf(q) !== -1 ||
                 (r.enrollment || r.registrationNumber || '').toLowerCase().indexOf(q) !== -1 ||
                 (r.phone || '').indexOf(q) !== -1;
        });
      }

      if (!filtered.length) {
        listHost.innerHTML = UI.empty({
          icon: state.status === 'PENDING_APPROVAL' ? 'checkCircle' : 'inbox',
          title: state.status === 'PENDING_APPROVAL' ? 'All student verifications are complete' : 'No registrations found',
          message: state.status === 'PENDING_APPROVAL' ? 'There are no pending student registrations awaiting verification.' : 'Try adjusting your search query or filters.'
        });
        return;
      }

      listHost.innerHTML =
        '<div style="display:grid;gap:14px">' +
          filtered.map(function (reg) {
            const isPending = reg.status === 'PENDING_APPROVAL' || reg.accountStatus === 'PENDING_APPROVAL';
            const isApproved = reg.status === 'APPROVED' || reg.accountStatus === 'ACTIVE';
            const isRejected = reg.status === 'REJECTED' || reg.accountStatus === 'REJECTED';

            const statusBadgeHtml = isPending ?
              '<span class="badge badge-pending font-bold" style="font-size:12px;padding:4px 10px">' + icon('clock', 13) + ' Pending Verification</span>' :
              isApproved ?
              '<span class="badge badge-verified font-bold" style="font-size:12px;padding:4px 10px">' + icon('checkCircle', 13) + ' Verified &amp; Active</span>' :
              '<span class="badge badge-rejected font-bold" style="font-size:12px;padding:4px 10px">' + icon('xCircle', 13) + ' Rejected</span>';

            return '<div class="card card-pad" style="border:1px solid ' + (isPending ? '#FDE68A' : 'var(--border)') + ';background:' + (isPending ? 'rgba(254,243,199,0.15)' : 'var(--bg-card)') + ';border-radius:12px;transition:box-shadow .2s">' +
              '<div class="flex-between mb-12" style="align-items:flex-start;flex-wrap:wrap;gap:10px">' +
                '<div class="flex" style="align-items:center;gap:14px">' +
                  UI.avatar(reg.name, reg.color || 1, 'md') +
                  '<div>' +
                    '<div class="flex" style="align-items:center;gap:8px">' +
                      '<h3 style="margin:0;font-size:17px">' + UI.esc(reg.name) + '</h3>' +
                      '<span class="badge badge-neutral mono text-xs">' + UI.esc(reg.enrollment || reg.registrationNumber || reg.uid) + '</span>' +
                    '</div>' +
                    '<div class="text-small text-muted mt-2">' +
                      UI.esc(reg.email) + ' · <span class="mono font-bold" style="color:#2563EB">' + UI.esc(reg.phone || 'No phone') + '</span> · ' +
                      (reg.mobileOtpVerified ? '<span style="color:#16A34A;font-weight:700">✔ SMS OTP Verified</span>' : '<span style="color:#DC2626">OTP Unverified</span>') +
                    '</div>' +
                  '</div>' +
                '</div>' +
                '<div>' + statusBadgeHtml + '</div>' +
              '</div>' +

              '<div class="two-col mb-12" style="gap:12px;padding:10px 12px;background:var(--bg-subtle);border-radius:8px;font-size:12.5px">' +
                '<div>' +
                  '<div><span class="text-muted">Academic Program:</span> <strong>' + UI.esc(reg.courseName || reg.course || 'B.Tech') + ' (' + UI.esc(reg.branch || 'CSE') + ')</strong></div>' +
                  '<div class="mt-4"><span class="text-muted">Department:</span> <strong>' + UI.esc(reg.departmentName || reg.department || 'Computer Science') + '</strong></div>' +
                '</div>' +
                '<div>' +
                  '<div><span class="text-muted">Current Year of Study:</span> <span class="chip chip-royal font-bold" style="font-size:11.5px">' + UI.esc(reg.year || '1st Year') + '</span> · <span class="text-muted">' + UI.esc(reg.semester || '1st Semester') + '</span></div>' +
                  '<div class="mt-4"><span class="text-muted">Submitted:</span> ' + UI.fmtDate(reg.submittedAt) + ' <span class="text-muted">(' + UI.timeAgo(reg.submittedAt) + ')</span></div>' +
                '</div>' +
              '</div>' +

              (reg.bio ? '<p class="text-small text-muted mb-12" style="font-style:italic">“' + UI.esc(reg.bio) + '”</p>' : '') +

              (isRejected && reg.rejectionReason ?
                '<div class="callout danger mb-12" style="padding:8px 12px;font-size:12px">' +
                  icon('alert', 14) + '<div><strong>Rejection Reason:</strong> ' + UI.esc(reg.rejectionReason) + (reg.reviewedBy ? ' (by ' + UI.esc(reg.reviewedBy) + ')' : '') + '</div>' +
                '</div>' : '') +

              (isApproved ?
                '<div class="callout success mb-12" style="padding:8px 12px;font-size:12px">' +
                  icon('checkCircle', 14) + '<div><strong>Verified Profile Active:</strong> Student can access all platform features and submit achievements. (Approved by ' + UI.esc(reg.reviewedBy || 'Faculty Verifier') + ')</div>' +
                '</div>' : '') +

              '<div class="flex-between" style="border-top:1px solid var(--border);padding-top:10px;align-items:center;flex-wrap:wrap;gap:8px">' +
                '<button type="button" class="btn btn-sm btn-outline" data-view-reg="' + reg.id + '">' +
                  icon('eye', 14) + ' View Full Credentials' +
                '</button>' +
                (isPending ?
                  '<div class="flex gap-8">' +
                    '<button type="button" class="btn btn-sm btn-outline text-danger" data-reject-reg="' + reg.id + '" style="border-color:#FCA5A5">' +
                      icon('x', 14) + ' Reject' +
                    '</button>' +
                    '<button type="button" class="btn btn-sm btn-primary" data-approve-reg="' + reg.id + '" style="background:#16A34A;border-color:#16A34A">' +
                      icon('check', 14) + ' Approve &amp; Activate' +
                    '</button>' +
                  '</div>' : '') +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>';
    }

    repaint();

    // Filters
    root.querySelectorAll('[data-filter]').forEach(function (el) {
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function () {
        state[el.getAttribute('data-filter')] = el.value;
        repaint();
      });
    });

    const clearBtn = root.querySelector('#clearFiltersBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        state.search = '';
        state.status = 'all';
        state.department = 'all';
        root.querySelector('[data-filter="search"]').value = '';
        root.querySelector('[data-filter="status"]').value = 'all';
        root.querySelector('[data-filter="department"]').value = 'all';
        repaint();
      });
    }

    // Export CSV
    const expBtn = root.querySelector('#exportRegsBtn');
    if (expBtn) {
      expBtn.addEventListener('click', function () {
        const regs = (Store.db.studentRegistrations || []).slice();
        if (!regs.length) { UI.warning('No Records', 'No student registrations found to export.'); return; }
        const csvRows = [
          ['Registration ID', 'UID', 'Name', 'Enrollment', 'Email', 'Phone', 'Department', 'Year of Study', 'Status', 'Submitted At', 'Reviewed By'].join(',')
        ];
        regs.forEach(function (r) {
          csvRows.push([
            r.id, r.uid, '"' + (r.name || '').replace(/"/g, '""') + '"', r.enrollment || '',
            r.email || '', r.phone || '', '"' + (r.departmentName || '').replace(/"/g, '""') + '"',
            r.year || '1st Year', r.status || '', r.submittedAt || '', '"' + (r.reviewedBy || '').replace(/"/g, '""') + '"'
          ].join(','));
        });
        CC.ReportService.downloadCSV('student-registrations.csv', csvRows.join('\n'));
        UI.success('Export Started', 'Student registrations exported as CSV.');
      });
    }

    // Approve Action Handler
    UI.delegate(root, 'click', '[data-approve-reg]', function (e, btn) {
      const regId = btn.getAttribute('data-approve-reg');
      const reg = (Store.db.studentRegistrations || []).find(r => r.id === regId);
      if (!reg) return;

      UI.confirm({
        title: 'Approve ' + reg.name + '?',
        message: 'This will verify the student enrollment (' + (reg.enrollment || reg.registrationNumber) + '), create their verified student profile, and grant full platform access.',
        acceptText: 'Approve & Activate',
        tone: 'success'
      }).then(function (ok) {
        if (!ok) return;
        btn.classList.add('is-disabled');
        btn.innerHTML = '<span class="spinner"></span> Approving…';

        CC.AuthService.approveStudentRegistration(regId, fac).then(function (res) {
          UI.success('Student Approved!', reg.name + ' has been verified and their profile is now ACTIVE.');
          repaint();
        }).catch(function (err) {
          UI.error('Approval Failed', err.message);
          repaint();
        });
      });
    });

    // Reject Action Handler
    UI.delegate(root, 'click', '[data-reject-reg]', function (e, btn) {
      const regId = btn.getAttribute('data-reject-reg');
      const reg = (Store.db.studentRegistrations || []).find(r => r.id === regId);
      if (!reg) return;

      UI.prompt({
        title: 'Reject Registration for ' + reg.name,
        message: 'Enter the institutional reason for rejecting this registration. The student will be informed of this reason if they attempt to sign in.',
        placeholder: 'Reason for rejection (e.g. Enrollment ID does not match department records)…',
        defaultValue: 'Enrollment credentials could not be authenticated against institutional records.',
        acceptText: 'Confirm Rejection',
        tone: 'danger'
      }).then(function (reason) {
        if (!reason) return;
        btn.classList.add('is-disabled');
        btn.innerHTML = '<span class="spinner"></span> Rejecting…';

        CC.AuthService.rejectStudentRegistration(regId, fac, reason).then(function () {
          UI.warning('Registration Rejected', reg.name + ' marked as rejected. Profile will NOT be created.');
          repaint();
        }).catch(function (err) {
          UI.error('Rejection Failed', err.message);
          repaint();
        });
      });
    });

    // View Details Modal
    UI.delegate(root, 'click', '[data-view-reg]', function (e, btn) {
      const regId = btn.getAttribute('data-view-reg');
      const reg = (Store.db.studentRegistrations || []).find(r => r.id === regId);
      if (!reg) return;

      const isPending = reg.status === 'PENDING_APPROVAL' || reg.accountStatus === 'PENDING_APPROVAL';

      const body =
        '<div class="flex-center gap-14 mb-16">' +
          UI.avatar(reg.name, reg.color || 1, 'lg') +
          '<div>' +
            '<div style="font-size:18px;font-weight:800">' + UI.esc(reg.name) + '</div>' +
            '<div class="text-small text-muted mono">' + UI.esc(reg.enrollment || reg.registrationNumber) + '</div>' +
            '<div class="text-small text-muted">' + UI.esc(reg.courseName || reg.course || 'B.Tech') + ' · ' + UI.esc(reg.departmentName || reg.department) + '</div>' +
          '</div>' +
        '</div>' +
        '<dl class="dl mb-16">' +
          '<dt>Registration ID</dt><dd class="mono">' + UI.esc(reg.id) + '</dd>' +
          '<dt>System UID</dt><dd class="mono">' + UI.esc(reg.uid) + '</dd>' +
          '<dt>Institutional Email</dt><dd>' + UI.esc(reg.email) + '</dd>' +
          '<dt>Mobile Number</dt><dd class="mono">' + UI.esc(reg.phone) + (reg.mobileOtpVerified ? ' <span class="badge badge-verified">✔ SMS Verified</span>' : '') + '</dd>' +
          '<dt>Year of Study</dt><dd><span class="chip chip-royal font-bold">' + UI.esc(reg.year || '1st Year') + '</span></dd>' +
          '<dt>Semester</dt><dd>' + UI.esc(reg.semester || '1st Semester') + '</dd>' +
          '<dt>Academic Year</dt><dd>' + UI.esc(reg.academicYear || '2024-2028') + '</dd>' +
          '<dt>Submission Date</dt><dd>' + UI.fmtDate(reg.submittedAt) + ' (' + UI.timeAgo(reg.submittedAt) + ')</dd>' +
          '<dt>Verification Status</dt><dd>' + (isPending ? '<span class="badge badge-pending">Pending Institutional Review</span>' : reg.status === 'APPROVED' ? '<span class="badge badge-verified">Approved & Active</span>' : '<span class="badge badge-rejected">Rejected</span>') + '</dd>' +
          (reg.reviewedBy ? '<dt>Reviewed By</dt><dd>' + UI.esc(reg.reviewedBy) + ' (' + UI.fmtDate(reg.reviewedAt) + ')</dd>' : '') +
          (reg.rejectionReason ? '<dt>Rejection Note</dt><dd class="text-danger">' + UI.esc(reg.rejectionReason) + '</dd>' : '') +
        '</dl>' +
        (reg.bio ? '<div class="callout info mb-16" style="font-size:12px">' + icon('user', 14) + '<div><strong>Applicant Bio:</strong> ' + UI.esc(reg.bio) + '</div></div>' : '');

      const footer =
        '<button class="btn btn-outline" type="button" data-close>Close</button>' +
        (isPending ?
          '<button class="btn btn-outline text-danger" type="button" id="modalRejectBtn">' + icon('x', 14) + 'Reject</button>' +
          '<button class="btn btn-primary" type="button" id="modalApproveBtn" style="background:#16A34A;border-color:#16A34A">' + icon('check', 14) + 'Approve &amp; Activate</button>' : '');

      const m = UI.modal({
        title: 'Student Registration Verification Details',
        body: body,
        footer: footer,
        width: 600
      });

      if (isPending) {
        const modalApprove = m.modal.querySelector('#modalApproveBtn');
        const modalReject = m.modal.querySelector('#modalRejectBtn');

        if (modalApprove) {
          modalApprove.addEventListener('click', function () {
            m.close();
            CC.AuthService.approveStudentRegistration(reg.id, fac).then(function () {
              UI.success('Student Approved!', reg.name + ' verified successfully.');
              repaint();
            });
          });
        }

        if (modalReject) {
          modalReject.addEventListener('click', function () {
            m.close();
            UI.prompt({
              title: 'Reject Registration',
              message: 'Reason for rejection:',
              defaultValue: 'Enrollment credentials could not be authenticated against institutional records.',
              tone: 'danger'
            }).then(function (reason) {
              if (!reason) return;
              CC.AuthService.rejectStudentRegistration(reg.id, fac, reason).then(function () {
                UI.warning('Registration Rejected', reg.name + ' marked as rejected.');
                repaint();
              });
            });
          });
        }
      }
    });
  }

  CC.FacultyPages = {
    dashboard: renderDashboard,
    students: renderStudentVerifications,
    pending: renderPending,
    verifyDetail: renderVerifyDetail,
    reviewed: renderReviewed,
    history: renderHistory,
    profile: renderProfile
  };
})(window);
