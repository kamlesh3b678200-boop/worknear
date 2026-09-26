const WORKER_APPLICATIONS = [
    { id: 'bathroom-plumbing', title: 'Bathroom Plumbing Repair', category: 'Plumber', offer: 850, date: 'Today', status: 'Pending' },
    { id: 'room-painting', title: 'Room Painting', category: 'Painter', offer: 2800, date: 'Yesterday', status: 'Under Review' },
    { id: 'ceiling-fan', title: 'Fan Installation', category: 'Electrician', offer: 600, date: 'Sep 24', status: 'Accepted' }
];

const WORKER_ACTIVE_JOBS = [
    { id: 'active-kitchen-plumbing', title: 'Kitchen Plumbing', customer: 'Rahul', amount: 900, date: 'Today', status: 'In Progress' },
    { id: 'active-switchboard', title: 'Switchboard Repair', customer: 'Meena', amount: 700, date: 'Yesterday', status: 'Scheduled' }
];

const FALLBACK_WORKER = { name: 'Arjun Sharma', category: 'Electrician', location: 'Ajmer, Rajasthan', rating: '4.8', completedJobs: 32, experience: '5 years' };
const APPLICATION_STATUS_CLASS = { Pending: 'pending', 'Under Review': 'review', Accepted: 'accepted' };

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function readWorkerState() {
    try {
        const profile = JSON.parse(localStorage.getItem('worknearUser') || 'null');
        const session = JSON.parse(localStorage.getItem('worknearSession') || 'null');
        return { profile, session };
    } catch {
        return { profile: null, session: null };
    }
}

