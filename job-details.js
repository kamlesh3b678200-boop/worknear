function displayJobDate(value) {
    if (!value) return 'Not specified';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(date);
}

function displayPostedAt(value) {
    if (!value) return 'Not specified';
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function makeDetailElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function readDetailAccount() {
    try {
        return {
            profile: JSON.parse(localStorage.getItem('worknearUser') || 'null'),
            session: JSON.parse(localStorage.getItem('worknearSession') || 'null')
        };
    } catch {
        return { profile: null, session: null };
    }
}

function normalizedStatus(job) {
    return ['Open', 'In Progress', 'Completed', 'Closed'].includes(job.status) ? job.status : 'Open';
}

function setTimelineState(id, state) {
    const item = document.querySelector(`#timeline-${id}`);
    item.classList.remove('is-complete', 'is-current');
    if (state) item.classList.add(state);
}

function renderTimeline(job, status) {
    const offers = WorkNearOffers.getOffersForJob(job.id);
    const hasOffers = offers.length > 0 || Number(job.offerCount) > 0 || /\d+ offers/i.test(job.status || '');
    const workerSelected = ['In Progress', 'Completed'].includes(status) || Boolean(job.selectedWorkerId);
    const underway = ['In Progress', 'Completed'].includes(status);
    setTimelineState('posted', 'is-complete');
    setTimelineState('offers', hasOffers ? 'is-complete' : status === 'Open' ? 'is-current' : '');
    setTimelineState('selected', workerSelected ? 'is-complete' : '');
    setTimelineState('progress', underway ? (status === 'In Progress' ? 'is-current' : 'is-complete') : '');
    setTimelineState('completed', status === 'Completed' ? 'is-complete' : '');
    document.querySelector('#job-closed-note').hidden = status !== 'Closed';
}

function formatOfferTimestamp(value) {
    if (!value) return 'Just now';
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? 'Recently' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function createNegotiationHistory(history) {
    const timeline = document.createElement('ol');
    timeline.className = 'negotiation-history';
    (Array.isArray(history) ? history : []).forEach((event) => {
        const item = makeDetailElement('li', `negotiation-event ${event.actorRole || 'system'}`);
        const head = makeDetailElement('div', 'negotiation-event-head');
        head.append(makeDetailElement('strong', '', event.actorName || 'WorkNear'), makeDetailElement('time', '', formatOfferTimestamp(event.createdAt)));
        const action = makeDetailElement('span', 'negotiation-event-action', event.action || 'Updated offer');
        const amount = makeDetailElement('strong', 'negotiation-event-amount', `₹${Number(event.amount || 0).toLocaleString('en-IN')}`);
        item.append(head, action, amount);
        if (event.message) item.append(makeDetailElement('p', 'negotiation-event-message', event.message));
        timeline.append(item);
    });
    return timeline;
}

function createOfferCard(offer, mode) {
    const card = makeDetailElement('article', 'offer-card');
    const header = makeDetailElement('div', 'offer-card-header');
    const workerName = offer.workerName || 'WorkNear Worker';
    const avatar = makeDetailElement('span', 'offer-worker-avatar', workerName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase());
    avatar.setAttribute('aria-hidden', 'true');
    const identity = makeDetailElement('div', 'offer-worker-identity');
    identity.append(makeDetailElement('strong', '', workerName));
    identity.append(makeDetailElement('span', '', `${offer.workerCategory || 'Local worker'} · ${offer.workerLocation || 'Location not provided'}`));
    const rating = WorkNearOffers.getAverageRating(offer.workerId) || offer.workerRating || 'New';
    header.append(avatar, identity, makeDetailElement('span', 'offer-worker-rating', `★ ${rating}`));

    const current = makeDetailElement('div', 'offer-current');
    current.append(makeDetailElement('span', '', mode === 'worker' ? 'Your current offer' : 'Current offer'));
    current.append(makeDetailElement('strong', '', `₹${Number(offer.amount || 0).toLocaleString('en-IN')}`));
    current.append(makeDetailElement('span', `offer-status status-${String(offer.status || 'Pending').toLowerCase()}`, offer.status || 'Pending'));
    const latestMessage = offer.message || offer.history?.at(-1)?.message;
    if (latestMessage) current.append(makeDetailElement('p', 'offer-worker-message', `“${latestMessage}”`));

    const facts = makeDetailElement('div', 'offer-worker-facts');
    const experience = offer.workerExperience || 'Experience not provided';
    facts.append(makeDetailElement('span', '', experience), makeDetailElement('span', '', `${offer.status === 'Accepted' && offer.agreedAmount ? `Agreed ₹${Number(offer.agreedAmount).toLocaleString('en-IN')}` : 'Profile preview'}`));
    const historyHeading = makeDetailElement('h4', 'negotiation-history-title', 'Negotiation History');
    card.append(header, facts, current, historyHeading, createNegotiationHistory(offer.history));

    const history = Array.isArray(offer.history) ? offer.history : [];
    const latest = history.at(-1);
    const actions = makeDetailElement('div', 'offer-response-actions');
    const customerCanRespond = mode === 'customer' && ['Pending', 'Countered'].includes(offer.status) && latest?.actorRole === 'worker';
    const workerCanRespond = mode === 'worker' && offer.status === 'Countered' && latest?.actorRole === 'customer';
    if (customerCanRespond || workerCanRespond) {
        const accept = makeDetailElement('button', 'button button-primary', workerCanRespond ? 'Accept Counter' : 'Accept');
        accept.type = 'button';
        accept.dataset.offerAction = 'accept';
        accept.dataset.offerId = offer.id;
        const counter = makeDetailElement('button', 'button button-secondary', 'Counter Offer');
        counter.type = 'button';
        counter.dataset.offerAction = 'counter';
        counter.dataset.offerId = offer.id;
        const reject = makeDetailElement('button', 'button button-ghost offer-reject-button', 'Reject');
        reject.type = 'button';
        reject.dataset.offerAction = 'reject';
        reject.dataset.offerId = offer.id;
        actions.append(accept, counter, reject);
    } else if (offer.status === 'Countered') {
        actions.append(makeDetailElement('span', 'offer-waiting-note', mode === 'customer' ? 'Waiting for worker response' : 'Waiting for customer response'));
    } else if (offer.status === 'Accepted') {
        actions.append(makeDetailElement('span', 'offer-final-note', `Deal Accepted · ₹${Number(offer.agreedAmount ?? offer.amount).toLocaleString('en-IN')}`));
    } else if (offer.status === 'Rejected') {
        actions.append(makeDetailElement('span', 'offer-final-note', 'Offer Rejected'));
    } else if (offer.status === 'Completed') {
        actions.append(makeDetailElement('span', 'offer-final-note', 'Job Completed'));
    } else if (mode === 'worker' && offer.status === 'Pending') {
        actions.append(makeDetailElement('span', 'offer-waiting-note', 'Waiting for customer response'));
    }
    if (actions.childElementCount) card.append(actions);
    return card;
}

function renderOfferLists(job, workerView, ownsJob, workerProfile) {
    const section = document.querySelector('#job-offers-section');
    const allOffers = WorkNearOffers.getOffersForJob(job.id);
    const workerOffer = workerProfile?.role === 'worker' ? allOffers.find((offer) => offer.workerId === workerProfile.email) : null;
    section.hidden = !ownsJob && !workerView;
    document.querySelector('#job-offer-count').textContent = String(allOffers.length);
    document.querySelector('#offers-empty').hidden = !ownsJob || allOffers.length > 0;
    document.querySelector('#customer-offers-list').hidden = !ownsJob;
    document.querySelector('#worker-offer-list').hidden = !workerView;
    document.querySelector('#customer-offers-list').replaceChildren(...(ownsJob ? allOffers.map((offer) => createOfferCard(offer, 'customer')) : []));
    document.querySelector('#worker-offer-list').replaceChildren(...(workerView && workerOffer ? [createOfferCard(workerOffer, 'worker')] : []));
    document.querySelector('#worker-offer-empty').hidden = !workerView || Boolean(workerOffer);
    return { allOffers, workerOffer };
}

function renderRelatedJobs(job, workerCategory, from) {
    const openJobs = WorkNearJobs.getAvailableJobs().filter((item) => item.id !== job.id);
    const sameCategory = openJobs.filter((item) => item.category === job.category);
    const sameLocation = openJobs.filter((item) => (item.location || '').toLowerCase() === (job.location || '').toLowerCase());
    const prioritized = [...sameCategory, ...sameLocation, ...openJobs];
    const unique = [...new Map(prioritized.map((item) => [item.id, item])).values()].slice(0, 4);
    const list = document.querySelector('#similar-jobs-list');
    list.replaceChildren(...unique.map((item) => {
        const card = makeDetailElement('article', 'card similar-job-card');
        card.append(makeDetailElement('p', 'similar-job-category', item.category || 'Local service'));
        card.append(makeDetailElement('h3', '', item.title || 'Local job'));
        const meta = makeDetailElement('p', 'similar-job-location', `📍 ${item.location || 'Location not provided'}`);
        const distanceAvailable = item.distanceKm !== null && item.distanceKm !== undefined && Number.isFinite(Number(item.distanceKm));
        if (distanceAvailable) meta.textContent += ` · ${item.distanceKm} km`;
        card.append(meta, makeDetailElement('strong', 'similar-job-budget', WorkNearJobs.formatBudget(item)));
        if (item.category === workerCategory) card.append(makeDetailElement('span', 'similar-job-match', 'Matches your skills'));
        const view = makeDetailElement('a', 'button button-secondary', 'View Job');
        view.href = `job-details.html?id=${encodeURIComponent(item.id)}&from=${encodeURIComponent(from)}`;
        card.append(view);
        return card;
    }));
    document.querySelector('#similar-jobs-section').hidden = unique.length === 0;
}

function renderWorkerActions(job, status, profile, session, workerOffer) {
    const actions = document.querySelector('#job-action-buttons');
    const message = document.querySelector('#job-action-message');
    const authenticatedWorker = session?.role === 'worker' && profile?.role === 'worker' && Boolean(profile.email);
    const controls = [];
    if (status === 'Open' && authenticatedWorker && !workerOffer) {
        const makeOffer = makeDetailElement('button', 'button button-primary', 'Make an Offer');
        makeOffer.type = 'button';
        makeOffer.dataset.openOffer = 'initial';
        controls.push(makeOffer);
    } else if (workerOffer) {
        const statusButton = makeDetailElement('button', 'button button-secondary', workerOffer.status === 'Countered' ? 'View Counter Offer' : `Offer ${workerOffer.status}`);
        statusButton.type = 'button';
        statusButton.dataset.scrollToOffer = 'true';
        controls.push(statusButton);
    } else if (status !== 'Open') {
        controls.push(makeDetailElement('span', 'job-action-disabled', status === 'Completed' ? 'Job Completed' : 'This job is not accepting offers.'));
    } else {
        message.textContent = 'Sign in as a worker to make an offer.';
        message.hidden = false;
    }
    const savedIds = WorkNearJobs.getSavedJobIds();
    const save = makeDetailElement('button', `button ${savedIds.includes(job.id) ? 'button-primary is-saved' : 'button-secondary'}`, savedIds.includes(job.id) ? 'Saved' : 'Save Job');
    save.type = 'button';
    save.setAttribute('aria-pressed', String(savedIds.includes(job.id)));
    const syncSavedState = () => {
        const isSaved = WorkNearJobs.getSavedJobIds().includes(job.id);
        save.textContent = isSaved ? 'Saved' : 'Save Job';
        save.classList.toggle('button-primary', isSaved);
        save.classList.toggle('button-secondary', !isSaved);
        save.setAttribute('aria-pressed', String(isSaved));
    };
    save.addEventListener('click', () => { WorkNearJobs.toggleSavedJob(job.id); syncSavedState(); });
    syncSavedState();
    controls.push(save);
    actions.replaceChildren(...controls);
}

function renderCustomerActions(job, status, ownsJob, offerCount) {
    if (!ownsJob) return false;
    const actions = document.querySelector('#job-action-buttons');
    const message = document.querySelector('#job-action-message');
    const edit = makeDetailElement('button', 'button button-secondary', 'Edit Job');
    edit.type = 'button';
    edit.addEventListener('click', () => {
        message.textContent = 'Job editing will be available in a later step.';
        message.hidden = false;
    });
    const offers = makeDetailElement('a', 'button button-secondary', `View Offers (${offerCount})`);
    offers.href = '#job-offers-section';
    const controls = [edit, offers];
    if (status === 'Open') {
        const close = makeDetailElement('button', 'button button-danger-ghost', 'Close Job');
        close.type = 'button';
        close.addEventListener('click', () => {
            if (!window.confirm('Close this job? Workers will no longer be able to apply.')) return;
            try {
                const updated = WorkNearJobs.updateCustomerJob(job.id, { status: 'Closed' });
                if (!updated) throw new Error('Job is not in the customer job list.');
                window.location.reload();
            } catch {
                message.textContent = 'This mock job could not be updated in browser storage.';
                message.hidden = false;
            }
        });
        controls.push(close);
    }
    actions.replaceChildren(...controls);
    return true;
}

let activeJobDetails = null;
let activeOfferDialog = { mode: 'offer', offerId: '' };

function showJobActionMessage(message) {
    const region = document.querySelector('#job-action-message');
    region.textContent = message;
    region.hidden = false;
}

function openOfferDialog(mode, offer = null) {
    activeOfferDialog = { mode, offerId: offer?.id || '' };
    const dialog = document.querySelector('#offer-dialog');
    const title = document.querySelector('#offer-dialog-title');
    const kicker = document.querySelector('#offer-dialog-kicker');
    const submit = document.querySelector('#offer-submit');
    const amount = document.querySelector('#offer-amount');
    const message = document.querySelector('#offer-message');
    const isCounter = mode === 'counter';
    title.textContent = isCounter ? 'Make a Counter Offer' : 'Make an Offer';
    kicker.textContent = isCounter ? 'CONTINUE THE CONVERSATION' : 'SEND A JOB OFFER';
    submit.textContent = isCounter ? 'Send Counter Offer' : 'Send Offer';
    document.querySelector('#offer-dialog-job-title').textContent = activeJobDetails.job.title;
    amount.value = isCounter ? String(offer?.amount || '') : '';
    message.value = '';
    document.querySelector('#offer-amount-error').textContent = '';
    document.querySelector('#offer-form-error').textContent = '';
    dialog.showModal();
    amount.focus();
}

function processOfferResponse(offer, action) {
    if (action === 'accept' || action === 'reject') {
        const prompt = action === 'accept'
            ? `Accept this offer for ₹${Number(offer.amount).toLocaleString('en-IN')}?`
            : 'Reject this offer?';
        if (!window.confirm(prompt)) return;
    }
    const result = WorkNearOffers.respondToOffer(offer.id, activeJobDetails.actor, action);
    if (result.error) {
        showJobActionMessage(result.error);
        return;
    }
    if (action === 'accept') {
        showJobActionMessage(`Deal Accepted · ₹${Number(result.offer.agreedAmount).toLocaleString('en-IN')}. Job is now in progress.`);
    } else if (action === 'reject') {
        showJobActionMessage('Offer rejected. The negotiation history is saved.');
    } else {
        openOfferDialog('counter', offer);
        return;
    }
    renderJobDetails();
}

function setupOfferDialog() {
    const dialog = document.querySelector('#offer-dialog');
    document.querySelector('#offer-dialog-close').addEventListener('click', () => dialog.close());
    document.querySelector('#offer-cancel').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
    });
    document.querySelector('#offer-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const amount = Number(document.querySelector('#offer-amount').value);
        const amountError = document.querySelector('#offer-amount-error');
        if (!Number.isFinite(amount) || amount <= 0) {
            amountError.textContent = 'Enter an amount greater than ₹0.';
            document.querySelector('#offer-amount').focus();
            return;
        }
        const message = document.querySelector('#offer-message').value.trim();
        const result = activeOfferDialog.mode === 'counter'
            ? WorkNearOffers.respondToOffer(activeOfferDialog.offerId, activeJobDetails.actor, 'counter', amount, message)
            : WorkNearOffers.addOffer(activeJobDetails.job, activeJobDetails.profile, amount, message);
        if (result.error) {
            document.querySelector('#offer-form-error').textContent = result.error;
            return;
        }
        dialog.close();
        showJobActionMessage(activeOfferDialog.mode === 'counter'
            ? `Counter offer of ₹${amount.toLocaleString('en-IN')} sent.`
            : `Your offer of ₹${amount.toLocaleString('en-IN')} has been sent.`);
        renderJobDetails();
    });
}

