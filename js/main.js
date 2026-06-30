/* =============================================================
   Loja Chuva v2.0 - main.js
   -------------------------------------------------------------
   Funcoes comuns a todas as paginas:
   - constante do WhatsApp
   - createWhatsAppLink()
   - menu mobile (toggle)
   - botao flutuante de WhatsApp
   - ano do rodape

   Carregado em TODAS as paginas (index, catalogo, produto).
   ============================================================= */

// Numero oficial usado em todos os botoes de WhatsApp.
const WHATSAPP_NUMBER = "5522988128459";

// Mensagem generica do botao flutuante.
const WHATSAPP_DEFAULT_MESSAGE =
  "Olá! Vim pelo site da Loja Chuva e gostaria de mais informações.";

/**
 * Monta um link wa.me com mensagem personalizada para um produto.
 * @param {string} phoneNumber - numero no formato 5522XXXXXXXXX
 * @param {string} productName - nome completo da maquina
 * @returns {string} URL pronta para usar em <a href>
 */
function createWhatsAppLink(phoneNumber, productName) {
  const base = `https://wa.me/${phoneNumber}`;
  const message = `Olá, tenho interesse na máquina ${productName} que vi no site da Loja Chuva.`;
  const encoded = encodeURIComponent(message);
  return `${base}?text=${encoded}`;
}

/**
 * Link generico do WhatsApp (sem produto especifico).
 * @returns {string}
 */
