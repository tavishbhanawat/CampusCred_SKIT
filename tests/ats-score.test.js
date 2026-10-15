/* ============================================================
   CampusCred — tests/ats-score.test.js
   ------------------------------------------------------------
   [Work Package C] Dynamic ATS Score Calculation Engine Tests.
   ============================================================ */
(function () {
  'use strict';

  if (typeof require !== 'undefined') {
    require('./test-setup.js');
    require('./test-framework.js');
  }

  const CC = (typeof window !== 'undefined' ? window.CC : global.CC);
  const ATSService = CC.ATSService;
  const Store = CC.Store;
  const assert = (typeof window !== 'undefined' ? window.assert : global.assert);

  describe('Dynamic ATS Score Calculation Module', function () {

    it('should calculate initial score and rubric breakdown for student resume', function () {
      Store.reset();
      const student = Store.db.students[0];
      const verified = Store.db.activities.filter(a => a.studentId === student.id && a.status === 'verified');

      const analysis = ATSService.analyze({
        student: student,
        activities: verified,
        sections: { summary: true, education: true, skills: true, projects: true, portfolio: true, links: true }
      });

      assert.ok(analysis.score >= 50 && analysis.score <= 100, 'Score should be between 50 and 100');
      assert.ok(analysis.breakdown && analysis.breakdown.length === 5, 'Must contain 5 rubric categories');

      // Verify category weights sum to 100 max points
      const totalMax = analysis.breakdown.reduce((sum, b) => sum + b.max, 0);
      assert.strictEqual(totalMax, 100, 'Rubrics must sum to 100 points maximum');

      // Check verified credentials bonus
      assert.strictEqual(analysis.isVerifiedCampusCred, true, 'Should recognize verified CampusCred credentials');
      assert.ok(analysis.verifiedCount > 0, 'Verified activities count should be positive');
    });

    it('should verify that ATS scores update dynamically when resume content changes', function () {
      Store.reset();
      const student = Store.db.students[0];

      // 1. Minimal resume payload
      const minimalStudent = Object.assign({}, student, {
        summary: 'I am a computer student looking for work.',
        skills: ['Python'],
        projects: [{ name: 'Simple App', description: 'Made a simple project.' }]
      });

      const lowAnalysis = ATSService.analyze({
        student: minimalStudent,
        activities: [],
        sections: { summary: true, education: false, skills: true, projects: true, portfolio: false, links: false }
      });

      // 2. Enriched resume payload with strong action verbs, quantifiable metrics, and multiple skills
      const enrichedStudent = Object.assign({}, student, {
        summary: 'Full-stack software engineer with expertise in distributed cloud architectures. Architected real-time streaming engines handling 250,000+ daily events, reducing latency by 45% and optimizing memory footprints by 30%.',
        skills: ['Python', 'Go', 'Docker', 'Kubernetes', 'PostgreSQL', 'Redis', 'React', 'AWS', 'Kafka', 'GraphQL'],
        projects: [
          {
            name: 'High-Throughput Edge Pipeline',
            description: 'Engineered distributed telemetry microservice handling 50,000 transactions/sec with 99.99% reliability and zero message drops.'
          },
          {
            name: 'Cloud Infrastructure Automation',
            description: 'Automated CI/CD deployment workflows scaling Kubernetes clusters across 12 regions, accelerating delivery speeds by 60%.'
          }
        ]
      });

      const verified = Store.db.activities.filter(a => a.studentId === student.id && a.status === 'verified');
      const highAnalysis = ATSService.analyze({
        student: enrichedStudent,
        activities: verified,
        sections: { summary: true, education: true, skills: true, projects: true, portfolio: true, links: true }
      });

      // Assert dynamic score increase
      assert.ok(
        highAnalysis.score > lowAnalysis.score,
        'Enriched resume score (' + highAnalysis.score + ') must be significantly higher than minimal resume score (' + lowAnalysis.score + ')'
      );

      // Assert metrics detection
      assert.ok(highAnalysis.detectedMetrics.length >= 2, 'Should detect measurable percentage/numerical metrics');
      assert.ok(highAnalysis.foundVerbs.length >= 3, 'Should detect strong action verbs like engineered, automated, architected');
    });

    it('should award credentials bonus exclusively when verified activities are present', function () {
      Store.reset();
      const student = Store.db.students[0];

      // Without verified credentials
      const noCreds = ATSService.analyze({
        student: student,
        activities: [],
        sections: { summary: true, education: true, skills: true, projects: true, portfolio: false, links: true }
      });

      // With verified credentials
      const verified = Store.db.activities.filter(a => a.studentId === student.id && a.status === 'verified');
      const withCreds = ATSService.analyze({
        student: student,
        activities: verified,
        sections: { summary: true, education: true, skills: true, projects: true, portfolio: true, links: true }
      });

      const credsRubricNo = noCreds.breakdown.find(b => b.key === 'credentials');
      const credsRubricYes = withCreds.breakdown.find(b => b.key === 'credentials');

      assert.ok(credsRubricYes.score > credsRubricNo.score, 'Verified credentials must score higher on the credentials rubric');
      assert.strictEqual(credsRubricYes.score, 15, 'Full 15 points should be awarded for verified institutional records');
    });

    it('should generate actionable improvement suggestions for critical issues and missing sections', function () {
      const minimalText = 'John Doe. Developer. Phone 123456.';

      const analysis = ATSService.analyze({
        text: minimalText,
        fileName: 'short-resume.txt'
      });

      assert.ok(analysis.suggestions && analysis.suggestions.length > 0, 'Suggestions should be generated');

      const hasActionVerbSuggestion = analysis.suggestions.some(s => s.title.indexOf('Action Verbs') !== -1 || s.title.indexOf('Impact') !== -1 || s.title.indexOf('Metrics') !== -1);
      assert.ok(hasActionVerbSuggestion, 'Should suggest adding action verbs or measurable metrics');

      const hasLengthSuggestion = analysis.suggestions.some(s => s.title.indexOf('Length') !== -1 || s.title.indexOf('Brief') !== -1);
      assert.ok(hasLengthSuggestion, 'Should warn that resume content is too brief for ATS parsing');
    });

    it('should handle edge cases including empty text and malformed inputs gracefully', function () {
      const emptyAnalysis = ATSService.analyze({});
      assert.ok(emptyAnalysis.score >= 0, 'Empty input should yield a valid numerical score (>= 0)');
      assert.ok(emptyAnalysis.rating, 'Rating label should exist even for empty input');
      assert.ok(Array.isArray(emptyAnalysis.suggestions), 'Suggestions should always be an array');
    });

  });
})();
