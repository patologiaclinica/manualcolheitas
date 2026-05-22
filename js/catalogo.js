/* js/catalogo.js
   Catálogo A–Z reutilizável (GitHub Pages friendly)
   - Lê data/index.json (path relativo)
   - Filtros: pesquisa, área, letra (A–Z)
   - Render: grupos por letra, links para teste.html?slug=
   - Funciona em catalogo.html e index.html (se tiverem os containers/ids)
*/

(() => {
  "use strict";

  // -------- Config (paths relativos para GitHub Pages) --------
  const DEFAULTS = {
    dataUrl: "data/index.json",
    testUrl: "teste.html?slug=",
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

  // Base path (para links/paths relativos robustos)
  // Usamos sempre paths relativos (sem leading slash), por isso isto serve mais para consistência.
  const resolveHref = (href) => href;

  // -------- State --------
  let allTests = [];
  let areas = [DEFAULTS.allLabel];
  let activeArea = DEFAULTS.allLabel;
  let activeQuery = "";
  let activeLetter = "";

  // -------- Elements (opcionais) --------
  const elements = {
    searchForm: $id("searchForm"),
    searchInput: $id("searchInput"),
    areaFilters: $id("areaFilters"),
    azNav: $id("azNav"),
    resultsSummary: $id("resultsSummary"),
    resultsContainer: $id("resultsContainer"),
    catalogError: $id("catalogError"),
    clearLink: document.querySelector(".clear-link")
  };

  // -------- URL state --------
  function getUrlState() {
    const params = new URLSearchParams(window.location.search);
    activeQuery = params.get(DEFAULTS.paramQuery) || "";
    activeArea = params.get(DEFAULTS.paramArea) || DEFAULTS.allLabel;

    const hash = window.location.hash.replace("#", "").toUpperCase();
    activeLetter = /^[A-Z]$/.test(hash) ? hash : "";

    if (exists(elements.searchInput)) elements.searchInput.value = activeQuery;
  }

  function updateUrl() {
    // Em homepage pode ser desejável não “poluir” o URL.
    // Por defeito, atualiza (é consistente com catalogo.html).
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
    const unique = Array.from(new Set(tests.map(t => t.area).filter(Boolean)));
    unique.sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" }));
    areas = [DEFAULTS.allLabel, ...unique];

    if (activeArea !== DEFAULTS.allLabel && !unique.includes(activeArea)) {
      activeArea = DEFAULTS.allLabel;
    }
  }

  function wireExistingAreaButtons(container) {
    // Se a homepage já tiver botões/links de área, podes marcá-los com data-area="Nome"
    // e o script passa a usá-los (sem re-render).
    const btns = Array.from(container.querySelectorAll("[data-area]"));
    if (!btns.length) return false;

    btns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const area = btn.getAttribute("data-area") || DEFAULTS.allLabel;
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

    // Se já existirem botões marcados com data-area, só fazemos wiring
    if (wireExistingAreaButtons(elements.areaFilters)) return;

    // Caso contrário, geramos
    elements.areaFilters.innerHTML = "";
    areas.forEach((area) => {
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
    });
  }

  // -------- Rendering: A–Z --------
  function renderAZNav(filteredTests) {
    if (!exists(elements.azNav)) return;

    elements.azNav.innerHTML = "";
    const lettersAvailable = new Set(filteredTests.map(t => getFirstLetter(t.title)));

    DEFAULTS.alphabet.forEach((letter) => {
      const a = document.createElement("a");
      a.href = `#${letter}`;
      a.className = "az-link" + (letter === activeLetter ? " active" : "");
      a.textContent = letter;

      if (!lettersAvailable.has(letter)) a.style.opacity = "0.45";

      a.addEventListener("click", (event) => {
        event.preventDefault();
        activeLetter = letter;
        updateUrl();
        renderAll();

        // Scroll para a secção da letra (se existir)
        const target = document.getElementById(`letter-${letter}`);
        if (target) {
          target.scrollIntoView({ behavior: DEFAULTS.scrollBehavior, block: "start" });
        }
      });

      elements.azNav.appendChild(a);
    });
  }

  // -------- Filtering --------
  function filterTests() {
    let tests = [...allTests];

    if (activeArea && activeArea !== DEFAULTS.allLabel) {
      tests = tests.filter(t => t.area === activeArea);
    }

    if (activeQuery.trim()) {
      const q = normalizeText(activeQuery);
      tests = tests.filter(t => normalizeText(t.title).includes(q));
    }

    if (activeLetter) {
      tests = tests.filter(t => getFirstLetter(t.title) === activeLetter);
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

  // -------- Rendering: Results (A–Z sections) --------
  function renderResults(filteredTests) {
    if (!exists(elements.resultsContainer)) return;

    elements.resultsContainer.innerHTML = "";

    if (!filteredTests.length) {
      elements.resultsContainer.className = "empty-state";
      elements.resultsContainer.textContent = "Não foram encontrados testes com os filtros atuais.";
      return;
    }

    elements.resultsContainer.className = "";
    const groups = groupByLetter(filteredTests);

    const lettersToRender = activeLetter
      ? [activeLetter].filter(l => groups[l] && groups[l].length)
      : Object.keys(groups).sort();

    if (!lettersToRender.length) {
      elements.resultsContainer.className = "empty-state";
      elements.resultsContainer.textContent = "Não existem testes disponíveis para a letra selecionada.";
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
        // IMPORTANTE: sem "/" inicial (GitHub Pages)
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
  }

  // -------- Render all --------
  function renderAll() {
    const filtered = filterTests();
    renderAreaFilters();
    renderAZNav(filtered);
    renderSummary(filtered);
    renderResults(filtered);
  }

  // -------- Load --------
  async function loadTests() {
    try {
      const response = await fetch(DEFAULTS.dataUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Não foi possível carregar ${DEFAULTS.dataUrl}`);

      const data = await response.json();
      const list = readJsonList(data);
      if (!Array.isArray(list)) throw new Error("O ficheiro index.json não contém uma lista válida.");

      // Mantemos apenas os campos necessários para catálogo
      allTests = list
        .filter(item => item && item.slug && item.title && item.area)
        .map(item => ({ slug: item.slug, title: item.title, area: item.area }));

      buildAreasFromTests(allTests);

      if (exists(elements.catalogError)) elements.catalogError.style.display = "none";
      renderAll();
    } catch (error) {
      console.error(error);

      if (exists(elements.catalogError)) {
        elements.catalogError.style.display = "block";
        elements.catalogError.innerHTML =
          `<strong>Não foi possível carregar o catálogo.</strong><br>` +
          `Verifique se existe o ficheiro <code>/data/index.json</code> e se contém uma lista válida de testes.`;
      }

      if (exists(elements.resultsSummary)) elements.resultsSummary.textContent = "Catálogo indisponível.";
      if (exists(elements.resultsContainer)) {
        elements.resultsContainer.className = "error-state";
        elements.resultsContainer.textContent = "O catálogo não pôde ser apresentado neste momento.";
      }
    }
  }

  // -------- Events --------
  function wireEvents() {
    if (exists(elements.searchForm)) {
      elements.searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        activeQuery = (exists(elements.searchInput) ? elements.searchInput.value : "") || "";
        activeLetter = "";
        updateUrl();
        renderAll();
      });
    }

    // Se existir um link "limpar filtros", manter comportamento de reset sem reload (opcional)
    if (exists(elements.clearLink)) {
      elements.clearLink.addEventListener("click", (event) => {
        // se for um link normal, deixa navegar; mas é útil resetar estado primeiro
        activeQuery = "";
        activeArea = DEFAULTS.allLabel;
        activeLetter = "";
      });
    }

    window.addEventListener("hashchange", () => {
      getUrlState();
      renderAll();
    });
  }

  // -------- Init --------
  function init() {
    getUrlState();
    wireEvents();
    loadTests();
  }

  // Arranque quando DOM estiver pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
