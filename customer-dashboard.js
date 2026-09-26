const PROFILE_KEY = 'worknearUser';
const SESSION_KEY = 'worknearSession';

const MOCK_WORKERS = [
    { id: 'rajesh-kumar', name: 'Rajesh Kumar', category: 'Plumber', rating: '4.9', jobs: 128, experience: '8 years', distance: '1.2 km', location: 'Ajmer', bio: 'Residential plumbing repairs, fittings and leak detection.' },
    { id: 'neha-sharma', name: 'Neha Sharma', category: 'Electrician', rating: '4.8', jobs: 86, experience: '6 years', distance: '2.1 km', location: 'Ajmer', bio: 'Home wiring, lighting, fans and switchboard repairs.' },
    { id: 'imran-khan', name: 'Imran Khan', category: 'Carpenter', rating: '4.9', jobs: 74, experience: '7 years', distance: '2.8 km', location: 'Ajmer', bio: 'Furniture assembly, custom shelves and door repairs.' },
    { id: 'priya-verma', name: 'Priya Verma', category: 'Painter', rating: '4.7', jobs: 52, experience: '4 years', distance: '3.4 km', location: 'Ajmer', bio: 'Interior painting and careful wall preparation.' },
    { id: 'suresh-yadav', name: 'Suresh Yadav', category: 'Cleaner', rating: '4.9', jobs: 203, experience: '9 years', distance: '1.6 km', location: 'Ajmer', bio: 'Deep cleaning and regular home cleaning services.' },
    { id: 'vikram-singh', name: 'Vikram Singh', category: 'AC Repair', rating: '4.8', jobs: 61, experience: '5 years', distance: '2.5 km', location: 'Ajmer', bio: 'Air conditioner servicing, diagnosis and maintenance.' }
];

function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function readProfile() {
    try {
        const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
        return profile?.role === 'customer' ? profile : null;
    } catch {
        return null;
    }
}

