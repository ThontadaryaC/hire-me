// API Endpoint base URL
// For local testing, it uses localhost:8000. In production, change the fallback URL below to your deployed backend.
const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:8000'
    : 'https://hire-me-nsxn.onrender.com'; // <-- REPLACE with your production API URL (e.g. Render/Railway)

// Fallback Candidate Info (If backend is offline)
const fallbackCandidate = {
    Name: "Thontadarya C",
    email: "thontadarayacapt8073@gmail.com",
    phone: "7892650413",
    skills: [
        "Java (Core)", "C Language", "Python", "HTML / CSS", "SQL (MySQL)",
        "Streamlit", "Chrome Extension APIs", "FastAPI (Backend)", "MySQL Workbench", "Git & GitHub",
        "Data Analysis", "AI/LLM Integrations", "Teamwork", "Problem Solving", "Effective Communication"
    ]
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initChat();
    initMatcher();
    initTheme();
    fetchCandidateProfile();
});

// 1. Tab Switching (Right Pane)
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// 2. Fetch Profile Info from Backend
async function fetchCandidateProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/profile`);
        if (!response.ok) throw new Error('API server unavailable');
        const data = await response.json();
        if (data && !data.error) {
            updateProfileUI(data);
        }
    } catch (err) {
        console.warn('Backend profile API offline, using offline defaults:', err);
    }
}

function updateProfileUI(profile) {
    if (profile.Name) {
        document.getElementById('candidate-name').textContent = profile.Name;
    }
    if (profile.email) {
        const emailEl = document.getElementById('contact-email');
        emailEl.innerHTML = `<i class="fa-regular fa-envelope"></i> ${profile.email}`;
        emailEl.href = `mailto:${profile.email}`;
    }
    if (profile.phone) {
        const phoneEl = document.getElementById('contact-phone');
        phoneEl.innerHTML = `<i class="fa-solid fa-phone"></i> ${profile.phone}`;
        phoneEl.href = `tel:${profile.phone}`;
    }

    // Dynamic summary text if experiences exist
    if (profile.experience && profile.experience.length > 0 && profile.Name) {
        const primaryRole = profile.experience[0].role || "Full-Stack Developer";
        const primaryProjects = profile.projects && profile.projects.length > 0 
            ? profile.projects.slice(0, 3).join(', ') 
            : 'AI and software projects';
        const dynamicSummary = `Motivated Computer Science Engineering candidate representing ${profile.Name}. Experienced in role as ${primaryRole} and skilled across key developments: ${primaryProjects}. Eager to contribute as a Customer Success Engineer Trainee, Associate AI Developer, or relevant technical positions.`;
        document.getElementById('candidate-summary').textContent = dynamicSummary;
    }

    // 1. Render Skills (Categorized dynamically)
    if (profile.skills && profile.skills.length > 0) {
        const langTags = document.getElementById('languages-tags');
        const toolsTags = document.getElementById('tools-tags');
        const conceptsTags = document.getElementById('concepts-tags');

        langTags.innerHTML = '';
        toolsTags.innerHTML = '';
        conceptsTags.innerHTML = '';

        // Classification lists
        const langKeywords = ['java', 'c', 'python', 'html', 'css', 'javascript', 'sql', 'mysql', 'bash', 'shell', 'typescript', 'c++', 'c#'];
        const toolsKeywords = ['streamlit', 'git', 'github', 'mysql workbench', 'fastapi', 'docker', 'vs code', 'chrome extension', 'api', 'workbench', 'jupyter'];

        profile.skills.forEach(skill => {
            const skillLower = skill.toLowerCase();
            const badge = document.createElement('span');
            badge.classList.add('skill-badge');
            badge.textContent = skill;

            // Sort skill into dynamic tag column
            if (langKeywords.some(keyword => skillLower.includes(keyword))) {
                langTags.appendChild(badge);
            } else if (toolsKeywords.some(keyword => skillLower.includes(keyword))) {
                toolsTags.appendChild(badge);
            } else {
                conceptsTags.appendChild(badge);
            }
        });

        // Add default badge if any tag list is empty
        if (!langTags.children.length) langTags.innerHTML = '<span class="skill-badge">Programming Logic</span>';
        if (!toolsTags.children.length) toolsTags.innerHTML = '<span class="skill-badge">Developer Tools</span>';
        if (!conceptsTags.children.length) conceptsTags.innerHTML = '<span class="skill-badge">Problem Solving</span>';
    }

    // 2. Render Education Timeline
    if (profile.education && profile.education.length > 0) {
        const eduTimeline = document.getElementById('education-timeline');
        eduTimeline.innerHTML = '';

        profile.education.forEach(eduString => {
            const item = document.createElement('div');
            item.classList.add('timeline-item');

            // Parse edu string. e.g., "Bachelor of Engineering... S.J.M. Institute of Technology (2026)"
            const parts = eduString.split(',');
            const title = parts[0] || 'Educational Qualification';
            const subtitle = parts.slice(1).join(',') || 'Academic Institution';
            
            item.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-date">Academic History</div>
                <h4 class="timeline-title">${title.trim()}</h4>
                <p class="timeline-subtitle">${subtitle.trim()}</p>
            `;
            eduTimeline.appendChild(item);
        });
    }

    // 3. Render Experiences / Projects Timeline
    if (profile.experience && profile.experience.length > 0) {
        const expTimeline = document.getElementById('experience-timeline');
        expTimeline.innerHTML = '';

        profile.experience.forEach(exp => {
            const item = document.createElement('div');
            item.classList.add('timeline-item');
            
            const dateText = exp.duration || 'Project Highlight';
            const title = exp.role ? `${exp.role}` : 'Developer';
            const subtitle = exp.companey || 'Engineering Showcase';
            
            // Build bullet points lists from description paragraph
            let bulletsHTML = '';
            if (exp.description) {
                // Split by bullets (•) or sentences
                const bullets = exp.description.split(/[•\n]/).filter(s => s.trim().length > 0);
                if (bullets.length > 1) {
                    bulletsHTML = `<ul class="timeline-details">` + 
                        bullets.map(b => `<li>${b.trim()}</li>`).join('') + 
                        `</ul>`;
                } else {
                    bulletsHTML = `<p class="timeline-subtitle" style="font-size: 0.8rem; margin-top: 4px; font-weight: normal; color: var(--text-secondary);">${exp.description}</p>`;
                }
            }

            item.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-date">${dateText}</div>
                <h4 class="timeline-title">${title}</h4>
                <p class="timeline-subtitle" style="font-weight: 600; color: var(--primary-cyan);">${subtitle}</p>
                ${bulletsHTML}
            `;
            expTimeline.appendChild(item);
        });
    }

    // 4. Render Certifications
    if (profile.certificates && profile.certificates.length > 0) {
        const certsList = document.getElementById('certifications-list');
        certsList.innerHTML = '';

        profile.certificates.forEach(certString => {
            const parts = certString.split(' – ');
            const name = parts[0] || certString;
            const issuer = parts[1] || 'Completed Certification';

            const item = document.createElement('div');
            item.classList.add('cert-item');
            item.innerHTML = `
                <i class="fa-solid fa-certificate"></i>
                <div class="cert-info">
                    <span class="cert-name">${name.trim()}</span>
                    <span class="cert-meta">${issuer.trim()}</span>
                </div>
            `;
            certsList.appendChild(item);
        });
    }
}

// 3. AI Chat Representative (Right Pane)
function initChat() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const suggestBtns = document.querySelectorAll('.suggest-btn');

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const question = chatInput.value.trim();
        if (!question) return;

        chatInput.value = '';
        appendMessage('user', question);

        // Add typing dots
        const loadingId = appendLoadingDots();
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });

            removeLoadingDots(loadingId);
            
            if (!response.ok) throw new Error("API call error");
            const data = await response.json();
            
            if (data.error) {
                appendMessage('bot', `I'm sorry, I ran into an error: ${data.error}`);
            } else {
                appendMessage('bot', data.answer);
            }
        } catch (err) {
            removeLoadingDots(loadingId);
            appendMessage('bot', `<i class="fa-solid fa-circle-exclamation text-danger"></i> Connection Error: Could not connect to AI representative. Make sure the FastAPI server is running on port 8000.`);
            console.error('Chat error:', err);
        }

        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    suggestBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            chatInput.value = btn.textContent;
            chatForm.dispatchEvent(new Event('submit'));
        });
    });
}

