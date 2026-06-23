let duelUser;
let room;
let cachedUsers = [];
let redirected = false;

const params = new URLSearchParams(window.location.search);
const fallbackActiveRoom =
  window.TechStartApp &&
  typeof window.TechStartApp.getActiveRoom === "function"
    ? window.TechStartApp.getActiveRoom()
    : null;
const roomCode = (params.get("room") || fallbackActiveRoom?.code || "").toUpperCase();
const requestedMode = params.get("mode") || "";

const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popup-title");
const popupText = document.getElementById("popup-text");
const popupButton = document.getElementById("popup-button");

function scoreboardUrl() {
  const url = new URL("../scoreboard/scoreboard.html", window.location.href);
  url.searchParams.set("room", roomCode);
  return url.toString();
}

function feedbackUrl() {
  const url = new URL("../feedback/feedback.html", window.location.href);
  url.searchParams.set("room", roomCode);
  return url.toString();
}

function redirectToScoreboard() {
  if (redirected) {
    return;
  }
  redirected = true;
  window.location.assign(scoreboardUrl());
}

function redirectToFeedback() {
  if (redirected) {
    return;
  }
  redirected = true;
  window.location.assign(feedbackUrl());
}

function isOfflineTraining() {
  return requestedMode === "offline" || room?.mode === "offline";
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

function formatClock(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function setRoundControlsDisabled(disabled) {
  document.getElementById("test-button").disabled = disabled;
  document.getElementById("submit-button").disabled = disabled;
  document.getElementById("help-button").disabled = disabled;
  document.getElementById("solution-input").disabled = disabled;
}

async function syncPresence() {
  if (redirected || !duelUser || !roomCode || isOfflineTraining()) {
    return;
  }

  const touchedRoom = await TechStartApp.touchPlayerPresenceAsync(roomCode, duelUser.id);
  if (touchedRoom) {
    room = touchedRoom;
  }

  const checkedRoom = await TechStartApp.finishDisconnectedPlayersAsync(roomCode, duelUser.id);
  if (checkedRoom) {
    room = checkedRoom;
  }

  if (room?.status === "finished" && room.finishedReason === "disconnect") {
    showPopup("Jogador desconectado", "O duelo foi encerrado automaticamente porque um jogador saiu ou fechou a aba.", redirectToScoreboard);
  }
}

function handleEditorTab(event) {
  const textarea = event.target;
  const indent = "  ";
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  if (event.key !== "Tab") {
    return false;
  }

  event.preventDefault();
  const selectedText = value.slice(start, end);

  if (!selectedText.includes("\n")) {
    if (event.shiftKey) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const removable = value.slice(lineStart, lineStart + indent.length);

      if (removable === indent) {
        textarea.value = value.slice(0, lineStart) + value.slice(lineStart + indent.length);
        textarea.selectionStart = Math.max(lineStart, start - indent.length);
        textarea.selectionEnd = Math.max(lineStart, end - indent.length);
      }

      return;
    }

    textarea.value = value.slice(0, start) + indent + value.slice(end);
    textarea.selectionStart = start + indent.length;
    textarea.selectionEnd = start + indent.length;
    return;
  }

  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const blockEnd = end;
  const block = value.slice(lineStart, blockEnd);
  const lines = block.split("\n");

  if (event.shiftKey) {
    let removedCount = 0;
    const outdented = lines
      .map((line) => {
        if (line.startsWith(indent)) {
          removedCount += indent.length;
          return line.slice(indent.length);
        }
        if (line.startsWith(" ")) {
          removedCount += 1;
          return line.slice(1);
        }
        return line;
      })
      .join("\n");

    textarea.value = value.slice(0, lineStart) + outdented + value.slice(blockEnd);
    textarea.selectionStart = Math.max(lineStart, start - (value.slice(lineStart, start).startsWith(indent) ? indent.length : 0));
    textarea.selectionEnd = Math.max(textarea.selectionStart, end - removedCount);
    return;
  }

  const indented = lines.map((line) => indent + line).join("\n");
  textarea.value = value.slice(0, lineStart) + indented + value.slice(blockEnd);
  textarea.selectionStart = start + indent.length;
  textarea.selectionEnd = end + indent.length * lines.length;
  return true;
}

function getLineIndent(value, position) {
  const lineStart = value.lastIndexOf("\n", position - 1) + 1;
  const line = value.slice(lineStart, position);
  return line.match(/^\s*/)[0];
}

function handleEditorPairs(event) {
  const pairs = {
    "(": ")",
    "[": "]",
    "{": "}",
  };
  const closing = Object.values(pairs);
  const textarea = event.target;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  if (pairs[event.key]) {
    event.preventDefault();
    const selectedText = value.slice(start, end);
    textarea.value = value.slice(0, start) + event.key + selectedText + pairs[event.key] + value.slice(end);
    textarea.selectionStart = start + 1;
    textarea.selectionEnd = end + 1;
    return true;
  }

  if (closing.includes(event.key) && value[start] === event.key && start === end) {
    event.preventDefault();
    textarea.selectionStart = start + 1;
    textarea.selectionEnd = start + 1;
    return true;
  }

  if (event.key === "Backspace" && start === end && pairs[value[start - 1]] === value[start]) {
    event.preventDefault();
    textarea.value = value.slice(0, start - 1) + value.slice(start + 1);
    textarea.selectionStart = start - 1;
    textarea.selectionEnd = start - 1;
    return true;
  }

  if (event.key === "Enter") {
    const opener = value[start - 1];
    const closer = value[start];
    if (pairs[opener] === closer && start === end) {
      event.preventDefault();
      const currentIndent = getLineIndent(value, start);
      const innerIndent = currentIndent + "  ";
      const insertion = `\n${innerIndent}\n${currentIndent}`;
      textarea.value = value.slice(0, start) + insertion + value.slice(end);
      textarea.selectionStart = start + 1 + innerIndent.length;
      textarea.selectionEnd = textarea.selectionStart;
      return true;
    }
  }

  return false;
}

function handleEditorKeydown(event) {
  if (handleEditorTab(event)) {
    return;
  }
  handleEditorPairs(event);
}

async function renderRoom() {
  if (redirected) {
    return;
  }

  room = await loadRoomWithRetry(roomCode);
  if (!room) {
    showPopup("Sala indisponivel", "Nao foi possivel carregar a sala deste duelo.", () => {
      redirectToDashboard(`sala ${roomCode} nao carregou`);
    });
    return;
  }

  if (room.status !== "playing") {
    if (isOfflineTraining()) {
      redirectToDashboard("treino offline encerrado");
      return;
    }
    if (room.status === "feedback") {
      redirectToFeedback();
      return;
    }
    redirectToScoreboard();
    return;
  }

  const remaining = TechStartApp.getRoundRemainingSeconds(room);
  if (remaining <= 0) {
    if (isOfflineTraining()) {
      redirected = true;
      await TechStartApp.registerOfflineTrainingAsync(
        duelUser.id,
        room.language || duelUser.language || "Java",
        "Tempo esgotado"
      );
      showPopup("Tempo esgotado", "Seu treino offline foi encerrado.", () => {
        redirectToDashboard("tempo do treino offline esgotado");
      });
      return;
    }
    await TechStartApp.finishExpiredRoundAsync(room.code);
    redirectToFeedback();
    return;
  }

  cachedUsers = await TechStartApp.getUsersAsync();

  const challenge = TechStartApp.getChallengeById(room.currentChallengeId);
  const playerOne = room.players[0];
  const playerTwo = room.players[1];
  const userOne = playerOne ? getUser(playerOne.userId) : null;
  const userTwo = playerTwo ? getUser(playerTwo.userId) : null;
  const currentPlayer = room.players.find((player) => player.userId === duelUser.id);

  document.getElementById("room-chip").textContent = `Sala ${room.code}`;
  document.getElementById("round-indicator").textContent = isOfflineTraining()
    ? "Treino offline"
    : `Round ${room.currentRound}/${room.totalRounds}`;
  document.getElementById("timer-indicator").textContent = formatClock(remaining);
  document.getElementById("player-one-name").textContent = userOne ? userOne.name : "Jogador 1";
  document.getElementById("player-one-score").textContent = `${playerOne ? playerOne.score : 0} pts`;
  document.getElementById("player-two-name").textContent = isOfflineTraining()
    ? "Treino solo"
    : userTwo
    ? userTwo.name
    : "Jogador 2";
  document.getElementById("player-two-score").textContent = isOfflineTraining()
    ? "sem adversario"
    : `${playerTwo ? playerTwo.score : 0} pts`;
  document.getElementById("challenge-name").textContent = challenge.title;
  document.getElementById("challenge-description").textContent = challenge.description;
  document.getElementById("language-chip").textContent = room.language;
  document.getElementById("solution-input").placeholder = challenge.starter;

  setRoundControlsDisabled(!currentPlayer || currentPlayer.solutionStatus !== "pending");
}

document.getElementById("test-button").addEventListener("click", () => {
  const code = document.getElementById("solution-input").value;
  if (!code.trim()) {
    showPopup("Codigo vazio", "Digite uma solucao antes de testar.");
    return;
  }

  const preview = TechStartApp.previewSolution(code, room.currentChallengeId);
  document.getElementById("result-output").textContent = preview.evaluation.message;
  document.getElementById("ai-output").textContent = preview.aiFeedback;
});

document.getElementById("solution-input").addEventListener("keydown", handleEditorKeydown);

document.getElementById("submit-button").addEventListener("click", async () => {
  const code = document.getElementById("solution-input").value;
  if (!code.trim()) {
    showPopup("Codigo vazio", "Digite sua solucao antes de enviar.");
    return;
  }

  setRoundControlsDisabled(true);
  if (isOfflineTraining()) {
    redirected = true;
    const preview = TechStartApp.previewSolution(code, room.currentChallengeId);
    const resultLabel = preview.evaluation.correct ? "Treino concluido" : "Treino revisado";
    document.getElementById("result-output").textContent = preview.evaluation.message;
    document.getElementById("ai-output").textContent = preview.aiFeedback;
    await TechStartApp.registerOfflineTrainingAsync(
      duelUser.id,
      room.language || duelUser.language || "Java",
      resultLabel
    );
    showPopup(resultLabel, "Sua solucao foi avaliada sem esperar outro jogador.", () => {
      redirectToDashboard("treino offline finalizado");
    });
    return;
  }

  const result = await TechStartApp.submitSolutionAsync(room.code, duelUser.id, code);
  if (!result.ok) {
    setRoundControlsDisabled(false);
    showPopup("Nao foi possivel enviar", result.message);
    return;
  }

  document.getElementById("result-output").textContent = result.evaluation.message;
  document.getElementById("ai-output").textContent = result.aiFeedback;

  if (result.room.status !== "playing") {
    showPopup("Round finalizado", "Vamos ver o feedback antes do proximo round.", redirectToFeedback);
    return;
  }

  showPopup("Solucao enviada", "Aguardando o outro jogador concluir o round.");
  await renderRoom();
});

document.getElementById("help-button").addEventListener("click", async () => {
  const details = document.getElementById("solution-input").value
    ? "Preciso de ajuda para revisar minha solucao deste round."
    : "Preciso de ajuda para iniciar este round.";
  await TechStartApp.requestExternalHelpAsync(room.code, duelUser.id, details);
  showPopup("Ajuda solicitada", "Sua solicitacao foi enviada para a comunidade.");
});

(async () => {
  if (!roomCode) {
    redirectToDashboard("codigo da sala ausente");
    return;
  }

  duelUser = await TechStartApp.requireAuthAsync();
  room = await loadRoomWithRetry(roomCode);

  if (!room) {
    redirectToDashboard(`sala ${roomCode} nao encontrada`);
    return;
  }

  await renderRoom();
  await syncPresence();
  window.setInterval(renderRoom, 1000);
  window.setInterval(syncPresence, 5000);
})();
