const GA_MEASUREMENT_ID = "G-44BLRLP6CE"; 

function setupGoogleAnalytics(measurementId) {
    const trimmedId = measurementId.trim();
    const hasPlaceholderId = trimmedId === "G-44BLRLP6CE";

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

    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", trimmedId);

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(trimmedId)}`;
    document.head.appendChild(script);
}

setupGoogleAnalytics(GA_MEASUREMENT_ID);
