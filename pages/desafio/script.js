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
const popupCancelButton = document.getElementById("popup-cancel-button");

function scoreboardUrl() {
  const url = new URL("../scoreboard/scoreboard.html", window.location.href);
  url.searchParams.set("room", roomCode);
  return url.toString();
}

function feedbackUrl(training = false) {
  const url = new URL("../feedback/feedback.html", window.location.href);
  url.searchParams.set("room", roomCode);
  if (training) url.searchParams.set("training", "1");
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

function showConfirmPopup(title, text, onConfirm) {
  popupTitle.textContent = title;
  popupText.textContent = text;

  popupCancelButton.classList.remove("hidden");

  popupButton.textContent = "Sair da partida";

  popup.classList.remove("hidden");

  popupButton.onclick = () => {
    popup.classList.add("hidden");
    popupCancelButton.classList.add("hidden");
    popupButton.textContent = "Continuar";

    if (onConfirm) {
      onConfirm();
    }
  };

  popupCancelButton.onclick = () => {
    popup.classList.add("hidden");
    popupCancelButton.classList.add("hidden");
    popupButton.textContent = "Continuar";
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
  const tests = (challenge.tests || []).map((test) => `${test.call} = ${test.expected}`).join("\n");
  const hints = (challenge.hints || []).join("\n");
  const lines = [
    ["Objetivo: ", challenge.description],
    ["Exemplos de entrada/saída: ", tests || "serão exibidos após compilar."],
    ["Dicas: ", hints || "leia com atenção o método e o tipo de retorno."],
  ];

  const paragraphs = lines.map(([label, text]) => {
    const paragraph = document.createElement("p");
    const title = document.createElement("strong");
    title.textContent = label;
    paragraph.append(title, document.createTextNode(text));
    return paragraph;
  });

  // Parágrafo do "Obs" tratado separado, pra poder colorir a palavra Solution
  const obsParagraph = document.createElement("p");
  obsParagraph.className = "obs-line";

  const obsLabel = document.createElement("strong");
  obsLabel.textContent = "Obs: ";

  if (challenge.note) {
    // Linguagens sem classe obrigatoria (Python, JavaScript) trazem a propria observacao no desafio.
    obsParagraph.append(obsLabel, document.createTextNode(challenge.note));
  } else {
    const solutionWord = document.createElement("span");
    solutionWord.className = "solution-word";
    solutionWord.textContent = "Solution";

    obsParagraph.append(
      obsLabel,
      document.createTextNode("o método pedido deve estar dentro da classe "),
      solutionWord,
      document.createTextNode(".")
    );
  }

  paragraphs.push(obsParagraph);
  details.replaceChildren(...paragraphs);
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

async function evaluateCodeWithAI(source, challenge, testResult) {
  try {
    if (window.TechStartAiConfigReady) {
      await window.TechStartAiConfigReady;
    }

    const apiKey = window.TechStartGeminiApiKey;

    if (!apiKey) {
      throw new Error("Chave da API Gemini não configurada.");
    }

    const prompt = `
Você é a IA avaliadora do TechStart.

Analise o código do aluno e o resultado dos testes.

Linguagem:
${challenge.language || room?.language || "Java"}

Desafio:
${challenge.title}

Descrição:
${challenge.description}

Código:
${source}

Testes:
${testResult}

Responda em português do Brasil.

Se estiver correto:
"Seu código está correto! [explique brevemente o motivo]."

Se estiver errado:
"Seu código precisa de um ajuste. [explique apenas o principal erro]. Dica: [dê uma dica curta]."

REGRAS:
- Máximo de 3 frases.
- Máximo de 60 palavras.
- Não mostre código corrigido.
- Não forneça a solução completa.
- Seja simples e direto.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.2,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro Gemini:", data);
      throw new Error(
        data?.error?.message || "Erro ao obter feedback da IA."
      );
    }

    const feedback =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim();

    if (!feedback) {
      console.error("Resposta Gemini sem texto. finishReason:", data?.candidates?.[0]?.finishReason, data);
      throw new Error("A IA não retornou feedback.");
    }

    return feedback;

  } catch (error) {
    console.error("Erro ao avaliar código com IA:", error);

    return "A IA não conseguiu avaliar o código agora.";
  }
}

// ---------------------------------------------------------------------------
// Compilar e testar (Judge0) — Java, JavaScript, Python e C#
// ---------------------------------------------------------------------------

// Como achar cada linguagem na lista do Judge0 e quanta memoria ela precisa.
const LANGUAGE_PROFILES = {
  java: { label: "Java", match: /^Java \(JDK/i, fallback: /^Java \(/i, memory: 128000 },
  javascript: { label: "JavaScript", match: /^JavaScript \(Node\.js/i, memory: 256000 },
  python: { label: "Python", match: /^Python \(3\./i, memory: 128000 },
  "c#": { label: "C#", match: /^C# \(Mono/i, fallback: /^C# \(/i, memory: 256000 },
};

let judge0RuntimesPromise = null;

function loadJudge0Runtimes(endpoint, languageLabel) {
  if (!judge0RuntimesPromise) {
    judge0RuntimesPromise = fetch(`${endpoint}/languages`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Não foi possível carregar o compilador de ${languageLabel}.`);
        }
        return response.json();
      })
      .catch((error) => {
        judge0RuntimesPromise = null; // tenta de novo na proxima vez
        throw error;
      });
  }
  return judge0RuntimesPromise;
}

