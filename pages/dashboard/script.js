let currentUser;

const menuItems = document.querySelectorAll(".menu-item");
const panels = document.querySelectorAll(".panel");
const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popup-title");
const popupText = document.getElementById("popup-text");
const popupButton = document.getElementById("popup-button");
const popupCancel = document.getElementById("popup-cancel");
const botaoSair = document.getElementById("botao_sair")
const botaoCriar = document.getElementById("botao_criar")
const botaoEntrar = document.getElementById("botao_entrar")
const botaoBuscar = document.getElementById("botao_buscar")
const pandaImg = document.querySelector("img[alt='Panda Rodando']")

botaoSair.addEventListener("mouseenter", () => {

  if(pandaImg) {

    pandaImg.src = "../../assets/triste.gif";

  }

});

botaoSair.addEventListener("mouseleave", () => {

  if(pandaImg) {

    pandaImg.src = "../../assets/pandarodando.gif";

  }

});

botaoCriar.addEventListener("mouseenter", () => {

  if(pandaImg) {

    pandaImg.src = "../../assets/prontopralutarv2.gif";

  }

})

botaoCriar.addEventListener("mouseleave", () =>{

  if(pandaImg) {

    pandaImg.src = "../../assets/pandarodando.gif";

  }

})

botaoEntrar.addEventListener("mouseenter", () => {

  if(pandaImg) {

    pandaImg.src = "../../assets/prontopralutarv2.gif";

  }

})

botaoEntrar.addEventListener("mouseleave", () =>{

  if(pandaImg) {

    pandaImg.src = "../../assets/pandarodando.gif";

  }

})

botaoBuscar.addEventListener("mouseenter", () => {

  if(pandaImg) {

    pandaImg.src = "../../assets/prontopralutarv2.gif";

  }

})

botaoBuscar.addEventListener("mouseleave", () =>{

  if(pandaImg) {

    pandaImg.src = "../../assets/pandarodando.gif";

  }

})

function openPanel(target) {
  menuItems.forEach((button) => {
    const selected = button.dataset.target === target;
    button.classList.toggle("active", selected);

    const icon = button.querySelector(".menu-icon");
    if (icon) {
      icon.src = selected
        ? icon.dataset.selectedIcon
        : icon.dataset.defaultIcon;
    }
  });

  panels.forEach((panel) =>
    panel.classList.toggle("active-panel", panel.id === `panel-${target}`)
  );
}

function showPopup(title, text, callback) {
  popupTitle.textContent = title;
  popupText.textContent = text;
  popupButton.textContent = "Continuar";
  popupCancel.classList.add("hidden");
  popup.classList.remove("hidden");
  popupButton.onclick = () => {
    popup.classList.add("hidden");
    if (callback) {
      callback();
    }
  };
}

function showConfirmationPopup(title, text, onConfirm) {
  popupTitle.textContent = title;
  popupText.textContent = text;
  popupButton.textContent = "Confirmar";
  popupCancel.classList.remove("hidden");
  popup.classList.remove("hidden");
  popupButton.onclick = onConfirm;
  popupCancel.onclick = () => {
    popup.classList.add("hidden");
  };
}

