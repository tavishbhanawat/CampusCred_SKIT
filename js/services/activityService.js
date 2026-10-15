/* ============================================================
   CampusCred — js/services/activityService.js
   CRUD + filtering for participation records.
   Replace bodies with fetch('/api/activities') later.
   ============================================================ */
(function (global) {
  'use strict';
  const Store = global.CC.Store;
  const Mock = global.MockData;

  const ActivityService = {
    /* ---------- reads ---------- */
    all: function () { return Store.db.activities.slice(); },

    byId: function (id) {
      return Store.db.activities.find(function (a) { return a.id === id; }) || null;
    },

    forStudent: function (studentId) {
      return Store.db.activities
        .filter(function (a) { return a.studentId === studentId; })
        .sort(function (a, b) { return (b.submittedAt || '').localeCompare(a.submittedAt || ''); });
    },

    /* Shared filter used by student / faculty / admin tables. */
    query: function (filters) {
      filters = filters || {};
      let rows = Store.db.activities.slice();

      if (filters.studentId) rows = rows.filter(function (a) { return a.studentId === filters.studentId; });
      if (filters.status && filters.status !== 'all') rows = rows.filter(function (a) { return a.status === filters.status; });
      if (filters.category && filters.category !== 'all') rows = rows.filter(function (a) { return a.category === filters.category; });
      if (filters.department && filters.department !== 'all') {
        rows = rows.filter(function (a) {
          const st = ActivityService.studentOf(a);
          return st && st.department === filters.department;
        });
      }
      if (filters.branch && filters.branch !== 'all') {
        rows = rows.filter(function (a) {
          const st = ActivityService.studentOf(a);
          return st && st.branch === filters.branch;
        });
      }
      if (filters.year && filters.year !== 'all') {
        rows = rows.filter(function (a) {
          const st = ActivityService.studentOf(a);
          return st && st.academicYear === filters.year;
        });
      }
      if (filters.from) rows = rows.filter(function (a) { return a.date >= filters.from; });
      if (filters.to) rows = rows.filter(function (a) { return a.date <= filters.to; });

      if (filters.search) {
        const q = filters.search.toLowerCase();
        rows = rows.filter(function (a) {
          const st = ActivityService.studentOf(a);
          return (
            a.name.toLowerCase().indexOf(q) !== -1 ||
            a.organization.toLowerCase().indexOf(q) !== -1 ||
            a.category.toLowerCase().indexOf(q) !== -1 ||
            (a.certificateId || '').toLowerCase().indexOf(q) !== -1 ||
            (st && (st.name.toLowerCase().indexOf(q) !== -1 || st.enrollment.toLowerCase().indexOf(q) !== -1))
          );
        });
      }

      return rows.sort(function (a, b) { return (b.submittedAt || '').localeCompare(a.submittedAt || ''); });
    },

    /* ---------- joins ---------- */
    studentOf: function (activity) {
      return Store.db.students.find(function (s) { return s.id === activity.studentId; }) || null;
    },

    reviewerOf: function (activity) {
      if (!activity.reviewerId) return null;
      return Store.db.faculty.find(function (f) { return f.id === activity.reviewerId; }) || null;
    },

    statsFor: function (studentId) {
      const rows = ActivityService.forStudent(studentId);
      return {
        total: rows.length,
        verified: rows.filter(function (a) { return a.status === 'verified'; }).length,
        pending: rows.filter(function (a) { return a.status === 'pending'; }).length,
        rejected: rows.filter(function (a) { return a.status === 'rejected'; }).length
      };
    },

    /* ---------- create ---------- */
    create: async function (payload, student) {
      await Store.delay(350);

      if (!payload.name || !payload.name.trim()) throw new Error('Activity name is required.');
      if (!payload.category) throw new Error('Please select an activity category.');
      if (!payload.date) throw new Error('Event date is required.');

      // Validate proof file when one is attached
      if (payload.proof && payload.proof.fileName) {
        const okTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (okTypes.indexOf(payload.proof.fileType) === -1) {
          throw new Error('Only PDF, JPG and PNG files are allowed.');
        }
        if (payload.proof.fileSize > 5 * 1024 * 1024) {
          throw new Error('File is too large. Maximum allowed size is 5 MB.');
        }
      }

      let activity;
      if (global.CC && global.CC.FirestoreService) {
        activity = await global.CC.FirestoreService.createActivity(payload, student);
        Store.db.activities.unshift(activity);
        Store.persist();
        return activity;
      }

      const id = Store.uid('ACT');
      const today = Store.today();
      activity = {
        id: id,
        studentId: student.id,
        name: payload.name.trim(),
        category: payload.category,
        organization: (payload.organization || '').trim() || '—',
        date: payload.date,
        role: payload.role || 'Participant',
        result: (payload.result || '').trim() || 'Participation Certificate',
        description: (payload.description || '').trim(),
        proof: payload.proof || { fileName: '', fileType: '', fileSize: 0, dataUrl: null },
        certificateId: (payload.certificateId || '').trim(),
        status: 'pending',
        submittedAt: today,
        reviewedAt: null,
        reviewerId: null,
        remarks: '',
        history: [{ at: today, action: 'submitted', by: student.name, note: 'Submitted for verification.' }]
      };

      Store.db.activities.push(activity);

      Store.db.notifications.unshift({
        id: Store.uid('NTF'),
        studentId: student.id,
        type: 'pending',
        title: 'Submitted successfully',
        body: '“' + activity.name + '” is now pending faculty verification.',
        createdAt: today,
        read: false
      });

      Store.persist();
      return activity;
    },

    remove: async function (activityId) {
      await Store.delay(220);
      const idx = Store.db.activities.findIndex(function (a) { return a.id === activityId; });
      if (idx === -1) throw new Error('Activity not found.');
      if (Store.db.activities[idx].status !== 'pending') {
        throw new Error('Only pending submissions can be deleted.');
      }
      Store.db.activities.splice(idx, 1);
      Store.persist();
      return true;
    },

    /* ---------- notifications ---------- */
    notificationsFor: function (studentId) {
      return Store.db.notifications.filter(function (n) { return n.studentId === studentId; });
    },
    unreadCount: function (studentId) {
      return Store.db.notifications.filter(function (n) { return n.studentId === studentId && !n.read; }).length;
    },
    markRead: function (studentId, notifId) {
      if (notifId === 'all') {
        Store.db.notifications.forEach(function (n) { if (n.studentId === studentId) n.read = true; });
      } else {
        const n = Store.db.notifications.find(function (x) { return x.id === notifId; });
        if (n) n.read = true;
      }
      Store.persist();
    },

    /* Faculty remarks left on a student's submissions. */
    remarksFor: function (studentId) {
      return Store.db.activities
        .filter(function (a) { return a.studentId === studentId && a.remarks; })
        .map(function (a) {
          const reviewer = ActivityService.reviewerOf(a);
          return {
            activityId: a.id,
            activityName: a.name,
            status: a.status,
            at: a.reviewedAt || a.submittedAt,
            reviewer: reviewer ? reviewer.name : 'Faculty Reviewer',
            remarks: a.remarks
          };
        })
        .sort(function (a, b) { return (b.at || '').localeCompare(a.at || ''); });
    }
  };

  global.CC.ActivityService = ActivityService;
})(window);
