(() => {
  "use strict";

  // -------- Config (paths relativos para GitHub Pages) --------
  const DEFAULTS = {
    dataUrl: "data/index.json",
    testUrl: "teste.html?slug=",
    catalogUrl: "catalogo.html",
    paramQuery: "q",
    paramArea: "area",
    allLabel: "Todos",
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    scrollBehavior: "smooth"
  };

  // -------- Utils --------
  const $id = (id) => document.getElementById(id);
  const exists = (el) => !!el;

  const normalizeText = (value) =>
    (value || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const getFirstLetter = (title) => {
    const normalized = normalizeText(title);
    if (!normalized) return "#";
    const first = normalized.charAt(0).toUpperCase();
    return /^[A-Z]$/.test(first) ? first : "#";
  };

  const readJsonList = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    return null;
  };

  const resolveHref = (href) => href;

  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m]));
  }

  function buildCatalogHref({ q = "", area = "", letter = "" } = {}) {
    const params = new URLSearchParams();

    if ((q || "").trim()) params.set(DEFAULTS.paramQuery, q.trim());
    if (area && area !== DEFAULTS.allLabel) params.set(DEFAULTS.paramArea, area);

    const queryString = params.toString();
    return (
      DEFAULTS.catalogUrl +
      (queryString ? `?${queryString}` : "") +
      (letter ? `#${letter}` : "")
    );
  }

  // -------- State --------
  let allTests = [];
  let areas = [DEFAULTS.allLabel];
  let activeArea = DEFAULTS.allLabel;
  let activeQuery = "";
  let activeLetter = "";

  // -------- Elements --------
  const elements = {
    // catalogo.html
    searchForm: $id("searchForm"),
    searchInput: $id("searchInput"),
    resultsSummary: $id("resultsSummary"),
    resultsContainer: $id("resultsContainer"),
    catalogError: $id("catalogError"),

    // presentes em ambas
    areaFilters: $id("areaFilters"),
    azNav: $id("azNav"),
    clearLink: document.querySelector(".clear-link"),

    // fallback para homepage
    genericSearchForm: document.querySelector(".search-form"),
    genericSearchInput: document.querySelector('.search-form input[name="q"]')
  };

  const isCatalogPage = exists(elements.resultsContainer) || exists(elements.resultsSummary);
  const isHomePage = !isCatalogPage;

  // -------- URL state --------
  function getUrlState() {
    const params = new URLSearchParams(window.location.search);
    activeQuery = params.get(DEFAULTS.paramQuery) || "";
    activeArea = params.get(DEFAULTS.paramArea) || DEFAULTS.allLabel;

    const hash = window.location.hash.replace("#", "").toUpperCase();
    activeLetter = /^[A-Z]$/.test(hash) ? hash : "";

    if (exists(elements.searchInput)) {
      elements.searchInput.value = activeQuery;
    } else if (exists(elements.genericSearchInput)) {
      elements.genericSearchInput.value = activeQuery;
    }
  }

  function updateUrl() {
    // Só atualiza URL na página do catálogo.
    // Na homepage queremos redirecionar para catalogo.html, não filtrar localmente.
    if (!isCatalogPage) return;

    const params = new URLSearchParams();
    if (activeQuery.trim()) params.set(DEFAULTS.paramQuery, activeQuery.trim());
    if (activeArea && activeArea !== DEFAULTS.allLabel) params.set(DEFAULTS.paramArea, activeArea);

    const queryString = params.toString();
    const newUrl =
      window.location.pathname +
      (queryString ? `?${queryString}` : "") +
      (activeLetter ? `#${activeLetter}` : "");

    history.replaceState(null, "", newUrl);
  }

  // -------- Rendering: Área --------
  function buildAreasFromTests(tests) {
    const unique = Array.from(new Set(tests.map((t) => t.area).filter(Boolean)));
    unique.sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" }));
    areas = [DEFAULTS.allLabel, ...unique];

    if (activeArea !== DEFAULTS.allLabel && !unique.includes(activeArea)) {
      activeArea = DEFAULTS.allLabel;
    }
  }

  function wireExistingAreaButtons(container) {
    // Se existirem elementos com data-area, adaptação automática
    const btns = Array.from(container.querySelectorAll("[data-area]"));
    if (!btns.length) return false;

    btns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const area = btn.getAttribute("data-area") || DEFAULTS.allLabel;

        if (isHomePage) {
          window.location.href = buildCatalogHref({ q: activeQuery, area });
          return;
        }

        activeArea = area;
        activeLetter = "";
        updateUrl();
        renderAll();
      });
    });

    return true;
  }

  function renderAreaFilters() {
    if (!exists(elements.areaFilters)) return;

    // Se já existirem botões/links marcados com data-area, apenas fazemos wiring
    if (wireExistingAreaButtons(elements.areaFilters)) return;

    elements.areaFilters.innerHTML = "";

    areas.forEach((area) => {
      if (isHomePage) {
        // Homepage: gerar LINKS para o catálogo
        const link = document.createElement("a");
        link.className = "pill" + (area === activeArea ? " active" : "");
        link.textContent = area;
        link.href = buildCatalogHref({
          q: activeQuery,
          area: area === DEFAULTS.allLabel ? "" : area
        });

        elements.areaFilters.appendChild(link);
      } else {
        // Catálogo: gerar BOTÕES que filtram localmente
        const button = document.createElement("button");
        button.type = "button";
        button.className = "pill" + (area === activeArea ? " active" : "");
        button.textContent = area;

        button.addEventListener("click", () => {
          activeArea = area;
          activeLetter = "";
          updateUrl();
          renderAll();
        });

        elements.areaFilters.appendChild(button);
      }
    });
  }

  // -------- Rendering: A–Z --------
  function renderAZNav(filteredTests) {
    if (!exists(elements.azNav)) return;

    elements.azNav.innerHTML = "";
    const lettersAvailable = new Set(filteredTests.map((t) => getFirstLetter(t.title)));

    DEFAULTS.alphabet.forEach((letter) => {
      const a = document.createElement("a");
      a.className = "az-link" + (letter === activeLetter ? " active" : "");
      a.textContent = letter;

      if (!lettersAvailable.has(letter)) a.style.opacity = "0.45";

      if (isHomePage) {
        // Homepage: link direto para o catálogo com hash
        a.href = buildCatalogHref({
          q: activeQuery,
          area: activeArea !== DEFAULTS.allLabel ? activeArea : "",
          letter
        });
      } else {
        // Catálogo: filtra localmente
        a.href = `#${letter}`;
        a.addEventListener("click", (event) => {
          event.preventDefault();
          activeLetter = letter;
          updateUrl();
          renderAll();

          const target = document.getElementById(`letter-${letter}`);
          if (target) {
            target.scrollIntoView({
              behavior: DEFAULTS.scrollBehavior,
              block: "start"
            });
          }
        });
      }

      elements.azNav.appendChild(a);
    });
  }

  // -------- Filtering --------
  function filterTests() {
    let tests = [...allTests];

    if (activeArea && activeArea !== DEFAULTS.allLabel) {
      tests = tests.filter((t) => t.area === activeArea);
    }

    if (activeQuery.trim()) {
      const q = normalizeText(activeQuery);
      tests = tests.filter((t) => normalizeText(t.title).includes(q));
    }

    if (activeLetter) {
      tests = tests.filter((t) => getFirstLetter(t.title) === activeLetter);
    }

    tests.sort((a, b) => a.title.localeCompare(b.title, "pt", { sensitivity: "base" }));
    return tests;
  }

  function groupByLetter(tests) {
    const groups = {};
    tests.forEach((t) => {
      const letter = getFirstLetter(t.title);
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(t);
    });
    return groups;
  }

  // -------- Rendering: Summary --------
  function renderSummary(filteredTests) {
    if (!exists(elements.resultsSummary)) return;

    let text = `${filteredTests.length} teste(s) encontrado(s).`;
    if (activeArea !== DEFAULTS.allLabel) text += ` Área: ${activeArea}.`;
    if (activeQuery.trim()) text += ` Pesquisa: “${activeQuery.trim()}”.`;
    if (activeLetter) text += ` Letra selecionada: ${activeLetter}.`;

    elements.resultsSummary.textContent = text;
  }

  // -------- Rendering: Results --------
  function renderResults(filteredTests) {
    if (!exists(elements.resultsContainer)) return;

    elements.resultsContainer.innerHTML = "";

    if (!filteredTests.length) {
      elements.resultsContainer.className = "empty-state";
      elements.resultsContainer.textContent =
        "Não foram encontrados testes com os filtros atuais.";
      return;
    }

    elements.resultsContainer.className = "";
    const groups = groupByLetter(filteredTests);

    const lettersToRender = activeLetter
      ? [activeLetter].filter((l) => groups[l] && groups[l].length)
      : Object.keys(groups).sort();

    if (!lettersToRender.length) {
      elements.resultsContainer.className = "empty-state";
      elements.resultsContainer.textContent =
        "Não existem testes disponíveis para a letra selecionada.";
      return;
    }

