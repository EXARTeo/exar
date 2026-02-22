/**
 * Portfolio Website - Main JavaScript
 * Exarchos Theodoros
 *
 * Features:
 * - Virtual Filesystem Terminal with persistence
 * - Photo Swipe Deck with peek effect
 * - Timeline Flicker Toggle
 * - GitHub API Integration
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================

    const CONFIG = {
        github: {
            username: 'EXARTeo',
            apiBase: 'https://api.github.com',
            featuredRepos: [
                { full_name: 'EXARTeo/Network_File_System-NFS', name: 'Network_File_System-NFS', description: 'C client/server file system over TCP sockets' },
                { full_name: 'EXARTeo/Neural-LSH', name: 'Neural-LSH', description: 'Python/PyTorch ANN index pipeline' }
            ]
        },
        photos: ['assets/me1.jpg', 'assets/me2.jpg', 'assets/me3.jpg'],
        storage: {
            terminalOpen: 'term_open',
            terminalPos: 'term_pos',
            terminalSize: 'term_size',
            terminalCwd: 'term_cwd',
            terminalHistory: 'term_history',
            terminalOutput: 'term_output',
            terminalMinimized: 'term_min',
            bannerShown: 'term_banner'
        },
        socials: {
            github: 'https://github.com/EXARTeo',
            linkedin: 'https://www.linkedin.com/in/θεόδωρος-έξαρχος-08a770391/',
            instagram: 'https://instagram.com/exartheo',
            email: 'exarchtheo@gmail.com'
        }
    };

    const BANNER = `<span class="ascii">███████╗██╗  ██╗ █████╗ ██████╗
██╔════╝╚██╗██╔╝██╔══██╗██╔══██╗
█████╗   ╚███╔╝ ███████║██████╔╝
██╔══╝   ██╔██╗ ██╔══██║██╔══██╗
███████╗██╔╝ ██╗██║  ██║██║  ██║
╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝</span>

<span class="info">Welcome to EXAR's Portfolio Terminal v1.0</span>
<span class="info">Type 'help' to see available commands.</span>
`;

    // ============================================
    // VIRTUAL FILESYSTEM
    // ============================================

    const FILESYSTEM = {
        '/': { type: 'dir', children: ['home', 'timeline', 'featured', 'highlights', 'skills', 'projects'] },
        '/home': { type: 'dir', children: ['cv', 'social'] , navigate: { page:'index.html', hash:'#hero' } },
        '/home/cv': { type: 'dir', children: ['Exarchos_Theodoros_CV.pdf'] , navigate: { page:'index.html', hash:'#hero' } },
        '/home/cv/Exarchos_Theodoros_CV.pdf': { type: 'file', action: 'download_cv' },
        '/home/social': { type: 'dir', children: ['social.txt'] , navigate: { page:'index.html', hash:'#hero' } },
        '/home/social/social.txt': { type: 'file', content: 'social' },
        '/timeline': { type: 'dir', children: ['work', 'education'] , navigate:{ page:'index.html', hash:'#timeline'} },
        '/timeline/work': { type: 'dir', children: [], navigate: { page: 'index.html', hash: '#timeline', tab: 'work' } },
        '/timeline/education': { type: 'dir', children: [], navigate: { page: 'index.html', hash: '#timeline', tab: 'education' } },
        '/featured': { type: 'dir', children: ['nfs', 'neural-lsh'] , navigate: { page: 'index.html', hash:'#featured' } },
        '/featured/nfs': { type: 'dir', children: [], navigate: { page: 'index.html', hash: '#project-nfs' } },
        '/featured/neural-lsh': { type: 'dir', children: [], navigate: { page: 'index.html', hash: '#project-neural-lsh' } },
        '/highlights': { type: 'dir', children: [], navigate: { page: 'index.html', hash: '#highlights' } },
        '/skills': { type: 'dir', children: [], navigate: { page: 'index.html', hash: '#skills' } },
        '/projects': { type: 'dir', children: [], navigate: { page: 'projects.html', hash: '' } }
    };

    // ============================================
    // UTILITIES
    // ============================================

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

    function debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'today';
        if (days === 1) return 'yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        if (days < 365) return `${Math.floor(days / 30)} months ago`;
        return `${Math.floor(days / 365)} years ago`;
    }

    function normalizePath(path, cwd) {
        if (!path) return '/';

        // Handle absolute path
        if (path.startsWith('/')) {
            path = path;
        } else {
            // Handle relative path
            path = cwd === '/' ? `/${path}` : `${cwd}/${path}`;
        }

        // Normalize: resolve . and ..
        const parts = path.split('/').filter(p => p && p !== '.');
        const result = [];

        for (const part of parts) {
            if (part === '..') {
                result.pop();
            } else {
                result.push(part);
            }
        }

        return '/' + result.join('/') || '/';
    }

    function getPromptPath(cwd) {
        if (cwd === '/') return '~';
        return '~' + cwd;
    }

    // ============================================
    // NAVIGATION
    // ============================================

    function initNavigation() {
        const toggle = $('.nav-toggle');
        const links = $('.nav-links');
        const navLinks = $$('.nav-link');

        if (toggle && links) {
            toggle.addEventListener('click', () => {
                const isOpen = toggle.getAttribute('aria-expanded') === 'true';
                toggle.setAttribute('aria-expanded', !isOpen);
                links.classList.toggle('open', !isOpen);
            });

            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    toggle.setAttribute('aria-expanded', 'false');
                    links.classList.remove('open');
                });
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.navbar')) {
                    toggle.setAttribute('aria-expanded', 'false');
                    links.classList.remove('open');
                }
            });
        }

        // Active section highlighting
        const isIndex = location.pathname.endsWith('index.html') || location.pathname === '/' || !location.pathname.includes('.html');
        if (isIndex) {
            const sections = $$('section[id]');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id;
                        navLinks.forEach(link => {
                            const href = link.getAttribute('href');
                            if (href === `#${id}` || href === `index.html#${id}`) {
                                link.classList.add('active');
                            } else if (!link.classList.contains('nav-link-page')) {
                                link.classList.remove('active');
                            }
                        });
                    }
                });
            }, { rootMargin: '-20% 0px -70% 0px' });

            sections.forEach(section => observer.observe(section));
        }
    }

    // ============================================
    // PHOTO DECK
    // ============================================

    function initPhotoDeck() {
        const deck = $('#photoDeck');
        const resetBtn = $('#photoReset');
        if (!deck) return;

        let cards = [];
        let currentIndex = 0;

        function createCards() {
            deck.innerHTML = '';
            cards = [];
            currentIndex = 0;
            if (resetBtn) resetBtn.hidden = true;

            CONFIG.photos.forEach((src, i) => {
                const card = document.createElement('div');
                card.className = 'photo-card';
                card.innerHTML = `<img src="${src}" alt="Photo ${i + 1}" onerror="this.parentElement.innerHTML='<div class=\\'photo-placeholder\\'>XR</div>'">`;
                deck.appendChild(card);
                cards.push(card);
            });

            updateStackStyles();
            initDragHandlers();
        }

        function updateStackStyles() {
            cards.forEach((card, i) => {
                const offset = i - currentIndex;
                if (offset < 0) {
                    card.style.display = 'none';
                } else {
                    card.style.display = '';
                    card.style.zIndex = cards.length - offset;

                    // Peek + tilt effect: alternate left/right with small rotation for a more natural stack
                    const PEEK_BASE = 22;   // peek of the 2nd card(px)
                    const PEEK_STEP = 6;    // the decrease of the peekness by step
                    const ROT_BASE  = 6;    // tilt of the 2nd card
                    const ROT_STEP  = 1.5;  // the decrease of the titlness by step

                    if (offset === 0) {
                        card.style.transform = 'translate(-50%, -50%)';
                        card.style.opacity = '1';
                    } else {
                        const dir = (offset % 2 === 1) ? -1 : 1;

                        const peek  = Math.max(0, PEEK_BASE - (offset - 1) * PEEK_STEP);
                        const rot   = Math.max(0, ROT_BASE  - (offset - 1) * ROT_STEP);
                        const scale = Math.max(0.78, 1 - offset * 0.05);

                        card.style.transform =
                            `translate(-50%, -50%) translateX(${dir * peek}px) rotate(${dir * rot}deg) scale(${scale})`;

                        card.style.opacity = `${Math.max(0.2, 1 - offset * 0.2)}`;
                    }

                }
            });
        }

        function dismissCard(direction) {
            const card = cards[currentIndex];
            if (!card) return;

            card.classList.add('dismissed');
            card.style.transform = `translate(-50%, -50%) translateX(${direction * 250}px) rotate(${direction * 15}deg)`;
            card.style.opacity = '0';

            currentIndex++;

            let cleaned = false;
            const cleanup = () => {
                if (cleaned) return;
                cleaned = true;
                card.style.display = 'none'; // pull out of layout immediately so it can't contribute to overflow
                updateStackStyles();
                if (currentIndex >= cards.length && resetBtn) {
                    resetBtn.hidden = false;
                }
            };

            card.addEventListener('transitionend', cleanup, { once: true });
            setTimeout(cleanup, 350); // fallback for reduced-motion or interrupted transitions
        }

        function initDragHandlers() {
            cards.forEach((card, idx) => {
                let startX = 0;
                let currentX = 0;
                let isDragging = false;

                const onStart = (e) => {
                    if (idx !== currentIndex) return;
                    isDragging = true;
                    card.classList.add('dragging');
                    const touch = e.touches ? e.touches[0] : e;
                    startX = touch.clientX;
                    currentX = 0;
                };

                const onMove = (e) => {
                    if (!isDragging || idx !== currentIndex) return;
                    e.preventDefault();
                    const touch = e.touches ? e.touches[0] : e;
                    currentX = touch.clientX - startX;
                    const rotation = currentX * 0.08;
                    card.style.transform = `translate(-50%, -50%) translateX(${currentX}px) rotate(${rotation}deg)`;
                };

                const onEnd = () => {
                    if (!isDragging || idx !== currentIndex) return;
                    isDragging = false;
                    card.classList.remove('dragging');

                    if (Math.abs(currentX) > 80) {
                        dismissCard(currentX > 0 ? 1 : -1);
                    } else {
                        updateStackStyles();
                    }
                };

                card.addEventListener('mousedown', onStart);
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onEnd);
                card.addEventListener('touchstart', onStart, { passive: true });
                card.addEventListener('touchmove', onMove, { passive: false });
                card.addEventListener('touchend', onEnd);
            });
        }

        resetBtn?.addEventListener('click', createCards);
        createCards();
    }

    // ============================================
    // TIMELINE TOGGLE
    // ============================================

    function initTimeline() {
        const toggleBtns = $$('.toggle-btn');
        const views = $$('.timeline-view');

        if (!toggleBtns.length) return;

        function switchView(view) {
            toggleBtns.forEach(b => {
                b.classList.toggle('active', b.dataset.view === view);
                b.setAttribute('aria-selected', b.dataset.view === view);
            });

            views.forEach(v => {
                v.classList.remove('active');
                if (v.dataset.timeline === view) {
                    void v.offsetWidth; // Trigger reflow
                    v.classList.add('active');
                }
            });
        }

        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.dataset.view));
        });

        // Expose for terminal navigation
        window.switchTimelineView = switchView;
    }

    // ============================================
    // GITHUB API
    // ============================================

    async function fetchGitHubData(endpoint) {
        try {
            const res = await fetch(`${CONFIG.github.apiBase}${endpoint}`, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
            return await res.json();
        } catch (err) {
            console.warn('GitHub API fetch failed:', err);
            return null;
        }
    }

    async function enhanceProjectCards() {
        const cards = $$('.project-card[data-repo]');
        for (const card of cards) {
            const repo = card.dataset.repo;
            const data = await fetchGitHubData(`/repos/${repo}`);
            if (data) {
                const starsEl = card.querySelector('[data-stat="stars"] .stat-value');
                const forksEl = card.querySelector('[data-stat="forks"] .stat-value');
                if (starsEl) starsEl.textContent = data.stargazers_count || 0;
                if (forksEl) forksEl.textContent = data.forks_count || 0;
            }
        }
    }

    // ============================================
    // REPOSITORIES PAGE
    // ============================================

    async function initReposPage() {
        const grid = $('#reposGrid');
        const searchInput = $('#reposSearch');
        const showForksCheckbox = $('#showForks');
        const sortSelect = $('#sortSelect');
        const statsEl = $('#repoCount');
        const errorEl = $('#reposError');
        const emptyEl = $('#reposEmpty');

        if (!grid) return;

        let allRepos = [];

        function getLanguageColor(lang) {
            const colors = {
                'C': '#555555', 'C++': '#f34b7d', 'Python': '#3572A5',
                'JavaScript': '#f1e05a', 'TypeScript': '#2b7489',
                'HTML': '#e34c26', 'CSS': '#563d7c', 'Java': '#b07219',
                'Shell': '#89e051', 'MATLAB': '#e16737'
            };
            return colors[lang] || '#6a6a6a';
        }

        function renderRepos(repos) {
            grid.innerHTML = '';
            if (repos.length === 0) {
                emptyEl.hidden = false;
                return;
            }
            emptyEl.hidden = true;

            repos.forEach(repo => {
                const card = document.createElement('article');
                card.className = 'repo-card';
                card.innerHTML = `
                    <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">
                        <h3 class="repo-name">${repo.name}${repo.fork ? '<span class="repo-fork-badge">Fork</span>' : ''}</h3>
                        <p class="repo-desc">${repo.description || 'No description.'}</p>
                        <div class="repo-meta">
                            ${repo.language ? `<span class="repo-lang"><span class="lang-dot" style="background:${getLanguageColor(repo.language)}"></span>${repo.language}</span>` : ''}
                            <span class="repo-stat"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/></svg>${repo.stargazers_count}</span>
                            <span class="repo-stat"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><path d="M12 12v3"/></svg>${repo.forks_count}</span>
                            <span class="repo-stat">Updated ${formatDate(repo.updated_at)}</span>
                        </div>
                    </a>
                `;
                grid.appendChild(card);
            });
        }

        function filterAndSort() {
            const search = searchInput.value.toLowerCase().trim();
            const showForks = showForksCheckbox.checked;
            const sortBy = sortSelect.value;

            let filtered = allRepos.filter(repo => {
                if (!showForks && repo.fork) return false;
                if (search) {
                    const str = `${repo.name} ${repo.description || ''} ${repo.language || ''}`.toLowerCase();
                    if (!str.includes(search)) return false;
                }
                return true;
            });

            filtered.sort((a, b) => {
                switch (sortBy) {
                    case 'stars': return b.stargazers_count - a.stargazers_count;
                    case 'name': return a.name.localeCompare(b.name);
                    case 'created': return new Date(b.created_at) - new Date(a.created_at);
                    default: return new Date(b.updated_at) - new Date(a.updated_at);
                }
            });

            statsEl.textContent = `${filtered.length} repositories`;
            renderRepos(filtered);
        }

        function showFallback() {
            errorEl.hidden = false;
            grid.style.display = 'none';
            const fallback = $('#fallbackProjects');
            if (fallback) {
                fallback.innerHTML = CONFIG.github.featuredRepos.map(r => `
                    <a href="https://github.com/${r.full_name}" target="_blank" class="repo-card">
                        <h3 class="repo-name">${r.name}</h3>
                        <p class="repo-desc">${r.description}</p>
                    </a>
                `).join('');
            }
        }

        const data = await fetchGitHubData(`/users/${CONFIG.github.username}/repos?per_page=100&sort=updated`);
        if (data && Array.isArray(data)) {
            allRepos = data;
            filterAndSort();
        } else {
            showFallback();
        }

        searchInput?.addEventListener('input', debounce(filterAndSort, 200));
        showForksCheckbox?.addEventListener('change', filterAndSort);
        sortSelect?.addEventListener('change', filterAndSort);
    }

    // ============================================
    // TERMINAL WIDGET
    // ============================================

    function initTerminal() {
        const launcher = $('#terminalLauncher');
        const terminal = $('#terminalWindow');
        const header = $('#terminalHeader');
        const closeBtn = $('#terminalClose');
        const minimizeBtn = $('#terminalMinimize');
        const hideBtn = $('#terminalHide');
        const exitBtn = $('#terminalExit');
        const output = $('#terminalOutput');
        const input = $('#terminalInput');
        const promptEl = $('#terminalPrompt');
        const titleEl = $('#terminalTitle');

        if (!terminal || !input) return;

        // State
        let commandHistory = [];
        let historyIndex = -1;
        let isDragging = false;
        let isResizing = false;
        let dragOffset = { x: 0, y: 0 };
        let resizeStart = { x: 0, y: 0, w: 0, h: 0 };
        let cwd = '/';

        // Size constraints
        const MIN_WIDTH = 320;
        const MIN_HEIGHT = 220;

        // CSS default size (must match styles.css .terminal-window)
        const DEFAULT_WIDTH = 480;
        const DEFAULT_HEIGHT = 320;

        // Create resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'terminal-resize-handle';
        resizeHandle.setAttribute('aria-label', 'Resize terminal');
        terminal.appendChild(resizeHandle);

        // Generate directory tree for help
        function generateTree() {
            // Build a hierarchical tree from FILESYSTEM paths
            const root = { name: '/', path: '/', type: 'dir', children: new Map() };

            for (const [path, meta] of Object.entries(FILESYSTEM)) {
                if (path === '/') continue;

                const parts = path.split('/').filter(Boolean);
                let node = root;

                for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const childPath = '/' + parts.slice(0, i + 1).join('/');

                if (!node.children.has(part)) {
                    // Prefer explicit type from FILESYSTEM, fallback to dir when missing
                    const childMeta = FILESYSTEM[childPath];
                    const type = childMeta?.type ?? (i < parts.length - 1 ? 'dir' : meta.type);

                    node.children.set(part, {
                    name: part,
                    path: childPath,
                    type,
                    children: new Map()
                    });
                }

                node = node.children.get(part);
                }
            }

            // Sort: dirs first, then files; both alphabetically
            const sortChildren = (node) =>
                Array.from(node.children.values()).sort((a, b) => {
                if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
                return a.name.localeCompare(b.name);
                });

            const lines = ['/'];

            function walk(node, prefix) {
                const children = sortChildren(node);

                children.forEach((child, idx) => {
                const isLast = idx === children.length - 1;
                const branch = isLast ? '└── ' : '├── ';

                lines.push(prefix + branch + child.name + (child.type === 'dir' ? '/' : ''));

                const nextPrefix = prefix + (isLast ? '    ' : '│   ');
                if (child.type === 'dir') walk(child, nextPrefix);
                });
            }

            walk(root, '');
            return lines.join('\n');
            }


        // Commands
        const commands = {
            help: () => {
                return `
<span class="info">Directory Structure:</span>
<pre class="tree">${generateTree()}</pre>

<span class="info">Available commands:</span>
<pre class="tree">  help              Show this help message
  ls [path]         List directory contents
  cd &lt;path&gt;         Change directory / navigate
  cat &lt;file&gt;        Display file contents
  pwd               Print working directory
  whoami            Display identity info
  social            Show social links
  skills            Display skills summary
  date              Print current date/time
  wget cv           Download CV
  open &lt;target&gt;     Open github|linkedin|instagram|email
  banner            Show ASCII banner
  clear             Clear terminal output
  exit              Close terminal</pre>
`;
            },

            ls: (args) => {
                const targetPath = args[0] ? normalizePath(args[0], cwd) : cwd;
                const node = FILESYSTEM[targetPath];

                if (!node) {
                    return `<span class="error">ls: cannot access '${args[0] || targetPath}': No such file or directory</span>`;
                }

                if (node.type === 'file') {
                    return targetPath.split('/').pop();
                }

                if (!node.children || node.children.length === 0) {
                    return '<span class="info">(empty directory)</span>';
                }

                return node.children.map(child => {
                    const childPath = targetPath === '/' ? `/${child}` : `${targetPath}/${child}`;
                    const childNode = FILESYSTEM[childPath];
                    if (childNode?.type === 'dir') {
                        return `<span class="cmd">${child}/</span>`;
                    }
                    return child;
                }).join('  ');
            },

            cd: (args) => {
                const target = args[0];

                if (!target || target === '~') {
                    cwd = '/';
                    updatePrompt();
                    return '';
                }

                const newPath = normalizePath(target, cwd);
                const node = FILESYSTEM[newPath];

                if (!node) {
                    return `<span class="error">cd: ${target}: No such directory</span>`;
                }

                if (node.type === 'file') {
                    return `<span class="error">cd: ${target}: Not a directory</span>`;
                }

                cwd = newPath;
                updatePrompt();
                saveCwd();

                // Handle navigation
                if (node.navigate) {
                    const { page, hash, tab } = node.navigate;
                    const currentPage = location.pathname.split('/').pop() || 'index.html';

                    if (currentPage !== page) {
                        // Navigate to different page
                        setTimeout(() => {
                            window.location.href = page + hash;
                        }, 150);
                        return `<span class="info">Navigating to ${page}${hash}...</span>`;
                    } else {
                        // Same page navigation
                        if (tab && window.switchTimelineView) {
                            window.switchTimelineView(tab);
                        }
                        if (hash) {
                            const el = $(hash);
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }
                        return `<span class="info">Navigated to ${newPath}</span>`;
                    }
                }

                return '';
            },

            cat: (args) => {
                if (!args[0]) {
                    return '<span class="error">cat: missing file operand</span>';
                }

                const targetPath = normalizePath(args[0], cwd);
                const node = FILESYSTEM[targetPath];

                if (!node) {
                    return `<span class="error">cat: ${args[0]}: No such file</span>`;
                }

                if (node.type === 'dir') {
                    return `<span class="error">cat: ${args[0]}: Is a directory</span>`;
                }

                if (node.action === 'download_cv') {
                    return commands.wget(['cv']);
                }

                if (node.content === 'social') {
                    return commands.social();
                }

                return '<span class="info">(empty file)</span>';
            },

            pwd: () => cwd,

            whoami: () => {
                return `<span class="cmd">Exarchos Theodoros</span>
21 · Athens, Greece
Full-Stack Developer & Informatics Student
"build with frape and code"`;
            },

            social: () => {
                return `<span class="info">Social Links:</span>

GitHub:    <span class="link" data-url="${CONFIG.socials.github}">github.com/EXARTeo</span>
LinkedIn:  <span class="link" data-url="${CONFIG.socials.linkedin}">linkedin.com/in/θεόδωρος-έξαρχος-08a770391</span>
Instagram: <span class="link" data-url="https://${CONFIG.socials.instagram.replace('https://', '')}">@exartheo</span>
Email:     <span class="link" data-url="mailto:${CONFIG.socials.email}">${CONFIG.socials.email}</span>`;
            },

            skills: () => {
                return `<span class="info">Skills Summary:</span>

<span class="cmd">Languages:</span>    C, C++, Python, Assembly
<span class="cmd">Systems:</span>      Linux (POSIX), Process/Thread Mgmt
<span class="cmd">Web:</span>          HTML, CSS, JavaScript, Django
<span class="cmd">Data/Tools:</span>   MySQL, MATLAB, Git, LaTeX
<span class="cmd">Spoken:</span>       Greek (native), English (fluent)`;
            },

            date: () => {
                return new Date().toLocaleString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long',
                    day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                });
            },

            wget: (args) => {
                if (args[0]?.toLowerCase() === 'cv') {
                    const link = document.createElement('a');
                    link.href = 'assets/Exarchos_Theodoros_CV.pdf';
                    link.download = 'Exarchos_Theodoros_CV.pdf';
                    link.click();
                    return '<span class="info">Downloading CV...</span>';
                }
                return '<span class="error">Usage: wget cv</span>';
            },

            open: (args) => {
                const target = args[0]?.toLowerCase();
                const urls = {
                    github: CONFIG.socials.github,
                    linkedin: CONFIG.socials.linkedin,
                    instagram: `https://${CONFIG.socials.instagram.replace('https://', '')}`,
                    email: `mailto:${CONFIG.socials.email}`
                };

                if (urls[target]) {
                    window.open(urls[target], '_blank');
                    return `<span class="info">Opening ${target}...</span>`;
                }
                return '<span class="error">Usage: open github|linkedin|instagram|email</span>';
            },

            banner: () => BANNER,

            clear: () => {
                output.innerHTML = '';
                saveOutput();
                return null;
            },

            exit: () => {
                exitTerminal();
                return null;
            },

            // Easter eggs
            sudo: () => '<span class="error">Nice try, but you\'re not root here.</span>',
            rm: () => '<span class="error">I don\'t think so...</span>',
            hack: () => '<span class="error">Access denied. Try "help" instead.</span>',
            hello: () => 'Hello! Type "help" to see available commands.',
            hi: () => 'Hey there! Type "help" to get started.'
        };

        function updatePrompt() {
            const promptPath = getPromptPath(cwd);
            promptEl.textContent = `exar@portfolio:${promptPath}$`;
            titleEl.textContent = `exar@portfolio:${promptPath}`;
        }

        function executeCommand(cmd) {
            const trimmed = cmd.trim();
            if (!trimmed) return '';

            const parts = trimmed.split(/\s+/);
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);

            if (trimmed && (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== trimmed)) {
                commandHistory.push(trimmed);
            }
            historyIndex = commandHistory.length;

            if (commands[command]) {
                return commands[command](args);
            }

            return `<span class="error">Command not found: ${command}. Type "help" for available commands.</span>`;
        }

        function print(text, isCommand = false) {
            if (text === null) return;

            const line = document.createElement('div');
            if (isCommand) {
                const promptPath = getPromptPath(cwd);
                line.innerHTML = `<span class="cmd">exar@portfolio:${promptPath}$</span> ${escapeHtml(text)}`;
            } else {
                line.innerHTML = text;
            }
            output.appendChild(line);
            output.scrollTop = output.scrollHeight;
            saveOutput();
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function openTerminal() {
            terminal.classList.add('open');
            terminal.setAttribute('aria-hidden', 'false');
            launcher.classList.add('hidden');
            input.focus();
            localStorage.setItem(CONFIG.storage.terminalOpen, 'true');

            // Show banner on first open
            if (!localStorage.getItem(CONFIG.storage.bannerShown)) {
                print(BANNER);
                localStorage.setItem(CONFIG.storage.bannerShown, 'true');
            }
        }

        function closeTerminal() {
            terminal.classList.remove('open');
            terminal.setAttribute('aria-hidden', 'true');
            launcher.classList.remove('hidden');
            localStorage.setItem(CONFIG.storage.terminalOpen, 'false');
        }

        function resetTerminalSize() {
            // Reset to CSS default size
            terminal.style.width = `${DEFAULT_WIDTH}px`;
            terminal.style.height = `${DEFAULT_HEIGHT}px`;
            // Remove persisted size so next open starts at default
            localStorage.removeItem(CONFIG.storage.terminalSize);
        }

        function exitTerminal() {
            // Clear terminal DOM output
            output.innerHTML = '';

            // Reset in-memory state
            commandHistory = [];
            historyIndex = -1;
            cwd = '/';
            updatePrompt();

            // Reset minimized state visually
            terminal.classList.remove('minimized');

            // Reset size to default
            resetTerminalSize();

            // Clear localStorage keys (keep position)
            localStorage.removeItem(CONFIG.storage.terminalOutput);
            localStorage.removeItem(CONFIG.storage.terminalHistory);
            localStorage.removeItem(CONFIG.storage.terminalCwd);
            localStorage.removeItem(CONFIG.storage.bannerShown);
            localStorage.removeItem(CONFIG.storage.terminalMinimized);

            // Close the terminal
            closeTerminal();
        }

        function toggleMinimize() {
            const isMinimized = terminal.classList.toggle('minimized');
            localStorage.setItem(CONFIG.storage.terminalMinimized, isMinimized);
        }

        // Drag functionality
        function startDrag(e) {
            if (e.target.closest('.terminal-btn')) return;
            isDragging = true;
            const rect = terminal.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            dragOffset.x = clientX - rect.left;
            dragOffset.y = clientY - rect.top;
            terminal.style.transition = 'none';
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            let x = clientX - dragOffset.x;
            let y = clientY - dragOffset.y;
            const maxX = window.innerWidth - terminal.offsetWidth;
            const maxY = window.innerHeight - terminal.offsetHeight;
            x = Math.max(0, Math.min(x, maxX));
            y = Math.max(0, Math.min(y, maxY));
            terminal.style.left = `${x}px`;
            terminal.style.top = `${y}px`;
            terminal.style.right = 'auto';
            terminal.style.bottom = 'auto';
        }

        function endDrag() {
            if (!isDragging) return;
            isDragging = false;
            terminal.style.transition = '';
            savePosition();
        }

        // Resize functionality
        function startResize(e) {
            if (terminal.classList.contains('minimized')) return;
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            resizeStart.x = clientX;
            resizeStart.y = clientY;
            resizeStart.w = terminal.offsetWidth;
            resizeStart.h = terminal.offsetHeight;
            terminal.style.transition = 'none';
        }

        function resize(e) {
            if (!isResizing) return;
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            let newWidth = resizeStart.w + (clientX - resizeStart.x);
            let newHeight = resizeStart.h + (clientY - resizeStart.y);

            // Clamp to min size
            newWidth = Math.max(MIN_WIDTH, newWidth);
            newHeight = Math.max(MIN_HEIGHT, newHeight);

            // Clamp to viewport (respect existing max constraints)
            const rect = terminal.getBoundingClientRect();
            const maxWidth = window.innerWidth - rect.left - 16;
            const maxHeight = window.innerHeight - rect.top - 16;
            newWidth = Math.min(newWidth, maxWidth);
            newHeight = Math.min(newHeight, maxHeight);

            terminal.style.width = `${newWidth}px`;
            terminal.style.height = `${newHeight}px`;
        }

        function endResize() {
            if (!isResizing) return;
            isResizing = false;
            terminal.style.transition = '';
            saveSize();
            ensureInViewport();
        }

        function ensureInViewport() {
            const rect = terminal.getBoundingClientRect();
            let x = rect.left;
            let y = rect.top;
            const maxX = window.innerWidth - terminal.offsetWidth;
            const maxY = window.innerHeight - terminal.offsetHeight;

            if (x > maxX || y > maxY || x < 0 || y < 0) {
                x = Math.max(0, Math.min(x, maxX));
                y = Math.max(0, Math.min(y, maxY));
                terminal.style.left = `${x}px`;
                terminal.style.top = `${y}px`;
                terminal.style.right = 'auto';
                terminal.style.bottom = 'auto';
                savePosition();
            }
        }

        // Persistence
        function saveOutput() {
            localStorage.setItem(CONFIG.storage.terminalOutput, output.innerHTML);
            localStorage.setItem(CONFIG.storage.terminalHistory, JSON.stringify(commandHistory));
        }

        function saveCwd() {
            localStorage.setItem(CONFIG.storage.terminalCwd, cwd);
        }

        function savePosition() {
            const rect = terminal.getBoundingClientRect();
            localStorage.setItem(CONFIG.storage.terminalPos, JSON.stringify({ left: rect.left, top: rect.top }));
        }

        function saveSize() {
            localStorage.setItem(CONFIG.storage.terminalSize, JSON.stringify({
                width: terminal.offsetWidth,
                height: terminal.offsetHeight
            }));
        }

        function loadState() {
            // Load cwd
            const savedCwd = localStorage.getItem(CONFIG.storage.terminalCwd);
            if (savedCwd && FILESYSTEM[savedCwd]) {
                cwd = savedCwd;
            }
            updatePrompt();

            // Load history
            try {
                const savedHistory = localStorage.getItem(CONFIG.storage.terminalHistory);
                if (savedHistory) {
                    commandHistory = JSON.parse(savedHistory);
                    historyIndex = commandHistory.length;
                }
            } catch (e) {}

            // Load output
            const savedOutput = localStorage.getItem(CONFIG.storage.terminalOutput);
            if (savedOutput) {
                output.innerHTML = savedOutput;
            }

            // Load size
            try {
                const savedSize = localStorage.getItem(CONFIG.storage.terminalSize);
                if (savedSize) {
                    const size = JSON.parse(savedSize);
                    // Clamp to current viewport
                    const maxWidth = window.innerWidth - 32;
                    const maxHeight = window.innerHeight - 100;
                    const width = Math.min(Math.max(MIN_WIDTH, size.width), maxWidth);
                    const height = Math.min(Math.max(MIN_HEIGHT, size.height), maxHeight);
                    terminal.style.width = `${width}px`;
                    terminal.style.height = `${height}px`;
                }
            } catch (e) {}

            // Load position
            try {
                const savedPos = localStorage.getItem(CONFIG.storage.terminalPos);
                if (savedPos) {
                    const pos = JSON.parse(savedPos);
                    // Clamp position to ensure terminal stays in viewport
                    const maxX = window.innerWidth - terminal.offsetWidth;
                    const maxY = window.innerHeight - terminal.offsetHeight;
                    const x = Math.max(0, Math.min(pos.left, maxX));
                    const y = Math.max(0, Math.min(pos.top, maxY));
                    terminal.style.left = `${x}px`;
                    terminal.style.top = `${y}px`;
                    terminal.style.right = 'auto';
                    terminal.style.bottom = 'auto';
                } else {
                    terminal.style.left = '20px';
                    terminal.style.bottom = '80px';
                }
            } catch (e) {
                terminal.style.left = '20px';
                terminal.style.bottom = '80px';
            }

            // Check if should be open
            if (localStorage.getItem(CONFIG.storage.terminalOpen) === 'true') {
                openTerminal();
            }

            // Check if minimized
            if (localStorage.getItem(CONFIG.storage.terminalMinimized) === 'true') {
                terminal.classList.add('minimized');
            }
        }

        // Event listeners
        launcher?.addEventListener('click', openTerminal);
        $('#heroTerminalBtn')?.addEventListener('click', openTerminal);
        closeBtn?.addEventListener('click', exitTerminal);  // (X || red) button == full reset
        minimizeBtn?.addEventListener('click', toggleMinimize);
        hideBtn?.addEventListener('click', closeTerminal);  // Hide == close only, no reset
        exitBtn?.addEventListener('click', exitTerminal);

        header?.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
        header?.addEventListener('touchstart', startDrag, { passive: true });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', endDrag);

        resizeHandle.addEventListener('mousedown', startResize);
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', endResize);
        resizeHandle.addEventListener('touchstart', startResize, { passive: false });
        document.addEventListener('touchmove', resize, { passive: false });
        document.addEventListener('touchend', endResize);

        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = input.value;
                print(cmd, true);
                const result = executeCommand(cmd);
                if (result !== null) print(result);
                input.value = '';
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (historyIndex > 0) {
                    historyIndex--;
                    input.value = commandHistory[historyIndex] || '';
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    input.value = commandHistory[historyIndex] || '';
                } else {
                    historyIndex = commandHistory.length;
                    input.value = '';
                }
            } else if (e.key === 'Escape') {
                closeTerminal();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                // Simple tab completion
                const partial = input.value.trim();
                if (partial.startsWith('cd ')) {
                    const dirPart = partial.slice(3);
                    const parentPath = normalizePath(dirPart.includes('/') ? dirPart.substring(0, dirPart.lastIndexOf('/')) || '/' : cwd, cwd);
                    const searchPart = dirPart.includes('/') ? dirPart.substring(dirPart.lastIndexOf('/') + 1) : dirPart;
                    const parent = FILESYSTEM[parentPath];
                    if (parent?.children) {
                        const match = parent.children.find(c => c.toLowerCase().startsWith(searchPart.toLowerCase()));
                        if (match) {
                            const newPath = dirPart.includes('/') ? dirPart.substring(0, dirPart.lastIndexOf('/') + 1) + match : match;
                            input.value = `cd ${newPath}`;
                        }
                    }
                }
            }
        });

        output?.addEventListener('click', (e) => {
            if (e.target.classList.contains('link')) {
                const url = e.target.dataset.url;
                if (url) window.open(url, '_blank');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === '`' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (terminal.classList.contains('open')) {
                    closeTerminal();
                } else {
                    openTerminal();
                }
            }
        });

        // Handle window resize
        window.addEventListener('resize', debounce(() => {
            if (terminal.classList.contains('open') && !terminal.classList.contains('minimized')) {
                ensureInViewport();
            }
        }, 100));

        loadState();
        output.scrollTop = output.scrollHeight;
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        initNavigation();
        initPhotoDeck();
        initTimeline();
        initTerminal();

        if ($('.project-card[data-repo]')) {
            enhanceProjectCards();
        }

        if ($('#reposGrid')) {
            initReposPage();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
