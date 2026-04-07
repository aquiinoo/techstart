let duelUser;
const params = new URLSearchParams(window.location.search);
const fallbackActiveRoom = window.TechStartApp && typeof window.TechStartApp.getActiveRoom === "function"
  ? window.TechStartApp.getActiveRoom()
  : null;
const roomCode = (params.get("room") || fallbackActiveRoom?.code || "").toUpperCase();
const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popup-title");
const popupText = document.getElementById("popup-text");
const popupButton = document.getElementById("popup-button");

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
    localStorage.setItem("techstart_last_duel_redirect", String(reason || "sem motivo"));
  } catch (error) {
    console.warn("Nao foi possivel registrar o motivo do redirecionamento.", error);
  }
  console.warn("Redirecionando para dashboard:", reason);
  window.location.href = "../dashboard/dashboard.html";
}

if (!roomCode) {
  redirectToDashboard("roomCode ausente na URL e sem sala ativa salva");
}

let room;

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

function getPlayerInfo(player) {
  return cachedUsers.find((user) => user.id === player.userId);
}

let cachedUsers = [];

async function renderRoom() {
  room = await loadRoomWithRetry(roomCode);
  if (!room) {
    showPopup("Sala indisponivel", "Nao foi possivel carregar a sala deste duelo.", () => {
      redirectToDashboard(`sala ${roomCode} nao carregou`);
    });
    return;
  }
  cachedUsers = await TechStartApp.getUsersAsync();
  const playerOne = room.players[0];
  const playerTwo = room.players[1];
  const userOne = playerOne ? getPlayerInfo(playerOne) : null;
  const userTwo = playerTwo ? getPlayerInfo(playerTwo) : null;
  const challenge = TechStartApp.getChallengeById(room.currentChallengeId);
  const currentPlayer = room.players.find((player) => player.userId === duelUser.id);

  document.getElementById("room-chip").textContent = `Sala ${room.code}`;
  document.getElementById("challenge-title").textContent = room.status === "playing" ? "Duelo em andamento" : room.status === "finished" ? "Duelo encerrado" : "Lobby da sala";
  document.getElementById("challenge-description").textContent = "O duelo inicia automaticamente quando os dois jogadores estiverem PRONTOS.";
  document.getElementById("challenge-name").textContent = challenge.title;
  document.getElementById("language-chip").textContent = room.language;
  document.getElementById("solution-input").placeholder = challenge.starter;
  document.getElementById("player-one-name").textContent = userOne ? userOne.name : "Aguardando jogador";
  document.getElementById("player-one-status").textContent = playerOne ? (playerOne.ready ? "PRONTO" : "Aguardando") : "Sem jogador";
  document.getElementById("player-one-score").textContent = `${playerOne ? playerOne.score : 0} pts`;
  document.getElementById("player-two-name").textContent = userTwo ? userTwo.name : "Aguardando jogador";
  document.getElementById("player-two-status").textContent = playerTwo ? (playerTwo.ready ? "PRONTO" : "Aguardando") : "Sem jogador";
  document.getElementById("player-two-score").textContent = `${playerTwo ? playerTwo.score : 0} pts`;
  document.getElementById("round-indicator").textContent = `Round ${room.currentRound}/${room.totalRounds}`;
  document.getElementById("timer-indicator").textContent = room.timerStartedAt ? `Tempo iniciado em ${TechStartApp.formatDate(room.timerStartedAt)}` : "Tempo: aguardando inicio";

  const winner = room.winnerUserId ? cachedUsers.find((user) => user.id === room.winnerUserId) : null;
  document.getElementById("winner-indicator").textContent = winner ? `Vencedor atual: ${winner.name}` : "Sem vencedor";
  document.getElementById("help-summary").textContent = room.helpRequests.length
    ? `Solicitacoes enviadas nesta sala: ${room.helpRequests.length}`
    : "Nenhuma solicitacao enviada.";

  document.getElementById("challenge-description").textContent = challenge.description;
  document.getElementById("ready-button").disabled = room.status === "playing" || room.status === "finished" || room.players.length < 2;
  document.getElementById("submit-button").disabled = room.status !== "playing";
  document.getElementById("test-button").disabled = room.status !== "playing";
  document.getElementById("help-button").disabled = room.status !== "playing";
  document.getElementById("new-opponent-button").disabled = room.status !== "finished";
  document.getElementById("rematch-button").disabled = room.status !== "finished";

  if (currentPlayer && currentPlayer.solutionStatus === "correct") {
    document.getElementById("result-output").textContent = "Sua ultima submissao deste round foi marcada como correta.";
  }

  renderChat();
}

