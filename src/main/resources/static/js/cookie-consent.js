(() => {
    const CONSENT_STORAGE_KEY = "imgfloat.cookie-consent.dismissed";
    const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

    const readConsentCookie = () => {
        return document.cookie
            .split("; ")
            .find((entry) => entry.startsWith(`${CONSENT_STORAGE_KEY}=`))
            ?.split("=")[1];
    };

    const persistDismissal = () => {
        try {
            window.localStorage.setItem(CONSENT_STORAGE_KEY, "true");
        } catch { }
        document.cookie = `${CONSENT_STORAGE_KEY}=true; max-age=${COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
    };

    const hasDismissed = () => {
        try {
            if (window.localStorage.getItem(CONSENT_STORAGE_KEY) === "true") {
                return true;
            }
        } catch { }
        return readConsentCookie() === "true";
    };

    const shouldShowBanner = () => {
        if (!document.body) {
            return false;
        }
        if (document.body.classList.contains("broadcast-body")) {
            return false;
        }
        return !hasDismissed();
    };

    const dismissBanner = (banner) => {
        if (!banner) {
            return;
        }
        persistDismissal();
        banner.classList.add("cookie-consent-exit");
        window.setTimeout(() => banner.remove(), 180);
    };

    const renderBanner = () => {
        if (!shouldShowBanner()) {
            return;
        }

        const banner = document.createElement("section");
        banner.className = "cookie-consent";
        banner.setAttribute("role", "dialog");
        banner.setAttribute("aria-live", "polite");
        banner.setAttribute("aria-label", "Cookie usage notice");

        banner.innerHTML = `
      <div class="cookie-consent-body">
        <p class="eyebrow subtle">Cookies & privacy</p>
        <p class="cookie-consent-copy">
          Imgfloat uses essential cookies to keep you signed in. By continuing to use the site, you agree to this use.
        </p>
      </div>
      <div class="cookie-consent-actions">
        <button type="button" class="button" data-consent-action="accept">Accept</button>
        <button type="button" class="button ghost" data-consent-action="dismiss">Dismiss</button>
      </div>
      <button type="button" class="cookie-consent-close" aria-label="Close cookie notice" data-consent-action="dismiss">
        &times;
      </button>
    `;

        banner.querySelectorAll("[data-consent-action]").forEach((element) => {
            element.addEventListener("click", () => dismissBanner(banner));
        });

        document.body.appendChild(banner);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderBanner);
    } else {
        renderBanner();
    }
})();
