let currentUser;

const menuItems = document.querySelectorAll(".menu-item");
const panels = document.querySelectorAll(".panel");
const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popup-title");
const popupText = document.getElementById("popup-text");
const popupButton = document.getElementById("popup-button");
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
  menuItems.forEach((button) => button.classList.toggle("active", button.dataset.target === target));
  panels.forEach((panel) => panel.classList.toggle("active-panel", panel.id === `panel-${target}`));
}

function showPopup(title, text, callback) {
  popupTitle.textContent = title;
  popupText.textContent = text;
  popup.classList.remove("hidden");
  popupButton.onclick = () => {
    popup.classList.add("hidden");
    if (callback) {
      callback();
    }
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
  document.getElementById("preferred-language").textContent = `Linguagem favorita: ${user.language}`;
  document.getElementById("firebase-status").textContent = TechStartFirebase.status;
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
  const users = [...(await TechStartApp.getUsersAsync())].sort((a, b) => b.rankingPoints - a.rankingPoints);
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
          <button class="connect-button" data-connect-id="${profile.id}">
            ${(user.connections || []).includes(profile.id) ? "Conectado" : "Conectar"}
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

async function refresh() {
  const user = await TechStartApp.getCurrentUserAsync();
  currentUser = user;
  renderGreeting(user);
  renderProfile(user);
  renderHistory(user);
  await renderRanking(user);
  await renderProfiles(user);
  await renderHelpRequests(user);
}

menuItems.forEach((button) => {
  button.addEventListener("click", () => openPanel(button.dataset.target));
});

document.getElementById("botao_sair").addEventListener("click", async () => {
  await TechStartApp.logoutAsync();
  window.location.href = "../../index.html";
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
  const room = await TechStartApp.createRoomAsync(currentUser.id, "Java");
  await TechStartApp.startOfflineTrainingAsync(room.code, currentUser.id);
  window.location.assign(buildChallengeUrl(room.code, { mode: "offline" }));
});

document.getElementById("botao_criar").addEventListener("click", async () => {
  const room = await TechStartApp.createRoomAsync(currentUser.id, "Java");
  const duelUrl = buildDuelUrl(room.code);
  document.getElementById("room-link").innerHTML = `Link copiavel: <strong>${duelUrl}</strong>`;
  navigator.clipboard?.writeText(duelUrl).catch(() => {});
  window.location.assign(duelUrl);
});

document.getElementById("botao_entrar").addEventListener("click", async () => {
  const code = document.getElementById("join-room-code").value;
  const result = await TechStartApp.joinRoomByCodeAsync(code, currentUser.id);
  if (!result.ok) {
    showPopup("Nao foi possivel entrar", result.message);
    return;
  }
  window.location.assign(buildDuelUrl(code.toUpperCase()));
});

document.getElementById("botao_buscar").addEventListener("click", async () => {
  const result = await TechStartApp.requestRandomMatchAsync(currentUser.id, "Java");
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