function buildDuelUrl(roomCode, extras = {}) {
  const url = new URL("../scoreboard/scoreboard.html", window.location.href);
  url.searchParams.set("room", roomCode);
  Object.entries(extras).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

function buildChallengeUrl(roomCode, extras = {}) {
  const url = new URL("../desafio/desafio.html", window.location.href);
  url.searchParams.set("room", roomCode);
  Object.entries(extras).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

function renderGreeting(user) {
  document.getElementById("greeting").textContent = `Olá, ${user.name}`;
  const firebaseStatusEl = document.getElementById("firebase-status");
  if (firebaseStatusEl) {
    firebaseStatusEl.textContent = TechStartFirebase.status;
  }
}

function renderProfile(user) {
  document.getElementById("profile-name").value = user.name || "";
  document.getElementById("profile-nick").value = user.nick || "";
  document.getElementById("profile-github").value = user.github || "";
  document.getElementById("profile-bio").value = user.bio || "";
  document.getElementById("profile-language").value = user.language || "Java";
}

function renderHistory(user) {
  const historyList = document.getElementById("history-list");
  const history = user.history || [];
  if (!history.length) {
    historyList.innerHTML = `<article class="history-item"><strong>Sem partidas ainda.</strong><p>Assim que você treinar ou disputar um duelo, o histórico aparecerá aqui.</p></article>`;
    return;
  }

  historyList.innerHTML = history
    .map(
      (entry) => `
        <article class="history-item">
          <strong>${entry.result}</strong>
          <p>${entry.type === "offline" ? "Treino" : "Duelo"} - ${entry.opponent}</p>
          <p>Placar/Linguagem: ${entry.score}</p>
          <p>${TechStartApp.formatDate(entry.date)}</p>
        </article>
      `
    )
    .join("");
}

async function renderRanking(user) {
  const users = [...(await TechStartApp.getUsersAsync())]
  
  .filter((item) => !item.guest)
  .sort((a, b) => b.rankingPoints - a.rankingPoints);

  const friends = users.filter((item) => item.id === user.id || (user.connections || []).includes(item.id));

  document.getElementById("ranking-general").innerHTML = users
    .map(
      (item, index) => `
        <article class="ranking-item">
          <strong>#${index + 1} ${item.name}</strong>
          <p>@${item.nick} - ${item.rankingPoints} pontos</p>
        </article>
      `
    )
    .join("");

  document.getElementById("ranking-friends").innerHTML = friends.length
    ? friends
        .map(
          (item, index) => `
            <article class="ranking-item">
              <strong>#${index + 1} ${item.name}</strong>
              <p>@${item.nick} - ${item.rankingPoints} pontos</p>
            </article>
          `
        )
        .join("")
    : `<article class="ranking-item"><strong>Sem conexoes ainda</strong><p>Conecte-se com outros jogadores para ver o ranking entre amigos.</p></article>`;
}

async function renderProfiles(user) {
  const profiles = await TechStartApp.getPublicProfilesAsync(user.id);
  const profilesList = document.getElementById("profiles-list");
  
  profilesList.innerHTML = profiles
    .map(
      (profile) => `
        <article class="profile-card">
          <strong>${profile.name}</strong>
          <p>@${profile.nick}</p>
          <div class="profile-meta">
            <span>${profile.language}</span>
            <span>${profile.github ? `<a href="${profile.github}" target="_blank" rel="noreferrer">GitHub</a>` : "Sem GitHub"}</span>
          </div>
          <p>${profile.bio || "Sem bio cadastrada."}</p>
          <button class="connect-button primary-button" data-connect-id="${profile.id}">
            ${(user.connections || []).includes(profile.id) ? "Seguindo" : "Seguir"}
          </button>
        </article>
      `
    )
    .join("");

  document.querySelectorAll("[data-connect-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.textContent === "Conectado") {
        showPopup("Conexão existente", "Você já está conectado com este jogador.");
        return;
      }
      await TechStartApp.connectUsersAsync(user.id, button.dataset.connectId);
      await refresh();
      showPopup("Conexão criada", "Agora vocês aparecem no ranking entre amigos.");
    });
  });
}

