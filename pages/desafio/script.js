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
const offlineBackButton = document.getElementById("offline-back-button");

function scoreboardUrl() {
  const url = new URL("../scoreboard/scoreboard.html", window.location.href);
  url.searchParams.set("room", roomCode);
  return url.toString();
}

<<<<<<< HEAD
function feedbackUrl() {
  const url = new URL("../feedback/feedback.html", window.location.href);
  url.searchParams.set("room", roomCode);
=======
function feedbackUrl(training = false) {
  const url = new URL("../feedback/feedback.html", window.location.href);
  url.searchParams.set("room", roomCode);
  if (training) url.searchParams.set("training", "1");
>>>>>>> main
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

<<<<<<< HEAD
function toggleOfflineBackButton() {
  if (isOfflineTraining()) {
    offlineBackButton.classList.remove("hidden");
    return;
  }

  offlineBackButton.classList.add("hidden");
=======
function saveTrainingFeedback(preview, reason) {
  localStorage.setItem("techstart_training_feedback", JSON.stringify({
    challengeId: room.currentChallengeId,
    language: room.language || "Java",
    reason,
    evaluation: preview.evaluation,
    aiFeedback: preview.aiFeedback,
  }));
}

function redirectToTrainingFeedback() {
  redirected = true;
  window.location.assign(feedbackUrl(true));
>>>>>>> main
}

function redirectToDashboard(reason) {
  localStorage.setItem("techstart_last_duel_redirect", String(reason || "sem motivo"));
  window.location.href = "../dashboard/dashboard.html";
<<<<<<< HEAD
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

=======
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

function setBusy(isBusy, message = "") {
  document.body.classList.toggle("is-busy", isBusy);
  const status = document.getElementById("connection-status");
  if (status && message) {
    status.textContent = message;
  }
}

function renderChallengeDetails(challenge) {
  const details = document.getElementById("challenge-details");
  if (!challenge) {
    details.textContent = "";
    return;
  }
  const tests = (challenge.tests || []).map((test) => `${test.call} → ${test.expected}`).join(" • ");
  const hints = (challenge.hints || []).join(" • ");
  const lines = [
    ["Objetivo: ", "entregue apenas o método pedido, dentro da classe Solution."],
    ["Casos públicos: ", tests || "serão exibidos após compilar."],
    ["Dicas: ", hints || "leia com atenção o método e o tipo de retorno."],
  ];
  details.replaceChildren(...lines.map(([label, text]) => {
    const paragraph = document.createElement("p");
    const title = document.createElement("strong");
    title.textContent = label;
    paragraph.append(title, document.createTextNode(text));
    return paragraph;
  }));
}

function renderChat() {
  const messages = room?.chat || [];
  const container = document.getElementById("chat-messages");
  const count = document.getElementById("chat-count");
  count.textContent = messages.length ? String(messages.length) : "";
  container.replaceChildren();
  if (!messages.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Sem mensagens ainda.";
    container.append(empty);
    return;
  }
  messages.slice(-40).forEach((message) => {
    const item = document.createElement("article");
    item.className = "chat-message";
    const author = document.createElement("strong");
    const user = getUser(message.userId);
    author.textContent = user ? `@${user.nick}` : "Jogador";
    const text = document.createElement("p");
    text.textContent = message.message;
    item.append(author, text);
    container.append(item);
  });
  container.scrollTop = container.scrollHeight;
}

async function compileJava(source, challenge) {
  const endpoint = window.TechStartJudge0Endpoint;
  if (!endpoint) {
    throw new Error("O compilador Java não está configurado.");
  }

  const runtimeResponse = await fetch(`${endpoint}/languages`);
  if (!runtimeResponse.ok) {
    throw new Error("Não foi possível carregar o compilador Java.");
  }
  const runtimes = await runtimeResponse.json();
  const java =
    runtimes.find((runtime) => /^Java \(JDK/i.test(runtime.name)) ||
    runtimes.find((runtime) => /^Java \(/i.test(runtime.name));
  if (!java) {
    throw new Error("A instância de compilação não disponibiliza Java agora.");
  }

  const normalizedSource = source.replace(/\bpublic\s+class\s+Solution\b/, "class Solution");
  const testLines = (challenge.tests || []).map((test, index) => {
    const call = String(test.call || "").trim();
    if (!/^[a-zA-Z_$][\w$]*\s*\([^;{}]*\)$/.test(call)) {
      throw new Error("Um caso de teste está inválido.");
    }
    return `System.out.println("__TECHSTART_TEST_${index}__" + String.valueOf(Solution.${call}));`;
  });
  const program = `${normalizedSource}\n\npublic class Main {\n  public static void main(String[] args) {\n    try {\n      ${testLines.join("\n      ")}\n    } catch (Throwable error) {\n      error.printStackTrace();\n      System.exit(1);\n    }\n  }\n}`;

  const response = await fetch(`${endpoint}/submissions?base64_encoded=false&wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language_id: java.id,
      source_code: program,
      cpu_time_limit: 3,
      wall_time_limit: 5,
      memory_limit: 128000,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "O serviço de compilação não respondeu.");
  }

  const output = payload.stdout || "";
  const testResults = (challenge.tests || []).map((test, index) => {
    const prefix = `__TECHSTART_TEST_${index}__`;
    const actual = output.split(/\r?\n/).find((line) => line.startsWith(prefix))?.slice(prefix.length).trim() || "";
    const rawExpected = String(test.expected ?? "").trim();
    const expected = /^(['"]).*\1$/.test(rawExpected) ? rawExpected.slice(1, -1) : rawExpected;
    return { call: test.call, expected, actual, passed: actual === expected };
  });
  const compiled = !payload.compile_output && !payload.stderr;
  const passed = compiled && testResults.length > 0 && testResults.every((test) => test.passed);
  const details = testResults.map((test) => `${test.passed ? "✓" : "✕"} ${test.call}: esperado ${test.expected}, recebido ${test.actual || "(sem retorno)"}`).join("\n");
  return {
    configured: true,
    compiled,
    passed,
    tests: testResults,
    output: payload.compile_output || payload.stderr || (passed ? `Compilação concluída.\n${details}` : details),
  };
}

>>>>>>> main
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
<<<<<<< HEAD
  document.getElementById("help-button").disabled = disabled;
=======
  document.getElementById("give-up-round-button").disabled = disabled;
>>>>>>> main
  document.getElementById("solution-input").disabled = disabled;
}

async function syncPresence() {
  if (redirected || !duelUser || !roomCode || isOfflineTraining()) {
    return;
  }

  const touchedRoom = await TechStartApp.touchPlayerPresenceAsync(roomCode, duelUser.id);
  if (touchedRoom) {
    room = touchedRoom;
<<<<<<< HEAD
=======
    document.getElementById("connection-status").textContent = "Conexão estável";
>>>>>>> main
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
<<<<<<< HEAD
      redirectToDashboard("treino offline encerrado");
=======
      redirectToDashboard("treino encerrado");
>>>>>>> main
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
<<<<<<< HEAD
=======
      const preview = await TechStartApp.previewSolutionAsync(document.getElementById("solution-input").value, room.currentChallengeId);
>>>>>>> main
      await TechStartApp.registerOfflineTrainingAsync(
        duelUser.id,
        room.language || duelUser.language || "Java",
        "Tempo esgotado"
      );
<<<<<<< HEAD
      showPopup("Tempo esgotado", "Seu treino offline foi encerrado.", () => {
        redirectToDashboard("tempo do treino offline esgotado");
      });
=======
      saveTrainingFeedback(preview, "time");
      redirectToTrainingFeedback();
>>>>>>> main
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
<<<<<<< HEAD
    ? "Treino offline"
=======
    ? "Treino"
>>>>>>> main
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
<<<<<<< HEAD
  document.getElementById("language-chip").textContent = room.language;
  document.getElementById("solution-input").placeholder = challenge.starter;

  toggleOfflineBackButton();
  setRoundControlsDisabled(!currentPlayer || currentPlayer.solutionStatus !== "pending");
}

document.getElementById("offline-back-button").addEventListener("click", () => {
  redirectToDashboard("voltar do treino offline");
});

=======
  renderChallengeDetails(challenge);
  document.getElementById("language-chip").textContent = room.language;
  document.getElementById("solution-input").placeholder = challenge.starter;

  setRoundControlsDisabled(!currentPlayer || currentPlayer.solutionStatus !== "pending");
  document.getElementById("leave-training-button").classList.toggle("hidden", !isOfflineTraining());
  renderChat();
}

>>>>>>> main
document.getElementById("test-button").addEventListener("click", async () => {
  const code = document.getElementById("solution-input").value;
  if (!code.trim()) {
    showPopup("Codigo vazio", "Digite uma solucao antes de testar.");
    return;
  }

<<<<<<< HEAD
  document.getElementById("ai-output").textContent = "Analisando sua solucao...";
  const preview = await TechStartApp.previewSolutionAsync(code, room.currentChallengeId);
  document.getElementById("result-output").textContent = preview.evaluation.message;
  document.getElementById("ai-output").textContent = preview.aiFeedback;
  showPopup(
    preview.evaluation.correct ? "Boa, estrutura aceita" : "Ainda precisa ajustar",
    preview.evaluation.correct
      ? "A analise encontrou os pontos principais esperados para este desafio."
      : "Confira o feedback antes de enviar a solucao final."
  );
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
    const preview = await TechStartApp.previewSolutionAsync(code, room.currentChallengeId);
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
=======
  const challenge = TechStartApp.getChallengeById(room.currentChallengeId);
  setBusy(true, "Compilando e executando os testes...");
  document.getElementById("ai-output").textContent = "Avaliando sua solução...";
  try {
    const result = await compileJava(code, challenge);
    const passed = result.passed ?? result.evaluation?.correct;
    document.getElementById("result-output").textContent = result.output || result.error || result.message || result.evaluation?.message || "Teste concluído.";
    document.getElementById("ai-output").textContent = result.aiFeedback || (passed ? "Os testes concluíram sem erros." : "Revise a assinatura do método e os casos públicos.");
    showPopup(passed ? "Testes concluídos" : "Ajuste necessário", result.configured ? "O compilador Java terminou a execução." : result.message);
  } catch (error) {
    document.getElementById("result-output").textContent = error.message;
    showPopup("Não foi possível compilar", "Confira a conexão com o serviço de compilação e tente novamente.");
  } finally {
    setBusy(false, "Conexão estável");
  }
});

document.getElementById("chat-toggle").addEventListener("click", () => {
  const chat = document.getElementById("floating-chat");
  const minimized = chat.classList.toggle("is-minimized");
  document.getElementById("chat-toggle").setAttribute("aria-expanded", String(!minimized));
});

document.getElementById("chat-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  if (!input.value.trim()) return;
  await TechStartApp.sendChatMessageAsync(room.code, duelUser.id, input.value);
  input.value = "";
  await renderRoom();
});

document.getElementById("leave-training-button").addEventListener("click", async () => {
  if (!isOfflineTraining()) return;
  setBusy(true, "Encerrando treino...");
  await TechStartApp.leaveRoomAsync(room.code, duelUser.id);
  redirectToDashboard("treino encerrado pelo jogador");
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
    const preview = await TechStartApp.previewSolutionAsync(code, room.currentChallengeId);
    const resultLabel = preview.evaluation.correct ? "Treino concluido" : "Treino revisado";
    document.getElementById("result-output").textContent = preview.evaluation.message;
    document.getElementById("ai-output").textContent = preview.aiFeedback;
    await TechStartApp.registerOfflineTrainingAsync(
      duelUser.id,
      room.language || duelUser.language || "Java",
      resultLabel
    );
    saveTrainingFeedback(preview, "submitted");
    redirectToTrainingFeedback();
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

document.getElementById("give-up-round-button").addEventListener("click", async () => {
  if (isOfflineTraining()) {
    const preview = await TechStartApp.previewSolutionAsync("", room.currentChallengeId);
    await TechStartApp.registerOfflineTrainingAsync(duelUser.id, room.language || "Java", "Treino interrompido");
    saveTrainingFeedback(preview, "gaveup");
    redirectToTrainingFeedback();
    return;
  }
  const result = await TechStartApp.giveUpRoundAsync(room.code, duelUser.id);
  if (!result.ok) {
    showPopup("Não foi possível desistir", result.message);
    return;
  }
  setRoundControlsDisabled(true);
  if (result.room.status === "feedback") {
    showPopup("Round encerrado", "Você desistiu deste round. Veja o feedback para continuar.", redirectToFeedback);
    return;
  }
  showPopup("Round encerrado", "Você desistiu deste round. Aguardando o outro jogador terminar.");
>>>>>>> main
});

(async () => {
  if (!roomCode) {
    redirectToDashboard("codigo da sala ausente");
    return;
  }

  await TechStartApp.loadChallengesAsync();
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
