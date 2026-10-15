/* ============================================================
   CampusCred — js/services/authService.js
   ------------------------------------------------------------
   Authentication & Multi-Account Management Service.
   Supports:
     - Single & Multiple User Logins (Student, Faculty, Admin)
     - Active Accounts Switcher (concurrent multi-user sessions)
     - Registration of new users into Firestore `users` & profiles
     - One-click user directory switching
   ============================================================ */
(function (global) {
  'use strict';

  const CC = global.CC;
  const Store = CC.Store;

  const AuthService = {
    _memorySession: null,

    /* ---------- Find user across roles or by UID ---------- */
    findUserByIdentifier: function (identifier, role) {
      const db = Store.db;
      if (!db) return null;
      const idClean = String(identifier || '').trim().toLowerCase();

      // Check users collection first
      if (db.users && db.users.length) {
        const u = db.users.find(function (x) {
          const uidMatch = (x.uid || '').toLowerCase() === idClean;
          const emailMatch = (x.email || '').toLowerCase() === idClean;
          const regMatch = (x.registrationNumber || '').toLowerCase() === idClean;
          return uidMatch || emailMatch || regMatch;
        });
        if (u) {
          const r = (u.role || '').toLowerCase();
          // Look up corresponding profile or mock object
          let fullUser = null;
          if (r === 'student') {
            fullUser = (db.students || []).find(s => s.id === u.uid) || u;
          } else if (r === 'faculty') {
            fullUser = (db.faculty || []).find(f => f.id === u.uid) || u;
          } else {
            const adminList = (db.admins && db.admins.length) ? db.admins : (db.admin ? [db.admin] : []);
            fullUser = adminList.find(a => (a.id || '').toLowerCase() === (u.uid || '').toLowerCase() || (a.email || '').toLowerCase() === (u.email || '').toLowerCase()) || db.admin || u;
          }
          return { user: fullUser, role: r };
        }
      }

      // Check students
      if (!role || role === 'student') {
        const s = (db.students || []).find(function (item) {
          return (item.email || '').toLowerCase() === idClean ||
                 (item.enrollment || '').toLowerCase() === idClean ||
                 (item.id || '').toLowerCase() === idClean;
        });
        if (s) return { user: s, role: 'student' };
      }

      // Check faculty
      if (!role || role === 'faculty') {
        const f = (db.faculty || []).find(function (item) {
          return (item.email || '').toLowerCase() === idClean ||
                 (item.id || '').toLowerCase() === idClean ||
                 (item.employeeId || '').toLowerCase() === idClean;
        });
        if (f) return { user: f, role: 'faculty' };
      }

      // Check admin
      if (!role || role === 'admin') {
        const adminList = (db.admins && db.admins.length) ? db.admins : (db.admin ? [db.admin] : []);
        const a = adminList.find(function (item) {
          return (item.email || '').toLowerCase() === idClean ||
                 (item.id || '').toLowerCase() === idClean;
        });
        if (a) return { user: a, role: 'admin' };
      }

      return null;
    },

    /* ---------- Authenticate user ---------- */
    login: async function (credentials) {
      await Store.delay(200);
      const identifier = String(credentials.identifier || '').trim();
      const password = String(credentials.password || '');
      const role = credentials.role;

      if (!identifier) {
        throw new Error('Please enter your email, enrollment ID, or user ID.');
      }

      // Check if this identifier corresponds to a student registration pending approval or rejected
      const idClean = identifier.toLowerCase();
      const idDigits = idClean.replace(/\D/g, '');
      const db = Store.db || {};
      const regMatch = (db.studentRegistrations || []).find(function (r) {
        const emailMatch = (r.email || '').toLowerCase() === idClean;
        const regNoMatch = (r.registrationNumber || r.enrollment || '').toLowerCase() === idClean;
        const uidMatch = (r.uid || r.id || '').toLowerCase() === idClean;
        const phoneMatch = idDigits && idDigits.length >= 7 && (r.phone || '').replace(/\D/g, '').endsWith(idDigits);
        return emailMatch || regNoMatch || uidMatch || phoneMatch;
      });

      if (regMatch) {
        if (regMatch.status === 'PENDING_APPROVAL' || regMatch.accountStatus === 'PENDING_APPROVAL') {
          throw new Error('REGISTRATION_PENDING: Your student registration is currently pending authenticity verification by the faculty or administrator. Access to student features will be activated once an authorized faculty member approves your credentials.');
        }
        if (regMatch.status === 'REJECTED' || regMatch.accountStatus === 'REJECTED') {
          throw new Error('REGISTRATION_REJECTED: Your student registration was reviewed and rejected. Reason: ' + (regMatch.rejectionReason || 'Identity or enrollment credentials could not be verified by institutional records.'));
        }
      }

      // Check users collection for pending / rejected status
      if (db.users && db.users.length) {
        const u = db.users.find(function (x) {
          return (x.uid || '').toLowerCase() === idClean ||
                 (x.email || '').toLowerCase() === idClean ||
                 (x.registrationNumber || '').toLowerCase() === idClean;
        });
        if (u) {
          if (u.accountStatus === 'PENDING_APPROVAL') {
            throw new Error('REGISTRATION_PENDING: Your student registration is currently pending authenticity verification by the faculty or administrator. Access to student features will be activated once an authorized faculty member approves your credentials.');
          }
          if (u.accountStatus === 'REJECTED') {
            throw new Error('REGISTRATION_REJECTED: Your student registration was reviewed and rejected. Reason: ' + (u.rejectionReason || 'Identity or enrollment credentials could not be verified by institutional records.'));
          }
        }
      }

      const match = AuthService.findUserByIdentifier(identifier, role);
      if (!match) {
        throw new Error('User not found. Try one of the demo logins or select from the user directory.');
      }

      const user = match.user;
      const userRole = match.role;

      // Allow password matching or demo bypass if password matches demo patterns
      const validPw = (user.password === password) ||
                      (password === 'student123' && userRole === 'student') ||
                      (password === 'faculty123' && userRole === 'faculty') ||
                      (password === 'admin123' && userRole === 'admin') ||
                      (password === 'password123');

      if (!validPw && password !== '') {
        throw new Error('Invalid password. Please check your credentials.');
      }

      const session = {
        userId: user.id || user.uid,
        role: userRole,
        name: user.name,
        email: user.email,
        department: user.department || user.departmentName || '',
        designation: user.designation || (userRole === 'student' ? (user.enrollment || 'Student') : userRole),
        avatar: user.avatar || user.profilePictureUrl || '',
        profilePictureUrl: user.avatar || user.profilePictureUrl || '',
        color: user.color || 1,
        startedAt: Date.now()
      };

      // Set active session
      Store.setSession(session);

      // Add to multi-account active accounts registry
      AuthService._addToActiveAccounts(session);

      // Record audit log via FirestoreService
      if (CC.FirestoreService) {
        CC.FirestoreService.recordAuditLog({
          actorUid: session.userId,
          actorEmail: session.email,
          actorRole: session.role.toUpperCase(),
          action: 'USER_LOGIN',
          resourceType: 'USER',
          resourceId: session.userId,
          metadata: { loginType: 'DIRECT_AUTH' }
        }).catch(function () {});
      }

      return { user: AuthService.sanitize(user, userRole), role: userRole };
    },

    /* ---------- Multiple Account Sessions ---------- */
    getActiveAccounts: function () {
      const list = Store.getActiveAccounts();
      const current = Store.getSession();
      if (!current) return list;

      // Ensure current is in list
      const idx = list.findIndex(a => a.userId === current.userId);
      if (idx === -1) {
        list.unshift(current);
        Store.saveActiveAccounts(list);
      }
      return list;
    },

    _addToActiveAccounts: function (session) {
      const list = Store.getActiveAccounts();
      const existingIdx = list.findIndex(a => a.userId === session.userId);
      if (existingIdx !== -1) {
        list[existingIdx] = Object.assign({}, list[existingIdx], session, { lastActive: Date.now() });
      } else {
        list.unshift(Object.assign({}, session, { lastActive: Date.now() }));
      }
      Store.saveActiveAccounts(list);
    },

    /* Switch to another signed-in account */
    switchAccount: function (userId) {
      const list = AuthService.getActiveAccounts();
      const target = list.find(a => a.userId === userId);
      if (!target) {
        // Try looking up the user directly
        const found = AuthService.findUserByIdentifier(userId);
        if (found) {
          const newSession = {
            userId: found.user.id || found.user.uid,
            role: found.role,
            name: found.user.name,
            email: found.user.email,
            department: found.user.department || found.user.departmentName || '',
            designation: found.user.designation || (found.role === 'student' ? (found.user.enrollment || 'Student') : found.role),
            avatar: found.user.avatar || found.user.profilePictureUrl || '',
            profilePictureUrl: found.user.avatar || found.user.profilePictureUrl || '',
            color: found.user.color || 1,
            startedAt: Date.now()
          };
          Store.setSession(newSession);
          AuthService._addToActiveAccounts(newSession);
          return { user: AuthService.sanitize(found.user, found.role), role: found.role };
        }
        throw new Error('Account not found in active session list.');
      }

      target.lastActive = Date.now();
      Store.setSession(target);
      AuthService._addToActiveAccounts(target);

      const found = AuthService.findUserByIdentifier(target.userId, target.role);
      const user = found ? found.user : target;
      return { user: AuthService.sanitize(user, target.role), role: target.role };
    },

    /* Remove a specific account from active accounts list */
    removeAccount: function (userId) {
      let list = AuthService.getActiveAccounts();
      list = list.filter(a => a.userId !== userId);
      Store.saveActiveAccounts(list);

      const current = Store.getSession();
      if (current && current.userId === userId) {
        if (list.length > 0) {
          // Switch to remaining active account
          Store.setSession(list[0]);
          return list[0];
        } else {
          // No more accounts
          Store.setSession(null);
          return null;
        }
      }
      return current;
    },

    /* Log out current account */
    logout: function () {
      const current = Store.getSession();
      if (current) {
        AuthService.removeAccount(current.userId);
      } else {
        Store.setSession(null);
      }
      AuthService._memorySession = null;
    },

    /* Log out all accounts */
    logoutAll: function () {
      Store.setSession(null);
      Store.saveActiveAccounts([]);
      AuthService._memorySession = null;
    },

    session: function () {
      return Store.getSession() || AuthService._memorySession || null;
    },

    /* Strip password & other sensitive fields before data reaches the UI. */
    sanitize: function (user, role) {
      if (!user) return null;
      const safe = JSON.parse(JSON.stringify(user));
      delete safe.password;
      safe.role = role || safe.role;
      return safe;
    },

    currentUser: function () {
      const s = AuthService.session();
      if (!s) return null;
      const match = AuthService.findUserByIdentifier(s.userId, s.role);
      if (match) return AuthService.sanitize(match.user, s.role);
      return s;
    },

    homeFor: function (role) {
      const r = (role || '').toLowerCase();
      if (r === 'faculty') return '#/faculty/dashboard';
      if (r === 'admin') return '#/admin/dashboard';
      return '#/student/dashboard';
    },

    /* ---------- Student Verification & Mobile SMS OTP ---------- */
    _studentOTPStore: {},

    sendStudentOTP: async function (mobileOrObj, regNo, deptId) {
      await Store.delay(200);
      let phone = '';
      let email = '';
      let reg = regNo;
      if (typeof mobileOrObj === 'object' && mobileOrObj !== null) {
        phone = mobileOrObj.phone || mobileOrObj.mobile || '';
        email = mobileOrObj.email || '';
        reg = mobileOrObj.registrationNumber || mobileOrObj.regNo || regNo;
      } else if (typeof mobileOrObj === 'string') {
        if (mobileOrObj.includes('@')) {
          email = mobileOrObj;
        } else {
          phone = mobileOrObj;
        }
      }

      // Format & clean mobile number
      const rawPhone = String(phone || '').trim();
      const digitsOnly = rawPhone.replace(/\D/g, '');
      let formattedPhone = rawPhone;
      if (digitsOnly.length >= 10) {
        const ten = digitsOnly.slice(-10);
        formattedPhone = '+91 ' + ten.slice(0, 5) + ' ' + ten.slice(5);
      }

      // Check mobile number validity (or fallback to email if strictly email-based)
      if (!digitsOnly || digitsOnly.length < 10) {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error('Please enter a valid 10-digit mobile number to receive your SMS OTP.');
        }
      }

      const regClean = String(reg || '').trim().toUpperCase();
      if (!regClean || regClean.length < 3) {
        throw new Error('Please enter a valid student enrollment or registration number.');
      }

      // Check if user already exists
      const existing = (digitsOnly && AuthService.findUserByIdentifier(digitsOnly)) ||
                       (email && AuthService.findUserByIdentifier(email));
      if (existing) {
        throw new Error('An account with these student credentials is already registered. Please sign in instead.');
      }

      // Generate 6-digit numeric OTP
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

      const otpRecord = {
        code: code,
        phone: rawPhone || digitsOnly,
        digits: digitsOnly,
        formattedPhone: formattedPhone,
        email: email ? String(email).trim().toLowerCase() : '',
        regNo: regClean,
        expiresAt: expiresAt,
        verified: false,
        channel: 'SMS',
        sentAt: Date.now()
      };

      if (rawPhone) AuthService._studentOTPStore[rawPhone] = otpRecord;
      if (digitsOnly) AuthService._studentOTPStore[digitsOnly] = otpRecord;
      if (formattedPhone) AuthService._studentOTPStore[formattedPhone] = otpRecord;
      if (email) AuthService._studentOTPStore[String(email).trim().toLowerCase()] = otpRecord;

      return {
        success: true,
        phone: formattedPhone || rawPhone || email,
        formattedPhone: formattedPhone || rawPhone || email,
        email: email,
        code: code,
        otp: code,
        channel: 'SMS',
        expiresAt: expiresAt,
        message: 'SMS verification code sent to ' + (formattedPhone || rawPhone || email)
      };
    },

    verifyStudentOTP: async function (mobileOrObj, codeArg) {
      await Store.delay(180);
      let target = mobileOrObj;
      let code = codeArg;
      if (typeof mobileOrObj === 'object' && mobileOrObj !== null) {
        target = mobileOrObj.phone || mobileOrObj.mobile || mobileOrObj.email;
        code = mobileOrObj.code || mobileOrObj.otp;
      }
      const clean = String(target || '').trim();
      const digitsOnly = clean.replace(/\D/g, '');
      const codeClean = String(code || '').trim();

      const record = AuthService._studentOTPStore[clean] ||
                     (digitsOnly && AuthService._studentOTPStore[digitsOnly]) ||
                     AuthService._studentOTPStore[clean.toLowerCase()];

      if (!record) {
        throw new Error('No OTP request found for this mobile number. Please click "Send Mobile OTP" first.');
      }
      if (Date.now() > record.expiresAt) {
        throw new Error('The SMS OTP has expired. Please request a new verification code.');
      }
      if (record.code !== codeClean) {
        throw new Error('Incorrect SMS verification code. Please check your mobile messages and try again.');
      }

      record.verified = true;
      record.verifiedAt = Date.now();

      return {
        success: true,
        verified: true,
        phone: record.formattedPhone || record.phone || record.email,
        message: 'Student mobile number verified successfully via SMS!'
      };
    },

    isStudentVerified: function (phoneOrEmail) {
      const clean = String(phoneOrEmail || '').trim();
      const digitsOnly = clean.replace(/\D/g, '');
      const record = AuthService._studentOTPStore[clean] ||
                     (digitsOnly && AuthService._studentOTPStore[digitsOnly]) ||
                     AuthService._studentOTPStore[clean.toLowerCase()];
      return !!(record && record.verified);
    },

    /* ---------- Register New User into Firestore (Student Only) ---------- */
    register: async function (userData) {
      await Store.delay(200);

      const phoneRaw = String(userData.phone || userData.mobile || '').trim();
      const digits = phoneRaw.replace(/\D/g, '');
      const emailClean = (userData.email || '').trim().toLowerCase();

      if (!emailClean) {
        throw new Error('Please enter a valid institutional email address.');
      }
      if (!userData.name || !userData.name.trim()) {
        throw new Error('Please enter your full name.');
      }
      if (!userData.password || userData.password.length < 4) {
        throw new Error('Please choose a password with at least 4 characters.');
      }

      // Requirement 2 & 5: Public registration allows only Student accounts with mandatory mobile OTP verification
      const otpRecord = (phoneRaw && AuthService._studentOTPStore[phoneRaw]) ||
                        (digits && AuthService._studentOTPStore[digits]) ||
                        (emailClean && AuthService._studentOTPStore[emailClean]);

      if (!otpRecord || !otpRecord.verified) {
        throw new Error('Student mobile verification required: Please verify your mobile number with the 6-digit SMS OTP before completing registration.');
      }

      // Check if user already exists
      const existing = AuthService.findUserByIdentifier(emailClean) ||
                       (digits && AuthService.findUserByIdentifier(digits));
      if (existing) {
        throw new Error('An account with these credentials already exists. Please sign in instead.');
      }

      // Role is strictly locked to STUDENT for public registrations
      const role = 'STUDENT';
      let uid = 'STU-' + Math.floor(2000 + Math.random() * 8000);
      const existingStudents = (Store.db && Store.db.students) ? Store.db.students : [];
      const existingRegs = (Store.db && Store.db.studentRegistrations) ? Store.db.studentRegistrations : [];
      while (existingStudents.some(function (s) { return s.id === uid; }) || existingRegs.some(function (r) { return r.uid === uid; })) {
        uid = 'STU-' + Math.floor(2000 + Math.random() * 8000);
      }
      const regNo = (userData.registrationNumber || otpRecord.regNo || '').trim() || ('2024CS' + Math.floor(Math.random() * 800 + 100));
      const studentPhone = (otpRecord && otpRecord.formattedPhone) ? otpRecord.formattedPhone : (digits.length === 10 ? ('+91 ' + digits.slice(0, 5) + ' ' + digits.slice(5)) : phoneRaw);

      // Requirement 5: Student Profile Verification Model (Primary Requirement)
      // A student profile must NOT be created, activated, or made accessible as a verified profile
      // until faculty or administrator has explicitly approved the registration.
      const regDoc = {
        id: 'REG-' + Date.now().toString(36).toUpperCase(),
        uid: uid,
        name: userData.name.trim(),
        email: emailClean,
        phone: studentPhone,
        password: userData.password,
        role: 'STUDENT',
        enrollment: regNo,
        registrationNumber: regNo,
        departmentId: userData.departmentId || 'dept-cse',
        departmentName: userData.departmentName || 'Department of Computer Science & Engineering',
        courseId: userData.courseId || 'course-btech-cse',
        courseName: userData.courseName || 'B.Tech Computer Science & Engineering',
        course: 'B.Tech',
        branch: 'CSE',
        department: userData.departmentName || 'Department of Computer Science & Engineering',
        academicYear: userData.academicYear || '2024-2028',
        semester: (userData.semester || 1) + (userData.semester === 1 ? 'st Semester' : 'th Semester'),
        year: userData.year || '1st Year',
        status: 'PENDING_APPROVAL',
        accountStatus: 'PENDING_APPROVAL',
        isVerifiedStudent: false,
        mobileOtpVerified: true,
        verificationChannel: otpRecord.channel || 'SMS',
        otpVerifiedAt: new Date(otpRecord.verifiedAt || Date.now()).toISOString(),
        submittedAt: new Date().toISOString(),
        color: Math.floor(Math.random() * 6) + 1,
        bio: userData.bio || 'New student registration awaiting faculty verification.'
      };

      const userDoc = {
        uid: uid,
        name: regDoc.name,
        email: regDoc.email,
        phone: regDoc.phone,
        password: regDoc.password,
        role: 'STUDENT',
        departmentId: regDoc.departmentId,
        departmentName: regDoc.departmentName,
        courseId: regDoc.courseId,
        courseName: regDoc.courseName,
        academicYear: regDoc.academicYear,
        registrationNumber: regDoc.registrationNumber,
        accountStatus: 'PENDING_APPROVAL',
        isVerifiedStudent: false,
        verificationChannel: 'SMS',
        otpVerifiedAt: regDoc.otpVerifiedAt,
        color: regDoc.color
      };

      // 1. Create in Firestore with PENDING_APPROVAL status (audit log)
      if (CC.FirestoreService) {
        await CC.FirestoreService.createUser(userDoc);
        await CC.FirestoreService.recordAuditLog({
          actorUid: uid,
          actorEmail: userDoc.email,
          actorRole: 'STUDENT',
          action: 'STUDENT_REGISTRATION_SUBMITTED',
          resourceType: 'REGISTRATION',
          resourceId: regDoc.id,
          metadata: { name: userDoc.name, regNo: regNo, status: 'PENDING_APPROVAL' }
        }).catch(function () {});
      }

      // 2. Add to Store.db.studentRegistrations & Store.db.users
      // Note: We intentionally DO NOT add to Store.db.students until approved!
      if (Store.db) {
        if (!Store.db.studentRegistrations) Store.db.studentRegistrations = [];
        Store.db.studentRegistrations.unshift(regDoc);

        if (!Store.db.users) Store.db.users = [];
        const uIdx = Store.db.users.findIndex(function (u) { return u.uid === uid || u.email === userDoc.email; });
        if (uIdx !== -1) Store.db.users[uIdx] = userDoc;
        else Store.db.users.push(userDoc);

        Store.persist();
      }

      // 3. Return pending response (Do NOT auto-login!)
      return {
        status: 'PENDING_APPROVAL',
        registration: regDoc,
        uid: uid,
        message: 'Your registration has been submitted for faculty / administrative verification. An authorized faculty member or administrator will verify your authenticity before your account is activated.'
      };
    },

    /* ---------- Student Verification Approval / Rejection Management ---------- */
    getPendingStudentRegistrations: function () {
      const db = Store.db || {};
      return (db.studentRegistrations || []).filter(function (r) {
        return r.status === 'PENDING_APPROVAL' || r.accountStatus === 'PENDING_APPROVAL';
      });
    },

    getAllStudentRegistrations: function () {
      const db = Store.db || {};
      return (db.studentRegistrations || []).slice();
    },

    approveStudentRegistration: async function (regIdOrUid, reviewer) {
      await Store.delay(250);
      const db = Store.db || {};
      const regList = db.studentRegistrations || [];
      const reg = regList.find(function (r) { return r.id === regIdOrUid || r.uid === regIdOrUid; });

      if (!reg) {
        throw new Error('Registration record not found.');
      }

      const revName = reviewer ? (reviewer.name || reviewer.userId || 'Faculty Verifier') : 'Faculty Verifier';
      const now = new Date().toISOString();

      reg.status = 'APPROVED';
      reg.accountStatus = 'ACTIVE';
      reg.isVerifiedStudent = true;
      reg.approvedAt = now;
      reg.reviewedAt = now;
      reg.reviewedBy = revName;

      // Instantiate the active student profile into Store.db.students
      const studentObj = {
        id: reg.uid,
        name: reg.name,
        email: reg.email,
        phone: reg.phone,
        password: reg.password,
        enrollment: reg.enrollment || reg.registrationNumber,
        course: reg.course || 'B.Tech',
        branch: reg.branch || 'CSE',
        department: reg.departmentName || reg.department,
        academicYear: reg.academicYear || '2024-2028',
        semester: reg.semester || '1st Semester',
        year: reg.year || '1st Year',
        color: reg.color || 1,
        summary: reg.bio || 'Verified student registered on CampusCred.',
        skills: ['Problem Solving', 'Communication', 'Java', 'Python'],
        education: [
          { level: reg.course || 'B.Tech', institute: 'CampusCred College', branch: reg.branch || 'CSE', from: '2024', to: '2028', detail: 'Enrolled' }
        ],
        projects: [],
        links: [
          { id: 'LNK-' + Date.now(), label: 'Institutional Profile', url: 'https://campuscred.ac.in/#/portfolio/' + reg.uid, visible: true }
        ],
        portfolioVisibility: 'public'
      };

      if (!db.students) db.students = [];
      const sIdx = db.students.findIndex(function (s) { return s.id === reg.uid; });
      if (sIdx !== -1) db.students[sIdx] = studentObj;
      else db.students.push(studentObj);

      // Update user in users collection to ACTIVE
      if (db.users) {
        const u = db.users.find(function (x) { return x.uid === reg.uid || x.email === reg.email; });
        if (u) {
          u.accountStatus = 'ACTIVE';
          u.isVerifiedStudent = true;
          u.verifiedAt = now;
          u.verifiedBy = revName;
        }
      }

      // Add approval notification
      if (!db.notifications) db.notifications = [];
      db.notifications.unshift({
        id: 'NTF-' + Date.now(),
        studentId: reg.uid,
        type: 'approved',
        title: 'Student Registration Approved & Verified',
        body: 'Congratulations, ' + reg.name + '! Your institutional credentials have been verified and approved by ' + revName + '. Your CampusCred student account is now fully active.',
        createdAt: now,
        read: false
      });

      // Mirror to Firestore
      if (CC.FirestoreService) {
        await CC.FirestoreService.upsertStudentProfile(reg.uid, {
          bio: studentObj.summary,
          headline: studentObj.course + ' Student',
          registrationNumber: studentObj.enrollment,
          currentSemester: parseInt(reg.semester || '1', 10),
          isPortfolioPublic: true,
          portfolioSlug: reg.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + reg.uid.toLowerCase(),
          avatarUrl: '',
          totalVerifiedAchievements: 0
        }).catch(function () {});

        await CC.FirestoreService.recordAuditLog({
          actorUid: reviewer ? reviewer.userId : 'FACULTY',
          actorEmail: reviewer ? reviewer.email : 'verifier@campuscred.demo',
          actorRole: reviewer ? reviewer.role.toUpperCase() : 'FACULTY',
          action: 'STUDENT_REGISTRATION_APPROVED',
          resourceType: 'STUDENT',
          resourceId: reg.uid,
          metadata: { studentName: reg.name, approvedBy: revName }
        }).catch(function () {});
      }

      Store.persist();
      return { success: true, student: studentObj, registration: reg };
    },

    rejectStudentRegistration: async function (regIdOrUid, reviewer, reason) {
      await Store.delay(250);
      const db = Store.db || {};
      const regList = db.studentRegistrations || [];
      const reg = regList.find(function (r) { return r.id === regIdOrUid || r.uid === regIdOrUid; });

      if (!reg) {
        throw new Error('Registration record not found.');
      }

      const revName = reviewer ? (reviewer.name || reviewer.userId || 'Faculty Verifier') : 'Faculty Verifier';
      const cleanReason = String(reason || '').trim() || 'Institutional credentials and identity could not be authenticated.';
      const now = new Date().toISOString();

      reg.status = 'REJECTED';
      reg.accountStatus = 'REJECTED';
      reg.isVerifiedStudent = false;
      reg.rejectionReason = cleanReason;
      reg.reviewedAt = now;
      reg.reviewedBy = revName;

      // Ensure student profile is NOT created or activated in Store.db.students
      if (db.students) {
        db.students = db.students.filter(function (s) { return s.id !== reg.uid; });
      }

      // Update user in users collection to REJECTED
      if (db.users) {
        const u = db.users.find(function (x) { return x.uid === reg.uid || x.email === reg.email; });
        if (u) {
          u.accountStatus = 'REJECTED';
          u.rejectionReason = cleanReason;
          u.rejectedAt = now;
          u.rejectedBy = revName;
        }
      }

      // Mirror to Firestore
      if (CC.FirestoreService) {
        await CC.FirestoreService.recordAuditLog({
          actorUid: reviewer ? reviewer.userId : 'FACULTY',
          actorEmail: reviewer ? reviewer.email : 'verifier@campuscred.demo',
          actorRole: reviewer ? reviewer.role.toUpperCase() : 'FACULTY',
          action: 'STUDENT_REGISTRATION_REJECTED',
          resourceType: 'STUDENT',
          resourceId: reg.uid,
          metadata: { studentName: reg.name, reason: cleanReason, rejectedBy: revName }
        }).catch(function () {});
      }

      Store.persist();
      return { success: true, rejected: true, registration: reg };
    },

    /* ---------- Get all available users for Quick Multi-User Selector ---------- */
    getAllUsers: function () {
      const db = Store.db || {};
      const activeList = AuthService.getActiveAccounts();
      const activeMap = {};
      activeList.forEach(a => { activeMap[a.userId] = true; });

      const current = Store.getSession();
      const currentId = current ? current.userId : null;

      const students = (db.students || []).map(function (s) {
        return {
          id: s.id,
          name: s.name,
          email: s.email,
          role: 'student',
          roleLabel: 'Student',
          regNo: s.enrollment || s.id,
          dept: s.department || s.branch || '',
          color: s.color || 1,
          password: s.password || 'student123',
          isActive: s.id === currentId,
          isLoggedIn: !!activeMap[s.id]
        };
      });

      const faculty = (db.faculty || []).map(function (f) {
        return {
          id: f.id,
          name: f.name,
          email: f.email,
          role: 'faculty',
          roleLabel: 'Faculty / Verifier',
          regNo: f.employeeId || f.id,
          dept: f.department || '',
          designation: f.designation || 'Faculty',
          color: f.color || 2,
          password: f.password || 'faculty123',
          isActive: f.id === currentId,
          isLoggedIn: !!activeMap[f.id]
        };
      });

      const adminList = [];
      const seenAdminIds = {};
      if (db.admin) {
        const aid = db.admin.id || 'ADM-301';
        adminList.push(db.admin);
        seenAdminIds[aid] = true;
      }
      if (Array.isArray(db.admins)) {
        db.admins.forEach(function (adm) {
          const aid = adm.id || adm.uid || 'ADM-301';
          if (!seenAdminIds[aid]) {
            adminList.push(adm);
            seenAdminIds[aid] = true;
          }
        });
      }
      if (Array.isArray(db.users)) {
        db.users.forEach(function (u) {
          if ((u.role || '').toUpperCase() === 'ADMIN' && !seenAdminIds[u.uid]) {
            adminList.push({
              id: u.uid,
              name: u.name,
              email: u.email,
              password: u.password || 'admin123',
              department: u.departmentName || 'Administration',
              designation: 'Administrator',
              color: u.color || 1
            });
            seenAdminIds[u.uid] = true;
          }
        });
      }

      const admin = adminList.map(function (a) {
        const aid = a.id || a.uid || 'ADM-301';
        return {
          id: aid,
          name: a.name,
          email: a.email,
          role: 'admin',
          roleLabel: 'Administrator',
          regNo: aid,
          dept: a.department || 'Administration',
          designation: a.designation || 'System Admin',
          color: a.color || 1,
          password: a.password || 'admin123',
          isActive: aid === currentId,
          isLoggedIn: !!activeMap[aid]
        };
      });

      return {
        students: students,
        faculty: faculty,
        admin: admin,
        all: [].concat(students, faculty, admin)
      };
    }
  };

  global.CC = global.CC || {};
  global.CC.AuthService = AuthService;
})(window);
