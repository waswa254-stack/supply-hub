const USERS_KEY = "supplyHubUsers";

function readUsers() {
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function showMessage(element, text, type = "info") {
    if (!element) return;

    element.textContent = text;
    element.style.color = type === "error" ? "#dc2626" : type === "success" ? "#16a34a" : "#374151";
    element.style.marginTop = "12px";
    element.style.fontSize = "0.9rem";
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function authEndpoint(fileName) {
    if (window.location.protocol === "file:") {
        return `http://localhost/SUPPLY-HUB/auth/${fileName}`;
    }

    return new URL(`auth/${fileName}`, document.baseURI).toString();
}

function appUrl(path) {
    const baseUrl = window.location.protocol === "file:"
        ? "http://localhost/SUPPLY-HUB/"
        : document.baseURI;

    return new URL(path, baseUrl).toString();
}

async function readApiResponse(response) {
    const body = await response.text();
    try {
        return JSON.parse(body);
    } catch (error) {
        return {
            message: response.ok
                ? "The server returned an unreadable response."
                : `Server error (${response.status}). Check that Apache and MySQL are running.`
        };
    }
}

function attachRegisterHandler() {
    const forms = [...document.querySelectorAll("form")];
    const registerForm = forms.find((form) => {
        return form.querySelector("#register-name");
    });

    if (!registerForm) return;

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const fullName = registerForm.querySelector("#register-name")?.value.trim();
        const email = registerForm.querySelector("#register-email")?.value.trim();
        const phone = registerForm.querySelector("#register-phone")?.value.trim();
        const accountType = registerForm.querySelector("#account-type")?.value.trim();
        const paymentConfirmed = phone !== "";
        const paymentPhone = phone;
        const password = registerForm.querySelector("#register-password")?.value;
        const confirmPassword = registerForm.querySelector("#register-confirm-password")?.value;

        const messageBox = document.getElementById("registerMessage");

        if (!fullName || !email || !phone || !accountType || !password || !confirmPassword) {
            showMessage(messageBox, "Please fill in all fields.", "error");
            return;
        }

        if (!validateEmail(email)) {
            showMessage(messageBox, "Please enter a valid email address.", "error");
            return;
        }

        if (password.length < 6) {
            showMessage(messageBox, "Password must be at least 6 characters long.", "error");
            return;
        }

        if (password !== confirmPassword) {
            showMessage(messageBox, "Passwords do not match.", "error");
            return;
        }

        if (!paymentConfirmed) {
            showMessage(messageBox, "Use the same phone number for both registration and payment to complete the signup.", "error");
            return;
        }

        try {
            const response = await fetch(authEndpoint("register.php"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, email, phone, accountType, password, paymentPhone, paymentConfirmed })
            });
            const result = await readApiResponse(response);

            if (!response.ok) {
                showMessage(messageBox, result.message || "Registration failed.", "error");
                return;
            }

            showMessage(messageBox, result.message, "success");
            registerForm.reset();
            setTimeout(() => {
                window.location.href = appUrl(result.redirect || "login.html");
            }, 900);
        } catch (error) {
            showMessage(messageBox, "Cannot reach Supply Hub. Start Apache and MySQL in XAMPP, then open http://localhost/SUPPLY-HUB/.", "error");
        }
    });
}

function attachLoginHandler() {
    const forms = [...document.querySelectorAll("form")];
    const loginForm = forms.find((form) => {
        const inputs = [...form.querySelectorAll("input")];
        return inputs.some((input) => input.type === "email") && inputs.some((input) => input.type === "password");
    });

    if (!loginForm) return;

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const emailInput = loginForm.querySelector("input[type='email']");
        const passwordInput = loginForm.querySelector("input[type='password']");
        const messageBox = document.getElementById("loginMessage");

        if (!emailInput || !passwordInput) return;

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            showMessage(messageBox, "Email and password are required.", "error");
            return;
        }

        try {
            const response = await fetch(authEndpoint("login.php"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const result = await readApiResponse(response);

            if (!response.ok) {
                showMessage(messageBox, result.message || "Invalid email or password.", "error");
                return;
            }

            showMessage(messageBox, result.message, "success");
            loginForm.reset();
            const targetPage = result.redirect || "login.html";
            const absoluteTarget = appUrl(targetPage);
            window.location.assign(absoluteTarget);
        } catch (error) {
            showMessage(messageBox, "Cannot reach Supply Hub. Start Apache and MySQL in XAMPP, then open http://localhost/SUPPLY-HUB/.", "error");
        }
    });
}

function attachPasswordToggles() {
    const eyeIcon = '<svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
    const eyeOffIcon = '<svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.1 3.8M6.2 6.8C3.9 8.4 2.5 12 2.5 12s3.5 6 9.5 6c1.2 0 2.3-.2 3.2-.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

    document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
        toggle.addEventListener("click", () => {
            const input = document.getElementById(toggle.dataset.passwordToggle);
            if (!input) return;

            const isVisible = input.type === "text";
            input.type = isVisible ? "password" : "text";
            toggle.innerHTML = isVisible ? eyeIcon : eyeOffIcon;
            toggle.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
        });
    });
}

