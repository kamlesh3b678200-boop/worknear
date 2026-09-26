const siteHeader = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const primaryNav = document.querySelector('.primary-nav');
const searchForm = document.querySelector('#worker-search');
const searchStatus = document.querySelector('#search-status');
const serviceInput = document.querySelector('#service-input');
const locationInput = document.querySelector('#location-input');
const jobCards = [...document.querySelectorAll('.job-card')];
const jobsFeedback = document.querySelector('#jobs-feedback');
const jobEmptyState = document.querySelector('#job-empty');

function filterJobs(serviceQuery, locationQuery) {
    const normalizedService = serviceQuery.trim().toLowerCase();
    const normalizedLocation = locationQuery.trim().toLowerCase();
    let visibleCount = 0;

    jobCards.forEach((jobCard) => {
        const category = jobCard.dataset.category.toLowerCase();
        const title = jobCard.querySelector('h3').textContent.toLowerCase();
        const location = jobCard.dataset.location.toLowerCase();
        const matchesService = !normalizedService || category.includes(normalizedService) || title.includes(normalizedService);
        const matchesLocation = !normalizedLocation || location.includes(normalizedLocation);
        const isVisible = matchesService && matchesLocation;

        jobCard.hidden = !isVisible;
        visibleCount += Number(isVisible);
    });

    jobEmptyState.hidden = visibleCount !== 0;
    jobsFeedback.hidden = false;
    jobsFeedback.textContent = visibleCount
        ? `Showing ${visibleCount} sample ${visibleCount === 1 ? 'job' : 'jobs'}${normalizedLocation ? ` near ${locationInput.value.trim()}` : ''}. Listings are mock data.`
        : 'No sample jobs match that search. Try plumber, electrician, painter or AC repair.';
    searchStatus.textContent = visibleCount
        ? `Found ${visibleCount} matching sample ${visibleCount === 1 ? 'job' : 'jobs'}.`
        : 'No matching sample jobs. Try one of the suggested services.';
    searchStatus.hidden = false;
}

function closeMenu() {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation menu');
    primaryNav.classList.remove('is-open');
}

menuToggle.addEventListener('click', () => {
    const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';

    menuToggle.setAttribute('aria-expanded', String(!isExpanded));
    menuToggle.setAttribute('aria-label', isExpanded ? 'Open navigation menu' : 'Close navigation menu');
    primaryNav.classList.toggle('is-open', !isExpanded);
});

primaryNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeMenu();
    }
});

window.addEventListener('scroll', () => {
    siteHeader.classList.toggle('is-scrolled', window.scrollY > 18);
}, { passive: true });

searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    filterJobs(serviceInput.value, locationInput.value);
    document.querySelector('#jobs-near-you').scrollIntoView({ behavior: 'smooth' });
});

document.querySelectorAll('[data-search]').forEach((button) => {
    button.addEventListener('click', () => {
        serviceInput.value = button.dataset.search;
        searchForm.requestSubmit();
    });
});

document.querySelectorAll('.service-tile').forEach((serviceTile) => {
    serviceTile.addEventListener('click', () => {
        serviceInput.value = serviceTile.dataset.service;
        searchForm.requestSubmit();
    });
});

document.querySelectorAll('.job-view-button').forEach((button) => {
    button.addEventListener('click', () => {
        const jobTitle = button.closest('.job-card').querySelector('h3').textContent;
        jobsFeedback.textContent = `${jobTitle} is a sample listing. Job details will be available in a later step.`;
        jobsFeedback.hidden = false;
    });
});