document.addEventListener("DOMContentLoaded", () => {
    const searchForm = document.getElementById("channel-search-form");
    const searchInput = document.getElementById("channel-search");
    const suggestions = document.getElementById("channel-suggestions");

    if (!searchForm || !searchInput || !suggestions) {
        console.error("Required elements not found in the DOM");
        return;
    }

    let channels = [];

    function updateSuggestions(term) {
        const normalizedTerm = term.trim().toLowerCase();
        const filtered = channels
            .filter((name) => !normalizedTerm || name.includes(normalizedTerm))
            .slice(0, 20);

        suggestions.innerHTML = "";
        filtered.forEach((name) => {
            const option = document.createElement("option");
            option.value = name;
            suggestions.appendChild(option);
        });
    }

    async function loadChannels() {
        try {
            const response = await fetch("/api/channels");
            if (!response.ok) {
                throw new Error(`Failed to load channels: ${response.status}`);
            }
            channels = await response.json();
            updateSuggestions(searchInput.value || "");
        } catch (error) {
            console.error("Could not load channel directory", error);
        }
    }

    searchInput.focus({ preventScroll: true });
    searchInput.select();

    searchInput.addEventListener("input", (event) => updateSuggestions(event.target.value || ""));

    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const broadcaster = (searchInput.value || "").trim().toLowerCase();
        if (!broadcaster) {
            searchInput.focus();
            return;
        }
        window.location.href = `/view/${encodeURIComponent(broadcaster)}/broadcast`;
    });

    loadChannels();
});
