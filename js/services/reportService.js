/* ============================================================
   CampusCred — js/services/reportService.js
   Aggregations for charts, filters and downloadable reports.
   Replace bodies with /api/reports later.
   ============================================================ */
(function (global) {
  'use strict';
  const Store = global.CC.Store;
  const ActivityService = global.CC.ActivityService;
  const Mock = global.MockData;

  const ReportService = {
    /* ---------- college-wide headline numbers ---------- */
    overview: function () {
      const acts = Store.db.activities;
      return {
        totalStudents: Store.db.students.length,
        totalActivities: acts.length,
        verified: acts.filter(function (a) { return a.status === 'verified'; }).length,
        pending: acts.filter(function (a) { return a.status === 'pending'; }).length,
        rejected: acts.filter(function (a) { return a.status === 'rejected'; }).length,
        faculty: Store.db.faculty.length
      };
    },

    /* ---------- filtered slice used by every chart ---------- */
    filtered: function (filters) {
      return ActivityService.query(filters || {});
    },

    /* ---------- chart series ---------- */
    byCategory: function (rows) {
      return Mock.CATEGORIES.map(function (cat) {
        return {
          label: cat,
          value: rows.filter(function (a) { return a.category === cat; }).length
        };
      });
    },

    byDepartment: function (rows) {
      return Mock.DEPARTMENTS.map(function (dep) {
        let value = 0;
        const students = {};
        rows.forEach(function (a) {
          const st = ActivityService.studentOf(a);
          if (st && st.department === dep) {
            value++;
            students[st.id] = true;
          }
        });
        return { label: dep, value: value, students: Object.keys(students).length };
      });
    },

    byStatus: function (rows) {
      return [
        { label: 'Verified', value: rows.filter(function (a) { return a.status === 'verified'; }).length, color: '#16A34A' },
        { label: 'Pending', value: rows.filter(function (a) { return a.status === 'pending'; }).length, color: '#D97706' },
        { label: 'Rejected', value: rows.filter(function (a) { return a.status === 'rejected'; }).length, color: '#EF4444' }
      ];
    },

    /* Monthly participation trend for the last 12 months. */
    monthlyTrend: function (rows) {
      const months = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
          label: d.toLocaleString('en-US', { month: 'short' }),
          full: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
          verified: 0, pending: 0, rejected: 0, total: 0
        });
      }
      rows.forEach(function (a) {
        const key = (a.date || '').slice(0, 7);
        const m = months.find(function (x) { return x.key === key; });
        if (m) {
          m.total++;
          if (a.status === 'verified') m.verified++;
          else if (a.status === 'pending') m.pending++;
          else m.rejected++;
        }
      });
      return months;
    },

    /* Top participating departments (ranked). */
    topDepartments: function (rows) {
      return ReportService.byDepartment(rows)
        .slice()
        .sort(function (a, b) { return b.value - a.value; });
    },

    /* Department-wise participation count of unique students. */
    departmentParticipation: function () {
      return Mock.DEPARTMENTS.map(function (dep) {
        const students = Store.db.students.filter(function (s) { return s.department === dep; });
        let acts = 0;
        students.forEach(function (s) {
          acts += Store.db.activities.filter(function (a) { return a.studentId === s.id; }).length;
        });
        return { label: dep, students: students.length, activities: acts };
      });
    },

    /* Recent submissions (college-wide). */
    recentSubmissions: function (limit) {
      return Store.db.activities
        .slice()
        .sort(function (a, b) { return (b.submittedAt || '').localeCompare(a.submittedAt || ''); })
        .slice(0, limit || 6);
    },

    /* ---------- CSV export ---------- */
    toCSV: function (rows, columns) {
      columns = columns || [
        { key: 'id', label: 'Activity ID' },
        { key: 'student', label: 'Student' },
        { key: 'enrollment', label: 'Enrollment No' },
        { key: 'department', label: 'Department' },
        { key: 'name', label: 'Activity' },
        { key: 'category', label: 'Category' },
        { key: 'organization', label: 'Organization' },
        { key: 'date', label: 'Event Date' },
        { key: 'status', label: 'Status' },
        { key: 'certificateId', label: 'Certificate ID' },
        { key: 'submittedAt', label: 'Submitted On' },
        { key: 'reviewedAt', label: 'Reviewed On' }
      ];
      function esc(v) {
        const s = v == null ? '' : String(v);
        return '"' + s.replace(/"/g, '""') + '"';
      }
      const header = columns.map(function (c) { return esc(c.label); }).join(',');
      const body = rows.map(function (a) {
        const st = ActivityService.studentOf(a) || {};
        const data = {
          id: a.id, student: st.name || '—', enrollment: st.enrollment || '—',
          department: st.department || '—', name: a.name, category: a.category,
          organization: a.organization, date: a.date, status: a.status,
          certificateId: a.certificateId || '—', submittedAt: a.submittedAt || '—',
          reviewedAt: a.reviewedAt || '—'
        };
        return columns.map(function (c) { return esc(data[c.key]); }).join(',');
      }).join('\n');
      return header + '\n' + body;
    },

    /* Trigger a browser download without any backend. */
    downloadCSV: function (filename, csvText) {
      const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    },

    /* PDF reports: use the browser's print-to-PDF with a print stylesheet. */
    printReport: function () {
      window.print();
    }
  };

  global.CC.ReportService = ReportService;
})(window);
