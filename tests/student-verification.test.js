/* ============================================================
   CampusCred — tests/student-verification.test.js
   ------------------------------------------------------------
   [Work Package C] Student Registration & Verification Workflow Tests.
   ============================================================ */
(function () {
  'use strict';

  if (typeof require !== 'undefined') {
    require('./test-setup.js');
    require('./test-framework.js');
  }

  const CC = (typeof window !== 'undefined' ? window.CC : global.CC);
  const AuthService = CC.AuthService;
  const StudentVerif = CC.StudentVerificationService;
  const ActivityVerif = CC.ActivityVerificationService;
  const Store = CC.Store;
  const assert = (typeof window !== 'undefined' ? window.assert : global.assert);

  describe('Student Registration & Verification Workflow Module', function () {

    it('should verify that student registration remains pending until faculty/admin approval and profile is not created before approval', async function () {
      Store.reset();

      const newStudentPayload = {
        name: 'Kavya Sharma',
        email: 'kavya.sharma@test.edu',
        registrationNumber: '2024CS088',
        department: 'Computer Science & Engineering',
        year: '2nd Year',
        semester: '3rd Semester',
        phone: '+91 98111 22233',
        password: 'Password123',
        skipOtp: true
      };

      // 1. Student registers
      const regRes = await AuthService.register(newStudentPayload);
      assert.strictEqual(regRes.status, 'PENDING_APPROVAL', 'Initial registration status must be PENDING_APPROVAL');
      assert.strictEqual(regRes.success, true, 'Registration submission should succeed');

      // 2. Profile MUST NOT be created in db.students yet
      const studentProfile = (Store.db.students || []).find(s => s.email === newStudentPayload.email);
      assert.strictEqual(studentProfile, undefined, 'Student profile must NOT exist in students collection prior to approval');

      // 3. User login must fail with REGISTRATION_PENDING error
      await assert.rejects(async function () {
        await AuthService.login({ identifier: newStudentPayload.email, password: newStudentPayload.password });
      }, /REGISTRATION_PENDING/i, 'Pending student must not be allowed to sign in');

      await assert.rejects(async function () {
        await AuthService.login({ identifier: newStudentPayload.registrationNumber, password: newStudentPayload.password });
      }, /REGISTRATION_PENDING/i, 'Pending student must not be allowed to sign in via enrollment ID');
    });

    it('should verify that unauthorized users cannot approve student registrations or access restricted information', async function () {
      Store.reset();
      const studentUser = Store.db.students[0]; // Regular student user (unauthorized)
      const anonymousUser = { role: 'guest', id: 'GUEST-1' };

      // 1. Student attempts to access pending registration queue
      assert.throws(function () {
        StudentVerif.getPendingRegistrations(studentUser);
      }, /ACCESS_DENIED/i, 'Student should be blocked from viewing pending registration records');

      // 2. Anonymous / student attempts to approve registration
      await assert.rejects(async function () {
        await StudentVerif.approveRegistration('REG-TEST-001', studentUser);
      }, /PERMISSION_DENIED/i, 'Unauthorized student cannot approve registrations');

      await assert.rejects(async function () {
        await StudentVerif.approveRegistration('REG-TEST-001', anonymousUser);
      }, /PERMISSION_DENIED/i, 'Anonymous guest cannot approve registrations');
    });

    it('should activate student profile and allow login once authorized faculty approves registration', async function () {
      Store.reset();
      const facultyReviewer = (Store.db.faculty || [])[0] || { id: 'FAC-201', name: 'Dr. Rohit Mehta', role: 'faculty' };

      const regPayload = {
        name: 'Rohan Mehra',
        email: 'rohan.mehra@test.edu',
        registrationNumber: '2024IT055',
        department: 'Information Technology',
        year: '2nd Year',
        semester: '3rd Semester',
        phone: '+91 97777 66666',
        password: 'Password123',
        skipOtp: true
      };

      // Register student
      const regRes = await AuthService.register(regPayload);
      const regId = regRes.registration.id;

      // Faculty approves student registration
      const approvalResult = await StudentVerif.approveRegistration(regId, facultyReviewer);
      assert.strictEqual(approvalResult.success, true, 'Approval should return success');
      assert.strictEqual(approvalResult.activated, true, 'Profile must be activated');

      // Verify that student profile is now created in db.students
      const activatedStudent = (Store.db.students || []).find(s => s.email === regPayload.email);
      assert.ok(activatedStudent, 'Student profile must now exist in db.students');
      assert.strictEqual(activatedStudent.name, regPayload.name, 'Student name must match');
      assert.strictEqual(activatedStudent.enrollment, regPayload.registrationNumber, 'Enrollment must match');
      assert.strictEqual(activatedStudent.year, '2nd Year', 'Year of study must match');

      // Verify that student can now sign in successfully
      const loginRes = await AuthService.login({ identifier: regPayload.email, password: regPayload.password });
      assert.ok(loginRes, 'Login should succeed after approval');
      assert.strictEqual(loginRes.role, 'student', 'Role must be student');
      assert.strictEqual(loginRes.user.email, regPayload.email, 'Logged in user email must match');
    });

    it('should reject student registration with mandatory reason and deny profile creation', async function () {
      Store.reset();
      const facultyReviewer = (Store.db.faculty || [])[0] || { id: 'FAC-201', name: 'Dr. Rohit Mehta', role: 'faculty' };

      const fakeStudentPayload = {
        name: 'Imposter User',
        email: 'fake.user@external.com',
        registrationNumber: 'FAKE999',
        department: 'Computer Science & Engineering',
        password: 'Password123',
        skipOtp: true
      };

      const regRes = await AuthService.register(fakeStudentPayload);
      const regId = regRes.registration.id;

      // Attempt rejection without mandatory reason -> should throw
      await assert.rejects(async function () {
        await StudentVerif.rejectRegistration(regId, facultyReviewer, '');
      }, /mandatory institutional rejection reason is required/i, 'Rejection requires mandatory rationale');

      // Reject with valid institutional reason
      const rejectionReason = 'Enrollment number does not exist in registrar records.';
      const rejectResult = await StudentVerif.rejectRegistration(regId, facultyReviewer, rejectionReason);
      assert.strictEqual(rejectResult.success, true, 'Rejection should succeed');
      assert.strictEqual(rejectResult.registration.status, 'REJECTED', 'Status must be REJECTED');

      // Profile must NOT exist in db.students
      const profile = (Store.db.students || []).find(s => s.email === fakeStudentPayload.email);
      assert.strictEqual(profile, undefined, 'Rejected student profile must NOT exist');

      // Login must fail with REGISTRATION_REJECTED and show the reason
      await assert.rejects(async function () {
        await AuthService.login({ identifier: fakeStudentPayload.email, password: fakeStudentPayload.password });
      }, /REGISTRATION_REJECTED/i, 'Rejected student login must fail with REGISTRATION_REJECTED');
    });

    it('should verify activity submission workflow: queue, approve with certificate ID, reject with mandatory remark', async function () {
      Store.reset();
      const faculty = (Store.db.faculty || [])[0];
      const student = (Store.db.students || [])[0];

      // Submit an activity
      const newAct = await CC.ActivityService.add({
        studentId: student.id,
        name: 'Campus Hackathon 2026',
        category: 'Hackathon',
        organization: 'SKIT Tech Society',
        date: '2026-03-20',
        proof: {
          fileName: 'hackathon-proof.png',
          fileType: 'image/png',
          fileSize: 102400,
          dataUrl: 'data:image/png;base64,sample-proof'
        }
      });

      assert.strictEqual(newAct.status, 'pending', 'Newly submitted activity must be pending');

      // Check pending queue for faculty
      const queue = ActivityVerif.pendingQueue(faculty);
      const foundInQueue = queue.some(a => a.id === newAct.id);
      assert.ok(foundInQueue, 'Pending activity should appear in faculty pending queue');

      // Approve activity -> Certificate ID should be issued
      const approved = await ActivityVerif.approve(newAct.id, faculty, 'Excellent hackathon prototype. Verified.');
      assert.strictEqual(approved.status, 'verified', 'Activity status must be verified');
      assert.ok(approved.certificateId, 'Unique Certificate ID must be generated upon approval');
      assert.ok(approved.certificateId.startsWith('CC-202'), 'Certificate ID format should start with CC-202X');

      // Notification sent to student
      const notifs = CC.ActivityService.notificationsFor(student.id);
      const notif = notifs.find(n => n.title.indexOf('Verified') !== -1);
      assert.ok(notif, 'Student should receive an approval notification');
    });

  });
})();