function setupOfferActions() {
    document.querySelector('#job-action-buttons').addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;
        if (target.dataset.openOffer) {
            openOfferDialog('offer');
        } else if (target.dataset.scrollToOffer) {
            document.querySelector('#job-offers-section').scrollIntoView({ behavior: 'smooth' });
        }
    });

    document.querySelectorAll('#customer-offers-list, #worker-offer-list').forEach((list) => {
        list.addEventListener('click', (event) => {
            const button = event.target.closest('[data-offer-action]');
            if (!button) return;
            const offer = WorkNearOffers.getOffer(button.dataset.offerId);
            if (offer) processOfferResponse(offer, button.dataset.offerAction);
        });
    });

    document.querySelector('#confirm-completion').addEventListener('click', () => {
        const result = WorkNearOffers.confirmCompletion(activeJobDetails.job.id, activeJobDetails.actor);
        if (result.error) {
            showJobActionMessage(result.error);
            return;
        }
        showJobActionMessage(result.completed ? 'Job Completed Successfully.' : 'Completion confirmed. Waiting for the other party.');
        renderJobDetails();
    });

    document.querySelector('#job-review-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const result = WorkNearOffers.submitReview(
            activeJobDetails.job,
            activeJobDetails.actor,
            document.querySelector('#review-rating').value,
            document.querySelector('#review-text').value
        );
        if (result.error) {
            showJobActionMessage(result.error);
            return;
        }
        showJobActionMessage('Review saved. Thank you for sharing your experience.');
        renderJobDetails();
    });
}

