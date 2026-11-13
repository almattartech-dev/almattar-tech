const siteSearchInput = document.querySelector(".search");
const siteSearchNav = siteSearchInput?.closest("nav");
let siteContentPromise;

function getSiteContent() {
  if (!siteContentPromise) {
    const databaseUrl = siteSearchNav?.dataset.databaseUrl;
    if (!databaseUrl) {
      return Promise.reject(new Error("Search is not configured."));
    }

    siteContentPromise = fetch(`${databaseUrl}/content.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Search request failed (${response.status}).`);
        }
        return response.json();
      })
      .then((data) => {
        const pages = ["news", "videos", "info"];
        return pages.flatMap((page) =>
          Object.values(data?.[page] || {})
            .filter((item) => item && typeof item === "object" && typeof item.description === "string")
            .map((item) => ({
              page,
              title: typeof item.title === "string" ? item.title : "",
              description: item.description
            }))
        );
      })
      .catch((error) => {
        siteContentPromise = null;
        throw error;
      });
  }

  return siteContentPromise;
}

if (siteSearchInput && siteSearchNav) {
  const resultsPanel = document.createElement("section");
  resultsPanel.className = "search-results";
  resultsPanel.hidden = true;
  resultsPanel.setAttribute("aria-label", "Search results");
  siteSearchNav.append(resultsPanel);

  async function searchSite(query) {
    resultsPanel.replaceChildren();
    resultsPanel.hidden = false;
    const status = document.createElement("p");
    status.className = "search-results-status";
    status.textContent = "Searching...";
    resultsPanel.append(status);

    try {
      const content = await getSiteContent();
      const matches = content.filter((item) =>
        `${item.title} ${item.description}`.toLocaleLowerCase().includes(query)
      ).slice(0, 20);

      resultsPanel.replaceChildren();
      if (matches.length === 0) {
        status.textContent = "No matching content.";
        resultsPanel.append(status);
        return;
      }

      for (const item of matches) {
        const link = document.createElement("a");
        link.className = "search-result";
        link.href = `${item.page}.html?search=${encodeURIComponent(query)}`;

        const description = document.createElement("span");
        description.textContent = item.title
          ? `${item.title} — ${item.description}`
          : item.description;
        const pageLabel = document.createElement("small");
        pageLabel.textContent = item.page.toUpperCase();
        link.append(description, pageLabel);
        resultsPanel.append(link);
      }
    } catch (error) {
      console.error("Could not search site content:", error);
      status.textContent = "Search is temporarily unavailable.";
      resultsPanel.replaceChildren(status);
    }
  }

  siteSearchInput.addEventListener("input", () => {
    const query = siteSearchInput.value.trim().toLocaleLowerCase();
    if (query.length < 2) {
      resultsPanel.hidden = true;
      resultsPanel.replaceChildren();
      return;
    }
    searchSite(query);
  });

  document.addEventListener("click", (event) => {
    if (!siteSearchNav.contains(event.target)) {
      resultsPanel.hidden = true;
    }
  });

  const initialQuery = new URLSearchParams(window.location.search).get("search");
  if (initialQuery) {
    siteSearchInput.value = initialQuery;
    siteSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
