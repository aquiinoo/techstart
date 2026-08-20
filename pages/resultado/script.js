let currentUser;
let room;
let cachedUsers = [];

const params = new URLSearchParams(window.location.search);
const fallbackActiveRoom =
  window.TechStartApp &&
  typeof window.TechStartApp.getActiveRoom === "function"
    ? window.TechStartApp.getActiveRoom()
    : null;
const roomCode = (params.get("room") || fallbackActiveRoom?.code || "").toUpperCase();

const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popup-title");
const popupText = document.getElementById("popup-text");
const popupButton = document.getElementById("popup-button");

function scoreboardUrl(code = roomCode) {
  const url = new URL("../scoreboard/scoreboard.html", window.location.href);
  url.searchParams.set("room", code);
  return url.toString();
}

function redirectToDashboard(reason) {
  localStorage.setItem("techstart_last_duel_redirect", String(reason || "sem motivo"));
  window.location.href = "../dashboard/dashboard.html";
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

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function loadRoomWithRetry(code, attempts = 8, delay = 250) {
  for (let index = 0; index < attempts; index += 1) {
    const foundRoom = await TechStartApp.getRoomByCodeAsync(code);
    if (foundRoom) {
      return foundRoom;
    }
    await wait(delay);
  }
  return null;
}

function getUser(userId) {
  return cachedUsers.find((user) => user.id === userId) || null;
}

function renderResult() {
  const playerOne = room.players[0];
  const playerTwo = room.players[1];
  const userOne = playerOne ? getUser(playerOne.userId) : null;
  const userTwo = playerTwo ? getUser(playerTwo.userId) : null;
  const isDraw = !room.winnerUserId;
  const currentWon = room.winnerUserId === currentUser.id;
  const resultHero = document.getElementById("result-hero");
  const outcomePill = document.getElementById("outcome-pill");

  resultHero.classList.toggle("win", currentWon);
  resultHero.classList.toggle("loss", !isDraw && !currentWon);
  resultHero.classList.toggle("draw", isDraw);
  outcomePill.textContent = isDraw ? "EMPATE" : currentWon ? "VITORIA" : "DERROTA";

  document.getElementById("room-chip").textContent = `Sala ${room.code}`;
  document.getElementById("player-one-name").textContent = userOne ? userOne.name : "Jogador 1";
  document.getElementById("player-two-name").textContent = userTwo ? userTwo.name : "Jogador 2";
  document.getElementById("player-one-score").textContent = playerOne?.score || 0;
  document.getElementById("player-two-score").textContent = playerTwo?.score || 0;

  if (isDraw) {
    document.getElementById("result-title").textContent = "Empate";
    document.getElementById("result-summary").textContent = `Ninguem chegou a 2 rounds vencidos. Placar final: ${playerOne?.score || 0} x ${playerTwo?.score || 0}.`;
    return;
  }

  const winner = getUser(room.winnerUserId);
  document.getElementById("result-title").textContent = currentWon ? "Amassou ele!" : "Você perdeu ;(";
  document.getElementById("result-summary").textContent =
    room.finishedReason === "disconnect"
      ? `${winner ? winner.name : "O vencedor"} venceu por desconexao.`
      : `${winner ? winner.name : "O vencedor"} fechou a partida melhor de 3!`;
}

async function renderRoom() {
  room = await loadRoomWithRetry(roomCode);
  if (!room) {
    redirectToDashboard(`sala ${roomCode} nao carregou`);
    return;
  }
  if (room.status !== "finished") {
    window.location.assign(scoreboardUrl());
    return;
  }

  cachedUsers = await TechStartApp.getUsersAsync();
  renderResult();
}

document.getElementById("rematch-button").addEventListener("click", async () => {
  const updated = await TechStartApp.requestRematchAsync(room.code, currentUser.id);
  const button = document.getElementById("rematch-button");
  if (updated?.status === "lobby") {
    showPopup("Revanche aceita", "Os dois jogadores aceitaram. A nova sala está pronta.", () => {
      window.location.assign(scoreboardUrl(room.code));
    });
    return;
  }
  button.disabled = true;
  button.textContent = "Aguardando adversário...";
  showPopup("Revanche solicitada", "Você aceitou a revanche. Quando o outro jogador aceitar, a partida será reiniciada.");
});

document.getElementById("new-opponent-button").addEventListener("click", async () => {
  const result = await TechStartApp.requestRandomMatchAsync(currentUser.id, "Java");
  if (!result.ok) {
    showPopup("Fila indisponivel", result.message);
    return;
  }
  window.location.assign(scoreboardUrl(result.room.code));
});

function buildMockRoom() {
  return {
    code: "MOCK1",
    status: "finished",
    finishedReason: params.get("reason") === "disconnect" ? "disconnect" : "normal",
    winnerUserId:
      params.get("draw") === "1"
        ? null
        : params.get("lose") === "1"
        ? "mock-user-2"
        : "mock-user-1",
    players: [
      { userId: "mock-user-1", score: 2 },
      { userId: "mock-user-2", score: 1 },
    ],
  };
}

function buildMockUsers() {
  return [
    { id: "mock-user-1", name: "Jogador Um", nick: "j1" },
    { id: "mock-user-2", name: "Jogador Dois", nick: "j2" },
  ];
}

(async () => {
  if (params.get("mock") === "1") {
    currentUser = buildMockUsers()[0];
    room = buildMockRoom();
    cachedUsers = buildMockUsers();
    renderResult();
    return;
  }

  if (!roomCode) {
    redirectToDashboard("codigo da sala ausente");
    return;
  }
  await TechStartApp.loadChallengesAsync();
  currentUser = await TechStartApp.requireAuthAsync();
  await renderRoom();
  window.setInterval(renderRoom, 1500);
})();