/* ============================================================
   CampusCred — js/services/profileService.js
   Profile, social links, portfolio visibility.
   Replace bodies with /api/profile later.
   ============================================================ */
(function (global) {
  'use strict';
  const Store = global.CC.Store;

  const ProfileService = {
    get: function (studentId) {
      const s = Store.db.students.find(function (x) { return x.id === studentId; });
      if (!s) return null;
      const safe = JSON.parse(JSON.stringify(s));
      delete safe.password; // never expose credentials to the UI
      return safe;
    },

    update: async function (studentId, patch) {
      await Store.delay(280);
      const s = Store.db.students.find(function (x) { return x.id === studentId; });
      if (!s) throw new Error('Student not found.');

      const allowed = [
        'name', 'email', 'phone', 'enrollment', 'course', 'branch',
        'department', 'academicYear', 'semester', 'year', 'headline',
        'summary', 'skills', 'education', 'projects', 'portfolioVisibility', 'color',
        'avatar', 'profilePictureUrl'
      ];
      allowed.forEach(function (k) {
        if (patch[k] !== undefined) s[k] = patch[k];
      });
      // Normalize avatar & profilePictureUrl
      if (patch.avatar !== undefined) s.profilePictureUrl = patch.avatar;
      else if (patch.profilePictureUrl !== undefined) s.avatar = patch.profilePictureUrl;

      Store.persist();

      // Mirror to users collection in Store.db
      if (Store.db.users) {
        const u = Store.db.users.find(function (x) { return x.uid === studentId || x.email === s.email; });
        if (u) {
          if (patch.name) u.name = patch.name;
          if (patch.email) u.email = patch.email;
          if (patch.phone !== undefined) u.phone = patch.phone;
          if (patch.department) u.departmentName = patch.department;
          if (patch.course) u.courseName = patch.course;
          if (patch.academicYear) u.academicYear = patch.academicYear;
          if (patch.enrollment) u.registrationNumber = patch.enrollment;
          if (patch.color) u.color = patch.color;
          if (patch.avatar !== undefined) {
            u.avatar = patch.avatar;
            u.profilePictureUrl = patch.avatar;
          }
        }
      }

      // Update active session if currently logged in
      const session = Store.getSession();
      if (session && session.userId === studentId) {
        if (patch.name) session.name = patch.name;
        if (patch.email) session.email = patch.email;
        if (patch.department) session.department = patch.department;
        if (patch.color) session.color = patch.color;
        if (patch.enrollment) session.designation = patch.enrollment;
        if (patch.avatar !== undefined) {
          session.avatar = patch.avatar;
          session.profilePictureUrl = patch.avatar;
        }
        Store.setSession(session);
      }

      // Update active accounts list if present
      try {
        const acts = Store.getActiveAccounts();
        if (acts && acts.length) {
          const act = acts.find(function (a) { return a.userId === studentId; });
          if (act) {
            if (patch.name) act.name = patch.name;
            if (patch.avatar !== undefined) act.avatar = patch.avatar;
            Store.saveActiveAccounts(acts);
          }
        }
      } catch (e) { /* ignore */ }

      // Mirror to Firestore if available
      if (global.CC && global.CC.FirestoreService) {
        global.CC.FirestoreService.upsertStudentProfile(studentId, {
          bio: s.summary,
          headline: s.headline || s.summary,
          registrationNumber: s.enrollment,
          currentSemester: parseInt(s.semester || '1', 10),
          isPortfolioPublic: s.portfolioVisibility !== 'private',
          profilePictureUrl: s.avatar || s.profilePictureUrl || null
        }).catch(function () {});
      }

      const safe = JSON.parse(JSON.stringify(s));
      delete safe.password;
      return safe;
    },

    updateFaculty: async function (facultyId, patch) {
      await Store.delay(280);
      const f = (Store.db.faculty || []).find(function (x) { return x.id === facultyId; });
      if (!f) throw new Error('Faculty member not found.');

      const allowed = ['name', 'email', 'phone', 'employeeId', 'designation', 'department', 'officeLocation', 'officeHours', 'bio', 'links', 'categories', 'color', 'avatar', 'profilePictureUrl'];
      allowed.forEach(function (k) {
        if (patch[k] !== undefined) f[k] = patch[k];
      });
      if (patch.avatar !== undefined) f.profilePictureUrl = patch.avatar;
      else if (patch.profilePictureUrl !== undefined) f.avatar = patch.profilePictureUrl;
      Store.persist();

      // Mirror to users collection in Store.db
      if (Store.db.users) {
        const u = Store.db.users.find(function (x) { return x.uid === facultyId || x.email === f.email; });
        if (u) {
          if (patch.name) u.name = patch.name;
          if (patch.email) u.email = patch.email;
          if (patch.phone !== undefined) u.phone = patch.phone;
          if (patch.department) u.departmentName = patch.department;
          if (patch.designation) u.designation = patch.designation;
          if (patch.color) u.color = patch.color;
          if (patch.avatar !== undefined) {
            u.avatar = patch.avatar;
            u.profilePictureUrl = patch.avatar;
          }
        }
      }

      // Update active session if currently logged in
      const session = Store.getSession();
      if (session && session.userId === facultyId) {
        if (patch.name) session.name = patch.name;
        if (patch.email) session.email = patch.email;
        if (patch.department) session.department = patch.department;
        if (patch.designation) session.designation = patch.designation;
        if (patch.color) session.color = patch.color;
        if (patch.avatar !== undefined) {
          session.avatar = patch.avatar;
          session.profilePictureUrl = patch.avatar;
        }
        Store.setSession(session);
      }

      // Update active accounts list if present
      try {
        const acts = Store.getActiveAccounts();
        if (acts && acts.length) {
          const act = acts.find(function (a) { return a.userId === facultyId; });
          if (act) {
            if (patch.name) act.name = patch.name;
            if (patch.avatar !== undefined) act.avatar = patch.avatar;
            Store.saveActiveAccounts(acts);
          }
        }
      } catch (e) { /* ignore */ }

      // Mirror to Firestore
      if (global.CC && global.CC.FirestoreService) {
        global.CC.FirestoreService.upsertFacultyProfile(facultyId, {
          designation: f.designation,
          officeLocation: f.officeLocation || 'Academic Block',
          authorizedCategories: f.categories || ['*'],
          bio: f.bio || ''
        }).catch(function () {});
      }

      const safe = JSON.parse(JSON.stringify(f));
      delete safe.password;
      return safe;
    },

    updateAdmin: async function (adminId, patch) {
      await Store.delay(280);
      const adminList = (Store.db.admins && Store.db.admins.length) ? Store.db.admins : (Store.db.admin ? [Store.db.admin] : []);
      const a = adminList.find(function (x) { return x.id === adminId; }) || Store.db.admin;
      if (!a) throw new Error('Administrator account not found.');

      const allowed = ['name', 'email', 'phone', 'designation', 'department', 'officeLocation', 'color', 'bio', 'officeHours', 'emergencyContact', 'avatar', 'profilePictureUrl'];
      allowed.forEach(function (k) {
        if (patch[k] !== undefined) a[k] = patch[k];
      });
      if (patch.avatar !== undefined) a.profilePictureUrl = patch.avatar;
      else if (patch.profilePictureUrl !== undefined) a.avatar = patch.profilePictureUrl;
      Store.db.admin = a;
      Store.persist();

      // Mirror to users collection in Store.db
      if (Store.db.users) {
        const u = Store.db.users.find(function (x) { return x.uid === adminId || x.email === a.email; });
        if (u) {
          if (patch.name) u.name = patch.name;
          if (patch.email) u.email = patch.email;
          if (patch.phone !== undefined) u.phone = patch.phone;
          if (patch.department) u.departmentName = patch.department;
          if (patch.designation) u.designation = patch.designation;
          if (patch.color) u.color = patch.color;
          if (patch.avatar !== undefined) {
            u.avatar = patch.avatar;
            u.profilePictureUrl = patch.avatar;
          }
        }
      }

      // Update active session if currently logged in
      const session = Store.getSession();
      if (session && session.userId === adminId) {
        if (patch.name) session.name = patch.name;
        if (patch.email) session.email = patch.email;
        if (patch.department) session.department = patch.department;
        if (patch.designation) session.designation = patch.designation;
        if (patch.color) session.color = patch.color;
        if (patch.avatar !== undefined) {
          session.avatar = patch.avatar;
          session.profilePictureUrl = patch.avatar;
        }
        Store.setSession(session);
      }

      // Update active accounts list if present
      try {
        const acts = Store.getActiveAccounts();
        if (acts && acts.length) {
          const act = acts.find(function (ac) { return ac.userId === adminId; });
          if (act) {
            if (patch.name) act.name = patch.name;
            if (patch.avatar !== undefined) act.avatar = patch.avatar;
            Store.saveActiveAccounts(acts);
          }
        }
      } catch (e) { /* ignore */ }

      const safe = JSON.parse(JSON.stringify(a));
      delete safe.password;
      return safe;
    },

    /* ---------- social / professional links ---------- */
    links: function (studentId) {
      const s = Store.db.students.find(function (x) { return x.id === studentId; });
      return s ? (s.links || []).slice() : [];
    },

    addLink: async function (studentId, link) {
      await Store.delay(220);
      const s = Store.db.students.find(function (x) { return x.id === studentId; });
      if (!s) throw new Error('Student not found.');
      if (!link.label || !link.label.trim()) throw new Error('Link label is required.');
      if (!link.url || !link.url.trim()) throw new Error('Link URL is required.');
      let url = link.url.trim();
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      s.links = s.links || [];
      const item = { id: Store.uid('LNK'), label: link.label.trim(), url: url, visible: link.visible !== false };
      s.links.push(item);
      Store.persist();
      return item;
    },

    updateLink: async function (studentId, linkId, patch) {
      await Store.delay(180);
      const s = Store.db.students.find(function (x) { return x.id === studentId; });
      if (!s) throw new Error('Student not found.');
      const link = (s.links || []).find(function (l) { return l.id === linkId; });
      if (!link) throw new Error('Link not found.');
      if (patch.label != null) {
        if (!String(patch.label).trim()) throw new Error('Link label is required.');
        link.label = String(patch.label).trim();
      }
      if (patch.url != null) {
        if (!String(patch.url).trim()) throw new Error('Link URL is required.');
        let url = String(patch.url).trim();
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        link.url = url;
      }
      if (patch.visible != null) link.visible = !!patch.visible;
      Store.persist();
      return link;
    },

    deleteLink: async function (studentId, linkId) {
      await Store.delay(160);
      const s = Store.db.students.find(function (x) { return x.id === studentId; });
      if (!s) throw new Error('Student not found.');
      const idx = (s.links || []).findIndex(function (l) { return l.id === linkId; });
      if (idx === -1) throw new Error('Link not found.');
      s.links.splice(idx, 1);
      Store.persist();
      return true;
    },

    /* Public portfolio view: verified achievements + public links only. */
    publicPortfolio: function (studentId) {
      const s = Store.db.students.find(function (x) { return x.id === studentId; });
      if (!s) return null;
      const verified = Store.db.activities.filter(function (a) {
        return a.studentId === studentId && a.status === 'verified';
      });
      return {
        student: {
          id: s.id, name: s.name, enrollment: s.enrollment, course: s.course,
          branch: s.branch, department: s.department, academicYear: s.academicYear,
          headline: s.headline || '', summary: s.summary || '', color: s.color,
          semester: s.semester, year: s.year, phone: s.phone || '',
          avatar: s.avatar || s.profilePictureUrl || null,
          skills: (s.skills || []).slice(),
          education: (s.education || []).slice(),
          projects: (s.projects || []).slice()
        },
        verifiedActivities: verified,
        links: (s.links || []).filter(function (l) { return l.visible; }),
        visibility: s.portfolioVisibility || 'public'
      };
    },

    /* ---------- Public Credentials Link & Privacy Controls ---------- */
    getCredentialsSettings: function (studentId) {
      const s = Store.db.students.find(function (x) { return x.id === studentId; });
      if (!s) return null;

      if (!s.credentialsSettings) {
        const defaultSlug = (s.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + (s.enrollment || s.id).toLowerCase());
        s.credentialsSettings = {
          shareableSlug: defaultSlug,
          privacyMode: s.portfolioVisibility === 'private' ? 'private' : 'public', // 'public' | 'unlisted' | 'private'
          includeCertificates: true,
          includeResume: true,
          includeSkills: true,
          includeEducation: true,
          includeProjects: true,
          updatedAt: Store.today()
        };
        Store.persist();
      }
      return JSON.parse(JSON.stringify(s.credentialsSettings));
    },

    saveCredentialsSettings: async function (studentId, patch) {
      await Store.delay(200);
      const s = Store.db.students.find(function (x) { return x.id === studentId; });
      if (!s) throw new Error('Student not found.');

      if (!s.credentialsSettings) {
        ProfileService.getCredentialsSettings(studentId);
      }

      s.credentialsSettings = Object.assign({}, s.credentialsSettings, patch, { updatedAt: Store.today() });
      if (patch.privacyMode) {
        s.portfolioVisibility = patch.privacyMode;
      }
      Store.persist();

      // Mirror to Firestore if online
      if (global.CC && global.CC.FirestoreService) {
        global.CC.FirestoreService.upsertStudentProfile(studentId, {
          isPortfolioPublic: s.credentialsSettings.privacyMode !== 'private',
          portfolioSlug: s.credentialsSettings.shareableSlug,
          credentialsSettings: s.credentialsSettings
        }).catch(function () {});
      }

      return JSON.parse(JSON.stringify(s.credentialsSettings));
    },

    publicCredentials: function (slugOrId) {
      const clean = String(slugOrId || '').trim().toLowerCase();
      if (!clean) return null;

      const s = Store.db.students.find(function (x) {
        const idMatch = (x.id || '').toLowerCase() === clean;
        const regMatch = (x.enrollment || '').toLowerCase() === clean;
        const slugMatch = x.credentialsSettings && (x.credentialsSettings.shareableSlug || '').toLowerCase() === clean;
        return idMatch || regMatch || slugMatch;
      });

      if (!s) return null;
      const settings = ProfileService.getCredentialsSettings(s.id);

      if (settings.privacyMode === 'private') {
        return {
          privacyMode: 'private',
          student: { name: s.name, color: s.color }
        };
      }

      const verifiedActs = Store.db.activities.filter(function (a) {
        return a.studentId === s.id && a.status === 'verified';
      });

      const certs = verifiedActs.filter(function (a) {
        return !!a.certificateId || a.category === 'Certification';
      });

      return {
        privacyMode: settings.privacyMode,
        shareableSlug: settings.shareableSlug,
        student: {
          id: s.id,
          name: s.name,
          enrollment: s.enrollment,
          course: s.course,
          branch: s.branch,
          department: s.department,
          semester: s.semester,
          year: s.year,
          academicYear: s.academicYear,
          color: s.color,
          avatar: s.avatar || s.profilePictureUrl || null,
          headline: s.headline || '',
          phone: s.phone || '',
          summary: settings.includeResume ? (s.summary || '') : null
        },
        certificates: settings.includeCertificates ? certs : [],
        verifiedActivities: verifiedActs,
        skills: settings.includeSkills ? (s.skills || []) : [],
        education: settings.includeEducation ? (s.education || []) : [],
        projects: settings.includeProjects ? (s.projects || []) : [],
        links: (s.links || []).filter(function (l) { return l.visible; }),
        settings: settings
      };
    }
  };

  global.CC.ProfileService = ProfileService;
})(window);
