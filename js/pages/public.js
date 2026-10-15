/* ============================================================
   CampusCred — js/pages/public.js
   Public pages (no login required):
   - Certificate verification (manual ID + simulated QR scan)
   - Public student portfolio (verified achievements + visible links)
   ============================================================ */
(function (global) {
  'use strict';
  const CC = global.CC;
  const icon = CC.icon, logo = CC.logo, UI = CC.UI;
  const AS = CC.ActivityService;

  function publicShell(inner, note) {
    return '<div class="landing">' +
      '<div class="public-topbar">' +
        '<a class="brand" href="#/" style="text-decoration:none;color:inherit">' + logo(34, true) +
        '<span class="bn">CampusCred</span></a>' +
        '<span class="pt-note">' + UI.esc(note || 'Public verification service · Problem statement SKIT021') + '</span>' +
        '<div class="flex-center">' +
          '<a class="btn btn-sm" style="background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2)" href="#/login">Sign in</a>' +
          '<a class="btn btn-sm btn-primary" href="#/">Home</a>' +
        '</div>' +
      '</div>' +
      '<div class="public-body">' + inner + '</div>' +
      '<footer class="landing-foot" style="padding:26px 24px">' +
        '<div class="bottom" style="margin-top:0;padding-top:0;border-top:0">' +
          '<span>© 2026 CampusCred — Demo project. All records shown are fictional.</span>' +
          '<span class="code">Project Code: SKIT021</span>' +
        '</div>' +
      '</footer>' +
    '</div>';
  }

  /* =========================================================
     PUBLIC CERTIFICATE VERIFICATION (TRI-STATE)
     ========================================================= */
  function renderVerify(root, params) {
    const presetId = params && params[0] ? decodeURIComponent(params[0]) : '';

    root.innerHTML = publicShell(
      '<div class="verify-page-wrap">' +
        '<div class="verify-search-card mb-24">' +
          '<span class="demo-note mb-12">' + icon('shield', 13) + ' Institutional &amp; Accredited Partner Registry Verification</span>' +
          '<h2 style="margin-top:12px">' + icon('qr', 22) + ' Verify Certificate Authenticity</h2>' +
          '<p>Verify student certificates using Certificate ID, QR code decode, or by uploading the certificate document (.pdf, .png, .jpg).</p>' +

          '<div class="verify-input-row mb-12">' +
            '<input class="input mono" id="certInput" placeholder="e.g. CC-2026-0042, IEEE-CS-2026-8812" autocomplete="off" value="' + UI.esc(presetId) + '" aria-label="Certificate ID" />' +
            '<button class="btn btn-primary" type="button" id="certSearch">' + icon('search', 16) + 'Verify ID</button>' +
          '</div>' +

          '<!-- Certificate File Upload Dropzone -->' +
          '<div class="card card-pad mb-16" style="border:1.5px dashed var(--border);background:var(--bg-subtle);text-align:center;padding:16px 12px;border-radius:10px">' +
            '<input type="file" id="certFileInput" accept=".pdf,.png,.jpg,.jpeg" style="display:none" />' +
            '<div style="color:var(--royal-600);margin-bottom:6px">' + icon('upload', 26) + '</div>' +
            '<div style="font-size:13.5px;font-weight:700;color:var(--text-800)">Upload Certificate Document to Verify</div>' +
            '<div style="font-size:11.5px;color:var(--text-500);margin-top:2px;margin-bottom:10px">Supports PDF, PNG, JPG files containing institutional certificate seals or QR codes.</div>' +
            '<button type="button" class="btn btn-sm btn-outline" id="browseCertBtn">' + icon('folder', 13) + ' Choose Certificate File</button>' +
            '<span id="certFileName" class="text-small text-muted ml-8" style="font-weight:600"></span>' +
          '</div>' +
        '</div>' +

        '<div id="verifyResult">' +
          '<div class="callout info">' + icon('info', 17) +
          '<div><strong>Three-Tier Verification System:</strong><br/>' +
          '• <strong>Verified:</strong> Registered in CampusCred or accredited partner registries (IEEE, SIH, NPTEL, AWS, AICTE).<br/>' +
          '• <strong>Invalid:</strong> Flagged as revoked, tampered, or fraudulent.<br/>' +
          '• <strong>Unable to Verify:</strong> Issuer unconfirmed or missing digital watermark. Requires manual faculty review.</div></div>' +
        '</div>' +
      '</div>',
      'Certificate verification · Tri-state authenticity registry'
    );

    const input = root.querySelector('#certInput');
    const resultHost = root.querySelector('#verifyResult');
    const fileInput = root.querySelector('#certFileInput');
    const browseBtn = root.querySelector('#browseCertBtn');
    const fileNameSpan = root.querySelector('#certFileName');

    function renderResult(res, searched) {
      if (res.status === 'verified') {
        resultHost.innerHTML =
          '<div class="result-card verified">' +
            '<div class="result-head">' +
              '<span class="rh-ic" style="color:#16A34A">' + icon('checkCircle', 32) + '</span>' +
              '<div><div class="badge badge-verified mb-4">STATUS: VERIFIED</div>' +
              '<h3 style="color:#15803D;margin:0 0 2px">OFFICIALLY VERIFIED</h3>' +
              '<div class="rh-s">Certificate <span class="mono font-bold">' + UI.esc(res.certificateId) + '</span> is authentic and registered with <strong>' + UI.esc(res.issuer) + '</strong>.</div></div>' +
            '</div>' +
            '<div class="result-body">' +
              '<dl class="dl">' +
                '<dt>Recipient Student</dt><dd><strong>' + UI.esc(res.studentName) + '</strong></dd>' +
                '<dt>Enrollment / ID</dt><dd class="mono">' + UI.esc(res.enrollment) + '</dd>' +
                '<dt>Department</dt><dd>' + UI.esc(res.department) + '</dd>' +
                '<dt>Achievement / Event</dt><dd><strong>' + UI.esc(res.activity) + '</strong></dd>' +
                '<dt>Issuing Authority</dt><dd>' + UI.esc(res.organization || res.issuer) + '</dd>' +
                '<dt>Event Date</dt><dd>' + UI.fmtDate(res.eventDate) + '</dd>' +
                '<dt>Participation Role</dt><dd>' + UI.esc(res.role) + '</dd>' +
                '<dt>Award / Outcome</dt><dd>' + UI.esc(res.result) + '</dd>' +
                '<dt>Certificate ID</dt><dd class="mono font-bold" style="color:#2563EB">' + UI.esc(res.certificateId) + '</dd>' +
                '<dt>Verification Status</dt><dd><span class="badge badge-verified">' + icon('check', 11) + ' ' + UI.esc(res.statusLabel) + '</span></dd>' +
                '<dt>Verified On</dt><dd>' + UI.fmtDate(res.verifiedAt) + ' · ' + UI.esc(res.verifiedBy) + '</dd>' +
              '</dl>' +
              '<div class="flex-center gap-16 mt-16" style="align-items:flex-start">' +
                '<canvas id="qrCanvas2" width="96" height="96" style="width:96px;height:96px;border:1px solid var(--border);border-radius:8px;background:#fff;flex:none"></canvas>' +
                '<div class="text-small text-muted">' +
                  '<strong>Permanent Verification Link</strong><br/>' +
                  '<span class="mono text-xs" style="word-break:break-all;color:var(--text-600)">' + UI.esc(res.qrUrl || CC.CertificateService.publicUrl(res.certificateId)) + '</span>' +
                  '<div class="mt-8">Anyone scanning the printed QR code opens this verifiable page directly.</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>';
        CC.CertificateService.drawQR(root.querySelector('#qrCanvas2'), res.qrUrl || CC.CertificateService.publicUrl(res.certificateId), 3);
      } else if (res.status === 'invalid') {
        resultHost.innerHTML =
          '<div class="result-card invalid">' +
            '<div class="result-head">' +
              '<span class="rh-ic" style="color:#DC2626">' + icon('xCircle', 32) + '</span>' +
              '<div><div class="badge badge-rejected mb-4">STATUS: INVALID</div>' +
              '<h3 style="color:#B91C1C;margin:0 0 2px">INVALID / REVOKED</h3>' +
              '<div class="rh-s">Certificate record <span class="mono font-bold">' + UI.esc(res.certificateId || searched) + '</span> has been marked invalid or revoked.</div></div>' +
            '</div>' +
            '<div class="result-body">' +
              '<div class="callout danger mb-16">' + icon('alert', 18) +
                '<div><strong>Security Notice:</strong> ' + UI.esc(res.reason || 'This document failed cryptographic authenticity checks.') + '</div>' +
              '</div>' +
              '<div class="text-small text-muted mb-12"><strong>Recommendation:</strong> ' + UI.esc(res.actionRecommendation || 'Do not honor this certificate without institutional clearance.') + '</div>' +
              '<ul class="mt-8" style="display:grid;gap:6px">' +
                '<li class="text-small">· Cryptographic hash mismatch or revoked by issuing authority.</li>' +
                '<li class="text-small">· Never present altered or counterfeit credentials.</li>' +
                '<li class="text-small">· Contact examination branch for discrepancies.</li>' +
              '</ul>' +
            '</div>' +
          '</div>';
      } else {
        // unable_to_verify
        resultHost.innerHTML =
          '<div class="result-card" style="border:1.5px solid #F59E0B;background:#FFFDF7">' +
            '<div class="result-head" style="border-bottom:1px solid #FDE68A;background:#FEF3C7">' +
              '<span class="rh-ic" style="color:#D97706">' + icon('alert', 32) + '</span>' +
              '<div><div class="badge badge-pending mb-4" style="background:#FDE68A;color:#92400E">STATUS: UNABLE TO VERIFY</div>' +
              '<h3 style="color:#B45309;margin:0 0 2px">UNABLE TO VERIFY AUTHENTICITY</h3>' +
              '<div class="rh-s">Record for <span class="mono font-bold">' + UI.esc(res.certificateId || searched) + '</span> was not located in automated registries.</div></div>' +
            '</div>' +
            '<div class="result-body">' +
              '<div class="callout warn mb-16">' + icon('info', 18) +
                '<div><strong>Pending Manual Review:</strong> ' + UI.esc(res.reason || 'Issuer registry is unreachable or digital signature was not detected.') + '</div>' +
              '</div>' +
              '<div class="card card-pad mb-12" style="background:#fff;border:1px solid #FDE68A">' +
                '<div style="font-weight:700;font-size:13px;color:#92400E;margin-bottom:4px">Next Steps for Students:</div>' +
                '<p class="text-small text-muted" style="margin:0 0 8px">' + UI.esc(res.actionRecommendation || 'Submit this certificate via the student portal under "Add Activity" for manual faculty review.') + '</p>' +
                '<a class="btn btn-sm btn-outline" href="#/login?role=student" style="border-color:#D97706;color:#92400E">' + icon('plusCircle', 13) + ' Submit for Faculty Verification</a>' +
              '</div>' +
            '</div>' +
          '</div>';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function doVerify(queryObj, displayKey) {
      resultHost.innerHTML = UI.loading('Authenticating certificate credentials…');
      CC.CertificateService.verifyCertificate(queryObj).then(function (res) {
        renderResult(res, displayKey);
        if (res.status === 'verified') UI.success('Verified', 'Authentic certificate record verified.');
        else if (res.status === 'invalid') UI.error('Invalid', 'Certificate flagged as invalid or revoked.');
        else UI.warning('Unable to Verify', 'Requires manual review by faculty.');

        if (typeof queryObj === 'string' && location.hash.indexOf('#/verify') === 0) {
          history.replaceState(null, '', '#/verify/' + encodeURIComponent(queryObj));
        }
      }).catch(function (err) { UI.error('Lookup failed', err.message); });
    }

    root.querySelector('#certSearch').addEventListener('click', function () {
      const val = input.value.trim();
      if (!val) { UI.warning('Enter ID', 'Type a certificate ID to verify.'); input.focus(); return; }
      doVerify(val, val);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        if (val) doVerify(val, val);
      }
    });

    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        fileNameSpan.textContent = file.name;
        UI.info('Analyzing Certificate', 'Scanning ' + file.name + ' for digital signatures…');
        // If ATSService is available, extract text from file
        if (CC.ATSService && CC.ATSService.parseFile) {
          CC.ATSService.parseFile(file).then(function (parsed) {
            doVerify({ file: file, extractedText: parsed.text }, file.name);
          }).catch(function () {
            doVerify({ file: file }, file.name);
          });
        } else {
          doVerify({ file: file }, file.name);
        }
      });
    }

    if (presetId) doVerify(presetId, presetId);
  }

  /* =========================================================
     PUBLIC PORTFOLIO
     ========================================================= */
  const CATEGORY_GROUPS = ['Hackathon', 'Technical', 'Sports', 'Cultural', 'Certification', 'Workshop', 'Other'];
  const GROUP_ICON = {
    Hackathon: ['zap', 'tone-royal'], Technical: ['settings', 'tone-violet'], Sports: ['trophy', 'tone-green'],
    Cultural: ['star', 'tone-amber'], Certification: ['shield', 'tone-green'], Workshop: ['book', 'tone-royal'],
    Other: ['folder', 'tone-navy']
  };

  function verifiedCard(a) {
    return '<div class="ach-card" data-pub-act="' + a.id + '" style="cursor:pointer" title="Click to view details and authentic original certificate">' +
      '<div class="ac-top">' +
        '<h5>' + UI.esc(a.name) + '</h5>' +
        '<span class="verified-stamp">' + icon('check', 11) + 'Verified</span>' +
      '</div>' +
      '<div class="ac-org">' + icon('building', 14) + UI.esc(a.organization) + '</div>' +
      '<div class="text-small text-muted">' + UI.esc(a.role) + ' · ' + UI.esc(a.result) + '</div>' +
      '<div class="ac-foot">' +
        '<span>' + icon('calendar', 13) + ' ' + UI.fmtDate(a.date) + '</span>' +
        (a.certificateId ? '<button class="btn btn-sm btn-ghost mono text-xs" type="button" data-verify="' + UI.esc(a.certificateId) + '" title="Verify this certificate">' + UI.esc(a.certificateId) + ' ↗</button>' : '') +
      '</div>' +
    '</div>';
  }

  function renderPortfolio(root, params) {
    const studentId = params && params[0];
    const data = studentId ? CC.ProfileService.publicPortfolio(studentId) : null;

    if (!data || data.visibility === 'private') {
      root.innerHTML = publicShell(
        '<div class="verify-page-wrap"><div class="verify-search-card">' +
          '<span class="es-icon" style="width:66px;height:66px;border-radius:50%;background:var(--bg-subtle);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;color:var(--text-400)">' + icon('lock', 30) + '</span>' +
          '<h2>Portfolio not available</h2>' +
          '<p>' + (data ? 'This student has set their portfolio to private.' : 'No portfolio exists for this link.') + '</p>' +
          '<div class="flex-center mt-24" style="justify-content:center">' +
            '<a class="btn btn-primary" href="#/login">Sign in to CampusCred</a>' +
            '<a class="btn btn-outline" href="#/">Back to home</a>' +
          '</div>' +
        '</div></div>',
        'Public portfolio'
      );
      return;
    }

    const st = data.student;
    const verified = data.verifiedActivities.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

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
            '<span class="ag-count">' + items.length + ' verified</span>' +
          '</div>' +
          '<div class="ach-grid">' + items.map(verifiedCard).join('') + '</div>' +
        '</div>';
    });

    root.innerHTML = publicShell(
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
          '</div>' +
        '</div>' +
        '<div class="text-center">' +
          '<span class="verified-pill">' + icon('shield', 15) + verified.length + ' College-verified achievements</span>' +
        '</div>' +
      '</div>' +

      (st.summary ? '<div class="card card-pad mb-24"><div class="section-title mb-4">' + icon('user', 16) + ' Professional Summary</div><p class="text-medium" style="font-size:14.5px;line-height:1.7;margin:0">' + UI.esc(st.summary) + '</p></div>' : '') +

      (st.skills && st.skills.length ?
        '<div class="card card-pad mb-24">' +
          '<div class="section-title mb-8">' + icon('zap', 16) + ' Skills &amp; Competencies</div>' +
          '<div class="flex gap-8" style="flex-wrap:wrap">' +
            st.skills.map(function (sk) { return '<span class="chip chip-royal" style="font-size:13px;padding:5px 12px">' + UI.esc(sk) + '</span>'; }).join('') +
          '</div>' +
        '</div>' : '') +

      (st.education && st.education.length ?
        '<div class="card card-pad mb-24">' +
          '<div class="section-title mb-10">' + icon('graduation', 16) + ' Academic Education</div>' +
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
          '<div class="section-title mb-10">' + icon('folder', 16) + ' Featured Technical Projects</div>' +
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

      '<div class="stat-grid cols-3 mb-24">' +
        '<div class="stat-card"><span class="stat-icon tone-green">' + icon('checkCircle', 21) + '</span>' +
          '<div><div class="stat-value">' + verified.length + '</div><div class="stat-label">Verified Achievements</div>' +
          '<div class="stat-foot">Approved by faculty</div></div></div>' +
        '<div class="stat-card"><span class="stat-icon tone-royal">' + icon('layers', 21) + '</span>' +
          '<div><div class="stat-value">' + verified.filter(function (a) { return a.category === 'Hackathon' || a.category === 'Technical'; }).length + '</div>' +
          '<div class="stat-label">Technical Records</div><div class="stat-foot">Hackathons &amp; technical events</div></div></div>' +
        '<div class="stat-card"><span class="stat-icon tone-violet">' + icon('shield', 21) + '</span>' +
          '<div><div class="stat-value">' + verified.filter(function (a) { return a.category === 'Certification'; }).length + '</div>' +
          '<div class="stat-label">Certifications</div><div class="stat-foot">Verified certificates</div></div></div>' +
      '</div>' +

      '<div class="card mb-24">' +
        '<div class="card-head"><h3>' + icon('award', 17) + ' Verified Achievements</h3>' +
          '<span class="text-small text-muted">College-verified · ' + verified.length + ' records</span></div>' +
        '<div class="card-body">' +
          (verified.length ? groupsHTML :
            '<div class="empty-state"><div class="es-icon">' + icon('award', 30) + '</div>' +
            '<h4>No verified achievements yet</h4>' +
            '<p>Records will appear here once faculty approve them through CampusCred.</p></div>') +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-head"><h3>' + icon('link', 17) + ' Professional Links</h3>' +
        '<span class="badge badge-neutral">Student-added · unverified</span></div>' +
        '<div class="card-body">' +
          '<div class="callout warn mb-16">' + icon('alert', 16) +
            '<div>These links are provided by the student and are <strong>not verified</strong> by CampusCred — no verification badge is shown on them.</div></div>' +
          (data.links.length ? '<div class="link-list">' + data.links.map(function (l) {
            return '<div class="link-row">' +
              '<span class="lr-ic">' + icon('externalLink', 17) + '</span>' +
              '<div class="lr-main"><div class="lr-label">' + UI.esc(l.label) + '</div>' +
              '<div class="lr-url">' + UI.esc(l.url) + '</div></div>' +
              '<span class="lr-actions"><a class="btn btn-sm btn-outline" href="' + UI.esc(l.url) + '" target="_blank" rel="noopener noreferrer nofollow">Open' + icon('externalLink', 13) + '</a></span>' +
            '</div>';
          }).join('') + '</div>' : '<div class="text-small text-muted">No public links shared.</div>') +
        '</div>' +
      '</div>' +

      '<div class="callout info mt-24">' + icon('shield', 17) +
        '<div><strong>About this page:</strong> only faculty-verified achievements appear on this portfolio. Student contact details, passwords and pending submissions are never exposed publicly.</div></div>',

      'Public portfolio · ' + st.name
    );

    UI.delegate(root, 'click', '[data-verify]', function (e, btn) {
      location.hash = '#/verify/' + encodeURIComponent(btn.getAttribute('data-verify'));
    });

    UI.delegate(root, 'click', '[data-pub-act]', function (e, card) {
      if (e.target.closest('[data-verify]') || e.target.closest('a')) return;
      const actId = card.getAttribute('data-pub-act');
      const act = AS.byId(actId);
      if (act && CC.StudentPages && CC.StudentPages.detailModal) CC.StudentPages.detailModal(act);
    });
  }

  /* =========================================================
     PUBLIC CREDENTIALS SHOWCASE (SHAREABLE LINK & PRIVACY)
     ========================================================= */
  function renderPublicCredentials(root, params) {
    const slug = params && params[0] ? decodeURIComponent(params[0]) : '';
    const data = CC.ProfileService.publicCredentials(slug);

    if (!data || data.privacyMode === 'private') {
      root.innerHTML = publicShell(
        '<div class="verify-page-wrap"><div class="verify-search-card" style="text-align:center;padding:36px 20px">' +
          '<span class="es-icon" style="width:64px;height:64px;border-radius:50%;background:var(--bg-subtle);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:var(--text-400)">' +
            icon('lock', 32) +
          '</span>' +
          '<h2>Credentials Not Accessible</h2>' +
          '<p style="max-width:420px;margin:8px auto 20px">' +
            (data ? 'This student has set their public credentials link to private.' : 'No student credentials found matching this unique link.') +
          '</p>' +
          '<div class="flex-center" style="justify-content:center;gap:10px">' +
            '<a class="btn btn-primary" href="#/">Back to CampusCred</a>' +
            '<a class="btn btn-outline" href="#/verify">Verify a Certificate</a>' +
          '</div>' +
        '</div></div>',
        'Public Credentials'
      );
      return;
    }

    const st = data.student;
    const certs = data.certificates || [];
    const skills = data.skills || [];
    const education = data.education || [];
    const projects = data.projects || [];
    const fullUrl = location.href;

    root.innerHTML = publicShell(
      '<div class="profile-hero mb-24">' +
        UI.avatar(st.name, st.color, 'xl') +
        '<div class="ph-meta">' +
          '<div class="flex" style="gap:8px;align-items:center;flex-wrap:wrap">' +
            '<h2 style="margin:0">' + UI.esc(st.name) + '</h2>' +
            '<span class="badge badge-verified" style="font-size:11px">' + icon('check', 11) + ' Verified Student</span>' +
          '</div>' +
          (st.headline ? '<div style="font-size:14px;font-weight:600;color:var(--text-800);margin:3px 0">' + UI.esc(st.headline) + '</div>' : '') +
          '<div class="ph-sub">' + UI.esc(st.course) + ' — ' + UI.esc(st.branch) + ' · ' + UI.esc(st.department) + '</div>' +
          '<div class="ph-chips">' +
            '<span class="chip mono">' + UI.esc(st.enrollment) + '</span>' +
            '<span class="chip">' + UI.esc(st.year || st.semester) + '</span>' +
            '<span class="chip">AY ' + UI.esc(st.academicYear) + '</span>' +
            (data.privacyMode === 'unlisted' ? '<span class="chip" style="background:#FEF3C7;color:#92400E">🔗 Unlisted Link</span>' : '<span class="chip" style="background:#DCFCE7;color:#166534">🌐 Public Credential</span>') +
          '</div>' +
        '</div>' +
        '<div class="text-center">' +
          '<button class="btn btn-sm btn-outline mb-8" type="button" id="copyShareBtn" style="background:#fff">' +
            icon('copy', 14) + ' Copy Public Link' +
          '</button>' +
          '<div><span class="verified-pill">' + icon('shield', 14) + certs.length + ' Authenticated Certificates</span></div>' +
        '</div>' +
      '</div>' +

      // Optional Resume / Summary Card
      (st.summary ?
        '<div class="card card-pad mb-20">' +
          '<div class="section-title">' + icon('fileText', 16) + ' Professional Summary</div>' +
          '<p class="text-medium" style="font-size:14px;line-height:1.7;margin:4px 0 0">' + UI.esc(st.summary) + '</p>' +
        '</div>' : '') +

      // Verified Certificates Card
      (certs.length ?
        '<div class="card mb-20">' +
          '<div class="card-head">' +
            '<h3>' + icon('shield', 17) + ' Verified Certificates &amp; Credentials</h3>' +
            '<span class="badge badge-verified">' + certs.length + ' Verified Records</span>' +
          '</div>' +
          '<div class="card-body">' +
            '<div class="ach-grid">' +
              certs.map(function (c) {
                return '<div class="ach-card" data-pub-act="' + c.id + '" style="cursor:pointer" title="Click to view details and authentic original certificate">' +
                  '<div class="ac-top">' +
                    '<h5>' + UI.esc(c.name) + '</h5>' +
                    '<span class="verified-stamp">' + icon('check', 11) + 'Verified</span>' +
                  '</div>' +
                  '<div class="ac-org">' + icon('building', 14) + UI.esc(c.organization) + '</div>' +
                  '<div class="text-small text-muted mb-8">' + UI.esc(c.role) + (c.result ? ' · ' + UI.esc(c.result) : '') + '</div>' +
                  '<div class="ac-foot">' +
                    '<span>' + icon('calendar', 13) + ' ' + UI.fmtDate(c.date) + '</span>' +
                    (c.certificateId ?
                      '<a class="btn btn-sm btn-ghost mono text-xs" href="#/verify/' + encodeURIComponent(c.certificateId) + '">' +
                        UI.esc(c.certificateId) + ' ↗' +
                      '</a>' : '') +
                  '</div>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' : '') +

      // Technical Skills Card
      (skills.length ?
        '<div class="card card-pad mb-20">' +
          '<div class="section-title">' + icon('zap', 16) + ' Skills &amp; Competencies</div>' +
          '<div class="flex-center gap-8 mt-8" style="flex-wrap:wrap">' +
            skills.map(function (sk) {
              return '<span class="chip chip-royal" style="font-size:13px;padding:5px 12px">' + UI.esc(sk) + '</span>';
            }).join('') +
          '</div>' +
        '</div>' : '') +

      // Academic Education Card
      (education.length ?
        '<div class="card card-pad mb-20">' +
          '<div class="section-title">' + icon('graduation', 16) + ' Academic Education</div>' +
          '<div style="display:grid;gap:12px;margin-top:10px">' +
            education.map(function (ed) {
              return '<div style="padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-subtle)">' +
                '<div class="flex-between">' +
                  '<div style="font-weight:700;font-size:14px;color:var(--text-900)">' + UI.esc(ed.level) + ' — ' + UI.esc(ed.branch) + '</div>' +
                  '<div class="text-small text-muted">' + UI.esc(ed.from) + ' – ' + UI.esc(ed.to) + '</div>' +
                '</div>' +
                '<div class="text-small text-muted mt-2">' + UI.esc(ed.institute) + (ed.detail ? ' · ' + UI.esc(ed.detail) : '') + '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' : '') +

      // Projects Card
      (projects.length ?
        '<div class="card card-pad mb-20">' +
          '<div class="section-title">' + icon('folder', 16) + ' Featured Projects</div>' +
          '<div style="display:grid;gap:12px;margin-top:10px">' +
            projects.map(function (p) {
              return '<div style="padding:12px 14px;border:1px solid var(--border);border-radius:8px;background:var(--bg-subtle)">' +
                '<div class="flex-between mb-4">' +
                  '<div style="font-weight:700;font-size:14px;color:var(--text-900)">' + UI.esc(p.name) + '</div>' +
                  (p.link ? '<a class="text-small text-primary" href="' + UI.esc(p.link) + '" target="_blank" rel="noopener">Project Link ↗</a>' : '') +
                '</div>' +
                '<div class="text-small mb-4" style="color:var(--royal-600);font-weight:600">' + UI.esc(p.tech) + '</div>' +
                '<p class="text-small text-muted" style="margin:0;line-height:1.5">' + UI.esc(p.description) + '</p>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' : '') +

      // Student Links Card
      (data.links && data.links.length ?
        '<div class="card card-pad mb-20">' +
          '<div class="section-title">' + icon('link', 16) + ' Professional Profiles</div>' +
          '<div class="link-list mt-8">' +
            data.links.map(function (l) {
              return '<div class="link-row">' +
                '<span class="lr-ic">' + icon('externalLink', 16) + '</span>' +
                '<div class="lr-main"><div class="lr-label">' + UI.esc(l.label) + '</div>' +
                '<div class="lr-url">' + UI.esc(l.url) + '</div></div>' +
                '<a class="btn btn-sm btn-outline" href="' + UI.esc(l.url) + '" target="_blank" rel="noopener">Visit ↗</a>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' : '') +

      '<div class="callout info mt-24">' + icon('shield', 17) +
        '<div><strong>CampusCred Trust Anchor (SKIT021):</strong> All certificate IDs listed above are cryptographically verifiable through our institutional registry. Private student phone numbers and passwords are never exposed.</div>' +
      '</div>',

      'Public credentials · ' + st.name
    );

    const copyBtn = root.querySelector('#copyShareBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        UI.copyText(fullUrl).then(function () {
          UI.success('Link Copied!', 'Unique public credentials link copied to clipboard.');
          copyBtn.innerHTML = icon('check', 14) + ' Link Copied!';
          setTimeout(function () {
            copyBtn.innerHTML = icon('copy', 14) + ' Copy Public Link';
          }, 2500);
        });
      });
    }

    UI.delegate(root, 'click', '[data-pub-act]', function (e, card) {
      if (e.target.closest('a') || e.target.closest('button')) return;
      const actId = card.getAttribute('data-pub-act');
      const act = AS.byId(actId);
      if (act && CC.StudentPages && CC.StudentPages.detailModal) CC.StudentPages.detailModal(act);
    });
  }

  CC.PublicPages = {
    verify: renderVerify,
    portfolio: renderPortfolio,
    credentials: renderPublicCredentials
  };
})(window);
