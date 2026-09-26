const POST_DRAFT_KEY = 'worknearPostJobDraft';
const postForm = document.querySelector('#post-job-form');
const budgetTypeSelect = document.querySelector('#budget-type');
const fixedAmountInput = document.querySelector('#fixed-budget');
const minimumAmountInput = document.querySelector('#minimum-budget');
const maximumAmountInput = document.querySelector('#maximum-budget');
const publishButton = document.querySelector('#publish-job');

function setPostError(id, message) {
    const input = document.querySelector(`#${id}`);
    const error = document.querySelector(`#${id}-error`);
    input?.setAttribute('aria-invalid', String(Boolean(message)));
    if (error) error.textContent = message;
}

function updateBudgetInputs() {
    const isFixed = budgetTypeSelect.value === 'Fixed Budget';
    document.querySelector('#fixed-budget-field').hidden = !isFixed;
    document.querySelectorAll('.budget-range-field').forEach((field) => { field.hidden = isFixed; });
    fixedAmountInput.required = isFixed;
    minimumAmountInput.required = !isFixed;
    maximumAmountInput.required = !isFixed;
}

function saveDraft() {
    try { sessionStorage.setItem(POST_DRAFT_KEY, JSON.stringify(Object.fromEntries(new FormData(postForm).entries()))); }
    catch { /* Draft persistence is optional. */ }
}

function restoreDraft() {
    try {
        const draft = JSON.parse(sessionStorage.getItem(POST_DRAFT_KEY) || 'null');
        if (!draft) return;
        for (const [name, value] of Object.entries(draft)) {
            const control = postForm.elements.namedItem(name);
            if (control && typeof value === 'string') control.value = value;
        }
    } catch { sessionStorage.removeItem(POST_DRAFT_KEY); }
}

function validatePostForm() {
    const required = [
        ['job-title', 'Please enter a job title.'],
        ['job-category', 'Please select a category.'],
        ['job-description', 'Please describe the work.'],
        ['job-location', 'Please enter your location.'],
        ['job-date', 'Please select a preferred date.'],
        ['job-time', 'Please select a preferred time.']
    ];
    let firstInvalid = null;
    required.forEach(([id, message]) => {
        const control = document.querySelector(`#${id}`);
        const error = control.value.trim() ? '' : message;
        setPostError(id, error);
        if (error && !firstInvalid) firstInvalid = control;
    });
    if (budgetTypeSelect.value === 'Fixed Budget') {
        const value = Number(fixedAmountInput.value);
        const error = Number.isFinite(value) && value > 0 ? '' : 'Please enter a valid budget.';
        setPostError('fixed-budget', error);
        if (error && !firstInvalid) firstInvalid = fixedAmountInput;
    } else {
        const min = Number(minimumAmountInput.value);
        const max = Number(maximumAmountInput.value);
        const minError = Number.isFinite(min) && min > 0 ? '' : 'Please enter a valid budget.';
        const maxError = !Number.isFinite(max) || max <= 0 ? 'Please enter a valid budget.' : (!minError && max < min ? 'Maximum must be at least the minimum.' : '');
        setPostError('minimum-budget', minError);
        setPostError('maximum-budget', maxError);
        if ((minError || maxError) && !firstInvalid) firstInvalid = minError ? minimumAmountInput : maximumAmountInput;
    }
    firstInvalid?.focus();
    return !firstInvalid;
}

function publishPost() {
    if (!validatePostForm()) return;
    publishButton.disabled = true;
    publishButton.textContent = 'Publishing...';
    window.setTimeout(() => {
        const fixed = budgetTypeSelect.value === 'Fixed Budget';
        const amount = Number(fixedAmountInput.value);
        let profile = null;
        try { profile = JSON.parse(localStorage.getItem('worknearUser') || 'null'); } catch { profile = null; }
        const job = {
            id: globalThis.crypto?.randomUUID?.() || `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: document.querySelector('#job-title').value.trim(),
            category: document.querySelector('#job-category').value,
            description: document.querySelector('#job-description').value.trim(),
            location: document.querySelector('#job-location').value.trim(),
            landmark: document.querySelector('#job-landmark').value.trim(),
            date: document.querySelector('#job-date').value,
            time: document.querySelector('#job-time').value,
            urgency: document.querySelector('#job-urgency').value,
            budgetType: budgetTypeSelect.value,
            minBudget: fixed ? amount : Number(minimumAmountInput.value),
            maxBudget: fixed ? amount : Number(maximumAmountInput.value),
            budget: fixed ? amount : Number(maximumAmountInput.value),
            requirements: document.querySelector('#job-requirements').value.split(/\n|,/).map((value) => value.trim()).filter(Boolean),
            experience: document.querySelector('#worker-experience').value,
            status: 'Open',
            offerCount: 0,
            distanceKm: null,
            customerName: profile?.role === 'customer' ? profile.name : 'WorkNear Customer',
            customerId: profile?.role === 'customer' ? profile.email : null,
            createdAt: new Date().toISOString(),
            postedLabel: 'Just now'
        };
        try {
            WorkNearJobs.saveCustomerJob(job);
            sessionStorage.removeItem(POST_DRAFT_KEY);
            document.querySelector('#success-job-title').textContent = job.title;
            document.querySelector('#success-job-id').textContent = job.id;
            document.querySelector('#view-my-job').href = `job-details.html?id=${encodeURIComponent(job.id)}&from=customer`;
            postForm.hidden = true;
            document.querySelector('#post-success').hidden = false;
            document.querySelector('#post-success h2').focus();
        } catch {
            const error = document.querySelector('#post-form-error');
            error.textContent = 'The job could not be saved in this browser. Please try again.';
            error.hidden = false;
            publishButton.disabled = false;
            publishButton.textContent = 'Post Job';
        }
    }, 160);
}

function setupPostForm() {
    restoreDraft();
    document.querySelector('#job-date').min = new Date().toISOString().slice(0, 10);
    updateBudgetInputs();
    document.querySelector('#description-count').textContent = String(document.querySelector('#job-description').value.length);
    postForm.addEventListener('input', (event) => {
        if (event.target.id === 'job-description') document.querySelector('#description-count').textContent = String(event.target.value.length);
        saveDraft();
    });
    postForm.addEventListener('change', () => { updateBudgetInputs(); saveDraft(); });
    postForm.addEventListener('submit', (event) => { event.preventDefault(); publishPost(); });
    budgetTypeSelect.addEventListener('change', updateBudgetInputs);
    document.querySelector('#cancel-post').addEventListener('click', (event) => {
        const hasDraft = [...postForm.querySelectorAll('input, textarea')].some((field) => field.value.trim())
            || document.querySelector('#job-category').value !== ''
            || budgetTypeSelect.value !== 'Fixed Budget'
            || document.querySelector('#job-urgency').value !== 'Flexible'
            || document.querySelector('#worker-experience').value !== 'Any experience';
        if (hasDraft && !window.confirm('Discard this job draft and return to your dashboard?')) event.preventDefault();
        else sessionStorage.removeItem(POST_DRAFT_KEY);
    });
}

setupPostForm();