// Se houver varias versoes da mesma linguagem, usa a mais nova (maior id).
function pickRuntime(runtimes, profile) {
  const newest = (list) => list.sort((a, b) => b.id - a.id)[0];
  const preferred = runtimes.filter((runtime) => profile.match.test(runtime.name));
  if (preferred.length) {
    return newest(preferred);
  }
  if (profile.fallback) {
    const others = runtimes.filter((runtime) => profile.fallback.test(runtime.name));
    if (others.length) {
      return newest(others);
    }
  }
  return null;
}

function assertValidTestCall(call) {
  if (!/^[a-zA-Z_$][\w$]*\s*\([^;{}]*\)$/.test(call)) {
    throw new Error("Um caso de teste está inválido.");
  }
}

// Monta o programa final: codigo do aluno + um "main" que imprime o retorno de cada teste.
function buildProgram(languageKey, source, tests) {
  const calls = tests.map((test) => String(test.call || "").trim());
  calls.forEach(assertValidTestCall);
  const marker = (index) => `__TECHSTART_TEST_${index}__`;

  if (languageKey === "java") {
    const normalizedSource = source.replace(/\bpublic\s+class\s+Solution\b/, "class Solution");
    const lines = calls.map((call, index) => `System.out.println("${marker(index)}" + String.valueOf(__solution.${call}));`);
    return `${normalizedSource}\n\npublic class Main {\n  public static void main(String[] args) {\n    try {\n      Solution __solution = new Solution();\n      ${lines.join("\n      ")}\n    } catch (Throwable error) {\n      error.printStackTrace();\n      System.exit(1);\n    }\n  }\n}`;
  }

  if (languageKey === "c#") {
    const lines = calls.map((call, index) => `Console.WriteLine("${marker(index)}" + __solution.${call});`);
    return `using System;\nusing System.Collections.Generic;\nusing System.Linq;\n\n${source}\n\npublic class Program {\n  public static void Main(string[] args) {\n    try {\n      var __solution = new Solution();\n      ${lines.join("\n      ")}\n    } catch (Exception error) {\n      Console.Error.WriteLine(error);\n      Environment.Exit(1);\n    }\n  }\n}\n`;
  }

  if (languageKey === "python") {
    const lines = calls.map((call, index) => `    print("${marker(index)}" + str(${call}))`);
    return `${source}\n\nimport sys as __ts_sys\ntry:\n${lines.join("\n")}\nexcept BaseException:\n    import traceback as __ts_tb\n    __ts_tb.print_exc()\n    __ts_sys.exit(1)\n`;
  }

  if (languageKey === "javascript") {
    const lines = calls.map((call, index) => `  console.log("${marker(index)}" + String(${call}));`);
    return `${source}\n\ntry {\n${lines.join("\n")}\n} catch (error) {\n  console.error(error && error.stack ? error.stack : String(error));\n  process.exit(1);\n}\n`;
  }

  throw new Error("Linguagem ainda não suportada pelo compilador.");
}

