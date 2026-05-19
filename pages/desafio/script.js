let duelUser;

import { OPENROUTER_API_KEY } from "./config.js";

const params = new URLSearchParams(window.location.search);

const fallbackActiveRoom =
  window.TechStartApp &&
  typeof window.TechStartApp.getActiveRoom === "function"
    ? window.TechStartApp.getActiveRoom()
    : null;

const roomCode = (
  params.get("room") ||
  fallbackActiveRoom?.code ||
  ""
).toUpperCase();

const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popup-title");
const popupText = document.getElementById("popup-text");
const popupButton = document.getElementById("popup-button");


// ==============================
// GEMINI IA
// ==============================

async function analyzeWithAI(code, challenge) {

  try {

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [
            {
              role: "user",
              content: `
Você é um juiz de duelo de programação.

Desafio:
${challenge}

Código:
${code}

Responda apenas:

Acertos:
- ...

Erros:
- ...

Dica:
- ...
`
            }
          ]
        })
      }
    );

    const data = await response.json();

    console.log(data);

    if (!response.ok) {

      return `
Erro API:
${data.error?.message || "Erro desconhecido"}
`;

    }

    return data.choices[0].message.content;

  } catch (error) {

    console.error(error);

    return "Erro ao conectar com IA.";

  }

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

function redirectToDashboard(reason) {

  try {

    localStorage.setItem(
      "techstart_last_duel_redirect",
      String(reason || "sem motivo")
    );

  } catch (error) {

    console.warn(
      "Nao foi possivel registrar o motivo do redirecionamento.",
      error
    );

  }

  console.warn("Redirecionando para dashboard:", reason);

  window.location.href = "../dashboard/dashboard.html";

}

if (!roomCode) {
  redirectToDashboard(
    "roomCode ausente na URL e sem sala ativa salva"
  );
}

let room;

function wait(ms) {

  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

}

async function loadRoomWithRetry(
  code,
  attempts = 8,
  delay = 250
) {

  for (let index = 0; index < attempts; index += 1) {

    const foundRoom =
      await TechStartApp.getRoomByCodeAsync(code);

    if (foundRoom) {
      return foundRoom;
    }

    await wait(delay);

  }

  return null;

}

function getPlayerInfo(player) {

  return cachedUsers.find(
    (user) => user.id === player.userId
  );

}

let cachedUsers = [];


// ==============================
// RENDER ROOM
// ==============================

async function renderRoom() {

  room = await loadRoomWithRetry(roomCode);

  if (!room) {

    showPopup(
      "Sala indisponivel",
      "Nao foi possivel carregar a sala deste duelo.",
      () => {
        redirectToDashboard(
          `sala ${roomCode} nao carregou`
        );
      }
    );

    return;

  }

  cachedUsers = await TechStartApp.getUsersAsync();

  const playerOne = room.players[0];
  const playerTwo = room.players[1];

  const userOne = playerOne
    ? getPlayerInfo(playerOne)
    : null;

  const userTwo = playerTwo
    ? getPlayerInfo(playerTwo)
    : null;

  const challenge =
    TechStartApp.getChallengeById(
      room.currentChallengeId
    );

  const currentPlayer = room.players.find(
    (player) => player.userId === duelUser.id
  );

  document.getElementById(
    "room-chip"
  ).textContent = `Sala ${room.code}`;

  document.getElementById(
    "challenge-title"
  ).textContent =
    room.status === "playing"
      ? "Duelo em andamento"
      : room.status === "finished"
      ? "Duelo encerrado"
      : "Lobby da sala";

  document.getElementById(
    "challenge-description"
  ).textContent =
    challenge.description;

  document.getElementById(
    "challenge-name"
  ).textContent = challenge.title;

  document.getElementById(
    "language-chip"
  ).textContent = room.language;

  document.getElementById(
    "solution-input"
  ).placeholder = challenge.starter;

  document.getElementById(
    "player-one-name"
  ).textContent = userOne
    ? userOne.name
    : "Aguardando jogador";

  document.getElementById(
    "player-one-status"
  ).textContent = playerOne
    ? playerOne.ready
      ? "PRONTO"
      : "Aguardando"
    : "Sem jogador";

  document.getElementById(
    "player-one-score"
  ).textContent =
    `${playerOne ? playerOne.score : 0} pts`;

  document.getElementById(
    "player-two-name"
  ).textContent = userTwo
    ? userTwo.name
    : "Aguardando jogador";

  document.getElementById(
    "player-two-status"
  ).textContent = playerTwo
    ? playerTwo.ready
      ? "PRONTO"
      : "Aguardando"
    : "Sem jogador";

  document.getElementById(
    "player-two-score"
  ).textContent =
    `${playerTwo ? playerTwo.score : 0} pts`;

  document.getElementById(
    "round-indicator"
  ).textContent =
    `Round ${room.currentRound}/${room.totalRounds}`;

  document.getElementById(
    "timer-indicator"
  ).textContent =
    room.timerStartedAt
      ? `Tempo iniciado em ${TechStartApp.formatDate(room.timerStartedAt)}`
      : "Tempo: aguardando inicio";

  const winner = room.winnerUserId
    ? cachedUsers.find(
        (user) => user.id === room.winnerUserId
      )
    : null;

  document.getElementById(
    "winner-indicator"
  ).textContent = winner
    ? `Vencedor atual: ${winner.name}`
    : "Sem vencedor";

  renderChat();

}


// ==============================
// CHAT
// ==============================

function renderChat() {

  const chat = room.chat || [];

  const container =
    document.getElementById("chat-messages");

  if (!chat.length) {

    container.innerHTML = `
      <div class="chat-message">
        <strong>Chat da sala</strong>
        <p class="muted">
          Envie a primeira mensagem.
        </p>
      </div>
    `;

    return;

  }

  container.innerHTML = chat
    .map((message) => {

      const user = cachedUsers.find(
        (item) => item.id === message.userId
      );

      return `
        <div class="chat-message">
          <strong>${user ? user.nick : "Jogador"}</strong>
          <p>${message.message}</p>
        </div>
      `;

    })
    .join("");

}


// ==============================
// BOTAO TESTAR COM IA
// ==============================

document
  .getElementById("test-button")
  .addEventListener("click", async () => {

    const code =
      document.getElementById("solution-input").value;

    if (!code.trim()) {

      showPopup(
        "Codigo vazio",
        "Digite uma solucao antes de testar."
      );

      return;

    }

    document.getElementById(
      "ai-output"
    ).textContent =
      "Analisando codigo com Gemini...";

    try {

      const challenge =
        document.getElementById(
          "challenge-name"
        ).textContent;

      const aiResponse =
        await analyzeWithAI(code, challenge);

      document.getElementById(
        "ai-output"
      ).textContent = aiResponse;

      document.getElementById(
        "result-output"
      ).textContent =
        "Analise concluida com sucesso.";

    } catch (error) {

      console.error(error);

      document.getElementById(
        "ai-output"
      ).textContent =
        "Erro ao conectar com Gemini.";

    }

  });


// ==============================
// RESTANTE DO SISTEMA
// ==============================

(async () => {

  duelUser =
    await TechStartApp.requireAuthAsync();

  room = await loadRoomWithRetry(roomCode);

  if (!room) {

    redirectToDashboard(
      `sala ${roomCode} nao encontrada`
    );

    return;

  }

  await renderRoom();

  window.setInterval(() => {
    renderRoom();
  }, 3000);

})();