function appendMessage(sender, text) {
    const chatMessages = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', `${sender}-message`);
    msgDiv.innerHTML = `
        <div class="message-content">
            <p>${text.replace(/\n/g, '<br>')}</p>
        </div>
    `;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

let loaderIdx = 0;
function appendLoadingDots() {
    const chatMessages = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    const id = `chat-loader-${loaderIdx++}`;
    msgDiv.id = id;
    msgDiv.classList.add('message', 'bot-message');
    msgDiv.innerHTML = `
        <div class="message-content">
            <div class="chat-loading">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(msgDiv);
    return id;
}

function removeLoadingDots(id) {
    const bubble = document.getElementById(id);
    if (bubble) bubble.remove();
}

// 4. Matcher Tool Layout (Left Sidebar)
function initMatcher() {
    const compareBtn = document.getElementById('compare-btn');
    const jdFile = document.getElementById('jd-file');
    const jdText = document.getElementById('jd-text');
    const dropzone = document.getElementById('file-dropzone');
    const fileNameText = document.getElementById('file-name-text');
    const clearFileBtn = document.getElementById('clear-file-btn');
    
    // Status states
    const loadingEl = document.getElementById('matcher-loading');
    const errorEl = document.getElementById('matcher-error');
    const errorMsgEl = document.getElementById('matcher-error-msg');
    const outputEl = document.getElementById('matcher-output');

    // Matching details fields
    const scoreNum = document.getElementById('match-score-num');
    const scoreProgress = document.getElementById('score-ring-progress');
    const verdictText = document.getElementById('match-verdict');
    const strengthsList = document.getElementById('match-strengths');
    const gapsList = document.getElementById('match-gaps');
    const skillsMatchedBox = document.getElementById('match-skills-matched');
    const skillsMissingBox = document.getElementById('match-skills-missing');

    // Trigger File input on click dropzone
    dropzone.addEventListener('click', (e) => {
        if (e.target !== clearFileBtn && !clearFileBtn.contains(e.target)) {
            jdFile.click();
        }
    });

    // File Selector Change Event
    jdFile.addEventListener('change', () => {
        if (jdFile.files && jdFile.files.length > 0) {
            const file = jdFile.files[0];
            fileNameText.textContent = file.name;
            clearFileBtn.style.display = 'flex';
            dropzone.style.borderColor = 'var(--primary-cyan)';
            
            // Clear text paste if file is chosen
            jdText.value = '';
        }
    });

    // Clear File button
    clearFileBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop clicking dropzone
        resetFileInput();
    });

    function resetFileInput() {
        jdFile.value = '';
        fileNameText.textContent = 'Upload PDF or DOCX file';
        clearFileBtn.style.display = 'none';
        dropzone.style.borderColor = 'rgba(255,255,255,0.1)';
    }

    // Drag and drop event handlers
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            jdFile.files = e.dataTransfer.files;
            const file = jdFile.files[0];
            fileNameText.textContent = file.name;
            clearFileBtn.style.display = 'flex';
            dropzone.style.borderColor = 'var(--primary-cyan)';
            jdText.value = ''; // clear text
        }
    });

    // Compare Button Trigger click
    compareBtn.addEventListener('click', async () => {
        const textVal = jdText.value.trim();
        const hasFile = jdFile.files && jdFile.files.length > 0;

        if (!textVal && !hasFile) {
            alert("Please upload a PDF/DOCX file or paste the Job Description text to evaluate matching.");
            return;
        }

        // Configure loading state
        compareBtn.disabled = true;
        loadingEl.style.display = 'flex';
        errorEl.style.display = 'none';
        outputEl.style.display = 'none';

        try {
            let response;
            if (hasFile) {
                // Perform File matching
                const formData = new FormData();
                formData.append('file', jdFile.files[0]);
                
                response = await fetch(`${API_BASE_URL}/match-file`, {
                    method: 'POST',
                    body: formData
                });
            } else {
                // Perform Text matching
                response = await fetch(`${API_BASE_URL}/match`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ job_description: textVal })
                });
            }

            if (!response.ok) throw new Error("Connection failed or parse error.");
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Populate and render Results inside Left Sidebar
            renderResults(data);

        } catch (err) {
            console.error('Job Matching Alignment Error:', err);
            errorMsgEl.textContent = `Match Failed: ${err.message}. Ensure the FastAPI server is active.`;
            errorEl.style.display = 'flex';
        } finally {
            compareBtn.disabled = false;
            loadingEl.style.display = 'none';
        }
    });

    function renderResults(data) {
        const score = data.match_score || 0;

        // Score numerical update
        scoreNum.textContent = `${score}%`;

        // Circumference calculation for progress ring
        // Circle r=54. Circumference = 2 * PI * 54 = 339.29
        const circumference = 339.29;
        const offset = circumference - (score / 100) * circumference;
        scoreProgress.style.strokeDashoffset = offset;

        // Color ring color dynamically based on percentage
        if (score >= 80) {
            scoreProgress.style.stroke = "var(--success)";
        } else if (score >= 60) {
            scoreProgress.style.stroke = "var(--warning)";
        } else {
            scoreProgress.style.stroke = "var(--danger)";
        }

        // Set verdict text
        verdictText.textContent = data.verdict || "Candidate details analyzed successfully.";

        // Populate Strengths list
        strengthsList.innerHTML = '';
        if (data.strengths && data.strengths.length > 0) {
            data.strengths.forEach(str => {
                const li = document.createElement('li');
                li.textContent = str;
                strengthsList.appendChild(li);
            });
        } else {
            strengthsList.innerHTML = '<li>Candidate matches key competencies of the JD.</li>';
        }

        // Populate Gaps list
        gapsList.innerHTML = '';
        if (data.gaps && data.gaps.length > 0) {
            data.gaps.forEach(gap => {
                const li = document.createElement('li');
                li.textContent = gap;
                gapsList.appendChild(li);
            });
        } else {
            gapsList.innerHTML = '<li>No substantial limits found for this profile.</li>';
        }

        // Populate Matched Skills badges
        skillsMatchedBox.innerHTML = '';
        if (data.matched_skills && data.matched_skills.length > 0) {
            data.matched_skills.forEach(skill => {
                const span = document.createElement('span');
                span.classList.add('skill-badge');
                span.style.background = 'rgba(16, 185, 129, 0.06)';
                span.style.borderColor = 'rgba(16, 185, 129, 0.22)';
                span.style.color = '#a7f3d0';
                span.textContent = skill;
                skillsMatchedBox.appendChild(span);
            });
        } else {
            skillsMatchedBox.innerHTML = '<span class="text-muted text-xs">No matching tags extracted.</span>';
        }

        // Populate Missing Skills badges
        skillsMissingBox.innerHTML = '';
        if (data.missing_skills && data.missing_skills.length > 0) {
            data.missing_skills.forEach(skill => {
                const span = document.createElement('span');
                span.classList.add('skill-badge');
                span.style.background = 'rgba(239, 68, 68, 0.06)';
                span.style.borderColor = 'rgba(239, 68, 68, 0.22)';
                span.style.color = '#fca5a5';
                span.textContent = skill;
                skillsMissingBox.appendChild(span);
            });
        } else {
            skillsMissingBox.innerHTML = '<span class="text-muted text-xs">No critical missing tags.</span>';
        }

        // Make Output panel visible and scroll sidebar down
        outputEl.style.display = 'flex';
        
        // Smooth scroll sidebar content container to bottom to show results
        const scrollContainer = document.querySelector('.sidebar-scroll-content');
        if (scrollContainer) {
            scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    }
}

// 5. Light/Dark Theme Toggling
function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;

    // Check localStorage for saved preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
        document.body.classList.remove('light-theme');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    themeToggleBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        if (isLight) {
            localStorage.setItem('theme', 'light');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        } else {
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
    });
}
