/* ============================================================
   CampusCred — tests/student-profile.test.js
   ------------------------------------------------------------
   [Work Package B] Student Profile & Photo Cropping Test Suite.
   ============================================================ */
(function () {
  'use strict';

  if (typeof require !== 'undefined') {
    require('./test-setup.js');
    require('./test-framework.js');
  }

  const CC = (typeof window !== 'undefined' ? window.CC : global.CC);
  const PS = CC.ProfileService;
  const Cropper = CC.ProfileCropper;
  const Store = CC.Store;
  const assert = (typeof window !== 'undefined' ? window.assert : global.assert);

  describe('Student Profile Module', function () {

    it('should read student profile and ensure password is never exposed', function () {
      Store.reset();
      const student = Store.db.students[0];
      assert.ok(student, 'A demo student should exist');

      const profile = PS.get(student.id);
      assert.ok(profile, 'Profile should be returned');
      assert.strictEqual(profile.id, student.id, 'Student ID must match');
      assert.strictEqual(profile.password, undefined, 'Password must be completely stripped');
    });

    it('should update academic details including current year of study and semester', async function () {
      Store.reset();
      const student = Store.db.students[0];

      const updated = await PS.update(student.id, {
        year: '4th Year',
        semester: '7th Semester',
        department: 'Electronics & Communication',
        headline: 'Embedded Systems & AI Specialist'
      });

      assert.strictEqual(updated.year, '4th Year', 'Year of study should be updated to 4th Year');
      assert.strictEqual(updated.semester, '7th Semester', 'Current semester should be updated');
      assert.strictEqual(updated.department, 'Electronics & Communication', 'Department should be updated');
      assert.strictEqual(updated.headline, 'Embedded Systems & AI Specialist', 'Headline should be updated');

      // Check persistence in Store
      const fresh = PS.get(student.id);
      assert.strictEqual(fresh.year, '4th Year', 'Persisted year should be 4th Year');
    });

    it('should validate profile picture upload formats and size limits', function () {
      const validPng = { name: 'photo.png', type: 'image/png', size: 1024 * 1024 };
      const validJpg = { name: 'photo.jpg', type: 'image/jpeg', size: 2 * 1024 * 1024 };
      const invalidExe = { name: 'script.exe', type: 'application/x-msdownload', size: 1024 };
      const oversized = { name: 'heavy.png', type: 'image/png', size: 8 * 1024 * 1024 }; // 8MB > 5MB limit

      const v1 = Cropper.validateFile(validPng);
      assert.strictEqual(v1.valid, true, 'Valid PNG should pass validation');

      const v2 = Cropper.validateFile(validJpg);
      assert.strictEqual(v2.valid, true, 'Valid JPG should pass validation');

      const v3 = Cropper.validateFile(invalidExe);
      assert.strictEqual(v3.valid, false, 'Executable file must be rejected');

      const v4 = Cropper.validateFile(oversized);
      assert.strictEqual(v4.valid, false, 'Oversized photo (>5MB) must be rejected');
    });

    it('should verify profile pictures can be uploaded, cropped, previewed, and saved', async function () {
      Store.reset();
      const student = Store.db.students[0];

      const mockCroppedDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      // Save cropped photo
      const updated = await Cropper.saveAvatar(student.id, mockCroppedDataUrl);
      assert.strictEqual(updated.avatar, mockCroppedDataUrl, 'Cropped avatar DataURL must be saved to student profile');

      // Verify profile retrieval includes avatar
      const profile = PS.get(student.id);
      assert.strictEqual(profile.avatar, mockCroppedDataUrl, 'Retrieved profile must reflect new cropped avatar');

      // Remove photo and verify reversion to default
      const reverted = await Cropper.removeAvatar(student.id, student.name, student.color);
      assert.strictEqual(reverted.avatar, null, 'Avatar should revert to null when removed');

      const profileAfterRemove = PS.get(student.id);
      assert.strictEqual(profileAfterRemove.avatar, null, 'Retrieved profile should have null avatar');
    });

    it('should reject invalid input updates such as empty name or bad email', async function () {
      Store.reset();
      const student = Store.db.students[0];

      await assert.rejects(async function () {
        await PS.update(student.id, { name: '   ' });
      }, /Full name cannot be empty/i, 'Empty name should be rejected');

      await assert.rejects(async function () {
        await PS.update(student.id, { email: 'invalid-email-string' });
      }, /valid institutional email/i, 'Invalid email format should be rejected');
    });

  });
})();
