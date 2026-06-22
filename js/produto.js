/* =============================================================
   Loja Chuva v2.0 - produto.js
   -------------------------------------------------------------
   Le o parametro ?id=slug da URL e carrega o produto correspondente
   de public/data/products.json (via data-loader.js).
   Trata campos ausentes com fallback elegante.

   Depende de: data-loader.js e main.js. Carregue nesta ordem.
   ============================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const container = document.querySelector("[data-product]");
  if (!container) return;

  // Aceita ?slug= (padrao) ou ?id= (compatibilidade).
  const params = new URLSearchParams(window.location.search);
  const id = params.get("slug") || params.get("id");

  window.LojaChuva.loadProducts().then(function (products) {
    const product = (products || []).find(function (p) {
      return p.slug === id || p.id === id;
    });

    if (!product) {
      document.title = "Produto não encontrado | Loja Chuva";
      container.innerHTML =
        '<p class="empty-state">Produto não encontrado. ' +
        '<a href="catalogo.html">Voltar ao catálogo</a>.</p>';
      return;
    }

    // Title e meta description dinamicos (SEO / compartilhamento).
    updateProductMeta(product);

    container.innerHTML = renderProduct(product);

    if (typeof window.LojaChuva.initScrollReveal === "function") {
      window.LojaChuva.initScrollReveal();
    }
  });
});

// Converte a string "Chave: valor, Chave2: valor2" em linhas de tabela.
function buildSpecsRows(observacoes) {
  if (!observacoes || typeof observacoes !== "string") return "";
  const esc = window.LojaChuva.escapeHtml;

  const rows = observacoes
    .split(",")
    .map(function (part) {
      const idx = part.indexOf(":");
      if (idx === -1) return null;
      const chave = part.slice(0, idx).trim();
      const valor = part.slice(idx + 1).trim();
      if (!chave || !valor) return null;
      return "<tr><th>" + esc(chave) + "</th><td>" + esc(valor) + "</td></tr>";
    })
    .filter(Boolean);

  return rows.join("");
}

// Atualiza title e meta description com base no produto carregado.
function updateProductMeta(product) {
  const nome = product.nome_completo || product.modelo || "Produto";
  document.title = nome + " | Loja Chuva";
  const desc = product.descricao_curta || product.descricao_media || "";
  if (desc) {
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "description");
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", desc);
  }
}

// Monta o HTML da pagina de detalhe a partir do produto.
function renderProduct(product) {
  const esc = window.LojaChuva.escapeHtml;
  const nome = product.nome_completo || product.modelo || "Produto";
  const waLink = window.LojaChuva.createWhatsAppLink(
    window.LojaChuva.WHATSAPP_NUMBER,
    nome
  );

  // Imagem com cadeia de fallback (imagem_local -> imagem -> fallback local).
  const imgHtml = window.LojaChuva.productImageTag(product);

  // Categoria + subcategoria (quando houver).
  const categoriaTexto = [product.categoria, product.subcategoria]
    .filter(Boolean)
    .join(" · ");

  // Descricao longa: usa descricao_media; senao cai para a curta.
  const descLonga = product.descricao_media || product.descricao_longa || "";
  const descCurta = product.descricao_curta || "";

  // Aplicacoes (caso o JSON traga); senao a secao some.
  const aplicacoes = Array.isArray(product.principais_aplicacoes)
    ? product.principais_aplicacoes
    : [];
  const aplicacoesHtml = aplicacoes.length
    ? "<h2>Principais aplicações</h2><ul class=\"product-detail__apps\">" +
      aplicacoes
        .map(function (item) {
          return "<li>" + esc(item) + "</li>";
        })
        .join("") +
      "</ul>"
    : "";

  // Ficha tecnica: a partir de "especificacoes" (objeto) ou "observacoes" (texto).
  let specsRows = "";
  if (product.especificacoes && typeof product.especificacoes === "object") {
    specsRows = Object.keys(product.especificacoes)
      .map(function (chave) {
        return "<tr><th>" + esc(chave) + "</th><td>" +
          esc(product.especificacoes[chave]) + "</td></tr>";
      })
      .join("");
  } else {
    specsRows = buildSpecsRows(product.observacoes);
  }
  const specsHtml = specsRows
    ? '<h2>Ficha técnica</h2><table class="product-detail__specs"><tbody>' +
      specsRows + "</tbody></table>"
    : "";

  // Botao do site da marca: so aparece se o link for valido.
  const marcaBtnHtml = window.LojaChuva.isValidUrl(product.link_fabricante)
    ? '<a class="btn btn--outline" href="' + esc(product.link_fabricante) +
      '" target="_blank" rel="noopener">Ver detalhes no site da marca</a>'
    : "";

  const brandHtml = product.marca
    ? '<span class="product-detail__brand">' + esc(product.marca) + "</span>"
    : "";
  const categoriaHtml = categoriaTexto
    ? '<p class="product-detail__category">' + esc(categoriaTexto) + "</p>"
    : "";
  const descCurtaHtml = descCurta
    ? '<p class="product-detail__short">' + esc(descCurta) + "</p>"
    : "";
  const descLongaHtml = descLonga
    ? '<p class="product-detail__long">' + esc(descLonga) + "</p>"
    : "";

  return `
    <nav class="breadcrumb" aria-label="Você está em">
      <a href="index.html">Início</a> &rsaquo;
      <a href="catalogo.html">Catálogo</a> &rsaquo;
      ${product.marca ? '<a href="catalogo.html?marca=' + encodeURIComponent(product.marca) + '">' + esc(product.marca) + "</a> &rsaquo;" : ""}
      <span>${esc(product.categoria || "Produto")}</span> &rsaquo;
      <span>${esc(product.modelo || nome)}</span>
    </nav>

    <div class="product-detail">
      <div class="product-detail__media media-ph">
        ${imgHtml}
      </div>
      <div class="product-detail__info">
        ${brandHtml}
        <h1 class="product-detail__title">${esc(nome)}</h1>
        ${categoriaHtml}
        ${descCurtaHtml}
        ${descLongaHtml}
        ${aplicacoesHtml}
        ${specsHtml}

        <div class="product-detail__actions">
          <a class="btn btn--whatsapp" href="${waLink}" target="_blank" rel="noopener">
            Chamar no WhatsApp sobre este produto
          </a>
          ${marcaBtnHtml}
        </div>
      </div>
    </div>
  `;
}
