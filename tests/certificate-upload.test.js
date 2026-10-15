/* ============================================================
   CampusCred — tests/certificate-upload.test.js
   ------------------------------------------------------------
   [Work Package B] Original Certificate Upload & Verification Tests.
   ============================================================ */
(function () {
  'use strict';

  if (typeof require !== 'undefined') {
    require('./test-setup.js');
    require('./test-framework.js');
  }

  const CC = (typeof window !== 'undefined' ? window.CC : global.CC);
  const Upload = CC.CertificateUpload;
  const Renderer = CC.CertificateRenderer;
  const CertService = CC.CertificateService;
  const Store = CC.Store;
  const assert = (typeof window !== 'undefined' ? window.assert : global.assert);

  describe('Certificate Module & Original Document Verification', function () {

    it('should validate allowed formats (PDF, PNG, JPG, WEBP) and reject dangerous executables', function () {
      const validPdf = { name: 'smart-india-hackathon.pdf', type: 'application/pdf', size: 1024 * 500 };
      const validPng = { name: 'ieee-certificate.png', type: 'image/png', size: 1024 * 300 };
      const validJpg = { name: 'nptel-elite.jpg', type: 'image/jpeg', size: 1024 * 400 };
      const validWebp = { name: 'course-cert.webp', type: 'image/webp', size: 1024 * 200 };

      assert.strictEqual(Upload.validateFile(validPdf).valid, true, 'PDF should be accepted');
      assert.strictEqual(Upload.validateFile(validPng).valid, true, 'PNG should be accepted');
      assert.strictEqual(Upload.validateFile(validJpg).valid, true, 'JPG should be accepted');
      assert.strictEqual(Upload.validateFile(validWebp).valid, true, 'WEBP should be accepted');

      const exe = { name: 'payload.exe', type: 'application/x-msdownload', size: 1024 };
      const bat = { name: 'virus.bat', type: 'text/plain', size: 1024 };
      const oversized = { name: 'huge-scan.pdf', type: 'application/pdf', size: 15 * 1024 * 1024 }; // 15MB > 10MB

      const r1 = Upload.validateFile(exe);
      assert.strictEqual(r1.valid, false, 'Executable .exe must be rejected');
      assert.ok(r1.error.indexOf('Executable') !== -1, 'Error message should warn about executable files');

      const r2 = Upload.validateFile(bat);
      assert.strictEqual(r2.valid, false, 'Batch script must be rejected');

      const r3 = Upload.validateFile(oversized);
      assert.strictEqual(r3.valid, false, 'Files over 10MB must be rejected');
    });

    it('should verify uploaded certificates display the exact original file without being regenerated or modified', function () {
      const originalDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const originalFileName = 'moe-national-hackathon-first-prize.png';

      const mockActivity = {
        id: 'ACT-PROOF-TEST-1',
        name: 'National Innovation Hackathon',
        category: 'Hackathon',
        proofDocument: {
          fileName: originalFileName,
          contentType: 'image/png',
          fileSize: 184520,
          downloadUrl: originalDataUrl
        }
      };

      // Ensure proof extractor preserves exact original fields
      const meta = Renderer.extractProofMeta(mockActivity);
      assert.strictEqual(meta.dataUrl, originalDataUrl, 'Exact original dataUrl must be preserved');
      assert.strictEqual(meta.fileName, originalFileName, 'Exact original fileName must be preserved');
      assert.strictEqual(meta.fileSize, 184520, 'Exact original fileSize must be preserved');

      // Test renderer HTML presentation
      const renderedHtml = Renderer.renderDocPreview(mockActivity);
      assert.ok(renderedHtml.indexOf(originalDataUrl) !== -1, 'HTML must embed the exact original dataUrl in img src');
      assert.ok(renderedHtml.indexOf('Original Certificate Presentation') !== -1, 'Must indicate original document presentation');
      assert.ok(renderedHtml.indexOf('download="' + originalFileName + '"') !== -1, 'Must provide direct download of original file');
    });

    it('should render PDF certificate proofs using embedded object/iframe and preserve original PDF', function () {
      const pdfDataUrl = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwgL0xlbmd0aCA1IDAgUiAvRmlsdGVyIC9GbGF0ZURlY29kZSA+PgpzdHJlYW0KeJzLzcxTSEvMzUzPVMhLLSrNSwEAG2kF/gplbmRzdHJlYW0KZW5kb2JqCg==';
      const pdfFileName = 'ieee-international-paper.pdf';

      const mockActivity = {
        id: 'ACT-PDF-TEST-1',
        name: 'IEEE International Conference',
        category: 'Technical',
        proofDocument: {
          fileName: pdfFileName,
          contentType: 'application/pdf',
          fileSize: 524288,
          downloadUrl: pdfDataUrl
        }
      };

      const renderedHtml = Renderer.renderDocPreview(mockActivity);
      assert.ok(renderedHtml.indexOf('type="application/pdf"') !== -1, 'Must render native PDF object embed');
      assert.ok(renderedHtml.indexOf(pdfDataUrl) !== -1, 'Must preserve exact original PDF dataUrl');
      assert.ok(renderedHtml.indexOf('Download PDF') !== -1, 'Must offer direct PDF download option');
    });

    it('should verify authentic CampusCred ledger certificates and accredited partner certificates', async function () {
      Store.reset();
      const verifiedAct = Store.db.activities.find(a => a.status === 'verified' && a.certificateId);
      assert.ok(verifiedAct, 'There must be a verified activity with certificateId in seed database');

      // 1. Verify internal ledger certificate
      const resInternal = await CertService.verifyCertificate(verifiedAct.certificateId);
      assert.strictEqual(resInternal.status, 'verified', 'Internal certificate should verify successfully');
      assert.strictEqual(resInternal.found, true, 'Certificate record must be found in ledger');
      assert.strictEqual(resInternal.issuerType, 'CAMPUSCRED_REGISTRY', 'Issuer type must be CAMPUSCRED_REGISTRY');

      // 2. Verify accredited partner certificates (SIH, IEEE, NPTEL)
      const resSIH = await CertService.verifyCertificate('SIH-2025-A847');
      assert.strictEqual(resSIH.status, 'verified', 'SIH accredited certificate should verify');
      assert.strictEqual(resSIH.issuerType, 'ACCREDITED_PARTNER', 'Must be ACCREDITED_PARTNER');

      const resIEEE = await CertService.verifyCertificate('IEEE-CS-2026-4821');
      assert.strictEqual(resIEEE.status, 'verified', 'IEEE accredited certificate should verify');

      const resNPTEL = await CertService.verifyCertificate('NPTEL26CS91823');
      assert.strictEqual(resNPTEL.status, 'verified', 'NPTEL accredited certificate should verify');
    });

    it('should flag revoked and tampered certificates as invalid and reject fake signatures', async function () {
      // 1. Blacklisted / Revoked certificate
      const resRevoked = await CertService.verifyCertificate('CC-2024-REVOKED');
      assert.strictEqual(resRevoked.status, 'invalid', 'Revoked certificate must return invalid status');
      assert.strictEqual(resRevoked.found, false, 'Revoked certificate cannot be marked found valid');

      // 2. Tampered cryptographic checksum
      const resTampered = await CertService.verifyCertificate('CC-2025-TAMPERED');
      assert.strictEqual(resTampered.status, 'invalid', 'Tampered certificate must return invalid status');

      // 3. Counterfeit pattern
      const resFake = await CertService.verifyCertificate('FAKE-CERTIFICATE-XYZ-999');
      assert.strictEqual(resFake.status, 'invalid', 'Obvious counterfeit ID must be flagged invalid');

      // 4. Unregistered / Unknown document
      const resUnknown = await CertService.verifyCertificate('CC-9999-NOTFOUND');
      assert.strictEqual(resUnknown.status, 'unable_to_verify', 'Unregistered ID must return unable_to_verify');
    });

  });
})();
