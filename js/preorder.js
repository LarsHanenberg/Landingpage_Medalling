const SUPABASE_URL = "https://kkkcbkiolcfqfzosupiy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_L1YZ7Kji3dR2Bf5rHds5iw_C_ADWVCb";
const SUPABASE_TABLE = "preorders";

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
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: "return=minimal"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let errorMessage = "Er ging iets mis bij het opslaan van je aanvraag.";

        try {
            const errorData = await response.json();
            if (errorData?.message) {
                errorMessage = errorData.message;
            }
        } catch (error) {
            // Ignore JSON parse errors and use the default message.
        }

        throw new Error(errorMessage);
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
            name: formData.get("fname")?.toString().trim(),
            surname: formData.get("lname")?.toString().trim(),
            email: formData.get("email")?.toString().trim(),
            preferred_design: formData.get("design")?.toString().trim()
        };

        submitButton.disabled = true;
        setPreorderStatus(status, "Je gegevens worden opgeslagen...", "loading");

        try {
            await submitPreorder(payload);
            form.reset();
            setPreorderStatus(status, "Je pre-order is opgeslagen. Bedankt!", "success");
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