function attachRoleFeeHint() {
    const roleSelect = document.getElementById("account-type");
    const feeText = document.getElementById("registrationFee");
    const roleHelp = document.getElementById("roleHelp");
    if (!roleSelect || !feeText || !roleHelp) return;

    const fees = {
        rider: "Ksh 100",
        supplier: "Ksh 500",
        wholesaler: "Ksh 300",
        retailer: "Ksh 200"
    };

    roleSelect.addEventListener("change", () => {
        const role = roleSelect.value;
        feeText.textContent = fees[role] || "the applicable fee";
        roleHelp.textContent = role
            ? `${role.charAt(0).toUpperCase()}${role.slice(1)} account selected.`
            : "Select a role to see the registration fee.";
    });
}

function attachHomepageInteractions() {
    const homePage = document.querySelector(".hero");
    if (!homePage) return;

    const navToggle = document.querySelector(".nav-toggle");
    const navMenu = document.querySelector(".nav-menu");
    const backToTop = document.querySelector(".back-to-top");
    const roleTabs = [...document.querySelectorAll(".role-tab")];
    const serviceCards = [...document.querySelectorAll(".service-card")];
    const roleAnswer = document.querySelector(".role-answer");
    const roleLink = document.querySelector(".role-link");
    const previewTabs = [...document.querySelectorAll(".preview-tab")];
    const previewTitle = document.getElementById("previewTitle");
    const previewGrowth = document.getElementById("previewGrowth");
    const previewPrimaryMetric = document.getElementById("previewPrimaryMetric");
    const previewPrimaryLabel = document.getElementById("previewPrimaryLabel");
    const previewSecondaryMetric = document.getElementById("previewSecondaryMetric");
    const previewSecondaryLabel = document.getElementById("previewSecondaryLabel");
    const previewRouteTitle = document.getElementById("previewRouteTitle");
    const previewRouteText = document.getElementById("previewRouteText");
    const previewRouteStatus = document.getElementById("previewRouteStatus");
    const previewBars = [...document.querySelectorAll(".preview-chart span")];
    const searchForm = document.querySelector(".site-search");
    const searchInput = document.getElementById("site-search-input");
    const searchResults = document.getElementById("search-results");
    const roleMessages = {
        supplier: "List your products, manage inventory, and reach reliable buyers.",
        wholesaler: "Find trusted products, place bulk orders, and simplify replenishment.",
        retailer: "Discover products, manage stock, and keep your customers supplied.",
        rider: "Receive delivery requests, collect orders, and deliver them efficiently."
    };

    const searchAnswers = [
        {
            terms: ["supplier", "sell", "list", "product", "stock"],
            title: "For suppliers",
            answer: "Suppliers can list products, manage inventory, and reach reliable buyers.",
            target: "#services"
        },
        {
            terms: ["wholesaler", "bulk", "buy", "replenish"],
            title: "For wholesalers",
            answer: "Wholesalers can discover trusted products and place bulk orders.",
            target: "#services"
        },
        {
            terms: ["retailer", "shop", "store", "retail"],
            title: "For retailers",
            answer: "Retailers can find products, manage stock, and keep their customers supplied.",
            target: "#services"
        },
        {
            terms: ["rider", "delivery", "deliver", "transport"],
            title: "For riders",
            answer: "Riders receive delivery requests, collect orders, and deliver them efficiently.",
            target: "#services"
        },
        {
            terms: ["fee", "price", "cost", "payment", "mpesa", "m-pesa", "register"],
            title: "Registration and payment",
            answer: "Registration fees depend on your role. Payment instructions appear during registration.",
            target: "register.html"
        },
        {
            terms: ["how", "work", "about", "platform"],
            title: "How Supply Hub works",
            answer: "Supply Hub connects suppliers, wholesalers, retailers, and riders in one workflow.",
            target: "#about"
        }
    ];

    searchForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const question = searchInput?.value.trim().toLowerCase() || "";
        if (!question || !searchResults) return;

        const matchingAnswer = searchAnswers.find((item) => item.terms.some((term) => question.includes(term)));
        const result = matchingAnswer || {
            title: "Try a Supply Hub topic",
            answer: "Ask about suppliers, wholesalers, retailers, riders, deliveries, registration fees, or how it works.",
            target: "#services"
        };

        searchResults.innerHTML = `<strong>${result.title}</strong><span>${result.answer}</span><a href="${result.target}">${result.target === "register.html" ? "View registration" : "Explore this section"} →</a>`;
        searchResults.classList.add("is-visible");

        searchResults.querySelector("a")?.addEventListener("click", () => {
            searchResults.classList.remove("is-visible");
        });
    });

    searchInput?.addEventListener("input", () => {
        if (!searchInput.value.trim()) searchResults?.classList.remove("is-visible");
    });

    const previewViews = {
        overview: {
            title: "Supply overview",
            growth: "+18.4%",
            primary: ["1,248", "Products listed"],
            secondary: ["326", "Orders moving"],
            route: ["Next delivery", "Westlands · arriving today", "On route"],
            bars: [38, 54, 44, 68, 58, 82, 74]
        },
        orders: {
            title: "Order activity",
            growth: "+12.6%",
            primary: ["326", "Active orders"],
            secondary: ["94%", "Fulfilled on time"],
            route: ["Latest order", "12 items · ready to dispatch", "Ready"],
            bars: [42, 62, 50, 76, 64, 70, 86]
        },
        delivery: {
            title: "Delivery network",
            growth: "+9.2%",
            primary: ["48", "Riders active"],
            secondary: ["86", "Routes completed"],
            route: ["Rider network", "All zones · 6 nearby", "Available"],
            bars: [30, 46, 58, 52, 72, 66, 90]
        }
    };

    previewTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const view = previewViews[tab.dataset.preview];
            if (!view) return;

            previewTabs.forEach((previewTab) => {
                const isActive = previewTab === tab;
                previewTab.classList.toggle("is-active", isActive);
                previewTab.setAttribute("aria-selected", String(isActive));
            });

            if (previewTitle) previewTitle.textContent = view.title;
            if (previewGrowth) previewGrowth.textContent = view.growth;
            if (previewPrimaryMetric) previewPrimaryMetric.textContent = view.primary[0];
            if (previewPrimaryLabel) previewPrimaryLabel.textContent = view.primary[1];
            if (previewSecondaryMetric) previewSecondaryMetric.textContent = view.secondary[0];
            if (previewSecondaryLabel) previewSecondaryLabel.textContent = view.secondary[1];
            if (previewRouteTitle) previewRouteTitle.textContent = view.route[0];
            if (previewRouteText) previewRouteText.textContent = view.route[1];
            if (previewRouteStatus) previewRouteStatus.textContent = view.route[2];
            previewBars.forEach((bar, index) => {
                bar.style.height = `${view.bars[index]}%`;
            });
        });
    });

    navToggle?.addEventListener("click", () => {
        const isOpen = navMenu?.classList.toggle("is-open") || false;
        navToggle.setAttribute("aria-expanded", String(isOpen));
        navToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    });

    navMenu?.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            navMenu.classList.remove("is-open");
            navToggle?.setAttribute("aria-expanded", "false");
            navToggle?.setAttribute("aria-label", "Open navigation menu");
        });
    });

    roleTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const targetRole = tab.dataset.roleTarget;
            roleTabs.forEach((roleTab) => {
                const isActive = roleTab === tab;
                roleTab.classList.toggle("is-active", isActive);
                roleTab.setAttribute("aria-selected", String(isActive));
            });

            serviceCards.forEach((card) => {
                const isActiveCard = card.dataset.role === targetRole;
                card.classList.toggle("is-active", isActiveCard);
            });

            if (roleAnswer && targetRole) {
                roleAnswer.textContent = roleMessages[targetRole] || "Choose the role that matches your work.";
            }
            if (roleLink) {
                roleLink.textContent = "Create your account";
                roleLink.href = "register.html";
            }
        });
    });

    const revealItems = document.querySelectorAll(".service-card, .role-selector, .stat, .about-step, .faq-section, .cta-section");
    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12 });

        revealItems.forEach((item) => {
            item.classList.add("reveal");
            revealObserver.observe(item);
        });
    }

    window.addEventListener("scroll", () => {
        backToTop?.classList.toggle("is-visible", window.scrollY > 500);
    }, { passive: true });

    backToTop?.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

