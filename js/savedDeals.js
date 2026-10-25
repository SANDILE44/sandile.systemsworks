(() => {
  const API_BASE = "https://sandile-systemsworks-saas-backend-2.onrender.com";
  const config = {
    construction: {
      label: "Construction",
      icon: "hard-hat",
      page: "industry-construction.html",
      revenueLabel: "Contract value",
      empty: "No construction deals yet."
    },
    consulting: {
      label: "Consulting",
      icon: "briefcase-business",
      page: "industry-consulting.html",
      revenueLabel: "Revenue",
      empty: "No consulting deals yet."
    },
    manufacturing: {
      label: "Manufacturing",
      icon: "factory",
      page: "industry-manufacturing.html",
      revenueLabel: "Revenue",
      empty: "No manufacturing deals yet."
    },
    restaurant: {
      label: "Restaurant",
      icon: "utensils",
      page: "industry-restaurants.html",
      revenueLabel: "Monthly revenue",
      empty: "No restaurant deals yet."
    }
  };

  const $ = (id) => document.getElementById(id);
  const type = document.body.dataset.savedDealType;
  const industry = config[type];
  if (!industry) {
    console.error("Saved deals page has an unknown industry type.");
    return;
  }

  const container = $("savedDealsContainer");
  const empty = $("emptyState");
  const search = $("searchInput");
  const searchMeta = $("searchMeta");
  let dealsCache = [];

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);

  const money = (value) =>
    (Number(value) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const percent = (value) => `${(Number(value) || 0).toFixed(2)}%`;
  const metricClass = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number === 0) return "caution";
    return number > 0 ? "positive" : "negative";
  };

  function getProjectName(deal) {
    const candidates = [
      deal.clientName,
      deal.name,
      deal.projectName,
      deal.title,
      deal.client_name,
      deal.meta?.title,
      deal.meta?.projectName,
      deal.inputs?.projectName,
      deal.inputs?.project_name
    ];
    return candidates.find((value) => typeof value === "string" && value.trim())?.trim()
      || `${industry.label} project`;
  }

  function formatDate(value) {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return date.toLocaleString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function getRevenue(deal) {
    const results = deal.results || {};
    const inputs = deal.inputs || {};
    if (type === "construction") return results.revenue ?? results.value ?? inputs.value;
    if (type === "consulting") return results.revenue ?? results.totalRevenue;
    if (type === "manufacturing") return results.revenue ?? Number(inputs.units || 0) * Number(inputs.price || 0);
    return results.monthlyRevenue ?? results.revenue;
  }

  function getSearchText(deal) {
    return [
      deal.clientName,
      deal.name,
      getProjectName(deal),
      deal.type,
      deal.createdAt,
      deal.results,
      deal.inputs
    ].map((value) => {
      if (value && typeof value === "object") return JSON.stringify(value);
      return String(value ?? "");
    }).join(" ").toLocaleLowerCase();
  }

  function updateMeta(visibleCount) {
    if (!searchMeta) return;
    const total = dealsCache.length;
    searchMeta.textContent = search?.value.trim()
      ? `Showing ${visibleCount} of ${total} ${total === 1 ? "project" : "projects"}`
      : `Showing all ${total} ${total === 1 ? "project" : "projects"}`;
  }

  function renderDeals() {
    const query = search?.value.trim().toLocaleLowerCase() || "";
    const visibleDeals = dealsCache.filter((deal) => !query || getSearchText(deal).includes(query));
    updateMeta(visibleDeals.length);

    if (!dealsCache.length) {
      container.innerHTML = "";
      empty.style.display = "block";
      empty.querySelector("p").textContent = industry.empty;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    if (!visibleDeals.length) {
      container.innerHTML = `
        <div class="no-search-results">
          <i data-lucide="search-x" aria-hidden="true"></i>
          <p>No projects match “${escapeHTML(search.value.trim())}”. Try another search.</p>
        </div>
      `;
      empty.style.display = "none";
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    empty.style.display = "none";
    container.innerHTML = visibleDeals.map((deal) => {
      const results = deal.results || {};
      const name = getProjectName(deal);
      const margin = Number(results.margin) || 0;
      const profitClass = metricClass(results.profit);
      const marginClass = metricClass(margin);
      const roiClass = metricClass(results.roi);
      const revenue = getRevenue(deal);
      const status = results.status || results.decision || results.riskLevel;

      return `
        <article class="deal-card ${profitClass}">
          <div class="deal-header">
            <div class="deal-heading">
              <span class="deal-industry-icon"><i data-lucide="${industry.icon}" aria-hidden="true"></i></span>
              <div class="deal-heading-copy">
                <h2 class="deal-title">${escapeHTML(name)}</h2>
                <div class="deal-date"><i data-lucide="calendar-days" aria-hidden="true"></i>${escapeHTML(formatDate(deal.createdAt))}</div>
              </div>
            </div>
            <span class="deal-tag">${escapeHTML(industry.label)}</span>
          </div>
          <div class="deal-body">
            <div class="deal-grid">
              <div>
                <span class="label">NET PROFIT</span>
                <strong class="deal-profit ${profitClass}">R ${money(results.profit)}</strong>
              </div>
              <div>
                <span class="label">PROFIT MARGIN</span>
                <strong class="${marginClass}">${percent(margin)}</strong>
              </div>
              <div>
                <span class="label">ROI</span>
                <strong class="${roiClass}">${results.roi === undefined || results.roi === null ? "—" : percent(results.roi)}</strong>
              </div>
            </div>
            <div class="deal-revenue">
              <span class="label">${escapeHTML(industry.revenueLabel)}:</span>
              <strong>${revenue === undefined || revenue === null ? "—" : `R ${money(revenue)}`}</strong>
            </div>
            ${status ? `<div class="deal-status"><span class="label">STATUS</span><strong>${escapeHTML(status)}</strong></div>` : ""}
          </div>
          <div class="deal-actions">
            <button class="edit-btn" type="button" data-id="${escapeHTML(deal._id)}">
              <i data-lucide="square-pen" aria-hidden="true"></i><span>Edit / Open</span>
            </button>
            <button class="delete-btn" type="button" data-id="${escapeHTML(deal._id)}" data-name="${escapeHTML(name)}">
              <i data-lucide="trash-2" aria-hidden="true"></i><span>Delete</span>
            </button>
          </div>
        </article>
      `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
  }

  async function request(url, method = "GET") {
    const token = localStorage.getItem("token");
    if (!token) {
      location.replace("login.html");
      return null;
    }

    const response = await fetch(`${API_BASE}${url}`, {
      method,
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 401) {
      localStorage.removeItem("token");
      location.replace("login.html");
      return null;
    }
    if (response.status === 403) {
      location.replace("payment.html");
      return null;
    }
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Request failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }
    if (method === "DELETE") return true;
    return response.json();
  }

  async function loadDeals() {
    const loader = $("loader");
    if (loader) loader.style.display = "flex";
    try {
      const all = await request("/api/saved-deals");
      if (all === null) return;
      if (!Array.isArray(all)) throw new Error("The saved projects response was not a list.");
      dealsCache = all.filter((deal) => deal.type === type);
      renderDeals();
    } catch (error) {
      console.error("Could not load saved deals:", error);
      container.innerHTML = `
        <div class="saved-deals-error" role="alert">
          <i data-lucide="triangle-alert" aria-hidden="true"></i>
          <p>We couldn’t load your saved projects. Please refresh the page to try again.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    } finally {
      if (loader) loader.style.display = "none";
    }
  }

  async function deleteDeal(button) {
    try {
      await request(`/api/saved-deals/${encodeURIComponent(button.dataset.id)}`, "DELETE");
      await loadDeals();
    } catch (error) {
      console.error("Could not delete saved deal:", error);
      alert("The project could not be deleted. Please try again.");
    }
  }

  function editDeal(id) {
    const deal = dealsCache.find((item) => String(item._id) === id);
    if (!deal) {
      alert("This saved project is no longer available. Refresh the page and try again.");
      return;
    }
    localStorage.setItem("editDeal", JSON.stringify(deal));
    localStorage.setItem("editDealId", deal._id);
    window.location.href = industry.page;
  }

  search?.addEventListener("input", renderDeals);

  document.addEventListener("click", (event) => {
    const deleteButton = event.target.closest(".delete-btn");
    if (deleteButton) {
      const name = deleteButton.dataset.name || "this project";
      if (!window.confirm(`Delete “${name}” from your saved projects?\n\nThis action cannot be undone.`)) return;
      window.ButtonLoading.run(deleteButton, () => deleteDeal(deleteButton)).catch((error) => {
        console.error("Delete button failed:", error);
        alert("The project could not be deleted. Please try again.");
      });
      return;
    }

    const editButton = event.target.closest(".edit-btn");
    if (editButton) {
      window.ButtonLoading.run(editButton, () => editDeal(editButton.dataset.id)).catch((error) => {
        console.error("Edit button failed:", error);
        alert("The project could not be opened. Please try again.");
      });
    }
  });

  document.addEventListener("DOMContentLoaded", loadDeals);
})();