async function renderHelpRequests(user) {
  const list = document.getElementById("help-requests");
  const requests = (await TechStartApp.getHelpRequestsAsync()).filter((item) => item.userId !== user.id);
  const users = await TechStartApp.getUsersAsync();
  if (!requests.length) {
    list.innerHTML = `<article class="help-item"><strong>Nenhuma solicitacao aberta.</strong><p>Quando outro jogador pedir ajuda durante um duelo, ela aparecera aqui.</p></article>`;
    return;
  }

  list.innerHTML = requests
    .map((request) => {
      const owner = users.find((item) => item.id === request.userId);
      return `
        <article class="help-item">
          <strong>${owner ? owner.name : "Jogador"}</strong>
          <p>${request.details}</p>
          <p>Sala ${request.roomCode} - ${TechStartApp.formatDate(request.createdAt)}</p>
          <button class="accept-button" data-help-id="${request.id}">${request.status === "accepted" ? "Ajuda aceita" : "Auxiliar"}</button>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll("[data-help-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.textContent === "Ajuda aceita") {
        return;
      }
      await TechStartApp.acceptHelpRequestAsync(button.dataset.helpId, user.id);
      await refresh();
      showPopup("Ajuda registrada", "Seu auxílio foi vinculado e você recebeu pontos de colaboração.");
    });
  });
}

// Linguagem dos desafios: vem do perfil do jogador e pode ser trocada na tela inicial.
function getSelectedLanguage() {
  const select = document.getElementById("home-language");
  return (select && select.value) || (currentUser && currentUser.language) || "Java";
}

function renderLanguage(user) {
  const select = document.getElementById("home-language");
  if (select) {
    select.value = user.language || "Java";
  }
  document.querySelectorAll(".current-language").forEach((element) => {
    element.textContent = getSelectedLanguage();
  });
}

async function refresh() {
  const user = await TechStartApp.getCurrentUserAsync();
  currentUser = user;
  renderGreeting(user);
  renderProfile(user);
  renderLanguage(user);
  sincronizarSeletoresLinguagem();
  renderHistory(user);
  await renderRanking(user);
  await renderProfiles(user);
  await renderHelpRequests(user);
}

menuItems.forEach((button) => {
  button.addEventListener("click", () => openPanel(button.dataset.target));
});

document.getElementById("home-language").addEventListener("change", async (event) => {
  const language = event.target.value;
  // updateProfile apaga github/bio quando eles nao sao enviados, entao manda o perfil completo.
  await TechStartApp.updateProfileAsync(currentUser.id, {
    name: currentUser.name,
    nick: currentUser.nick,
    github: currentUser.github,
    bio: currentUser.bio,
    language,
  });
  await refresh();
});

botaoSair.addEventListener("click", async () => {
  showConfirmationPopup(
    "Sair da conta",
    "Tem certeza que deseja sair?",
    async () => {
      popupButton.disabled = true;
      try {
        await TechStartApp.logoutAsync();
        popup.classList.add("hidden");
        window.location.href = "../../index.html";
      } catch (error) {
        console.error("Erro ao sair da conta:", error);
        showPopup(
          "Não foi possível sair",
          "Ocorreu um erro ao encerrar sua sessão. Tente novamente."
        );
      } finally {
        popupButton.disabled = false;
      }
    }
  );
});

document.getElementById("profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const updated = await TechStartApp.updateProfileAsync(currentUser.id, {
    name: document.getElementById("profile-name").value,
    nick: document.getElementById("profile-nick").value,
    github: document.getElementById("profile-github").value,
    bio: document.getElementById("profile-bio").value,
    language: document.getElementById("profile-language").value,
  });
  document.getElementById("profile-feedback").textContent = `Perfil salvo com sucesso para ${updated.name}.`;
  await refresh();
});

document.getElementById("support-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const subject = document.getElementById("support-subject").value;
  const message = document.getElementById("support-message").value;
  if (!message.trim()) {
    document.getElementById("support-feedback").textContent = "Escreva uma mensagem para enviar ao suporte.";
    return;
  }
  await TechStartApp.sendSupportMessageAsync(currentUser.id, subject, message);
  document.getElementById("support-feedback").textContent = "Mensagem enviada para a equipe TechStart.";
  event.target.reset();
});

document.getElementById("botao_treinar").addEventListener("click", async () => {
  const room = await TechStartApp.createRoomAsync(currentUser.id, getSelectedLanguage());
  await TechStartApp.startOfflineTrainingAsync(room.code, currentUser.id);
  window.location.assign(buildChallengeUrl(room.code, { mode: "offline" }));
});

document.getElementById("botao_criar").addEventListener("click", async () => {
  const room = await TechStartApp.createRoomAsync(currentUser.id, getSelectedLanguage());
  const duelUrl = buildDuelUrl(room.code);
  document.getElementById("room-link").innerHTML = `Link copiavel: <strong>${duelUrl}</strong>`;
  navigator.clipboard?.writeText(duelUrl).catch(() => {});
  window.location.assign(duelUrl);
});

document.getElementById("botao_entrar").addEventListener("click", async () => {
  const code = document.getElementById("input_codigo").value;
  const result = await TechStartApp.joinRoomByCodeAsync(code, currentUser.id);
  if (!result.ok) {
    showPopup("Nao foi possivel entrar", result.message);
    return;
  }
  window.location.assign(buildDuelUrl(code.toUpperCase()));
});

document.getElementById("botao_buscar").addEventListener("click", async () => {
  const result = await TechStartApp.requestRandomMatchAsync(currentUser.id, getSelectedLanguage());
  if (!result.ok) {
    showPopup("Fila indisponivel", result.message);
    return;
  }
  showPopup("Fila atualizada", `Sala ${result.room.code} pronta para partida aleatoria.`, () => {
    window.location.assign(buildDuelUrl(result.room.code));
  });
});

(async () => {
  await TechStartApp.loadChallengesAsync();
  currentUser = await TechStartApp.requireAuthAsync();
  await refresh();
  openPanel("home");
})();

// Criar estrelas
function criarEstrelas() {
  const container = document.getElementById("estrelas-container");
  for (let i = 0; i < 50; i++) {
    const estrela = document.createElement("div");
    estrela.className = "estrela";
    estrela.style.left = Math.random() * 100 + "%";
    estrela.style.top = Math.random() * 100 + "%";
    estrela.style.animationDelay = Math.random() * 3 + "s";
    container.appendChild(estrela);
  }
}
criarEstrelas();

// Criar blocos de código
function criarCodigos() {
  const container = document.getElementById("codigos-container");
  const snippets = [
    "public class Main {\n  public static void main() {\n    System.out.println(\"Hello\");\n  }\n}",
    "int[] arr = {1, 2, 3};\nfor (int i : arr) {\n  System.out.println(i);\n}",
    "class User {\n  String name;\n  User(String n) {\n    name = n;\n  }\n}",
    "public void loop() {\n  while (true) {\n    System.out.println(\"loop\");\n  }\n}"
  ];

  for (let i = 0; i < 8; i++) {
    const bloco = document.createElement("div");
    bloco.className = "codigo-bloco";
    bloco.textContent = snippets[i % snippets.length];
    bloco.style.left = Math.random() * 80 + "%";
    bloco.style.top = Math.random() * 80 + "%";
    bloco.style.animationDelay = Math.random() * 6 + "s";
    container.appendChild(bloco);
  }
}
criarCodigos();


const linguagensDashboard = [
  {
    nome: "Java",
    cor: "#f89820",
    icone: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg",
    exemplo: `<span class="code-class">System</span><span class="code-default">.</span><span class="code-property">out</span><span class="code-default">.</span><span class="code-function">println</span><span class="code-default">(</span><span class="code-string">"Olá, mundo!"</span><span class="code-default">);</span>`
  },
  {
    nome: "JavaScript",
    cor: "#f7df1e",
    icone: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg",
    exemplo: `<span class="code-object">console</span><span class="code-default">.</span><span class="code-function">log</span><span class="code-default">(</span><span class="code-string">"Olá, mundo!"</span><span class="code-default">);</span>`
  },
  {
    nome: "Python",
    cor: "#3776ab",
    icone: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg",
    exemplo: `<span class="code-function">print</span><span class="code-default">(</span><span class="code-string">"Olá, mundo!"</span><span class="code-default">)</span>`
  },
  {
    nome: "C#",
    cor: "#512bd4",
    icone: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/csharp/csharp-original.svg",
    exemplo: `<span class="code-class">Console</span><span class="code-default">.</span><span class="code-function">WriteLine</span><span class="code-default">(</span><span class="code-string">"Olá, mundo!"</span><span class="code-default">);</span>`
  }
];

function atualizarVisualLinguagem(select) {
  const linguagem = linguagensDashboard.find(
    (item) => item.nome === select.value
  ) || linguagensDashboard[0];

  const texto = select.closest(".language-select")
    .querySelector(".language-select-trigger span");

  texto.textContent = linguagem.nome;
  texto.style.color = linguagem.cor;

  if (select.id === "home-language") {
    document.querySelectorAll("#panel-home .current-language").forEach((elemento) => {
      elemento.style.color = linguagem.cor;
    });
  }
}

function sincronizarSeletoresLinguagem() {
  ["home-language", "profile-language"].forEach((id) => {
    const select = document.getElementById(id);
    if (select) atualizarVisualLinguagem(select);
  });
}

function configurarSeletoresLinguagem() {
  ["home-language", "profile-language"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;

    const container = select.closest(".language-select");
    const botao = container.querySelector(".language-select-trigger");
    const lista = container.querySelector(".language-select-options");

    lista.innerHTML = linguagensDashboard.map((linguagem) => `
      <button type="button" class="language-select-option" data-language="${linguagem.nome}">
        <span class="language-name" style="color: ${linguagem.cor}">
          ${linguagem.nome}
        </span>
        <code class="language-example">${linguagem.exemplo}</code>
        <img class="language-icon" src="${linguagem.icone}" alt="">
      </button>
    `).join("");

    botao.addEventListener("click", () => {
      const abrir = lista.hidden;

      document.querySelectorAll(".language-select-options").forEach((outraLista) => {
        outraLista.hidden = true;
        outraLista.closest(".language-select")
          .querySelector(".language-select-trigger")
          .setAttribute("aria-expanded", "false");
      });

      lista.hidden = !abrir;
      botao.setAttribute("aria-expanded", String(abrir));
    });

    lista.addEventListener("click", (event) => {
      const opcao = event.target.closest(".language-select-option");
      if (!opcao) return;

      const linguagem = linguagensDashboard.find(
        (item) => item.nome === opcao.dataset.language
      );

      if (!linguagem) return;

      select.value = linguagem.nome;
      atualizarVisualLinguagem(select);

      lista.hidden = true;
      botao.setAttribute("aria-expanded", "false");
      botao.focus();

      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    select.addEventListener("change", () => {
      atualizarVisualLinguagem(select);
    });

    atualizarVisualLinguagem(select);
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".language-select")) return;

    document.querySelectorAll(".language-select-options").forEach((lista) => {
      lista.hidden = true;
      lista.closest(".language-select")
        .querySelector(".language-select-trigger")
        .setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    document.querySelectorAll(".language-select-options").forEach((lista) => {
      if (lista.hidden) return;

      lista.hidden = true;

      const botao = lista.closest(".language-select")
        .querySelector(".language-select-trigger");

      botao.setAttribute("aria-expanded", "false");
      botao.focus();
    });
  });
}

configurarSeletoresLinguagem();
