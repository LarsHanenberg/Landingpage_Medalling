const GA_MEASUREMENT_ID = "G-44BLRLP6CE";

function setupGoogleAnalytics(measurementId) {
    const trimmedId = measurementId.trim();
    const hasPlaceholderId = trimmedId === "G-XXXXXXXXXX";

    if (!trimmedId || hasPlaceholderId) {
        console.info(
            "Google Analytics staat klaar, maar is nog niet actief. Vervang GA_MEASUREMENT_ID in js/analytics.js door je eigen G-meet-ID."
        );
        return;
    }

    window.dataLayer = window.dataLayer || [];

    function gtag() {
        window.dataLayer.push(arguments);
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(trimmedId)}`;
    document.head.appendChild(script);

    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", trimmedId);
}

// Laad analytics pas na pagina-interactie zodat LCP niet vertraagd wordt
function loadAnalyticsOnInteraction() {
    setupGoogleAnalytics(GA_MEASUREMENT_ID);
    ["click", "scroll", "keydown", "touchstart"].forEach(function(e) {
        document.removeEventListener(e, loadAnalyticsOnInteraction);
    });
}

if ("requestIdleCallback" in window) {
    requestIdleCallback(function() {
        ["click", "scroll", "keydown", "touchstart"].forEach(function(e) {
            document.addEventListener(e, loadAnalyticsOnInteraction, { once: true, passive: true });
        });
        // Laad uiterlijk na 4 seconden alsnog
        setTimeout(function() { setupGoogleAnalytics(GA_MEASUREMENT_ID); }, 4000);
    });
} else {
    setTimeout(function() { setupGoogleAnalytics(GA_MEASUREMENT_ID); }, 3000);
}

function trackAnalyticsEvent(eventName, parameters = {}) {
    if (typeof window.gtag !== "function") {
        return;
    }

    window.gtag("event", eventName, parameters);
}

window.trackAnalyticsEvent = trackAnalyticsEvent;
