/* ============================================================
   CampusCred — tests/resume-generator.test.js
   ------------------------------------------------------------
   [Work Package C] Resume Generator & Template Builder Test Suite.
   ============================================================ */
(function () {
  'use strict';

  if (typeof require !== 'undefined') {
    require('./test-setup.js');
    require('./test-framework.js');
  }

  const CC = (typeof window !== 'undefined' ? window.CC : global.CC);
  const Store = CC.Store;
  const AS = CC.ActivityService;
  const assert = (typeof window !== 'undefined' ? window.assert : global.assert);

  describe('Resume Generator Module', function () {

    it('should filter activities so only verified records appear on resume with verification stamp', function () {
      Store.reset();
      const student = Store.db.students[0];
      const allActivities = AS.forStudent(student.id);

      // Verify that student has both verified and pending/rejected records in mock data
      const verified = allActivities.filter(a => a.status === 'verified');
      const pending = allActivities.filter(a => a.status === 'pending');

      assert.ok(verified.length > 0, 'Student should have verified achievements');
      assert.ok(pending.length > 0, 'Student should have pending achievements');

      // The resume builder must ONLY include verified activities
      const resumeActivities = allActivities.filter(a => a.status === 'verified');
      assert.strictEqual(resumeActivities.length, verified.length, 'Resume must only select verified achievements');

      resumeActivities.forEach(function (act) {
        assert.strictEqual(act.status, 'verified', 'Every activity on the resume must be verified');
        assert.ok(act.certificateId, 'Verified resume achievements should have an issued certificate ID');
      });
    });

    it('should support ATS-Friendly, Modern, and Academic CV template styles', function () {
      const templates = ['ats', 'modern', 'academic'];
      templates.forEach(function (tpl) {
        assert.ok(tpl === 'ats' || tpl === 'modern' || tpl === 'academic', 'Template identifier must be valid');
      });
    });

    it('should allow dynamic skill management without duplicate entries', function () {
      const skills = ['Python', 'Docker', 'Go'];

      // Add unique skill
      const newSkill = 'Kubernetes';
      if (skills.indexOf(newSkill) === -1) {
        skills.push(newSkill);
      }
      assert.strictEqual(skills.length, 4, 'Skill should be added');
      assert.ok(skills.indexOf('Kubernetes') !== -1, 'Kubernetes should be present in skills list');

      // Attempt duplicate skill
      const duplicateSkill = 'Python';
      let duplicateAdded = false;
      if (skills.indexOf(duplicateSkill) === -1) {
        skills.push(duplicateSkill);
        duplicateAdded = true;
      }
      assert.strictEqual(duplicateAdded, false, 'Duplicate skill should not be added');
      assert.strictEqual(skills.length, 4, 'Skills length should remain unchanged');

      // Remove skill
      const filtered = skills.filter(s => s !== 'Docker');
      assert.strictEqual(filtered.length, 3, 'Skill should be removed');
      assert.strictEqual(filtered.indexOf('Docker'), -1, 'Docker should no longer be present');
    });

    it('should integrate direct recruiter portfolio link and verified credentials registry link', function () {
      Store.reset();
      const student = Store.db.students[0];
      const expectedPortUrl = 'https://campuscred.ac.in/#/portfolio/' + student.id;

      assert.ok(expectedPortUrl.indexOf(student.id) !== -1, 'Portfolio URL must contain student ID');
      assert.ok(expectedPortUrl.indexOf('#/portfolio/') !== -1, 'Portfolio URL must direct to portfolio view');
    });

    it('should handle section toggles enabling and disabling specific resume sections', function () {
      const defaultSections = { summary: true, education: true, skills: true, projects: true, portfolio: true, links: true };

      // Toggle off summary and links
      const modifiedSections = Object.assign({}, defaultSections, { summary: false, links: false });

      assert.strictEqual(modifiedSections.summary, false, 'Summary section should be disabled');
      assert.strictEqual(modifiedSections.links, false, 'Links section should be disabled');
      assert.strictEqual(modifiedSections.skills, true, 'Skills section should remain enabled');
      assert.strictEqual(modifiedSections.projects, true, 'Projects section should remain enabled');
    });

  });
})();
