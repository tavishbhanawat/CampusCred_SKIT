/* ============================================================
   CampusCred — tests/integration.test.js
   ------------------------------------------------------------
   [Work Package A] End-to-End Multi-Module Integration Workflow.
   Validates complete lifecycle across all 3 team work packages:
     1. Student Registration & Faculty Review Gate
     2. Student Profile, Year of Study & Avatar Cropping
     3. Original Certificate Proof Upload & Inspection
     4. Faculty Verification Decision & Certificate ID Issuance
     5. Resume Builder Inclusion & Dynamic ATS Score Upgrade
     6. Public Ledger Certificate Authenticity Verification
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
  const ProfileService = CC.ProfileService;
  const ProfileCropper = CC.ProfileCropper;
  const ActivityService = CC.ActivityService;
  const CertificateRenderer = CC.CertificateRenderer;
  const CertificateService = CC.CertificateService;
  const ATSService = CC.ATSService;
  const Store = CC.Store;
  const assert = (typeof window !== 'undefined' ? window.assert : global.assert);

  describe('End-to-End Multi-Module Integration Workflow', function () {

    it('should complete the entire student registration, profile setup, certificate upload, faculty verification, resume ATS scoring, and public verification cycle', async function () {
      Store.reset();

      // ==========================================================
      // STEP 1: Student Registration (Work Packages A & C)
      // ==========================================================
      const studentData = {
        name: 'Arjun Singhania',
        email: 'arjun.singhania@campuscred.demo',
        registrationNumber: '2024CS199',
        department: 'Computer Science & Engineering',
        year: '2nd Year',
        semester: '3rd Semester',
        phone: '+91 98888 77777',
        password: 'Password123',
        skipOtp: true
      };

      const regRes = await AuthService.register(studentData);
      assert.strictEqual(regRes.status, 'PENDING_APPROVAL', 'Registration must initially be PENDING_APPROVAL');
      assert.strictEqual((Store.db.students || []).find(s => s.email === studentData.email), undefined, 'Profile must not exist before approval');

      // Attempted login must be blocked
      await assert.rejects(async function () {
        await AuthService.login({ identifier: studentData.email, password: studentData.password });
      }, /REGISTRATION_PENDING/i, 'Pending student cannot log in');

      // ==========================================================
      // STEP 2: Faculty Reviews & Approves Registration (Work Package C)
      // ==========================================================
      const faculty = (Store.db.faculty || [])[0] || { id: 'FAC-201', name: 'Dr. Rohit Mehta', role: 'faculty' };
      const pendingRegs = StudentVerif.getPendingRegistrations(faculty);
      const targetReg = pendingRegs.find(r => r.email === studentData.email);
      assert.ok(targetReg, 'Registration must be present in faculty pending queue');

      const approval = await StudentVerif.approveRegistration(targetReg.id, faculty);
      assert.strictEqual(approval.success, true, 'Registration approval must succeed');

      // Now student can sign in
      const loginSession = await AuthService.login({ identifier: studentData.email, password: studentData.password });
      assert.strictEqual(loginSession.role, 'student', 'Student must be authenticated');
      const studentId = loginSession.user.id || loginSession.user.uid;

      // ==========================================================
      // STEP 3: Student Updates Profile & Photo Cropper (Work Package B)
      // ==========================================================
      const updatedProfile = await ProfileService.update(studentId, {
        year: '3rd Year',
        semester: '5th Semester',
        headline: 'Cloud Native Developer & Distributed Systems Enthusiast',
        skills: ['Go', 'Kubernetes', 'Python', 'React', 'Docker']
      });
      assert.strictEqual(updatedProfile.year, '3rd Year', 'Year of study must be updated');
      assert.strictEqual(updatedProfile.headline.indexOf('Cloud Native') !== -1, true, 'Headline must be updated');

      // Upload and crop avatar
      const mockCroppedPhoto = 'data:image/png;base64,sample-avatar-cropped-arjun';
      const avatarRes = await ProfileCropper.saveAvatar(studentId, mockCroppedPhoto);
      assert.strictEqual(avatarRes.avatar, mockCroppedPhoto, 'Cropped avatar photo must be saved');

      // ==========================================================
      // STEP 4: Submit Achievement with Original Certificate (Work Package B)
      // ==========================================================
      const originalCertDoc = {
        fileName: 'national-hackathon-arjun-original.pdf',
        fileType: 'application/pdf',
        fileSize: 345000,
        dataUrl: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwgL0xlbmd0aCA1IDAgUiAvRmlsdGVyIC9GbGF0ZURlY29kZSA+PgpzdHJlYW0KeJzLzcxTSEvMzUzPVMhLLSrNSwEAG2kF/gplbmRzdHJlYW0KZW5kb2JqCg=='
      };

      const newActivity = await ActivityService.add({
        studentId: studentId,
        name: 'National Edge Computing Hackathon 2026',
        category: 'Hackathon',
        organization: 'Ministry of Electronics & IT',
        date: '2026-03-25',
        role: 'Team Lead & Core Architect',
        result: '1st Prize - Gold Winner',
        description: 'Built high-throughput decentralized edge caching mesh with 99.99% availability.',
        proof: originalCertDoc
      });
      assert.strictEqual(newActivity.status, 'pending', 'Submitted activity must be pending');

      // Verify certificate renderer preserves the exact original document without modifying it
      const docHtml = CertificateRenderer.renderDocPreview(newActivity);
      assert.ok(docHtml.indexOf(originalCertDoc.dataUrl) !== -1, 'Renderer must preserve exact original document dataUrl');
      assert.ok(docHtml.indexOf('Original PDF Certificate') !== -1, 'Must indicate original document fidelity');

      // ==========================================================
      // STEP 5: Faculty Inspects & Approves Activity (Work Package C)
      // ==========================================================
      const facultyQueue = ActivityVerif.pendingQueue(faculty);
      const queueItem = facultyQueue.find(a => a.id === newActivity.id);
      assert.ok(queueItem, 'Activity must appear in faculty review queue');

      const approvedAct = await ActivityVerif.approve(newActivity.id, faculty, 'Original certificate validated against ministry records. Verified.');
      assert.strictEqual(approvedAct.status, 'verified', 'Activity must be verified');
      assert.ok(approvedAct.certificateId, 'Certificate ID must be assigned upon approval');
      const issuedCertId = approvedAct.certificateId;

      // ==========================================================
      // STEP 6: Resume Builder & Dynamic ATS Scoring (Work Package C)
      // ==========================================================
      const verifiedList = ActivityService.forStudent(studentId).filter(a => a.status === 'verified');
      assert.ok(verifiedList.some(a => a.id === newActivity.id), 'Verified activity must be available for resume');

      const atsAnalysis = ATSService.analyze({
        student: updatedProfile,
        activities: verifiedList,
        sections: { summary: true, education: true, skills: true, projects: true, portfolio: true, links: true }
      });

      assert.strictEqual(atsAnalysis.isVerifiedCampusCred, true, 'ATS analysis must recognize verified credentials');
      assert.ok(atsAnalysis.score >= 50, 'ATS score should be valid and positive for verified profile');

      // ==========================================================
      // STEP 7: Public Ledger Certificate Lookup (Work Package B & A)
      // ==========================================================
      const publicLookup = await CertificateService.verifyCertificate(issuedCertId);
      assert.strictEqual(publicLookup.status, 'verified', 'Public verification must return verified status');
      assert.strictEqual(publicLookup.found, true, 'Record must be found in public ledger');
      assert.strictEqual(publicLookup.certificateId, issuedCertId, 'Certificate ID must match');
      assert.strictEqual(publicLookup.activity, newActivity.name, 'Activity title must match');
      assert.strictEqual(publicLookup.studentName, studentData.name, 'Student recipient name must match');
    });

  });
})();