function renderChat() {
  const chat = room.chat || [];
  const container = document.getElementById("chat-messages");
  if (!chat.length) {
    container.innerHTML = `<div class="chat-message"><strong>Chat da sala</strong><p class="muted">Envie a primeira mensagem para o outro jogador.</p></div>`;
    return;
  }
  container.innerHTML = chat
    .map((message) => {
      const user = cachedUsers.find((item) => item.id === message.userId);
      return `
        <div class="chat-message">
          <strong>${user ? user.nick : "Jogador"}</strong>
          <p>${message.message}</p>
        </div>
      `;
    })
    .join("");
}

document.getElementById("copy-link").addEventListener("click", () => {
  const duelUrl = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
  navigator.clipboard?.writeText(duelUrl).catch(() => {});
  showPopup("Link da sala", `Compartilhe este link: ${duelUrl}`);
});

document.getElementById("ready-button").addEventListener("click", async () => {
  await TechStartApp.setPlayerReadyAsync(room.code, duelUser.id, true);
  await renderRoom();
  if ((await TechStartApp.getRoomByCodeAsync(room.code)).status === "playing") {
    showPopup("Duelo iniciado", "Os dois jogadores ficaram PRONTOS. O round comecou.");
  }
});

document.getElementById("test-button").addEventListener("click", () => {
  const preview = TechStartApp.previewSolution(document.getElementById("solution-input").value, room.currentChallengeId);
  document.getElementById("result-output").textContent = preview.evaluation.message;
  document.getElementById("ai-output").textContent = preview.aiFeedback;
});

document.getElementById("submit-button").addEventListener("click", async () => {
  const result = await TechStartApp.submitSolutionAsync(room.code, duelUser.id, document.getElementById("solution-input").value);
  if (!result.ok) {
    showPopup("Erro na submissao", result.message);
    return;
  }
  document.getElementById("result-output").textContent = result.evaluation.message;
  document.getElementById("ai-output").textContent = result.aiFeedback;
  await renderRoom();
  if (result.room.status === "finished") {
    const winner = (await TechStartApp.getUsersAsync()).find((user) => user.id === result.room.winnerUserId);
    showPopup("Duelo encerrado", `Vencedor definido: ${winner ? winner.name : "Jogador"}.`);
  }
});

document.getElementById("help-button").addEventListener("click", async () => {
  await TechStartApp.requestExternalHelpAsync(room.code, duelUser.id, "Preciso de apoio neste round para concluir a solucao.");
  await renderRoom();
  showPopup("Ajuda solicitada", "Outros usuarios poderao visualizar sua solicitacao e auxiliar.");
});

document.getElementById("give-up-button").addEventListener("click", async () => {
  const updatedRoom = await TechStartApp.giveUpAsync(room.code, duelUser.id);
  const winner = (await TechStartApp.getUsersAsync()).find((user) => user.id === updatedRoom.winnerUserId);
  await renderRoom();
  showPopup("Desistencia registrada", `Vitoria automatica para ${winner ? winner.name : "o adversario"}.`);
});

document.getElementById("rematch-button").addEventListener("click", async () => {
  const updatedRoom = await TechStartApp.requestRematchAsync(room.code, duelUser.id);
  await renderRoom();
  showPopup(
    "Revanche atualizada",
    updatedRoom.status === "lobby" ? "Os dois jogadores aceitaram a revanche. A sala foi reiniciada." : "Sua solicitacao de revanche foi registrada."
  );
});

document.getElementById("new-opponent-button").addEventListener("click", async () => {
  const result = await TechStartApp.requestRandomMatchAsync(duelUser.id, duelUser.language || "JavaScript");
  window.location.href = `../desafio/desafio.html?room=${result.room.code}`;
});

document.getElementById("chat-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  if (!input.value.trim()) {
    return;
  }
  await TechStartApp.sendChatMessageAsync(room.code, duelUser.id, input.value);
  input.value = "";
  await renderRoom();
});

(async () => {
  duelUser = await TechStartApp.requireAuthAsync();
  room = await loadRoomWithRetry(roomCode);
  if (!room) {
    redirectToDashboard(`sala ${roomCode} nao encontrada na inicializacao`);
    return;
  }
  if (!room.players.some((player) => player.userId === duelUser.id)) {
    const joinResult = await TechStartApp.joinRoomByCodeAsync(roomCode, duelUser.id);
    if (!joinResult.ok) {
      showPopup("Sala indisponivel", joinResult.message, () => {
        redirectToDashboard(`falha ao entrar na sala ${roomCode}: ${joinResult.message}`);
      });
      return;
    }
    room = joinResult.room;
  }
  await renderRoom();
  window.setInterval(() => {
    renderRoom();
  }, 3000);
})();
