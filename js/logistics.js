/* =====================================================
   SHARED HELPERS
===================================================== */

const $ = (id) => document.getElementById(id);

const API_BASE = window.API_BASE || "";

/* =====================================================
   FORMATTERS
===================================================== */

const money = value =>
    (Number(value) || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

const percent = value => {
    const n = Number(value) || 0;
    return (Math.abs(n) <= 1 ? n * 100 : n).toFixed(2) + "%";
};

/* =====================================================
   API
===================================================== */

async function apiPost(url, body) {

    const token = localStorage.getItem("token");

    if (!token) {
        location.replace("login.html");
        return;
    }

    const response = await fetch(`${API_BASE}${url}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });

    if (response.status === 401) {
        location.replace("login.html");
        return;
    }

    if (response.status === 403) {
        location.replace("payment.html");
        return;
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Status:", response.status, "Response:", errorText);
        return null;
    }

    return response.json();
}

/* =====================================================
   UI HELPERS
===================================================== */

function setText(id, value) {

    const el = $(id);

    if (!el) return;

    el.textContent = value ?? "—";
}

function setClass(el, className) {

    if (!el) return;

    el.className = `output-value ${className || ""}`;
}

function renderSteps(containerId, steps = []) {

    const container = $(containerId);

    if (!container) return;

    container.innerHTML = steps.map(step => `
        <li>
            <strong>${step.step}</strong><br>
            ${step.message}
        </li>
    `).join("");
}

/* =====================================================
   DEBOUNCE
===================================================== */

const debounceTimers = {};

function debounce(key, callback, delay = 300) {

    clearTimeout(debounceTimers[key]);

    debounceTimers[key] = setTimeout(callback, delay);

}

/* =====================================================
   SAVE DEALS
===================================================== */

function getSavedDeals(type) {

    return JSON.parse(
        localStorage.getItem(`deals_${type}`) || "[]"
    );

}

async function saveDeal(type, payload) {
    // Use API endpoint for saving deals, like other industries
    const token = localStorage.getItem("token");
    if (!token) {
        location.replace("login.html");
        return;
    }
    const dealPayload = {
        type,
        ...payload
    };
    const res = await fetch(`${API_BASE}/api/saved-deals`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(dealPayload)
    });
    if (res.status === 401) {
        location.replace("login.html");
        return;
    }
    if (res.status === 403) {
        location.replace("payment.html");
        return;
    }
    if (!res.ok) {
        const errorText = await res.text();
        alert("Failed to save deal: " + errorText);
        return null;
    }
    alert("Deal saved successfully!");
    return await res.json();
}

function updateDeal(type, id, payload) {

    const deals = getSavedDeals(type).map(deal =>

        deal.id === id
            ? {
                ...deal,
                ...payload,
                updatedAt: new Date().toISOString()
              }
            : deal

    );

    localStorage.setItem(
        `deals_${type}`,
        JSON.stringify(deals)
    );

}

/* =====================================================
   EVENT BINDING
===================================================== */

function bindMonthly() {

    const panel = $("operations-panel");

    if (!panel || typeof runMonthly !== "function") return;

    panel.querySelectorAll("input").forEach(input => {

        input.addEventListener("input", () =>
            debounce("monthly", runMonthly)
        );

    });

}

function bindShipment() {

    const panel = $("shipment-panel");

    if (!panel || typeof runShipment !== "function") return;

    panel.querySelectorAll("input").forEach(input => {

        input.addEventListener("input", () =>
            debounce("shipment", runShipment)
        );

    });

}

function bindFreight() {

    const panel = $("freight-panel");

    if (!panel || typeof runFreight !== "function") return;

    panel.querySelectorAll("input").forEach(input => {

        input.addEventListener("input", () =>
            debounce("freight", runFreight)
        );

    });

}

document.addEventListener("DOMContentLoaded", () => {

    bindMonthly();
    bindShipment();
    bindFreight();

});
