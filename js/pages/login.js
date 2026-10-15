/* ============================================================
   CampusCred — js/pages/login.js
   ------------------------------------------------------------
   Fast Multi-User Access Portal with Minimum Scroll.
   Features:
     1. Student Dropdown Menu (Fast 1-click login)
     2. Faculty Dropdown Menu (Fast 1-click login)
     3. Administrator Menu (Fast 1-click login)
     4. New User Registration into Firestore (Student/Faculty/Admin)
     5. Credentials Sign-In
   ============================================================ */
(function (global) {
  'use strict';
  const CC = global.CC;
  const icon = CC.icon, logo = CC.logo, UI = CC.UI;

  const DEMO_ACCOUNTS = {
    student: { label: 'Student', identifier: 'aarav.sharma@campuscred.demo', password: 'student123' },
    faculty: { label: 'Faculty / Verifier', identifier: 'rohit.mehta@campuscred.demo', password: 'faculty123' },
    admin: { label: 'Administrator', identifier: 'admin@campuscred.demo', password: 'admin123' }
  };

  const LoginPage = {
    render: function (root, params, query) {
      query = query || {};
      let presetRole = (params && params.role) || (query && query.role) || 'student';
      if (!DEMO_ACCOUNTS[presetRole]) presetRole = 'student';

      const activeAccounts = CC.AuthService.getActiveAccounts();
      const isAddingAccount = !!(query && query.addAccount);
      let activeTab = (query && query.tab) || 'dropdowns'; // 'dropdowns' | 'register' | 'credentials'

      const allUsers = CC.AuthService.getAllUsers();
      const students = allUsers.students;
      const faculty = allUsers.faculty;
      const admins = allUsers.admin;

      root.innerHTML =
      '<div class="auth-page">' +
        '<aside class="auth-side">' +
          '<div class="as-brand">' + logo(38, true) + '<span class="bn">CampusCred</span></div>' +
          '<div>' +
            '<h2 style="font-size:26px">Every Achievement Counts.<br/>Every Record Verified.</h2>' +
            '<p class="as-sub" style="font-size:13.5px">One centralized institutional record for student achievements, faculty verifications, and administrative analytics.</p>' +
            '<ul class="as-points" style="margin-top:18px;gap:9px">' +
              '<li>' + icon('checkCircle', 16) + '<span>Fast role dropdowns for instant multi-user access</span></li>' +
              '<li>' + icon('checkCircle', 16) + '<span>Google Cloud Firestore 13-collection data model</span></li>' +
              '<li>' + icon('checkCircle', 16) + '<span>Register new students &amp; faculty on the fly</span></li>' +
            '</ul>' +
          '</div>' +
          '<div class="as-foot">' +
            '<span>Connected to <strong style="color:#60A5FA">Firestore</strong> · <span class="code">SKIT021</span></span>' +
          '</div>' +
        '</aside>' +

        '<main class="auth-main" style="padding:24px 20px">' +
          '<div class="auth-card" style="max-width:480px">' +
            '<a class="back-link" href="#/" style="margin-bottom:12px">' + icon('arrowLeft', 14) + 'Back to home</a>' +

            (activeAccounts.length && isAddingAccount ?
              '<div class="callout info mb-12" style="padding:8px 12px;display:flex;align-items:center;justify-content:space-between;font-size:12px">' +
                '<span>' + icon('users', 15) + ' Adding concurrent user (' + activeAccounts.length + ' active)</span>' +
                '<a href="' + CC.AuthService.homeFor(activeAccounts[0].role) + '" style="font-weight:700">Cancel</a>' +
              '</div>' : '') +

            '<div style="margin-bottom:12px">' +
              '<h1 style="font-size:22px;margin-bottom:2px">Sign in to CampusCred</h1>' +
              '<p class="sub" style="margin-bottom:12px;font-size:13px">Quick role access — choose an account from the menus below.</p>' +
            '</div>' +

            '<!-- Fast Compact Tabs (Minimum Scroll) -->' +
            '<div class="login-tabs">' +
              '<button type="button" class="login-tab' + (activeTab === 'dropdowns' ? ' active' : '') + '" data-tab="dropdowns">' +
                icon('zap', 15) + '<span>Role Dropdowns</span>' +
              '</button>' +
              '<button type="button" class="login-tab' + (activeTab === 'register' ? ' active' : '') + '" data-tab="register">' +
                icon('plusCircle', 15) + '<span>Student Registration</span>' +
              '</button>' +
              '<button type="button" class="login-tab' + (activeTab === 'credentials' ? ' active' : '') + '" data-tab="credentials">' +
                icon('mail', 15) + '<span>Password Sign-In</span>' +
              '</button>' +
            '</div>' +

            '<!-- TAB 1: COMPACT ROLE DROPDOWN MENUS (NO SCROLL) -->' +
            '<div id="tabDropdowns" class="tab-pane' + (activeTab === 'dropdowns' ? '' : ' hidden') + '">' +
              '<div class="role-menus-wrapper">' +

                '<!-- 1. STUDENT DROPDOWN MENU -->' +
                '<div class="role-menu-card">' +
                  '<div class="rm-header">' +
                    '<span class="rm-title"><span class="rm-badge student">Student</span> Student Account</span>' +
                    '<span class="rm-count">' + students.length + (students.length === 1 ? ' student' : ' students') + '</span>' +
                  '</div>' +
                  '<div class="rm-row">' +
                    '<div class="rm-select-wrap">' +
                      '<select id="studentSelect" class="rm-select" aria-label="Select Student">' +
                        students.map(function (s) {
                          return '<option value="' + s.id + '"' + (s.id === 'STU-1001' ? ' selected' : '') + '>' +
                            UI.esc(s.name) + ' — ' + UI.esc(s.regNo || s.id) + ' (' + UI.esc(s.dept) + ')' +
                            (s.isLoggedIn ? ' [Active]' : '') +
                          '</option>';
                        }).join('') +
                      '</select>' +
                    '</div>' +
                    '<button type="button" class="btn btn-primary rm-btn" id="loginStudentBtn">' +
                      'Sign in ➔' +
                    '</button>' +
                  '</div>' +
                '</div>' +

                '<!-- 2. FACULTY DROPDOWN MENU -->' +
                '<div class="role-menu-card">' +
                  '<div class="rm-header">' +
                    '<span class="rm-title"><span class="rm-badge faculty">Faculty</span> Faculty / Verifier Account</span>' +
                    '<span class="rm-count">' + faculty.length + (faculty.length === 1 ? ' verifier' : ' verifiers') + '</span>' +
                  '</div>' +
                  '<div class="rm-row">' +
                    '<div class="rm-select-wrap">' +
                      '<select id="facultySelect" class="rm-select" aria-label="Select Faculty">' +
                        faculty.map(function (f) {
                          return '<option value="' + f.id + '"' + (f.id === 'FAC-201' ? ' selected' : '') + '>' +
                            UI.esc(f.name) + ' — ' + UI.esc(f.dept) + ' (' + UI.esc(f.designation || 'Faculty') + ')' +
                            (f.isLoggedIn ? ' [Active]' : '') +
                          '</option>';
                        }).join('') +
                      '</select>' +
                    '</div>' +
                    '<button type="button" class="btn btn-primary rm-btn" id="loginFacultyBtn" style="background:#7E22CE;border-color:#7E22CE">' +
                      'Sign in ➔' +
                    '</button>' +
                  '</div>' +
                '</div>' +

                '<!-- 3. ADMINISTRATOR MENU -->' +
                '<div class="role-menu-card">' +
                  '<div class="rm-header">' +
                    '<span class="rm-title"><span class="rm-badge admin">Admin</span> Administrator Account</span>' +
                    '<span class="rm-count">Full College Access</span>' +
                  '</div>' +
                  '<div class="rm-row">' +
                    '<div class="rm-select-wrap">' +
                      '<select id="adminSelect" class="rm-select" aria-label="Select Administrator">' +
                        admins.map(function (a) {
                          return '<option value="' + a.id + '" selected>' +
                            UI.esc(a.name) + ' — System Administrator (' + UI.esc(a.dept) + ')' +
                            (a.isLoggedIn ? ' [Active]' : '') +
                          '</option>';
                        }).join('') +
                      '</select>' +
                    '</div>' +
                    '<button type="button" class="btn btn-primary rm-btn" id="loginAdminBtn" style="background:#16A34A;border-color:#16A34A">' +
                      'Sign in ➔' +
                    '</button>' +
                  '</div>' +
                '</div>' +

              '</div>' +

              '<div class="flex-between text-muted" style="font-size:11.5px;padding-top:4px">' +
                '<span>⚡ Instant 1-click access</span>' +
                '<a href="#/verify" class="text-primary">' + icon('qr', 13) + ' Verify a Certificate</a>' +
              '</div>' +
            '</div>' +

            '<!-- TAB 2: REGISTER NEW STUDENT (WITH EMAIL OTP VERIFICATION) -->' +
            '<div id="tabRegister" class="tab-pane' + (activeTab === 'register' ? '' : ' hidden') + '">' +
              '<form id="registerForm" novalidate>' +
                '<div class="flex-between mb-8" style="align-items:center">' +
                  '<span style="font-size:12.5px;font-weight:700;color:var(--text-800)">Student Institutional Registration</span>' +
                  '<span class="badge badge-verified" style="font-size:10.5px">Student Access Only</span>' +
                '</div>' +

                '<div class="two-col" style="gap:10px;margin-bottom:8px">' +
                  '<div class="field" style="margin-bottom:0">' +
                    '<label for="regName" style="font-size:12px;margin-bottom:2px">Full Name<span class="req">*</span></label>' +
                    '<input type="text" id="regName" class="input" style="height:36px;font-size:13px" placeholder="e.g. Diya Patel" required />' +
                  '</div>' +
                  '<div class="field" style="margin-bottom:0">' +
                    '<label for="regEmail" style="font-size:12px;margin-bottom:2px">Institutional Email<span class="req">*</span></label>' +
                    '<input type="email" id="regEmail" class="input" style="height:36px;font-size:13px" placeholder="name@campuscred.demo" required />' +
                  '</div>' +
                '</div>' +

                '<div class="two-col" style="gap:10px;margin-bottom:8px">' +
                  '<div class="field" style="margin-bottom:0">' +
                    '<label for="regDepartment" style="font-size:12px;margin-bottom:2px">Department<span class="req">*</span></label>' +
                    '<select id="regDepartment" class="select" style="height:36px;font-size:13px">' +
                      '<option value="dept-cse" data-name="Department of Computer Science & Engineering">CSE</option>' +
                      '<option value="dept-it" data-name="Department of Information Technology">IT</option>' +
                      '<option value="dept-ece" data-name="Department of Electronics & Communication">ECE</option>' +
                      '<option value="dept-me" data-name="Department of Mechanical Engineering">ME</option>' +
                      '<option value="dept-ee" data-name="Department of Electrical Engineering">EE</option>' +
                      '<option value="dept-robotics" data-name="Department of Robotics & Automation">Robotics</option>' +
                    '</select>' +
                  '</div>' +
                  '<div class="field" id="fRegId" style="margin-bottom:0">' +
                    '<label for="regIdentifier" id="regIdLabel" style="font-size:12px;margin-bottom:2px">Enrollment / Reg No<span class="req">*</span></label>' +
                    '<input type="text" id="regIdentifier" class="input" style="height:36px;font-size:13px" placeholder="e.g. 2024CS099" required />' +
                  '</div>' +
                '</div>' +

                '<!-- Student Verification & Mobile SMS OTP Box -->' +
                '<div class="card card-pad mb-8" style="background:var(--bg-subtle);border:1.5px solid var(--border);border-radius:10px;padding:12px 14px">' +
                  '<div class="flex-between mb-4" style="align-items:center">' +
                    '<span style="font-size:12.5px;font-weight:700;color:var(--text-700);display:flex;align-items:center;gap:6px">' +
                      icon('smartphone', 15) + ' Student Mobile Verification (SMS)' +
                    '</span>' +
                    '<span id="otpStatusBadge" class="badge badge-pending" style="font-size:10.5px">SMS Required</span>' +
                  '</div>' +
                  '<div style="font-size:11.5px;color:var(--text-500);margin-bottom:8px">Enter your 10-digit mobile number to receive a 6-digit SMS verification code.</div>' +

                  '<!-- Mobile Number Entry -->' +
                  '<div class="field mb-6">' +
                    '<label for="regPhone" style="font-size:12px;margin-bottom:3px;font-weight:600">Mobile Number<span class="req">*</span></label>' +
                    '<div class="flex gap-8" style="align-items:center">' +
                      '<div style="position:relative;flex:1">' +
                        '<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;color:var(--text-600);font-weight:600">+91</span>' +
                        '<input type="tel" id="regPhone" class="input mono" style="height:36px;font-size:13px;padding-left:42px;letter-spacing:1px" placeholder="9876543210" maxlength="14" required />' +
                      '</div>' +
                      '<button type="button" class="btn btn-sm btn-outline" id="sendOtpBtn" style="height:36px;font-size:12px;white-space:nowrap;flex:none;padding:0 12px">' +
                        icon('smartphone', 13) + ' Send Mobile OTP' +
                      '</button>' +
                    '</div>' +
                    '<div class="flex-between mt-2">' +
                      '<span class="text-muted" style="font-size:10.5px">Enter 10-digit mobile number</span>' +
                      '<span id="otpTimerText" class="text-muted font-bold" style="font-size:11px"></span>' +
                    '</div>' +
                  '</div>' +

                  '<div id="otpAlertBanner" class="callout info hidden" style="padding:6px 10px;font-size:11.5px;margin-bottom:6px"></div>' +
                  '<div id="otpInputWrap" class="flex gap-8 hidden" style="align-items:center">' +
                    '<input type="text" id="regOTP" class="input mono" placeholder="6-digit OTP" maxlength="6" style="height:34px;font-size:13.5px;letter-spacing:3px;max-width:130px;text-align:center;font-weight:700" />' +
                    '<button type="button" class="btn btn-sm btn-primary" id="verifyOtpBtn" style="height:34px;font-size:12px">' +
                      icon('check', 13) + ' Verify SMS Code' +
                    '</button>' +
                  '</div>' +
                '</div>' +

                '<div class="field" style="margin-bottom:12px">' +
                  '<label for="regPassword" style="font-size:12px;margin-bottom:2px">Password<span class="req">*</span></label>' +
                  '<input type="password" id="regPassword" class="input" style="height:36px;font-size:13px" placeholder="Create password" required />' +
                '</div>' +

                '<div class="callout danger hidden" id="regError" style="margin-bottom:10px;padding:8px 10px;font-size:12px">' +
                  icon('alert', 15) + '<div id="regErrorMsg">Registration failed.</div>' +
                '</div>' +

                '<button type="submit" class="btn btn-primary btn-block" id="regBtn" style="height:40px;font-weight:700">' +
                  'Register &amp; Sign In' + icon('arrowRight', 16) +
                '</button>' +
              '</form>' +
            '</div>' +

            '<!-- TAB 3: CREDENTIALS SIGN IN (PASSWORD) -->' +
            '<div id="tabCredentials" class="tab-pane' + (activeTab === 'credentials' ? '' : ' hidden') + '">' +
              '<form id="loginForm" novalidate>' +
                '<div class="role-picker" role="radiogroup" aria-label="Select role" style="margin-bottom:12px">' +
                  '<button class="role-opt' + (presetRole === 'student' ? ' active' : '') + '" type="button" data-role="student" style="padding:8px 6px">' +
                    '<span class="ro-ic" style="width:28px;height:28px">' + icon('graduation', 16) + '</span><span class="ro-l" style="font-size:11.5px">Student</span></button>' +
                  '<button class="role-opt' + (presetRole === 'faculty' ? ' active' : '') + '" type="button" data-role="faculty" style="padding:8px 6px">' +
                    '<span class="ro-ic" style="width:28px;height:28px">' + icon('book', 16) + '</span><span class="ro-l" style="font-size:11.5px">Faculty</span></button>' +
                  '<button class="role-opt' + (presetRole === 'admin' ? ' active' : '') + '" type="button" data-role="admin" style="padding:8px 6px">' +
                    '<span class="ro-ic" style="width:28px;height:28px">' + icon('shield', 16) + '</span><span class="ro-l" style="font-size:11.5px">Admin</span></button>' +
                '</div>' +

                '<div class="field" id="fIdentifier" style="margin-bottom:8px">' +
                  '<label for="identifier" style="font-size:12px">Email or ID<span class="req">*</span></label>' +
                  '<div class="input-icon">' + icon('mail', 16) +
                    '<input class="input" id="identifier" name="identifier" type="text" autocomplete="username" placeholder="you@campuscred.demo" style="height:36px;font-size:13px" />' +
                  '</div>' +
                '</div>' +

                '<div class="field" id="fPassword" style="margin-bottom:8px">' +
                  '<label for="password" style="font-size:12px">Password<span class="req">*</span></label>' +
                  '<div class="pw-wrap">' +
                    '<input class="input" id="password" name="password" type="password" autocomplete="current-password" placeholder="Password" style="height:36px;font-size:13px" />' +
                    '<button class="pw-toggle" id="pwToggle" type="button" aria-label="Show password">' + icon('eye', 16) + '</button>' +
                  '</div>' +
                '</div>' +

                '<div class="callout danger hidden" id="loginError" style="margin-bottom:10px;padding:8px 10px;font-size:12px">' +
                  icon('alert', 15) + '<div id="loginErrorMsg">Invalid credentials.</div>' +
                '</div>' +

                '<button class="btn btn-primary btn-block" type="submit" id="loginBtn" style="height:40px;font-weight:700">' +
                  'Sign in' + icon('arrowRight', 16) +
                '</button>' +
              '</form>' +
            '</div>' +

          '</div>' +
        '</main>' +
      '</div>';

      /* ---------- FAST ACTION HANDLERS (ZERO SCROLL) ---------- */

      // 1. Tab Switcher
      const tabBtns = root.querySelectorAll('.login-tab');
      const tabPanes = {
        dropdowns: root.querySelector('#tabDropdowns'),
        register: root.querySelector('#tabRegister'),
        credentials: root.querySelector('#tabCredentials')
      };

      tabBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          const tab = btn.getAttribute('data-tab');
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          Object.keys(tabPanes).forEach(k => {
            if (tabPanes[k]) tabPanes[k].classList.toggle('hidden', k !== tab);
          });
        });
      });

      // Quick Role Login Helper
      function doFastLogin(selectId, btnId, role) {
        const select = root.querySelector(selectId);
        const btn = root.querySelector(btnId);
        if (!select || !btn) return;

        function execLogin() {
          const uid = select.value;
          if (!uid) return;
          btn.classList.add('is-disabled');
          btn.innerHTML = '<span class="spinner"></span>';

          CC.AuthService.login({
            identifier: uid,
            password: '',
            role: role
          }).then(function (res) {
            UI.success('Welcome, ' + res.user.name.split(' ')[0] + '!', 'Signed in as ' + res.role + '.');
            location.hash = CC.AuthService.homeFor(res.role);
          }).catch(function (err) {
            const isPending = err.message && err.message.indexOf('REGISTRATION_PENDING') !== -1;
            const isRejected = err.message && err.message.indexOf('REGISTRATION_REJECTED') !== -1;
            if (isPending) {
              UI.warning('Verification Pending', 'Your student account is awaiting faculty approval before activation.');
            } else if (isRejected) {
              UI.error('Registration Rejected', err.message.replace('REGISTRATION_REJECTED:', '').trim());
            } else {
              UI.error('Sign-in failed', err.message);
            }
            btn.classList.remove('is-disabled');
            btn.innerHTML = 'Sign in ➔';
          });
        }

        btn.addEventListener('click', execLogin);

        // Optional convenience: Enter key in dropdown submits
        select.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            execLogin();
          }
        });
      }

      // Hook up the 3 role drop downs
      doFastLogin('#studentSelect', '#loginStudentBtn', 'student');
      doFastLogin('#facultySelect', '#loginFacultyBtn', 'faculty');
      doFastLogin('#adminSelect', '#loginAdminBtn', 'admin');

      // 2. Student Verification & Registration Handlers
      const registerForm = root.querySelector('#registerForm');
      const sendOtpBtn = root.querySelector('#sendOtpBtn');
      const verifyOtpBtn = root.querySelector('#verifyOtpBtn');
      const otpInputWrap = root.querySelector('#otpInputWrap');
      const otpAlertBanner = root.querySelector('#otpAlertBanner');
      const otpStatusBadge = root.querySelector('#otpStatusBadge');
      const otpTimerText = root.querySelector('#otpTimerText');
      const regOTPInput = root.querySelector('#regOTP');
      const regEmailInput = root.querySelector('#regEmail');
      const regPhoneInput = root.querySelector('#regPhone');
      const regIdentifierInput = root.querySelector('#regIdentifier');
      let otpTimerInterval = null;

      function startCountdown(seconds) {
        if (otpTimerInterval) clearInterval(otpTimerInterval);
        let remaining = seconds;
        function updateDisplay() {
          const m = Math.floor(remaining / 60);
          const s = remaining % 60;
          otpTimerText.textContent = 'Expires in ' + m + ':' + (s < 10 ? '0' : '') + s;
          if (remaining <= 0) {
            clearInterval(otpTimerInterval);
            otpTimerText.textContent = 'OTP Expired';
            sendOtpBtn.classList.remove('is-disabled');
            sendOtpBtn.textContent = 'Resend OTP';
          }
          remaining--;
        }
        updateDisplay();
        otpTimerInterval = setInterval(updateDisplay, 1000);
      }

      if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', function () {
          const phone = regPhoneInput ? regPhoneInput.value.trim() : '';
          const email = regEmailInput.value.trim();
          const identifier = regIdentifierInput.value.trim();
          const regError = root.querySelector('#regError');
          const regErrorMsg = root.querySelector('#regErrorMsg');

          if (regError) regError.classList.add('hidden');

          if (!phone || !identifier) {
            UI.warning('Details Required', 'Please enter your Mobile Number and Enrollment / Reg No before requesting SMS OTP.');
            if (!phone && regPhoneInput) regPhoneInput.focus();
            else regIdentifierInput.focus();
            return;
          }

          sendOtpBtn.classList.add('is-disabled');
          sendOtpBtn.innerHTML = '<span class="spinner"></span> Sending…';

          CC.AuthService.sendStudentOTP({ phone: phone, email: email, registrationNumber: identifier }).then(function (res) {
            UI.info('SMS Dispatched', 'Verification code sent to ' + (res.formattedPhone || res.phone));
            otpAlertBanner.innerHTML =
              '<div style="line-height:1.45">' +
                '<strong>📱 Mobile SMS Delivery Simulation:</strong> Code sent to <u>' + UI.esc(res.formattedPhone || res.phone) + '</u><br/>' +
                '<span style="display:inline-block;margin-top:4px;padding:2px 8px;background:rgba(37,99,235,0.12);border-radius:4px;color:#2563EB;font-weight:700;font-family:var(--mono);letter-spacing:2px;font-size:13px">' +
                  'SMS OTP: ' + res.code +
                '</span> <span style="color:var(--text-400);font-size:11px">(Valid for 5 mins)</span>' +
              '</div>';
            otpAlertBanner.classList.remove('hidden');
            otpInputWrap.classList.remove('hidden');
            regOTPInput.value = res.code; // Pre-fill for seamless instant evaluation
            regOTPInput.focus();
            sendOtpBtn.textContent = 'Resend OTP';
            sendOtpBtn.classList.remove('is-disabled');
            startCountdown(300);
          }).catch(function (err) {
            UI.error('SMS Failed', err.message);
            sendOtpBtn.classList.remove('is-disabled');
            sendOtpBtn.innerHTML = icon('smartphone', 13) + ' Send Mobile OTP';
            if (regError && regErrorMsg) {
              regErrorMsg.textContent = err.message;
              regError.classList.remove('hidden');
            }
          });
        });
      }

      if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', function () {
          const phone = regPhoneInput ? regPhoneInput.value.trim() : '';
          const code = regOTPInput.value.trim();

          if (!code) {
            UI.warning('Enter OTP', 'Please enter the 6-digit verification code.');
            regOTPInput.focus();
            return;
          }

          verifyOtpBtn.classList.add('is-disabled');
          verifyOtpBtn.innerHTML = '<span class="spinner"></span>';

          CC.AuthService.verifyStudentOTP(phone, code).then(function (res) {
            UI.success('Identity Verified', res.message);
            if (otpTimerInterval) clearInterval(otpTimerInterval);
            otpTimerText.textContent = '';
            otpStatusBadge.className = 'badge badge-verified';
            otpStatusBadge.innerHTML = '✔ Mobile Verified';
            otpInputWrap.classList.add('hidden');
            otpAlertBanner.className = 'callout success';
            otpAlertBanner.innerHTML = icon('checkCircle', 15) + '<div><strong>Mobile Authenticated:</strong> SMS verification complete for ' + UI.esc(res.phone || phone) + '.</div>';
            sendOtpBtn.style.display = 'none';
            if (regPhoneInput) regPhoneInput.setAttribute('readonly', 'true');
            regIdentifierInput.setAttribute('readonly', 'true');
          }).catch(function (err) {
            UI.error('Verification Failed', err.message);
            verifyOtpBtn.classList.remove('is-disabled');
            verifyOtpBtn.innerHTML = icon('check', 13) + ' Verify SMS Code';
          });
        });
      }

      if (registerForm) {
        registerForm.addEventListener('submit', function (e) {
          e.preventDefault();
          const name = root.querySelector('#regName').value.trim();
          const email = regEmailInput.value.trim();
          const phone = regPhoneInput ? regPhoneInput.value.trim() : '';
          const deptSelect = root.querySelector('#regDepartment');
          const deptId = deptSelect.value;
          const deptName = deptSelect.options[deptSelect.selectedIndex].getAttribute('data-name');
          const identifier = regIdentifierInput.value.trim();
          const password = root.querySelector('#regPassword').value;
          const regBtn = root.querySelector('#regBtn');
          const regError = root.querySelector('#regError');
          const regErrorMsg = root.querySelector('#regErrorMsg');

          if (regError) regError.classList.add('hidden');

          if (!name || !email || !phone || !password || !identifier) {
            if (regError && regErrorMsg) {
              regErrorMsg.textContent = 'Please fill out all registration fields including mobile number.';
              regError.classList.remove('hidden');
            }
            UI.warning('Missing fields', 'Please fill out all registration fields including mobile number.');
            return;
          }

          // Check if mobile OTP verified
          if (!CC.AuthService.isStudentVerified(phone) && !CC.AuthService.isStudentVerified(email)) {
            if (regError && regErrorMsg) {
              regErrorMsg.textContent = 'Student mobile verification required: Click "Send Mobile OTP" and verify your SMS code before creating an account.';
              regError.classList.remove('hidden');
            }
            UI.warning('Verification Required', 'Please complete the 6-digit mobile SMS OTP verification step above.');
            return;
          }

          regBtn.classList.add('is-disabled');
          regBtn.innerHTML = '<span class="spinner"></span> Creating account…';

          CC.AuthService.register({
            name: name,
            email: email,
            phone: phone,
            role: 'STUDENT',
            departmentId: deptId,
            departmentName: deptName,
            registrationNumber: identifier,
            password: password,
            semester: 1,
            year: '1st Year'
          }).then(function (result) {
            UI.success('Registration Submitted', 'Your student account has been sent to faculty for authenticity verification.');
            // Render confirmation screen inside tabRegister
            const tabRegister = root.querySelector('#tabRegister');
            if (tabRegister) {
              tabRegister.innerHTML =
                '<div style="text-align:center;padding:24px 14px">' +
                  '<div style="width:58px;height:58px;border-radius:50%;background:rgba(245,158,11,0.12);color:#D97706;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;border:2px solid #F59E0B">' +
                    icon('clock', 28) +
                  '</div>' +
                  '<h2 style="font-size:20px;color:var(--text-900);margin-bottom:6px">Registration Submitted for Verification</h2>' +
                  '<div class="badge badge-pending mb-16" style="font-size:12px;padding:4px 10px">Status: Pending Faculty Approval</div>' +
                  '<p style="font-size:13.5px;color:var(--text-600);line-height:1.5;margin-bottom:16px">' +
                    'Thank you, <strong>' + UI.esc(result.registration.name) + '</strong>! Your student enrollment details and verified mobile number (<strong>' + UI.esc(result.registration.phone) + '</strong>) have been securely logged and dispatched to your department faculty for authenticity review.' +
                  '</p>' +
                  '<div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:8px;padding:12px 14px;text-align:left;font-size:12.5px;margin-bottom:16px">' +
                    '<div style="display:flex;justify-content:space-between;margin-bottom:6px">' +
                      '<span class="text-muted">Enrollment / Reg No:</span>' +
                      '<span class="mono font-bold">' + UI.esc(result.registration.enrollment) + '</span>' +
                    '</div>' +
                    '<div style="display:flex;justify-content:space-between;margin-bottom:6px">' +
                      '<span class="text-muted">Department:</span>' +
                      '<span class="font-bold">' + UI.esc(result.registration.departmentName) + '</span>' +
                    '</div>' +
                    '<div style="display:flex;justify-content:space-between;margin-bottom:6px">' +
                      '<span class="text-muted">Year of Study:</span>' +
                      '<span class="font-bold">' + UI.esc(result.registration.year || '1st Year') + '</span>' +
                    '</div>' +
                    '<div style="display:flex;justify-content:space-between">' +
                      '<span class="text-muted">Mobile OTP:</span>' +
                      '<span class="text-success font-bold">✔ SMS Authenticated</span>' +
                    '</div>' +
                  '</div>' +
                  '<div class="callout info mb-16" style="font-size:12px;text-align:left">' +
                    icon('shield', 16) +
                    '<div><strong>Mandatory Verification Policy:</strong> Under campus security policy, no student profile can be activated before an authorized faculty member or administrator verifies enrollment authenticity. Once approved, you can sign in directly with your password.</div>' +
                  '</div>' +
                  '<button type="button" class="btn btn-primary btn-block" id="regBackToSignIn">' +
                    'Back to Sign In ➔' +
                  '</button>' +
                '</div>';

              const backBtn = tabRegister.querySelector('#regBackToSignIn');
              if (backBtn) {
                backBtn.addEventListener('click', function () {
                  const credTabBtn = root.querySelector('[data-tab="credentials"]');
                  if (credTabBtn) credTabBtn.click();
                  const idInput = root.querySelector('#identifier');
                  if (idInput) {
                    idInput.value = result.registration.email;
                    idInput.focus();
                  }
                });
              }
            }
          }).catch(function (err) {
            if (regError && regErrorMsg) {
              regErrorMsg.textContent = err.message || 'Registration failed.';
              regError.classList.remove('hidden');
            }
            UI.error('Registration failed', err.message);
            regBtn.classList.remove('is-disabled');
            regBtn.innerHTML = 'Register &amp; Sign In' + icon('arrowRight', 16);
          });
        });
      }

      // 3. Credentials Sign-In Form Handler
      let selectedRole = presetRole;
      const roleBtns = root.querySelectorAll('.role-opt');
      roleBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          roleBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedRole = btn.getAttribute('data-role');
        });
      });

      const pw = root.querySelector('#password');
      const pwToggle = root.querySelector('#pwToggle');
      if (pwToggle && pw) {
        pwToggle.addEventListener('click', function () {
          const showing = pw.type === 'text';
          pw.type = showing ? 'password' : 'text';
          pwToggle.innerHTML = icon(showing ? 'eye' : 'eyeOff', 16);
        });
      }

      const loginForm = root.querySelector('#loginForm');
      const errorBox = root.querySelector('#loginError');
      const errorMsg = root.querySelector('#loginErrorMsg');
      const loginBtn = root.querySelector('#loginBtn');

      if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
          e.preventDefault();
          const identifier = root.querySelector('#identifier').value.trim();
          const password = root.querySelector('#password').value;

          if (!identifier || !password) {
            UI.warning('Missing details', 'Please enter your email/ID and password.');
            return;
          }

          loginBtn.classList.add('is-disabled');
          loginBtn.innerHTML = '<span class="spinner"></span> Signing in…';
          errorBox.classList.add('hidden');

          CC.AuthService.login({
            identifier: identifier,
            password: password,
            role: selectedRole
          }).then(function (result) {
            UI.success('Welcome, ' + result.user.name.split(' ')[0] + '!', 'Signed in as ' + result.role + '.');
            location.hash = CC.AuthService.homeFor(result.role);
          }).catch(function (err) {
            const isPending = err.message && err.message.indexOf('REGISTRATION_PENDING') !== -1;
            const isRejected = err.message && err.message.indexOf('REGISTRATION_REJECTED') !== -1;
            let displayMsg = err.message;

            if (isPending) {
              errorBox.className = 'callout warn mb-10';
              displayMsg = '<strong>Verification in Progress:</strong> Your student profile is currently undergoing authenticity verification by faculty/administration. A verified profile will be activated once your credentials have been reviewed and approved.';
              UI.warning('Verification Pending', 'Your student registration is awaiting approval.');
            } else if (isRejected) {
              errorBox.className = 'callout danger mb-10';
              displayMsg = '<strong>Registration Rejected:</strong> ' + UI.esc(err.message.replace('REGISTRATION_REJECTED:', '').trim());
              UI.error('Registration Rejected', err.message.replace('REGISTRATION_REJECTED:', '').trim());
            } else {
              errorBox.className = 'callout danger mb-10';
              displayMsg = UI.esc(err.message || 'Login failed.');
              UI.error('Sign-in failed', err.message);
            }

            errorMsg.innerHTML = displayMsg;
            errorBox.classList.remove('hidden');
            loginBtn.classList.remove('is-disabled');
            loginBtn.innerHTML = 'Sign in' + icon('arrowRight', 16);
          });
        });
      }
    }
  };

  CC.LoginPage = LoginPage;
})(window);
