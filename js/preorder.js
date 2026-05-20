    const PREORDER_ENDPOINT = "https://kkkcbkiolcfqfzosupiy.supabase.co/functions/v1/send-preorder-confirmation";
    const REQUEST_TIMEOUT_MS = 15000;
    const DEBUG_PREORDER = window.location.search.indexOf("debugPreorder") !== -1;

    function setPreorderStatus(element, message, type = "") {
        if (!element) {
            return;
        }

        element.textContent = message;
        element.className = "preorder-status";

        if (type) {
            element.classList.add(`is-${type}`);
        }
    }

    function logPreorderDebug(label, data) {
        if (!DEBUG_PREORDER) {
            return;
        }

        console.log(`[preorder] ${label}`, data || "");
    }

    if (DEBUG_PREORDER) {
        window.addEventListener("error", function (event) {
            console.error("[preorder] uncaught-error", {
                message: event.message,
                source: event.filename,
                line: event.lineno,
                column: event.colno,
                error: event.error
            });
        });

        window.addEventListener("unhandledrejection", function (event) {
            console.error("[preorder] unhandled-rejection", event.reason);
        });
    }

    function createTimeoutController(timeoutMs) {
        if (typeof AbortController !== "function") {
            return { signal: undefined, cancel: function () {} };
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(function () {
            controller.abort();
        }, timeoutMs);

        return {
            signal: controller.signal,
            cancel: function () {
                window.clearTimeout(timeoutId);
            }
        };
    }

    async function submitPreorder(payload) {
        if (typeof fetch !== "function") {
            throw new Error("Deze browser ondersteunt fetch niet. Gebruik een recente browser of laad een fetch-polyfill.");
        }

        const timeout = createTimeoutController(REQUEST_TIMEOUT_MS);
        let response;

        logPreorderDebug("request:start", {
            endpoint: PREORDER_ENDPOINT,
            payload: {
                fname: payload.fname,
                lname: payload.lname,
                email: payload.email ? "[ingevuld]" : "",
                design: payload.design,
                newsletter: payload.newsletter
            },
            userAgent: navigator.userAgent,
            online: navigator.onLine
        });

        try {
            response = await fetch(PREORDER_ENDPOINT, {
                method: "POST",
                mode: "cors",
                cache: "no-store",
                credentials: "omit",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
                signal: timeout.signal
            });
        } catch (error) {
            logPreorderDebug("request:network-error", error);

            if (error && error.name === "AbortError") {
                throw new Error("De aanvraag duurde te lang. Controleer je verbinding en probeer opnieuw.");
            }

            throw new Error("Netwerkfout bij verzenden. Controleer je internetverbinding, adblocker/privacy-instellingen of CORS-configuratie.");
        } finally {
            timeout.cancel();
        }

        const responseText = await response.text();
        let responseData = null;

        logPreorderDebug("response", {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            body: responseText
        });

        if (responseText) {
            try {
                responseData = JSON.parse(responseText);
            } catch (error) {
                responseData = responseText;
            }
        }

        if (!response.ok) {
            let errorMessage = `Supabase fout (${response.status} ${response.statusText}).`;

            if (responseData && typeof responseData === "object" && "message" in responseData) {
                errorMessage = `${errorMessage} ${responseData.message}`;
            } else if (responseData && typeof responseData === "object" && "error" in responseData) {
                errorMessage = `${errorMessage} ${responseData.error}`;
            } else if (typeof responseData === "string" && responseData.trim()) {
                errorMessage = `${errorMessage} ${responseData}`;
            }

            throw new Error(errorMessage);
        }

        return responseData;
    }

    function redirectToThankYouPage(payload) {
        const params = new URLSearchParams();

        if (payload.fname) {
            params.set("naam", payload.fname);
        }

        window.location.href = `pages/thank-you.html?${params.toString()}`;
    }

    function trackPreorderAnalytics(payload) {
        if (typeof window.trackAnalyticsEvent !== "function") {
            return;
        }

        window.trackAnalyticsEvent("generate_lead", {
            lead_type: "preorder",
            design: payload.design,
            newsletter_opt_in: payload.newsletter ? "yes" : "no"
        });

        window.trackAnalyticsEvent("preorder_submit", {
            design: payload.design,
            newsletter_opt_in: payload.newsletter ? "yes" : "no"
        });

        if (payload.newsletter) {
            window.trackAnalyticsEvent("sign_up", {
                method: "preorder_form",
                form_type: "newsletter"
            });

            window.trackAnalyticsEvent("newsletter_signup", {
                source: "preorder_form",
                design: payload.design
            });
        }
    }

    function setupPreorderForm() {
        const form = document.getElementById("preorder-form");
        const status = document.getElementById("preorder-status");

        if (!form || !status) {
            return;
        }

        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const submitButton = form.querySelector('button[type="submit"]');
            const formData = new FormData(form);
            const payload = {
                fname: String(formData.get("fname") || "").trim(),
                lname: String(formData.get("lname") || "").trim(),
                email: String(formData.get("email") || "").trim().toLowerCase(),
                design: String(formData.get("design") || "").trim(),
                newsletter: formData.get("newsletter") === "on"
            };

            const isValid =
                [payload.fname, payload.lname, payload.email, payload.design]
                    .every(function (v) {
                        return typeof v === "string" && v.trim().length > 0;
                    });

            if (!isValid) {
                setPreorderStatus(status, "Vul alle velden in voordat je verzendt.", "error");
                return;
            }


            if (submitButton) {
                submitButton.disabled = true;
            }

            setPreorderStatus(status, "Je gegevens worden opgeslagen...", "loading");

            try {
                const insertedRows = await submitPreorder(payload);
                console.log("Preorder verwerkt:", insertedRows);
                trackPreorderAnalytics(payload);
                form.reset();
                setPreorderStatus(status, "Je pre-order is opgeslagen. Je wordt doorgestuurd...", "success");
                redirectToThankYouPage(payload);
            } catch (error) {
                setPreorderStatus(
                    status,
                    error instanceof Error ? error.message : "Er ging iets mis bij het versturen van het formulier.",
                    "error"
                );
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                }
            }
        });

        form.addEventListener("reset", function () {
            setPreorderStatus(status, "");
        });
    }

    document.addEventListener("DOMContentLoaded", setupPreorderForm);
