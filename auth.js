const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s().-]{7,20}$/;
const PROFILE_STORAGE_KEY = 'worknearUser';
const SESSION_STORAGE_KEY = 'worknearSession';

function setFieldError(input, message) {
    const field = input.closest('.auth-field');
    const error = field?.querySelector('.field-error');

    if (error) {
        error.textContent = message;
    }
    input.setAttribute('aria-invalid', String(Boolean(message)));
}

function clearFieldError(input) {
    setFieldError(input, '');
}

function setupLogin() {
    const form = document.querySelector('#login-form');
    const identifier = document.querySelector('#login-identifier');
    const password = document.querySelector('#login-password');
    const message = document.querySelector('#login-message');

    form.querySelectorAll('input').forEach((input) => {
        input.addEventListener('input', () => clearFieldError(input));
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        let firstInvalid = null;
        const identifierValue = identifier.value.trim();
        const passwordValue = password.value;

        if (!identifierValue) {
            setFieldError(identifier, 'Enter your email address or phone number.');
            firstInvalid = identifier;
        } else if (identifierValue.includes('@') && !EMAIL_PATTERN.test(identifierValue)) {
            setFieldError(identifier, 'Enter a valid email address.');
            firstInvalid = identifier;
        } else if (!identifierValue.includes('@') && !PHONE_PATTERN.test(identifierValue)) {
            setFieldError(identifier, 'Enter a valid phone number or email address.');
            firstInvalid = identifier;
        } else {
            clearFieldError(identifier);
        }

        if (!passwordValue) {
            setFieldError(password, 'Enter your password.');
            firstInvalid ??= password;
        } else {
            clearFieldError(password);
        }

        if (firstInvalid) {
            message.hidden = true;
            firstInvalid.focus();
            return;
        }

        message.textContent = 'Sign-in is a preview and is not connected yet. Create an account to try the role-based flow.';
        message.hidden = false;
    });

    document.querySelector('#forgot-password').addEventListener('click', () => {
        message.textContent = 'Password reset will be available when authentication is connected.';
        message.hidden = false;
    });
}

function setupRegistration() {
    const roleChooser = document.querySelector('#role-chooser');
    const roleInputs = [...document.querySelectorAll('input[name="role"]')];
    const roleError = document.querySelector('#role-error');
    const form = document.querySelector('#register-form');
    const workerFields = document.querySelector('#worker-fields');
    const workerCategory = document.querySelector('#register-category');
    const customerPhoto = document.querySelector('#customer-photo');
    const successPanel = document.querySelector('#register-success');
    const dashboardLink = document.querySelector('#dashboard-link');
    const successDetail = document.querySelector('#register-success-detail');

    function selectRole(role) {
        form.dataset.role = role;
        form.hidden = false;
        workerFields.hidden = role !== 'worker';
        customerPhoto.hidden = role !== 'customer';
        workerCategory.required = role === 'worker';
        document.querySelector('#register-submit').textContent = `Create ${role === 'worker' ? 'Worker' : 'Customer'} Account`;
        roleError.textContent = '';
    }

    roleInputs.forEach((input) => {
        input.addEventListener('change', () => selectRole(input.value));
    });

    form.querySelectorAll('input, select, textarea').forEach((input) => {
        input.addEventListener('input', () => clearFieldError(input));
        input.addEventListener('change', () => clearFieldError(input));
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const role = form.dataset.role;
        if (!role) {
            roleError.textContent = 'Choose Customer or Worker to continue.';
            return;
        }

        const name = document.querySelector('#register-name');
        const phone = document.querySelector('#register-phone');
        const email = document.querySelector('#register-email');
        const password = document.querySelector('#register-password');
        const confirmPassword = document.querySelector('#register-confirm-password');
        const location = document.querySelector('#register-location');
        const requiredFields = [name, phone, email, password, confirmPassword, location];
        let firstInvalid = null;

        requiredFields.forEach((input) => {
            let error = '';
            if (!input.value.trim()) {
                error = 'This field is required.';
            } else if (input === phone && !PHONE_PATTERN.test(input.value.trim())) {
                error = 'Enter a valid phone number.';
            } else if (input === email && !EMAIL_PATTERN.test(input.value.trim())) {
                error = 'Enter a valid email address.';
            } else if (input === password && input.value.length < 8) {
                error = 'Use at least 8 characters.';
            } else if (input === confirmPassword && input.value !== password.value) {
                error = 'Passwords do not match.';
            }

            setFieldError(input, error);
            if (error && !firstInvalid) {
                firstInvalid = input;
            }
        });

        if (role === 'worker' && !workerCategory.value) {
            setFieldError(workerCategory, 'Choose your work category.');
            firstInvalid ??= workerCategory;
        } else {
            clearFieldError(workerCategory);
        }

        if (firstInvalid) {
            firstInvalid.focus();
            return;
        }

        const profile = {
            name: name.value.trim(),
            email: email.value.trim(),
            phone: phone.value.trim(),
            role,
            location: location.value.trim()
        };

        if (role === 'worker') {
            profile.category = workerCategory.value;
            const experience = document.querySelector('#register-experience').value.trim();
            const bio = document.querySelector('#register-bio').value.trim();
            if (experience) profile.experience = experience;
            if (bio) profile.bio = bio;
        }

        let storageSucceeded = true;
        try {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
                email: profile.email,
                role: profile.role
            }));
        } catch {
            storageSucceeded = false;
        }

        dashboardLink.href = role === 'worker' ? 'worker-dashboard.html' : 'customer-dashboard.html';
        successDetail.textContent = storageSucceeded
            ? 'Your demo profile is saved in this browser only.'
            : 'Your account preview is ready, but browser storage is unavailable on this device.';
        roleChooser.hidden = true;
        form.hidden = true;
        document.querySelector('.register-switch').hidden = true;
        document.querySelector('.auth-demo-note').hidden = true;
        successPanel.hidden = false;
        successPanel.querySelector('h3').focus();
    });

    const requestedRole = new URLSearchParams(window.location.search).get('role');
    const preselectedRole = roleInputs.find((input) => input.value === requestedRole);
    if (preselectedRole) {
        preselectedRole.checked = true;
        selectRole(preselectedRole.value);
    }
}

function setupDashboardPlaceholder() {
    const requestedRole = document.body.dataset.role;
    const welcome = document.querySelector('#dashboard-welcome');

    try {
        const profile = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || 'null');
        if (profile?.role === requestedRole) {
            welcome.textContent = `Welcome, ${profile.name}. Your ${requestedRole} dashboard will be built in a later step.`;
        }
    } catch {
        welcome.textContent = 'This dashboard is a placeholder for a future step.';
    }
}

const page = document.body.dataset.page;
if (page === 'login') {
    setupLogin();
} else if (page === 'register') {
    setupRegistration();
} else if (page === 'dashboard') {
    setupDashboardPlaceholder();
}