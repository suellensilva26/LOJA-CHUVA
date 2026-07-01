/* =============================================================
   Loja Chuva v2.0 - catalogo.js
   -------------------------------------------------------------
   Hub do catalogo: busca + filtros (marca/categoria/subcategoria),
   ordenacao, chips de filtros ativos, paginacao ("carregar mais"),
   skeleton loading e animacao de entrada.

   Fonte unica de dados: data/products.json (via data-loader.js).
   Card compartilhado: window.LojaChuva.buildProductCard.
   ============================================================= */

(function () {
  "use strict";

  const PER_PAGE = 12;
  const SKELETON_COUNT = 6;

  // Estado da interface (filtros, ordenacao, paginacao).
  const state = {
    search: "",
    brands: new Set(),
    categoria: "",
    subcategoria: "",
    sort: "relevancia",
    shown: PER_PAGE,
    uso: "",
    usoCats: [],
  };

  let ALL = [];
  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    els.grid = document.querySelector("[data-grid]");
    if (!els.grid) return;
    els.heroBrands = document.querySelector("[data-hero-brands]");
    els.search = document.querySelector("[data-search]");
    els.brandPills = document.querySelector("[data-filter-brand]");
    els.category = document.querySelector("[data-filter-category]");
    els.subcategory = document.querySelector("[data-filter-subcategory]");
    els.sort = document.querySelector("[data-sort]");
    els.active = document.querySelector("[data-active-filters]");
    els.count = document.querySelector("[data-count]");
    els.more = document.querySelector("[data-more]");
    els.loadMore = document.querySelector("[data-load-more]");
    els.filterToggle = document.querySelector("[data-filter-toggle]");
    els.panel = document.querySelector("[data-filters-panel]");

    renderSkeletons();

    window.LojaChuva.loadProducts().then(function (products) {
      ALL = Array.isArray(products) ? products : [];
      els.grid.removeAttribute("aria-busy");

      if (ALL.length === 0) {
        els.grid.innerHTML =
          '<p class="empty-state">Não foi possível carregar os produtos agora. ' +
          "Fale com a gente no WhatsApp que ajudamos você.</p>";
        return;
      }

      renderHeroBrands();
      buildBrandPills();
      buildCategoryOptions();
      buildSubcategoryOptions();
      bindEvents();
      applyUrlParams();
      render();
    });
  }

  // Mapeamento de "tipo de uso" para conjuntos de categorias do catálogo.
  const USO_MAP = {
    jardinagem: ["Motosserra", "Roçadeira", "Podador", "Podadora", "Podador de altura", "Podador de cerca viva", "Motopoda", "Aparador de grama", "Ferramenta Multifuncional"],
    agricola:   ["Motocultivador", "Motobomba", "Pulverizador", "Motor Estacionário"],
    quintal:    ["Lavadora de alta pressão", "Soprador", "Furadeira", "Gerador"],
    camping:    ["Gerador"],
  };

  // Pre-aplica filtros vindos da URL: ?marca= , ?categoria= , ?busca= , ?uso=
  function applyUrlParams() {
    const p = new URLSearchParams(window.location.search);
    const marca = p.get("marca");
    const categoria = p.get("categoria");
    const busca = p.get("busca");
    const uso = p.get("uso");
    if (marca && ALL.some((x) => x.marca === marca)) {
      state.brands.add(marca);
      syncBrandPills();
    }
    if (categoria && ALL.some((x) => x.categoria === categoria)) {
      state.categoria = categoria;
      if (els.category) els.category.value = categoria;
      buildSubcategoryOptions();
    }
    if (busca) {
      state.search = busca;
      if (els.search) els.search.value = busca;
    }
    if (uso && USO_MAP[uso]) {
      state.uso = uso;
      state.usoCats = USO_MAP[uso];
    }
  }

  /* ---------- Normalizacao para busca (minuscula, sem acento) ---------- */
  function norm(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim();
  }

  function uniqueSorted(values) {
    return values
      .filter(Boolean)
      .filter(function (v, i, arr) {
        return arr.indexOf(v) === i;
      })
      .sort(function (a, b) {
        return a.localeCompare(b, "pt-BR");
      });
  }

  /* ---------- Construcao dos controles a partir do JSON ---------- */
  function renderHeroBrands() {
    if (!els.heroBrands) return;
    const marcas = uniqueSorted(ALL.map((p) => p.marca));
    els.heroBrands.innerHTML = marcas
      .map(function (m) {
        return (
          '<span class="catalog-hero__brand" data-brand="' +
          esc(m) +
          '">' +
          esc(m) +
          "</span>"
        );
      })
      .join("");
  }

  function buildBrandPills() {
    if (!els.brandPills) return;
    const marcas = uniqueSorted(ALL.map((p) => p.marca));
    els.brandPills.innerHTML = marcas
      .map(function (m) {
        return (
          '<button type="button" class="catalog-pill" data-brand="' +
          esc(m) +
          '">' +
          esc(m) +
          "</button>"
        );
      })
      .join("");
  }

  function buildCategoryOptions() {
    if (!els.category) return;
    const cats = uniqueSorted(ALL.map((p) => p.categoria));
    els.category.innerHTML =
      '<option value="">Todas</option>' +
      cats.map((c) => '<option value="' + esc(c) + '">' + esc(c) + "</option>").join("");
  }

  // Subcategorias dependem da categoria selecionada (quando houver).
  function buildSubcategoryOptions() {
    if (!els.subcategory) return;
    const base = state.categoria
      ? ALL.filter((p) => p.categoria === state.categoria)
      : ALL;
    const subs = uniqueSorted(base.map((p) => p.subcategoria));
    const current = state.subcategoria;
    els.subcategory.innerHTML =
      '<option value="">Todas</option>' +
      subs.map((s) => '<option value="' + esc(s) + '">' + esc(s) + "</option>").join("");
    // Mantem a selecao se ainda for valida; senao limpa.
    if (current && subs.indexOf(current) !== -1) {
      els.subcategory.value = current;
    } else {
      state.subcategoria = "";
      els.subcategory.value = "";
    }
  }

  /* ---------- Eventos ---------- */
  function bindEvents() {
    if (els.search) {
      let t;
      els.search.addEventListener("input", function () {
        clearTimeout(t);
        t = setTimeout(function () {
          state.search = els.search.value;
          onFilterChange();
        }, 160);
      });
    }
    if (els.brandPills) {
      els.brandPills.addEventListener("click", function (e) {
        const btn = e.target.closest(".catalog-pill");
        if (!btn) return;
        const marca = btn.getAttribute("data-brand");
        if (state.brands.has(marca)) state.brands.delete(marca);
        else state.brands.add(marca);
        btn.classList.toggle("is-active", state.brands.has(marca));
        onFilterChange();
      });
    }
    if (els.category) {
      els.category.addEventListener("change", function () {
        state.categoria = els.category.value;
        buildSubcategoryOptions();
        onFilterChange();
      });
    }
    if (els.subcategory) {
      els.subcategory.addEventListener("change", function () {
        state.subcategoria = els.subcategory.value;
        onFilterChange();
      });
    }
    if (els.sort) {
      els.sort.addEventListener("change", function () {
        state.sort = els.sort.value;
        onFilterChange();
      });
    }
    if (els.loadMore) {
      els.loadMore.addEventListener("click", function () {
        state.shown += PER_PAGE;
        render(true); // append, sem rolar
      });
    }
    if (els.active) {
      els.active.addEventListener("click", function (e) {
        const x = e.target.closest("[data-remove]");
        if (!x) return;
        removeFilter(x.getAttribute("data-remove"), x.getAttribute("data-value") || "");
      });
    }
    if (els.filterToggle && els.panel) {
      els.filterToggle.addEventListener("click", function () {
        const open = els.panel.classList.toggle("is-open");
        els.filterToggle.setAttribute("aria-expanded", String(open));
      });
    }
  }

  // Qualquer mudanca de filtro reseta a paginacao e rola ate a grid.
  function onFilterChange() {
    state.shown = PER_PAGE;
    render();
    scrollToGrid();
  }

  function removeFilter(type, value) {
    if (type === "uso") {
      state.uso = "";
      state.usoCats = [];
    } else if (type === "search") {
      state.search = "";
      if (els.search) els.search.value = "";
    } else if (type === "brand") {
      state.brands.delete(value);
      syncBrandPills();
    } else if (type === "categoria") {
      state.categoria = "";
      if (els.category) els.category.value = "";
      buildSubcategoryOptions();
    } else if (type === "subcategoria") {
      state.subcategoria = "";
      if (els.subcategory) els.subcategory.value = "";
    } else if (type === "all") {
      clearAll();
      return onFilterChange();
    }
    onFilterChange();
  }

  function clearAll() {
    state.search = "";
    state.brands.clear();
    state.categoria = "";
    state.subcategoria = "";
    state.uso = "";
    state.usoCats = [];
    if (els.search) els.search.value = "";
    if (els.category) els.category.value = "";
    syncBrandPills();
    buildSubcategoryOptions();
  }

  function syncBrandPills() {
    if (!els.brandPills) return;
    els.brandPills.querySelectorAll(".catalog-pill").forEach(function (b) {
      b.classList.toggle("is-active", state.brands.has(b.getAttribute("data-brand")));
    });
  }

  /* ---------- Filtro + ordenacao ---------- */
  function getFiltered() {
    const q = norm(state.search);
    let list = ALL.filter(function (p) {
      if (state.brands.size && !state.brands.has(p.marca)) return false;
      if (state.usoCats.length && state.usoCats.indexOf(p.categoria) === -1) return false;
      if (state.categoria && p.categoria !== state.categoria) return false;
      if (state.subcategoria && p.subcategoria !== state.subcategoria) return false;
      if (q) {
        const hay = norm(
          [p.nome_completo, p.modelo, p.categoria, p.subcategoria, p.marca].join(" ")
        );
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    return sortList(list);
  }

  function sortList(list) {
    const arr = list.slice();
    if (state.sort === "nome") {
      arr.sort((a, b) => (a.nome_completo || "").localeCompare(b.nome_completo || "", "pt-BR"));
    } else if (state.sort === "marca") {
      const order = { STIHL: 0, Toyama: 1 };
      arr.sort(function (a, b) {
        const oa = order[a.marca] != null ? order[a.marca] : 99;
        const ob = order[b.marca] != null ? order[b.marca] : 99;
        if (oa !== ob) return oa - ob;
        return (a.nome_completo || "").localeCompare(b.nome_completo || "", "pt-BR");
      });
    } else if (state.sort === "categoria") {
      arr.sort(function (a, b) {
        const c = (a.categoria || "").localeCompare(b.categoria || "", "pt-BR");
        return c !== 0 ? c : (a.nome_completo || "").localeCompare(b.nome_completo || "", "pt-BR");
      });
    }
    // "relevancia" mantem a ordem do JSON.
    return arr;
  }

  /* ---------- Render ---------- */
  function render() {
    const list = getFiltered();
    renderActiveChips();

    if (els.count) {
      els.count.textContent =
        list.length === 0
          ? "Nenhum produto encontrado"
          : list.length === 1
          ? "1 produto"
          : list.length + " produtos";
    }

    if (list.length === 0) {
      els.grid.innerHTML =
        '<div class="empty-state">Nenhum produto encontrado com esses filtros.<br>' +
        '<button type="button" class="btn btn--outline" data-remove="all" style="margin-top:1rem">Limpar filtros</button></div>';
      const clearBtn = els.grid.querySelector('[data-remove="all"]');
      if (clearBtn) clearBtn.addEventListener("click", () => removeFilter("all"));
      if (els.more) els.more.hidden = true;
      return;
    }

    const visible = list.slice(0, state.shown);
    els.grid.innerHTML = visible.map(window.LojaChuva.buildProductCard).join("");

    if (els.more) els.more.hidden = state.shown >= list.length;

    if (typeof window.LojaChuva.initScrollReveal === "function") {
      window.LojaChuva.initScrollReveal();
    }
  }

  const USO_LABELS = {
    jardinagem: "Jardinagem",
    agricola:   "Máquinas Agrícolas",
    quintal:    "Quintal e Casa",
    camping:    "Camping",
  };

  function renderActiveChips() {
    if (!els.active) return;
    const chips = [];
    if (state.uso) chips.push(chip("Uso: " + (USO_LABELS[state.uso] || state.uso), "uso", ""));
    if (state.search) chips.push(chip("Busca: " + state.search, "search", ""));
    state.brands.forEach((m) => chips.push(chip("Marca: " + m, "brand", m)));
    if (state.categoria) chips.push(chip("Categoria: " + state.categoria, "categoria", ""));
    if (state.subcategoria) chips.push(chip("Subcategoria: " + state.subcategoria, "subcategoria", ""));

    if (chips.length === 0) {
      els.active.innerHTML = "";
      return;
    }
    els.active.innerHTML =
      chips.join("") +
      '<button type="button" class="catalog-clear" data-remove="all">Limpar filtros</button>';
  }

  function chip(label, type, value) {
    return (
      '<span class="catalog-activechip">' +
      esc(label) +
      '<button type="button" aria-label="Remover filtro" data-remove="' +
      type +
      '" data-value="' +
      esc(value) +
      '">&times;</button></span>'
    );
  }

  /* ---------- Skeleton ---------- */
  function renderSkeletons() {
    let html = "";
    for (let i = 0; i < SKELETON_COUNT; i++) {
      html +=
        '<div class="skeleton-card"><div class="skeleton-card__media"></div>' +
        '<div class="skeleton-card__body"><span class="sk sk--sm"></span>' +
        '<span class="sk sk--lg"></span><span class="sk"></span><span class="sk sk--md"></span></div></div>';
    }
    els.grid.innerHTML = html;
  }

  /* ---------- Utilitarios ---------- */
  function scrollToGrid() {
    const sec = els.grid.closest(".page-section");
    if (!sec) return;
    const top = sec.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: top, behavior: "smooth" });
  }

  function esc(v) {
    return window.LojaChuva.escapeHtml(v);
  }
})();