function createWhatsAppGenericLink() {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_DEFAULT_MESSAGE)}`;
}

/* -------------------------------------------------------------
   Utilitarios de seguranca / fallback
   ------------------------------------------------------------- */

// Escapa texto para inserir com seguranca no HTML.
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Valida se uma string parece uma URL http(s) utilizavel.
function isValidUrl(value) {
  if (!value || typeof value !== "string") return false;
  return /^https?:\/\/\S+/i.test(value.trim());
}

// Glifo do WhatsApp reutilizado nos botoes compactos.
var WHATSAPP_SVG =
  '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.12.55 4.18 1.6 6L4 29l8.16-1.55a12 12 0 0 0 3.88.64h.01C22.69 28.09 28 22.69 28 16.05 28 9.4 22.68 3 16.04 3zm0 21.9h-.01a10 10 0 0 1-3.4-.58l-.24-.1-4.84.92.92-4.72-.16-.25a9.94 9.94 0 0 1-1.52-5.3c0-5.5 4.48-9.98 9.99-9.98 2.67 0 5.18 1.04 7.06 2.93a9.9 9.9 0 0 1 2.93 7.06c0 5.5-4.48 9.98-9.99 9.98zm5.48-7.48c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.08 2.89 1.23 3.09.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.71.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35z"/></svg>';

/* -------------------------------------------------------------
   Imagem do produto com cadeia de fallback robusta
   Prioridade: imagem_local -> imagem (URL externa) -> fallback local.
   Assim, mesmo se a URL externa quebrar/bloquear hotlink, sempre
   aparece algo coerente (nunca o card vazio).
   ------------------------------------------------------------- */
var FALLBACK_IMG = "assets/produtos/_fallback.svg";

// Monta a lista ordenada de candidatos de imagem para um produto.
function imageSources(product) {
  const list = [];
  if (product && product.imagem_local) list.push(product.imagem_local);
  if (product && product.imagem) list.push(product.imagem);
  list.push(FALLBACK_IMG);
  return list;
}

// Gera a <img> ja com a cadeia de fallback embutida (data-fallback + onerror).
function productImageTag(product) {
  const sources = imageSources(product);
  const first = sources[0];
  const rest = sources.slice(1);
  const alt = (product && (product.nome_completo || product.modelo)) || "Produto";
  return (
    '<img src="' + escapeHtml(first) + '" alt="' + escapeHtml(alt) + '" loading="lazy" ' +
    'data-fallback="' + escapeHtml(JSON.stringify(rest)) + '" ' +
    'onerror="window.LojaChuva.imgError(this)">'
  );
}

// Avanca para o proximo candidato quando uma imagem falha ao carregar.
function imgError(img) {
  let list = [];
  try {
    list = JSON.parse(img.getAttribute("data-fallback") || "[]");
  } catch (e) {
    list = [];
  }
  if (list.length) {
    const next = list.shift();
    img.setAttribute("data-fallback", JSON.stringify(list));
    img.src = next;
  } else {
    // Esgotou os candidatos (nem o fallback carregou): usa o placeholder CSS.
    img.onerror = null;
    img.classList.add("is-broken");
  }
}

/**
 * Markup compartilhado de um card de produto (usado na Home e no Catalogo).
 * Trata campos ausentes com fallback elegante e imagem com placeholder.
 * @param {object} product
 * @returns {string}
 */
function buildProductCard(product) {
  const nome = product.nome_completo || product.modelo || "Produto";
  const modelo = product.modelo || nome;
  const slug = product.slug || product.id || "";
  const marca = product.marca || "";
  const waLink = createWhatsAppLink(WHATSAPP_NUMBER, nome);
  const url = `produto.html?slug=${encodeURIComponent(slug)}`;

  const imgHtml = productImageTag(product);
  const badgeHtml = marca
    ? `<span class="product-card__badge" data-brand="${escapeHtml(marca)}">${escapeHtml(marca)}</span>`
    : "";
  const cat = [product.categoria, product.subcategoria].filter(Boolean).join(" · ");
  const catHtml = cat ? `<span class="product-card__cat">${escapeHtml(cat)}</span>` : "";
  // Mostra o nome completo so quando ele acrescenta info alem do modelo.
  const nameHtml =
    nome && nome !== modelo ? `<p class="product-card__name">${escapeHtml(nome)}</p>` : "";
  const descHtml = product.descricao_curta
    ? `<p class="product-card__desc">${escapeHtml(product.descricao_curta)}</p>`
    : "";

  return `
    <article class="product-card reveal" data-brand="${escapeHtml(marca)}">
      <a class="product-card__media media-ph" href="${url}">
        ${badgeHtml}
        ${imgHtml}
      </a>
      <div class="product-card__body">
        ${catHtml}
        <h3 class="product-card__title">${escapeHtml(modelo)}</h3>
        ${nameHtml}
        ${descHtml}
        <div class="product-card__foot">
          <a class="product-card__link" href="${url}">Ver detalhes &rarr;</a>
          <a class="product-card__wa" href="${waLink}" target="_blank" rel="noopener"
             aria-label="Falar no WhatsApp sobre ${escapeHtml(nome)}">${WHATSAPP_SVG}</a>
        </div>
      </div>
    </article>
  `;
}

// Disponibiliza as funcoes para os outros scripts (sem modules nesta fase).
window.LojaChuva = window.LojaChuva || {};
window.LojaChuva.WHATSAPP_NUMBER = WHATSAPP_NUMBER;
window.LojaChuva.createWhatsAppLink = createWhatsAppLink;
window.LojaChuva.createWhatsAppGenericLink = createWhatsAppGenericLink;
window.LojaChuva.buildProductCard = buildProductCard;
window.LojaChuva.escapeHtml = escapeHtml;
window.LojaChuva.isValidUrl = isValidUrl;
window.LojaChuva.productImageTag = productImageTag;
window.LojaChuva.imgError = imgError;
// initScrollReveal e declarada abaixo (function declarations sao "hoisted"),
// por isso pode ser exposta com seguranca aqui.
window.LojaChuva.initScrollReveal = initScrollReveal;

/* -------------------------------------------------------------
   Inicializacao comum apos o DOM carregar
   ------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", function () {
  initMobileMenu();
  initFloatingWhatsApp();
  initFooterYear();
  initFeaturedProducts();
  initScrollReveal();
  initHeaderScroll();
});

// Abre/fecha o menu em telas pequenas.
function initMobileMenu() {
  const toggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", function () {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

// Aplica o link generico em todos os CTAs de WhatsApp (flutuante + botoes da pagina).
function initFloatingWhatsApp() {
  const genericLink = createWhatsAppGenericLink();
  const buttons = document.querySelectorAll("[data-whatsapp-float], [data-whatsapp-generic]");
  buttons.forEach(function (btn) {
    btn.setAttribute("href", genericLink);
  });
}

// Preenche o ano atual no rodape.
function initFooterYear() {
  const yearEl = document.querySelector("[data-current-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
}

// Aplica sombra/realce no header ao rolar a pagina.
// Quando a pagina tem hero ou catalog-hero, adiciona modo escuro/transparente.
function initHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  if (document.querySelector(".hero, .catalog-hero")) {
    header.classList.add("site-header--over-hero");
  }

  const onScroll = function () {
    header.classList.toggle("site-header--scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// Renderiza os "Produtos em destaque" na Home (ate 8 itens) a partir do JSON real.
function initFeaturedProducts() {
  const grid = document.querySelector("[data-featured-grid]");
  if (!grid) return;

  window.LojaChuva.loadProducts().then(function (products) {
    const destaques = (products || []).slice(0, 8);
    if (destaques.length === 0) {
      grid.innerHTML = '<p class="empty-state">Em breve, nossos produtos em destaque.</p>';
      return;
    }
    grid.innerHTML = destaques.map(buildProductCard).join("");
    // Reaplica a entrada animada nos cards recem-inseridos.
    initScrollReveal();
  });
}

// Entrada suave das secoes ao rolar. Respeita prefers-reduced-motion.
function initScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (items.length === 0) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced || !("IntersectionObserver" in window)) {
    items.forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  items.forEach(function (el) {
    observer.observe(el);
  });
}
