/* ============================================================
   CampusCred — js/pages/landing.js
   Public homepage: hero, features, workflow, roles, footer.
   ============================================================ */
(function (global) {
  'use strict';
  const CC = global.CC;
  const icon = CC.icon, logo = CC.logo, UI = CC.UI;

  const FEATURES = [
    { icon: 'layers', title: 'Activity Management', body: 'Log hackathons, technical events, sports, cultural activities and certifications in one structured record instead of scattered spreadsheets.' },
    { icon: 'shield', title: 'Faculty Verification', body: 'Authorized faculty preview the uploaded proof, approve valid submissions and reject invalid ones with mandatory remarks.' },
    { icon: 'barChart', title: 'Analytics Dashboard', body: 'Category-wise, department-wise and monthly participation trends with filters that update every chart live.' },
    { icon: 'award', title: 'Digital Portfolio', body: 'A shareable portfolio of college-verified achievements — clearly separated from student-added social links.' },
    { icon: 'fileText', title: 'Resume Builder', body: 'Three resume templates populated automatically from verified records only, with live preview and print-to-PDF export.' },
    { icon: 'qr', title: 'QR Certificate Verification', body: 'Every verified record gets a certificate ID and a public verification page anyone can open to check it.' }
  ];

  const WORKFLOW = [
    { t: 'Submit Achievement', d: 'Student fills the activity form and uploads the certificate as proof.' },
    { t: 'Upload Proof', d: 'PDF, JPG or PNG proof is attached and validated before submission.' },
    { t: 'Faculty Verification', d: 'Authorized faculty approves valid records or rejects with remarks.' },
    { t: 'Verified Portfolio', d: 'Approved records appear in portfolio, resume and analytics.' }
  ];

  const ROLES = [
    { cls: '', icon: 'graduation', title: 'For Students', body: 'Build one verified record of everything you do on campus.', points: ['Submit achievements with certificate proof', 'Track pending and verified submissions', 'Share a verified portfolio and resume'], href: '#/login?role=student', cta: 'Student login' },
    { cls: 'b', icon: 'book', title: 'For Faculty', body: 'Verify submissions quickly with the proof side by side.', points: ['Review queue filtered to your department', 'Approve or reject with remarks', 'Full decision history and audit trail'], href: '#/login?role=faculty', cta: 'Faculty login' },
    { cls: 'c', icon: 'shield', title: 'For Admins', body: 'See college-wide participation and export reports.', points: ['Interactive charts across every department', 'Manage students, faculty and activities', 'CSV and print-to-PDF report downloads'], href: '#/login?role=admin', cta: 'Admin login' }
  ];

  function featureCards() {
    return FEATURES.map(function (f) {
      return '<div class="feature-card">' +
        '<div class="f-icon">' + icon(f.icon, 24) + '</div>' +
        '<h3>' + UI.esc(f.title) + '</h3>' +
        '<p>' + UI.esc(f.body) + '</p>' +
      '</div>';
    }).join('');
  }

  function workflow() {
    return WORKFLOW.map(function (w, i) {
      return '<div class="workflow-step">' +
        '<div class="step-no">' + (i + 1) + '</div>' +
        '<h4>' + UI.esc(w.t) + '</h4>' +
        '<p>' + UI.esc(w.d) + '</p>' +
        '<span class="arrow">' + icon('arrowRight', 22) + '</span>' +
      '</div>';
    }).join('');
  }

  function roleCards() {
    return ROLES.map(function (r) {
      return '<div class="role-card ' + r.cls + '">' +
        '<h3>' + icon(r.icon, 20) + ' ' + UI.esc(r.title) + '</h3>' +
        '<p>' + UI.esc(r.body) + '</p>' +
        '<ul>' + r.points.map(function (p) {
          return '<li>' + icon('check', 15) + '<span>' + UI.esc(p) + '</span></li>';
        }).join('') + '</ul>' +
        '<a class="go" href="' + r.href + '">' + UI.esc(r.cta) + icon('arrowRight', 15) + '</a>' +
      '</div>';
    }).join('');
  }

  function heroMock() {
    const rows = [
      { n: 'Smart India Hackathon — Internal Round', s: 'verified' },
      { n: 'GenAI Buildathon', s: 'pending' },
      { n: 'AWS Cloud Practitioner', s: 'verified' },
      { n: 'Inter-College Cricket Tournament', s: 'verified' }
    ];
    return '<div class="hero-visual">' +
      '<div class="hero-card">' +
        '<div class="hc-top"><span class="dots"><i></i><i></i><i></i></span><span class="tt">campuscred.demo/portfolio</span></div>' +
        '<div class="hc-body">' +
          '<div class="hc-stat-row">' +
            '<div class="hc-stat"><div class="v">24</div><div class="l">ACTIVITIES</div></div>' +
            '<div class="hc-stat"><div class="v">19</div><div class="l">VERIFIED</div></div>' +
            '<div class="hc-stat"><div class="v">3</div><div class="l">PENDING</div></div>' +
          '</div>' +
          rows.map(function (r) {
            return '<div class="hc-row"><span class="nm">' + UI.esc(r.n) + '</span>' + UI.statusBadge(r.s) + '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="hero-badge-float">' +
        '<span class="ic">' + icon('checkCircle', 18) + '</span>' +
        '<div><div class="t1">Record verified</div><div class="t2">CC-2026-0042</div></div>' +
      '</div>' +
    '</div>';
  }

  const LandingPage = {
    render: function (root) {
      root.innerHTML =
      '<div class="landing">' +
        '<nav class="landing-nav">' +
          '<div class="inner">' +
            '<a class="landing-brand" href="#/">' + logo(38) + '<span class="brand-name">CampusCred</span></a>' +
            '<div class="landing-links">' +
              '<a href="#features">Features</a>' +
              '<a href="#workflow">How it works</a>' +
              '<a href="#roles">For roles</a>' +
              '<a href="#/verify">Verify certificate</a>' +
            '</div>' +
            '<div class="nav-cta">' +
              '<a class="btn btn-outline" href="#/verify">' + icon('qr', 16) + 'Verify</a>' +
              '<a class="btn btn-primary" href="#/login">Get Started' + icon('arrowRight', 16) + '</a>' +
            '</div>' +
          '</div>' +
        '</nav>' +

        '<header class="hero">' +
          '<div>' +
            '<span class="eyebrow">' + icon('sparkle', 14) + ' Problem Statement SKIT021 · Google Cloud Firestore Integration · Multi-User Login Ready</span>' +
            '<h1>Your Achievements. One <span class="accent">Verified</span> Digital Identity.</h1>' +
            '<p class="lede">Student participation records usually live in scattered spreadsheets, department folders, email attachments and physical certificates — making verification and reporting painful. CampusCred centralises collection, verification, management and analysis into one secure institutional record.</p>' +
            '<div class="cta-row">' +
              '<a class="btn btn-primary btn-lg" href="#/login">Get Started' + icon('arrowRight', 17) + '</a>' +
              '<a class="btn btn-outline btn-lg" href="#features">' + icon('play', 16) + 'Explore Platform</a>' +
            '</div>' +
            '<div class="hero-stats">' +
              '<div class="hs"><div class="v">13</div><div class="l">Firestore Collections</div></div>' +
              '<div class="hs"><div class="v">Multi-User</div><div class="l">Instant Switcher</div></div>' +
              '<div class="hs"><div class="v">3</div><div class="l">Role-based Portals</div></div>' +
              '<div class="hs"><div class="v">SHA-256</div><div class="l">Signed Certificates</div></div>' +
            '</div>' +
          '</div>' +
          heroMock() +
        '</header>' +

        '<section class="section alt" id="features">' +
          '<div class="section-inner">' +
            '<div class="section-head">' +
              '<div class="kicker">Platform Features</div>' +
              '<h2>Everything needed to run a participation record system</h2>' +
              '<p>From first submission to final report — a single flow for students, faculty and administrators.</p>' +
            '</div>' +
            '<div class="feature-grid">' + featureCards() + '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section" id="workflow">' +
          '<div class="section-head">' +
            '<div class="kicker">Core Workflow</div>' +
            '<h2>Submit → Verify → Verified Record → Analytics</h2>' +
            '<p>Four steps, one source of truth. Only faculty-approved entries ever appear as verified achievements.</p>' +
          '</div>' +
          '<div class="workflow">' + workflow() + '</div>' +
        '</section>' +

        '<section class="section alt" id="roles">' +
          '<div class="section-inner">' +
            '<div class="section-head">' +
              '<div class="kicker">Role-based experience</div>' +
              '<h2>Three dashboards, one platform</h2>' +
              '<p>Each role sees exactly the tools it needs — nothing more, nothing less.</p>' +
            '</div>' +
            '<div class="roles-grid">' + roleCards() + '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section">' +
          '<div class="cta-band">' +
            '<h2>Ready to see CampusCred in action?</h2>' +
            '<p>Open a demo account for any role — student, faculty verifier or administrator. All data is fictional demo data.</p>' +
            '<div class="cta-row">' +
              '<a class="btn btn-primary btn-lg" href="#/login">Launch Demo' + icon('arrowRight', 16) + '</a>' +
              '<a class="btn btn-lg" href="#/verify" style="background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25)">Verify a Certificate</a>' +
            '</div>' +
          '</div>' +
        '</section>' +

        '<footer class="landing-foot">' +
          '<div class="inner">' +
            '<div>' +
              '<div class="foot-brand">' + logo(34, true) + '<span class="bn">CampusCred</span></div>' +
              '<p class="about">Digital Student Achievement &amp; Participation Record System. A centralized institutional platform that creates a single verified digital record of student participation.</p>' +
              '<p class="about mt-12" style="color:#7C93B8;font-size:12.5px">Tagline: <em>Every Achievement Counts. Every Record Verified.</em></p>' +
            '</div>' +
            '<div>' +
              '<h5>Platform</h5>' +
              '<a href="#features">Features</a>' +
              '<a href="#workflow">Workflow</a>' +
              '<a href="#roles">Role dashboards</a>' +
              '<a href="#/login">Demo login</a>' +
            '</div>' +
            '<div>' +
              '<h5>Verification</h5>' +
              '<a href="#/verify">Verify certificate</a>' +
              '<a href="#/verify">QR check</a>' +
              '<a href="#/portfolio/STU-1001">Sample public portfolio</a>' +
            '</div>' +
            '<div>' +
              '<h5>Project</h5>' +
              '<a href="#/">Problem statement SKIT021</a>' +
              '<a href="#/">Frontend prototype</a>' +
              '<a href="#/login">Java/JSP ready structure</a>' +
            '</div>' +
          '</div>' +
          '<div class="bottom">' +
            '<span>© 2026 CampusCred — Demo project. All records shown are fictional.</span>' +
            '<span class="code">Project Code: SKIT021 · Digital Platform for Centralized Collection, Verification &amp; Management of Student Participation Data</span>' +
          '</div>' +
        '</footer>' +
      '</div>';

      // Smooth scroll for in-page anchors
      root.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          const href = a.getAttribute('href');
          if (href.length > 1 && href[1] !== '/') {
            const target = document.getElementById(href.slice(1));
            if (target) {
              e.preventDefault();
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        });
      });
    }
  };

  CC.LandingPage = LandingPage;
})(window);
