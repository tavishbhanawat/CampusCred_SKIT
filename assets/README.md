# CampusCred Assets Directory

This directory stores all static graphic assets, icons, and isolated test certificates.

## Directory Structure

- **`images/`**: Production and UI mock images, student avatar templates, institutional logos, and branding graphics.
- **`icons/`**: Individual SVG vector icons used in UI components, buttons, and navigation.
- **`test-certificates/`**: Dedicated mock and sample certificates exclusively used for automated and manual testing.

> **CRITICAL SECURITY NOTE:**
> Never replace or overwrite actual student-uploaded certificates with generated sample images.
> Production certificates submitted by students are stored securely in Firestore / application storage and must be preserved with 100% cryptographic and visual fidelity.
> Files in `test-certificates/` are strictly for test runs, demo fixtures, and unit test assertions.
