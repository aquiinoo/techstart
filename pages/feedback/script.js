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

function scoreboardUrl() {
  const url = new URL("../scoreboard/scoreboard.html", window.location.href);
  url.searchParams.set("room", roomCode);
  return url.toString();
}

function resultUrl() {
  const url = new URL("../resultado/resultado.html", window.location.href);
  url.searchParams.set("room", roomCode);
  return url.toString();
}

function redirectToDashboard(reason) {
  localStorage.setItem("techstart_last_duel_redirect", String(reason || "sem motivo"));
  window.location.href = "../dashboard/dashboard.html";
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

function renderPlayers() {
  const feedbackByUser = new Map((room.lastRoundFeedback || []).map((item) => [item.userId, item]));
  document.getElementById("players-summary").innerHTML = room.players
    .map((player) => {
      const user = getUser(player.userId);
      const feedback = feedbackByUser.get(player.userId);
      const status = feedback?.scoredThisRound
        ? "Pontuou primeiro"
        : feedback?.solutionStatus === "correct"
        ? "Acertou depois"
        : "Nao pontuou";
      const css = feedback?.solutionStatus === "correct" ? "correct" : "wrong";
      return `
        <article class="player-summary ${css}">
          <strong>${escapeHtml(user ? user.name : "Jogador")}</strong>
          <span>${status} - ${player.score} pts</span>
        </article>
      `;
    })
    .join("");
}

async function renderRoom() {
  room = await loadRoomWithRetry(roomCode);
  if (!room) {
    redirectToDashboard(`sala ${roomCode} nao carregou`);
    return;
  }

  if (room.status !== "feedback") {
    window.location.assign(room.status === "finished" ? resultUrl() : scoreboardUrl());
    return;
  }

  cachedUsers = await TechStartApp.getUsersAsync();

  const challenge = TechStartApp.getChallengeById(room.lastRoundChallengeId || room.currentChallengeId);
  const playerOne = room.players[0];
  const playerTwo = room.players[1];
  const winner = room.lastRoundWinnerUserId ? getUser(room.lastRoundWinnerUserId) : null;
  const userFeedback = (room.lastRoundFeedback || []).find((item) => item.userId === currentUser.id);
  const alreadySeen = room.lastRoundFeedbackSeen.includes(currentUser.id);
  const seenCount = room.lastRoundFeedbackSeen.length;

  document.getElementById("room-chip").textContent = `Sala ${room.code}`;
  document.getElementById("feedback-title").textContent = `Feedback do round ${room.lastRoundNumber || room.currentRound}`;
  document.getElementById("challenge-summary").textContent = `${challenge.title} - ${challenge.description}`;
  document.getElementById("score-pill").textContent = `${playerOne?.score || 0} x ${playerTwo?.score || 0}`;
  document.getElementById("result-title").textContent = userFeedback?.scoredThisRound
    ? "Voce pontuou"
    : userFeedback?.solutionStatus === "correct"
    ? "Voce acertou, mas chegou depois"
    : "Ainda nao foi dessa vez";
  document.getElementById("evaluation-output").textContent =
    userFeedback?.evaluationMessage || "Nao encontramos uma submissao sua neste round.";
  document.getElementById("ai-output").textContent =
    userFeedback?.aiFeedback || "Revise o enunciado e compare sua solucao com os pontos esperados.";
  document.getElementById("round-winner").textContent = winner
    ? `${winner.name} pontuou neste round`
    : "Nenhum jogador pontuou neste round";
  document.getElementById("continue-status").textContent = alreadySeen
    ? `Aguardando os outros jogadores. ${seenCount}/${room.players.length} confirmaram.`
    : "Leia o feedback e continue quando estiver pronto.";

  const button = document.getElementById("continue-button");
  button.disabled = alreadySeen;
  button.textContent = alreadySeen ? "Aguardando..." : "Continuar";

  renderPlayers();
}

document.getElementById("continue-button").addEventListener("click", async () => {
  const button = document.getElementById("continue-button");
  button.disabled = true;
  button.textContent = "Aguardando...";
  const updatedRoom = await TechStartApp.markRoundFeedbackSeenAsync(room.code, currentUser.id);
  if (updatedRoom && updatedRoom.status !== "feedback") {
    window.location.assign(updatedRoom.status === "finished" ? resultUrl() : scoreboardUrl());
    return;
  }
  await renderRoom();
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