function attachDashboardInteractions() {
    const toast = document.querySelector('.toast');
    let toastTimer;

    document.querySelectorAll('[data-table-search]').forEach((input) => {
        input.addEventListener('input', () => {
            const table = document.getElementById(input.dataset.tableSearch);
            table?.querySelectorAll('tbody tr').forEach((row) => {
                row.hidden = !row.textContent.toLowerCase().includes(input.value.toLowerCase());
            });
        });
    });

    document.querySelectorAll('[data-card-search]').forEach((input) => {
        input.addEventListener('input', () => {
            const list = document.getElementById(input.dataset.cardSearch);
            list?.querySelectorAll('[data-search-text]').forEach((card) => {
                card.hidden = !card.dataset.searchText.includes(input.value.toLowerCase());
            });
        });
    });

    document.querySelectorAll('[data-toast]').forEach((button) => {
        button.addEventListener('click', () => {
            if (!toast) return;
            toast.textContent = button.dataset.toast;
            toast.classList.add('is-visible');
            window.clearTimeout(toastTimer);
            toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
        });
    });

    document.querySelector('[data-availability]')?.addEventListener('click', (event) => {
        const button = event.currentTarget;
        const isAvailable = button.classList.toggle('is-on');
        button.setAttribute('aria-pressed', String(isAvailable));
        button.lastChild.textContent = isAvailable ? ' Available for runs' : ' Offline';
    });
}

function initApp() {
    attachRegisterHandler();
    attachLoginHandler();
    attachPasswordToggles();
    attachRoleFeeHint();
    attachHomepageInteractions();
    attachDashboardInteractions();
}

document.addEventListener("DOMContentLoaded", initApp);