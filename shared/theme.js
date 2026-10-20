// Tema claro/escuro do TechStart.
// Carregue este arquivo no <head>, sem defer, para aplicar o tema antes da primeira pintura (sem "piscada").
(function () {
  var KEY = "techstart_theme";
  var root = document.documentElement;

  function readSaved() {
    try {
      return window.localStorage.getItem(KEY);
    } catch (error) {
      return null;
    }
  }

  function save(theme) {
    try {
      window.localStorage.setItem(KEY, theme);
    } catch (error) {
      /* localStorage indisponivel: o tema vale apenas nesta pagina */
    }
  }

  function currentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function paintButton(button) {
    if (!button) return;
    var isLight = currentTheme() === "light";
    // O botao mostra para qual tema vai a troca: lua (tema escuro) no tema claro, sol no tema escuro.
    var icon = button.querySelector(".pxi");
    if (icon) icon.className = "pxi " + (isLight ? "pxi-moon" : "pxi-sun");
    var text = button.querySelector(".menu-label");
    if (text) text.textContent = isLight ? "Tema escuro" : "Tema claro";
    var label = isLight ? "Mudar para o tema escuro" : "Mudar para o tema claro";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    paintButton(document.getElementById("theme-toggle"));
  }

  // Tema escuro continua sendo o padrao (identidade atual do projeto).
  applyTheme(readSaved() === "light" ? "light" : "dark");

  function mountButton() {
    if (document.getElementById("theme-toggle")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.id = "theme-toggle";
    button.className = "theme-toggle";
    button.addEventListener("click", function () {
      var next = currentTheme() === "light" ? "dark" : "light";
      save(next);
      applyTheme(next);
    });

    // Paginas com menu lateral (dashboard): o botao vira um item do menu, acima do "Sair".
    // Nas demais paginas ele fica flutuando no canto superior direito.
    var sidebar = document.querySelector(".barra_lateral");
    if (sidebar) {
      button.classList.add("theme-toggle--menu");
      button.innerHTML = '<span class="pxi pxi-sun" aria-hidden="true"></span><span class="menu-label"></span>';
      var logout = sidebar.querySelector("#botao_sair");
      sidebar.insertBefore(button, logout || null);
    } else {
      button.innerHTML = '<span class="pxi pxi-sun" aria-hidden="true"></span>';
      document.body.appendChild(button);
    }
    paintButton(button);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountButton);
  } else {
    mountButton();
  }

  // Mantem varias abas sincronizadas.
  window.addEventListener("storage", function (event) {
    if (event.key === KEY) applyTheme(event.newValue === "light" ? "light" : "dark");
  });

  window.TechStartTheme = { get: currentTheme, set: function (t) { save(t); applyTheme(t); } };
})();
