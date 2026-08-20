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

function challengeUrl() {
  const url = new URL("../desafio/desafio.html", window.location.href);
  url.searchParams.set("room", roomCode);
  return url.toString();
}

function feedbackUrl() {
  const url = new URL("../feedback/feedback.html", window.location.href);
  url.searchParams.set("room", roomCode);
  return url.toString();
}

function resultUrl() {
  const url = new URL("../resultado/resultado.html", window.location.href);
  url.searchParams.set("room", roomCode);
  return url.toString();
}

function scoreboardUrl() {
  const url = new URL("scoreboard.html", window.location.href);
  url.searchParams.set("room", roomCode);
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function renderPlayer(slot, player) {
  const user = player ? getUser(player.userId) : null;
  const card = document.querySelector(`#player-${slot}-name`).closest(".player-card");
  card.classList.toggle("ready", Boolean(player?.ready));
  document.getElementById(`player-${slot}-name`).textContent = user ? user.name : "Aguardando jogador";
  document.getElementById(`player-${slot}-score`).textContent = `${player ? player.score : 0} pts`;
  document.getElementById(`player-${slot}-status`).textContent = player
    ? player.ready
      ? "PRONTO!"
      : "QUASE LÁ..."
    : "Sem jogador";
}

function renderChat() {
  const chat = room.chat || [];
  const container = document.getElementById("chat-messages");

  if (!chat.length) {
    container.innerHTML = `
      <div class="chat-message">
        <strong>Chat da sala</strong>
        <p>Envie a primeira mensagem.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = chat
    .map((message) => {
      const user = getUser(message.userId);
      return `
        <div class="chat-message">
          <strong>${escapeHtml(user ? user.nick : "Jogador")}</strong>
          <p>${escapeHtml(message.message)}</p>
        </div>
      `;
    })
    .join("");
}

async function renderRoom() {
  room = await loadRoomWithRetry(roomCode);
  if (!room) {
    showPopup("Sala indisponivel", "Nao foi possivel carregar a sala deste duelo.", () => {
      redirectToDashboard(`sala ${roomCode} nao carregou`);
    });
    return;
  }

  cachedUsers = await TechStartApp.getUsersAsync();

  const challenge = TechStartApp.getChallengeById(room.currentChallengeId);
  const playerOne = room.players[0];
  const playerTwo = room.players[1];
  const currentPlayer = room.players.find((player) => player.userId === currentUser.id);
  const lastRoundWinner = room.lastRoundWinnerUserId ? getUser(room.lastRoundWinnerUserId) : null;
  const countdown = TechStartApp.getCountdownRemainingSeconds(room);

  document.getElementById("room-chip").textContent = `Sala ${room.code}`;
  document.getElementById("round-indicator").textContent = `Round ${room.currentRound}/${room.totalRounds}`;
  document.getElementById("room-description").textContent = challenge.description;
  renderPlayer("one", playerOne);
  renderPlayer("two", playerTwo);

  const readyButton = document.getElementById("ready-button");
  readyButton.disabled = room.status === "finished" || !currentPlayer || room.players.length < 2;
  readyButton.textContent = currentPlayer?.ready ? "CANCELAR" : "PRONTO";

  document.getElementById("finish-panel").classList.toggle("hidden", room.status !== "finished");

  if (room.status === "finished") {
    window.location.assign(resultUrl());
    return;
  } else if (room.status === "countdown") {
    document.getElementById("room-title").textContent = "Todos prontos";
    document.getElementById("match-status").textContent = "O round vai começar";
    document.getElementById("countdown-indicator").textContent = countdown;
    if (countdown <= 0) {
      await TechStartApp.startRoundAsync(room.code);
      window.location.assign(challengeUrl());
      return;
    }
  } else if (room.status === "playing") {
    window.location.assign(challengeUrl());
    return;
  } else if (room.status === "feedback") {
    window.location.assign(feedbackUrl());
    return;
  } else {
    document.getElementById("room-title").textContent = room.players.length < 2 ? "Aguardando adversario" : "Prepare-se para o round";
    document.getElementById("match-status").textContent = room.players.length < 2 ? "Convide outro jogador" : "Aguardando jogadores";
    document.getElementById("countdown-indicator").textContent = "--";
  }

  const rematchPending = (room.rematchRequests || []).length === 1;
  if (rematchPending) {
    document.getElementById("last-round-summary").textContent = "Revanche solicitada: aguardando o outro jogador aceitar.";
  }

  document.getElementById("last-round-summary").textContent = lastRoundWinner
    ? `Ultimo round: ${lastRoundWinner.name} pontuou.`
    : "Quando ambos estiverem prontos, a contagem começa.";

  renderChat();
}

document.getElementById("copy-link").addEventListener("click", async () => {
  await navigator.clipboard?.writeText(scoreboardUrl()).catch(() => {});
  showPopup("Link copiado", "Envie este link para o outro jogador entrar no painel da sala.");
});

document.getElementById("ready-button").addEventListener("click", async () => {
  const currentPlayer = room.players.find((player) => player.userId === currentUser.id);
  if (!currentPlayer) {
    showPopup("Jogador ausente", "Voce nao esta nesta sala.");
    return;
  }
  const nextReady = !currentPlayer.ready;
  await TechStartApp.setPlayerReadyAsync(room.code, currentUser.id, nextReady);
  await renderRoom();
  showPopup(
    nextReady ? "Isso aí!" : "Vish...",
    nextReady
      ? "Quando o outro jogador também estiver pronto, a contagem vai começar."
      : "Não vai arregar agora né?"
  );
});

document.getElementById("give-up-button").addEventListener("click", async () => {
  await TechStartApp.giveUpAsync(room.code, currentUser.id);
  showPopup("Desistencia registrada", "O duelo foi encerrado e o resultado sera atualizado.", () => {
    window.location.assign(resultUrl());
  });
});

document.querySelector(".back-link").addEventListener("click", async (event) => {
  if (!room || room.status === "playing") return;
  event.preventDefault();
  const result = await TechStartApp.leaveRoomAsync(room.code, currentUser.id);
  if (result?.ok) {
    redirectToDashboard("jogador saiu da sala antes do duelo");
  } else {
    showPopup("Não foi possível sair", result?.message || "Tente novamente.");
  }
});


document.getElementById("chat-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  if (!input.value.trim()) {
    return;
  }
  await TechStartApp.sendChatMessageAsync(room.code, currentUser.id, input.value);
  input.value = "";
  await renderRoom();
});

document.getElementById("rematch-button").addEventListener("click", async () => {
  await TechStartApp.requestRematchAsync(room.code, currentUser.id);
  await renderRoom();
});

document.getElementById("new-opponent-button").addEventListener("click", async () => {
  const result = await TechStartApp.requestRandomMatchAsync(currentUser.id, "Java");
  if (!result.ok) {
    showPopup("Fila indisponivel", result.message);
    return;
  }
  const url = new URL("scoreboard.html", window.location.href);
  url.searchParams.set("room", result.room.code);
  window.location.assign(url.toString());
});

(async () => {
  if (!roomCode) {
    redirectToDashboard("codigo da sala ausente");
    return;
  }
  await TechStartApp.loadChallengesAsync();
  currentUser = await TechStartApp.requireAuthAsync();
  await renderRoom();
  window.setInterval(renderRoom, 1000);
})();
