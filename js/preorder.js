    const SUPABASE_URL = "https://kkkcbkiolcfqfzosupiy.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_L1YZ7Kji3dR2Bf5rHds5iw_C_ADWVCb";
    const SUPABASE_TABLE = "preorders";
    const CONFIRMATION_EMAIL_ENDPOINT = `${SUPABASE_URL}/functions/v1/send-preorder-confirmation`;

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

    async function submitPreorder(payload) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                Prefer: "return=representation"
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        let responseData = null;

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
            } else if (typeof responseData === "string" && responseData.trim()) {
                errorMessage = `${errorMessage} ${responseData}`;
            }

            throw new Error(errorMessage);
        }

        return responseData;
    }

    async function sendConfirmationEmail(payload) {
        if (!CONFIRMATION_EMAIL_ENDPOINT) {
            return;
        }

        const response = await fetch(CONFIRMATION_EMAIL_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                to: payload.email,
                fname: payload.fname,
                lname: payload.lname,
                design: payload.design
            })
        });

        if (!response.ok) {
            throw new Error(`Bevestigingsmail kon niet worden verstuurd (${response.status}).`);
        }
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

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            if (SUPABASE_ANON_KEY === "PASTE_YOUR_SUPABASE_ANON_KEY_HERE") {
                setPreorderStatus(
                    status,
                    "Voeg eerst je Supabase anon key toe in js/preorder.js voordat dit formulier data kan opslaan.",
                    "error"
                );
                return;
            }

            const submitButton = form.querySelector('button[type="submit"]');
            const formData = new FormData(form);
            const payload = {
                fname: formData.get("fname")?.toString().trim(),
                lname: formData.get("lname")?.toString().trim(),
                email: formData.get("email")?.toString().trim(),
                design: formData.get("design")?.toString().trim(),
                newsletter: formData.get("newsletter") === "on"
            };

            const isValid =
                [payload.fname, payload.lname, payload.email, payload.design]
                    .every(v => typeof v === "string" && v.trim().length > 0);

            if (!isValid) {
                setPreorderStatus(status, "Vul alle velden in voordat je verzendt.", "error");
                return;
            }


            submitButton.disabled = true;
            setPreorderStatus(status, "Je gegevens worden opgeslagen...", "loading");

            try {
                const insertedRows = await submitPreorder(payload);
                console.log("Preorder opgeslagen in Supabase:", insertedRows);
                try {
                    await sendConfirmationEmail(payload);
                } catch (mailError) {
                    console.warn("Preorder opgeslagen, maar bevestigingsmail niet verstuurd:", mailError);
                }
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
                submitButton.disabled = false;
            }
        });

        form.addEventListener("reset", () => {
            setPreorderStatus(status, "");
        });
    }

    document.addEventListener("DOMContentLoaded", setupPreorderForm);
