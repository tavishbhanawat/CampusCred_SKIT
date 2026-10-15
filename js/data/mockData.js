/* ============================================================
   CampusCred — js/data/mockData.js
   ------------------------------------------------------------
   DEMONSTRATION DATA ONLY. Every name, enrollment number and
   record below is fictional and generated for the SKIT021 demo.
   No real student personal data is used.

   This file is the single source of seed data. The rest of the
   app never touches it directly — it goes through the service
   layer (js/services/*), which can later be repointed at a
   Java Servlet/JSP + MySQL backend without touching the UI.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- Deterministic pseudo-random (stable demo data) ---------- */
  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  const CATEGORIES = ['Hackathon', 'Technical', 'Sports', 'Cultural', 'Certification', 'Workshop', 'Other'];
  const DEPARTMENTS = [
    'Computer Science & Engineering',
    'Information Technology',
    'Electronics & Communication',
    'Mechanical Engineering',
    'Electrical Engineering'
  ];
  const BRANCHES = ['CSE', 'IT', 'ECE', 'ME', 'EE'];
  const ACADEMIC_YEARS = ['2024-25', '2025-26', '2026-27'];
  const ROLES = ['Participant', 'Team Lead', 'Team Member', 'Volunteer', 'Speaker', 'Organizer', 'Representative'];

  /* ---------- Fictional people ---------- */
  const FIRST = ['Aarav', 'Diya', 'Kabir', 'Ishita', 'Rohan', 'Meera', 'Vivaan', 'Ananya', 'Aditya', 'Sara',
    'Neel', 'Tanvi', 'Yash', 'Riya', 'Dev', 'Kavya', 'Arjun', 'Nisha', 'Omar', 'Pooja',
    'Rehan', 'Shruti', 'Vihaan', 'Lavanya'];
  const LAST = ['Sharma', 'Verma', 'Mehta', 'Patel', 'Nair', 'Reddy', 'Kapoor', 'Iyer', 'Singh', 'Joshi',
    'Rao', 'Deshmukh', 'Gupta', 'Bose', 'Chawla', 'Menon', 'Kulkarni', 'Saxena', 'Pillai', 'Trivedi'];

  const EVENT_NAMES = {
    Hackathon: [
      'Smart India Hackathon — Internal Round',
      'Inter-College CodeStorm 4.0',
      'National Hack for Change',
      'Campus HackFest — 24hr Build',
      'GenAI Buildathon',
      'Open Source Sprint'
    ],
    Technical: [
      'Robotics Line-Follower Challenge',
      'Tech Symposium — Paper Presentation',
      'Circuit Design Olympiad',
      'Poster Presentation Competition',
      'Project Expo 2026',
      'quizTech — National Level Quiz'
    ],
    Sports: [
      'Inter-College Cricket Tournament',
      'Annual Athletics Meet',
      'Badminton Championship',
      'Chess Open Tournament',
      'Inter-Zone Football Cup',
      'Table Tennis League'
    ],
    Cultural: [
      'Annual Cultural Fest — Rangoli',
      'Inter-College Dance Competition',
      'Drama & Street Play Festival',
      'Music Battle — Solo Singing',
      'Art & Photography Exhibition',
      'Fashion Show — Spotlight'
    ],
    Certification: [
      'AWS Certified Cloud Practitioner',
      'Google Data Analytics Certificate',
      'Cisco CCNA — Module 1',
      'Microsoft Azure Fundamentals (AZ-900)',
      'Oracle Java SE Associate',
      'Red Hat Linux Essentials'
    ],
    Workshop: [
      'Machine Learning Bootcamp',
      'Full-Stack Web Development Workshop',
      'Arduino & IoT Hands-On Session',
      'Cybersecurity Awareness Workshop',
      'Blockchain Essentials Masterclass',
      'Figma UI/UX Design Workshop'
    ],
    Other: [
      'NSS Community Service Drive',
      'Yoga Day — Campus Wellness Week',
      'Blood Donation Camp Volunteer',
      'Library Reading Marathon',
      'Swachh Campus Initiative',
      'Career Guidance Seminar'
    ]
  };

  const ORGS = [
    'CampusCred Demo College', 'Institution Innovation Council', 'Computer Science Department',
    'Student Activity Council', 'IEEE Student Branch', 'Robotics Club', 'Sports Board',
    'Cultural Committee', 'NITI Aayog Initiative', 'External Organizing Committee'
  ];

  const RESULTS = {
    Hackathon: ['Winner — 1st Place', 'Runner-up', 'Top 10 Finalist', 'Participation Certificate', 'Top 25 Teams'],
    Technical: ['1st Prize', '2nd Prize', 'Finalist', 'Participation Certificate', 'Honourable Mention'],
    Sports: ['Gold Medal', 'Silver Medal', 'Bronze Medal', 'Semi-Finalist', 'Participation Certificate'],
    Cultural: ['Winner', 'Runner-up', 'Finalist', 'Participation Certificate', 'Best Performer'],
    Certification: ['Certified — Score 87%', 'Certified — Score 91%', 'Certified — Pass', 'Certified with Distinction'],
    Workshop: ['Completion Certificate', 'Certificate of Participation', 'Top Project Award'],
    Other: ['Certificate of Service', 'Certificate of Participation', 'Volunteer Appreciation Award']
  };

  const PROOF_TYPES = [
    { ext: 'pdf', type: 'application/pdf' },
    { ext: 'jpg', type: 'image/jpeg' },
    { ext: 'png', type: 'image/png' }
  ];

  /* ---------- Seed builders ---------- */

  function buildStudents() {
    return [
      {
        id: 'STU-1001', name: 'Aarav Sharma', enrollment: '2023CS041', role: 'student',
        email: 'aarav.sharma@campuscred.demo', password: 'student123',
        course: 'B.Tech', branch: 'CSE', department: DEPARTMENTS[0], academicYear: '2026-27',
        semester: '5th Semester', phone: '+91 98765 43210', year: '3rd Year',
        color: 1,
        headline: 'Full-Stack Developer & Machine Learning Enthusiast',
        summary: 'Final-year Computer Science student focused on full-stack development and applied machine learning. I build practical projects, take part in hackathons and enjoy contributing to open source.',
        skills: ['Java', 'JavaScript', 'React', 'Spring Boot', 'MySQL', 'Python', 'Git', 'REST APIs', 'Docker', 'Problem Solving', 'Leadership', 'Communication'],
        education: [
          { level: 'B.Tech', institute: 'CampusCred Demo College', branch: 'Computer Science & Engineering', from: '2024', to: '2028', detail: 'CGPA: 8.7 / 10' },
          { level: 'Senior Secondary (XII)', institute: 'Demo Senior Secondary School', branch: 'PCM — Computer Science', from: '2022', to: '2024', detail: '89.4%' },
          { level: 'Secondary (X)', institute: 'Demo Public School', branch: 'General', from: '2020', to: '2022', detail: '92.2%' }
        ],
        projects: [
          { id: 'PRJ-1', name: 'CampusCred Web Platform', description: 'Architected and engineered a responsive institutional verification portal that automated student credentials, reducing verification turnaround time by 65% for 1,200+ users.', tech: 'HTML, CSS, JavaScript, React, Firestore, Node.js', link: 'https://github.com/demo-campuscred/prototype' },
          { id: 'PRJ-2', name: 'Smart Attendance Tracker', description: 'Built and deployed a full-stack student attendance analytics engine handling 10,000+ records with 99.8% uptime, featuring real-time report generation.', tech: 'Java, Spring Boot, MySQL, REST APIs, Docker', link: 'https://github.com/demo-aarav/attendance' }
        ],
        links: [
          { id: 'LNK-1', label: 'LinkedIn', url: 'https://linkedin.com/in/demo-aarav', visible: true },
          { id: 'LNK-2', label: 'GitHub', url: 'https://github.com/demo-aarav', visible: true },
          { id: 'LNK-3', label: 'LeetCode', url: 'https://leetcode.com/demo_aarav', visible: true },
          { id: 'LNK-4', label: 'Portfolio Website', url: 'https://aarav-demo.dev', visible: true }
        ],
        portfolioVisibility: 'public'
      }
    ];
  }

  function buildFaculty() {
    return [
      { id: 'FAC-201', name: 'Dr. Rohit Mehta', email: 'rohit.mehta@campuscred.demo', password: 'faculty123', role: 'faculty', department: DEPARTMENTS[0], designation: 'Associate Professor & Verification Head', employeeId: 'EMP-CSE-114', phone: '+91 98765 43211', color: 1, categories: ['Hackathon', 'Technical', 'Certification', 'Workshop', 'Sports', 'Cultural', 'Other'] }
    ];
  }

  function buildAdmin() {
    return { id: 'ADM-301', name: 'Priya Menon', email: 'admin@campuscred.demo', password: 'admin123', role: 'admin', designation: 'System Administrator', department: 'Administration', phone: '+91 98765 43212', color: 1 };
  }

  /* ---------- Activity generator ---------- */
  function daysAgo(n) {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d;
  }
  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* Build authentic, high-resolution original certificate document vectors (SVGs) */
  function buildOriginalCertificateDoc(data) {
    const org = data.organization || 'Institutional Authority';
    const title = data.title || (data.category === 'Certification' ? 'CERTIFICATE OF ACCREDITATION' : 'CERTIFICATE OF MERIT');
    const recipient = data.recipient || 'Aarav Sharma';
    const event = data.event || data.name || 'Academic Event';
    const result = data.result || 'Successful Completion';
    const certId = data.certId || 'CC-2024-9001';
    const dateStr = data.dateStr || '2024';
    const role = data.role || 'Participant';
    const theme = data.theme || 'gold';

    let border1 = '#B45309';
    let border2 = '#0F172A';
    let headerColor = '#0F172A';
    let accentColor = '#B45309';
    let bgGrad1 = '#FFFDF8';
    let bgGrad2 = '#FBF6EC';
    let sealColor = '#D97706';

    if (theme === 'aws') {
      border1 = '#FF9900';
      border2 = '#232F3E';
      headerColor = '#232F3E';
      accentColor = '#FF9900';
      bgGrad1 = '#FFFFFF';
      bgGrad2 = '#F8FAFC';
      sealColor = '#FF9900';
    } else if (theme === 'ieee') {
      border1 = '#00629B';
      border2 = '#0B1F3A';
      headerColor = '#00629B';
      accentColor = '#00629B';
      bgGrad1 = '#FBFDFF';
      bgGrad2 = '#F0F7FC';
      sealColor = '#00629B';
    } else if (theme === 'emerald') {
      border1 = '#059669';
      border2 = '#064E3B';
      headerColor = '#064E3B';
      accentColor = '#059669';
      bgGrad1 = '#FDFEFE';
      bgGrad2 = '#F2FBF7';
      sealColor = '#059669';
    } else if (theme === 'crimson') {
      border1 = '#DC2626';
      border2 = '#450A0A';
      headerColor = '#450A0A';
      accentColor = '#DC2626';
      bgGrad1 = '#FFFDFD';
      bgGrad2 = '#FEF2F2';
      sealColor = '#DC2626';
    }

    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640" width="100%" height="100%">' +
      '<defs>' +
        '<linearGradient id="bg_' + certId.replace(/[^a-zA-Z0-9]/g, '') + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
          '<stop offset="0%" stop-color="' + bgGrad1 + '"/>' +
          '<stop offset="100%" stop-color="' + bgGrad2 + '"/>' +
        '</linearGradient>' +
        '<pattern id="pat_' + certId.replace(/[^a-zA-Z0-9]/g, '') + '" width="40" height="40" patternUnits="userSpaceOnUse">' +
          '<path d="M 0 20 Q 10 0, 20 20 T 40 20" fill="none" stroke="' + border1 + '" stroke-width="0.3" opacity="0.2"/>' +
        '</pattern>' +
      '</defs>' +
      '<rect width="960" height="640" fill="url(#bg_' + certId.replace(/[^a-zA-Z0-9]/g, '') + ')"/>' +
      '<rect width="960" height="640" fill="url(#pat_' + certId.replace(/[^a-zA-Z0-9]/g, '') + ')"/>' +
      '<rect x="22" y="22" width="916" height="596" fill="none" stroke="' + border1 + '" stroke-width="3.5"/>' +
      '<rect x="32" y="32" width="896" height="576" fill="none" stroke="' + border2 + '" stroke-width="1.2"/>' +
      '<rect x="36" y="36" width="888" height="568" fill="none" stroke="' + border1 + '" stroke-width="0.8" stroke-dasharray="6,4"/>' +
      '<text x="480" y="90" text-anchor="middle" font-family="Georgia, Times, serif" font-size="20" font-weight="bold" fill="' + headerColor + '" letter-spacing="2">' + org.toUpperCase() + '</text>' +
      '<text x="480" y="145" text-anchor="middle" font-family="Georgia, Times, serif" font-size="32" font-weight="bold" fill="' + accentColor + '" letter-spacing="3">' + title + '</text>' +
      '<text x="480" y="185" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#64748B" letter-spacing="1.5">THIS IS TO OFFICIALLY CERTIFY THAT</text>' +
      '<text x="480" y="245" text-anchor="middle" font-family="Georgia, Times, serif" font-size="38" font-weight="bold" fill="#0F172A">' + recipient + '</text>' +
      '<line x1="220" y1="262" x2="740" y2="262" stroke="' + border1 + '" stroke-width="1.5" stroke-dasharray="4,3"/>' +
      '<text x="480" y="305" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#334155">has demonstrated distinction and successfully achieved</text>' +
      '<text x="480" y="342" text-anchor="middle" font-family="Georgia, Times, serif" font-size="22" font-weight="bold" fill="' + accentColor + '">' + result + '</text>' +
      '<text x="480" y="378" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#475569">at <tspan font-weight="bold" fill="#0F172A">' + event + '</tspan> (Role: ' + role + ') · Held on ' + dateStr + '</text>' +
      '<g transform="translate(120, 480)">' +
        '<line x1="0" y1="35" x2="200" y2="35" stroke="#475569" stroke-width="1.5"/>' +
        '<text x="100" y="26" text-anchor="middle" font-family="cursive, serif" font-size="22" fill="#1E3A8A">' + (data.sig1Name || 'Dr. K. Sharma') + '</text>' +
        '<text x="100" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#0F172A">' + (data.sig1Title || 'Organizing Authority') + '</text>' +
        '<text x="100" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#64748B">' + org + '</text>' +
      '</g>' +
      '<g transform="translate(480, 500)">' +
        '<circle cx="0" cy="0" r="46" fill="#FFFBEB" stroke="' + sealColor + '" stroke-width="2.5" stroke-dasharray="3,2"/>' +
        '<circle cx="0" cy="0" r="38" fill="none" stroke="' + border1 + '" stroke-width="1"/>' +
        '<text x="0" y="-8" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="' + sealColor + '" letter-spacing="1.5">OFFICIAL ISSUER</text>' +
        '<text x="0" y="6" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="' + sealColor + '" letter-spacing="1">AUTHENTIC</text>' +
        '<text x="0" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#059669">VERIFIED SEAL</text>' +
      '</g>' +
      '<g transform="translate(640, 480)">' +
        '<line x1="0" y1="35" x2="200" y2="35" stroke="#475569" stroke-width="1.5"/>' +
        '<text x="100" y="26" text-anchor="middle" font-family="cursive, serif" font-size="22" fill="#1E3A8A">' + (data.sig2Name || 'Prof. R. Mehta') + '</text>' +
        '<text x="100" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#0F172A">' + (data.sig2Title || 'Director / Dean') + '</text>' +
        '<text x="100" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#64748B">Academic Directorate</text>' +
      '</g>' +
      '<text x="480" y="598" text-anchor="middle" font-family="Courier, monospace" font-size="11" fill="#64748B">OFFICIAL CERTIFICATE ID: ' + certId + ' · CRYPTOGRAPHIC CREDENTIAL RECORD</text>' +
    '</svg>';

    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function buildActivities(students) {
    const rng = makeRng(20261007);
    const activities = [];
    let seq = 1;

    function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
    function pickDistinct(arr, count) {
      const copy = arr.slice(); const out = [];
      while (out.length < count && copy.length) out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
      return out;
    }

    students.forEach(function (st) {
      // Between 4 and 9 activities per student
      const count = 4 + Math.floor(rng() * 6);
      const cats = pickDistinct(CATEGORIES, Math.min(count, 6));
      const used = new Set();

      for (let i = 0; i < count; i++) {
        const category = cats[i % cats.length];
        let name = pick(EVENT_NAMES[category]);
        let guard = 0;
        while (used.has(name) && guard++ < 10) name = pick(EVENT_NAMES[category]);
        used.add(name);

        const ageDays = 15 + Math.floor(rng() * 330); // spread over ~11 months
        const eventDate = daysAgo(ageDays);
        const submittedDays = Math.max(1, ageDays - Math.floor(rng() * 8));
        const submittedDate = daysAgo(submittedDays);

        // Status mix: ~58% verified, ~27% pending, ~15% rejected
        const roll = rng();
        let status = 'pending';
        if (roll < 0.58) status = 'verified';
        else if (roll < 0.85) status = 'pending';
        else status = 'rejected';

        const proof = PROOF_TYPES[Math.floor(rng() * PROOF_TYPES.length)];
        const org = pick(ORGS);
        const role = pick(ROLES);
        const result = pick(RESULTS[category]);
        const certSeq = String(seq).padStart(4, '0');

        const reviewer = 'FAC-201';

        const genericCertDoc = buildOriginalCertificateDoc({
          organization: org,
          title: category === 'Certification' ? 'CERTIFICATE OF ACCREDITATION' : (category === 'Hackathon' ? 'CERTIFICATE OF MERIT' : 'CERTIFICATE OF ACHIEVEMENT'),
          recipient: st.name,
          event: name,
          result: result,
          certId: 'CC-2024-' + certSeq,
          dateStr: new Date(eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          role: role,
          theme: category === 'Certification' ? 'aws' : (category === 'Sports' ? 'emerald' : (category === 'Cultural' ? 'crimson' : 'gold'))
        });

        const act = {
          id: 'ACT-' + certSeq,
          studentId: st.id,
          name: name,
          category: category,
          organization: org,
          date: iso(eventDate),
          role: role,
          result: result,
          description: name + ' conducted by ' + org + '. The student participated as ' + role.toLowerCase() + ' and received: ' + result + '.',
          proof: {
            fileName: 'certificate-' + certSeq + '-original.svg',
            fileType: 'image/svg+xml',
            fileSize: 180000 + Math.floor(rng() * 1600000),
            dataUrl: genericCertDoc
          },
          certificateId: '',
          status: status,
          submittedAt: iso(submittedDate),
          reviewedAt: null,
          reviewerId: null,
          remarks: '',
          history: [{ at: iso(submittedDate), action: 'submitted', by: st.name, note: 'Submitted for verification.' }]
        };

        if (status !== 'pending') {
          const reviewDate = daysAgo(Math.max(0, submittedDays - (1 + Math.floor(rng() * 6))));
          act.reviewedAt = iso(reviewDate);
          act.reviewerId = reviewer;
          if (status === 'verified') {
            act.certificateId = 'CC-' + reviewDate.getFullYear() + '-' + certSeq;
            act.remarks = pick([
              'Certificate verified against the submitted proof.',
              'Valid proof of participation verified.',
              'Details match the uploaded certificate. Approved.',
              'Genuine record confirmed. Approved for the digital portfolio.'
            ]);
            act.history.push({ at: iso(reviewDate), action: 'approved', by: 'Reviewer', note: act.remarks });
          } else {
            act.remarks = pick([
              'The uploaded file is blurry and the certificate ID is unreadable. Please re-upload a clear scan.',
              'Event date mentioned does not match the certificate. Please correct and resubmit.',
              'Certificate appears to belong to a different student name. Please re-upload the correct proof.',
              'Organization name is missing on the proof. Please upload the complete certificate.'
            ]);
            act.history.push({ at: iso(reviewDate), action: 'rejected', by: 'Reviewer', note: act.remarks });
          }
        }

        activities.push(act);
        seq++;
      }
    });

    /* ---- Curated records for the demo student (Aarav Sharma) ----
       These give the presentation a stable, story-friendly set of
       verified / pending / rejected examples with authentic original certificates. */
    const curated = [
      { name: 'Smart India Hackathon — Internal Round', category: 'Hackathon', organization: 'Institution Innovation Council & MoE', date: iso(daysAgo(46)), role: 'Team Lead', result: 'Winner — 1st Place', status: 'verified', age: 40, theme: 'gold', sig1Name: 'Prof. T. G. Sitharam', sig1Title: 'Chairman, AICTE', sig2Name: 'Dr. Abhay Jere', sig2Title: 'Chief Innovation Officer, MoE' },
      { name: 'Full-Stack Web Development Workshop', category: 'Workshop', organization: 'IEEE Student Branch', date: iso(daysAgo(95)), role: 'Participant', result: 'Completion Certificate', status: 'verified', age: 88, theme: 'ieee', sig1Name: 'Dr. A. Sen', sig1Title: 'Branch Counselor, IEEE', sig2Name: 'Chairperson', sig2Title: 'IEEE Computer Society' },
      { name: 'AWS Certified Cloud Practitioner', category: 'Certification', organization: 'Amazon Web Services (AWS) Training & Certification', date: iso(daysAgo(140)), role: 'Representative', result: 'Certified — Score 87%', status: 'verified', age: 132, theme: 'aws', sig1Name: 'Maureen Lonergan', sig1Title: 'VP, AWS Training & Certification', sig2Name: 'Global Certifications', sig2Title: 'Accreditation Directorate' },
      { name: 'Inter-College Cricket Tournament', category: 'Sports', organization: 'Inter-Collegiate Sports Board', date: iso(daysAgo(61)), role: 'Team Member', result: 'Silver Medal', status: 'verified', age: 55, theme: 'emerald', sig1Name: 'Col. V. Raman', sig1Title: 'Director of Physical Education', sig2Name: 'Sports Secretary', sig2Title: 'University Athletics Board' },
      { name: 'Annual Cultural Fest — Street Play', category: 'Cultural', organization: 'Campus Cultural Committee', date: iso(daysAgo(120)), role: 'Participant', result: 'Runner-up', status: 'verified', age: 112, theme: 'crimson', sig1Name: 'Dr. Meenakshi S.', sig1Title: 'Dean, Student Cultural Affairs', sig2Name: 'Convener', sig2Title: 'Annual Cultural Fest' },
      { name: 'GenAI Buildathon', category: 'Hackathon', organization: 'Department of Computer Science', date: iso(daysAgo(12)), role: 'Team Member', result: 'Top 10 Finalist', status: 'pending', age: 8, theme: 'ieee', sig1Name: 'Head of Department', sig1Title: 'Dept of Computer Science', sig2Name: 'Faculty Convener', sig2Title: 'GenAI Innovation Lab' },
      { name: 'Machine Learning Bootcamp', category: 'Workshop', organization: 'Student Activity Council', date: iso(daysAgo(5)), role: 'Participant', result: 'Certificate of Participation', status: 'pending', age: 3, theme: 'gold', sig1Name: 'Technical Coordinator', sig1Title: 'Student Activity Council', sig2Name: 'Lead Instructor', sig2Title: 'AI Research Lab' },
      { name: 'quizTech — National Level Quiz', category: 'Technical', organization: 'Computer Science Department', date: iso(daysAgo(30)), role: 'Participant', result: 'Participation Certificate', status: 'rejected', age: 24, theme: 'ieee', sig1Name: 'Quiz Master', sig1Title: 'quizTech Committee', sig2Name: 'HOD CSE', sig2Title: 'Dept of Computer Science' }
    ];

    curated.forEach(function (c, idx) {
      const submittedDate = daysAgo(c.age);
      const certSeq = '9' + String(idx + 1).padStart(3, '0');
      const certId = c.status === 'verified' ? ('CC-' + daysAgo(Math.max(0, c.age - 4)).getFullYear() + '-' + certSeq) : ('CERT-SUB-' + certSeq);

      // Generate authentic original certificate document vector
      const certDocDataUrl = buildOriginalCertificateDoc({
        organization: c.organization,
        title: c.category === 'Certification' ? 'CERTIFICATE OF ACCREDITATION' : (c.category === 'Hackathon' ? 'CERTIFICATE OF MERIT' : 'CERTIFICATE OF ACHIEVEMENT'),
        recipient: 'Aarav Sharma',
        event: c.name,
        result: c.result,
        certId: certId,
        dateStr: new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        role: c.role,
        theme: c.theme,
        sig1Name: c.sig1Name,
        sig1Title: c.sig1Title,
        sig2Name: c.sig2Name,
        sig2Title: c.sig2Title
      });

      const act = {
        id: 'ACT-9' + String(idx + 1).padStart(3, '0'),
        studentId: 'STU-1001',
        name: c.name,
        category: c.category,
        organization: c.organization,
        date: c.date,
        role: c.role,
        result: c.result,
        description: c.name + ' — ' + c.result + '. Participated as ' + c.role.toLowerCase() + ', organised by ' + c.organization + '.',
        proof: {
          fileName: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 35) + '-original.svg',
          fileType: 'image/svg+xml',
          fileSize: 185000 + idx * 45000,
          dataUrl: certDocDataUrl
        },
        certificateId: c.status === 'verified' ? certId : '',
        status: c.status,
        submittedAt: iso(submittedDate),
        reviewedAt: null,
        reviewerId: null,
        remarks: '',
        history: [{ at: iso(submittedDate), action: 'submitted', by: 'Aarav Sharma', note: 'Submitted for verification.' }]
      };

      if (c.status === 'verified') {
        const rd = daysAgo(Math.max(0, c.age - 4));
        act.reviewedAt = iso(rd);
        act.reviewerId = 'FAC-201';
        act.remarks = 'Original certificate verified against the uploaded institutional document. Approved.';
        act.history.push({ at: iso(rd), action: 'approved', by: 'Dr. Rohit Mehta', note: act.remarks });
      } else if (c.status === 'rejected') {
        const rd = daysAgo(Math.max(0, c.age - 3));
        act.reviewedAt = iso(rd);
        act.reviewerId = 'FAC-201';
        act.remarks = 'The uploaded proof does not show the event date clearly. Please re-upload a clear scan of the original certificate.';
        act.history.push({ at: iso(rd), action: 'rejected', by: 'Dr. Rohit Mehta', note: act.remarks });
      }

      activities.push(act);
    });

    return activities;
  }

  /* ---------- Notifications for the demo student ---------- */
  function buildNotifications() {
    return [
      { id: 'NTF-1', studentId: 'STU-1001', type: 'approved', title: 'Achievement verified', body: '“Smart India Hackathon — Internal Round” was approved by Dr. Rohit Mehta and added to your verified portfolio.', createdAt: iso(daysAgo(39)), read: false },
      { id: 'NTF-2', studentId: 'STU-1001', type: 'rejected', title: 'Action needed on submission', body: '“quizTech — National Level Quiz” was rejected. Rejection reason: proof does not show the event date clearly.', createdAt: iso(daysAgo(23)), read: false },
      { id: 'NTF-3', studentId: 'STU-1001', type: 'pending', title: 'Submitted successfully', body: '“GenAI Buildathon” is now pending faculty verification.', createdAt: iso(daysAgo(8)), read: true },
      { id: 'NTF-4', studentId: 'STU-1001', type: 'system', title: 'Portfolio ready to share', body: 'Your verified portfolio link is active. Share it with recruiters straight from My Portfolio.', createdAt: iso(daysAgo(16)), read: true },
      { id: 'NTF-5', studentId: 'STU-1001', type: 'approved', title: 'Achievement verified', body: '“Inter-College Cricket Tournament” was approved and now appears in your resume under Verified Achievements.', createdAt: iso(daysAgo(54)), read: true },
      { id: 'NTF-6', studentId: 'STU-1001', type: 'approved', title: 'Achievement verified', body: 'Your recent submission was verified.', createdAt: iso(daysAgo(6)), read: false }
    ];
  }

  function buildStudentRegistrations() {
    return [
      {
        id: 'REG-2026-001',
        uid: 'STU-2045',
        name: 'Diya Patel',
        email: 'diya.patel@campuscred.demo',
        phone: '+91 98765 43220',
        password: 'password123',
        enrollment: '2024CS089',
        registrationNumber: '2024CS089',
        departmentId: 'dept-cse',
        departmentName: DEPARTMENTS[0],
        courseId: 'course-btech-cse',
        courseName: 'B.Tech Computer Science & Engineering',
        course: 'B.Tech',
        branch: 'CSE',
        department: DEPARTMENTS[0],
        academicYear: '2024-2028',
        semester: '1st Semester',
        year: '1st Year',
        status: 'PENDING_APPROVAL',
        accountStatus: 'PENDING_APPROVAL',
        isVerifiedStudent: false,
        mobileOtpVerified: true,
        verificationChannel: 'SMS',
        otpVerifiedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        color: 2,
        bio: 'Enthusiastic freshman student pursuing Computer Science with interest in algorithmic programming and open source.'
      }
    ];
  }

  /* ---------- Full demo database ---------- */
  function buildDatabase() {
    const students = buildStudents();
    const faculty = buildFaculty();
    const admin = buildAdmin();
    const activities = buildActivities(students);
    const notifications = buildNotifications();
    const studentRegistrations = buildStudentRegistrations();

    // Demo activity log for the admin "recent verification activity" feed
    const auditLog = activities
      .filter(function (a) { return a.reviewedAt; })
      .slice(0, 40)
      .map(function (a) {
        return {
          id: 'LOG-' + a.id,
          activityId: a.id,
          action: a.status === 'verified' ? 'approved' : 'rejected',
          by: a.reviewerId,
          at: a.reviewedAt,
          note: a.remarks
        };
      });

    return {
      meta: { seededAt: new Date().toISOString(), version: 6, disclaimer: 'Demo dataset — fictional records for presentation only.' },
      students: students,
      studentRegistrations: studentRegistrations,
      faculty: faculty,
      admin: admin,
      activities: activities,
      notifications: notifications,
      auditLog: auditLog
    };
  }

  global.MockData = {
    buildDatabase: buildDatabase,
    CATEGORIES: CATEGORIES,
    DEPARTMENTS: DEPARTMENTS,
    BRANCHES: BRANCHES,
    ACADEMIC_YEARS: ACADEMIC_YEARS,
    ROLES: ROLES,
    EVENT_NAMES: EVENT_NAMES
  };
})(window);
