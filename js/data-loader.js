/* =============================================================
   Loja Chuva v2.0 - data-loader.js
   -------------------------------------------------------------
   Carrega o catalogo real de public/data/products.json via fetch,
   com cache em memoria. Usado por main.js, catalogo.js e produto.js.

   Observacao: fetch de arquivo local NAO funciona abrindo o HTML
   direto com file:// (bloqueio do navegador). Funciona em servidor
   (Live Server, "python -m http.server" ou na Hostinger/public_html).
   ============================================================= */

window.LojaChuva = window.LojaChuva || {};

(function () {
  var cache = null;

  // Retorna uma Promise com o array de produtos (ou [] em caso de erro).
  function loadProducts() {
    if (cache) return Promise.resolve(cache);

    return fetch("data/products.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        cache = Array.isArray(data) ? data : [];
        return cache;
      })
      .catch(function (err) {
        console.error("Loja Chuva: falha ao carregar products.json", err);
        cache = [];
        return cache;
      });
  }

  window.LojaChuva.loadProducts = loadProducts;
})();