// As linguagens imprimem valores de forma diferente (True/true, 32/32.0).
// Compara numeros pelo valor e booleanos sem diferenciar maiusculas.
function sameOutput(actual, expected) {
  const a = String(actual ?? "").trim();
  const e = String(expected ?? "").trim();
  if (a === e) {
    return true;
  }
  if (/^(true|false)$/i.test(a) && /^(true|false)$/i.test(e)) {
    return a.toLowerCase() === e.toLowerCase();
  }
  const isNumber = (value) => /^[-+]?\d+(\.\d+)?$/.test(value);
  if (isNumber(a) && isNumber(e)) {
    return Number(a) === Number(e);
  }
  return false;
}

async function compileCode(source, challenge) {
  const languageKey = String(challenge.language || room?.language || "Java").trim().toLowerCase();
  const profile = LANGUAGE_PROFILES[languageKey];
  if (!profile) {
    throw new Error(`A linguagem ${challenge.language} ainda não é suportada pelo compilador.`);
  }

  const endpoint = window.TechStartJudge0Endpoint;
  if (!endpoint) {
    throw new Error(`O compilador de ${profile.label} não está configurado.`);
  }

  const runtimes = await loadJudge0Runtimes(endpoint, profile.label);
  const runtime = pickRuntime(runtimes, profile);
  if (!runtime) {
    throw new Error(`A instância de compilação não disponibiliza ${profile.label} agora.`);
  }

  const tests = challenge.tests || [];
  const program = buildProgram(languageKey, source, tests);
  const response = await fetch(`${endpoint}/submissions?base64_encoded=false&wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language_id: runtime.id,
      source_code: program,
      cpu_time_limit: 3,
      wall_time_limit: 5,
      memory_limit: profile.memory,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "O serviço de compilação não respondeu.");
  }

  const rawOutput = payload.stdout || "";
  const testResults = tests.map((test, index) => {
    const prefix = `__TECHSTART_TEST_${index}__`;
    const actual = rawOutput.split(/\r?\n/).find((line) => line.startsWith(prefix))?.slice(prefix.length).trim() || "";
    const rawExpected = String(test.expected ?? "").trim();
    const expected = /^(['"]).*\1$/.test(rawExpected) ? rawExpected.slice(1, -1) : rawExpected;
    return { call: test.call, expected, actual, passed: actual !== "" ? sameOutput(actual, expected) : expected === "" };
  });

  // Status 6 do Judge0 = erro de compilacao. Avisos do compilador nao reprovam o aluno.
  const compileFailed = payload.status?.id === 6 || (!payload.status && Boolean(payload.compile_output));
  const compiled = !compileFailed;
  const passed = compiled && testResults.length > 0 && testResults.every((test) => test.passed);
  const details = testResults.map((test) => `${test.passed ? "✓" : "✕"} ${test.call}: esperado ${test.expected}, recebido ${test.actual || "(sem retorno)"}`).join("\n");
  const doneMessage = languageKey === "java" || languageKey === "c#" ? "Compilação concluída." : "Execução concluída.";

  let output;
  if (compileFailed) {
    output = payload.compile_output || payload.message || "Erro de compilação.";
  } else if (passed) {
    output = `${doneMessage}\n${details}`;
  } else {
    output = [payload.stderr, details].filter(Boolean).join("\n");
  }

  const aiFeedback = await evaluateCodeWithAI(
    source,
    challenge,
    output
  );

  return {
    configured: true,
    languageLabel: profile.label,
    compiled,
    passed,
    tests: testResults,
    output,
    aiFeedback,
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
  document.getElementById("give-up-round-button").disabled = disabled;
  document.getElementById("solution-input").disabled = disabled;
}

async function syncPresence() {
  if (redirected || !duelUser || !roomCode || isOfflineTraining()) {
    return;
  }

  const touchedRoom = await TechStartApp.touchPlayerPresenceAsync(roomCode, duelUser.id);
  if (touchedRoom) {
    room = touchedRoom;
    document.getElementById("connection-status").textContent = "Conexão estável";
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
      redirectToDashboard("treino encerrado");
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
      const preview = await TechStartApp.previewSolutionAsync(document.getElementById("solution-input").value, room.currentChallengeId);
      await TechStartApp.registerOfflineTrainingAsync(
        duelUser.id,
        room.language || duelUser.language || "Java",
        "Tempo esgotado"
      );
      saveTrainingFeedback(preview, "time");
      redirectToTrainingFeedback();
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
    ? "Treino"
    : `Round ${room.currentRound}/${room.totalRounds}`;
  document.getElementById("connection-status").textContent = isOfflineTraining()
    ? "Treino em andamento"
    : "Conexão estável";
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
  const languageLabel = document.getElementById("challenge-language");
  if (languageLabel) {
    languageLabel.textContent = `${challenge.language || room.language || "Java"}:`;
  }
  renderChallengeDetails(challenge);
  document.getElementById("solution-input").placeholder = challenge.starter;

  setRoundControlsDisabled(!currentPlayer || currentPlayer.solutionStatus !== "pending");
  document.getElementById("botao_voltar").classList.toggle("hidden", !isOfflineTraining());
  renderChat();
}

const testButton = document.getElementById("test-button");
if (testButton) {
  testButton.addEventListener("click", async () => {
    const code = document.getElementById("solution-input").value;
    if (!code.trim()) {
      showPopup("Codigo vazio", "Digite uma solucao antes de testar.");
      return;
    }

    const challenge = TechStartApp.getChallengeById(room.currentChallengeId);
    setBusy(true, "Compilando e executando os testes...");
    document.getElementById("ai-output").textContent = "Avaliando sua solução...";
    try {
      const result = await compileCode(code, challenge);
      const passed = result.passed ?? result.evaluation?.correct;
      document.getElementById("result-output").textContent = result.output || result.error || result.message || result.evaluation?.message || "Teste concluído.";
      document.getElementById("ai-output").textContent = result.aiFeedback || (passed ? "Os testes concluíram sem erros." : "Revise a assinatura do método e os casos públicos.");
      showPopup(passed ? "Testes concluídos" : "Ajuste necessário", result.configured ? `A execução em ${result.languageLabel} terminou.` : result.message);
    } catch (error) {
      document.getElementById("result-output").textContent = error.message;
      showPopup("Não foi possível compilar", "Confira a conexão com o serviço de compilação e tente novamente.");
    } finally {
      setBusy(false, "Conexão estável");
    }
  });
}

const chatToggle = document.getElementById("chat-toggle");
if (chatToggle) {
  chatToggle.addEventListener("click", () => {
    const chat = document.getElementById("floating-chat");
    const minimized = chat.classList.toggle("is-minimized");
    chatToggle.setAttribute("aria-expanded", String(!minimized));
  });
}

const chatForm = document.getElementById("chat-form");
if (chatForm) {
  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("chat-input");
    if (!input.value.trim()) return;
    await TechStartApp.sendChatMessageAsync(room.code, duelUser.id, input.value);
    input.value = "";
    await renderRoom();
  });
}

const botaoVoltar = document.getElementById("botao_voltar");
if (botaoVoltar) {
  botaoVoltar.addEventListener("click", () => {
    if (!isOfflineTraining()) return;

    showConfirmPopup(
      "Sair da partida?",
      "Tem certeza que deseja sair da partida? Seu progresso será perdido.",
      async () => {
        setBusy(true, "Encerrando treino...");

        await TechStartApp.leaveRoomAsync(room.code, duelUser.id);

        redirectToDashboard("treino encerrado pelo jogador");
      }
    );
  });
}

const solutionInput = document.getElementById("solution-input");
if (solutionInput) {
  solutionInput.addEventListener("keydown", handleEditorKeydown);
}

const submitButton = document.getElementById("submit-button");
if (submitButton) {
  submitButton.addEventListener("click", async () => {
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
}

const giveUpButton = document.getElementById("give-up-round-button");
if (giveUpButton) {
  giveUpButton.addEventListener("click", async () => {
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
  });
}

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

  try {
    await renderRoom();
  } catch (error) {
    console.error("Erro ao renderizar a sala:", error);
  }
  try {
    await syncPresence();
  } catch (error) {
    console.error("Erro ao sincronizar presenca:", error);
  }
  window.setInterval(renderRoom, 1000);
  window.setInterval(syncPresence, 5000);
})();

// Criar estrelas
function criarEstrelas() {
  const container = document.getElementById("estrelas-container");
  if (!container) return;

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
  if (!container) return;

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