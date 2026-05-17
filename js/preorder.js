    const PREORDER_ENDPOINT = "https://kkkcbkiolcfqfzosupiy.supabase.co/functions/v1/send-preorder-confirmation";

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
        const response = await fetch(PREORDER_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
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

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            if (!form.checkValidity()) {
                form.reportValidity();
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
                submitButton.disabled = false;
            }
        });

        form.addEventListener("reset", () => {
            setPreorderStatus(status, "");
        });
    }

    document.addEventListener("DOMContentLoaded", setupPreorderForm);
