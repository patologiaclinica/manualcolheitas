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
    // catálogo
    searchForm: $id("searchForm"),
    searchInput: $id("searchInput"),
    resultsSummary: $id("resultsSummary"),
    resultsContainer: $id("resultsContainer"),
    catalogError: $id("catalogError"),

    // comuns
    areaFilters: $id("areaFilters"),
    azNav: $id("azNav"),
    clearLink: document.querySelector(".clear-link"),

    // homepage fallback
    genericSearchForm: document.querySelector(".search-form"),
    genericSearchInput: document.querySelector('.search-form input[name="q"]')
  };

  const isCatalogPage = exists(elements.resultsContainer);
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
    }

    if (!exists(elements.searchInput) && exists(elements.genericSearchInput)) {
      elements.genericSearchInput.value = activeQuery;
    }
  }

  function updateUrl() {
    // Só atualiza a URL localmente no catálogo.
    // Na homepage queremos redirecionar para catalogo.html.
    if (!isCatalogPage) return;

    const params = new URLSearchParams();

    if (activeQuery.trim()) params.set(DEFAULTS.paramQuery, activeQuery.trim());
    if (activeArea && activeArea !== DEFAULTS.allLabel) {
      params.set(DEFAULTS.paramArea, activeArea);
    }

    const queryString = params.toString();
    const newUrl =
      window.location.pathname +
      (queryString ? `?${queryString}` : "") +
      (activeLetter ? `#${activeLetter}` : "");

    history.replaceState(null, "", newUrl);
  }

  // -------- Dados auxiliares --------
  function buildAreasFromTests(tests) {
    const unique = Array.from(
      new Set(
        tests
          .map((t) => t.area)
          .filter(Boolean)
      )
    );

    unique.sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" }));
    areas = [DEFAULTS.allLabel, ...unique];

    if (activeArea !== DEFAULTS.allLabel && !unique.includes(activeArea)) {
      activeArea = DEFAULTS.allLabel;
    }
  }

  // -------- Rendering: Área --------
  function renderAreaFilters() {
    if (!exists(elements.areaFilters)) return;

    elements.areaFilters.innerHTML = "";

    areas.forEach((area) => {
      const isActive = area === activeArea;

      if (isHomePage) {
        // Homepage = links para catalogo.html
        const link = document.createElement("a");
        link.className = "pill" + (isActive ? " active" : "");
        link.textContent = area;
        link.href = buildCatalogHref({
          q: activeQuery,
          area: area === DEFAULTS.allLabel ? "" : area
        });

        elements.areaFilters.appendChild(link);
      } else {
        // Catálogo = botões que filtram localmente
        const button = document.createElement("button");
        button.type = "button";
        button.className = "pill" + (isActive ? " active" : "");
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
  function renderAZNav(baseTestsForLetters) {
    if (!exists(elements.azNav)) return;

    elements.azNav.innerHTML = "";

    const lettersAvailable = new Set(
      (baseTestsForLetters || []).map((t) => getFirstLetter(t.title))
    );

    DEFAULTS.alphabet.forEach((letter) => {
      const isActive = letter === activeLetter;
      const a = document.createElement("a");
      a.className = "az-link" + (isActive ? " active" : "");
      a.textContent = letter;

      if (!lettersAvailable.has(letter)) {
        a.style.opacity = "0.45";
      }

      if (isHomePage) {
        // Homepage = link para catalogo.html com hash
        a.href = buildCatalogHref({
          q: activeQuery,
          area: activeArea !== DEFAULTS.allLabel ? activeArea : "",
          letter
        });
      } else {
        // Catálogo = interactivo local
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

    tests.sort((a, b) =>
      a.title.localeCompare(b.title, "pt", { sensitivity: "base" })
    );

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

    lettersToRender.forEach((letter) => {
      const section = document.createElement("section");
      section.className = "letter-section";
      section.id = `letter-${letter}`;

      const heading = document.createElement("h2");
      heading.className = "letter-heading";
      heading.textContent = letter;
      section.appendChild(heading);

      const list = document.createElement("ul");
      list.className = "test-list";

      groups[letter].forEach((test) => {
        const item = document.createElement("li");
        item.className = "test-item";

        const link = document.createElement("a");
        link.className = "test-link";
        link.href = resolveHref(`${DEFAULTS.testUrl}${encodeURIComponent(test.slug)}`);

        const title = document.createElement("p");
        title.className = "test-title";
        title.textContent = test.title;

        const meta = document.createElement("p");
        meta.className = "test-meta";
        meta.textContent = test.area || "Área não definida";

        link.appendChild(title);
        link.appendChild(meta);
        item.appendChild(link);
        list.appendChild(item);
      });

      section.appendChild(list);
      elements.resultsContainer.appendChild(section);
    });

    if (activeLetter) {
      const target = document.getElementById(`letter-${activeLetter}`);
      if (target) {
        requestAnimationFrame(() => {
          target.scrollIntoView({
            behavior: DEFAULTS.scrollBehavior,
            block: "start"
          });
        });
      }
    }
  }

  // -------- Render all --------
  function renderAll() {
    // Base para áreas: lista completa
    renderAreaFilters();

    // Base para letras:
    // mostra letras disponíveis tendo em conta área + query,
    // mas sem limitar pela letra ativa
    let baseTestsForLetters = [...allTests];

    if (activeArea && activeArea !== DEFAULTS.allLabel) {
      baseTestsForLetters = baseTestsForLetters.filter((t) => t.area === activeArea);
    }

    if (activeQuery.trim()) {
      const q = normalizeText(activeQuery);
      baseTestsForLetters = baseTestsForLetters.filter((t) =>
        normalizeText(t.title).includes(q)
      );
    }

    renderAZNav(baseTestsForLetters);

    // Resultados completos (só catálogo)
    const filtered = filterTests();
    renderSummary(filtered);
    renderResults(filtered);

    // Sincronizar input
    if (exists(elements.searchInput)) {
      elements.searchInput.value = activeQuery;
    } else if (exists(elements.genericSearchInput)) {
      elements.genericSearchInput.value = activeQuery;
    }
  }

  // -------- Load --------
  async function loadTests() {
    try {
      const response = await fetch(DEFAULTS.dataUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Não foi possível carregar ${DEFAULTS.dataUrl}`);
      }

      const data = await response.json();
      const list = readJsonList(data);

      if (!Array.isArray(list)) {
        throw new Error("O ficheiro index.json não contém uma lista válida.");
      }

      allTests = list
        .filter((item) => item && item.slug && item.title && item.area)
        .map((item) => ({
          slug: item.slug,
          title: item.title,
          area: item.area
        }));

      buildAreasFromTests(allTests);

      if (exists(elements.catalogError)) {
        elements.catalogError.style.display = "none";
      }

      renderAll();
    } catch (error) {
      console.error(error);

      if (exists(elements.catalogError)) {
        elements.catalogError.style.display = "block";
        elements.catalogError.innerHTML =
          `<strong>Não foi possível carregar o catálogo.</strong><br>` +
          `Verifique se existe o ficheiro <code>/data/index.json</code> e se contém uma lista válida de testes.`;
      }

      if (exists(elements.resultsSummary)) {
        elements.resultsSummary.textContent = "Catálogo indisponível.";
      }

      if (exists(elements.resultsContainer)) {
        elements.resultsContainer.className = "error-state";
        elements.resultsContainer.textContent =
          "O catálogo não pôde ser apresentado neste momento.";
      }
    }
  }

  // -------- Events --------
  function wireEvents() {
    // CATÁLOGO
    if (isCatalogPage && exists(elements.searchForm)) {
      elements.searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        activeQuery = (exists(elements.searchInput) ? elements.searchInput.value : "") || "";
        activeLetter = "";
        updateUrl();
        renderAll();
      });
    }

    // HOMEPAGE
    if (isHomePage && exists(elements.genericSearchForm)) {
      elements.genericSearchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const q =
          (exists(elements.genericSearchInput) ? elements.genericSearchInput.value : "") || "";
        window.location.href = buildCatalogHref({ q });
      });
    }

    if (exists(elements.clearLink)) {
      elements.clearLink.addEventListener("click", () => {
        activeQuery = "";
        activeArea = DEFAULTS.allLabel;
        activeLetter = "";
      });
    }

    if (isCatalogPage) {
      window.addEventListener("hashchange", () => {
        getUrlState();
        renderAll();
      });
    }
  }

  // -------- Init --------
  function init() {
    getUrlState();
    wireEvents();
    loadTests();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
