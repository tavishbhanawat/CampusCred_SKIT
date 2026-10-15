/* ============================================================
   CampusCred — js/services/verificationService.js
   Faculty approve/reject flow with mandatory reject remarks.
   Replace bodies with POST /api/verify later.
   ============================================================ */
(function (global) {
  'use strict';
  const Store = global.CC.Store;
  const ActivityService = global.CC.ActivityService;

  const VerificationService = {
    /* Pending queue for a faculty member (all departments by default). */
    pendingQueue: function (faculty) {
      let rows = Store.db.activities.filter(function (a) { return a.status === 'pending'; });
      // Demo scoping: a faculty member sees their own department plus any
      // unassigned cross-department submissions flagged to their categories.
      if (faculty && faculty.department) {
        rows = rows.filter(function (a) {
          const st = ActivityService.studentOf(a);
          if (!st) return false;
          return st.department === faculty.department || (faculty.categories || []).indexOf(a.category) !== -1;
        });
      }
      return rows.sort(function (a, b) { return (a.submittedAt || '').localeCompare(b.submittedAt || ''); });
    },

    reviewedBy: function (faculty) {
      return Store.db.activities
        .filter(function (a) { return a.status !== 'pending' && a.reviewerId === faculty.id; })
        .sort(function (a, b) { return (b.reviewedAt || '').localeCompare(a.reviewedAt || ''); });
    },

    historyFor: function (faculty) {
      return VerificationService.reviewedBy(faculty)
        .map(function (a) {
          return {
            id: a.id, at: a.reviewedAt, action: a.status,
            activity: a.name, student: (ActivityService.studentOf(a) || {}).name || '—',
            remarks: a.remarks, category: a.category
          };
        });
    },

    statsFor: function (faculty) {
      const reviewed = VerificationService.reviewedBy(faculty);
      const mine = Store.db.activities.filter(function (a) { return a.reviewerId === faculty.id; });
      return {
        pending: VerificationService.pendingQueue(faculty).length,
        approved: mine.filter(function (a) { return a.status === 'verified'; }).length,
        rejected: mine.filter(function (a) { return a.status === 'rejected'; }).length,
        totalReviewed: reviewed.length
      };
    },

    /* ---------- decision ---------- */
    approve: async function (activityId, faculty, remark) {
      await Store.delay(320);
      const act = ActivityService.byId(activityId);
      if (!act) throw new Error('Submission not found.');
      if (act.status !== 'pending') throw new Error('This submission has already been reviewed.');

      if (global.CC && global.CC.FirestoreService) {
        const updated = await global.CC.FirestoreService.verifyActivity(activityId, faculty, 'APPROVE', remark);
        Object.assign(act, updated);
        Store.persist();
        return act;
      }

      const today = Store.today();
      act.status = 'verified';
      act.reviewedAt = today;
      act.reviewerId = faculty.id;
      act.remarks = (remark || '').trim() || 'Certificate verified against the submitted proof. Approved.';
      if (!act.certificateId) act.certificateId = VerificationService.issueCertificateId(act);
      act.history.push({ at: today, action: 'approved', by: faculty.name, note: act.remarks });

      Store.db.auditLog.unshift({
        id: Store.uid('LOG'), activityId: act.id, action: 'approved',
        by: faculty.id, at: today, note: act.remarks
      });
      Store.db.notifications.unshift({
        id: Store.uid('NTF'), studentId: act.studentId, type: 'approved',
        title: 'Achievement verified',
        body: '“' + act.name + '” was approved by ' + faculty.name + ' and added to your verified portfolio.',
        createdAt: today, read: false
      });

      Store.persist();
      return act;
    },

    reject: async function (activityId, faculty, remark) {
      await Store.delay(320);
      const act = ActivityService.byId(activityId);
      if (!act) throw new Error('Submission not found.');
      if (act.status !== 'pending') throw new Error('This submission has already been reviewed.');

      const reason = String(remark || '').trim();
      if (!reason) throw new Error('A rejection reason is required when rejecting a submission.');

      if (global.CC && global.CC.FirestoreService) {
        const updated = await global.CC.FirestoreService.verifyActivity(activityId, faculty, 'REJECT', reason);
        Object.assign(act, updated);
        Store.persist();
        return act;
      }

      const today = Store.today();
      act.status = 'rejected';
      act.reviewedAt = today;
      act.reviewerId = faculty.id;
      act.remarks = reason;
      act.history.push({ at: today, action: 'rejected', by: faculty.name, note: reason });

      Store.db.auditLog.unshift({
        id: Store.uid('LOG'), activityId: act.id, action: 'rejected',
        by: faculty.id, at: today, note: reason
      });
      Store.db.notifications.unshift({
        id: Store.uid('NTF'), studentId: act.studentId, type: 'rejected',
        title: 'Action needed on submission',
        body: '“' + act.name + '” was rejected. Rejection reason: ' + reason,
        createdAt: today, read: false
      });

      Store.persist();
      return act;
    },

    issueCertificateId: function (act) {
      const year = new Date().getFullYear();
      const seq = String(Store.db.activities.filter(function (a) { return a.certificateId; }).length + 1).padStart(4, '0');
      return 'CC-' + year + '-' + seq;
    },

    /* Recent college-wide verification feed for the admin dashboard. */
    recentAudit: function (limit) {
      return (Store.db.auditLog || []).slice(0, limit || 8).map(function (log) {
        const act = ActivityService.byId(log.activityId);
        const st = act ? ActivityService.studentOf(act) : null;
        const by = Store.db.faculty.find(function (f) { return f.id === log.by; });
        return {
          id: log.id,
          action: log.action,
          at: log.at,
          note: log.note,
          activity: act ? act.name : '—',
          student: st ? st.name : '—',
          reviewer: by ? by.name : 'Faculty Reviewer'
        };
      });
    }
  };

  global.CC.VerificationService = VerificationService;
})(window);
