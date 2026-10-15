/* ============================================================
   CampusCred — tests/test-framework.js
   ------------------------------------------------------------
   Universal Test Framework Runner for Node.js and Browser.
   ============================================================ */
(function (global) {
  'use strict';

  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

  const testRegistry = {
    suites: [],
    currentSuite: null,
    totalPassed: 0,
    totalFailed: 0,
    results: []
  };

  function describe(name, fn) {
    const suite = { name: name, tests: [] };
    testRegistry.suites.push(suite);
    testRegistry.currentSuite = suite;

    if (isNode && typeof require !== 'undefined') {
      try {
        const nodeTest = require('node:test');
        nodeTest.describe(name, fn);
        return;
      } catch (e) {}
    }

    fn();
    testRegistry.currentSuite = null;
  }

  function it(name, fn) {
    const testCase = { name: name, fn: fn, suite: testRegistry.currentSuite ? testRegistry.currentSuite.name : 'General' };
    if (testRegistry.currentSuite) {
      testRegistry.currentSuite.tests.push(testCase);
    }

    if (isNode && typeof require !== 'undefined') {
      try {
        const nodeTest = require('node:test');
        nodeTest.it(name, fn);
        return;
      } catch (e) {}
    }
  }

  const assert = {
    ok: function (condition, message) {
      if (!condition) {
        throw new Error(message || 'Assertion failed: expected truthy value, got ' + condition);
      }
    },
    strictEqual: function (actual, expected, message) {
      if (actual !== expected) {
        throw new Error((message ? message + ' — ' : '') + 'Expected [' + expected + '] (' + (typeof expected) + '), but got [' + actual + '] (' + (typeof actual) + ')');
      }
    },
    notStrictEqual: function (actual, expected, message) {
      if (actual === expected) {
        throw new Error((message ? message + ' — ' : '') + 'Expected values to not be strictly equal: ' + actual);
      }
    },
    deepStrictEqual: function (actual, expected, message) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error((message ? message + ' — ' : '') + 'Deep equality failed:\nExpected: ' + b + '\nActual: ' + a);
      }
    },
    rejects: async function (promiseFn, expectedErrorMatch, message) {
      let threw = false;
      let caughtErr = null;
      try {
        await promiseFn();
      } catch (err) {
        threw = true;
        caughtErr = err;
      }
      if (!threw) {
        throw new Error(message || 'Expected asynchronous function to reject, but it resolved successfully.');
      }
      if (expectedErrorMatch) {
        const errMsg = caughtErr ? String(caughtErr.message || caughtErr) : '';
        if (expectedErrorMatch instanceof RegExp) {
          if (!expectedErrorMatch.test(errMsg)) {
            throw new Error('Error message "' + errMsg + '" did not match pattern ' + expectedErrorMatch);
          }
        } else if (typeof expectedErrorMatch === 'string') {
          if (errMsg.indexOf(expectedErrorMatch) === -1) {
            throw new Error('Error message "' + errMsg + '" did not contain expected text "' + expectedErrorMatch + '"');
          }
        }
      }
    },
    throws: function (fn, expectedErrorMatch, message) {
      let threw = false;
      let caughtErr = null;
      try {
        fn();
      } catch (err) {
        threw = true;
        caughtErr = err;
      }
      if (!threw) {
        throw new Error(message || 'Expected function to throw an error, but it did not.');
      }
      if (expectedErrorMatch) {
        const errMsg = caughtErr ? String(caughtErr.message || caughtErr) : '';
        if (expectedErrorMatch instanceof RegExp) {
          if (!expectedErrorMatch.test(errMsg)) {
            throw new Error('Error message "' + errMsg + '" did not match pattern ' + expectedErrorMatch);
          }
        } else if (typeof expectedErrorMatch === 'string') {
          if (errMsg.indexOf(expectedErrorMatch) === -1) {
            throw new Error('Error message "' + errMsg + '" did not contain expected text "' + expectedErrorMatch + '"');
          }
        }
      }
    }
  };

  /* Run all tests sequentially in browser or standalone node runner */
  async function runAll() {
    testRegistry.totalPassed = 0;
    testRegistry.totalFailed = 0;
    testRegistry.results = [];

    for (let s = 0; s < testRegistry.suites.length; s++) {
      const suite = testRegistry.suites[s];
      for (let t = 0; t < suite.tests.length; t++) {
        const testCase = suite.tests[t];
        try {
          await testCase.fn();
          testRegistry.totalPassed++;
          testRegistry.results.push({
            suite: suite.name,
            name: testCase.name,
            passed: true
          });
        } catch (err) {
          testRegistry.totalFailed++;
          testRegistry.results.push({
            suite: suite.name,
            name: testCase.name,
            passed: false,
            error: err.message || String(err),
            stack: err.stack
          });
        }
      }
    }
    return testRegistry;
  }

  global.describe = describe;
  global.it = it;
  global.test = it;
  global.assert = assert;
  global.TestRunner = {
    registry: testRegistry,
    runAll: runAll
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      describe: describe,
      it: it,
      test: it,
      assert: assert,
      TestRunner: global.TestRunner
    };
  }
})(typeof window !== 'undefined' ? window : global);