function initials(name) {
    return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function renderProfile(profile) {
    const name = profile?.name?.trim() || '';
    const location = profile?.location?.trim() || 'Ajmer';
    document.querySelector('#customer-name').textContent = name || 'there';
    document.querySelector('#customer-location').textContent = location;
    document.querySelector('#worker-location-note').textContent = `Based near ${location}`;
    document.querySelector('#profile-name').textContent = name || 'WorkNear Customer';
    document.querySelector('#profile-email').textContent = profile?.email || 'Local jobs, made simpler.';
    document.querySelector('#profile-avatar').textContent = name ? initials(name) : 'WN';
}

function renderActiveJobs(jobs) {
    const list = document.querySelector('#active-job-list');
    const emptyState = document.querySelector('#active-jobs-empty');
    list.replaceChildren(...jobs.map((job) => {
        const card = makeElement('article', 'card active-job-card');
        const top = makeElement('div', 'active-job-top');
        const icon = makeElement('span', 'active-job-icon', job.category === 'Plumber' ? '🔧' : job.category === 'Electrician' ? '⚡' : '🎨');
        icon.setAttribute('aria-hidden', 'true');
        const badge = makeElement('span', `badge ${Number(job.offerCount) > 0 ? 'badge-accent' : 'badge-neutral'}`, job.status || 'Waiting for Offers');
        top.append(icon, badge);
        card.append(top, makeElement('p', 'job-category-label', job.category || 'Local service'), makeElement('h3', '', job.title));
        card.append(makeElement('p', 'active-job-location', `📍 ${job.location || 'Ajmer'}`));
        const footer = makeElement('div', 'active-job-footer');
        footer.append(makeElement('strong', 'active-job-budget', WorkNearJobs.formatBudget(job)));
        const details = makeElement('a', 'button button-secondary job-details-button', 'View Details');
        details.href = `job-details.html?id=${encodeURIComponent(job.id)}&from=customer`;
        footer.append(details);
        card.append(footer);
        return card;
    }));
    const pendingOffers = jobs.reduce((total, job) => total + Math.max(0, Number(job.offerCount) || 0), 0);
    document.querySelector('#active-job-stat').textContent = String(jobs.length);
    document.querySelector('#pending-offer-stat').textContent = String(pendingOffers);
    list.hidden = jobs.length === 0;
    emptyState.hidden = jobs.length !== 0;
}

function renderWorkers() {
    const list = document.querySelector('#worker-list');
    list.replaceChildren(...MOCK_WORKERS.map((worker) => {
        const card = makeElement('article', 'card worker-card');
        const top = makeElement('div', 'worker-card-top');
        const avatar = makeElement('span', 'worker-avatar', initials(worker.name));
        avatar.setAttribute('aria-hidden', 'true');
        top.append(avatar, makeElement('span', 'worker-rating', `★ ${worker.rating}`));
        card.append(top, makeElement('p', 'worker-category', worker.category), makeElement('h3', '', worker.name));
        card.append(makeElement('p', 'worker-metrics', `${worker.jobs} jobs completed · ${worker.experience}`));
        card.append(makeElement('p', 'worker-location', `📍 ${worker.location} · ${worker.distance} away`));
        const actions = makeElement('div', 'worker-actions');
        const profileButton = makeElement('button', 'button button-secondary', 'View Profile');
        profileButton.type = 'button';
        profileButton.dataset.workerId = worker.id;
        const contactButton = makeElement('button', 'button button-primary', 'Hire / Contact');
        contactButton.type = 'button';
        contactButton.dataset.contactWorker = worker.id;
        actions.append(profileButton, contactButton);
        card.append(actions);
        return card;
    }));
}

function setupDialogs(jobs) {
    const jobDialog = document.querySelector('#job-dialog');
    const workerDialog = document.querySelector('#worker-dialog');
    const toast = document.querySelector('#dashboard-toast');

    document.querySelector('#active-job-list').addEventListener('click', (event) => {
        const button = event.target.closest('[data-job-id]');
        const job = jobs.find((item) => item.id === button?.dataset.jobId);
        if (!job) return;
        document.querySelector('#job-dialog-category').textContent = job.category || 'JOB DETAILS';
        document.querySelector('#job-dialog-title').textContent = job.title;
        document.querySelector('#job-dialog-description').textContent = job.description || 'This is a sample job request.';
        document.querySelector('#job-dialog-location').textContent = `📍 ${job.location || 'Ajmer'}`;
        document.querySelector('#job-dialog-budget').textContent = WorkNearJobs.formatBudget(job);
        jobDialog.showModal();
    });

    document.querySelector('#worker-list').addEventListener('click', (event) => {
        const profileButton = event.target.closest('[data-worker-id]');
        const contactButton = event.target.closest('[data-contact-worker]');
        const worker = MOCK_WORKERS.find((item) => item.id === (profileButton?.dataset.workerId || contactButton?.dataset.contactWorker));
        if (!worker) return;
        if (contactButton) {
            toast.textContent = `Contacting ${worker.name} will be available in a later step.`;
            toast.hidden = false;
            window.setTimeout(() => { toast.hidden = true; }, 3500);
            return;
        }
        document.querySelector('#worker-dialog-avatar').textContent = initials(worker.name);
        document.querySelector('#worker-dialog-category').textContent = worker.category;
        document.querySelector('#worker-dialog-title').textContent = worker.name;
        document.querySelector('#worker-dialog-description').textContent = `${worker.bio} ${worker.jobs} completed jobs · ${worker.experience} experience.`;
        document.querySelector('#worker-dialog-location').textContent = `📍 ${worker.location} · ${worker.distance} away`;
        document.querySelector('#worker-dialog-rating').textContent = `★ ${worker.rating}`;
        workerDialog.showModal();
    });

    document.querySelectorAll('[data-close-dialog]').forEach((button) => {
        button.addEventListener('click', () => button.closest('dialog').close());
    });
}

function setupNavigation() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navigation = document.querySelector('#dashboard-nav');
    const closeMenu = () => {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open navigation menu');
        navigation.classList.remove('is-open');
    };

    menuToggle.addEventListener('click', () => {
        const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
        menuToggle.setAttribute('aria-expanded', String(!expanded));
        menuToggle.setAttribute('aria-label', expanded ? 'Open navigation menu' : 'Close navigation menu');
        navigation.classList.toggle('is-open', !expanded);
    });
    navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
    window.addEventListener('scroll', () => {
        document.querySelector('.site-header').classList.toggle('is-scrolled', window.scrollY > 18);
    }, { passive: true });
}

function setupDashboard() {
    const profile = readProfile();
    const jobs = WorkNearJobs.getCustomerJobs();
    renderProfile(profile);
    renderActiveJobs(jobs);
    renderWorkers();
    setupDialogs(jobs);
    setupNavigation();

    document.querySelector('[data-dashboard-logout]').addEventListener('click', () => {
        try {
            localStorage.removeItem(SESSION_KEY);
        } catch {
            // Continue to login even when browser storage is unavailable.
        }
        window.location.href = 'login.html';
    });
}

setupDashboard();