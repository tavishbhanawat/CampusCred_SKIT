<div align="center">

# 🎓 CampusCred

### Digital Student Achievement & Participation Record System

**Every Achievement Counts. Every Record Verified.**

**Problem Statement:** SKIT021

## 🔗 Live Demo: [campuscred.vercel.app](https://campuscred.vercel.app)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla%20JS-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Firestore](https://img.shields.io/badge/Firestore-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

</div>

---

## 📖 About the Project

Colleges track student achievements (hackathons, sports, certifications, workshops, cultural events) in scattered spreadsheets, paper files and WhatsApp groups. Records get lost, certificates can be faked, and students have no single trusted place to show what they have done.

**CampusCred** fixes this with one centralized platform:

1. **Students** submit achievements with certificate proof.
2. **Faculty** review and verify each submission.
3. **Admins** manage college-wide records, analytics and reports.
4. Every verified record automatically feeds a **shareable portfolio**, an **ATS-scored resume** and **publicly checkable credentials**.

**Workflow:** `Student Submission → Faculty Verification → Verified Record → Portfolio, Resume & Analytics`

---

## 🔑 Try It Now

Open **[campuscred.vercel.app](https://campuscred.vercel.app)** and sign in with a demo account:

| Role | Email | Password |
|---|---|---|
| 🧑‍🎓 Student | `aarav.sharma@campuscred.demo` | `student123` |
| 👩‍🏫 Faculty | `rohit.mehta@campuscred.demo` | `faculty123` |
| 🛠️ Admin | `admin@campuscred.demo` | `admin123` |

- The student can also log in with enrollment ID `2023CS041`.
- The login page has one-click demo buttons for each role.
- Public pages need no login: [Verify a certificate](https://campuscred.vercel.app/#/verify) · [Sample public portfolio](https://campuscred.vercel.app/#/portfolio/STU-1001)

> 💡 **Tip:** Log in as Student, submit an activity, then use the top-bar account switcher to become Faculty and approve it. You will see the whole workflow in under a minute.

---

## ✨ Features

### 🔐 Authentication & Access
| Feature | Description |
|---|---|
| Role-based login | Separate flows for Student, Faculty and Admin |
| Email or enrollment ID | Students can sign in with either |
| Student registration | Department, course, enrollment number and mobile verification |
| Mobile OTP (simulated) | 6-digit code with resend timer |
| Approval gate | New accounts stay *Pending* until faculty or admin approves them |
| Multi-account switcher | Stay signed in as several users and switch instantly from the top bar |
| Route guards | Each page is locked to its role |

### 🧑‍🎓 Student Module
| Page | What it does |
|---|---|
| **Dashboard** | Stats (Total / Verified / Pending / Rejected), recent activity with search and filters, notifications, faculty remarks |
| **Add Activity** | Name, category, organization, date, role, result, description, certificate ID and **certificate upload** (PDF/JPG/PNG with validation and preview). Gives a reference ID and starts as *Pending* |
| **My Activities** | Filterable list, detail view with **status timeline**, delete while pending, **CSV export** |
| **Verify Certificate** | Check a certificate by ID or file before submitting |
| **My Portfolio** | Verified achievements grouped by category, with verification stamps and a copyable public link |
| **Resume Builder** | Three templates (**ATS-Friendly**, **Modern**, **Academic CV**), section toggles, live preview, *Verified by CampusCred* labels, print to PDF |
| **ATS Optimizer** | Scores your resume out of 100 with tips (see below) |
| **Social Links** | Add, edit, delete, with a per-link **Public / Private** toggle |
| **Notifications & Profile** | Filter by status, mark as read, edit academic details, control portfolio visibility |

**Categories:** Hackathon · Technical · Sports · Cultural · Certification · Workshop · Other

### 👩‍🏫 Faculty / Verifier Module
| Page | What it does |
|---|---|
| **Dashboard** | Pending / Approved / Rejected counts, queue preview, decisions by category |
| **Student Registrations** | Approve or reject new student accounts, search, filter by department, export |
| **Pending Verification** | Queue filtered by category, department, status and date |
| **Verification Detail** | Student and activity info, **certificate preview**, **Approve / Reject** with a **mandatory rejection reason** |
| **Reviewed Submissions** | Everything you have already decided |
| **Verification History** | Audit trail with remarks and timestamps |

Faculty only see submissions for their **department and authorized categories**.

### 🛠️ Admin Module
| Page | What it does |
|---|---|
| **Dashboard** | Headline stats, category donut, monthly stacked bar, department ranking, recent activity. Filters by department, branch, year, category, status and date re-render every chart |
| **Students / Faculty / Activities** | Searchable college-wide records, add and edit faculty |
| **Analytics** | Category chart, status donut, monthly trend, department participation, records table |
| **Reports** | **6 downloadable reports** in CSV and PDF |
| **Certificate Verification** | Manual ID search, simulated QR scan, sample ID loader |
| **Settings** | Firestore connection, demo data reset, privacy defaults |

### 🌐 Public Pages (no login)
| Page | What it does |
|---|---|
| **Certificate Verification** | Look up by ID, QR link or uploaded file. Result: **Verified / Invalid / Unable to verify** |
| **Public Portfolio** | Shows verified achievements only. Private portfolios are hidden |
| **Public Credentials** | Shareable page with certificates, skills, education and projects |

---

## 🔎 Certificate Authenticity Engine

A two-state verifier that checks certificates two ways: **by ID**, or **by uploading the file** (`.pdf`, `.png`, `.jpg`).

| Result | Meaning |
|---|---|
| ✅ Verified | Matches an accredited issuer record |
| ❌ Invalid | Revoked, tampered or mismatched |
| ⚠️ Unable to verify | Unrecognized signature or missing metadata |

Issuer registry: **Smart India Hackathon · IEEE · NPTEL/Swayam · AWS Academy · AICTE Innovation Cell**, with SHA-256 signatures and a canvas-drawn QR for each certificate.

## 📊 ATS Resume Analyzer

Scores a built or uploaded resume (`.pdf`, `.docx`, `.txt`) out of **100**:

| Section | Points |
|---|---|
| Contact & Header | 20 |
| Action Verbs & Quantified Metrics | 25 |
| Technical & Domain Skills Match | 25 |
| ATS Formatting & Section Standards | 15 |
| College-Verified Credentials | 15 |

Feedback is grouped into **Critical issues**, **Recommendations** and **Strengths**. Resumes with CampusCred-verified achievements earn extra credit.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (no framework, no build step) |
| Routing | Custom hash router with a declarative route table |
| Database | Google Cloud Firestore (13 collections) |
| Offline mode | `localStorage` fallback when Firestore is unreachable |
| Charts | Custom SVG charts, no libraries |
| Exports | CSV via Blob, PDF via print stylesheet |
| Hosting | Vercel |

---

## 🚀 Run Locally

```bash
git clone https://github.com/<your-username>/CampusCred-SKIT021.git
cd CampusCred-SKIT021
python -m http.server 8080
```

Open **http://localhost:8080**. You can also open `index.html` directly.

---

## 📁 Project Structure

```
CampusCred-SKIT021/
├── index.html
├── css/
│   ├── base.css  layout.css  components.css  pages.css
└── js/
    ├── app.js                    # Router + auth guards
    ├── data/mockData.js          # Seed data
    ├── services/
    │   ├── store.js              # Firestore + localStorage data layer
    │   ├── firebaseConfig.js     # Firebase setup
    │   ├── firestoreService.js   # Firestore collections & seeding
    │   ├── authService.js        # Login, registration, approvals
    │   ├── activityService.js    # Activity CRUD, notifications
    │   ├── verificationService.js# Approve/reject, audit trail
    │   ├── profileService.js     # Profile, links, public pages
    │   ├── certificateService.js # Issuer registry, verification, QR
    │   ├── atsService.js         # ATS scoring
    │   └── reportService.js      # Analytics, CSV/PDF export
    ├── components/               # icons, ui, charts, shell
    └── pages/                    # landing, login, student, faculty, admin, public
```

---

## 🗄️ Firestore Collections

`users` · `studentProfiles` · `facultyProfiles` · `departments` · `courses` · `activityCategories` · `activities` · `verificationHistory` · `studentSkills` / `studentProjects` / `studentLinks` · `resumeSettings` · `certificates` · `auditLogs` · `notifications`

---

## 🔒 Security & Privacy

- Public portfolios show **verified achievements** and opted-in links only.
- Student-added links never get a verification badge.
- No contact details or credentials appear on public pages.
- Rejections need a mandatory reason, and every decision is logged.
- Accounts need faculty/admin approval before activation.

## ⚠️ Prototype Notes

- All data is fictional demo data.
- SMS OTP and QR scanning are simulated.
- The issuer registry is demo data, not a live link to those organizations.
- Uploaded files are previewed in the browser only and not stored on a server.
- Demo passwords sit in client-side data. A production version needs server-side authentication.
- To use your own database, add your Firebase config in `js/services/firebaseConfig.js` or under **Admin → Settings**.

---

<div align="center">

### 🎓 CampusCred · SKIT021
**[campuscred.vercel.app](https://campuscred.vercel.app)**

*Student Submission → Faculty Verification → Verified Record → Analytics, Portfolio & Resume*

</div>
