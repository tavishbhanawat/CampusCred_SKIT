/* ============================================================
   CampusCred — js/pages/student.js
   Student area: Dashboard, Add Activity, My Activities,
   Portfolio, Resume Builder, Social Links, Notifications, Profile.
   ============================================================ */
(function (global) {
  'use strict';
  const CC = global.CC;
  const icon = CC.icon, UI = CC.UI, Charts = CC.Charts;

  const AS = CC.ActivityService;
  const PS = CC.ProfileService;
  const Mock = global.MockData;

  function student() { return CC.AuthService.currentUser(); }

  function statusSelect(value) {
    const opts = [['all', 'All status'], ['verified', 'Verified'], ['pending', 'Pending'], ['rejected', 'Rejected']];
    return '<select class="select" data-filter="status">' + opts.map(function (o) {
      return '<option value="' + o[0] + '"' + (value === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('') + '</select>';
  }
  function categorySelect(value) {
    const opts = [['all', 'All categories']].concat(global.MockData.CATEGORIES.map(function (c) { return [c, c]; }));
    return '<select class="select" data-filter="category">' + opts.map(function (o) {
      return '<option value="' + UI.esc(o[0]) + '"' + (value === o[0] ? ' selected' : '') + '>' + UI.esc(o[1]) + '</option>';
    }).join('') + '</select>';
  }

  function activityTable(rows, opts) {
    opts = opts || {};
    return UI.table([
      {
        key: 'name', label: 'Activity', render: function (a) {
          return '<div class="cell-main">' + UI.esc(a.name) + '</div><div class="cell-sub">' + UI.esc(a.organization) + '</div>';
        }
      },
      { key: 'category', label: 'Category', render: function (a) { return UI.categoryBadge(a.category); } },
      { key: 'date', label: 'Event Date', render: function (a) { return UI.fmtDate(a.date); } },
      { key: 'status', label: 'Status', render: function (a) { return UI.statusBadge(a.status); } },
      {
        key: 'certificateId', label: 'Certificate', render: function (a) {
          return a.certificateId ? '<span class="mono">' + UI.esc(a.certificateId) + '</span>' : '<span class="text-muted text-small">—</span>';
        }
      },
      {
        key: '_a', label: 'Actions', className: 'actions-cell', render: function (a) {
          return '<button class="btn btn-sm btn-outline" type="button" data-view="' + a.id + '">' + icon('eye', 14) + 'View</button>' +
            (a.status === 'pending' && opts.allowDelete ? '<button class="btn btn-sm btn-ghost text-danger" type="button" data-del="' + a.id + '">' + icon('trash', 14) + '</button>' : '');
        }
      }
    ], rows, {
      empty: {
        icon: 'inbox',
        title: opts.emptyTitle || 'No activities found',
        message: opts.emptyMessage || 'Try changing your filters, or submit your first achievement.',
        action: opts.emptyAction
      }
    });
  }

  function renderDocPreview(a, st) {
    const p = a.proof || (a.proofDocument ? {
      fileName: a.proofDocument.fileName,
      fileType: a.proofDocument.contentType,
      fileSize: a.proofDocument.fileSize,
      dataUrl: a.proofDocument.downloadUrl
    } : {});
    let previewHtml = '';

    if (p.dataUrl) {
      const isImg = (p.fileType && p.fileType.indexOf('image') !== -1) || p.dataUrl.indexOf('data:image') === 0;
      const isPdf = (p.fileType && p.fileType.indexOf('pdf') !== -1) || p.dataUrl.indexOf('data:application/pdf') === 0;

      if (isImg) {
        previewHtml =
          '<div class="cert-image-stage" style="text-align:center;background:#0F172A;padding:16px;border-radius:10px;border:1px solid #1E293B;box-shadow:inset 0 2px 4px rgba(0,0,0,0.4);margin-bottom:12px">' +
            '<div style="font-size:11.5px;color:#94A3B8;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:6px">' +
              icon('shield', 13) + ' Original Certificate Presentation — Exact Issuer Document &amp; Visual Appearance Preserved' +
            '</div>' +
            '<img src="' + p.dataUrl + '" alt="Original Certificate" style="max-width:100%;max-height:480px;object-fit:contain;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.5);background:transparent !important;display:inline-block" />' +
            '<div class="mt-12 flex gap-8" style="justify-content:center;flex-wrap:wrap">' +
              '<a href="' + p.dataUrl + '" download="' + UI.esc(p.fileName || 'original-certificate') + '" class="btn btn-sm btn-outline" style="background:rgba(255,255,255,0.08);border-color:#334155;color:#F8FAFC">' +
                icon('download', 13) + ' Download Original Certificate' +
              '</a>' +
              '<a href="' + p.dataUrl + '" target="_blank" rel="noopener" class="btn btn-sm btn-primary">' +
                icon('externalLink', 13) + ' Open Full Size Document' +
              '</a>' +
            '</div>' +
          '</div>';
      } else if (isPdf) {
        previewHtml =
          '<div class="cert-pdf-stage" style="background:var(--bg-subtle);padding:12px;border-radius:10px;border:1px solid var(--border);margin-bottom:12px">' +
            '<object data="' + p.dataUrl + '" type="application/pdf" style="width:100%;height:380px;border-radius:6px;background:#fff">' +
              '<iframe src="' + p.dataUrl + '" style="width:100%;height:380px;border:0;border-radius:6px;background:#fff"></iframe>' +
            '</object>' +
            '<div class="flex-between mt-10" style="flex-wrap:wrap;gap:8px">' +
              '<span class="text-small text-muted" style="display:inline-flex;align-items:center;gap:5px">' +
                icon('fileText', 14) + ' Original PDF Certificate Document Attachment' +
              '</span>' +
              '<div class="flex gap-8">' +
                '<a href="' + p.dataUrl + '" download="' + UI.esc(p.fileName || 'original-certificate.pdf') + '" class="btn btn-sm btn-outline">' +
                  icon('download', 13) + ' Download PDF' +
                '</a>' +
                '<a href="' + p.dataUrl + '" target="_blank" rel="noopener" class="btn btn-sm btn-primary">' +
                  icon('externalLink', 13) + ' Open PDF in New Window' +
                '</a>' +
              '</div>' +
            '</div>' +
          '</div>';
      } else {
        previewHtml =
          '<div style="padding:16px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:10px;text-align:center;margin-bottom:12px">' +
            '<div style="font-weight:700;font-size:13.5px;color:var(--text-900);margin-bottom:4px">' + icon('fileText', 16) + ' Original Document Attachment on File</div>' +
            '<div class="text-small text-muted mb-8">' + UI.esc(p.fileName || 'certificate-proof') + ' · ' + UI.esc(p.fileType || 'Document') + '</div>' +
            '<a href="' + p.dataUrl + '" download="' + UI.esc(p.fileName || 'document') + '" class="btn btn-sm btn-outline">' + icon('download', 13) + ' Download Original File</a>' +
          '</div>';
      }
    } else {
      // Document metadata card without fake template
      previewHtml =
        '<div style="padding:16px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:10px;text-align:center;margin-bottom:12px">' +
          '<div style="font-weight:700;font-size:13.5px;color:var(--text-900);margin-bottom:4px">' + icon('fileText', 16) + ' Original Document on File</div>' +
          '<div class="text-small text-muted">' + UI.esc(p.fileName || (a.name + '-certificate.pdf')) + ' · ' + UI.esc(p.fileType || 'Official Document') + '</div>' +
        '</div>';
    }

    return '<div class="cert-preview-box mb-16">' +
      '<div class="flex-between mb-8" style="align-items:center">' +
        '<span style="font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px">' +
          icon('shield', 15) + ' Original Uploaded Certificate Document' +
        '</span>' +
        (p.fileName ? '<span class="badge badge-neutral mono text-xs">' + UI.esc(p.fileName) + '</span>' : '') +
      '</div>' +
      previewHtml +
      (p.fileName ?
        '<div class="file-chip" style="margin-top:8px">' +
          '<span class="f-ic">' + icon('fileText', 18) + '</span>' +
          '<div><div class="f-name">' + UI.esc(p.fileName) + '</div>' +
          '<div class="f-meta">' + UI.esc(p.fileType || 'Document') + ' · ' + UI.fmtSize(p.fileSize || 250000) + '</div></div>' +
        '</div>' : '') +
    '</div>';
  }

  function detailModal(act, onChanged) {
    const st = AS.studentOf(act);
    const reviewer = AS.reviewerOf(act);
    const history = (act.history || []).slice().reverse();

    const body =
      '<div class="flex-between mb-16">' +
        '<div>' + UI.statusBadge(act.status) + ' ' + UI.categoryBadge(act.category) + '</div>' +
        '<span class="text-small text-muted">Submitted ' + UI.fmtDate(act.submittedAt) + '</span>' +
      '</div>' +
      '<h3 style="font-size:17px;margin-bottom:12px">' + UI.esc(act.name) + '</h3>' +
      '<dl class="dl mb-16">' +
        '<dt>Student</dt><dd>' + UI.esc(st ? st.name : '—') + ' (' + UI.esc(st ? st.enrollment : '—') + ')</dd>' +
        '<dt>Organization</dt><dd>' + UI.esc(act.organization) + '</dd>' +
        '<dt>Event date</dt><dd>' + UI.fmtDate(act.date) + '</dd>' +
        '<dt>Participation role</dt><dd>' + UI.esc(act.role) + '</dd>' +
        '<dt>Result</dt><dd>' + UI.esc(act.result) + '</dd>' +
        '<dt>Certificate ID</dt><dd>' + (act.certificateId ? '<span class="mono">' + UI.esc(act.certificateId) + '</span>' : '—') + '</dd>' +
        '<dt>Reviewed by</dt><dd>' + UI.esc(reviewer ? reviewer.name : (act.reviewedAt ? 'Faculty Reviewer' : 'Not reviewed yet')) + '</dd>' +
      '</dl>' +
      '<p class="text-small text-muted mb-16">' + UI.esc(act.description || '') + '</p>' +
      renderDocPreview(act, st) +
      (act.remarks ?
        '<div class="callout ' + (act.status === 'rejected' ? 'danger' : act.status === 'verified' ? 'success' : 'info') + '" style="margin-top:14px">' +
        icon(act.status === 'rejected' ? 'alert' : 'info', 16) +
        '<div><strong>' + (act.status === 'rejected' ? 'Rejection reason' : 'Faculty remarks') + ':</strong> ' + UI.esc(act.remarks) + '</div></div>'
        : '') +
      '<h4 style="font-size:13.5px;margin:20px 0 10px">Status timeline</h4>' +
      '<div class="timeline">' + history.map(function (h) {
        const tone = h.action === 'approved' ? 'tone-green' : h.action === 'rejected' ? 'tone-red' : 'tone-amber';
        const label = h.action === 'submitted' ? 'Submitted for verification' : h.action === 'approved' ? 'Approved by faculty' : 'Rejected by faculty';
        return '<div class="timeline-item ' + tone + '">' +
          '<div class="tl-title">' + label + '</div>' +
          '<div class="tl-meta">' + UI.fmtDate(h.at) + ' · ' + UI.esc(h.by) + '</div>' +
          '<div class="tl-body">' + UI.esc(h.note) + '</div>' +
        '</div>';
      }).join('') + '</div>';

    const p = act.proof || (act.proofDocument ? { dataUrl: act.proofDocument.downloadUrl, fileName: act.proofDocument.fileName } : {});
    const hasDataUrl = p && p.dataUrl;
    const footerButtons =
      (hasDataUrl ?
        '<a class="btn btn-outline" href="' + p.dataUrl + '" download="' + UI.esc(p.fileName || 'certificate') + '">' + icon('download', 14) + 'Download Original</a>' +
        '<a class="btn btn-outline" href="' + p.dataUrl + '" target="_blank" rel="noopener">' + icon('externalLink', 14) + 'Open Document</a>' : '') +
      '<button class="btn btn-primary" type="button" data-close>Close</button>';

    const m = UI.openModal({
      title: 'Activity details',
      subtitle: act.id,
      size: 'lg',
      body: body,
      footer: footerButtons
    });
    return m;
  }

  /* =========================================================
     STUDENT DASHBOARD
     ========================================================= */
  function renderDashboard(root, ctx) {
    const st = student();
    const stats = AS.statsFor(st.id);
    const rows = AS.forStudent(st.id);
    const notifications = AS.notificationsFor(st.id).slice(0, 4);
    const remarks = AS.remarksFor(st.id).slice(0, 3);

    root.innerHTML =
      '<div class="welcome-banner">' +
        '<div class="wb-profile">' + UI.avatar(st.name, st.color, 'lg') +
          '<div class="wb-meta">' +
            '<div class="n">Welcome back, ' + UI.esc(st.name.split(' ')[0]) + ' 👋</div>' +
            (st.headline ? '<div style="color:rgba(255,255,255,0.92);font-size:13.5px;font-weight:500;margin:2px 0">' + UI.esc(st.headline) + '</div>' : '') +
            '<div class="m">' + UI.esc(st.enrollment) + ' · ' + UI.esc(st.branch) + ' · ' + UI.esc(st.year || st.semester) + ' · ' + UI.esc(st.academicYear) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="flex-center">' +
          '<a class="btn btn-primary" href="#/student/add">' + icon('plusCircle', 16) + 'Add Activity</a>' +
          '<a class="btn" style="background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.22)" href="#/student/portfolio">' + icon('award', 16) + 'View Portfolio</a>' +
        '</div>' +
      '</div>' +

      '<div class="stat-grid cols-4 mb-24">' +
        statCard('layers', 'tone-royal', stats.total, 'Total Activities', 'All submissions this year') +
        statCard('checkCircle', 'tone-green', stats.verified, 'Verified', 'Approved by faculty') +
        statCard('clock', 'tone-amber', stats.pending, 'Pending', 'Awaiting verification') +
        statCard('xCircle', 'tone-red', stats.rejected, 'Rejected', 'Needs your action') +
      '</div>' +

      '<div class="quick-actions mb-24">' +
        quickAction('plusCircle', 'tone-royal', 'Add Activity', 'Submit a new record', '#/student/add') +
        quickAction('award', 'tone-green', 'View Portfolio', 'Verified achievements', '#/student/portfolio') +
        quickAction('fileText', 'tone-violet', 'Build Resume', 'Auto from verified', '#/student/resume') +
        quickAction('user', 'tone-amber', 'Edit Profile', 'Summary & links', '#/student/profile') +
      '</div>' +

      '<div class="two-col">' +
        '<div>' +
          '<div class="section-title">Recent activity' +
            '<span class="link" data-goto="#/student/activities">View all' + icon('arrowRight', 14) + '</span>' +
          '</div>' +
          '<div class="card">' +
            '<div class="filter-bar" style="margin:0;border:0;border-bottom:1px solid var(--border);border-radius:0;box-shadow:none">' +
              '<div class="search-field">' + icon('search', 15) +
                '<input class="input" type="search" placeholder="Search activities…" data-filter="search" />' +
              '</div>' +
              categorySelect('all') +
              statusSelect('all') +
            '</div>' +
            '<div id="recentTable">' + UI.loading('Loading your activities…') + '</div>' +
          '</div>' +
        '</div>' +

        '<div>' +
          '<div class="section-title">Recent notifications' +
            '<span class="link" data-goto="#/student/notifications">View all' + icon('arrowRight', 14) + '</span>' +
          '</div>' +
          '<div class="notif-list mb-24">' +
            (notifications.length ? notifications.map(notifHTML).join('') :
              UI.empty({ icon: 'bell', title: 'No notifications', message: 'Verification updates will appear here.' })) +
          '</div>' +

          '<div class="section-title">Faculty remarks</div>' +
          '<div class="card card-pad">' +
            (remarks.length ? remarks.map(function (r) {
              return '<div class="remark">' +
                '<div class="r-head"><strong>' + UI.esc(r.activityName) + '</strong><span>' + UI.fmtDate(r.at) + '</span></div>' +
                '<div>' + UI.esc(r.remarks) + '</div>' +
                '<div class="mt-8">' + UI.statusBadge(r.status) + ' <span class="text-small text-muted">— ' + UI.esc(r.reviewer) + '</span></div>' +
              '</div>';
            }).join('') : '<div class="text-small text-muted">No remarks yet. Faculty feedback will show up here after review.</div>') +
          '</div>' +
        '</div>' +
      '</div>';

    // Wire table with filters
    const tableHost = root.querySelector('#recentTable');
    const filters = { search: '', category: 'all', status: 'all' };

    function paint() {
      const rows = AS.query({ studentId: st.id, search: filters.search, category: filters.category, status: filters.status }).slice(0, 8);
      tableHost.innerHTML = activityTable(rows, {
        emptyTitle: 'No matching activities',
        emptyMessage: 'Try different search terms or clear the filters.'
      });
    }

    setTimeout(paint, 260);

    root.querySelectorAll('[data-filter]').forEach(function (el) {
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', UI.debounce(function () {
        filters[el.getAttribute('data-filter')] = el.value;
        paint();
      }, 200));
    });

    UI.delegate(root, 'click', '[data-view]', function (e, btn) {
      detailModal(AS.byId(btn.getAttribute('data-view')));
    });
    UI.delegate(root, 'click', '[data-goto]', function (e, el) { location.hash = el.getAttribute('data-goto'); });

    Charts.bind(root);
  }

  function statCard(ic, tone, value, label, foot) {
    return '<div class="stat-card">' +
      '<span class="stat-icon ' + tone + '">' + icon(ic, 21) + '</span>' +
      '<div><div class="stat-value">' + value + '</div><div class="stat-label">' + UI.esc(label) + '</div>' +
      '<div class="stat-foot">' + UI.esc(foot) + '</div></div>' +
    '</div>';
  }

  function quickAction(ic, tone, title, sub, href) {
    return '<a class="quick-action" href="' + href + '">' +
      '<span class="qa-ic ' + tone + '">' + icon(ic, 19) + '</span>' +
      '<span><span class="qa-t">' + UI.esc(title) + '</span><br/><span class="qa-s">' + UI.esc(sub) + '</span></span>' +
    '</a>';
  }

  function notifHTML(n) {
    const toneMap = { approved: 'tone-green', rejected: 'tone-red', pending: 'tone-amber', system: 'tone-royal' };
    const iconMap = { approved: 'checkCircle', rejected: 'xCircle', pending: 'clock', system: 'info' };
    return '<div class="notif' + (n.read ? '' : ' unread') + '" data-notif="' + n.id + '">' +
      '<span class="n-ic ' + (toneMap[n.type] || 'tone-royal') + '">' + icon(iconMap[n.type] || 'info', 16) + '</span>' +
      '<div><div class="n-title">' + UI.esc(n.title) + '</div>' +
      '<div class="n-body">' + UI.esc(n.body) + '</div>' +
      '<div class="n-time">' + UI.fmtDate(n.createdAt) + '</div></div>' +
      (n.read ? '' : '<span class="n-actions"><button class="btn btn-sm btn-ghost" type="button" data-read="' + n.id + '">Mark read</button></span>') +
    '</div>';
  }

  /* =========================================================
     ADD ACTIVITY
     ========================================================= */
  function renderAddActivity(root, ctx) {
    const st = student();
    let selectedFile = null;

    const qParams = new URLSearchParams(location.hash.split('?')[1] || '');
    const preTitle = qParams.get('title') || '';
    const preOrg = qParams.get('org') || '';
    const preCertId = qParams.get('certId') || '';
    const preDate = qParams.get('date') || '';

    root.innerHTML =
      '<div class="form-shell">' +
        '<div class="page-head">' +
          '<div><h1>Add Activity</h1>' +
          '<p class="page-desc">Submit a new achievement or participation record. It will be marked <strong>Pending</strong> until an authorized faculty verifier reviews your proof.</p></div>' +
        '</div>' +

        (preCertId ?
          '<div class="callout success mb-16">' + icon('checkCircle', 17) +
            '<div><strong>Imported from Verified Certificate:</strong> Certificate ID <code>' + UI.esc(preCertId) + '</code> was verified and details have been pre-filled.</div>' +
          '</div>' : '') +

        '<div class="callout info mb-16">' + icon('info', 17) +
          '<div><strong>Demo submission:</strong> files are validated and previewed in your browser only — nothing is uploaded to a server. Attach a PDF, JPG or PNG under 5 MB.</div>' +
        '</div>' +

        '<form id="activityForm" class="card card-pad" novalidate>' +
          '<div class="form-grid">' +
            '<div class="field span-2" id="fName">' +
              '<label for="actName">Activity Name<span class="req">*</span></label>' +
              '<input class="input" id="actName" type="text" placeholder="e.g. Smart India Hackathon — Internal Round" value="' + UI.esc(preTitle) + '" />' +
              '<div class="error-text">Activity name is required.</div>' +
            '</div>' +

            '<div class="field" id="fCategory">' +
              '<label for="actCategory">Activity Category<span class="req">*</span></label>' +
              '<select class="select" id="actCategory">' +
                '<option value="">Select category…</option>' +
                global.MockData.CATEGORIES.map(function (c) { return '<option value="' + UI.esc(c) + '">' + UI.esc(c) + '</option>'; }).join('') +
              '</select>' +
              '<div class="error-text">Please select a category.</div>' +
            '</div>' +

            '<div class="field" id="fOrg">' +
              '<label for="actOrg">Organization / College / Club<span class="req">*</span></label>' +
              '<input class="input" id="actOrg" type="text" placeholder="e.g. Institution Innovation Council" value="' + UI.esc(preOrg) + '" />' +
              '<div class="error-text">Organization is required.</div>' +
            '</div>' +

            '<div class="field" id="fDate">' +
              '<label for="actDate">Event Date<span class="req">*</span></label>' +
              '<input class="input" id="actDate" type="date" value="' + UI.esc(preDate) + '" max="' + new Date().toISOString().slice(0, 10) + '" />' +
              '<div class="error-text">Event date is required.</div>' +
            '</div>' +

            '<div class="field">' +
              '<label for="actRole">Participation Role</label>' +
              '<select class="select" id="actRole">' +
                global.MockData.ROLES.map(function (r) { return '<option value="' + UI.esc(r) + '">' + UI.esc(r) + '</option>'; }).join('') +
              '</select>' +
            '</div>' +

            '<div class="field span-2">' +
              '<label for="actResult">Achievement / Result</label>' +
              '<input class="input" id="actResult" type="text" placeholder="e.g. Winner — 1st Place, or Participation Certificate" />' +
            '</div>' +

            '<div class="field span-2">' +
              '<label for="actDesc">Short Description</label>' +
              '<textarea class="input" id="actDesc" rows="3" maxlength="400" placeholder="Describe the event, your contribution and outcomes (optional)."></textarea>' +
              '<div class="hint"><span id="descCount">0</span>/400 characters</div>' +
            '</div>' +

            '<div class="field span-2" id="fFile">' +
              '<label>Certificate / Proof Upload <span class="text-muted">(PDF, JPG, PNG · max 5 MB)</span></label>' +
              '<div class="drop-zone" id="dropZone" tabindex="0" role="button" aria-label="Upload certificate">' +
                '<div class="dz-ic">' + icon('upload', 22) + '</div>' +
                '<div class="dz-t">Click to choose a file or drag it here</div>' +
                '<div class="dz-s">Accepted: .pdf, .jpg, .jpeg, .png — maximum 5 MB</div>' +
              '</div>' +
              '<input type="file" id="fileInput" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" class="hidden" />' +
              '<div id="filePreview"></div>' +
              '<div class="error-text" id="fileError">Invalid file.</div>' +
            '</div>' +

            '<div class="field span-2">' +
              '<div class="flex-between mb-4">' +
                '<label for="actCertId" style="margin:0">Certificate ID <span class="text-muted">(optional)</span></label>' +
                '<a href="#/student/verify-cert" class="text-small text-primary" style="font-size:12px;font-weight:600">' +
                  icon('shield', 13) + ' Verify Certificate First ↗' +
                '</a>' +
              '</div>' +
              '<input class="input mono" id="actCertId" type="text" placeholder="e.g. CC-2026-0042, IEEE-CS-2026-8812" value="' + UI.esc(preCertId) + '" />' +
              '<div class="hint">If left empty, a CampusCred certificate ID is issued when faculty approves the record.</div>' +
            '</div>' +
          '</div>' +

          '<div class="form-actions">' +
            '<a class="btn btn-outline" href="#/student/activities">Cancel</a>' +
            '<button class="btn btn-primary btn-lg" type="submit" id="submitBtn">' + icon('send', 16) + 'Submit for Verification</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    /* file handling */
    const dropZone = root.querySelector('#dropZone');
    const fileInput = root.querySelector('#fileInput');
    const filePreview = root.querySelector('#filePreview');
    const fileError = root.querySelector('#fileError');

    const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];
    const MAX = 5 * 1024 * 1024;

    function showFile(file) {
      const f = file;
      if (ALLOWED.indexOf(f.type) === -1) {
        selectedFile = null;
        filePreview.innerHTML = '';
        root.querySelector('#fFile').classList.add('has-error');
        fileError.textContent = 'Unsupported file type: ' + (f.type || 'unknown') + '. Use PDF, JPG or PNG.';
        UI.error('Invalid file type', 'Only PDF, JPG and PNG files are accepted.');
        return;
      }
      if (f.size > MAX) {
        selectedFile = null;
        filePreview.innerHTML = '';
        root.querySelector('#fFile').classList.add('has-error');
        fileError.textContent = 'File is ' + UI.fmtSize(f.size) + ' — the limit is 5 MB.';
        UI.error('File too large', 'Maximum allowed size is 5 MB.');
        return;
      }
      root.querySelector('#fFile').classList.remove('has-error');
      selectedFile = { fileName: f.name, fileType: f.type, fileSize: f.size, dataUrl: null };

      // Read file as data URL so it can be previewed everywhere
      const reader = new FileReader();
      reader.onload = function () {
        selectedFile.dataUrl = reader.result;
        paintPreview();
      };
      reader.onerror = function () {
        paintPreview();
      };
      reader.readAsDataURL(f);
    }

    function paintPreview() {
      if (!selectedFile) { filePreview.innerHTML = ''; return; }
      const isImg = selectedFile.fileType && (selectedFile.fileType.indexOf('image') !== -1 || (selectedFile.dataUrl && selectedFile.dataUrl.indexOf('data:image') === 0));
      const isPdf = selectedFile.fileType && (selectedFile.fileType.indexOf('pdf') !== -1 || (selectedFile.dataUrl && selectedFile.dataUrl.indexOf('data:application/pdf') === 0));
      let previewSnippet = '';
      if (selectedFile.dataUrl) {
        if (isImg) {
          previewSnippet = '<div style="margin-top:12px;text-align:center"><img src="' + selectedFile.dataUrl + '" alt="Certificate preview" style="max-height:240px;border:1px solid var(--border);border-radius:10px;box-shadow:var(--shadow-xs)" /></div>';
        } else if (isPdf) {
          previewSnippet = '<div style="margin-top:12px"><iframe src="' + selectedFile.dataUrl + '" style="width:100%;height:220px;border:1px solid var(--border);border-radius:8px;background:#fff"></iframe></div>';
        }
      }
      filePreview.innerHTML =
        '<div class="file-chip">' +
          '<span class="f-ic">' + icon('fileText', 18) + '</span>' +
          '<div><div class="f-name">' + UI.esc(selectedFile.fileName) + '</div>' +
          '<div class="f-meta">' + UI.esc(selectedFile.fileType) + ' · ' + UI.fmtSize(selectedFile.fileSize) + ' · Ready to submit</div></div>' +
          '<span class="f-actions"><button class="btn btn-sm btn-ghost text-danger" type="button" id="removeFile">' + icon('trash', 15) + 'Remove</button></span>' +
        '</div>' +
        previewSnippet;
      const rm = document.getElementById('removeFile');
      if (rm) rm.addEventListener('click', function () {
        selectedFile = null; fileInput.value = ''; paintPreview();
        UI.info('File removed', 'You can attach a different certificate.');
      });
    }

    dropZone.addEventListener('click', function () { fileInput.click(); });
    dropZone.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
    fileInput.addEventListener('change', function () { if (fileInput.files[0]) showFile(fileInput.files[0]); });
    ['dragenter', 'dragover'].forEach(function (ev) {
      dropZone.addEventListener(ev, function (e) { e.preventDefault(); dropZone.classList.add('drag'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dropZone.addEventListener(ev, function (e) { e.preventDefault(); dropZone.classList.remove('drag'); });
    });
    dropZone.addEventListener('drop', function (e) {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        showFile(e.dataTransfer.files[0]);
      }
    });

    const desc = root.querySelector('#actDesc');
    desc.addEventListener('input', function () { root.querySelector('#descCount').textContent = desc.value.length; });

    /* submit */
    root.querySelector('#activityForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const name = root.querySelector('#actName').value.trim();
      const category = root.querySelector('#actCategory').value;
      const org = root.querySelector('#actOrg').value.trim();
      const date = root.querySelector('#actDate').value;

      let ok = true;
      function mark(id, bad) { root.querySelector(id).classList.toggle('has-error', bad); if (bad) ok = false; }
      mark('#fName', !name);
      mark('#fCategory', !category);
      mark('#fOrg', !org);
      mark('#fDate', !date);

      if (!ok) {
        UI.warning('Missing required fields', 'Please complete the highlighted fields.');
        const firstErr = root.querySelector('.field.has-error');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const btn = root.querySelector('#submitBtn');
      btn.classList.add('is-disabled');
      btn.innerHTML = '<span class="spinner"></span> Submitting…';

      AS.create({
        name: name,
        category: category,
        organization: org,
        date: date,
        role: root.querySelector('#actRole').value,
        result: root.querySelector('#actResult').value.trim(),
        description: desc.value.trim(),
        certificateId: root.querySelector('#actCertId').value.trim(),
        proof: selectedFile || { fileName: '', fileType: '', fileSize: 0, dataUrl: null }
      }, student()).then(function (act) {
        showSuccess(act);
      }).catch(function (err) {
        UI.error('Submission failed', err.message);
        btn.classList.remove('is-disabled');
        btn.innerHTML = icon('send', 16) + 'Submit for Verification';
      });
    });

    function showSuccess(act) {
      UI.success('Submitted for verification', '“' + act.name + '” is now pending faculty review.');
      root.innerHTML =
        '<div class="form-shell"><div class="card card-pad">' +
          '<div class="success-screen">' +
            '<div class="ss-ic">' + icon('checkCircle', 44) + '</div>' +
            '<h2>Submission received!</h2>' +
            '<p>Your activity <strong>' + UI.esc(act.name) + '</strong> has been submitted and is now <strong>Pending</strong> faculty verification. You will be notified when a verifier reviews it.</p>' +
            '<div class="ss-ref">' +
              '<div class="lbl">Submission reference</div>' +
              '<div class="val">' + UI.esc(act.id) + '</div>' +
              '<div class="mt-8">' + UI.statusBadge('pending') + '</div>' +
            '</div>' +
            '<div class="ss-actions">' +
              '<a class="btn btn-primary" href="#/student/activities">' + icon('list', 16) + 'View My Activities</a>' +
              '<a class="btn btn-outline" href="#/student/add">' + icon('plusCircle', 16) + 'Add Another</a>' +
              '<a class="btn btn-ghost" href="#/student/dashboard">Back to Dashboard</a>' +
            '</div>' +
          '</div>' +
        '</div></div>';
    }
  }

  /* =========================================================
     MY ACTIVITIES
     ========================================================= */
  function renderMyActivities(root, ctx) {
    const st = student();
    const q = ctx.query || {};

    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>My Activities</h1>' +
        '<p class="page-desc">Every submission you have made, with its current verification status. Only <strong>verified</strong> records appear in your portfolio and resume.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-outline" type="button" id="exportBtn">' + icon('download', 16) + 'Export CSV</button>' +
          '<a class="btn btn-primary" href="#/student/add">' + icon('plusCircle', 16) + 'Add Activity</a>' +
        '</div>' +
      '</div>' +

      '<div class="filter-bar">' +
        '<div class="search-field">' + icon('search', 15) +
          '<input class="input" type="search" placeholder="Search by name, organization, certificate ID…" data-filter="search" value="' + UI.esc(q.search || '') + '" />' +
        '</div>' +
        categorySelect(q.category || 'all') +
        statusSelect(q.status || 'all') +
        '<button class="btn btn-sm btn-outline clear-btn" type="button" id="clearBtn">' + icon('refresh', 14) + 'Reset filters</button>' +
      '</div>' +

      '<div class="stat-grid cols-4 mb-16" id="miniStats"></div>' +

      '<div class="card"><div id="actTable">' + UI.loading('Loading your activities…') + '</div></div>';

    const filters = { search: q.search || '', category: q.category || 'all', status: q.status || 'all' };
    const tableHost = root.querySelector('#actTable');
    const statsHost = root.querySelector('#miniStats');

    function paint() {
      const rows = AS.query({ studentId: st.id, search: filters.search, category: filters.category, status: filters.status });
      const verified = rows.filter(function (a) { return a.status === 'verified'; }).length;
      const pending = rows.filter(function (a) { return a.status === 'pending'; }).length;
      const rejected = rows.filter(function (a) { return a.status === 'rejected'; }).length;
      statsHost.innerHTML =
        statCard('list', 'tone-royal', rows.length, 'Matching records', 'Current filter results') +
        statCard('checkCircle', 'tone-green', verified, 'Verified', 'In your portfolio') +
        statCard('clock', 'tone-amber', pending, 'Pending', 'Awaiting review') +
        statCard('xCircle', 'tone-red', rejected, 'Rejected', 'Needs attention');

      tableHost.innerHTML = activityTable(rows, {
        allowDelete: true,
        emptyTitle: 'No activities match these filters',
        emptyMessage: 'Clear the filters or submit a new achievement to get started.',
        emptyAction: 'Add Activity'
      });
      const emptyBtn = tableHost.querySelector('[data-empty-action]');
      if (emptyBtn) emptyBtn.addEventListener('click', function () { location.hash = '#/student/add'; });
    }

    setTimeout(paint, 240);

    root.querySelectorAll('[data-filter]').forEach(function (el) {
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', UI.debounce(function () {
        filters[el.getAttribute('data-filter')] = el.value;
        paint();
      }, 200));
    });

    root.querySelector('#clearBtn').addEventListener('click', function () {
      root.querySelector('[data-filter="search"]').value = '';
      root.querySelector('[data-filter="category"]').value = 'all';
      root.querySelector('[data-filter="status"]').value = 'all';
      filters.search = ''; filters.category = 'all'; filters.status = 'all';
      paint();
      UI.info('Filters cleared', 'Showing all your activities.');
    });

    root.querySelector('#exportBtn').addEventListener('click', function () {
      const rows = AS.query({ studentId: st.id, search: filters.search, category: filters.category, status: filters.status });
      if (!rows.length) { UI.warning('Nothing to export', 'No records match the current filters.'); return; }
      CC.ReportService.downloadCSV('campuscred-my-activities.csv', CC.ReportService.toCSV(rows));
      UI.success('Export started', 'Your CSV download has begun.');
    });

    UI.delegate(root, 'click', '[data-view]', function (e, btn) { detailModal(AS.byId(btn.getAttribute('data-view'))); });
    UI.delegate(root, 'click', '[data-del]', function (e, btn) {
      const id = btn.getAttribute('data-del');
      UI.confirm({
        title: 'Delete this submission?',
        message: 'Only pending submissions can be deleted. This removes the record from your list permanently.',
        acceptText: 'Delete', tone: 'danger'
      }).then(function (ok) {
        if (!ok) return;
        AS.remove(id).then(function () {
          UI.success('Deleted', 'The pending submission was removed.');
          paint();
        }).catch(function (err) { UI.error('Cannot delete', err.message); });
      });
    });
  }

  /* =========================================================
     PORTFOLIO
     ========================================================= */
  const CATEGORY_GROUPS = ['Hackathon', 'Technical', 'Sports', 'Cultural', 'Certification', 'Workshop', 'Other'];
  const GROUP_ICON = {
    Hackathon: ['zap', 'tone-royal'], Technical: ['settings', 'tone-violet'], Sports: ['trophy', 'tone-green'],
    Cultural: ['star', 'tone-amber'], Certification: ['shield', 'tone-green'], Workshop: ['book', 'tone-royal'],
    Other: ['folder', 'tone-navy']
  };

  function achievementCard(a, opts) {
    const cls = a.status === 'pending' ? ' pending-card' : a.status === 'rejected' ? ' rejected-card' : '';
    return '<div class="ach-card' + cls + '" data-view-act="' + a.id + '" style="cursor:pointer" title="Click to view details and original certificate">' +
      '<div class="ac-top">' +
        '<h5>' + UI.esc(a.name) + '</h5>' +
        (a.status === 'verified' ? '<span class="verified-stamp">' + icon('check', 11) + 'Verified</span>' : UI.statusBadge(a.status)) +
      '</div>' +
      '<div class="ac-org">' + icon('building', 14) + UI.esc(a.organization) + '</div>' +
      '<div class="text-small text-muted">' + UI.esc(a.role) + ' · ' + UI.esc(a.result) + '</div>' +
      '<div class="ac-foot">' +
        '<span>' + icon('calendar', 13) + ' ' + UI.fmtDate(a.date) + '</span>' +
        (a.certificateId ? '<span class="mono text-xs">' + UI.esc(a.certificateId) + '</span>' : '') +
      '</div>' +
      (a.status === 'rejected' && a.remarks ? '<div class="text-small text-danger">' + icon('alert', 13) + ' ' + UI.esc(a.remarks) + '</div>' : '') +
      (opts && opts.footer || '') +
    '</div>';
  }

  /* =========================================================
     STUDENT CERTIFICATE VERIFICATION (TRI-STATE)
     ========================================================= */
  function renderVerifyCert(root, ctx) {
    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Certificate Verifier</h1>' +
        '<p class="page-desc">Validate your certificates and official credentials against CampusCred and accredited registries (IEEE, SIH, NPTEL, AWS, AICTE). Authenticated certificates can be imported directly into your achievements record.</p></div>' +
        '<div class="page-actions">' +
          '<a class="btn btn-primary" href="#/student/add">' + icon('plusCircle', 16) + 'Add Activity</a>' +
        '</div>' +
      '</div>' +

      '<div class="two-col">' +
        '<div>' +
          '<div class="card card-pad mb-16">' +
            '<div class="section-title">' + icon('shield', 16) + ' Verify by Certificate ID</div>' +
            '<div class="flex gap-8 mb-16">' +
              '<input class="input mono" id="stuCertInput" placeholder="e.g. CC-2026-0042, IEEE-CS-2026-8812" style="font-size:13.5px" />' +
              '<button class="btn btn-primary" type="button" id="stuCertSearchBtn" style="white-space:nowrap">' +
                icon('search', 15) + ' Verify ID' +
              '</button>' +
            '</div>' +

            '<div class="section-title">' + icon('upload', 16) + ' Upload Certificate Document</div>' +
            '<input type="file" id="stuCertFileInput" accept=".pdf,.png,.jpg,.jpeg" style="display:none" />' +
            '<div class="drop-zone" id="stuDropZone" style="padding:22px;text-align:center;cursor:pointer;border:1.5px dashed var(--border);border-radius:10px;background:var(--bg-subtle)">' +
              '<div class="dz-ic" style="color:var(--royal-600);margin-bottom:6px">' + icon('upload', 28) + '</div>' +
              '<div class="dz-t" style="font-weight:700">Drop certificate here or click to browse</div>' +
              '<div class="dz-s text-small text-muted mt-2">Supports PDF, PNG, JPG files containing certificate IDs or QR codes</div>' +
              '<div id="stuFileName" class="text-small font-bold text-primary mt-6"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div>' +
          '<div id="stuVerifyResult">' +
            '<div class="callout info">' + icon('info', 18) +
              '<div><strong>Verification Statuses Explained:</strong><br/>' +
              '• <strong style="color:#16A34A">Verified:</strong> Authentic record anchored in CampusCred or recognized issuer ledgers.<br/>' +
              '• <strong style="color:#DC2626">Invalid:</strong> Tampered signature or explicitly revoked credentials.<br/>' +
              '• <strong style="color:#D97706">Unable to Verify:</strong> Missing cryptographic watermark. Requires manual submission to faculty.</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    const input = root.querySelector('#stuCertInput');
    const searchBtn = root.querySelector('#stuCertSearchBtn');
    const resultHost = root.querySelector('#stuVerifyResult');
    const fileInput = root.querySelector('#stuCertFileInput');
    const dropZone = root.querySelector('#stuDropZone');
    const fileNameDiv = root.querySelector('#stuFileName');

    function renderStuResult(res) {
      if (res.status === 'verified') {
        resultHost.innerHTML =
          '<div class="result-card verified mb-16">' +
            '<div class="result-head">' +
              '<span class="rh-ic" style="color:#16A34A">' + icon('checkCircle', 32) + '</span>' +
              '<div><div class="badge badge-verified mb-4">STATUS: VERIFIED</div>' +
              '<h3 style="color:#15803D;margin:0 0 2px">OFFICIALLY VERIFIED</h3>' +
              '<div class="rh-s">Certificate <span class="mono font-bold">' + UI.esc(res.certificateId) + '</span> is authentic.</div></div>' +
            '</div>' +
            '<div class="result-body">' +
              '<dl class="dl">' +
                '<dt>Recipient</dt><dd><strong>' + UI.esc(res.studentName) + '</strong></dd>' +
                '<dt>Enrollment / ID</dt><dd class="mono">' + UI.esc(res.enrollment) + '</dd>' +
                '<dt>Achievement</dt><dd><strong>' + UI.esc(res.activity) + '</strong></dd>' +
                '<dt>Issuing Authority</dt><dd>' + UI.esc(res.organization || res.issuer) + '</dd>' +
                '<dt>Event Date</dt><dd>' + UI.fmtDate(res.eventDate) + '</dd>' +
                '<dt>Result / Award</dt><dd>' + UI.esc(res.result) + '</dd>' +
                '<dt>Certificate ID</dt><dd class="mono font-bold" style="color:#2563EB">' + UI.esc(res.certificateId) + '</dd>' +
                '<dt>Trust Authority</dt><dd>' + UI.esc(res.issuer) + '</dd>' +
              '</dl>' +
              '<div class="mt-16 pt-14 flex gap-8" style="border-top:1px solid var(--border)">' +
                '<a class="btn btn-primary btn-sm" href="#/student/add?title=' + encodeURIComponent(res.activity) + '&org=' + encodeURIComponent(res.organization || res.issuer) + '&certId=' + encodeURIComponent(res.certificateId) + '&date=' + encodeURIComponent(res.eventDate) + '">' +
                  icon('plusCircle', 14) + ' Import into My Activities' +
                '</a>' +
                '<a class="btn btn-outline btn-sm" href="#/verify/' + encodeURIComponent(res.certificateId) + '" target="_blank">' +
                  icon('externalLink', 14) + ' Public Verification Link' +
                '</a>' +
              '</div>' +
            '</div>' +
          '</div>';
      } else if (res.status === 'invalid') {
        resultHost.innerHTML =
          '<div class="result-card invalid mb-16">' +
            '<div class="result-head">' +
              '<span class="rh-ic" style="color:#DC2626">' + icon('xCircle', 32) + '</span>' +
              '<div><div class="badge badge-rejected mb-4">STATUS: INVALID</div>' +
              '<h3 style="color:#B91C1C;margin:0 0 2px">INVALID / REVOKED</h3>' +
              '<div class="rh-s">Certificate <span class="mono font-bold">' + UI.esc(res.certificateId) + '</span> cannot be accepted.</div></div>' +
            '</div>' +
            '<div class="result-body">' +
              '<div class="callout danger mb-14">' + icon('alert', 18) +
                '<div><strong>Notice:</strong> ' + UI.esc(res.reason || 'Cryptographic signature mismatch.') + '</div>' +
              '</div>' +
              '<p class="text-small text-muted">' + UI.esc(res.actionRecommendation || 'Do not submit fraudulent documents.') + '</p>' +
            '</div>' +
          '</div>';
      } else {
        // unable_to_verify
        resultHost.innerHTML =
          '<div class="result-card mb-16" style="border:1.5px solid #F59E0B;background:#FFFDF7">' +
            '<div class="result-head" style="border-bottom:1px solid #FDE68A;background:#FEF3C7">' +
              '<span class="rh-ic" style="color:#D97706">' + icon('alert', 32) + '</span>' +
              '<div><div class="badge badge-pending mb-4" style="background:#FDE68A;color:#92400E">STATUS: UNABLE TO VERIFY</div>' +
              '<h3 style="color:#B45309;margin:0 0 2px">UNABLE TO VERIFY AUTHENTICITY</h3>' +
              '<div class="rh-s">Document could not be validated against automated registries.</div></div>' +
            '</div>' +
            '<div class="result-body">' +
              '<div class="callout warn mb-14">' + icon('info', 18) +
                '<div><strong>Reason:</strong> ' + UI.esc(res.reason) + '</div>' +
              '</div>' +
              '<p class="text-small text-muted mb-12">' + UI.esc(res.actionRecommendation) + '</p>' +
              '<a class="btn btn-sm btn-primary" href="#/student/add">' + icon('plusCircle', 14) + ' Submit for Manual Faculty Review</a>' +
            '</div>' +
          '</div>';
      }
    }

    function runStuVerify(queryObj) {
      resultHost.innerHTML = UI.loading('Authenticating certificate credentials…');
      CC.CertificateService.verifyCertificate(queryObj).then(function (res) {
        renderStuResult(res);
        if (res.status === 'verified') UI.success('Verified', 'Authentic certificate verified.');
        else if (res.status === 'invalid') UI.error('Invalid', 'Certificate revoked or flagged.');
        else UI.warning('Unable to Verify', 'Requires manual review by faculty.');
      }).catch(function (err) { UI.error('Verification failed', err.message); });
    }

    searchBtn.addEventListener('click', function () {
      const val = input.value.trim();
      if (!val) { UI.warning('Enter ID', 'Type a certificate ID to verify.'); input.focus(); return; }
      runStuVerify(val);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        if (val) runStuVerify(val);
      }
    });

    dropZone.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      fileNameDiv.textContent = 'Selected: ' + file.name;
      UI.info('Analyzing Certificate', 'Checking ' + file.name + ' for digital signatures…');
      if (CC.ATSService && CC.ATSService.parseFile) {
        CC.ATSService.parseFile(file).then(function (parsed) {
          runStuVerify({ file: file, extractedText: parsed.text });
        }).catch(function () {
          runStuVerify({ file: file });
        });
      } else {
        runStuVerify({ file: file });
      }
    });

  }

  function renderPortfolio(root, ctx) {
    const st = student();
    const stats = AS.statsFor(st.id);
    const all = AS.forStudent(st.id);
    const verified = all.filter(function (a) { return a.status === 'verified'; });
    const pending = all.filter(function (a) { return a.status === 'pending'; });
    const rejected = all.filter(function (a) { return a.status === 'rejected'; });
    const links = PS.links(st.id);
    const publicUrl = location.href.split('#')[0] + '#/portfolio/' + st.id;
    const credSettings = PS.getCredentialsSettings(st.id);
    const credPublicUrl = location.href.split('#')[0] + '#/credentials/' + encodeURIComponent(credSettings.shareableSlug);

    let groupsHTML = '';
    CATEGORY_GROUPS.forEach(function (cat) {
      const items = verified.filter(function (a) { return a.category === cat; });
      if (!items.length) return;
      const meta = GROUP_ICON[cat];
      groupsHTML +=
        '<div class="ach-group">' +
          '<div class="ag-head">' +
            '<span class="ag-ic ' + meta[1] + '">' + icon(meta[0], 17) + '</span>' +
            '<h4>' + UI.esc(cat) + '</h4>' +
            '<span class="ag-count">' + items.length + ' verified record' + (items.length > 1 ? 's' : '') + '</span>' +
          '</div>' +
          '<div class="ach-grid">' + items.map(function (a) { return achievementCard(a); }).join('') + '</div>' +
        '</div>';
    });

    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>My Portfolio</h1>' +
        '<p class="page-desc">Your verified digital achievement record. Only faculty-approved entries are shown as verified — pending and rejected submissions are kept separate.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-outline" type="button" id="copyLink">' + icon('copy', 16) + 'Copy portfolio link</button>' +
          '<a class="btn btn-primary" href="#/portfolio/' + st.id + '" target="_blank" rel="noopener">' + icon('externalLink', 16) + 'Public preview</a>' +
        '</div>' +
      '</div>' +

      '<div class="profile-hero mb-24">' +
        UI.avatar(st.name, st.color, 'xl') +
        '<div class="ph-meta">' +
          '<h2>' + UI.esc(st.name) + '</h2>' +
          (st.headline ? '<div style="font-size:14px;font-weight:600;color:var(--text-800);margin-bottom:4px">' + UI.esc(st.headline) + '</div>' : '') +
          '<div class="ph-sub">' + UI.esc(st.course) + ' · ' + UI.esc(st.branch) + ' — ' + UI.esc(st.department) + '</div>' +
          '<div class="ph-chips">' +
            '<span class="chip mono">' + UI.esc(st.enrollment) + '</span>' +
            '<span class="chip">' + UI.esc(st.year || st.semester) + '</span>' +
            '<span class="chip">AY ' + UI.esc(st.academicYear) + '</span>' +
            (st.phone ? '<span class="chip mono">' + icon('smartphone', 12) + ' ' + UI.esc(st.phone) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="text-center">' +
          '<span class="verified-pill">' + icon('shield', 15) + stats.verified + ' College-verified achievements</span>' +
          '<div class="text-small mt-8" style="color:#93A7C7">Last updated ' + UI.fmtDate(CC.Store.today()) + '</div>' +
        '</div>' +
      '</div>' +

      '<!-- Public Credentials & Shareable Link Card -->' +
      '<div class="card card-pad mb-24" style="border:1.5px solid var(--border);border-radius:12px;background:var(--bg-card)">' +
        '<div class="flex-between mb-12" style="align-items:center;flex-wrap:wrap;gap:10px">' +
          '<div>' +
            '<h3 style="margin:0;font-size:17px;display:flex;align-items:center;gap:8px">' +
              icon('link', 18) + ' Public Credentials &amp; Shareable Link' +
            '</h3>' +
            '<div class="text-small text-muted mt-2">' +
              'Share your verified credentials, certificates, resume, and skills with recruiters via a unique public link.' +
            '</div>' +
          '</div>' +
          '<div class="flex gap-8" style="align-items:center">' +
            '<span id="credPrivacyBadge" class="badge ' + (credSettings.privacyMode === 'private' ? 'badge-rejected' : credSettings.privacyMode === 'unlisted' ? 'badge-pending' : 'badge-verified') + '">' +
              credSettings.privacyMode.toUpperCase() +
            '</span>' +
            '<a class="btn btn-sm btn-outline" id="previewCredLinkBtn" href="#/credentials/' + encodeURIComponent(credSettings.shareableSlug) + '" target="_blank" rel="noopener">' +
              icon('externalLink', 14) + ' Preview Credentials' +
            '</a>' +
          '</div>' +
        '</div>' +

        '<div class="flex gap-8 mb-16" style="align-items:center">' +
          '<input class="input mono" id="credShareUrlInput" readonly value="' + UI.esc(credPublicUrl) + '" style="font-size:13px;background:var(--bg-subtle)" />' +
          '<button class="btn btn-primary" type="button" id="copyCredShareBtn" style="white-space:nowrap;flex:none">' +
            icon('copy', 15) + ' Copy Link' +
          '</button>' +
        '</div>' +

        '<div class="two-col" style="gap:16px;border-top:1px solid var(--border);padding-top:14px">' +
          '<!-- Privacy Mode Selector -->' +
          '<div>' +
            '<div class="section-title mb-8">Privacy Mode</div>' +
            '<div style="display:grid;gap:8px">' +
              '<label class="radio-row" style="font-size:13px;cursor:pointer">' +
                '<input type="radio" name="credPrivacy" value="public"' + (credSettings.privacyMode === 'public' ? ' checked' : '') + ' />' +
                '<span><strong>🌐 Public:</strong> Listed &amp; discoverable by recruiters in directory</span>' +
              '</label>' +
              '<label class="radio-row" style="font-size:13px;cursor:pointer">' +
                '<input type="radio" name="credPrivacy" value="unlisted"' + (credSettings.privacyMode === 'unlisted' ? ' checked' : '') + ' />' +
                '<span><strong>🔗 Unlisted:</strong> Only accessible to anyone with your direct link</span>' +
              '</label>' +
              '<label class="radio-row" style="font-size:13px;cursor:pointer">' +
                '<input type="radio" name="credPrivacy" value="private"' + (credSettings.privacyMode === 'private' ? ' checked' : '') + ' />' +
                '<span><strong>🔒 Private:</strong> Credentials locked and hidden externally</span>' +
              '</label>' +
            '</div>' +
          '</div>' +

          '<!-- Modular Section Inclusion Controls -->' +
          '<div>' +
            '<div class="section-title mb-8">Sections Included in Public Link</div>' +
            '<div style="display:grid;gap:8px">' +
              '<label class="checkbox-row" style="font-size:13px;cursor:pointer">' +
                '<input type="checkbox" data-cred-field="includeCertificates"' + (credSettings.includeCertificates !== false ? ' checked' : '') + ' />' +
                '<span>Verified Certificates &amp; Accreditations (' + verified.length + ')</span>' +
              '</label>' +
              '<label class="checkbox-row" style="font-size:13px;cursor:pointer">' +
                '<input type="checkbox" data-cred-field="includeResume"' + (credSettings.includeResume !== false ? ' checked' : '') + ' />' +
                '<span>Professional Summary &amp; Resume Highlights</span>' +
              '</label>' +
              '<label class="checkbox-row" style="font-size:13px;cursor:pointer">' +
                '<input type="checkbox" data-cred-field="includeSkills"' + (credSettings.includeSkills !== false ? ' checked' : '') + ' />' +
                '<span>Core Technical Skills &amp; Competencies (' + (st.skills || []).length + ')</span>' +
              '</label>' +
              '<label class="checkbox-row" style="font-size:13px;cursor:pointer">' +
                '<input type="checkbox" data-cred-field="includeEducation"' + (credSettings.includeEducation !== false ? ' checked' : '') + ' />' +
                '<span>Academic Degree &amp; Education Records</span>' +
              '</label>' +
              '<label class="checkbox-row" style="font-size:13px;cursor:pointer">' +
                '<input type="checkbox" data-cred-field="includeProjects"' + (credSettings.includeProjects !== false ? ' checked' : '') + ' />' +
                '<span>Technical Projects (' + (st.projects || []).length + ')</span>' +
              '</label>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<!-- Student Profile Details Synced Across Sections -->' +
      (st.summary ?
        '<div class="card card-pad mb-24">' +
          '<div class="section-title">' + icon('user', 16) + ' Professional Summary / Bio</div>' +
          '<p class="text-medium" style="font-size:14.5px;line-height:1.7;margin:6px 0 0">' + UI.esc(st.summary) + '</p>' +
        '</div>' : '') +

      (st.skills && st.skills.length ?
        '<div class="card card-pad mb-24">' +
          '<div class="flex-between mb-8">' +
            '<div class="section-title">' + icon('zap', 16) + ' Core Technical &amp; Domain Skills</div>' +
            '<a class="text-small" href="#/student/profile">Edit in profile ' + icon('arrowRight', 12) + '</a>' +
          '</div>' +
          '<div class="flex gap-8" style="flex-wrap:wrap">' +
            st.skills.map(function (sk) {
              return '<span class="chip chip-royal" style="font-size:13px;padding:5px 12px">' + UI.esc(sk) + '</span>';
            }).join('') +
          '</div>' +
        '</div>' : '') +

      (st.education && st.education.length ?
        '<div class="card card-pad mb-24">' +
          '<div class="flex-between mb-10">' +
            '<div class="section-title">' + icon('graduation', 16) + ' Education History</div>' +
            '<a class="text-small" href="#/student/profile">Edit in profile ' + icon('arrowRight', 12) + '</a>' +
          '</div>' +
          '<div style="display:grid;gap:10px">' +
            st.education.map(function (ed) {
              return '<div style="padding:12px 14px;border:1px solid var(--border);border-radius:8px;background:var(--bg-subtle)">' +
                '<div class="flex-between">' +
                  '<div style="font-weight:700;font-size:14px;color:var(--text-900)">' + UI.esc(ed.level) + (ed.branch ? ' — ' + UI.esc(ed.branch) : '') + '</div>' +
                  '<div class="text-small text-muted mono">' + UI.esc(ed.from) + ' – ' + UI.esc(ed.to) + '</div>' +
                '</div>' +
                '<div class="text-small text-muted mt-2">' + UI.esc(ed.institute) + (ed.detail ? ' · ' + UI.esc(ed.detail) : '') + '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' : '') +

      (st.projects && st.projects.length ?
        '<div class="card card-pad mb-24">' +
          '<div class="flex-between mb-10">' +
            '<div class="section-title">' + icon('folder', 16) + ' Featured Technical Projects</div>' +
            '<a class="text-small" href="#/student/profile">Edit in profile ' + icon('arrowRight', 12) + '</a>' +
          '</div>' +
          '<div style="display:grid;gap:12px">' +
            st.projects.map(function (p) {
              return '<div style="padding:12px 14px;border:1px solid var(--border);border-radius:8px;background:var(--bg-subtle)">' +
                '<div class="flex-between mb-4">' +
                  '<div style="font-weight:700;font-size:14.5px;color:var(--text-900)">' + UI.esc(p.name) + '</div>' +
                  (p.link ? '<a class="text-small text-primary" href="' + UI.esc(p.link) + '" target="_blank" rel="noopener">Repository / Demo ↗</a>' : '') +
                '</div>' +
                (p.tech ? '<div class="text-small mb-4" style="color:var(--royal-600);font-weight:600">' + UI.esc(p.tech) + '</div>' : '') +
                (p.description ? '<p class="text-small text-muted" style="margin:0;line-height:1.5">' + UI.esc(p.description) + '</p>' : '') +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' : '') +

      '<div class="stat-grid cols-4 mb-24">' +
        statCard('layers', 'tone-royal', stats.total, 'Total Activities', 'All submissions') +
        statCard('checkCircle', 'tone-green', stats.verified, 'Verified', 'College-verified') +
        statCard('clock', 'tone-amber', stats.pending, 'Pending', 'In review') +
        statCard('xCircle', 'tone-red', stats.rejected, 'Rejected', 'Needs action') +
      '</div>' +

      '<div class="card mb-24">' +
        '<div class="card-head"><h3>' + icon('award', 17) + ' Verified Achievements</h3>' +
        '<span class="text-small text-muted">' + verified.length + ' records · approved by faculty</span></div>' +
        '<div class="card-body">' +
          (verified.length ? groupsHTML :
            UI.empty({ icon: 'award', title: 'No verified achievements yet', message: 'Submit an activity and get it approved by faculty — verified records will appear here automatically.', action: 'Add Activity' })) +
        '</div>' +
      '</div>' +

      '<div class="two-col even">' +
        '<div class="card">' +
          '<div class="card-head"><h3>' + icon('clock', 17) + ' Pending Review</h3>' +
          '<span class="badge badge-pending"><span class="dot"></span>' + pending.length + '</span></div>' +
          '<div class="card-body">' +
            (pending.length ? '<div class="ach-grid">' + pending.map(function (a) { return achievementCard(a); }).join('') + '</div>' :
              UI.empty({ icon: 'clock', title: 'Nothing pending', message: 'All your submissions have been reviewed.' })) +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head"><h3>' + icon('xCircle', 17) + ' Rejected</h3>' +
          '<span class="badge badge-rejected"><span class="dot"></span>' + rejected.length + '</span></div>' +
          '<div class="card-body">' +
            (rejected.length ? '<div class="ach-grid">' + rejected.map(function (a) { return achievementCard(a); }).join('') + '</div>' :
              UI.empty({ icon: 'checkCircle', title: 'No rejections', message: 'Nothing has been rejected. Keep it up!' })) +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card mt-24">' +
        '<div class="card-head"><h3>' + icon('link', 17) + ' Social &amp; Professional Links</h3>' +
          '<a class="text-small" href="#/student/links">Manage links' + icon('arrowRight', 13) + '</a></div>' +
        '<div class="card-body">' +
          '<div class="callout warn mb-16">' + icon('alert', 16) +
            '<div><strong>These links are student-added</strong> and are <em>not</em> verified by CampusCred — they never display a verification badge. Only the achievements above are college-verified.</div>' +
          '</div>' +
          (links.length ? '<div class="link-list">' + links.filter(function (l) { return l.visible; }).map(function (l) {
            return '<div class="link-row">' +
              '<span class="lr-ic">' + icon('link', 17) + '</span>' +
              '<div class="lr-main"><div class="lr-label">' + UI.esc(l.label) + '</div>' +
              '<div class="lr-url">' + UI.esc(l.url) + '</div></div>' +
              '<span class="badge badge-neutral">Student link</span>' +
            '</div>';
          }).join('') + '</div>' : '<div class="text-small text-muted">No public links added yet.</div>') +
        '</div>' +
      '</div>';

    // Event bindings for Portfolio
    root.querySelector('#copyLink').addEventListener('click', function () {
      UI.copyText(publicUrl).then(function () {
        UI.success('Link copied', 'Share it with recruiters to show your verified portfolio.');
      });
    });

    // Public Credentials Handlers
    const copyCredBtn = root.querySelector('#copyCredShareBtn');
    if (copyCredBtn) {
      copyCredBtn.addEventListener('click', function () {
        UI.copyText(credPublicUrl).then(function () {
          UI.success('Credentials Link Copied!', 'Shareable public credentials link copied.');
          copyCredBtn.innerHTML = icon('check', 14) + ' Copied!';
          setTimeout(function () {
            copyCredBtn.innerHTML = icon('copy', 15) + ' Copy Link';
          }, 2500);
        });
      });
    }

    const privacyBadge = root.querySelector('#credPrivacyBadge');
    root.querySelectorAll('input[name="credPrivacy"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        const mode = radio.value;
        PS.saveCredentialsSettings(st.id, { privacyMode: mode }).then(function () {
          if (privacyBadge) {
            privacyBadge.className = 'badge ' + (mode === 'private' ? 'badge-rejected' : mode === 'unlisted' ? 'badge-pending' : 'badge-verified');
            privacyBadge.textContent = mode.toUpperCase();
          }
          UI.success('Privacy Mode Updated', 'Credentials set to ' + mode.toUpperCase() + '.');
        });
      });
    });

    root.querySelectorAll('[data-cred-toggle], input[data-cred-field]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        const field = cb.getAttribute('data-cred-field');
        const patch = {};
        patch[field] = cb.checked;
        PS.saveCredentialsSettings(st.id, patch).then(function () {
          UI.info('Settings Saved', 'Public credentials view updated.');
        });
      });
    });

    UI.delegate(root, 'click', '[data-view-act]', function (e, card) {
      const act = AS.byId(card.getAttribute('data-view-act'));
      if (act) detailModal(act);
    });

    const emptyBtn = root.querySelector('.empty-state [data-empty-action]');
    if (emptyBtn) emptyBtn.addEventListener('click', function () { location.hash = '#/student/add'; });
  }

  /* =========================================================
     RESUME BUILDER
     ========================================================= */
  const RESUME_SECTIONS = [
    { id: 'summary', label: 'Professional Summary', icon: 'user' },
    { id: 'education', label: 'Education', icon: 'graduation' },
    { id: 'skills', label: 'Technical Skills', icon: 'zap' },
    { id: 'projects', label: 'Key Projects', icon: 'folder' },
    { id: 'portfolio', label: 'Verified Digital Portfolio Link', icon: 'link' },
    { id: 'links', label: 'Profiles & External Links', icon: 'externalLink' }
  ];

  function renderResume(root, ctx) {
    const st = student();
    const verified = AS.forStudent(st.id).filter(function (a) { return a.status === 'verified'; });

    const state = {
      template: 'ats',
      sections: { summary: true, education: true, skills: true, projects: true, portfolio: true, links: true },
      summary: st.summary || '',
      projects: (st.projects || []).map(function (p) { return Object.assign({}, p); }),
      skills: (st.skills || []).slice(),
      generated: false
    };

    root.innerHTML =
      '<div class="page-head no-print">' +
        '<div><h1>Resume Builder &amp; ATS Optimizer</h1>' +
        '<p class="page-desc">Auto-built from your <strong>verified</strong> CampusCred records only. Check your automated ATS score, upload external resumes to compare, and follow improvement suggestions before exporting.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-outline" type="button" id="printBtn">' + icon('print', 16) + 'Download PDF</button>' +
          '<button class="btn btn-primary" type="button" id="generateBtn">' + icon('zap', 16) + 'Generate Resume</button>' +
        '</div>' +
      '</div>' +

      '<!-- Automated ATS Resume Compatibility Score Panel -->' +
      '<div class="card card-pad mb-20 no-print" id="atsScoreCard" style="border:1.5px solid var(--border);border-radius:12px;background:var(--bg-card)">' +
        '<div class="flex-between mb-14" style="align-items:center;flex-wrap:wrap;gap:14px;border-bottom:1px solid var(--border);padding-bottom:14px">' +
          '<div class="flex" style="align-items:center;gap:14px">' +
            '<div id="atsRadial" style="width:68px;height:68px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;border:4px solid #2563EB;color:#2563EB;background:rgba(37,99,235,0.06);flex:none;transition:all .3s">' +
              '<span id="atsScoreValue">--</span>' +
            '</div>' +
            '<div>' +
              '<div class="flex" style="gap:8px;align-items:center;flex-wrap:wrap">' +
                '<h3 style="margin:0;font-size:17px">Automated ATS Resume Score</h3>' +
                '<span id="atsBadge" class="badge badge-verified">Analyzing...</span>' +
              '</div>' +
              '<div id="atsSummaryText" class="text-small text-muted mt-2">Scores keywords, metrics, section structure, and college-verified credentials out of 100.</div>' +
            '</div>' +
          '</div>' +

          '<div class="flex" style="gap:8px;align-items:center;flex-wrap:wrap">' +
            '<button type="button" class="btn btn-sm btn-outline" id="analyzeCurrentBtn" style="height:36px;font-size:12.5px">' +
              icon('refresh', 14) + ' Score Current Resume' +
            '</button>' +
            '<input type="file" id="resumeUploadInput" accept=".pdf,.docx,.txt" style="display:none" />' +
            '<button type="button" class="btn btn-sm btn-primary" id="uploadResumeBtn" style="height:36px;font-size:12.5px">' +
              icon('upload', 14) + ' Upload Resume to Score' +
            '</button>' +
          '</div>' +
        '</div>' +

        '<div id="atsFileNotice" class="callout info mb-12 hidden" style="padding:8px 12px;font-size:12px"></div>' +

        '<!-- 5-Category Breakdown -->' +
        '<div class="section-title mb-8" style="font-size:13px">ATS Rubric Breakdown</div>' +
        '<div class="stat-grid cols-5 mb-14" id="atsBreakdownGrid" style="gap:10px"></div>' +

        '<!-- Suggestions List -->' +
        '<div class="section-title mb-8" style="font-size:13px">Actionable Improvement Suggestions</div>' +
        '<div id="atsSuggestionsBox" style="display:grid;gap:8px;margin-bottom:12px"></div>' +

        '<!-- Detected Keywords & Metrics -->' +
        '<div id="atsChipsBox" class="mt-8 pt-8" style="border-top:1px dashed var(--border)"></div>' +
      '</div>' +

      '<div class="resume-layout">' +
        '<div class="no-print">' +
          '<div class="card card-pad mb-16">' +
            '<div class="section-title">Resume template</div>' +
            '<div class="tpl-grid" id="tplGrid">' +
              '<button class="tpl-opt active" type="button" data-tpl="ats"><div class="t-n">ATS-Friendly</div><div class="t-s">Plain &amp; parseable</div></button>' +
              '<button class="tpl-opt" type="button" data-tpl="modern"><div class="t-n">Modern</div><div class="t-s">Blue accents</div></button>' +
              '<button class="tpl-opt" type="button" data-tpl="academic"><div class="t-n">Academic CV</div><div class="t-s">Serif &amp; formal</div></button>' +
            '</div>' +
          '</div>' +

          '<div class="card card-pad mb-16">' +
            '<div class="section-title">Sections to include</div>' +
            '<div class="section-toggles" id="sectionToggles">' +
              RESUME_SECTIONS.map(function (s) {
                return '<label class="section-toggle">' +
                  '<span class="st-n">' + icon(s.icon, 16) + UI.esc(s.label) + '</span>' +
                  '<span class="toggle"><input type="checkbox" data-section="' + s.id + '" checked /><span class="track"></span></span>' +
                '</label>';
              }).join('') +
            '</div>' +
          '</div>' +

          '<div class="card card-pad mb-16">' +
            '<div class="section-title">Professional summary <span class="text-small text-muted">editable</span></div>' +
            '<textarea class="input" id="summaryInput" rows="5" maxlength="420">' + UI.esc(state.summary) + '</textarea>' +
            '<div class="hint text-small text-muted mt-4"><span id="sumCount">' + state.summary.length + '</span>/420 characters</div>' +
          '</div>' +

          '<div class="card card-pad">' +
            '<div class="section-title">Skills <span class="text-small text-muted">click to remove</span></div>' +
            '<div class="flex-center gap-8 mb-12" id="skillChips" style="flex-wrap:wrap">' +
              state.skills.map(function (s) {
                return '<span class="chip chip-royal" data-skill="' + UI.esc(s) + '">' + UI.esc(s) + '<button class="x" type="button" aria-label="Remove ' + UI.esc(s) + '">' + icon('x', 12) + '</button></span>';
              }).join('') +
            '</div>' +
            '<div class="flex-center gap-8">' +
              '<input class="input" id="skillInput" placeholder="Add a skill…" style="flex:1" />' +
              '<button class="btn btn-outline" type="button" id="addSkill">' + icon('plus', 15) + 'Add</button>' +
            '</div>' +
            '<div class="hint text-small text-muted mt-8">Only add skills you genuinely have — this demo never invents them.</div>' +
          '</div>' +
        '</div>' +

        '<div class="resume-stage">' +
          '<div class="a4-guide-bar no-print flex-between mb-12" style="max-width:210mm;margin-left:auto;margin-right:auto;align-items:center;padding:7px 14px;background:rgba(15,23,42,0.06);border:1px solid rgba(15,23,42,0.1);border-radius:6px;font-size:12px;color:#334155">' +
            '<span class="flex gap-6" style="align-items:center;font-weight:700">' +
              '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#16A34A"></span>' +
              'Standard A4 Sheet Format (210 × 297 mm) · Exact 1-Page Layout' +
            '</span>' +
            '<span class="text-muted" style="font-size:11.5px">' + icon('checkCircle', 13) + ' Print &amp; PDF Export Calibrated</span>' +
          '</div>' +
          '<div id="resumePaper"></div>' +
        '</div>' +
      '</div>';

    const paperHost = root.querySelector('#resumePaper');

    function contactLine() {
      const st = student();
      const publicLinks = (st.links || []).filter(function (l) { return l.visible; });
      let out = '<span>' + UI.esc(st.email || (st.enrollment + '@campuscred.demo')) + '</span>';
      if (st.phone) out += '<span>' + UI.esc(st.phone) + '</span>';
      out += '<span>' + UI.esc(st.course) + ' · ' + UI.esc(st.branch) + '</span>' +
        '<span>' + UI.esc(st.department) + '</span>' +
        '<span>AY ' + UI.esc(st.academicYear) + '</span>';
      out += '<a href="#/portfolio/' + encodeURIComponent(st.id) + '" target="_blank" rel="noopener" class="rp-portfolio-badge" style="color:var(--royal-600);font-weight:700">Verified Portfolio ↗</a>';
      publicLinks.forEach(function (l) {
        out += '<a href="' + UI.esc(l.url) + '" target="_blank" rel="noopener">' + UI.esc(l.label) + ' ↗</a>';
      });
      return out;
    }

    function verifiedLabel() {
      return '<span class="rp-verified">' + icon('check', 9) + 'Verified by CampusCred</span>';
    }

    /* ---------- ATS Real-Time Scoring UI Handler ---------- */
    let lastUploadedAnalysis = null;

    function renderATSUI(analysis) {
      if (!analysis) return;
      const scoreVal = root.querySelector('#atsScoreValue');
      const radial = root.querySelector('#atsRadial');
      const badge = root.querySelector('#atsBadge');
      const summaryText = root.querySelector('#atsSummaryText');
      const breakdownGrid = root.querySelector('#atsBreakdownGrid');
      const suggestionsBox = root.querySelector('#atsSuggestionsBox');
      const chipsBox = root.querySelector('#atsChipsBox');

      if (scoreVal) scoreVal.textContent = analysis.score;
      if (radial) {
        radial.style.borderColor = analysis.color;
        radial.style.color = analysis.color;
        radial.style.background = analysis.color + '10';
      }
      if (badge) {
        badge.className = 'badge ' + analysis.badgeClass;
        badge.textContent = analysis.rating + ' (' + analysis.score + '/100)';
      }
      if (summaryText && analysis.source) {
        summaryText.innerHTML = 'Analyzed source: <strong>' + UI.esc(analysis.source.name || 'Current Resume') + '</strong> · ' + analysis.wordCount + ' words scanned.';
      }

      if (breakdownGrid && analysis.breakdown) {
        breakdownGrid.innerHTML = analysis.breakdown.map(function (b) {
          const barColor = b.pct >= 80 ? '#16A34A' : b.pct >= 60 ? '#2563EB' : '#F59E0B';
          return '<div style="padding:10px 12px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:8px">' +
            '<div class="flex-between mb-4">' +
              '<span style="font-size:11.5px;font-weight:700;color:var(--text-800)">' + UI.esc(b.name) + '</span>' +
              '<span class="mono font-bold" style="font-size:12px;color:var(--text-800)">' + b.score + '/' + b.max + '</span>' +
            '</div>' +
            '<div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:6px">' +
              '<div style="height:100%;width:' + b.pct + '%;background:' + barColor + ';transition:width .4s"></div>' +
            '</div>' +
            '<div class="text-xs text-muted" style="line-height:1.3">' + UI.esc(b.summary) + '</div>' +
          '</div>';
        }).join('');
      }

      if (suggestionsBox && analysis.suggestions) {
        suggestionsBox.innerHTML = analysis.suggestions.length ? analysis.suggestions.map(function (s) {
          const isCrit = s.type === 'critical';
          const isRec = s.type === 'recommendation';
          const border = isCrit ? '#FCA5A5' : isRec ? '#FDE68A' : '#BBF7D0';
          const bg = isCrit ? '#FEF2F2' : isRec ? '#FFFBEB' : '#F0FDF4';
          const titleColor = isCrit ? '#DC2626' : isRec ? '#D97706' : '#16A34A';
          const ic = isCrit ? 'alert' : isRec ? 'sparkle' : 'checkCircle';
          const tag = isCrit ? 'Critical Fix' : isRec ? 'Recommendation' : 'Strength';
          return '<div style="padding:10px 12px;border:1px solid ' + border + ';background:' + bg + ';border-radius:8px;display:flex;align-items:flex-start;gap:10px">' +
            '<span style="color:' + titleColor + ';margin-top:2px;flex:none">' + icon(ic, 16) + '</span>' +
            '<div style="flex:1">' +
              '<div style="font-weight:700;font-size:12.5px;color:' + titleColor + '">' + tag + ': ' + UI.esc(s.title) + '</div>' +
              '<div style="font-size:12px;color:var(--text-700);margin-top:2px;line-height:1.4">' + UI.esc(s.detail) + '</div>' +
            '</div>' +
          '</div>';
        }).join('') : '<div class="text-small text-muted">No critical issues detected.</div>';
      }

      if (chipsBox) {
        const skillsFound = analysis.detectedSkills || [];
        const metricsFound = analysis.detectedMetrics || [];
        let html = '<div class="flex-between" style="font-size:11.5px;color:var(--text-600)">' +
          '<span><strong>Keywords Found (' + skillsFound.length + '):</strong> ' + (skillsFound.length ? skillsFound.slice(0, 8).join(', ') : 'None') + '</span>' +
          '<span><strong>Metrics Found (' + metricsFound.length + '):</strong> ' + (metricsFound.length ? metricsFound.slice(0, 6).join(', ') : 'None') + '</span>' +
        '</div>';
        chipsBox.innerHTML = html;
      }
    }

    function evaluateATS(customText, fileMeta) {
      if (!CC.ATSService) return;
      let analysis;
      if (customText) {
        analysis = CC.ATSService.analyze({
          text: customText,
          fileName: fileMeta && fileMeta.name,
          fileSize: fileMeta && fileMeta.size,
          isVerifiedCampusCred: false
        });
        lastUploadedAnalysis = analysis;
      } else {
        const curStudent = Object.assign({}, st, {
          summary: state.summary,
          skills: state.skills,
          projects: state.projects
        });
        analysis = CC.ATSService.analyze({
          student: curStudent,
          activities: verified,
          sections: state.sections
        });
        lastUploadedAnalysis = null;
      }
      renderATSUI(analysis);
      return analysis;
    }

    function paint() {
      const tpl = state.template;
      const s = state.sections;
      const st = student();

      let html = '<div class="resume-paper tpl-' + tpl + '">';
      html += '<header><div class="rp-name">' + UI.esc(st.name) + '</div>' +
        '<div class="rp-role">' + UI.esc(st.course) + ' — ' + UI.esc(st.branch) + ' · ' + UI.esc(st.semester || st.year) + '</div>' +
        '<div class="rp-contact">' + contactLine() + '</div></header>';
      html += '<hr class="rp-rule" />';

      if (s.summary) {
        html += '<section><h4 class="rp-h">Professional Summary</h4><p class="rp-summary">' + UI.esc(state.summary) + '</p></section>';
      }

      if (s.education) {
        html += '<section><h4 class="rp-h">Education</h4>';
        (st.education || []).forEach(function (ed) {
          html += '<div class="rp-item"><div class="rp-item-head">' +
            '<div><div class="rp-item-title">' + UI.esc(ed.level) + ' — ' + UI.esc(ed.branch) + '</div>' +
            '<div class="rp-item-sub">' + UI.esc(ed.institute) + (ed.detail ? ' · ' + UI.esc(ed.detail) : '') + '</div></div>' +
            '<div class="rp-item-date">' + UI.esc(ed.from) + ' – ' + UI.esc(ed.to) + '</div>' +
          '</div></div>';
        });
        html += '</section>';
      }

      if (s.skills && state.skills.length) {
        html += '<section><h4 class="rp-h">Skills</h4><div class="rp-skills">' +
          state.skills.map(function (sk) { return '<span class="rp-skill">' + UI.esc(sk) + '</span>'; }).join('') +
        '</div></section>';
      }

      if (s.projects && state.projects.length) {
        html += '<section><h4 class="rp-h">Projects</h4>';
        state.projects.forEach(function (p, i) {
          html += '<div class="rp-item">' +
            '<div class="rp-item-head"><div class="rp-item-title">' + UI.esc(p.name) + '</div>' +
            (p.link ? '<a class="rp-item-date" href="' + UI.esc(p.link) + '" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:underline;font-weight:600">Repository / Demo ↗</a>' : '') + '</div>' +
            '<div class="rp-item-sub">' + UI.esc(p.tech) + '</div>' +
            '<textarea class="input" data-proj="' + i + '" rows="2" style="font-size:12.5px;margin-top:5px;min-height:auto">' + UI.esc(p.description) + '</textarea>' +
          '</div>';
        });
        html += '</section>';
      }

      if (s.portfolio) {
        const portUrl = '#/portfolio/' + encodeURIComponent(st.id);
        html += '<section class="rp-portfolio-section">' +
          '<h4 class="rp-h">College-Verified Digital Portfolio &amp; Credentials</h4>' +
          '<div class="rp-portfolio-card">' +
            '<div class="rp-port-header">' +
              '<span class="rp-verified">' + icon('shield', 11) + ' Institutional Registry Verified</span>' +
              '<span class="rp-port-id mono">Student ID: ' + UI.esc(st.enrollment || st.id) + '</span>' +
            '</div>' +
            '<p class="rp-port-desc">' +
              'Official institutional portfolio repository hosting all verified certifications, hackathons, academic achievements, and faculty-approved credential records with tamper-proof validation.' +
            '</p>' +
            '<div class="rp-port-link-row">' +
              '<strong>Direct Recruiter Verification Link:</strong> ' +
              '<a href="' + portUrl + '" target="_blank" rel="noopener" class="rp-port-url font-bold">' +
                'campuscred.ac.in/#/portfolio/' + UI.esc(st.id) + ' ↗' +
              '</a>' +
            '</div>' +
          '</div>' +
        '</section>';
      }

      if (s.links) {
        const publicLinks = (st.links || []).filter(function (l) { return l.visible; });
        if (publicLinks.length) {
          html += '<section><h4 class="rp-h">Profiles &amp; Web Links</h4><ul class="rp-list">';
          publicLinks.forEach(function (l) {
            html += '<li><strong>' + UI.esc(l.label) + ':</strong> <a href="' + UI.esc(l.url) + '" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:underline">' + UI.esc(l.url) + ' ↗</a></li>';
          });
          html += '</ul></section>';
        }
      }

      html += '</div>';
      paperHost.innerHTML = html;

      // Live-edit project descriptions
      paperHost.querySelectorAll('[data-proj]').forEach(function (ta) {
        ta.addEventListener('input', function () {
          const idx = Number(ta.getAttribute('data-proj'));
          state.projects[idx].description = ta.value;
          evaluateATS();
        });
      });

      // Update ATS score live
      if (!lastUploadedAnalysis) {
        evaluateATS();
      }
    }

    // template picker
    root.querySelectorAll('[data-tpl]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        root.querySelectorAll('[data-tpl]').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.template = btn.getAttribute('data-tpl');
        paint();
        UI.info('Template changed', 'Preview updated: ' + btn.querySelector('.t-n').textContent);
      });
    });

    // section toggles
    root.querySelectorAll('[data-section]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        state.sections[cb.getAttribute('data-section')] = cb.checked;
        paint();
      });
    });

    // summary editing
    const summaryInput = root.querySelector('#summaryInput');
    summaryInput.addEventListener('input', UI.debounce(function () {
      state.summary = summaryInput.value;
      root.querySelector('#sumCount').textContent = summaryInput.value.length;
      paint();
    }, 250));

    // skills
    function renderSkillChips() {
      root.querySelector('#skillChips').innerHTML = state.skills.map(function (s) {
        return '<span class="chip chip-royal" data-skill="' + UI.esc(s) + '">' + UI.esc(s) + '<button class="x" type="button" aria-label="Remove">' + icon('x', 12) + '</button></span>';
      }).join('');
    }
    function addSkill() {
      const input = root.querySelector('#skillInput');
      const val = input.value.trim();
      if (!val) return;
      if (state.skills.indexOf(val) !== -1) { UI.warning('Already added', '"' + val + '" is already in your skills.'); return; }
      state.skills.push(val);
      input.value = '';
      renderSkillChips();
      paint();
    }
    root.querySelector('#addSkill').addEventListener('click', addSkill);
    root.querySelector('#skillInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
    });
    root.querySelector('#skillChips').addEventListener('click', function (e) {
      const chip = e.target.closest('[data-skill]');
      if (!chip) return;
      const val = chip.getAttribute('data-skill');
      state.skills = state.skills.filter(function (s) { return s !== val; });
      renderSkillChips();
      paint();
    });

    // ATS Handlers
    const analyzeCurrentBtn = root.querySelector('#analyzeCurrentBtn');
    const uploadResumeBtn = root.querySelector('#uploadResumeBtn');
    const resumeUploadInput = root.querySelector('#resumeUploadInput');
    const fileNotice = root.querySelector('#atsFileNotice');

    if (analyzeCurrentBtn) {
      analyzeCurrentBtn.addEventListener('click', function () {
        if (fileNotice) fileNotice.classList.add('hidden');
        const res = evaluateATS();
        UI.success('ATS Resume Scored', 'Current resume scored ' + res.score + '/100 (' + res.rating + ').');
      });
    }

    if (uploadResumeBtn && resumeUploadInput) {
      uploadResumeBtn.addEventListener('click', function () {
        resumeUploadInput.click();
      });

      resumeUploadInput.addEventListener('change', function () {
        const file = resumeUploadInput.files && resumeUploadInput.files[0];
        if (!file) return;

        UI.info('Parsing Resume', 'Analyzing ' + file.name + ' for ATS compatibility…');
        CC.ATSService.parseFile(file).then(function (parsed) {
          const res = evaluateATS(parsed.text, { name: file.name, size: file.size });
          if (fileNotice) {
            fileNotice.className = 'callout info mb-12';
            fileNotice.innerHTML = icon('fileText', 16) +
              '<div><strong>Showing ATS Analysis for Uploaded File:</strong> <u>' + UI.esc(file.name) + '</u> (' + UI.fmtSize(file.size) + ') · <button class="btn btn-sm btn-ghost p-0" id="resetBuiltBtn" style="color:var(--royal-600);text-decoration:underline">Switch back to built resume</button></div>';
            fileNotice.classList.remove('hidden');

            const resetBtn = root.querySelector('#resetBuiltBtn');
            if (resetBtn) {
              resetBtn.addEventListener('click', function () {
                fileNotice.classList.add('hidden');
                evaluateATS();
                UI.info('Restored', 'Showing ATS score for your CampusCred built resume.');
              });
            }
          }
          UI.success('Resume Analyzed', 'Uploaded resume scored ' + res.score + '/100 (' + res.rating + '). Check suggestions below!');
        }).catch(function (err) {
          UI.error('Parse Error', err.message);
        });
      });
    }

    root.querySelector('#generateBtn').addEventListener('click', function () {
      const btn = root.querySelector('#generateBtn');
      btn.classList.add('is-disabled');
      btn.innerHTML = '<span class="spinner"></span> Generating…';
      setTimeout(function () {
        state.generated = true;
        btn.classList.remove('is-disabled');
        btn.innerHTML = icon('check', 16) + 'Regenerate Resume';
        UI.success('Resume generated', 'Preview updated from your verified records. Use “Download PDF” to export.');
        paint();
      }, 700);
    });

    root.querySelector('#printBtn').addEventListener('click', function () {
      UI.info('Preparing PDF', 'Choose “Save as PDF” in the print dialog.');
      setTimeout(function () { window.print(); }, 350);
    });

    paint();
  }

  /* =========================================================
     SOCIAL LINKS
     ========================================================= */
  function renderLinks(root, ctx) {
    const st = student();

    function paint() {
      const links = PS.links(st.id);
      root.querySelector('#linkList').innerHTML = links.length ?
        '<div class="link-list">' + links.map(function (l) {
          return '<div class="link-row">' +
            '<span class="lr-ic">' + icon('link', 17) + '</span>' +
            '<div class="lr-main"><div class="lr-label">' + UI.esc(l.label) + '</div>' +
            '<div class="lr-url">' + UI.esc(l.url) + '</div></div>' +
            '<label class="toggle" title="Show on public portfolio">' +
              '<input type="checkbox" data-vis="' + l.id + '"' + (l.visible ? ' checked' : '') + ' />' +
              '<span class="track"></span>' +
              '<span>' + (l.visible ? 'Public' : 'Private') + '</span>' +
            '</label>' +
            '<span class="lr-actions">' +
              '<a class="btn btn-sm btn-outline" href="' + UI.esc(l.url) + '" target="_blank" rel="noopener">' + icon('externalLink', 14) + 'Open</a>' +
              '<button class="btn btn-sm btn-ghost" type="button" data-edit="' + l.id + '">' + icon('edit', 14) + '</button>' +
              '<button class="btn btn-sm btn-ghost text-danger" type="button" data-del="' + l.id + '">' + icon('trash', 14) + '</button>' +
            '</span>' +
          '</div>';
        }).join('') + '</div>' :
        UI.empty({ icon: 'link', title: 'No links yet', message: 'Add your LinkedIn, GitHub, LeetCode or portfolio website so recruiters can find you.', action: 'Add your first link' });

      const emptyBtn = root.querySelector('#linkList [data-empty-action]');
      if (emptyBtn) emptyBtn.addEventListener('click', openAdd);

      root.querySelectorAll('[data-vis]').forEach(function (cb) {
        cb.addEventListener('change', function () {
          const id = cb.getAttribute('data-vis');
          PS.updateLink(st.id, id, { visible: cb.checked }).then(function () {
            UI.success(cb.checked ? 'Link is now public' : 'Link set to private', 'Portfolio visibility updated.');
            paint();
          });
        });
      });
    }

    function openAdd() {
      const m = UI.openModal({
        title: 'Add social / professional link',
        subtitle: 'Student-added links are never shown with a verification badge.',
        body:
          '<div class="field" id="mLabel"><label>Label<span class="req">*</span></label>' +
            '<input class="input" id="mLabelInput" placeholder="e.g. LinkedIn, GitHub, LeetCode, Kaggle, Portfolio Website" />' +
            '<div class="error-text">Label is required.</div></div>' +
          '<div class="field" id="mUrl"><label>URL<span class="req">*</span></label>' +
            '<input class="input" id="mUrlInput" placeholder="https://…" />' +
            '<div class="error-text">URL is required.</div></div>' +
          '<label class="checkbox-row"><input type="checkbox" id="mVisible" checked /> Show on my public portfolio</label>',
        footer: '<button class="btn btn-outline" type="button" data-close>Cancel</button>' +
          '<button class="btn btn-primary" type="button" id="mSave">Add link</button>'
      });
      m.el.querySelector('#mSave').addEventListener('click', function () {
        const label = m.el.querySelector('#mLabelInput').value.trim();
        const url = m.el.querySelector('#mUrlInput').value.trim();
        m.el.querySelector('#mLabel').classList.toggle('has-error', !label);
        m.el.querySelector('#mUrl').classList.toggle('has-error', !url);
        if (!label || !url) return;
        PS.addLink(st.id, { label: label, url: url, visible: m.el.querySelector('#mVisible').checked })
          .then(function () {
            m.close();
            UI.success('Link added', label + ' was added to your profile.');
            paint();
          })
          .catch(function (err) { UI.error('Could not add link', err.message); });
      });
    }

    function openEdit(link) {
      const m = UI.openModal({
        title: 'Edit link',
        body:
          '<div class="field" id="mLabel"><label>Label<span class="req">*</span></label>' +
            '<input class="input" id="mLabelInput" value="' + UI.esc(link.label) + '" /></div>' +
          '<div class="field" id="mUrl"><label>URL<span class="req">*</span></label>' +
            '<input class="input" id="mUrlInput" value="' + UI.esc(link.url) + '" /></div>' +
          '<label class="checkbox-row"><input type="checkbox" id="mVisible"' + (link.visible ? ' checked' : '') + ' /> Show on my public portfolio</label>',
        footer: '<button class="btn btn-outline" type="button" data-close>Cancel</button>' +
          '<button class="btn btn-primary" type="button" id="mSave">Save changes</button>'
      });
      m.el.querySelector('#mSave').addEventListener('click', function () {
        const label = m.el.querySelector('#mLabelInput').value.trim();
        const url = m.el.querySelector('#mUrlInput').value.trim();
        if (!label || !url) { UI.warning('Required', 'Label and URL cannot be empty.'); return; }
        PS.updateLink(st.id, link.id, { label: label, url: url, visible: m.el.querySelector('#mVisible').checked })
          .then(function () {
            m.close();
            UI.success('Link updated', 'Changes saved.');
            paint();
          })
          .catch(function (err) { UI.error('Update failed', err.message); });
      });
    }

    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Social Links</h1>' +
        '<p class="page-desc">Add professional links that appear on your public portfolio. You control the visibility of each link individually.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-primary" type="button" id="addLinkBtn">' + icon('plusCircle', 16) + 'Add Link</button>' +
        '</div>' +
      '</div>' +

      '<div class="two-col">' +
        '<div class="card card-pad">' +
          '<div class="section-title">Your links <span class="text-small text-muted" id="linkCount"></span></div>' +
          '<div id="linkList"></div>' +
        '</div>' +
        '<div>' +
          '<div class="callout warn mb-16">' + icon('alert', 17) +
            '<div><strong>Visibility matters.</strong> Private links stay hidden from your public portfolio and resume. Only college-verified achievements ever carry a verification badge — links never do.</div>' +
          '</div>' +
          '<div class="card card-pad">' +
            '<div class="section-title">Preview</div>' +
            '<p class="text-small text-muted mb-12">See exactly what recruiters see:</p>' +
            '<a class="btn btn-outline btn-block" href="#/portfolio/' + st.id + '" target="_blank" rel="noopener">' + icon('externalLink', 16) + 'Open public portfolio</a>' +
            '<hr class="divider" />' +
            '<div class="text-small text-muted">Recommended links: LinkedIn, GitHub, LeetCode, CodeChef, Kaggle and a personal portfolio website.</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    root.querySelector('#addLinkBtn').addEventListener('click', openAdd);

    UI.delegate(root, 'click', '[data-edit]', function (e, btn) {
      const id = btn.getAttribute('data-edit');
      const link = PS.links(st.id).find(function (l) { return l.id === id; });
      if (link) openEdit(link);
    });
    UI.delegate(root, 'click', '[data-del]', function (e, btn) {
      const id = btn.getAttribute('data-del');
      const link = PS.links(st.id).find(function (l) { return l.id === id; });
      UI.confirm({
        title: 'Delete “' + (link ? link.label : 'link') + '”?',
        message: 'This link will be removed from your profile and public portfolio.',
        acceptText: 'Delete', tone: 'danger'
      }).then(function (ok) {
        if (!ok) return;
        PS.deleteLink(st.id, id).then(function () {
          UI.success('Link deleted', 'The link was removed.');
          paint();
        }).catch(function (err) { UI.error('Delete failed', err.message); });
      });
    });

    paint();
    const total = PS.links(st.id).length;
    root.querySelector('#linkCount').textContent = total + ' link' + (total === 1 ? '' : 's');
  }

  /* =========================================================
     NOTIFICATIONS
     ========================================================= */
  function renderNotifications(root, ctx) {
    const st = student();
    let filter = 'all';

    function paint() {
      let items = AS.notificationsFor(st.id);
      if (filter === 'unread') items = items.filter(function (n) { return !n.read; });
      else if (filter !== 'all') items = items.filter(function (n) { return n.type === filter; });

      root.querySelector('#notifList').innerHTML = items.length ?
        '<div class="notif-list">' + items.map(notifHTML).join('') + '</div>' :
        UI.empty({ icon: 'bell', title: 'No notifications', message: 'You are all caught up. New verification updates will appear here.' });
    }

    root.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Notifications</h1>' +
        '<p class="page-desc">Updates about your submissions: approvals, rejections with remarks, and system messages.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-outline" type="button" id="markAll">' + icon('check', 15) + 'Mark all read</button>' +
        '</div>' +
      '</div>' +

      '<div class="tabs" id="notifTabs">' +
        ['all', 'unread', 'approved', 'rejected', 'pending'].map(function (t) {
          const label = t === 'all' ? 'All' : t === 'unread' ? 'Unread' : t.charAt(0).toUpperCase() + t.slice(1);
          return '<button class="tab' + (t === 'all' ? ' active' : '') + '" type="button" data-tab="' + t + '">' + label + '</button>';
        }).join('') +
      '</div>' +

      '<div id="notifList">' + UI.loading('Loading notifications…') + '</div>';

    setTimeout(paint, 220);

    root.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        root.querySelectorAll('[data-tab]').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        filter = btn.getAttribute('data-tab');
        paint();
      });
    });

    root.querySelector('#markAll').addEventListener('click', function () {
      AS.markRead(st.id, 'all');
      UI.success('All caught up', 'Every notification marked as read.');
      paint();
      ctx.refreshBadge && ctx.refreshBadge();
    });

    UI.delegate(root, 'click', '[data-read]', function (e, btn) {
      AS.markRead(st.id, btn.getAttribute('data-read'));
      paint();
      ctx.refreshBadge && ctx.refreshBadge();
    });
  }

  /* =========================================================
     PROFILE
     ========================================================= */
  function renderProfile(root, ctx) {
    const st = student() || (CC.Store && CC.Store.db && CC.Store.db.students && CC.Store.db.students[0]) || {};
    const stats = (st && st.id) ? AS.statsFor(st.id) : { verified: 0, pending: 0, rejected: 0 };

    function paint() {
      const current = student() || st || {};
      root.innerHTML =
        '<div class="page-head">' +
          '<div><h1>Profile Settings</h1>' +
          '<p class="page-desc">Manage and edit your personal, academic, and portfolio details across CampusCred.</p></div>' +
          '<div class="page-actions">' +
            '<button class="btn btn-outline" type="button" id="viewPublicBtn">' + icon('externalLink', 16) + 'View Public Portfolio</button>' +
            '<button class="btn btn-primary" type="button" id="saveProfile">' + icon('check', 16) + 'Save Profile</button>' +
          '</div>' +
        '</div>' +

        '<div class="profile-hero mb-24">' +
          '<div style="position:relative;display:inline-block;flex:none">' +
            UI.avatar(current.name, current.color, 'xl', current.avatar) +
            '<button type="button" id="heroPhotoBtn" class="btn btn-xs" style="position:absolute;bottom:0;right:0;border-radius:50%;width:32px;height:32px;padding:0;background:var(--royal-600);color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.25);cursor:pointer" title="Upload and crop photo">' +
              icon('camera', 16) +
            '</button>' +
          '</div>' +
          '<div class="ph-meta">' +
            '<h2>' + UI.esc(current.name) + '</h2>' +
            '<div class="ph-sub">' + UI.esc(current.enrollment) + ' · ' + UI.esc(current.course || 'B.Tech') + ' ' + UI.esc(current.branch || '') + ' · ' + UI.esc(current.department) + '</div>' +
            '<div class="ph-chips">' +
              '<span class="chip">' + UI.esc(current.year || '3rd Year') + '</span>' +
              '<span class="chip">' + UI.esc(current.semester || '5th Semester') + '</span>' +
              '<span class="chip">AY ' + UI.esc(current.academicYear || '2024-2028') + '</span>' +
              (current.phone ? '<span class="chip mono">' + icon('smartphone', 12) + ' ' + UI.esc(current.phone) + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="text-center">' +
            '<span class="verified-pill">' + icon('shield', 15) + stats.verified + ' verified achievements</span>' +
            '<div class="text-small mt-8" style="color:#93A7C7">' + stats.pending + ' pending · ' + stats.rejected + ' rejected</div>' +
          '</div>' +
        '</div>' +

        '<div class="two-col">' +
          '<div>' +
            '<!-- Profile Picture Management Card -->' +
            '<div class="card card-pad mb-16">' +
              '<div class="flex-between mb-8">' +
                '<div class="section-title mb-0">' + icon('camera', 16) + ' Profile Picture</div>' +
                (current.avatar ? '<span class="badge badge-verified">' + icon('check', 11) + ' Custom Photo Active</span>' : '<span class="badge badge-neutral">Default Initials</span>') +
              '</div>' +
              '<p class="text-small text-muted mb-12">Upload an authentic photograph of yourself. Use the interactive crop tool to pan, zoom, and select your preferred dimensions before saving.</p>' +
              '<input type="file" id="avatarFileInput" accept="image/png,image/jpeg,image/jpg,image/webp" style="display:none" />' +
              '<div class="flex gap-8" style="flex-wrap:wrap;align-items:center">' +
                '<button type="button" class="btn btn-sm btn-primary" id="uploadAvatarBtn">' + icon('upload', 14) + ' Upload New Photo</button>' +
                (current.avatar ?
                  '<button type="button" class="btn btn-sm btn-outline" id="cropCurrentAvatarBtn">' + icon('crop', 14) + ' Crop / Adjust</button>' +
                  '<button type="button" class="btn btn-sm btn-ghost text-danger" id="removeAvatarBtn">' + icon('trash', 14) + ' Remove Photo</button>' : '') +
              '</div>' +
            '</div>' +

            '<!-- Personal & Contact Details Card -->' +
            '<div class="card card-pad mb-16">' +
              '<div class="section-title mb-12">Personal &amp; Contact Details</div>' +
              '<div class="two-col mb-12" style="gap:10px">' +
                '<div class="field" style="margin-bottom:0">' +
                  '<label for="stName" style="font-size:12px;margin-bottom:2px">Full Name<span class="req">*</span></label>' +
                  '<input type="text" id="stName" class="input" value="' + UI.esc(current.name || '') + '" required />' +
                '</div>' +
                '<div class="field" style="margin-bottom:0">' +
                  '<label for="stPhone" style="font-size:12px;margin-bottom:2px">Mobile Number<span class="req">*</span></label>' +
                  '<input type="tel" id="stPhone" class="input mono" value="' + UI.esc(current.phone || '') + '" placeholder="+91 98765 43210" />' +
                '</div>' +
              '</div>' +
              '<div class="two-col mb-12" style="gap:10px">' +
                '<div class="field" style="margin-bottom:0">' +
                  '<label for="stEmail" style="font-size:12px;margin-bottom:2px">Institutional Email<span class="req">*</span></label>' +
                  '<input type="email" id="stEmail" class="input" value="' + UI.esc(current.email || '') + '" required />' +
                '</div>' +
                '<div class="field" style="margin-bottom:0">' +
                  '<label for="stColor" style="font-size:12px;margin-bottom:2px">Avatar Theme Tone</label>' +
                  '<select id="stColor" class="select">' +
                    '<option value="1"' + (current.color === 1 ? ' selected' : '') + '>Royal Blue (Default)</option>' +
                    '<option value="2"' + (current.color === 2 ? ' selected' : '') + '>Emerald Green</option>' +
                    '<option value="3"' + (current.color === 3 ? ' selected' : '') + '>Amber Orange</option>' +
                    '<option value="4"' + (current.color === 4 ? ' selected' : '') + '>Purple Indigo</option>' +
                    '<option value="5"' + (current.color === 5 ? ' selected' : '') + '>Teal Cyan</option>' +
                    '<option value="6"' + (current.color === 6 ? ' selected' : '') + '>Crimson Rose</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="field mb-0">' +
                '<label for="stHeadline" style="font-size:12px;margin-bottom:2px">Professional Headline</label>' +
                '<input type="text" id="stHeadline" class="input" value="' + UI.esc(current.headline || '') + '" placeholder="e.g. Full-Stack Developer &amp; Robotics Enthusiast" />' +
              '</div>' +
            '</div>' +

            '<!-- Academic Details Card -->' +
            '<div class="card card-pad mb-16">' +
              '<div class="section-title mb-12">Academic Credentials</div>' +
              '<div class="two-col mb-12" style="gap:10px">' +
                '<div class="field" style="margin-bottom:0">' +
                  '<label for="stEnrollment" style="font-size:12px;margin-bottom:2px">Enrollment / Reg No<span class="req">*</span></label>' +
                  '<input type="text" id="stEnrollment" class="input mono" value="' + UI.esc(current.enrollment || '') + '" required />' +
                '</div>' +
                '<div class="field" style="margin-bottom:0">' +
                  '<label for="stDepartment" style="font-size:12px;margin-bottom:2px">Department<span class="req">*</span></label>' +
                  '<select id="stDepartment" class="select">' +
                    Mock.DEPARTMENTS.map(function (d) {
                      return '<option value="' + UI.esc(d) + '"' + (current.department === d ? ' selected' : '') + '>' + UI.esc(d) + '</option>';
                    }).join('') +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="two-col mb-12" style="gap:10px">' +
                '<div class="field" style="margin-bottom:0">' +
                  '<label for="stCourse" style="font-size:12px;margin-bottom:2px">Degree / Program</label>' +
                  '<input type="text" id="stCourse" class="input" value="' + UI.esc(current.course || 'B.Tech') + '" />' +
                '</div>' +
                '<div class="field" style="margin-bottom:0">' +
                  '<label for="stBranch" style="font-size:12px;margin-bottom:2px">Branch / Major</label>' +
                  '<input type="text" id="stBranch" class="input" value="' + UI.esc(current.branch || 'CSE') + '" />' +
                '</div>' +
              '</div>' +
              '<div class="two-col mb-12" style="gap:10px">' +
                '<div class="field" style="margin-bottom:0">' +
                  '<label for="stYear" style="font-size:12px;margin-bottom:2px">Current Year of Study<span class="req">*</span></label>' +
                  '<select id="stYear" class="select">' +
                    ['1st Year', '2nd Year', '3rd Year', '4th Year'].map(function (yr) {
                      return '<option value="' + yr + '"' + (current.year === yr ? ' selected' : '') + '>' + yr + '</option>';
                    }).join('') +
                  '</select>' +
                '</div>' +
                '<div class="field" style="margin-bottom:0">' +
                  '<label for="stSemester" style="font-size:12px;margin-bottom:2px">Current Semester</label>' +
                  '<select id="stSemester" class="select">' +
                    ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'].map(function (sem) {
                      return '<option value="' + sem + '"' + (current.semester === sem ? ' selected' : '') + '>' + sem + '</option>';
                    }).join('') +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="field mb-0">' +
                '<label for="stAcademicYear" style="font-size:12px;margin-bottom:2px">Academic Year</label>' +
                '<input type="text" id="stAcademicYear" class="input" value="' + UI.esc(current.academicYear || '2024-2028') + '" />' +
              '</div>' +
            '</div>' +

            '<!-- Education History -->' +
            '<div class="card card-pad mb-16">' +
              '<div class="flex-between mb-10">' +
                '<div class="section-title">Education History</div>' +
                '<button class="btn btn-sm btn-outline" type="button" id="addEduBtn">' + icon('plus', 14) + 'Add Education</button>' +
              '</div>' +
              '<div id="eduList"></div>' +
            '</div>' +
          '</div>' +

          '<div>' +
            '<!-- Professional Summary -->' +
            '<div class="card card-pad mb-16">' +
              '<div class="section-title mb-6">Professional Summary / Bio</div>' +
              '<textarea class="input" id="profSummary" rows="4" maxlength="500" placeholder="Write a short summary highlighting your focus and passions...">' + UI.esc(current.summary || '') + '</textarea>' +
              '<div class="hint text-small text-muted mt-4">Displayed on your resume and public credentials profile.</div>' +
            '</div>' +

            '<!-- Technical Skills -->' +
            '<div class="card card-pad mb-16">' +
              '<div class="section-title mb-6">Technical &amp; Domain Skills</div>' +
              '<input type="text" id="stSkillsInput" class="input" value="' + UI.esc((current.skills || []).join(', ')) + '" placeholder="e.g. Python, Java, React, SQL, Docker, ROS, Git" />' +
              '<div class="hint text-small text-muted mt-4">Comma-separated list. Used for ATS keyword matching and portfolio tags.</div>' +
              '<div class="mt-8 flex gap-6" style="flex-wrap:wrap" id="skillsChips">' +
                (current.skills || []).map(function (s) { return '<span class="chip chip-royal">' + UI.esc(s) + '</span>'; }).join('') +
              '</div>' +
            '</div>' +

            '<!-- Projects Card -->' +
            '<div class="card card-pad mb-16">' +
              '<div class="flex-between mb-10">' +
                '<div class="section-title">Featured Projects</div>' +
                '<button class="btn btn-sm btn-outline" type="button" id="addPrjBtn">' + icon('plus', 14) + 'Add Project</button>' +
              '</div>' +
              '<div id="prjList"></div>' +
            '</div>' +

            '<!-- Portfolio Visibility -->' +
            '<div class="card card-pad mb-16">' +
              '<div class="section-title">Portfolio Privacy &amp; Public Link</div>' +
              '<div class="setting-row">' +
                '<div><div class="s-t">Public Visibility</div>' +
                '<div class="s-d">Allow recruiters and external viewers to view verified achievements and public links.</div></div>' +
                '<label class="toggle"><input type="checkbox" id="visToggle"' + (current.portfolioVisibility !== 'private' ? ' checked' : '') + ' /><span class="track"></span></label>' +
              '</div>' +
              '<div class="setting-row">' +
                '<div><div class="s-t">Public Profile URL</div>' +
                '<div class="s-d mono text-small">' + UI.esc(((typeof location !== 'undefined' && location.href) ? location.href.split('#')[0] : '') + '#/portfolio/' + current.id) + '</div></div>' +
                '<button class="btn btn-sm btn-outline" type="button" id="copyProf">' + icon('copy', 14) + 'Copy Link</button>' +
              '</div>' +
            '</div>' +

            '<div class="card card-pad">' +
              '<div class="section-title">Reset Demo Data</div>' +
              '<div class="setting-row">' +
                '<div><div class="s-t">Restore Original Demo State</div>' +
                '<div class="s-d">Re-seeds fictional records and resets all submissions.</div></div>' +
                '<button class="btn btn-sm btn-danger" type="button" id="resetData">' + icon('refresh', 14) + 'Reset Demo</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      // Render Education List with Edit / Delete
      const eduHost = root.querySelector('#eduList');
      if (eduHost) {
        eduHost.innerHTML = (current.education && current.education.length) ? current.education.map(function (ed, i) {
          return '<div class="link-row mb-8" style="align-items:flex-start">' +
            '<span class="lr-ic">' + icon('graduation', 17) + '</span>' +
            '<div class="lr-main"><div class="lr-label">' + UI.esc(ed.level) + ' — ' + UI.esc(ed.branch || '') + '</div>' +
            '<div class="lr-url">' + UI.esc(ed.institute) + ' · ' + UI.esc(ed.from) + '–' + UI.esc(ed.to) + (ed.detail ? ' · ' + UI.esc(ed.detail) : '') + '</div></div>' +
            '<div class="flex gap-4">' +
              '<button type="button" class="btn btn-xs btn-outline" data-del-edu="' + i + '" title="Remove">' + icon('trash', 12) + '</button>' +
            '</div>' +
          '</div>';
        }).join('') : '<div class="text-muted text-small">No education entries added yet.</div>';
      }

      // Render Projects List with Edit / Delete
      const prjHost = root.querySelector('#prjList');
      if (prjHost) {
        prjHost.innerHTML = (current.projects && current.projects.length) ? current.projects.map(function (p, i) {
          return '<div class="link-row mb-8" style="align-items:flex-start">' +
            '<span class="lr-ic">' + icon('briefcase', 17) + '</span>' +
            '<div class="lr-main"><div class="lr-label">' + UI.esc(p.name) + '</div>' +
            '<div class="lr-url" style="color:var(--text-600)">' + UI.esc(p.tech || '') + '</div>' +
            '<div class="text-xs text-muted mt-2">' + UI.esc((p.description || '').slice(0, 90)) + '…</div></div>' +
            '<div class="flex gap-4">' +
              '<button type="button" class="btn btn-xs btn-outline" data-del-prj="' + i + '" title="Remove">' + icon('trash', 12) + '</button>' +
            '</div>' +
          '</div>';
        }).join('') : '<div class="text-muted text-small">No featured projects added yet.</div>';
      }

      // Add Education Modal
      const addEduBtn = root.querySelector('#addEduBtn');
      if (addEduBtn) {
        addEduBtn.addEventListener('click', function () {
          const m = UI.openModal({
            title: 'Add Education Entry',
            body:
              '<div class="two-col mb-10" style="gap:10px">' +
                '<div class="field mb-0"><label>Degree / Level<span class="req">*</span></label><input class="input" id="mEduLevel" placeholder="e.g. B.Tech" required /></div>' +
                '<div class="field mb-0"><label>Branch / Major</label><input class="input" id="mEduBranch" placeholder="e.g. Computer Science" /></div>' +
              '</div>' +
              '<div class="field mb-10"><label>Institute / University<span class="req">*</span></label><input class="input" id="mEduInst" placeholder="e.g. SKIT Jaipur" required /></div>' +
              '<div class="two-col mb-10" style="gap:10px">' +
                '<div class="field mb-0"><label>From Year</label><input class="input mono" id="mEduFrom" placeholder="2021" /></div>' +
                '<div class="field mb-0"><label>To Year</label><input class="input mono" id="mEduTo" placeholder="2025" /></div>' +
              '</div>' +
              '<div class="field mb-0"><label>CGPA / Percentage / Details</label><input class="input" id="mEduDetail" placeholder="e.g. CGPA: 8.9 / 10" /></div>',
            footer: '<button class="btn btn-outline" type="button" data-close>Cancel</button><button class="btn btn-primary" type="button" id="mSaveEdu">Add Education</button>'
          });
          m.el.querySelector('#mSaveEdu').addEventListener('click', function () {
            const level = m.el.querySelector('#mEduLevel').value.trim();
            const inst = m.el.querySelector('#mEduInst').value.trim();
            if (!level || !inst) { UI.warning('Required', 'Degree Level and Institute cannot be empty.'); return; }
            const edus = (current.education || []).slice();
            edus.push({
              level: level,
              branch: m.el.querySelector('#mEduBranch').value.trim(),
              institute: inst,
              from: m.el.querySelector('#mEduFrom').value.trim() || '2022',
              to: m.el.querySelector('#mEduTo').value.trim() || '2026',
              detail: m.el.querySelector('#mEduDetail').value.trim()
            });
            PS.update(st.id, { education: edus }).then(function () {
              m.close();
              UI.success('Education Added', level + ' added to profile.');
              paint();
            });
          });
        });
      }

      // Add Project Modal
      const addPrjBtn = root.querySelector('#addPrjBtn');
      if (addPrjBtn) {
        addPrjBtn.addEventListener('click', function () {
          const m = UI.openModal({
            title: 'Add Featured Project',
            body:
              '<div class="field mb-10"><label>Project Title<span class="req">*</span></label><input class="input" id="mPrjTitle" placeholder="e.g. Autonomous Campus Navigation Rover" required /></div>' +
              '<div class="field mb-10"><label>Technologies Used</label><input class="input" id="mPrjTech" placeholder="e.g. Python, ROS2, OpenCV, React" /></div>' +
              '<div class="field mb-10"><label>Project Description</label><textarea class="input" id="mPrjDesc" rows="3" placeholder="Explain what problem this project solves and key achievements..."></textarea></div>' +
              '<div class="field mb-0"><label>Repository / Demo Link</label><input class="input" id="mPrjLink" placeholder="https://github.com/..." /></div>',
            footer: '<button class="btn btn-outline" type="button" data-close>Cancel</button><button class="btn btn-primary" type="button" id="mSavePrj">Add Project</button>'
          });
          m.el.querySelector('#mSavePrj').addEventListener('click', function () {
            const title = m.el.querySelector('#mPrjTitle').value.trim();
            if (!title) { UI.warning('Required', 'Project title cannot be empty.'); return; }
            const prjs = (current.projects || []).slice();
            prjs.push({
              id: 'PRJ-' + (prjs.length + 1),
              name: title,
              tech: m.el.querySelector('#mPrjTech').value.trim(),
              description: m.el.querySelector('#mPrjDesc').value.trim(),
              link: m.el.querySelector('#mPrjLink').value.trim()
            });
            PS.update(st.id, { projects: prjs }).then(function () {
              m.close();
              UI.success('Project Added', title + ' added to profile.');
              paint();
            });
          });
        });
      }

      // Delete Education Handler
      UI.delegate(root, 'click', '[data-del-edu]', function (e, btn) {
        const idx = parseInt(btn.getAttribute('data-del-edu'), 10);
        const edus = (current.education || []).slice();
        edus.splice(idx, 1);
        PS.update(st.id, { education: edus }).then(function () {
          UI.info('Removed', 'Education entry removed.');
          paint();
        });
      });

      // Delete Project Handler
      UI.delegate(root, 'click', '[data-del-prj]', function (e, btn) {
        const idx = parseInt(btn.getAttribute('data-del-prj'), 10);
        const prjs = (current.projects || []).slice();
        prjs.splice(idx, 1);
        PS.update(st.id, { projects: prjs }).then(function () {
          UI.info('Removed', 'Project entry removed.');
          paint();
        });
      });

      // Avatar upload, interactive cropper, and remove handlers
      const fileInput = root.querySelector('#avatarFileInput');
      const uploadBtn = root.querySelector('#uploadAvatarBtn');
      const heroPhotoBtn = root.querySelector('#heroPhotoBtn');
      const cropCurrentBtn = root.querySelector('#cropCurrentAvatarBtn');
      const removeBtn = root.querySelector('#removeAvatarBtn');

      function openCropperWithFile(file) {
        if (!file) return;
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (validTypes.indexOf(file.type) === -1) {
          UI.error('Invalid Image Format', 'Please upload a JPG, JPEG, PNG, or WEBP image.');
          return;
        }
        if (file.size > 8 * 1024 * 1024) {
          UI.error('File Too Large', 'Please select an image under 8 MB.');
          return;
        }
        UI.openImageCropperModal(file, function (croppedDataUrl) {
          PS.update(st.id, { avatar: croppedDataUrl }).then(function () {
            UI.success('Profile Picture Updated!', 'Your new cropped photo has been saved to your student profile.');
            paint();
            // Refresh topbar shell avatar immediately
            const topAvatar = document.querySelector('.topbar .user-chip .avatar');
            if (topAvatar) {
              topAvatar.className = 'avatar avatar-img sm';
              topAvatar.innerHTML = '<img src="' + croppedDataUrl + '" alt="' + UI.esc(current.name) + '" />';
            }
          }).catch(function (err) {
            UI.error('Update Failed', err.message);
          });
        });
      }

      if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', function () { fileInput.click(); });
      }
      if (heroPhotoBtn && fileInput) {
        heroPhotoBtn.addEventListener('click', function () { fileInput.click(); });
      }
      if (fileInput) {
        fileInput.addEventListener('change', function () {
          if (fileInput.files && fileInput.files[0]) {
            openCropperWithFile(fileInput.files[0]);
            fileInput.value = '';
          }
        });
      }
      if (cropCurrentBtn && current.avatar) {
        cropCurrentBtn.addEventListener('click', function () {
          UI.openImageCropperModal(current.avatar, function (croppedDataUrl) {
            PS.update(st.id, { avatar: croppedDataUrl }).then(function () {
              UI.success('Profile Picture Adjusted!', 'Your adjusted photo has been saved.');
              paint();
              const topAvatar = document.querySelector('.topbar .user-chip .avatar');
              if (topAvatar) {
                topAvatar.className = 'avatar avatar-img sm';
                topAvatar.innerHTML = '<img src="' + croppedDataUrl + '" alt="' + UI.esc(current.name) + '" />';
              }
            }).catch(function (err) {
              UI.error('Adjustment Failed', err.message);
            });
          });
        });
      }
      if (removeBtn && current.avatar) {
        removeBtn.addEventListener('click', function () {
          UI.confirm({
            title: 'Remove Profile Picture?',
            message: 'Your custom profile photo will be removed and reverted to standard institutional initials.',
            acceptText: 'Remove Photo',
            tone: 'danger'
          }).then(function (ok) {
            if (!ok) return;
            PS.update(st.id, { avatar: null }).then(function () {
              UI.info('Photo Removed', 'Reverted to default initials badge.');
              paint();
              const topAvatar = document.querySelector('.topbar .user-chip .avatar');
              if (topAvatar) {
                topAvatar.className = 'avatar sm';
                topAvatar.setAttribute('data-c', ((current.color || 1) % 6 + 1));
                topAvatar.innerHTML = UI.esc(UI.initials(current.name));
              }
            });
          });
        });
      }

      // Save Profile Button Handler (All Entries)
      const saveBtn = root.querySelector('#saveProfile');
      if (saveBtn) {
        saveBtn.addEventListener('click', function () {
          const name = root.querySelector('#stName').value.trim();
          const email = root.querySelector('#stEmail').value.trim();
          const phone = root.querySelector('#stPhone').value.trim();
          const enrollment = root.querySelector('#stEnrollment').value.trim();
          const department = root.querySelector('#stDepartment').value;
          const course = root.querySelector('#stCourse').value.trim();
          const branch = root.querySelector('#stBranch').value.trim();
          const year = root.querySelector('#stYear') ? root.querySelector('#stYear').value : (current.year || '3rd Year');
          const semester = root.querySelector('#stSemester').value;
          const academicYear = root.querySelector('#stAcademicYear').value.trim();
          const headline = root.querySelector('#stHeadline').value.trim();
          const color = parseInt(root.querySelector('#stColor').value, 10);
          const summary = root.querySelector('#profSummary').value.trim();
          const skillsRaw = root.querySelector('#stSkillsInput').value.trim();
          const skills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
          const isPublic = root.querySelector('#visToggle').checked;

          if (!name || !email || !enrollment) {
            UI.warning('Fields Required', 'Name, Institutional Email, and Enrollment Number cannot be empty.');
            return;
          }

          saveBtn.classList.add('is-disabled');
          saveBtn.innerHTML = '<span class="spinner"></span> Saving…';

          PS.update(st.id, {
            name: name,
            email: email,
            phone: phone,
            enrollment: enrollment,
            department: department,
            course: course,
            branch: branch,
            year: year,
            semester: semester,
            academicYear: academicYear,
            headline: headline,
            color: color,
            summary: summary,
            skills: skills,
            portfolioVisibility: isPublic ? 'public' : 'private'
          }).then(function (updated) {
            saveBtn.classList.remove('is-disabled');
            saveBtn.innerHTML = icon('check', 16) + 'Save Profile';
            UI.success('Profile Saved!', 'All student personal, academic, and skills details updated.');
            paint();
          }).catch(function (err) {
            saveBtn.classList.remove('is-disabled');
            saveBtn.innerHTML = icon('check', 16) + 'Save Profile';
            UI.error('Save failed', err.message);
          });
        });
      }

      root.querySelector('#viewPublicBtn').addEventListener('click', function () {
        window.open('#/portfolio/' + current.id, '_blank');
      });

      root.querySelector('#copyProf').addEventListener('click', function () {
        const base = (typeof location !== 'undefined' && location.href) ? location.href.split('#')[0] : '';
        UI.copyText(base + '#/portfolio/' + current.id).then(function () {
          UI.success('Copied', 'Public portfolio link copied to clipboard.');
        });
      });

      root.querySelector('#resetData').addEventListener('click', function () {
        UI.confirm({
          title: 'Reset all demo data?',
          message: 'The original fictional dataset will be restored. Submissions, links and profile edits will be reset.',
          acceptText: 'Reset demo data', tone: 'danger'
        }).then(function (ok) {
          if (!ok) return;
          CC.Store.reset();
          UI.success('Demo data reset', 'Original dataset restored.');
          setTimeout(function () { location.hash = '#/student/dashboard'; location.reload(); }, 600);
        });
      });

      root.querySelector('#visToggle').addEventListener('change', function (e) {
        UI.info(e.target.checked ? 'Portfolio is public' : 'Portfolio is private', e.target.checked ? 'Anyone with the link can view it.' : 'Only you can view it now.');
      });
    }

    paint();
  }

  /* ---------- exports ---------- */
  CC.StudentPages = {
    dashboard: renderDashboard,
    add: renderAddActivity,
    activities: renderMyActivities,
    verifyCert: renderVerifyCert,
    portfolio: renderPortfolio,
    resume: renderResume,
    links: renderLinks,
    notifications: renderNotifications,
    profile: renderProfile,
    detailModal: detailModal
  };
})(window);
