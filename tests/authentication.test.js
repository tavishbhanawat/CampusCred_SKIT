/* ============================================================
   CampusCred — tests/authentication.test.js
   ------------------------------------------------------------
   [Work Package A] Authentication & Multi-Account Session Tests.
   ============================================================ */
(function () {
  'use strict';

  if (typeof require !== 'undefined') {
    require('./test-setup.js');
    require('./test-framework.js');
  }

  const CC = (typeof window !== 'undefined' ? window.CC : global.CC);
  const AuthService = CC.AuthService;
  const Store = CC.Store;
  const assert = (typeof window !== 'undefined' ? window.assert : global.assert);

  describe('Authentication Module & Session Management', function () {

    it('should authenticate demo Student, Faculty, and Admin users with sanitization', async function () {
      Store.reset();

      // 1. Student Login
      const stuAuth = await AuthService.login({
        identifier: 'aarav.sharma@campuscred.demo',
        password: 'student123'
      });
      assert.strictEqual(stuAuth.role, 'student', 'Role must be student');
      assert.strictEqual(stuAuth.user.password, undefined, 'Password must be sanitized and stripped');
      assert.strictEqual(stuAuth.user.email, 'aarav.sharma@campuscred.demo', 'Email must match');

      // 2. Faculty Login
      const facAuth = await AuthService.login({
        identifier: 'rohit.mehta@campuscred.demo',
        password: 'faculty123'
      });
      assert.strictEqual(facAuth.role, 'faculty', 'Role must be faculty');
      assert.strictEqual(facAuth.user.password, undefined, 'Password must be sanitized and stripped');

      // 3. Admin Login
      const admAuth = await AuthService.login({
        identifier: 'admin@campuscred.demo',
        password: 'admin123'
      });
      assert.strictEqual(admAuth.role, 'admin', 'Role must be admin');
      assert.strictEqual(admAuth.user.password, undefined, 'Password must be sanitized and stripped');
    });

    it('should reject invalid credentials and unknown users', async function () {
      Store.reset();

      // Wrong password
      await assert.rejects(async function () {
        await AuthService.login({
          identifier: 'aarav.sharma@campuscred.demo',
          password: 'wrongpassword'
        });
      }, /Invalid password/i, 'Wrong password must be rejected');

      // Unknown identifier
      await assert.rejects(async function () {
        await AuthService.login({
          identifier: 'unknown.user@doesnotexist.demo',
          password: 'password123'
        });
      }, /User not found/i, 'Unknown user must be rejected');

      // Empty identifier
      await assert.rejects(async function () {
        await AuthService.login({
          identifier: '',
          password: ''
        });
      }, /enter your email/i, 'Empty credentials must be rejected');
    });

    it('should manage concurrent multi-account sessions and allow seamless switching', async function () {
      Store.reset();
      AuthService.logoutAll();

      // Sign in user 1 (Student)
      await AuthService.login({ identifier: 'aarav.sharma@campuscred.demo', password: 'student123' });

      // Sign in user 2 (Faculty)
      await AuthService.login({ identifier: 'rohit.mehta@campuscred.demo', password: 'faculty123' });

      const activeAccounts = AuthService.getActiveAccounts();
      assert.ok(activeAccounts.length >= 2, 'Must maintain at least 2 active accounts');

      const currentSession = AuthService.session();
      assert.strictEqual(currentSession.role, 'faculty', 'Most recently logged in user should be active session');

      // Switch back to Student account
      const stuAccount = activeAccounts.find(a => a.role === 'student');
      assert.ok(stuAccount, 'Student account must exist in active accounts');

      const switched = AuthService.switchAccount(stuAccount.userId);
      assert.strictEqual(switched.role, 'student', 'Active role should now be student');

      const newCurrentSession = AuthService.session();
      assert.strictEqual(newCurrentSession.userId, stuAccount.userId, 'Current session must match switched account');
    });

    it('should support removing specific accounts and logging out all sessions', async function () {
      Store.reset();
      AuthService.logoutAll();

      await AuthService.login({ identifier: 'aarav.sharma@campuscred.demo', password: 'student123' });
      await AuthService.login({ identifier: 'rohit.mehta@campuscred.demo', password: 'faculty123' });

      const accountsBefore = AuthService.getActiveAccounts();
      const facAccount = accountsBefore.find(a => a.role === 'faculty');

      // Remove faculty account
      AuthService.removeAccount(facAccount.userId);

      const accountsAfter = AuthService.getActiveAccounts();
      const stillHasFac = accountsAfter.some(a => a.userId === facAccount.userId);
      assert.strictEqual(stillHasFac, false, 'Removed account should no longer exist in active accounts');

      // Log out all
      AuthService.logoutAll();
      assert.strictEqual(AuthService.session(), null, 'Session should be null after logoutAll');
      assert.strictEqual(AuthService.getActiveAccounts().length, 0, 'Active accounts should be empty after logoutAll');
    });

    it('should enforce role-based default home routes', function () {
      assert.strictEqual(AuthService.homeFor('student'), '#/student/dashboard', 'Student home must be dashboard');
      assert.strictEqual(AuthService.homeFor('faculty'), '#/faculty/dashboard', 'Faculty home must be dashboard');
      assert.strictEqual(AuthService.homeFor('admin'), '#/admin/dashboard', 'Admin home must be dashboard');
    });

  });
})();
