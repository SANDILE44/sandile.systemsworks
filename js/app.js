(() => {
  // Shortcut for grabbing elements
  const $ = (id) => document.getElementById(id);

  /* ============================================================
     HELPERS & FORMATTERS
     ============================================================ */
  const toMs = (v) => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const formatDate = (ms) => {
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  /* ============================================================
     ACCOUNT NAVIGATION (Dropdown & Logout)
     ============================================================ */
  function initAccountDropdown() {
    const btn = $('accountBtn');
    const menu = $('accountMenu');
    if (!btn || !menu) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      menu.classList.remove('open');
    });
  }

  function initLogout() {
    const logoutBtn = $('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', () => window.auth.logout());
  }

  /* ============================================================
     USER INTERFACE (Names & Avatars)
     ============================================================ */
  function setUserUI(user) {
    const name = user?.name || (user?.email ? user.email.split('@')[0] : 'Account');

    if ($('usernameDisplay')) $('usernameDisplay').textContent = name;
    if ($('accountName')) $('accountName').textContent = name;
    if ($('accountAvatar')) {
      $('accountAvatar').textContent = name.charAt(0).toUpperCase();
    }
  }

  /* ============================================================
     ACCESS RESOLUTION (The Logic Brain)
     ============================================================ */
  function resolveAccess(user) {
    const now = Date.now();
    const calcSub = user?.subscriptions?.calculators || {};

    const subscriptionEnd = toMs(calcSub.subscriptionEnd);
    const trialEnd = toMs(calcSub.trialEnd);

    // Check if Paid Subscription is active
    const subActive = 
      calcSub.status === 'active' && 
      (!subscriptionEnd || subscriptionEnd > now);

    // Check if Trial is active
    const trialActive = 
      calcSub.status === 'trial' && 
      trialEnd > now;

    const expired = !subActive && !trialActive;

    return {
      subActive,
      trialActive,
      expired,
      subscriptionEnd,
      trialEnd,
      now
    };
  }

  /* ============================================================
     STAT CARDS RENDERING
     ============================================================ */
  function renderAccessBadge(access) {
    const statAccess = $('statAccess');
    if (!statAccess) return;

    if (access.subActive) statAccess.textContent = 'Active (Paid)';
    else if (access.trialActive) statAccess.textContent = 'Trial Access';
    else statAccess.textContent = 'Inactive / Expired';
  }

  function renderBilling(access) {
    const statBilling = $('statBilling');
    if (!statBilling) return;

    if (access.subActive) {
      statBilling.textContent = access.subscriptionEnd
        ? `Next billing: ${formatDate(access.subscriptionEnd)}`
        : 'Unlimited Premium Access';
    } else if (access.trialActive) {
      const daysLeft = Math.ceil((access.trialEnd - access.now) / (1000 * 60 * 60 * 24));
      statBilling.textContent = `${daysLeft} days remaining`;
    } else {
      statBilling.textContent = 'Subscription Ended';
    }
  }

  function renderLastLogin() {
    const statLogin = $('statLogin');
    if (!statLogin) return;

    statLogin.textContent = new Date().toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /* ============================================================
     UPGRADE / PAYMENT SECTION
     ============================================================ */
  function renderPayBox(access) {
    const payBox = $('payBox');
    if (!payBox) return;

    payBox.innerHTML = '';

    // If they are a paid user, we don't need to show the upgrade box
    if (access.subActive) {
      payBox.style.display = 'none';
      return;
    }

    payBox.style.display = 'block';

    if (access.trialActive) {
      payBox.innerHTML = `
        <div class="upgrade-box p-4 border rounded bg-light shadow-sm">
          <h5 class="fw-bold">Enjoying the Trial?</h5>
          <p>Your trial ends on ${formatDate(access.trialEnd)}. Upgrade now for uninterrupted access.</p>
          <button id="payBtn" class="btn btn-primary w-100">Upgrade to Premium — R799</button>
        </div>
      `;
    } else if (access.expired) {
      payBox.innerHTML = `
        <div class="upgrade-box p-4 border border-danger rounded bg-white shadow-sm">
          <h5 class="fw-bold text-danger">Access Expired</h5>
          <p>Your subscription has ended. Renew now to access your calculators and data.</p>
          <button id="payBtn" class="btn btn-primary w-100">Renew Access — R6,999</button>
        </div>
      `;
    }

    const payBtn = $('payBtn');
    if (payBtn) {
      payBtn.addEventListener('click', async () => {
        try {
          const token = window.auth.getToken();
          const data = await window.api.createCheckoutRequest(token);
          if (!data?.checkoutUrl) throw new Error('Could not generate checkout link.');
          window.location.href = data.checkoutUrl;
        } catch (err) {
          alert(err.message || 'Payment processing failed. Please try again.');
        }
      });
    }
  }

  /* ============================================================
     INDUSTRY SEARCH & FILTERING
     ============================================================ */
  function initIndustrySearch() {
    const input = $('industrySearch');
    const cards = [...document.querySelectorAll('.cards-grid .card')];
    const count = $('industryCount');
    if (!input || cards.length === 0) return;

    const performSearch = () => {
      const query = input.value.toLowerCase().trim();
      let shown = 0;

      cards.forEach((card) => {
        const isMatch = card.innerText.toLowerCase().includes(query);
        card.style.display = isMatch ? '' : 'none';
        if (isMatch) shown++;
      });

      if (count) count.textContent = `${shown}/${cards.length} sectors found`;
    };

    input.addEventListener('input', performSearch);
    performSearch(); // Run once on load to sync the count
  }

  /* ============================================================
     BOOTSTRAP (Page Initializer)
     ============================================================ */
  document.addEventListener('DOMContentLoaded', async () => {
    // 1. Static UI elements
    initAccountDropdown();
    initLogout();

    try {
      // 2. Security Check & User Fetch
      const profile = await window.auth.requireAuth();
      if (!profile?.user) return; // auth.js handles redirect if user is missing

      const user = profile.user;

      // 3. Populate Dashboard
      setUserUI(user);
      const access = resolveAccess(user);

      renderAccessBadge(access);
      renderBilling(access);
      renderLastLogin();
      renderPayBox(access);

      // 4. Feature Init
      initIndustrySearch();

    } catch (err) {
      console.error('Critical Dashboard Error:', err);
    }
  });
})();