function initials(name) {
    return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function renderWorkerProfile(profile) {
    const worker = profile?.role === 'worker' ? { ...FALLBACK_WORKER, ...profile } : FALLBACK_WORKER;
    const name = worker.name || FALLBACK_WORKER.name;
    const location = worker.location || FALLBACK_WORKER.location;
    const category = worker.category || FALLBACK_WORKER.category;
    const experience = worker.experience
        ? (/\byears?\b/i.test(worker.experience) ? worker.experience : `${worker.experience} years`)
        : FALLBACK_WORKER.experience;
    const workerInitials = initials(name);
    document.querySelector('#worker-name').textContent = name;
    document.querySelector('#worker-profile-name').textContent = name;
    document.querySelector('#worker-profile-detail').textContent = `${category} · ${location}`;
    document.querySelector('#worker-hero-category').textContent = category;
    document.querySelector('#worker-hero-location').textContent = location;
    document.querySelector('#worker-hero-rating').textContent = worker.rating || FALLBACK_WORKER.rating;
    document.querySelector('#worker-avatar').textContent = workerInitials;
    document.querySelector('#worker-card-avatar').textContent = workerInitials;
    document.querySelector('#worker-card-name').textContent = name;
    document.querySelector('#worker-card-category').textContent = category;
    document.querySelector('#worker-card-rating').textContent = worker.rating || FALLBACK_WORKER.rating;
    document.querySelector('#worker-card-completed').textContent = `${worker.completedJobs || FALLBACK_WORKER.completedJobs} completed jobs`;
    document.querySelector('#worker-card-location').textContent = location;
    document.querySelector('#worker-card-experience').textContent = `${experience} experience`;
    return category;
}

function renderApplications() {
    const list = document.querySelector('#applications-list');
    list.replaceChildren(...WORKER_APPLICATIONS.map((application) => {
        const row = element('article', 'worker-record-card');
        const content = element('div', 'worker-record-main');
        content.append(element('h3', '', application.title), element('p', '', `${application.category} · ${application.date}`));
        const result = element('div', 'worker-record-result');
        result.append(element('strong', '', `₹${application.offer.toLocaleString('en-IN')}`));
        const status = element('span', `worker-status ${APPLICATION_STATUS_CLASS[application.status] || ''}`, application.status);
        result.append(status);
        const view = element('a', 'worker-record-link', 'View Job');
        view.href = `job-details.html?id=${encodeURIComponent(application.id)}&from=worker`;
        row.append(content, result, view);
        return row;
    }));
    document.querySelector('#applied-job-stat').textContent = String(WORKER_APPLICATIONS.length);
    document.querySelector('#applications-empty').hidden = WORKER_APPLICATIONS.length !== 0;
}

function renderActiveWork() {
    const list = document.querySelector('#active-work-list');
    list.replaceChildren(...WORKER_ACTIVE_JOBS.map((job) => {
        const row = element('article', 'worker-record-card');
        const content = element('div', 'worker-record-main');
        content.append(element('h3', '', job.title), element('p', '', `Customer: ${job.customer} · ${job.date}`));
        const result = element('div', 'worker-record-result');
        result.append(element('strong', '', `₹${job.amount.toLocaleString('en-IN')}`), element('span', 'worker-status active', job.status));
        const view = element('a', 'worker-record-link', 'View Job');
        view.href = `job-details.html?id=${encodeURIComponent(job.id)}&from=worker`;
        row.append(content, result, view);
        return row;
    }));
    document.querySelector('#active-work-stat').textContent = String(WORKER_ACTIVE_JOBS.length);
    document.querySelector('#active-work-empty').hidden = WORKER_ACTIVE_JOBS.length !== 0;
}

function filterJobs(jobs, workerCategory) {
    const filters = {
        query: document.querySelector('#job-search').value,
        category: document.querySelector('#filter-category').value,
        distance: document.querySelector('#filter-distance').value,
        budget: document.querySelector('#filter-budget').value,
        urgency: document.querySelector('#filter-urgency').value
    };
    const filtered = WorkNearJobs.filterJobs(jobs, filters);
    return WorkNearJobs.sortJobs(filtered, 'recommended', workerCategory);
}

function createJobCard(job, workerCategory) {
    const card = element('article', `card worker-job-card${job.category === workerCategory ? ' is-category-match' : ''}`);
    const top = element('div', 'worker-job-top');
    const iconMap = { Plumber: '🔧', Electrician: '⚡', Carpenter: '🪚', Painter: '🎨', Cleaner: '🧹', Mechanic: '🔩', Driver: '🚗', 'AC Repair': '❄️', Mason: '🔨', 'Appliance Repair': '🧰' };
    const icon = element('span', 'worker-job-icon', iconMap[job.category] || '🧰');
    icon.setAttribute('aria-hidden', 'true');
    top.append(icon, element('span', `worker-urgency${job.urgency === 'Urgent' || job.urgency === 'Today' ? ' is-urgent' : ''}`, job.urgency || 'Flexible'));
    card.append(top, element('p', 'worker-job-category', job.category), element('h3', '', job.title));
    const hasMockDistance = job.distanceKm !== null && job.distanceKm !== undefined && Number.isFinite(Number(job.distanceKm));
    const distanceLabel = hasMockDistance ? `${job.distanceKm} km` : 'Distance unavailable';
    card.append(element('p', 'worker-job-location', `📍 ${job.location || 'Location not specified'} · ${distanceLabel}`));
    const details = element('div', 'worker-job-details');
    details.append(element('span', 'worker-job-budget', WorkNearJobs.formatBudget(job)), element('span', 'worker-job-posted', job.postedLabel || 'Recently posted'));
    card.append(details);
    if (job.category === workerCategory) card.append(element('span', 'worker-match-badge', 'Matches your category'));
    const actions = element('div', 'worker-job-actions');
    const view = element('a', 'button button-secondary', 'View Job');
    view.href = `job-details.html?id=${encodeURIComponent(job.id)}&from=worker`;
    const apply = element('button', 'button button-primary', 'Apply / Send Offer');
    apply.type = 'button';
    apply.dataset.applyJob = job.id;
    actions.append(view, apply);
    card.append(actions);
    return card;
}

function setupJobBrowser(jobs, workerCategory) {
    const form = document.querySelector('#worker-filter-form');
    const list = document.querySelector('#worker-jobs-list');
    const empty = document.querySelector('#worker-jobs-empty');
    const toast = document.querySelector('#worker-toast');
    document.querySelector('#available-job-stat').textContent = String(jobs.length);

    function render() {
        const filtered = filterJobs(jobs, workerCategory);
        list.replaceChildren(...filtered.map((job) => createJobCard(job, workerCategory)));
        list.hidden = filtered.length === 0;
        empty.hidden = filtered.length !== 0;
        document.querySelector('#worker-results-note').textContent = `${filtered.length} ${filtered.length === 1 ? 'job' : 'jobs'} shown · Other categories are available in the filter.`;
    }

    form.addEventListener('input', render);
    form.addEventListener('change', render);
    form.addEventListener('submit', (event) => { event.preventDefault(); render(); });
    document.querySelectorAll('[data-clear-filters], #clear-worker-filters').forEach((button) => {
        button.addEventListener('click', () => { form.reset(); render(); });
    });
    list.addEventListener('click', (event) => {
        const button = event.target.closest('[data-apply-job]');
        if (!button) return;
        toast.textContent = 'Offers will be available in the next stage.';
        toast.hidden = false;
        window.setTimeout(() => { toast.hidden = true; }, 3500);
    });
    render();
}

function setupNavigation() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('#worker-nav');
    const close = () => {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open navigation menu');
        nav.classList.remove('is-open');
    };
    toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        toggle.setAttribute('aria-label', expanded ? 'Open navigation menu' : 'Close navigation menu');
        nav.classList.toggle('is-open', !expanded);
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
    window.addEventListener('scroll', () => document.querySelector('.site-header').classList.toggle('is-scrolled', window.scrollY > 18), { passive: true });
}

function startWorkerDashboard() {
    const { profile, session } = readWorkerState();
    if (session?.role === 'customer') {
        window.location.replace('customer-dashboard.html');
        return;
    }
    const workerCategory = renderWorkerProfile(profile);
    const jobs = WorkNearJobs.getAvailableJobs();
    setupJobBrowser(jobs, workerCategory);
    renderApplications();
    renderActiveWork();
    setupNavigation();
    document.querySelector('[data-worker-logout]').addEventListener('click', () => {
        try { localStorage.removeItem('worknearSession'); } catch { /* Continue to login. */ }
        window.location.href = 'login.html';
    });
}

startWorkerDashboard();