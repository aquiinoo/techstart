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
const isTrainingFeedback = params.get("training") === "1";
const TRAINING_FEEDBACK_KEY = "techstart_training_feedback";

const referenceSolutions = {
  "java-soma": "public class Solution {\n  public static int soma(int a, int b) {\n    return a + b;\n  }\n}",
  "java-par": "public class Solution {\n  public static boolean ehPar(int numero) {\n    return numero % 2 == 0;\n  }\n}",
  "java-maior": "public class Solution {\n  public static int maior(int a, int b) {\n    return a > b ? a : b;\n  }\n}",
  "java-media": "public class Solution {\n  public static double media(double n1, double n2, double n3) {\n    return (n1 + n2 + n3) / 3.0;\n  }\n}",
  "java-positivo": "public class Solution {\n  public static boolean ehPositivo(int numero) {\n    return numero > 0;\n  }\n}",
  "java-celsius-fahrenheit": "public class Solution {\n  public static double converter(double celsius) {\n    return celsius * 9 / 5 + 32;\n  }\n}",
  "java-contar-caracteres": "public class Solution {\n  public static int contarCaracteres(String texto) {\n    return texto.length();\n  }\n}",
  "java-primeira-letra": "public class Solution {\n  public static char primeiraLetra(String texto) {\n    return texto.charAt(0);\n  }\n}",
  "java-repetir-palavra": "public class Solution {\n  public static String repetir(String palavra) {\n    return palavra + palavra;\n  }\n}",
  "java-tabuda": "public class Solution {\n  public static int vezesDez(int numero) {\n    return numero * 10;\n  }\n}",
};

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

function getTrainingPayload() {
  try {
    return JSON.parse(localStorage.getItem(TRAINING_FEEDBACK_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function renderTrainingFeedback() {
  const payload = getTrainingPayload();
  if (!payload) {
    redirectToDashboard("feedback de treino indisponivel");
    return;
  }
  const challenge = TechStartApp.getChallengeById(payload.challengeId);
  const timedOut = payload.reason === "time";
  const gaveUp = payload.reason === "gaveup";
  const correct = Boolean(payload.evaluation?.correct);

  document.getElementById("room-chip").textContent = "Treino";
  document.getElementById("feedback-title").textContent = timedOut ? "Tempo esgotado" : gaveUp ? "Treino interrompido" : correct ? "Treino concluído" : "Treino revisado";
  document.getElementById("challenge-summary").textContent = `${challenge?.title || "Desafio"} — ${challenge?.description || ""}`;
  document.getElementById("score-pill").classList.add("hidden");
  document.getElementById("result-title").textContent = timedOut ? "O tempo acabou" : gaveUp ? "Você encerrou o treino" : correct ? "Boa solução!" : "Você está no caminho";
  document.getElementById("evaluation-output").textContent = timedOut
    ? "O treino foi encerrado pelo tempo. Compare uma solução de referência com a sua ideia e tente novamente."
    : gaveUp
      ? "O treino foi encerrado por você. Use a solução de referência como ponto de partida e tente outro desafio."
      : payload.evaluation?.message || "Revise o método solicitado.";
  document.getElementById("ai-output").innerHTML = TechStartApp.renderFeedbackHtml(
    payload.aiFeedback || "Use as dicas e os casos de teste para ajustar sua solução."
  );
  document.querySelector(".result-panel").classList.toggle("round-success", correct && !timedOut);
  document.querySelector(".result-panel").classList.toggle("round-warning", !correct || timedOut);
  document.querySelector(".players-panel").classList.add("hidden");
  document.getElementById("training-panel").classList.remove("hidden");
  document.getElementById("training-note").textContent = timedOut ? "Veja uma forma possível de resolver" : "Continue praticando para ganhar velocidade";
  document.getElementById("training-detail").textContent = timedOut
    ? "A solução abaixo é apenas uma referência. Tente reescrevê-la com suas próprias palavras no próximo treino."
    : "Você pode iniciar outro desafio agora ou voltar ao painel.";
  document.getElementById("reference-solution").textContent = referenceSolutions[payload.challengeId] || challenge?.starter || "Solução de referência indisponível.";
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
  document.getElementById("score-pill").classList.remove("hidden");
  document.getElementById("score-pill").textContent = `${playerOne?.score || 0} x ${playerTwo?.score || 0}`;
  document.getElementById("result-title").textContent = userFeedback?.scoredThisRound
    ? "Voce pontuou"
    : userFeedback?.solutionStatus === "correct"
      ? "Voce acertou, mas chegou depois"
      : "Ainda nao foi dessa vez";
  document.querySelector(".result-panel").classList.toggle("round-success", Boolean(userFeedback?.scoredThisRound));
  document.querySelector(".result-panel").classList.toggle("round-warning", !userFeedback?.scoredThisRound);
  document.getElementById("evaluation-output").textContent =
    userFeedback?.evaluationMessage || "Nao encontramos uma submissao sua neste round.";
  document.getElementById("ai-output").innerHTML = TechStartApp.renderFeedbackHtml(
    userFeedback?.aiFeedback || "Revise o enunciado e compare sua solucao com os pontos esperados."
  );
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

document.getElementById("train-again-button").addEventListener("click", async () => {
  const button = document.getElementById("train-again-button");
  button.disabled = true;
  button.textContent = "Preparando desafio...";
  const newRoom = await TechStartApp.createRoomAsync(currentUser.id, "Java");
  await TechStartApp.startOfflineTrainingAsync(newRoom.code, currentUser.id);
  const url = new URL("../desafio/desafio.html", window.location.href);
  url.searchParams.set("room", newRoom.code);
  url.searchParams.set("mode", "offline");
  window.location.assign(url.toString());
});

(async () => {
  if (!roomCode) {
    redirectToDashboard("codigo da sala ausente");
    return;
  }

  await TechStartApp.loadChallengesAsync();
  currentUser = await TechStartApp.requireAuthAsync();
  if (isTrainingFeedback) {
    renderTrainingFeedback();
    return;
  }
  await renderRoom();
  window.setInterval(renderRoom, 1000);
})();
