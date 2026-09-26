function readFindJobsProfile() {
    try {
        const profile = JSON.parse(localStorage.getItem('worknearUser') || 'null');
        const session = JSON.parse(localStorage.getItem('worknearSession') || 'null');
        return { profile, session };
    } catch {
        return { profile: null, session: null };
    }
}

function currentFilters() {
    return {
        query: document.querySelector('#jobs-search-input').value,
        category: document.querySelector('#filter-category').value,
        distance: document.querySelector('#filter-distance').value,
        budget: document.querySelector('#filter-budget').value,
        customMin: document.querySelector('#custom-budget-min').value,
        customMax: document.querySelector('#custom-budget-max').value,
        urgency: document.querySelector('#filter-urgency').value,
        jobType: document.querySelector('#filter-job-type').value,
        date: document.querySelector('#filter-date').value
    };
}

function formatJobDate(value) {
    if (!value) return 'Date flexible';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function postedTime(job) {
    if (job.postedLabel) return job.postedLabel;
    const createdAt = new Date(job.createdAt || 0).valueOf();
    if (!createdAt) return 'Recently posted';
    const minutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    if (hours < 48) return 'Yesterday';
    return `${Math.floor(hours / 24)} days ago`;
}

function createFindJobCard(job, workerCategory, savedIds) {
    const card = document.createElement('article');
    card.className = `card find-job-card${job.urgency === 'Urgent' || job.urgency === 'Today' ? ' is-urgent-job' : ''}`;
    const header = document.createElement('div');
    header.className = 'find-job-card-header';
    const category = document.createElement('span');
    category.className = 'find-job-category';
    category.textContent = job.category || 'Other';
    const urgency = document.createElement('span');
    urgency.className = `find-job-urgency${job.urgency === 'Urgent' || job.urgency === 'Today' ? ' urgent' : ''}`;
    urgency.textContent = job.urgency || 'Flexible';
    header.append(category, urgency);

    const title = document.createElement('h3');
    title.textContent = job.title || 'Local job';
    const meta = document.createElement('div');
    meta.className = 'find-job-meta';
    const location = document.createElement('span');
    const hasDistance = job.distanceKm !== null && job.distanceKm !== undefined && Number.isFinite(Number(job.distanceKm));
    location.textContent = `📍 ${job.location || 'Location not provided'} · ${hasDistance ? `${job.distanceKm} km` : 'Distance unavailable'}`;
    const schedule = document.createElement('span');
    schedule.textContent = `◷ ${formatJobDate(job.date)}${job.time ? ` · ${job.time}` : ''}`;
    meta.append(location, schedule);

    const description = document.createElement('p');
    description.className = 'find-job-description';
    description.textContent = job.description || 'No description provided.';
    const budget = document.createElement('strong');
    budget.className = 'find-job-budget';
    budget.textContent = WorkNearJobs.formatBudget(job);
    const tags = document.createElement('ul');
    tags.className = 'find-job-tags';
    const requirements = Array.isArray(job.requirements) ? job.requirements : String(job.requirements || '').split(/\n|,/).filter(Boolean);
    requirements.slice(0, 3).forEach((requirement) => {
        const tag = document.createElement('li');
        tag.textContent = requirement;
        tags.append(tag);
    });
    if (!requirements.length) {
        const tag = document.createElement('li');
        tag.textContent = job.budgetType || 'Open job';
        tags.append(tag);
    }

    const footer = document.createElement('div');
    footer.className = 'find-job-footer';
    const customer = document.createElement('span');
    customer.className = 'find-job-customer';
    customer.textContent = `${job.customerName || 'Local customer'} · ${postedTime(job)}`;
    const actions = document.createElement('div');
    actions.className = 'find-job-actions';
    const view = document.createElement('a');
    view.className = 'button button-secondary';
    view.textContent = 'View Job';
    view.href = `job-details.html?id=${encodeURIComponent(job.id)}&from=worker`;
    const save = document.createElement('button');
    save.type = 'button';
    save.className = `button ${savedIds.includes(job.id) ? 'button-primary is-saved' : 'button-ghost'}`;
    save.textContent = savedIds.includes(job.id) ? 'Saved' : 'Save Job';
    save.setAttribute('aria-pressed', String(savedIds.includes(job.id)));
    save.dataset.saveJobId = job.id;
    actions.append(view, save);
    footer.append(customer, actions);
    card.append(header, title, meta, description, budget, tags, footer);
    if (job.category === workerCategory) {
        const match = document.createElement('span');
        match.className = 'find-job-match';
        match.textContent = 'Matches your skills';
        card.append(match);
    }
    return card;
}

function setupFindJobs() {
    const { profile, session } = readFindJobsProfile();
    if (session?.role === 'customer') {
        window.location.replace('customer-dashboard.html');
        return;
    }
    const worker = profile?.role === 'worker' ? profile : null;
    const workerCategory = worker?.category || '';
    document.querySelector('#jobs-location-label').textContent = worker?.location || 'Ajmer, Rajasthan';

    const filterPanel = document.querySelector('#jobs-filter-panel');
    const mobileToggle = document.querySelector('#mobile-filter-toggle');
    const savedTab = document.querySelector('#saved-tab');
    const availableTab = document.querySelector('#available-tab');
    const toast = document.querySelector('#find-jobs-toast');
    let showSaved = false;

    function setMobileFilters(open) {
        filterPanel.classList.toggle('is-open', open);
        mobileToggle.setAttribute('aria-expanded', String(open));
        mobileToggle.setAttribute('aria-label', open ? 'Close filters' : 'Open filters');
        if (open) filterPanel.querySelector('select').focus();
    }

    function clearFilters() {
        document.querySelector('#jobs-search-input').value = '';
        document.querySelector('#filter-category').value = 'all';
        document.querySelector('#filter-distance').value = '5';
        document.querySelector('#filter-budget').value = 'any';
        document.querySelector('#custom-budget-min').value = '';
        document.querySelector('#custom-budget-max').value = '';
        document.querySelector('#filter-urgency').value = 'any';
        document.querySelector('#filter-job-type').value = 'any';
        document.querySelector('#filter-date').value = 'any';
        document.querySelector('#sort-jobs').value = 'recommended';
        showSaved = false;
        setViewTabs();
        updateCustomBudget();
        renderJobs();
        setMobileFilters(false);
    }

    function viewAllJobs() {
        clearFilters();
        document.querySelector('#filter-distance').value = 'any';
        updateCustomBudget();
        renderJobs();
    }

    function setViewTabs() {
        availableTab.classList.toggle('is-selected', !showSaved);
        savedTab.classList.toggle('is-selected', showSaved);
        availableTab.setAttribute('aria-selected', String(!showSaved));
        savedTab.setAttribute('aria-selected', String(showSaved));
        document.querySelector('#results-title').textContent = showSaved ? 'Saved opportunities' : 'Open opportunities';
    }

    function activeJobs() {
        if (!showSaved) return WorkNearJobs.getAvailableJobs();
        return WorkNearJobs.getSavedJobIds().map((id) => WorkNearJobs.findJob(id)).filter(Boolean);
    }

    function updateCustomBudget() {
        const isCustom = document.querySelector('#filter-budget').value === 'custom';
        document.querySelector('#custom-budget-fields').hidden = !isCustom;
        document.querySelector('#location-radius-label').textContent = document.querySelector('#filter-distance').selectedOptions[0].textContent;
    }

    function validateCustomBudget() {
        const error = document.querySelector('#custom-budget-error');
        if (document.querySelector('#filter-budget').value !== 'custom') {
            error.textContent = '';
            return true;
        }
        const minValue = document.querySelector('#custom-budget-min').value;
        const maxValue = document.querySelector('#custom-budget-max').value;
        const minimum = minValue === '' ? null : Number(minValue);
        const maximum = maxValue === '' ? null : Number(maxValue);
        if (minimum === null && maximum === null) {
            error.textContent = 'Enter a minimum or maximum budget.';
            return false;
        }
        if ((minimum !== null && (!Number.isFinite(minimum) || minimum < 0)) || (maximum !== null && (!Number.isFinite(maximum) || maximum < 0))) {
            error.textContent = 'Enter a valid custom budget.';
            return false;
        }
        if (minimum !== null && maximum !== null && maximum < minimum) {
            error.textContent = 'Maximum must be at least the minimum.';
            return false;
        }
        error.textContent = '';
        return true;
    }

    function updateActiveFilterCount() {
        const values = currentFilters();
        const count = Number(values.category !== 'all') + Number(values.distance !== '5' && values.distance !== 'any')
            + Number(values.budget !== 'any') + Number(values.urgency !== 'any') + Number(values.jobType !== 'any')
            + Number(values.date !== 'any') + Number(Boolean(values.query));
        const badge = document.querySelector('#active-filter-count');
        badge.textContent = String(count);
        badge.hidden = count === 0;
    }

    function renderJobs() {
        const savedIds = WorkNearJobs.getSavedJobIds();
        const budgetIsValid = validateCustomBudget();
        const filtered = budgetIsValid
            ? WorkNearJobs.sortJobs(WorkNearJobs.filterJobs(activeJobs(), currentFilters()), document.querySelector('#sort-jobs').value, workerCategory)
            : [];
        const list = document.querySelector('#find-jobs-list');
        const noMatches = document.querySelector('#no-match-empty');
        const noSaved = document.querySelector('#no-saved-empty');
        list.replaceChildren(...filtered.map((job) => createFindJobCard(job, workerCategory, savedIds)));
        list.hidden = filtered.length === 0;
        noMatches.hidden = filtered.length !== 0 || showSaved || !budgetIsValid;
        noSaved.hidden = filtered.length !== 0 || !showSaved;
        document.querySelector('#jobs-result-count').textContent = budgetIsValid
            ? `${filtered.length} ${filtered.length === 1 ? 'job' : 'jobs'} found`
            : 'Enter a valid custom budget';
        document.querySelector('#saved-job-count').textContent = String(savedIds.length);
        updateActiveFilterCount();
    }

    document.querySelector('#filter-budget').addEventListener('change', () => { updateCustomBudget(); renderJobs(); });
    document.querySelector('#filter-distance').addEventListener('change', () => { updateCustomBudget(); renderJobs(); });
    document.querySelector('#jobs-search-form').addEventListener('submit', (event) => { event.preventDefault(); renderJobs(); });
    document.querySelector('#jobs-search-input').addEventListener('input', renderJobs);
    document.querySelectorAll('#jobs-filter-panel select, #custom-budget-min, #custom-budget-max').forEach((control) => control.addEventListener('change', renderJobs));
    document.querySelectorAll('#custom-budget-min, #custom-budget-max').forEach((control) => control.addEventListener('input', renderJobs));
    document.querySelector('#sort-jobs').addEventListener('change', renderJobs);
    document.querySelector('#apply-filters').addEventListener('click', () => { renderJobs(); setMobileFilters(false); });
    document.querySelector('#clear-all-filters').addEventListener('click', clearFilters);
    document.querySelectorAll('[data-clear-all]').forEach((button) => button.addEventListener('click', clearFilters));
    document.querySelectorAll('[data-view-all]').forEach((button) => button.addEventListener('click', viewAllJobs));
    availableTab.addEventListener('click', () => { showSaved = false; setViewTabs(); renderJobs(); });
    savedTab.addEventListener('click', () => { showSaved = true; setViewTabs(); renderJobs(); });
    mobileToggle.addEventListener('click', () => setMobileFilters(mobileToggle.getAttribute('aria-expanded') !== 'true'));
    document.querySelector('#filter-panel-close').addEventListener('click', () => setMobileFilters(false));

    document.querySelector('#find-jobs-list').addEventListener('click', (event) => {
        const button = event.target.closest('[data-save-job-id]');
        if (!button) return;
        const jobId = button.dataset.saveJobId;
        const alreadySaved = WorkNearJobs.getSavedJobIds().includes(jobId);
        WorkNearJobs.toggleSavedJob(jobId);
        toast.textContent = alreadySaved ? 'Job removed from Saved Jobs.' : 'Job saved to your Saved Jobs list.';
        toast.hidden = false;
        window.setTimeout(() => { toast.hidden = true; }, 2500);
        renderJobs();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && filterPanel.classList.contains('is-open')) {
            setMobileFilters(false);
            mobileToggle.focus();
        }
    });
    document.querySelector('#find-jobs-logout').addEventListener('click', () => {
        try { localStorage.removeItem('worknearSession'); } catch { /* Continue to login. */ }
        window.location.href = 'login.html';
    });
    setViewTabs();
    updateCustomBudget();
    renderJobs();
}

setupFindJobs();