function renderJobDetails() {
    const query = new URLSearchParams(window.location.search);
    const id = query.get('id');
    const job = id ? WorkNearJobs.findJob(id) : null;
    const { profile, session } = readDetailAccount();
    const from = query.get('from') || '';
    const workerView = session?.role ? session.role === 'worker' : from === 'worker';
    const customerView = session?.role ? session.role === 'customer' : from === 'customer';
    const ownsJob = customerView && profile?.role === 'customer' && Boolean(profile.email) && profile.email === job?.customerId;
    const dashboardHref = workerView ? 'worker-dashboard.html' : customerView ? 'customer-dashboard.html' : 'find-jobs.html';
    const backHref = workerView ? 'find-jobs.html' : dashboardHref;
    const dashboardLabel = workerView ? 'Worker Dashboard' : customerView ? 'Customer Dashboard' : 'Find Jobs';
    const dashboardLink = document.querySelector('#details-dashboard-link');
    const backLink = document.querySelector('#details-back-link');
    dashboardLink.href = dashboardHref;
    dashboardLink.textContent = dashboardLabel;
    backLink.href = backHref;
    backLink.textContent = workerView ? '← Back to Jobs' : `← Back to ${dashboardLabel}`;
    if (!job) {
        document.querySelector('#job-detail-empty').hidden = false;
        return;
    }

    const status = normalizedStatus(job);
    document.title = `${job.title} | WorkNear`;
    document.querySelector('#detail-category').textContent = job.category || 'Other';
    document.querySelector('#detail-category-info').textContent = job.category || 'Not specified';
    document.querySelector('#detail-title').textContent = job.title || 'Untitled job';
    const statusBadge = document.querySelector('#detail-status');
    statusBadge.textContent = status.toUpperCase();
    statusBadge.className = `badge job-status-badge status-${status.toLowerCase().replaceAll(' ', '-')}`;
    document.querySelector('#detail-description').textContent = job.description || 'No description provided.';
    document.querySelector('#detail-customer').textContent = job.customerName || 'WorkNear Customer';
    document.querySelector('#detail-customer-location').textContent = job.location || 'Local customer';
    document.querySelector('#detail-location').textContent = job.location || 'Not specified';
    const hasDistance = job.distanceKm !== null && job.distanceKm !== undefined && Number.isFinite(Number(job.distanceKm));
    document.querySelector('#detail-distance').textContent = hasDistance ? `Approximately ${job.distanceKm} km away` : 'Distance not available';
    document.querySelector('#detail-landmark').textContent = job.landmark || 'No landmark provided';
    document.querySelector('#detail-date').textContent = displayJobDate(job.date);
    document.querySelector('#detail-time').textContent = job.time || 'Not specified';
    document.querySelector('#detail-budget').textContent = WorkNearJobs.formatBudget(job);
    const fixedBudget = Number(job.minBudget ?? job.budget ?? 0) === Number(job.maxBudget ?? job.budget ?? job.minBudget ?? 0);
    const budgetType = job.budgetType || (fixedBudget ? 'Fixed Budget' : 'Negotiable');
    document.querySelector('#detail-budget-type').textContent = budgetType;
    document.querySelector('#detail-job-type').textContent = budgetType;
    document.querySelector('#detail-urgency').textContent = job.urgency || 'Flexible';
    document.querySelector('#detail-experience').textContent = job.experience || 'Any experience';
    document.querySelector('#detail-posted').textContent = job.postedLabel || displayPostedAt(job.createdAt);
    const customerJobs = WorkNearJobs.getCustomerJobs().filter((item) => job.customerId && item.customerId === job.customerId);
    document.querySelector('#detail-customer-jobs').textContent = String(customerJobs.length || job.customerJobsPosted || 12);
    document.querySelector('#detail-customer-rating').textContent = `★ ${job.customerRating || '4.7'}`;
    const customerName = job.customerName || 'WorkNear Customer';
    document.querySelector('#detail-customer-avatar').textContent = customerName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

    const requirementsList = document.querySelector('#detail-requirements');
    const requirements = Array.isArray(job.requirements) ? job.requirements : String(job.requirements || '').split(/\n|,/).filter(Boolean);
    requirementsList.replaceChildren(...(requirements.length ? requirements : ['No specific requirements added.']).map((value) => {
        const item = document.createElement('li');
        item.textContent = value;
        return item;
    }));

    document.querySelector('#detail-status-message').textContent = ({
        Open: 'Accepting workers',
        'In Progress': 'Work is currently underway',
        Completed: 'Job has been completed',
        Closed: 'This job is no longer accepting workers'
    })[status];
    renderTimeline(job, status);
    const actor = session?.role ? { ...(profile || {}), role: session.role, email: session.email || profile?.email || '' } : null;
    activeJobDetails = { job, profile, session, actor };
    const offers = WorkNearOffers.getOffersForJob(job.id);
    const workerOffer = session?.role === 'worker' ? offers.find((offer) => offer.workerId === actor?.email) || null : null;
    const participantWorker = status === 'In Progress' && actor?.role === 'worker' && actor.email === job.selectedWorkerId;
    const completionPanel = document.querySelector('#completion-panel');
    const completionConfirmations = job.completionConfirmations || {};
    const actorConfirmed = actor?.role && completionConfirmations[actor.role];
    completionPanel.hidden = !(participantWorker || ownsJob) || status !== 'In Progress';
    document.querySelector('#completion-help').textContent = actorConfirmed
        ? 'Your completion is confirmed. Waiting for the other party.'
        : 'Both customer and worker must confirm before the job is marked complete.';
    document.querySelector('#confirm-completion').textContent = actorConfirmed
        ? 'Completion Confirmed'
        : actor?.role === 'customer' ? 'Confirm Job Completed' : 'Mark Work Completed';
    document.querySelector('#confirm-completion').disabled = Boolean(actorConfirmed);

    const reviewForm = document.querySelector('#job-review-form');
    const participant = ownsJob || (actor?.role === 'worker' && actor.email === job.selectedWorkerId);
    const existingReview = WorkNearOffers.getReviews().find((review) => review.jobId === job.id && review.authorId === actor?.email);
    reviewForm.hidden = status !== 'Completed' || !participant || Boolean(existingReview);
    if (existingReview) showJobActionMessage('Your review is saved. Thank you.');

    renderOfferLists(job, workerView, ownsJob, workerProfile = profile);
    if (workerView) renderWorkerActions(job, status, profile, session, workerOffer);
    else if (!renderCustomerActions(job, status, ownsJob)) {
        document.querySelector('#job-action-buttons').replaceChildren();
        document.querySelector('#job-action-message').textContent = customerView
            ? 'Only the customer who posted this job can manage it.'
            : 'Sign in as a worker to save or respond to this job.';
        document.querySelector('#job-action-message').hidden = false;
    }
    if (ownsJob) renderCustomerActions(job, status, true, offers.length);
    renderRelatedJobs(job, workerView ? profile?.category : '', workerView ? 'worker' : 'customer');
    document.querySelector('#job-details-layout').hidden = false;
}

setupOfferDialog();
setupOfferActions();
renderJobDetails();