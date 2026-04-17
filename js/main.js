function normalizePath(path) {
    if (!path || path === "/") {
        return "/index.html";
    }

    return path.endsWith("/") ? `${path}index.html` : path;
}

function makeRelativePath(targetPath) {
    const currentPath = normalizePath(window.location.pathname);
    const prefix = currentPath.toLowerCase().includes("/pages/") ? "../" : "";
    return `${prefix}${targetPath.replace(/^\//, "")}`;
}

function markActiveLinks(links) {
    const currentPath = normalizePath(window.location.pathname);

    links.forEach((link) => {
        const linkPath = normalizePath(new URL(link.href, window.location.href).pathname);
        const isActive = linkPath === currentPath;
        link.classList.toggle("is-active", isActive);
        if (isActive) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });
}

function setupSmoothScroll() {
    document.querySelectorAll('a[href*="#"]').forEach((anchor) => {
        anchor.addEventListener("click", (event) => {
            const href = anchor.getAttribute("href");
            if (!href || href === "#") {
                return;
            }

            const [base, hash] = href.split("#");
            if (base && base.length > 0) {
                const linkPath = normalizePath(new URL(anchor.href, window.location.href).pathname);
                const currentPath = normalizePath(window.location.pathname);
                if (linkPath !== currentPath) {
                    return;
                }
            }

            const target = document.getElementById(hash);
            if (!target) {
                return;
            }

            event.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });
}

function setupPreorderAnchor() {
    if (document.getElementById("preorder")) {
        return;
    }

    const preorderHeading = Array.from(document.querySelectorAll("main h1")).find((heading) =>
        heading.textContent.toLowerCase().includes("pre-order lijst")
    );

    const preorderSection = preorderHeading?.closest('div[style*="display: flex"]');
    if (preorderSection) {
        preorderSection.id = "preorder";
    }
}

function setupHeroNextAnchor() {
    if (document.getElementById("hero-next")) {
        return;
    }

    const missionHeading = Array.from(document.querySelectorAll("main h1")).find((heading) =>
        heading.textContent.toLowerCase().includes("onze missie")
    );

    const nextSection = missionHeading?.closest('div[style*="text-align: center"][style*="gap: 40px"]');
    if (nextSection) {
        nextSection.id = "hero-next";
    }
}

function setupHeader(header) {
    if (!header) {
        return;
    }

    const wrapper = header.firstElementChild;
    if (!wrapper) {
        return;
    }

    const firstImage = header.querySelector("img");
    if (firstImage && !firstImage.closest("a")) {
        const brandLink = document.createElement("a");
        brandLink.href = makeRelativePath("/index.html");
        brandLink.className = "brand-link";
        brandLink.setAttribute("aria-label", "Ga naar home");
        firstImage.parentNode.insertBefore(brandLink, firstImage);
        brandLink.appendChild(firstImage);
    }

    let nav = header.querySelector(".site-nav");
    if (!nav) {
        nav = wrapper.querySelector("div:last-child");
        if (nav) {
            nav.classList.add("site-nav");
        }
    }

    if (!nav) {
        return;
    }

    nav.id = nav.id || "site-navigation";

    const existingLabels = Array.from(nav.querySelectorAll("a")).map((link) =>
        link.textContent.trim().toLowerCase()
    );

    if (!existingLabels.includes("home")) {
        const homeLink = document.createElement("a");
        homeLink.href = makeRelativePath("/index.html");
        homeLink.textContent = "Home";
        nav.insertBefore(homeLink, nav.firstChild);
    }

    Array.from(nav.querySelectorAll("a")).forEach((link) => {
        const text = link.textContent.trim().toLowerCase();
        if (text === "over ons" || text === "over ons ") {
            link.textContent = "Over Ons";
        }
    });

    if (!header.querySelector(".menu-toggle")) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "menu-toggle";
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-controls", nav.id);
        toggle.setAttribute("aria-label", "Open navigatiemenu");
        toggle.innerHTML = '<span class="menu-toggle__label">Menu</span><span class="menu-toggle__chevron" aria-hidden="true"></span>';

        toggle.addEventListener("click", () => {
            const isOpen = header.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", String(isOpen));
            toggle.setAttribute("aria-label", isOpen ? "Sluit navigatiemenu" : "Open navigatiemenu");
        });

        wrapper.appendChild(toggle);

        nav.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                header.classList.remove("is-open");
                toggle.setAttribute("aria-expanded", "false");
                toggle.setAttribute("aria-label", "Open navigatiemenu");
            });
        });

        document.addEventListener("click", (event) => {
            if (!header.classList.contains("is-open")) {
                return;
            }

            if (header.contains(event.target)) {
                return;
            }

            header.classList.remove("is-open");
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Open navigatiemenu");
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 768 && header.classList.contains("is-open")) {
                header.classList.remove("is-open");
                toggle.setAttribute("aria-expanded", "false");
                toggle.setAttribute("aria-label", "Open navigatiemenu");
            }
        });
    }

    markActiveLinks(nav.querySelectorAll("a"));
}

document.addEventListener("DOMContentLoaded", () => {
    setupHeader(document.querySelector(".site-header"));
    setupPreorderAnchor();
    setupHeroNextAnchor();
    setupSmoothScroll();
});
