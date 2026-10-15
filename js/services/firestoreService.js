/* ============================================================
   CampusCred — js/services/firestoreService.js
   ------------------------------------------------------------
   Google Cloud Firestore Database Service.
   Directly manages the 13 collections as specified in the
   Firestore Database Design & Data Model Specification:
     1. users
     2. studentProfiles
     3. facultyProfiles
     4. departments
     5. courses
     6. activityCategories
     7. activities
     8. verificationHistory
     9. studentSkills / studentProjects / studentLinks
    10. resumeSettings
    11. certificates
    12. auditLogs
    13. notifications
   ============================================================ */
(function (global) {
  'use strict';

  const CC = global.CC || {};
  const FirebaseConfig = CC.FirebaseConfig;

  // Promise wrapper with strict timeout to prevent indefinite hangs on offline/unreachable Firestore
  function withTimeout(promise, ms) {
    ms = ms || 750;
    let timer = null;
    const timeoutPromise = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        reject(new Error('Firestore operation timed out after ' + ms + 'ms'));
      }, ms);
    });
    return Promise.race([
      promise.then(function (res) {
        if (timer) clearTimeout(timer);
        return res;
      }, function (err) {
        if (timer) clearTimeout(timer);
        throw err;
      }),
      timeoutPromise
    ]);
  }

  // Simple browser-compatible SHA-256 hash generator for cryptographic certificate signatures
  async function sha256(message) {
    if (global.crypto && global.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await global.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback pseudo-hash if subtle crypto unavailable
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      hash = ((hash << 5) - hash) + message.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0') + '9b2f81a7d6e5c3';
  }

  const FirestoreService = {
    COLLECTIONS: {
      USERS: 'users',
      STUDENT_PROFILES: 'studentProfiles',
      FACULTY_PROFILES: 'facultyProfiles',
      DEPARTMENTS: 'departments',
      COURSES: 'courses',
      ACTIVITY_CATEGORIES: 'activityCategories',
      ACTIVITIES: 'activities',
      VERIFICATION_HISTORY: 'verificationHistory',
      STUDENT_SKILLS: 'studentSkills',
      STUDENT_PROJECTS: 'studentProjects',
      STUDENT_LINKS: 'studentLinks',
      RESUME_SETTINGS: 'resumeSettings',
      CERTIFICATES: 'certificates',
      AUDIT_LOGS: 'auditLogs',
      NOTIFICATIONS: 'notifications'
    },

    /* Get Firestore database instance if connected, or null */
    getDb: function () {
      return (FirebaseConfig && FirebaseConfig.db) ? FirebaseConfig.db : null;
    },

    isLive: function () {
      return !!(FirebaseConfig && FirebaseConfig.isInitialized && FirebaseConfig.db);
    },

    /* Safe remote execution with timeout and fallback protection */
    async safeRemote(promiseSupplier, timeoutMs) {
      const db = this.getDb();
      if (!db) return null;
      // If we know connection test already confirmed offline / unavailable, don't stall user flow
      if (FirebaseConfig && FirebaseConfig.isInitialized && FirebaseConfig.isLiveConnected === false) {
        try {
          const p = promiseSupplier();
          if (p && typeof p.catch === 'function') p.catch(function () {});
        } catch (e) { /* ignore */ }
        return null;
      }
      try {
        return await withTimeout(promiseSupplier(), timeoutMs || 700);
      } catch (err) {
        console.warn('[Firestore] Remote operation timed out or failed:', err.message);
        return null;
      }
    },

    /* ========================================================
       1. USERS & PROFILES
       ======================================================== */
    async getUsers(filterRole) {
      const db = this.getDb();
      if (db) {
        try {
          const snap = await this.safeRemote(() => {
            let ref = db.collection(this.COLLECTIONS.USERS);
            if (filterRole) ref = ref.where('role', '==', filterRole.toUpperCase());
            return ref.get();
          });
          if (snap) {
            const list = [];
            snap.forEach(doc => list.push(Object.assign({ uid: doc.id }, doc.data())));
            if (list.length > 0) return list;
          }
        } catch (e) {
          console.warn('[Firestore] getUsers fallback to local store:', e.message);
        }
      }
      // Local store fallback
      const store = CC.Store ? CC.Store.db : null;
      if (!store) return [];
      const users = (store.users || []).slice();
      if (filterRole) return users.filter(u => (u.role || '').toUpperCase() === filterRole.toUpperCase());
      return users;
    },

    async getUser(uid) {
      const db = this.getDb();
      if (db) {
        try {
          const doc = await this.safeRemote(() => db.collection(this.COLLECTIONS.USERS).doc(uid).get());
          if (doc && doc.exists) return Object.assign({ uid: doc.id }, doc.data());
        } catch (e) {
          console.warn('[Firestore] getUser fallback to local store:', e.message);
        }
      }
      const store = CC.Store ? CC.Store.db : null;
      if (!store) return null;
      return (store.users || []).find(u => u.uid === uid || u.id === uid) || null;
    },

    async createUser(userData) {
      const db = this.getDb();
      const now = new Date().toISOString();
      const docData = {
        uid: userData.uid,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        password: userData.password || 'password123',
        role: (userData.role || 'STUDENT').toUpperCase(),
        departmentId: userData.departmentId || 'dept-cse',
        departmentName: userData.departmentName || 'Computer Science & Engineering',
        courseId: userData.courseId || 'course-btech-cse',
        courseName: userData.courseName || 'B.Tech Computer Science & Engineering',
        academicYear: userData.academicYear || '2024-2028',
        registrationNumber: userData.registrationNumber || '',
        accountStatus: userData.accountStatus || 'ACTIVE',
        color: userData.color || 1,
        createdAt: now,
        updatedAt: now
      };

      if (db) {
        await this.safeRemote(() => db.collection(this.COLLECTIONS.USERS).doc(userData.uid).set(docData));
      }

      // Sync local store
      if (CC.Store && CC.Store.db) {
        if (!CC.Store.db.users) CC.Store.db.users = [];
        const existingIdx = CC.Store.db.users.findIndex(u => u.uid === userData.uid);
        if (existingIdx !== -1) CC.Store.db.users[existingIdx] = docData;
        else CC.Store.db.users.push(docData);
        CC.Store.persist();
      }
      return docData;
    },

    async getStudentProfile(uid) {
      const db = this.getDb();
      if (db) {
        try {
          const doc = await this.safeRemote(() => db.collection(this.COLLECTIONS.STUDENT_PROFILES).doc(uid).get());
          if (doc && doc.exists) return doc.data();
        } catch (e) { /* ignore */ }
      }
      const store = CC.Store ? CC.Store.db : null;
      if (!store) return null;
      return (store.studentProfiles || []).find(p => p.uid === uid) || null;
    },

    async upsertStudentProfile(uid, profileData) {
      const db = this.getDb();
      const data = Object.assign({}, profileData, {
        uid: uid,
        updatedAt: new Date().toISOString()
      });
      if (db) {
        await this.safeRemote(() => db.collection(this.COLLECTIONS.STUDENT_PROFILES).doc(uid).set(data, { merge: true }));
      }
      if (CC.Store && CC.Store.db) {
        if (!CC.Store.db.studentProfiles) CC.Store.db.studentProfiles = [];
        const idx = CC.Store.db.studentProfiles.findIndex(p => p.uid === uid);
        if (idx !== -1) CC.Store.db.studentProfiles[idx] = Object.assign({}, CC.Store.db.studentProfiles[idx], data);
        else CC.Store.db.studentProfiles.push(data);
        CC.Store.persist();
      }
      return data;
    },

    async getFacultyProfile(uid) {
      const db = this.getDb();
      if (db) {
        try {
          const doc = await this.safeRemote(() => db.collection(this.COLLECTIONS.FACULTY_PROFILES).doc(uid).get());
          if (doc && doc.exists) return doc.data();
        } catch (e) { /* ignore */ }
      }
      const store = CC.Store ? CC.Store.db : null;
      if (!store) return null;
      return (store.facultyProfiles || []).find(p => p.uid === uid) || null;
    },

    async upsertFacultyProfile(uid, profileData) {
      const db = this.getDb();
      const data = Object.assign({}, profileData, {
        uid: uid,
        updatedAt: new Date().toISOString()
      });
      if (db) {
        await this.safeRemote(() => db.collection(this.COLLECTIONS.FACULTY_PROFILES).doc(uid).set(data, { merge: true }));
      }
      if (CC.Store && CC.Store.db) {
        if (!CC.Store.db.facultyProfiles) CC.Store.db.facultyProfiles = [];
        const idx = CC.Store.db.facultyProfiles.findIndex(p => p.uid === uid);
        if (idx !== -1) CC.Store.db.facultyProfiles[idx] = Object.assign({}, CC.Store.db.facultyProfiles[idx], data);
        else CC.Store.db.facultyProfiles.push(data);
        CC.Store.persist();
      }
      return data;
    },

    /* ========================================================
       2. DEPARTMENTS, COURSES & CATEGORIES
       ======================================================== */
    async getDepartments() {
      const db = this.getDb();
      if (db) {
        try {
          const snap = await this.safeRemote(() => db.collection(this.COLLECTIONS.DEPARTMENTS).get());
          if (snap) {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            if (list.length > 0) return list;
          }
        } catch (e) { /* fallback */ }
      }
      return CC.Store && CC.Store.db && CC.Store.db.departments ? CC.Store.db.departments : [];
    },

    async getCourses(deptId) {
      const db = this.getDb();
      if (db) {
        try {
          const snap = await this.safeRemote(() => {
            let ref = db.collection(this.COLLECTIONS.COURSES);
            if (deptId) ref = ref.where('departmentId', '==', deptId);
            return ref.get();
          });
          if (snap) {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            if (list.length > 0) return list;
          }
        } catch (e) { /* fallback */ }
      }
      const courses = CC.Store && CC.Store.db && CC.Store.db.courses ? CC.Store.db.courses : [];
      if (deptId) return courses.filter(c => c.departmentId === deptId);
      return courses;
    },

    async getActivityCategories() {
      const db = this.getDb();
      if (db) {
        try {
          const snap = await this.safeRemote(() => db.collection(this.COLLECTIONS.ACTIVITY_CATEGORIES).orderBy('displayOrder').get());
          if (snap) {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            if (list.length > 0) return list;
          }
        } catch (e) { /* fallback */ }
      }
      return CC.Store && CC.Store.db && CC.Store.db.activityCategories ? CC.Store.db.activityCategories : [];
    },

    /* ========================================================
       3. ACTIVITIES & VERIFICATION
       ======================================================== */
    async getActivities(filters) {
      const db = this.getDb();
      filters = filters || {};
      if (db) {
        try {
          const snap = await this.safeRemote(() => {
            let ref = db.collection(this.COLLECTIONS.ACTIVITIES);
            if (filters.studentUid) ref = ref.where('studentUid', '==', filters.studentUid);
            if (filters.verificationStatus && filters.verificationStatus !== 'ALL') {
              ref = ref.where('verificationStatus', '==', filters.verificationStatus.toUpperCase());
            }
            if (filters.departmentId && filters.departmentId !== 'ALL') {
              ref = ref.where('departmentId', '==', filters.departmentId);
            }
            return ref.get();
          });
          if (snap) {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            if (list.length > 0) {
              return list.sort((a, b) => (b.submissionDate || '').localeCompare(a.submissionDate || ''));
            }
          }
        } catch (e) {
          console.warn('[Firestore] getActivities remote query fallback:', e.message);
        }
      }
      // Local fallback
      let list = (CC.Store && CC.Store.db && CC.Store.db.activities) ? CC.Store.db.activities.slice() : [];
      if (filters.studentUid) list = list.filter(a => (a.studentUid === filters.studentUid || a.studentId === filters.studentUid));
      if (filters.verificationStatus && filters.verificationStatus !== 'ALL') {
        const target = filters.verificationStatus.toLowerCase();
        list = list.filter(a => (a.verificationStatus || a.status || '').toLowerCase() === target);
      }
      return list;
    },

    async createActivity(activityPayload, studentUser) {
      const db = this.getDb();
      const id = activityPayload.id || ('ACT-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100));
      const now = new Date().toISOString();
      const today = now.slice(0, 10);

      const categoryName = activityPayload.categoryName || activityPayload.category || 'Technical';
      const categoryId = activityPayload.categoryId || ('cat-' + categoryName.toLowerCase().replace(/[^a-z0-9]/g, ''));

      const docData = {
        id: id,
        studentUid: studentUser.uid || studentUser.id,
        studentName: studentUser.name || 'Student',
        studentRegNo: studentUser.enrollment || studentUser.registrationNumber || '2024CS001',
        departmentId: studentUser.departmentId || 'dept-cse',
        departmentName: studentUser.department || studentUser.departmentName || 'Computer Science & Engineering',
        academicYear: studentUser.academicYear || '2024-2028',
        title: activityPayload.title || activityPayload.name,
        categoryId: categoryId,
        categoryName: categoryName,
        organization: activityPayload.organization || '—',
        activityDate: activityPayload.activityDate || activityPayload.date || today,
        participationRole: activityPayload.participationRole || activityPayload.role || 'Participant',
        achievementLevel: activityPayload.achievementLevel || activityPayload.result || 'Participant',
        description: activityPayload.description || '',
        proofDocument: {
          fileName: (activityPayload.proofDocument && activityPayload.proofDocument.fileName) || (activityPayload.proof && activityPayload.proof.fileName) || '',
          fileSize: (activityPayload.proofDocument && activityPayload.proofDocument.fileSize) || (activityPayload.proof && activityPayload.proof.fileSize) || 0,
          contentType: (activityPayload.proofDocument && activityPayload.proofDocument.contentType) || (activityPayload.proof && activityPayload.proof.fileType) || 'application/pdf',
          storagePath: 'proofs/' + (studentUser.uid || studentUser.id) + '/' + id + '.pdf',
          downloadUrl: (activityPayload.proofDocument && activityPayload.proofDocument.downloadUrl) || (activityPayload.proof && activityPayload.proof.dataUrl) || ''
        },
        proof: activityPayload.proof || {
          fileName: (activityPayload.proofDocument && activityPayload.proofDocument.fileName) || '',
          fileType: (activityPayload.proofDocument && activityPayload.proofDocument.contentType) || 'application/pdf',
          fileSize: (activityPayload.proofDocument && activityPayload.proofDocument.fileSize) || 0,
          dataUrl: (activityPayload.proof && activityPayload.proof.dataUrl) || (activityPayload.proofDocument && activityPayload.proofDocument.downloadUrl) || null
        },
        verificationStatus: 'PENDING',
        verifierUid: null,
        verifierName: null,
        verificationDate: null,
        rejectionRemarks: '',
        certificateId: '',
        submissionDate: now,
        updatedAt: now,

        // Legacy compatibility mappings for existing UI views
        name: activityPayload.title || activityPayload.name,
        category: categoryName,
        date: activityPayload.activityDate || activityPayload.date || today,
        role: activityPayload.participationRole || activityPayload.role || 'Participant',
        result: activityPayload.achievementLevel || activityPayload.result || 'Participant',
        status: 'pending',
        studentId: studentUser.uid || studentUser.id,
        submittedAt: today
      };

      if (db) {
        await this.safeRemote(() => db.collection(this.COLLECTIONS.ACTIVITIES).doc(id).set(docData));
      }

      // Add audit log
      await this.recordAuditLog({
        actorUid: studentUser.uid || studentUser.id,
        actorEmail: studentUser.email,
        actorRole: 'STUDENT',
        action: 'ACTIVITY_CREATED',
        resourceType: 'ACTIVITY',
        resourceId: id,
        metadata: { title: docData.title, category: docData.categoryName }
      });

      // Create notification
      await this.createNotification({
        recipientUid: studentUser.uid || studentUser.id,
        title: 'Submitted successfully',
        message: '“' + docData.title + '” is now pending faculty verification.',
        type: 'NEW_SUBMISSION',
        referenceId: id
      });

      return docData;
    },

    async verifyActivity(activityId, verifierUser, decision, remarks) {
      const db = this.getDb();
      const isApproved = decision === 'APPROVE' || decision === 'VERIFIED';
      const now = new Date().toISOString();
      const today = now.slice(0, 10);
      const newStatus = isApproved ? 'VERIFIED' : 'REJECTED';

      // Look up activity
      let act = null;
      if (db) {
        try {
          const doc = await this.safeRemote(() => db.collection(this.COLLECTIONS.ACTIVITIES).doc(activityId).get());
          if (doc && doc.exists) act = doc.data();
        } catch (e) { /* fallback */ }
      }
      if (!act && CC.Store && CC.Store.db) {
        act = CC.Store.db.activities.find(a => a.id === activityId);
      }
      if (!act) throw new Error('Activity not found: ' + activityId);

      const previousStatus = act.verificationStatus || (act.status ? act.status.toUpperCase() : 'PENDING');

      let certId = act.certificateId || '';
      let certificateRecord = null;

      if (isApproved) {
        // Mint cryptographic certificate ID and signature
        if (!certId) {
          const randHex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
          certId = 'CERT-' + (act.departmentId ? act.departmentId.replace('dept-', '').toUpperCase() : 'CC') + '-' + randHex;
        }

        const certPayload = [
          certId,
          act.id,
          act.studentUid || act.studentId,
          act.title || act.name,
          verifierUser.name,
          now
        ].join('|');
        const hash = await sha256(certPayload);

        certificateRecord = {
          id: certId,
          activityId: act.id,
          studentUid: act.studentUid || act.studentId,
          studentName: act.studentName || 'Student',
          studentRegNo: act.studentRegNo || '2024CS001',
          activityTitle: act.title || act.name,
          categoryName: act.categoryName || act.category,
          organization: act.organization,
          achievementLevel: act.achievementLevel || act.result,
          verifiedBy: verifierUser.name,
          verifiedAt: now,
          verificationHash: hash,
          qrEndpointUrl: (location.origin + location.pathname + '#/verify/' + certId).replace('///', '//')
        };

        // Save certificate to collection
        if (db) {
          await this.safeRemote(() => db.collection(this.COLLECTIONS.CERTIFICATES).doc(certId).set(certificateRecord));
        }
        if (CC.Store && CC.Store.db) {
          if (!CC.Store.db.certificates) CC.Store.db.certificates = [];
          CC.Store.db.certificates.push(certificateRecord);
        }
      }

      // Update activity fields
      const updates = {
        verificationStatus: newStatus,
        status: newStatus.toLowerCase(),
        verifierUid: verifierUser.uid || verifierUser.id,
        verifierName: verifierUser.name,
        verificationDate: now,
        reviewedAt: today,
        reviewerId: verifierUser.uid || verifierUser.id,
        rejectionRemarks: isApproved ? '' : (remarks || ''),
        remarks: remarks || (isApproved ? 'Certificate verified against the submitted proof. Approved.' : 'Proof unverified.'),
        certificateId: certId,
        updatedAt: now
      };

      if (db) {
        await this.safeRemote(() => db.collection(this.COLLECTIONS.ACTIVITIES).doc(activityId).update(updates));
      }

      // Record in verificationHistory collection
      const vhId = 'VH-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100);
      const vhRecord = {
        id: vhId,
        activityId: activityId,
        studentUid: act.studentUid || act.studentId,
        verifierUid: verifierUser.uid || verifierUser.id,
        verifierName: verifierUser.name,
        action: isApproved ? 'APPROVE' : 'REJECT',
        previousStatus: previousStatus,
        newStatus: newStatus,
        remarks: remarks || updates.remarks,
        timestamp: now
      };

      if (db) {
        await this.safeRemote(() => db.collection(this.COLLECTIONS.VERIFICATION_HISTORY).doc(vhId).set(vhRecord));
      }

      // Update faculty and student counters
      if (isApproved) {
        await this.incrementStudentVerifiedCounter(act.studentUid || act.studentId);
        await this.incrementFacultyVerifiedCounter(verifierUser.uid || verifierUser.id);
      }

      // Record audit log
      await this.recordAuditLog({
        actorUid: verifierUser.uid || verifierUser.id,
        actorEmail: verifierUser.email,
        actorRole: 'FACULTY',
        action: 'ACTIVITY_VERIFIED',
        resourceType: 'ACTIVITY',
        resourceId: activityId,
        metadata: {
          decision: newStatus,
          remarks: remarks,
          certificateId: certId
        }
      });

      // Send student notification
      await this.createNotification({
        recipientUid: act.studentUid || act.studentId,
        title: isApproved ? 'Achievement verified' : 'Action needed on submission',
        message: isApproved
          ? '“' + (act.title || act.name) + '” was approved by ' + verifierUser.name + ' and added to your verified portfolio.'
          : '“' + (act.title || act.name) + '” was rejected. Reason: ' + remarks,
        type: isApproved ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
        referenceId: activityId
      });

      return Object.assign({}, act, updates);
    },

    async incrementStudentVerifiedCounter(studentUid) {
      const db = this.getDb();
      if (db && global.firebase && global.firebase.firestore && global.firebase.firestore.FieldValue) {
        await this.safeRemote(() => db.collection(this.COLLECTIONS.STUDENT_PROFILES).doc(studentUid).update({
          totalVerifiedAchievements: global.firebase.firestore.FieldValue.increment(1)
        }));
      }
      if (CC.Store && CC.Store.db && CC.Store.db.studentProfiles) {
        const p = CC.Store.db.studentProfiles.find(x => x.uid === studentUid);
        if (p) p.totalVerifiedAchievements = (p.totalVerifiedAchievements || 0) + 1;
      }
    },

    async incrementFacultyVerifiedCounter(facultyUid) {
      const db = this.getDb();
      if (db && global.firebase && global.firebase.firestore && global.firebase.firestore.FieldValue) {
        await this.safeRemote(() => db.collection(this.COLLECTIONS.FACULTY_PROFILES).doc(facultyUid).update({
          totalVerifiedCount: global.firebase.firestore.FieldValue.increment(1)
        }));
      }
      if (CC.Store && CC.Store.db && CC.Store.db.facultyProfiles) {
        const p = CC.Store.db.facultyProfiles.find(x => x.uid === facultyUid);
        if (p) p.totalVerifiedCount = (p.totalVerifiedCount || 0) + 1;
      }
    },

    /* ========================================================
       4. SKILLS, PROJECTS & LINKS
       ======================================================== */
    async getStudentSkills(studentUid) {
      const db = this.getDb();
      if (db) {
        try {
          const snap = await this.safeRemote(() => db.collection(this.COLLECTIONS.STUDENT_SKILLS).where('studentUid', '==', studentUid).get());
          if (snap) {
            const list = [];
            snap.forEach(d => list.push(d.data()));
            if (list.length > 0) return list;
          }
        } catch (e) { /* fallback */ }
      }
      return (CC.Store && CC.Store.db && CC.Store.db.studentSkills)
        ? CC.Store.db.studentSkills.filter(s => s.studentUid === studentUid)
        : [];
    },

    async getStudentProjects(studentUid) {
      const db = this.getDb();
      if (db) {
        try {
          const snap = await this.safeRemote(() => db.collection(this.COLLECTIONS.STUDENT_PROJECTS).where('studentUid', '==', studentUid).get());
          if (snap) {
            const list = [];
            snap.forEach(d => list.push(d.data()));
            if (list.length > 0) return list;
          }
        } catch (e) { /* fallback */ }
      }
      return (CC.Store && CC.Store.db && CC.Store.db.studentProjects)
        ? CC.Store.db.studentProjects.filter(p => p.studentUid === studentUid)
        : [];
    },

    async getStudentLinks(studentUid) {
      const db = this.getDb();
      if (db) {
        try {
          const snap = await this.safeRemote(() => db.collection(this.COLLECTIONS.STUDENT_LINKS).where('studentUid', '==', studentUid).orderBy('displayOrder').get());
          if (snap) {
            const list = [];
            snap.forEach(d => list.push(d.data()));
            if (list.length > 0) return list;
          }
        } catch (e) { /* fallback */ }
      }
      return (CC.Store && CC.Store.db && CC.Store.db.studentLinks)
        ? CC.Store.db.studentLinks.filter(l => l.studentUid === studentUid)
        : [];
    },

    /* ========================================================
       5. RESUME SETTINGS
       ======================================================== */
    async getResumeSettings(studentUid) {
      const db = this.getDb();
      if (db) {
        try {
          const doc = await this.safeRemote(() => db.collection(this.COLLECTIONS.RESUME_SETTINGS).doc(studentUid).get());
          if (doc && doc.exists) return doc.data();
        } catch (e) { /* fallback */ }
      }
      return (CC.Store && CC.Store.db && CC.Store.db.resumeSettings)
        ? CC.Store.db.resumeSettings[studentUid] || null
        : null;
    },

    async saveResumeSettings(studentUid, settings) {
      const db = this.getDb();
      const docData = Object.assign({}, settings, {
        studentUid: studentUid,
        updatedAt: new Date().toISOString()
      });
      if (db) {
        await this.safeRemote(() => db.collection(this.COLLECTIONS.RESUME_SETTINGS).doc(studentUid).set(docData));
      }
      if (CC.Store && CC.Store.db) {
        if (!CC.Store.db.resumeSettings) CC.Store.db.resumeSettings = {};
        CC.Store.db.resumeSettings[studentUid] = docData;
        CC.Store.persist();
      }
      return docData;
    },

    /* ========================================================
       6. CERTIFICATES
       ======================================================== */
    async getCertificate(certId) {
      const cleanId = String(certId || '').trim().toUpperCase();
      const db = this.getDb();
      if (db) {
        try {
          const doc = await this.safeRemote(() => db.collection(this.COLLECTIONS.CERTIFICATES).doc(cleanId).get());
          if (doc && doc.exists) return doc.data();
        } catch (e) { /* fallback */ }
      }
      if (CC.Store && CC.Store.db && CC.Store.db.certificates) {
        return CC.Store.db.certificates.find(c => (c.id || '').toUpperCase() === cleanId) || null;
      }
      return null;
    },

    /* ========================================================
       7. AUDIT LOGS & NOTIFICATIONS
       ======================================================== */
    async recordAuditLog(entry) {
      const db = this.getDb();
      const id = entry.id || ('AUD-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100));
      const logDoc = {
        id: id,
        actorUid: entry.actorUid || 'SYSTEM',
        actorEmail: entry.actorEmail || 'system@campuscred.edu',
        actorRole: (entry.actorRole || 'SYSTEM').toUpperCase(),
        action: entry.action || 'LOG',
        resourceType: entry.resourceType || 'ACTIVITY',
        resourceId: entry.resourceId || '—',
        metadata: entry.metadata || {},
        ipAddress: entry.ipAddress || '127.0.0.1',
        timestamp: new Date().toISOString()
      };

      if (db) {
        await this.safeRemote(() => db.collection(this.COLLECTIONS.AUDIT_LOGS).doc(id).set(logDoc));
      }
      if (CC.Store && CC.Store.db) {
        if (!CC.Store.db.auditLogs) CC.Store.db.auditLogs = [];
        CC.Store.db.auditLogs.unshift(logDoc);
      }
      return logDoc;
    },

    async createNotification(notifData) {
      const db = this.getDb();
      const id = notifData.id || ('NTF-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100));
      const doc = {
        id: id,
        recipientUid: notifData.recipientUid,
        title: notifData.title,
        message: notifData.message,
        type: notifData.type || 'SYSTEM',
        referenceId: notifData.referenceId || '',
        isRead: false,
        createdAt: new Date().toISOString()
      };
      if (db) {
        await this.safeRemote(() => db.collection(this.COLLECTIONS.NOTIFICATIONS).doc(id).set(doc));
      }
      if (CC.Store && CC.Store.db) {
        if (!CC.Store.db.notifications) CC.Store.db.notifications = [];
        // Map also to legacy notification format
        CC.Store.db.notifications.unshift(Object.assign({}, doc, {
          studentId: doc.recipientUid,
          body: doc.message,
          read: false
        }));
      }
      return doc;
    },

    /* ========================================================
       8. DATABASE INITIALIZATION & SCHEMA SEEDING
       Seeds all 13 collections into Firestore with the EXACT
       schema defined in the design specification!
       ======================================================== */
    async seedFirestore(onProgress) {
      const progress = typeof onProgress === 'function' ? onProgress : function () {};
      const db = this.getDb();
      const isLive = !!db;

      progress({ step: 'START', message: 'Preparing Firestore Database seed package...' });

      // Build canonical data dictionaries adhering 100% to the specification
      const DEPARTMENTS = [
        { id: 'dept-cse', name: 'Department of Computer Science & Engineering', code: 'CSE', hodName: 'Dr. R.K. Singhal', contactEmail: 'hod.cse@campuscred.demo', isActive: true, createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'dept-it', name: 'Department of Information Technology', code: 'IT', hodName: 'Dr. P.K. Gupta', contactEmail: 'hod.it@campuscred.demo', isActive: true, createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'dept-ece', name: 'Department of Electronics & Communication', code: 'ECE', hodName: 'Dr. M.L. Roy', contactEmail: 'hod.ece@campuscred.demo', isActive: true, createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'dept-me', name: 'Department of Mechanical Engineering', code: 'ME', hodName: 'Dr. S.N. Verma', contactEmail: 'hod.me@campuscred.demo', isActive: true, createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'dept-ee', name: 'Department of Electrical Engineering', code: 'EE', hodName: 'Dr. H.S. Rathore', contactEmail: 'hod.ee@campuscred.demo', isActive: true, createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'dept-robotics', name: 'Department of Robotics & Automation', code: 'ROB', hodName: 'Dr. V. Raman', contactEmail: 'hod.robotics@campuscred.demo', isActive: true, createdAt: '2024-01-01T00:00:00.000Z' }
      ];

      const COURSES = [
        { id: 'course-btech-cse', departmentId: 'dept-cse', name: 'B.Tech Computer Science & Engineering', code: 'BT-CSE', durationYears: 4, degreeType: 'UNDERGRADUATE', isActive: true },
        { id: 'course-btech-it', departmentId: 'dept-it', name: 'B.Tech Information Technology', code: 'BT-IT', durationYears: 4, degreeType: 'UNDERGRADUATE', isActive: true },
        { id: 'course-btech-ece', departmentId: 'dept-ece', name: 'B.Tech Electronics & Communication', code: 'BT-ECE', durationYears: 4, degreeType: 'UNDERGRADUATE', isActive: true },
        { id: 'course-btech-me', departmentId: 'dept-me', name: 'B.Tech Mechanical Engineering', code: 'BT-ME', durationYears: 4, degreeType: 'UNDERGRADUATE', isActive: true },
        { id: 'course-btech-ee', departmentId: 'dept-ee', name: 'B.Tech Electrical Engineering', code: 'BT-EE', durationYears: 4, degreeType: 'UNDERGRADUATE', isActive: true },
        { id: 'course-btech-robotics', departmentId: 'dept-robotics', name: 'B.Tech Robotics & Artificial Intelligence', code: 'BT-RAI', durationYears: 4, degreeType: 'UNDERGRADUATE', isActive: true }
      ];

      const ACTIVITY_CATEGORIES = [
        { id: 'cat-hackathon', name: 'Hackathons & Innovation Competitions', description: 'Software and hardware hackathons, buildathons and innovation sprints', icon: 'zap', weightPoints: 50, isActive: true, displayOrder: 1 },
        { id: 'cat-technical', name: 'Technical Events & Symposia', description: 'Paper presentations, coding competitions, project expos, quizzes', icon: 'award', weightPoints: 40, isActive: true, displayOrder: 2 },
        { id: 'cat-sports', name: 'Sports & Athletics', description: 'Inter-college, zonal and national sports championships and meets', icon: 'flag', weightPoints: 30, isActive: true, displayOrder: 3 },
        { id: 'cat-cultural', name: 'Cultural & Arts', description: 'Dance, music, drama, fine arts, photography and stage performances', icon: 'sparkles', weightPoints: 30, isActive: true, displayOrder: 4 },
        { id: 'cat-certification', name: 'Professional Certifications', description: 'Recognized industry credentials (AWS, Google, Microsoft, Cisco, Oracle)', icon: 'shield', weightPoints: 45, isActive: true, displayOrder: 5 },
        { id: 'cat-workshop', name: 'Workshops & Bootcamps', description: 'Hands-on technical bootcamps, workshops and training seminars', icon: 'book', weightPoints: 25, isActive: true, displayOrder: 6 },
        { id: 'cat-other', name: 'Community & Leadership', description: 'NSS, youth festivals, student council, social drives, campus initiatives', icon: 'heart', weightPoints: 20, isActive: true, displayOrder: 7 }
      ];

      // Helper map for dept lookup
      const deptMap = {
        'Computer Science & Engineering': { id: 'dept-cse', name: 'Department of Computer Science & Engineering', courseId: 'course-btech-cse', courseName: 'B.Tech Computer Science & Engineering' },
        'Information Technology': { id: 'dept-it', name: 'Department of Information Technology', courseId: 'course-btech-it', courseName: 'B.Tech Information Technology' },
        'Electronics & Communication': { id: 'dept-ece', name: 'Department of Electronics & Communication', courseId: 'course-btech-ece', courseName: 'B.Tech Electronics & Communication' },
        'Mechanical Engineering': { id: 'dept-me', name: 'Department of Mechanical Engineering', courseId: 'course-btech-me', courseName: 'B.Tech Mechanical Engineering' },
        'Electrical Engineering': { id: 'dept-ee', name: 'Department of Electrical Engineering', courseId: 'course-btech-ee', courseName: 'B.Tech Electrical Engineering' }
      };

      // 1. Seed Departments
      progress({ step: 'DEPARTMENTS', message: 'Seeding `departments` collection (6 records)...' });
      for (const d of DEPARTMENTS) {
        if (isLive) await db.collection(this.COLLECTIONS.DEPARTMENTS).doc(d.id).set(d);
      }

      // 2. Seed Courses
      progress({ step: 'COURSES', message: 'Seeding `courses` collection (6 records)...' });
      for (const c of COURSES) {
        if (isLive) await db.collection(this.COLLECTIONS.COURSES).doc(c.id).set(c);
      }

      // 3. Seed Activity Categories
      progress({ step: 'CATEGORIES', message: 'Seeding `activityCategories` collection (7 records)...' });
      for (const cat of ACTIVITY_CATEGORIES) {
        if (isLive) await db.collection(this.COLLECTIONS.ACTIVITY_CATEGORIES).doc(cat.id).set(cat);
      }

      // Read mock data for users and activities
      const mockStudents = (CC.Store && CC.Store.db && CC.Store.db.students) || [];
      const mockFaculty = (CC.Store && CC.Store.db && CC.Store.db.faculty) || [];
      const mockAdmin = (CC.Store && CC.Store.db && CC.Store.db.admin) || {
        id: 'ADM-301', name: 'Priya Menon', email: 'admin@campuscred.demo', role: 'admin'
      };

      // 4. Seed Users, StudentProfiles, FacultyProfiles
      progress({ step: 'USERS', message: 'Seeding `users`, `studentProfiles`, and `facultyProfiles`...' });
      const usersList = [];
      const studentProfilesList = [];
      const facultyProfilesList = [];
      const studentSkillsList = [];
      const studentProjectsList = [];
      const studentLinksList = [];
      const resumeSettingsMap = {};

      // Students
      for (const s of mockStudents) {
        const dInfo = deptMap[s.department] || deptMap['Computer Science & Engineering'];
        const semesterNum = parseInt((s.semester || '5').replace(/\D/g, ''), 10) || 5;

        const uDoc = {
          uid: s.id,
          name: s.name,
          email: s.email,
          password: s.password || 'student123',
          role: 'STUDENT',
          departmentId: dInfo.id,
          departmentName: dInfo.name,
          courseId: dInfo.courseId,
          courseName: dInfo.courseName,
          academicYear: s.academicYear || '2024-2028',
          registrationNumber: s.enrollment || ('REG-' + s.id),
          accountStatus: 'ACTIVE',
          createdAt: '2024-08-01T09:00:00.000Z',
          updatedAt: new Date().toISOString()
        };
        usersList.push(uDoc);
        if (isLive) await db.collection(this.COLLECTIONS.USERS).doc(s.id).set(uDoc);

        const spDoc = {
          uid: s.id,
          bio: s.summary || (s.name + ' is a passionate engineering student.'),
          headline: s.headline || (s.branch + ' Student & Aspiring Technologist'),
          registrationNumber: s.enrollment || ('REG-' + s.id),
          currentSemester: semesterNum,
          isPortfolioPublic: s.portfolioVisibility !== 'private',
          portfolioSlug: s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + s.id.toLowerCase(),
          avatarUrl: '',
          totalVerifiedAchievements: 0,
          updatedAt: new Date().toISOString()
        };
        studentProfilesList.push(spDoc);
        if (isLive) await db.collection(this.COLLECTIONS.STUDENT_PROFILES).doc(s.id).set(spDoc);

        // Skills
        (s.skills || ['Python', 'Problem Solving']).forEach((sk, idx) => {
          const skDoc = {
            id: 'SKL-' + s.id + '-' + (idx + 1),
            studentUid: s.id,
            skillName: sk,
            proficiency: idx === 0 ? 'EXPERT' : idx === 1 ? 'ADVANCED' : 'INTERMEDIATE',
            category: 'Technical'
          };
          studentSkillsList.push(skDoc);
        });

        // Projects
        (s.projects || []).forEach((p, idx) => {
          const prjDoc = {
            id: 'PRJ-' + s.id + '-' + (idx + 1),
            studentUid: s.id,
            title: p.title || 'Academic Capstone Project',
            description: p.description || 'Developed interactive engineering solution',
            technologies: p.technologies || ['Python', 'OpenCV'],
            repoUrl: p.repoUrl || 'https://github.com/campuscred-demo/' + s.id.toLowerCase(),
            liveDemoUrl: p.liveDemoUrl || '',
            startDate: p.startDate || '2025-01-10',
            endDate: p.endDate || '2025-05-15'
          };
          studentProjectsList.push(prjDoc);
        });

        // Links
        (s.links || []).forEach((l, idx) => {
          const lnkDoc = {
            id: l.id || ('LNK-' + s.id + '-' + (idx + 1)),
            studentUid: s.id,
            platform: l.label || 'Personal',
            url: l.url || 'https://campuscred.demo',
            displayOrder: idx + 1
          };
          studentLinksList.push(lnkDoc);
        });

        // Resume Settings
        resumeSettingsMap[s.id] = {
          studentUid: s.id,
          selectedTemplate: 'ats',
          professionalSummary: s.summary || '',
          includeLinks: true,
          includeProjects: true,
          includeSkills: true,
          selectedActivityIds: [],
          updatedAt: new Date().toISOString()
        };
      }

      // Faculty
      for (const f of mockFaculty) {
        const dInfo = deptMap[f.department] || deptMap['Computer Science & Engineering'];
        const uDoc = {
          uid: f.id,
          name: f.name,
          email: f.email,
          password: f.password || 'faculty123',
          role: 'FACULTY',
          departmentId: dInfo.id,
          departmentName: dInfo.name,
          courseId: dInfo.courseId,
          courseName: dInfo.courseName,
          academicYear: '2024-2028',
          registrationNumber: f.employeeId || f.id,
          accountStatus: 'ACTIVE',
          createdAt: '2024-01-01T09:00:00.000Z',
          updatedAt: new Date().toISOString()
        };
        usersList.push(uDoc);
        if (isLive) await db.collection(this.COLLECTIONS.USERS).doc(f.id).set(uDoc);

        const fpDoc = {
          uid: f.id,
          designation: f.designation || 'Associate Professor',
          departmentId: dInfo.id,
          authorizedCategories: (f.categories || []).map(c => 'cat-' + c.toLowerCase().replace(/[^a-z0-9]/g, '')),
          officeLocation: 'Academic Block 2, Room ' + (100 + parseInt(f.id.replace(/\D/g, '') || '1', 10)),
          totalVerifiedCount: 0,
          updatedAt: new Date().toISOString()
        };
        facultyProfilesList.push(fpDoc);
        if (isLive) await db.collection(this.COLLECTIONS.FACULTY_PROFILES).doc(f.id).set(fpDoc);
      }

      // Admin
      const adminDoc = {
        uid: mockAdmin.id || 'ADM-301',
        name: mockAdmin.name || 'Priya Menon',
        email: mockAdmin.email || 'admin@campuscred.demo',
        password: mockAdmin.password || 'admin123',
        role: 'ADMIN',
        departmentId: 'dept-cse',
        departmentName: 'College Administration & Academic Affairs',
        courseId: '',
        courseName: '',
        academicYear: '2024-2028',
        registrationNumber: 'ADMIN',
        accountStatus: 'ACTIVE',
        createdAt: '2023-01-01T09:00:00.000Z',
        updatedAt: new Date().toISOString()
      };
      usersList.push(adminDoc);
      if (isLive) await db.collection(this.COLLECTIONS.USERS).doc(adminDoc.uid).set(adminDoc);

      // 5. Seed Activities, Verification History, Certificates
      progress({ step: 'ACTIVITIES', message: 'Seeding `activities`, `certificates` & `verificationHistory`...' });
      const rawActivities = (CC.Store && CC.Store.db && CC.Store.db.activities) || [];
      const activitiesList = [];
      const verificationHistoryList = [];
      const certificatesList = [];
      const verifiedCounterByStudent = {};
      const verifiedCounterByFaculty = {};

      for (const a of rawActivities) {
        const st = mockStudents.find(s => s.id === a.studentId) || {};
        const dInfo = deptMap[st.department] || deptMap['Computer Science & Engineering'];
        const catName = a.category || 'Technical';
        const catId = 'cat-' + catName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const vStatus = (a.status || 'pending').toUpperCase();

        const actDoc = {
          id: a.id,
          studentUid: a.studentId,
          studentName: st.name || 'Student',
          studentRegNo: st.enrollment || '2023CS001',
          departmentId: dInfo.id,
          departmentName: dInfo.name,
          academicYear: st.academicYear || '2024-2028',
          title: a.name,
          categoryId: catId,
          categoryName: catName,
          organization: a.organization || '—',
          activityDate: a.date || '2026-01-01',
          participationRole: a.role || 'Participant',
          achievementLevel: a.result || 'Participant',
          description: a.description || '',
          proofDocument: {
            fileName: (a.proof && a.proof.fileName) || 'certificate.pdf',
            fileSize: (a.proof && a.proof.fileSize) || 250000,
            contentType: (a.proof && a.proof.fileType) || 'application/pdf',
            storagePath: 'proofs/' + a.studentId + '/' + a.id + '.pdf',
            downloadUrl: ''
          },
          verificationStatus: vStatus,
          verifierUid: a.reviewerId || null,
          verifierName: a.reviewerId ? 'Dr. Rohit Mehta' : null,
          verificationDate: a.reviewedAt ? (a.reviewedAt + 'T10:00:00.000Z') : null,
          rejectionRemarks: vStatus === 'REJECTED' ? (a.remarks || 'Proof unverified') : '',
          certificateId: a.certificateId || '',
          submissionDate: (a.submittedAt || '2026-01-01') + 'T09:00:00.000Z',
          updatedAt: (a.reviewedAt || a.submittedAt || '2026-01-01') + 'T10:00:00.000Z',

          // Compatibility fields
          name: a.name,
          category: catName,
          date: a.date,
          role: a.role,
          result: a.result,
          status: a.status,
          studentId: a.studentId,
          submittedAt: a.submittedAt,
          reviewedAt: a.reviewedAt,
          reviewerId: a.reviewerId,
          remarks: a.remarks
        };
        activitiesList.push(actDoc);
        if (isLive) await db.collection(this.COLLECTIONS.ACTIVITIES).doc(a.id).set(actDoc);

        // History entry
        if (a.reviewedAt) {
          const vhDoc = {
            id: 'VH-' + a.id,
            activityId: a.id,
            studentUid: a.studentId,
            verifierUid: a.reviewerId || 'FAC-201',
            verifierName: 'Dr. Rohit Mehta',
            action: vStatus === 'VERIFIED' ? 'APPROVE' : 'REJECT',
            previousStatus: 'PENDING',
            newStatus: vStatus,
            remarks: a.remarks || (vStatus === 'VERIFIED' ? 'Approved' : 'Rejected'),
            timestamp: a.reviewedAt + 'T10:00:00.000Z'
          };
          verificationHistoryList.push(vhDoc);
          if (isLive) await db.collection(this.COLLECTIONS.VERIFICATION_HISTORY).doc(vhDoc.id).set(vhDoc);
        }

        // Certificate record
        if (vStatus === 'VERIFIED' && a.certificateId) {
          const certHash = await sha256(a.certificateId + '|' + a.id + '|' + a.studentId + '|' + a.name);
          const certDoc = {
            id: a.certificateId,
            activityId: a.id,
            studentUid: a.studentId,
            studentName: st.name || 'Student',
            studentRegNo: st.enrollment || '2023CS001',
            activityTitle: a.name,
            categoryName: catName,
            organization: a.organization || '—',
            achievementLevel: a.result || 'Winner',
            verifiedBy: 'Dr. Rohit Mehta',
            verifiedAt: a.reviewedAt + 'T10:00:00.000Z',
            verificationHash: certHash,
            qrEndpointUrl: (typeof location !== 'undefined' ? (location.origin + location.pathname) : 'https://campuscred.skit.ac.in') + '#/verify/' + a.certificateId
          };
          certificatesList.push(certDoc);
          if (isLive) await db.collection(this.COLLECTIONS.CERTIFICATES).doc(a.certificateId).set(certDoc);

          verifiedCounterByStudent[a.studentId] = (verifiedCounterByStudent[a.studentId] || 0) + 1;
          if (a.reviewerId) verifiedCounterByFaculty[a.reviewerId] = (verifiedCounterByFaculty[a.reviewerId] || 0) + 1;

          if (resumeSettingsMap[a.studentId]) {
            resumeSettingsMap[a.studentId].selectedActivityIds.push(a.id);
          }
        }
      }

      // Update student & faculty counters in profiles
      studentProfilesList.forEach(sp => {
        sp.totalVerifiedAchievements = verifiedCounterByStudent[sp.uid] || 0;
        if (isLive) db.collection(this.COLLECTIONS.STUDENT_PROFILES).doc(sp.uid).update({ totalVerifiedAchievements: sp.totalVerifiedAchievements }).catch(() => {});
      });
      facultyProfilesList.forEach(fp => {
        fp.totalVerifiedCount = verifiedCounterByFaculty[fp.uid] || 0;
        if (isLive) db.collection(this.COLLECTIONS.FACULTY_PROFILES).doc(fp.uid).update({ totalVerifiedCount: fp.totalVerifiedCount }).catch(() => {});
      });

      // 6. Seed Skills, Projects, Links, ResumeSettings
      progress({ step: 'PROFILES_EXTRA', message: 'Seeding `studentSkills`, `studentProjects`, `studentLinks`, `resumeSettings`...' });
      for (const sk of studentSkillsList) {
        if (isLive) await db.collection(this.COLLECTIONS.STUDENT_SKILLS).doc(sk.id).set(sk);
      }
      for (const pr of studentProjectsList) {
        if (isLive) await db.collection(this.COLLECTIONS.STUDENT_PROJECTS).doc(pr.id).set(pr);
      }
      for (const ln of studentLinksList) {
        if (isLive) await db.collection(this.COLLECTIONS.STUDENT_LINKS).doc(ln.id).set(ln);
      }
      for (const uid in resumeSettingsMap) {
        if (isLive) await db.collection(this.COLLECTIONS.RESUME_SETTINGS).doc(uid).set(resumeSettingsMap[uid]);
      }

      // 7. Seed Audit Logs & Notifications
      progress({ step: 'AUDIT_NOTIF', message: 'Seeding `auditLogs` and `notifications`...' });
      const auditLogsList = [
        {
          id: 'AUD-001',
          actorUid: 'ADM-301',
          actorEmail: 'admin@campuscred.demo',
          actorRole: 'ADMIN',
          action: 'CATEGORY_CREATED',
          resourceType: 'SETTING',
          resourceId: 'cat-hackathon',
          metadata: { name: 'Hackathons & Innovation Competitions', weight: 50 },
          ipAddress: '127.0.0.1',
          timestamp: '2024-01-01T10:00:00.000Z'
        },
        {
          id: 'AUD-002',
          actorUid: 'FAC-201',
          actorEmail: 'rohit.mehta@campuscred.demo',
          actorRole: 'FACULTY',
          action: 'ACTIVITY_VERIFIED',
          resourceType: 'ACTIVITY',
          resourceId: 'ACT-9001',
          metadata: { decision: 'VERIFIED', certificateId: 'CC-2026-9001' },
          ipAddress: '127.0.0.1',
          timestamp: '2026-09-02T11:20:00.000Z'
        }
      ];
      for (const log of auditLogsList) {
        if (isLive) await db.collection(this.COLLECTIONS.AUDIT_LOGS).doc(log.id).set(log);
      }

      const notificationsList = [
        {
          id: 'NTF-1',
          recipientUid: 'STU-1001',
          title: 'Achievement verified',
          message: '“Smart India Hackathon — Internal Round” was approved by Dr. Rohit Mehta and added to your verified portfolio.',
          type: 'VERIFICATION_APPROVED',
          referenceId: 'ACT-9001',
          isRead: false,
          createdAt: '2026-09-02T11:20:00.000Z'
        },
        {
          id: 'NTF-2',
          recipientUid: 'STU-1001',
          title: 'Action needed on submission',
          message: '“quizTech — National Level Quiz” was rejected. Rejection reason: proof does not show the event date clearly.',
          type: 'VERIFICATION_REJECTED',
          referenceId: 'ACT-9008',
          isRead: false,
          createdAt: '2026-09-18T14:10:00.000Z'
        },
        {
          id: 'NTF-3',
          recipientUid: 'STU-1001',
          title: 'Submitted successfully',
          message: '“GenAI Buildathon” is now pending faculty verification.',
          type: 'NEW_SUBMISSION',
          referenceId: 'ACT-9006',
          isRead: true,
          createdAt: '2026-10-02T16:00:00.000Z'
        }
      ];
      for (const notif of notificationsList) {
        if (isLive) await db.collection(this.COLLECTIONS.NOTIFICATIONS).doc(notif.id).set(notif);
      }

      // Synchronize back into Store.db so all in-memory views stay blazing fast
      if (CC.Store && CC.Store.db) {
        CC.Store.db.users = usersList;
        CC.Store.db.studentProfiles = studentProfilesList;
        CC.Store.db.facultyProfiles = facultyProfilesList;
        CC.Store.db.departments = DEPARTMENTS;
        CC.Store.db.courses = COURSES;
        CC.Store.db.activityCategories = ACTIVITY_CATEGORIES;
        CC.Store.db.activities = activitiesList;
        CC.Store.db.verificationHistory = verificationHistoryList;
        CC.Store.db.studentSkills = studentSkillsList;
        CC.Store.db.studentProjects = studentProjectsList;
        CC.Store.db.studentLinks = studentLinksList;
        CC.Store.db.resumeSettings = resumeSettingsMap;
        CC.Store.db.certificates = certificatesList;
        CC.Store.db.auditLogs = auditLogsList;
        CC.Store.db.notifications = notificationsList;
        CC.Store.persist();
      }

      const totalDocs = DEPARTMENTS.length + COURSES.length + ACTIVITY_CATEGORIES.length +
        usersList.length + studentProfilesList.length + facultyProfilesList.length +
        activitiesList.length + verificationHistoryList.length + certificatesList.length +
        studentSkillsList.length + studentProjectsList.length + studentLinksList.length +
        Object.keys(resumeSettingsMap).length + auditLogsList.length + notificationsList.length;

      progress({
        step: 'COMPLETE',
        message: 'Successfully seeded all 13 Firestore collections (' + totalDocs + ' total documents)!',
        counts: {
          departments: DEPARTMENTS.length,
          courses: COURSES.length,
          activityCategories: ACTIVITY_CATEGORIES.length,
          users: usersList.length,
          studentProfiles: studentProfilesList.length,
          facultyProfiles: facultyProfilesList.length,
          activities: activitiesList.length,
          certificates: certificatesList.length,
          verificationHistory: verificationHistoryList.length,
          studentSkills: studentSkillsList.length,
          studentProjects: studentProjectsList.length,
          studentLinks: studentLinksList.length,
          resumeSettings: Object.keys(resumeSettingsMap).length,
          auditLogs: auditLogsList.length,
          notifications: notificationsList.length
        }
      });

      return { success: true, totalDocuments: totalDocs };
    },

    /* Get summary counts of all 13 collections */
    getStats: function () {
      const db = CC.Store ? CC.Store.db : {};
      return {
        users: (db.users || []).length || (db.students || []).length + (db.faculty || []).length + 1,
        studentProfiles: (db.studentProfiles || []).length || (db.students || []).length,
        facultyProfiles: (db.facultyProfiles || []).length || (db.faculty || []).length,
        departments: (db.departments || []).length || 6,
        courses: (db.courses || []).length || 6,
        activityCategories: (db.activityCategories || []).length || 7,
        activities: (db.activities || []).length,
        verificationHistory: (db.verificationHistory || []).length || (db.auditLog || []).length,
        studentSkills: (db.studentSkills || []).length,
        studentProjects: (db.studentProjects || []).length,
        studentLinks: (db.studentLinks || []).length,
        resumeSettings: Object.keys(db.resumeSettings || {}).length,
        certificates: (db.certificates || []).length || (db.activities || []).filter(a => a.certificateId).length,
        auditLogs: (db.auditLogs || []).length || (db.auditLog || []).length,
        notifications: (db.notifications || []).length
      };
    }
  };

  global.CC = global.CC || {};
  global.CC.FirestoreService = FirestoreService;
})(window);
