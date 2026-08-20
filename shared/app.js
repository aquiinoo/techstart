const TechStartApp = (() => {
  const STORAGE_KEYS = {
    users: "techstart_users",
    session: "techstart_session",
    rooms: "techstart_rooms",
    helpRequests: "techstart_help_requests",
    supportMessages: "techstart_support_messages",
    activeRoom: "techstart_active_room",
  };

  const READY_COUNTDOWN_SECONDS = 5;
  const ROUND_DURATION_SECONDS = 300;
  const MATCH_WIN_SCORE = 2;
  const MATCH_TOTAL_ROUNDS = 3;
  // A aba pode ficar em segundo plano ou passar por uma oscilacao curta de rede.
  // Um intervalo maior evita encerrar uma partida valida por um falso positivo.
  const PLAYER_HEARTBEAT_STALE_SECONDS = 90;

  let challengeCatalog = window.TechStartChallenges || [];

  function getChallenges() {
    return challengeCatalog.length ? challengeCatalog : window.TechStartChallenges || [];
  }

  async function loadChallengesAsync() {
    if (window.TechStartChallengesLoader) {
      challengeCatalog = await window.TechStartChallengesLoader;
    } else {
      challengeCatalog = window.TechStartChallenges || challengeCatalog;
    }
    return challengeCatalog;
  }

  function shuffleList(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
  }

  function buildChallengeDeck() {
    const challenges = getChallenges();
    return shuffleList(challenges).map((challenge) => challenge.id);
  }

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function slug(value) {
    return normalizeText(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function uid(prefix = "id") {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function now() {
    return new Date().toISOString();
  }

  function secondsSince(date) {
    if (!date) {
      return 0;
    }
    return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  }

  function ensureRoomDefaults(room) {
    if (!room) {
      return room;
    }
    const challenges = getChallenges();
    room.status = room.status || "waiting";
    room.currentRound = room.currentRound || 1;
    room.totalRounds = MATCH_TOTAL_ROUNDS;
    room.challengeDeck = room.challengeDeck?.length ? room.challengeDeck : buildChallengeDeck();
    room.currentChallengeId = room.currentChallengeId || room.challengeDeck[0] || challenges[0]?.id;
    room.timerStartedAt = room.timerStartedAt || null;
    room.countdownStartedAt = room.countdownStartedAt || null;
    room.roundDurationSeconds =
      !room.roundDurationSeconds || room.roundDurationSeconds === 120
        ? ROUND_DURATION_SECONDS
        : room.roundDurationSeconds;
    room.readyCountdownSeconds = room.readyCountdownSeconds || READY_COUNTDOWN_SECONDS;
    room.lastRoundWinnerUserId = room.lastRoundWinnerUserId || null;
    room.lastRoundNumber = room.lastRoundNumber || null;
    room.lastRoundChallengeId = room.lastRoundChallengeId || null;
    room.lastRoundFeedback = room.lastRoundFeedback || [];
    room.lastRoundFeedbackSeen = room.lastRoundFeedbackSeen || [];
    room.matchFinishedAfterFeedback = room.matchFinishedAfterFeedback || false;
    room.finishedReason = room.finishedReason || null;
    room.disconnectedUserIds = room.disconnectedUserIds || [];
    room.mode = room.mode || "online";
    room.players = (room.players || []).map((player) => ({
      ready: false,
      score: 0,
      submittedAt: null,
      solutionStatus: "pending",
      scoredThisRound: false,
      lastSeenAt: null,
      presenceStatus: "offline",
      ...player,
    }));
    return room;
  }

  function getCountdownRemainingSeconds(room) {
    const safeRoom = ensureRoomDefaults(room);
    if (!safeRoom || safeRoom.status !== "countdown" || !safeRoom.countdownStartedAt) {
      return 0;
    }
    return Math.max(0, safeRoom.readyCountdownSeconds - secondsSince(safeRoom.countdownStartedAt));
  }

  function getRoundRemainingSeconds(room) {
    const safeRoom = ensureRoomDefaults(room);
    if (!safeRoom || safeRoom.status !== "playing" || !safeRoom.timerStartedAt) {
      return safeRoom ? safeRoom.roundDurationSeconds : ROUND_DURATION_SECONDS;
    }
    return Math.max(0, safeRoom.roundDurationSeconds - secondsSince(safeRoom.timerStartedAt));
  }

  function seed() {
    const users = read(STORAGE_KEYS.users, null);
    if (users && users.length) {
      return;
    }

    const demoUsers = [
      {
        id: uid("user"),
        name: "Ana Beatriz",
        nick: "anacode",
        email: "ana@techstart.dev",
        password: "123456",
        github: "https://github.com/anacode",
        bio: "Front-end e logica competitiva.",
        language: "Java",
        connections: [],
        rankingPoints: 120,
        duelWins: 4,
        duelLosses: 1,
        trainingSessions: 3,
        history: [
          {
            id: uid("history"),
            type: "duel",
            opponent: "Pedrao",
            result: "Vitoria",
            score: "2 x 1",
            date: "2026-03-18T19:10:00.000Z",
          },
        ],
      },
      {
        id: uid("user"),
        name: "Pedro Lima",
        nick: "pedrao",
        email: "pedro@techstart.dev",
        password: "123456",
        github: "https://github.com/pedrao",
        bio: "Gosto de desafios em Java e Python.",
        language: "Python",
        connections: [],
        rankingPoints: 95,
        duelWins: 3,
        duelLosses: 3,
        trainingSessions: 4,
        history: [],
      },
      {
        id: uid("user"),
        name: "Convidado TechStart",
        nick: "guest",
        email: "guest@techstart.local",
        password: "guest",
        github: "",
        bio: "Perfil temporario para exploracao do sistema.",
        language: "Java",
        connections: [],
        rankingPoints: 10,
        duelWins: 0,
        duelLosses: 0,
        trainingSessions: 1,
        history: [],
        guest: true,
      },
    ];

    write(STORAGE_KEYS.users, demoUsers);
    write(STORAGE_KEYS.rooms, []);
    write(STORAGE_KEYS.helpRequests, []);
    write(STORAGE_KEYS.supportMessages, []);
  }

  function getUsers() {
    seed();
    return read(STORAGE_KEYS.users, []);
  }

  function saveUsers(users) {
    write(STORAGE_KEYS.users, users);
  }

  function getRooms() {
    seed();
    return read(STORAGE_KEYS.rooms, []);
  }

  function saveRooms(rooms) {
    write(STORAGE_KEYS.rooms, rooms);
  }

  function cacheRoomLocally(room) {
    if (!room) {
      return;
    }
    const rooms = getRooms();
    const index = rooms.findIndex((item) => item.code === room.code);
    if (index === -1) {
      rooms.push(room);
    } else {
      rooms[index] = room;
    }
    saveRooms(rooms);
    saveActiveRoom(room);
  }

  function saveActiveRoom(room) {
    write(STORAGE_KEYS.activeRoom, room);
  }

  function getActiveRoom() {
    return read(STORAGE_KEYS.activeRoom, null);
  }

  function getHelpRequests() {
    seed();
    return read(STORAGE_KEYS.helpRequests, []);
  }

  function saveHelpRequests(requests) {
    write(STORAGE_KEYS.helpRequests, requests);
  }

  function getSupportMessages() {
    seed();
    return read(STORAGE_KEYS.supportMessages, []);
  }

  function saveSupportMessages(messages) {
    write(STORAGE_KEYS.supportMessages, messages);
  }

  function findUserByEmail(email) {
    return getUsers().find((user) => user.email.toLowerCase() === normalizeText(email).toLowerCase());
  }

  function findUserById(userId) {
    return getUsers().find((user) => user.id === userId) || null;
  }

  function getSession() {
    seed();
    return read(STORAGE_KEYS.session, null);
  }

  function setSession(user) {
    write(STORAGE_KEYS.session, {
      userId: user.id,
      loginAt: now(),
    });
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEYS.session);
  }

  function getCurrentUser() {
    const session = getSession();
    if (!session) {
      return null;
    }
    return findUserById(session.userId);
  }

  function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "../../index.html";
    }
    return user;
  }

  function register(data) {
    const name = normalizeText(data.name);
    const nick = normalizeText(data.nick) || slug(name);
    const email = normalizeText(data.email).toLowerCase();
    const password = normalizeText(data.password);
    const confirmPassword = normalizeText(data.confirmPassword);

    if (!name || !nick || !email || !password || !confirmPassword) {
      return { ok: false, message: "Preencha todos os campos obrigatorios." };
    }
    if (password.length < 6) {
      return { ok: false, message: "A senha precisa ter pelo menos 6 caracteres." };
    }
    if (password !== confirmPassword) {
      return { ok: false, message: "As senhas nao coincidem." };
    }
    if (findUserByEmail(email)) {
      return { ok: false, message: "Ja existe um usuario cadastrado com este email." };
    }

    const users = getUsers();
    const user = {
      id: uid("user"),
      name,
      nick,
      email,
      password,
      github: normalizeText(data.github),
      bio: normalizeText(data.bio),
      language: normalizeText(data.language) || "Java",
      connections: [],
      rankingPoints: 0,
      duelWins: 0,
      duelLosses: 0,
      trainingSessions: 0,
      history: [],
    };

    users.push(user);
    saveUsers(users);
    setSession(user);
    return { ok: true, user };
  }

  function login(email, password) {
    const user = findUserByEmail(email);
    if (!user || user.password !== normalizeText(password)) {
      return { ok: false, message: "Usuario ou senha incorretos." };
    }
    setSession(user);
    return { ok: true, user };
  }

  function loginAsGuest() {
    const guest = findUserByEmail("guest@techstart.local");
    setSession(guest);
    return guest;
  }

  function updateProfile(userId, changes) {
    const users = getUsers();
    const index = users.findIndex((user) => user.id === userId);
    if (index === -1) {
      return null;
    }

    users[index] = {
      ...users[index],
      name: normalizeText(changes.name) || users[index].name,
      nick: normalizeText(changes.nick) || users[index].nick,
      github: normalizeText(changes.github),
      bio: normalizeText(changes.bio),
      language: normalizeText(changes.language) || users[index].language,
    };

    saveUsers(users);
    return users[index];
  }

  function connectUsers(currentUserId, targetUserId) {
    const users = getUsers();
    const currentIndex = users.findIndex((user) => user.id === currentUserId);
    const targetIndex = users.findIndex((user) => user.id === targetUserId);
    if (currentIndex === -1 || targetIndex === -1 || currentUserId === targetUserId) {
      return null;
    }

    const currentConnections = new Set(users[currentIndex].connections || []);
    const targetConnections = new Set(users[targetIndex].connections || []);
    currentConnections.add(targetUserId);
    targetConnections.add(currentUserId);

    users[currentIndex].connections = [...currentConnections];
    users[targetIndex].connections = [...targetConnections];
    saveUsers(users);
    return users[currentIndex];
  }

  function getPublicProfiles(currentUserId) {
    return getUsers().filter((user) => user.id !== currentUserId);
  }

  function addHistoryEntry(userId, entry) {
    const users = getUsers();
    const index = users.findIndex((user) => user.id === userId);
    if (index === -1) {
      return;
    }

    users[index].history = [
      {
        id: uid("history"),
        date: now(),
        ...entry,
      },
      ...(users[index].history || []),
    ];
    saveUsers(users);
  }

  function createRoom(ownerUserId, language) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const challengeDeck = buildChallengeDeck();
    const room = {
      id: uid("room"),
      code,
      language: normalizeText(language) || "Java",
      players: [
        {
          userId: ownerUserId,
          ready: false,
          score: 0,
          submittedAt: null,
          solutionStatus: "pending",
          scoredThisRound: false,
          lastSeenAt: null,
          presenceStatus: "offline",
        },
      ],
      chat: [],
      status: "waiting",
      currentRound: 1,
      totalRounds: MATCH_TOTAL_ROUNDS,
      challengeDeck,
      currentChallengeId: challengeDeck[0] || getChallenges()[0]?.id,
      createdAt: now(),
      winnerUserId: null,
      rematchRequests: [],
      helpRequests: [],
      timerStartedAt: null,
      countdownStartedAt: null,
      roundDurationSeconds: ROUND_DURATION_SECONDS,
      readyCountdownSeconds: READY_COUNTDOWN_SECONDS,
      lastRoundWinnerUserId: null,
      lastRoundNumber: null,
      lastRoundChallengeId: null,
      lastRoundFeedback: [],
      lastRoundFeedbackSeen: [],
      matchFinishedAfterFeedback: false,
      finishedReason: null,
      disconnectedUserIds: [],
      mode: "online",
      randomQueue: false,
    };

    const rooms = getRooms();
    rooms.push(room);
    saveRooms(rooms);
    saveActiveRoom(room);
    return room;
  }

  function joinRoomByCode(code, userId) {
    const rooms = getRooms();
    const roomIndex = rooms.findIndex((room) => room.code === normalizeText(code).toUpperCase());
    if (roomIndex === -1) {
      return { ok: false, message: "Sala nao encontrada." };
    }

    const room = ensureRoomDefaults(rooms[roomIndex]);
    if (room.players.some((player) => player.userId === userId)) {
      return { ok: true, room };
    }
    if (room.players.length >= 2) {
      return { ok: false, message: "Esta sala ja esta cheia." };
    }

    room.players.push({
      userId: userId,
      ready: false,
      score: 0,
      submittedAt: null,
      solutionStatus: "pending",
      scoredThisRound: false,
      lastSeenAt: null,
      presenceStatus: "offline",
    });
    room.status = "lobby";
    saveRooms(rooms);
    saveActiveRoom(room);
    return { ok: true, room };
  }

  function getRoomByCode(code) {
    return ensureRoomDefaults(getRooms().find((room) => room.code === normalizeText(code).toUpperCase()) || null);
  }

  function updateRoom(room) {
    const rooms = getRooms();
    const index = rooms.findIndex((item) => item.id === room.id);
    if (index === -1) {
      return;
    }
    rooms[index] = room;
    saveRooms(rooms);
    saveActiveRoom(room);
  }

  function touchPlayerPresence(roomCode, userId) {
    const room = getRoomByCode(roomCode);
    if (!room) {
      return null;
    }
    const player = room.players.find((item) => item.userId === userId);
    if (!player) {
      return null;
    }
    player.lastSeenAt = now();
    player.presenceStatus = "online";
    updateRoom(room);
    return room;
  }

  function finishDisconnectedPlayers(roomCode, activeUserId) {
    const room = getRoomByCode(roomCode);
    if (!room || room.mode === "offline" || room.status !== "playing") {
      return room;
    }

    const disconnectedPlayers = room.players.filter((player) => {
      return player.userId !== activeUserId && player.lastSeenAt && secondsSince(player.lastSeenAt) > PLAYER_HEARTBEAT_STALE_SECONDS;
    });

    if (!disconnectedPlayers.length) {
      return room;
    }

    const winner = room.players.find((player) => player.userId === activeUserId) || room.players.find((player) => {
      return !disconnectedPlayers.some((disconnected) => disconnected.userId === player.userId);
    });

    disconnectedPlayers.forEach((player) => {
      player.presenceStatus = "offline";
      player.solutionStatus = player.solutionStatus === "pending" ? "wrong" : player.solutionStatus;
      player.evaluationMessage = "Jogador desconectado durante o round.";
      player.aiFeedback = "O round foi encerrado automaticamente porque este jogador saiu ou fechou a aba.";
      player.submittedAt = player.submittedAt || now();
    });

    room.status = "finished";
    room.timerStartedAt = null;
    room.countdownStartedAt = null;
    room.winnerUserId = winner ? winner.userId : activeUserId;
    room.finishedReason = "disconnect";
    room.disconnectedUserIds = disconnectedPlayers.map((player) => player.userId);
    finalizeRoomStats(room);
    updateRoom(room);
    return room;
  }

  function setPlayerReady(roomCode, userId, ready) {
    const room = getRoomByCode(roomCode);
    if (!room) {
      return null;
    }
    ensureRoomDefaults(room);
    const player = room.players.find((item) => item.userId === userId);
    if (!player) {
      return null;
    }
    player.ready = ready;
    if (!ready && room.status === "countdown") {
      room.status = "lobby";
      room.countdownStartedAt = null;
    }
    const allReady = room.players.length === 2 && room.players.every((item) => item.ready);
    if (allReady) {
      room.status = "countdown";
      room.countdownStartedAt = room.countdownStartedAt || now();
      room.timerStartedAt = null;
    }
    updateRoom(room);
    return room;
  }

  function startRound(roomCode) {
    const room = getRoomByCode(roomCode);
    if (!room) {
      return null;
    }
    const allReady = room.players.length === 2 && room.players.every((item) => item.ready);
    if (!allReady || room.status === "playing" || room.status === "finished") {
      return room;
    }
    room.status = "playing";
    room.countdownStartedAt = null;
    room.timerStartedAt = now();
    room.players.forEach((player) => {
      player.solutionStatus = "pending";
      player.submittedAt = null;
      player.scoredThisRound = false;
      player.lastSeenAt = now();
      player.presenceStatus = "online";
    });
    updateRoom(room);
    return room;
  }

  function startOfflineTraining(roomCode, userId) {
    const room = getRoomByCode(roomCode);
    if (!room) {
      return null;
    }
    const player = room.players.find((item) => item.userId === userId);
    if (!player) {
      return null;
    }
    room.mode = "offline";
    room.status = "playing";
    room.totalRounds = 1;
    room.currentRound = 1;
    room.currentChallengeId = room.currentChallengeId || room.challengeDeck?.[0] || getChallenges()[0]?.id;
    room.countdownStartedAt = null;
    room.timerStartedAt = now();
    room.winnerUserId = null;
    room.lastRoundWinnerUserId = null;
    room.players = [
      {
        ...player,
        ready: true,
        submittedAt: null,
        solutionStatus: "pending",
        scoredThisRound: false,
        lastSeenAt: now(),
        presenceStatus: "online",
      },
    ];
    updateRoom(room);
    return room;
  }

  function sendChatMessage(roomCode, userId, message) {
    const room = getRoomByCode(roomCode);
    if (!room || !normalizeText(message)) {
      return null;
    }
    room.chat.push({
      id: uid("chat"),
      userId,
      message: normalizeText(message),
      createdAt: now(),
    });
    updateRoom(room);
    return room;
  }

  function getChallengeById(challengeId) {
    const challenges = getChallenges();
    return challenges.find((challenge) => challenge.id === challengeId) || challenges[0];
  }

  function includesPattern(source, pattern) {
    const normalizedSource = source.replace(/\s+/g, " ").trim();
    const normalizedPattern = String(pattern).replace(/\s+/g, " ").trim();
    return normalizedSource.includes(normalizedPattern);
  }

  function evaluatePatternChallenge(source, challenge) {
    const missingPatterns = (challenge.requiredPatterns || []).filter((pattern) => !includesPattern(source, pattern));
    const missingAcceptedGroups = (challenge.acceptedPatterns || []).filter((group) => {
      return !group.some((pattern) => includesPattern(source, pattern));
    });

    if (missingPatterns.length || missingAcceptedGroups.length) {
      const missing = [
        ...missingPatterns,
        ...missingAcceptedGroups.map((group) => group.join(" ou ")),
      ];
      return {
        correct: false,
        message: `Ainda faltam pontos importantes na solucao: ${missing.join(", ")}.`,
      };
    }

    const testSummary = (challenge.tests || [])
      .map((test) => `${test.call} -> ${test.expected}`)
      .join("\n");

    return {
      correct: true,
      message: `Estrutura esperada encontrada. Casos previstos:\n${testSummary}`,
    };
  }

  function evaluateChallenge(source, challengeId) {
    const challenge = getChallengeById(challengeId);
    try {
      if (!challenge) {
        return { correct: false, message: "Desafio nao encontrado." };
      }
      if (typeof challenge.evaluator === "function") {
        return challenge.evaluator(source);
      }
      return evaluatePatternChallenge(source, challenge);
    } catch (error) {
      return {
        correct: false,
        message: `Erro ao executar o codigo: ${error.message}`,
      };
    }
  }

  function generateAiFeedback(source, evaluation, challenge) {
    const lines = source.split("\n").filter(Boolean).length;
    const feedback = [];
    feedback.push(evaluation.correct ? "A IA identificou que sua solucao atende aos testes deste round." : "A IA identificou pontos para ajuste antes da submissao final.");
    feedback.push(lines <= 3 ? "Sua resposta esta objetiva." : "Sua resposta pode ser simplificada para ficar mais clara.");
    feedback.push(source.includes("return") ? "Bom uso de retorno explicito na funcao." : "Inclua um return para entregar o resultado esperado.");
    return feedback.join(" ");
  }

  async function generateAiFeedbackAsync(source, evaluation, challenge) {
    const fallback = generateAiFeedback(source, evaluation);
    const apiKey = window.TechStartGeminiApiKey;

    if (!apiKey) {
        console.warn("Chave da IA não foi carregada. Usando feedback local.");
        return fallback;
    }

    try {
        const prompt = `
Você é um professor de programação ajudando um estudante.

Analise a solução enviada pelo aluno para o desafio abaixo.

DESAFIO:
Título: ${challenge?.title || ""}
Descrição: ${challenge?.description || ""}
Linguagem: ${challenge?.language || "Java"}

CÓDIGO DO ALUNO:
${source}

RESULTADO DA AVALIAÇÃO:
${JSON.stringify(evaluation)}

Escreva um feedback curto (no máximo 4 frases, poucas linhas) em português, em texto corrido, sem títulos, sem markdown (nada de **, *, #, listas numeradas ou com marcadores).

Cubra rapidamente, em prosa:
- Se a solução está correta.
- O principal ponto de atenção, se houver.
- Uma sugestão objetiva de melhoria.

Não forneça uma solução completa pronta.
Não invente erros que não estejam no código.
Seja direto e objetivo, como um comentário rápido de code review.

Responda diretamente ao aluno.
`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 220
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Erro retornado pelo Gemini:", data);
            throw new Error("Gemini não respondeu corretamente.");
        }

        const feedback =
            data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!feedback) {
            throw new Error("O Gemini não retornou texto.");
        }

        console.log("Resposta do Gemini:", feedback);

        return feedback;

    } catch (error) {
        console.warn(
            "Não foi possível obter feedback do Gemini. Usando feedback local.",
            error
        );

        return fallback;
    }
}

  function previewSolution(source, challengeId) {
    const evaluation = evaluateChallenge(source, challengeId);
    return {
      evaluation,
      aiFeedback: generateAiFeedback(source, evaluation),
    };
  }

  async function previewSolutionAsync(source, challengeId) {
    const challenge = getChallengeById(challengeId);
    const evaluation = evaluateChallenge(source, challengeId);
    return {
      evaluation,
      aiFeedback: await generateAiFeedbackAsync(source, evaluation, challenge),
    };
  }

  function createRoundFeedback(room, player) {
    const status = player.solutionStatus || "wrong";
    let evaluationMessage =
      player.evaluationMessage ||
      (status === "correct"
        ? "Solucao aceita neste round."
        : "O round terminou sem uma solucao aceita.");
    const aiFeedback =
      player.aiFeedback ||
      (status === "correct"
        ? "Voce resolveu o desafio dentro dos criterios esperados."
        : "Revise a assinatura do metodo, o retorno e os operadores esperados para este desafio.");

    if (status === "correct" && player.scoredThisRound) {
      evaluationMessage = `${evaluationMessage}\nVoce foi o primeiro a acertar e recebeu o ponto do round.`;
    } else if (status === "correct") {
      evaluationMessage = `${evaluationMessage}\nSua solucao estava correta, mas outro jogador acertou antes e recebeu o ponto.`;
    }

    return {
      userId: player.userId,
      round: room.currentRound,
      challengeId: room.currentChallengeId,
      solutionStatus: status,
      scoredThisRound: Boolean(player.scoredThisRound),
      submittedAt: player.submittedAt,
      score: player.score,
      evaluationMessage,
      aiFeedback,
      createdAt: now(),
    };
  }

  function submitSolution(roomCode, userId, source) {
    const room = getRoomByCode(roomCode);
    if (!room) {
      return { ok: false, message: "Sala nao encontrada." };
    }

    ensureRoomDefaults(room);
    const challenge = getChallengeById(room.currentChallengeId);
    const evaluation = evaluateChallenge(source, room.currentChallengeId);
    const aiFeedback = generateAiFeedback(source, evaluation);
    const player = room.players.find((item) => item.userId === userId);
    if (!player) {
      return { ok: false, message: "Jogador nao encontrado na sala." };
    }

    player.submittedAt = now();
    player.solutionStatus = evaluation.correct ? "correct" : "wrong";
    player.evaluationMessage = evaluation.message;
    player.aiFeedback = aiFeedback;
    player.scoredThisRound = false;

    const correctPlayers = room.players.filter((item) => item.solutionStatus === "correct");
    if (correctPlayers.length) {
      const winner = correctPlayers.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))[0];
      room.winnerUserId = winner.userId;
    } else if (room.players.every((item) => item.solutionStatus !== "pending")) {
      room.winnerUserId = null;
    }

    completeRoundIfNeeded(room);

    updateRoom(room);
    return {
      ok: true,
      evaluation,
      aiFeedback,
      challenge,
      room,
    };
  }

  function giveUpRound(roomCode, userId) {
    const room = getRoomByCode(roomCode);
    if (!room || room.status !== "playing") {
      return { ok: false, message: "Este round não está disponível." };
    }
    const player = room.players.find((item) => item.userId === userId);
    if (!player || player.solutionStatus !== "pending") {
      return { ok: false, message: "Você já enviou uma resposta neste round." };
    }
    player.submittedAt = now();
    player.solutionStatus = "wrong";
    player.scoredThisRound = false;
    player.evaluationMessage = "Você desistiu deste round.";
    player.aiFeedback = "Use o feedback e a solução de referência para tentar novamente no próximo desafio.";
    completeRoundIfNeeded(room);
    updateRoom(room);
    return { ok: true, room };
  }

  function completeRoundIfNeeded(room, finalizeStats = true) {
    const finishedRound = room.players.every((item) => item.solutionStatus !== "pending");
    if (!finishedRound) {
      return false;
    }

    const completedRound = room.currentRound;
    const completedChallengeId = room.currentChallengeId;

    const correctPlayers = room.players.filter((item) => item.solutionStatus === "correct");
    if (correctPlayers.length) {
      const winner = [...correctPlayers].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))[0];
      room.lastRoundWinnerUserId = winner.userId;
      room.winnerUserId = winner.userId;
      room.players.forEach((player) => {
        player.scoredThisRound = player.userId === winner.userId;
      });
      winner.score += 1;
    } else {
      room.lastRoundWinnerUserId = null;
      room.players.forEach((player) => {
        player.scoredThisRound = false;
      });
    }

    room.lastRoundNumber = completedRound;
    room.lastRoundChallengeId = completedChallengeId;
    room.lastRoundFeedback = room.players.map((player) => createRoundFeedback(room, player));
    room.lastRoundFeedbackSeen = [];

    const leader = [...room.players].sort((a, b) => b.score - a.score)[0];
    const hasMatchWinner = Boolean(leader && leader.score >= MATCH_WIN_SCORE);
    const reachedRoundLimit = room.currentRound >= room.totalRounds;

    if (!hasMatchWinner && !reachedRoundLimit) {
      room.currentRound += 1;
      room.currentChallengeId = room.challengeDeck[(room.currentRound - 1) % room.challengeDeck.length] || getChallenges()[0]?.id;
      room.status = "feedback";
      room.matchFinishedAfterFeedback = false;
      room.timerStartedAt = null;
      room.countdownStartedAt = null;
      room.players.forEach((item) => {
        item.ready = false;
        item.solutionStatus = "pending";
        item.submittedAt = null;
        item.scoredThisRound = false;
        item.evaluationMessage = null;
        item.aiFeedback = null;
      });
      return true;
    }

    room.status = "feedback";
    room.matchFinishedAfterFeedback = true;
    room.timerStartedAt = null;
    room.countdownStartedAt = null;
    const [firstPlayer, secondPlayer] = [...room.players].sort((a, b) => b.score - a.score);
    room.winnerUserId =
      firstPlayer && secondPlayer && firstPlayer.score > secondPlayer.score
        ? firstPlayer.userId
        : null;
    room.finishedReason = room.winnerUserId ? null : "draw";
    if (finalizeStats) {
      finalizeRoomStats(room);
    }
    return true;
  }

  function markRoundFeedbackSeen(roomCode, userId) {
    const room = getRoomByCode(roomCode);
    if (!room) {
      return null;
    }
    ensureRoomDefaults(room);
    if (!room.lastRoundFeedbackSeen.includes(userId)) {
      room.lastRoundFeedbackSeen.push(userId);
    }
    const allPlayersSawFeedback = room.players.every((player) => room.lastRoundFeedbackSeen.includes(player.userId));
    if (allPlayersSawFeedback) {
      room.status = room.matchFinishedAfterFeedback ? "finished" : "lobby";
      room.matchFinishedAfterFeedback = false;
      room.players.forEach((player) => {
        player.ready = false;
      });
    }
    updateRoom(room);
    return room;
  }

  function finishExpiredRound(roomCode) {
    const room = getRoomByCode(roomCode);
    if (!room) {
      return null;
    }
    if (room.status !== "playing" || getRoundRemainingSeconds(room) > 0) {
      return room;
    }
    room.players.forEach((player) => {
      if (player.solutionStatus === "pending") {
        player.solutionStatus = "wrong";
        player.submittedAt = now();
        player.evaluationMessage = "Tempo esgotado antes do envio da solucao.";
        player.aiFeedback = "Organize a solucao pelo metodo pedido, escreva o retorno primeiro e depois ajuste os detalhes.";
      }
    });
    completeRoundIfNeeded(room);
    updateRoom(room);
    return room;
  }

  function finalizeRoomStats(room) {
    const winnerId = room.winnerUserId;
    room.players.forEach((player) => {
      const user = findUserById(player.userId);
      if (!user) {
        return;
      }
      const opponent = room.players.find((item) => item.userId !== player.userId);
      const opponentUser = opponent ? findUserById(opponent.userId) : null;
      const draw = !winnerId;
      const victory = !draw && player.userId === winnerId;
      addHistoryEntry(player.userId, {
        type: "duel",
        opponent: opponentUser ? opponentUser.nick : "Sem adversario",
        result: draw ? "Empate" : victory ? "Vitoria" : "Derrota",
        score: `${player.score} x ${opponent ? opponent.score : 0}`,
      });

      const users = getUsers();
      const index = users.findIndex((item) => item.id === player.userId);
      if (index === -1) {
        return;
      }
      users[index].rankingPoints += draw ? 10 : victory ? 20 : 5;
      users[index].duelWins += victory ? 1 : 0;
      users[index].duelLosses += draw || victory ? 0 : 1;
      saveUsers(users);
    });
  }

  function giveUp(roomCode, userId) {
    const room = getRoomByCode(roomCode);
    if (!room) {
      return null;
    }
    const opponent = room.players.find((player) => player.userId !== userId);
    if (!opponent) {
      room.status = "abandoned";
      room.winnerUserId = null;
      room.finishedReason = "abandoned";
      updateRoom(room);
      return room;
    }
    room.status = "finished";
    room.winnerUserId = opponent.userId;
    finalizeRoomStats(room);
    updateRoom(room);
    return room;
  }

  function leaveRoom(roomCode, userId) {
    const room = getRoomByCode(roomCode);
    if (!room) {
      return null;
    }
    if (room.status === "playing" && room.mode !== "offline") {
      return { ok: false, message: "Use desistir depois que o duelo comecar." };
    }
    room.players = room.players.filter((player) => player.userId !== userId);
    room.rematchRequests = (room.rematchRequests || []).filter((id) => id !== userId);
    room.lastRoundFeedbackSeen = (room.lastRoundFeedbackSeen || []).filter((id) => id !== userId);
    room.status = room.players.length ? "waiting" : "abandoned";
    room.countdownStartedAt = null;
    room.timerStartedAt = null;
    updateRoom(room);
    return { ok: true, room };
  }

  function requestRematch(roomCode, userId) {
    const room = getRoomByCode(roomCode);
    if (!room) {
      return null;
    }
    if (!room.rematchRequests.includes(userId)) {
      room.rematchRequests.push(userId);
    }
    if (room.rematchRequests.length === 2) {
      room.status = "lobby";
      room.currentRound = 1;
      room.challengeDeck = buildChallengeDeck();
      room.currentChallengeId = room.challengeDeck[0] || getChallenges()[0]?.id;
      room.totalRounds = MATCH_TOTAL_ROUNDS;
      room.winnerUserId = null;
      room.rematchRequests = [];
      room.timerStartedAt = null;
      room.countdownStartedAt = null;
      room.lastRoundWinnerUserId = null;
      room.lastRoundNumber = null;
      room.lastRoundChallengeId = null;
      room.lastRoundFeedback = [];
      room.lastRoundFeedbackSeen = [];
      room.matchFinishedAfterFeedback = false;
      room.finishedReason = null;
      room.disconnectedUserIds = [];
      room.players.forEach((player) => {
        player.ready = false;
        player.score = 0;
        player.submittedAt = null;
        player.solutionStatus = "pending";
      });
    }
    updateRoom(room);
    return room;
  }

  function requestRandomMatch(userId, language) {
    const rooms = getRooms();
    let room = rooms.find(
      (item) => item.randomQueue && item.language === language && item.players.length === 1 && item.players[0].userId !== userId
    );

    if (room) {
      return joinRoomByCode(room.code, userId);
    }

    room = createRoom(userId, language);
    room.randomQueue = true;
    updateRoom(room);
    return { ok: true, room };
  }

  function requestExternalHelp(roomCode, userId, details) {
    const requests = getHelpRequests();
    const room = getRoomByCode(roomCode);
    if (!room) {
      return null;
    }
    const request = {
      id: uid("help"),
      roomCode,
      userId,
      details: normalizeText(details) || "Preciso de ajuda neste round.",
      status: "open",
      createdAt: now(),
      helperUserId: null,
    };
    requests.unshift(request);
    saveHelpRequests(requests);
    room.helpRequests.push(request.id);
    updateRoom(room);
    return request;
  }

  function acceptHelpRequest(requestId, helperUserId) {
    const requests = getHelpRequests();
    const index = requests.findIndex((item) => item.id === requestId);
    if (index === -1) {
      return null;
    }
    requests[index].status = "accepted";
    requests[index].helperUserId = helperUserId;
    saveHelpRequests(requests);

    const users = getUsers();
    const helperIndex = users.findIndex((user) => user.id === helperUserId);
    if (helperIndex !== -1) {
      users[helperIndex].rankingPoints += 8;
      saveUsers(users);
    }
    return requests[index];
  }

  function sendSupportMessage(userId, subject, message) {
    const messages = getSupportMessages();
    messages.unshift({
      id: uid("support"),
      userId,
      subject: normalizeText(subject) || "Contato via suporte",
      message: normalizeText(message),
      createdAt: now(),
    });
    saveSupportMessages(messages);
  }

  function registerOfflineTraining(userId, language, result) {
    addHistoryEntry(userId, {
      type: "offline",
      opponent: "Treino solo",
      result,
      score: language,
    });
    const users = getUsers();
    const index = users.findIndex((user) => user.id === userId);
    if (index !== -1) {
      users[index].trainingSessions += 1;
      users[index].rankingPoints += 4;
      saveUsers(users);
    }
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  }

  function escapeHtmlForFeedback(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderFeedbackHtml(rawText) {
    const text = String(rawText || "").trim();
    if (!text) {
      return "";
    }

    const lines = text.split(/\r?\n/);
    const htmlParts = [];
    let listItems = [];

    function flushList() {
      if (listItems.length) {
        htmlParts.push(`<ul class="feedback-list">${listItems.join("")}</ul>`);
        listItems = [];
      }
    }

    function inline(str) {
      let escaped = escapeHtmlForFeedback(str);
      escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      escaped = escaped.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
      escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
      return escaped;
    }

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        return;
      }
      const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
      const numberedMatch = trimmed.match(/^\d+[.)]\s+(.*)$/);
      if (bulletMatch || numberedMatch) {
        listItems.push(`<li>${inline(bulletMatch ? bulletMatch[1] : numberedMatch[1])}</li>`);
        return;
      }
      flushList();
      const headingMatch = trimmed.match(/^#{1,6}\s+(.*)$/);
      if (headingMatch) {
        htmlParts.push(`<p class="feedback-heading">${inline(headingMatch[1])}</p>`);
        return;
      }
      htmlParts.push(`<p>${inline(trimmed)}</p>`);
    });
    flushList();

    return htmlParts.join("");
  }

  function firebaseEnabled() {
    return Boolean(window.TechStartFirebaseClient && window.TechStartFirebaseClient.enabled);
  }

  async function getCurrentUserAsync() {
    if (firebaseEnabled()) {
      return window.TechStartFirebaseClient.getCurrentUser();
    }
    return getCurrentUser();
  }

  async function requireAuthAsync() {
    const user = firebaseEnabled()
      ? await window.TechStartFirebaseClient.waitForAuth()
      : getCurrentUser();
    if (!user) {
      window.location.href = "../../index.html";
    }
    return user;
  }

  async function registerAsync(data) {
    if (firebaseEnabled()) {
      return window.TechStartFirebaseClient.register(data);
    }
    return register(data);
  }

  async function loginAsync(email, password) {
    if (firebaseEnabled()) {
      return window.TechStartFirebaseClient.login(email, password);
    }
    return login(email, password);
  }

  async function loginAsGuestAsync() {
    if (firebaseEnabled()) {
      return window.TechStartFirebaseClient.loginAsGuest();
    }
    return loginAsGuest();
  }

  async function logoutAsync() {
    if (firebaseEnabled()) {
      return window.TechStartFirebaseClient.logout();
    }
    return logout();
  }

  async function getUsersAsync() {
    if (firebaseEnabled()) {
      return window.TechStartFirebaseClient.getUsers();
    }
    return getUsers();
  }

  async function updateProfileAsync(userId, changes) {
    if (firebaseEnabled()) {
      return window.TechStartFirebaseClient.updateProfile(userId, changes);
    }
    return updateProfile(userId, changes);
  }

  async function connectUsersAsync(currentUserId, targetUserId) {
    if (firebaseEnabled()) {
      return window.TechStartFirebaseClient.connectUsers(currentUserId, targetUserId);
    }
    return connectUsers(currentUserId, targetUserId);
  }

  async function getPublicProfilesAsync(currentUserId) {
    const users = await getUsersAsync();
    return users.filter((user) => user.id !== currentUserId);
  }

  async function createRoomAsync(ownerUserId, language) {
    if (firebaseEnabled()) {
      try {
        const room = await window.TechStartFirebaseClient.createRoom(ownerUserId, language);
        const safeRoom = ensureRoomDefaults(room);
        await window.TechStartFirebaseClient.updateRoom(safeRoom);
        cacheRoomLocally(safeRoom);
        return safeRoom;
      } catch (error) {
        console.warn("Nao foi possivel criar a sala no Firebase. Usando fallback local.", error);
      }
    }
    const localRoom = createRoom(ownerUserId, language);
    cacheRoomLocally(localRoom);
    return localRoom;
  }

  async function joinRoomByCodeAsync(code, userId) {
    if (firebaseEnabled()) {
      try {
        const result = await window.TechStartFirebaseClient.joinRoomByCode(code, userId);
        if (result.ok) {
          result.room = ensureRoomDefaults(result.room);
          await window.TechStartFirebaseClient.updateRoom(result.room);
          cacheRoomLocally(result.room);
        }
        return result;
      } catch (error) {
        console.warn("Nao foi possivel entrar na sala pelo Firebase. Usando fallback local.", error);
      }
    }
    const localResult = joinRoomByCode(code, userId);
    if (localResult.ok) {
      cacheRoomLocally(localResult.room);
    }
    return localResult;
  }

  async function getRoomByCodeAsync(code) {
    if (firebaseEnabled()) {
      try {
        const firebaseRoom = await window.TechStartFirebaseClient.getRoomByCode(code);
        if (firebaseRoom) {
          const safeRoom = ensureRoomDefaults(firebaseRoom);
          cacheRoomLocally(safeRoom);
          return safeRoom;
        }
      } catch (error) {
        console.warn("Nao foi possivel ler a sala do Firebase.", error);
      }
    }
    const localRoom = getRoomByCode(code);
    if (localRoom) {
      return localRoom;
    }
    const activeRoom = getActiveRoom();
    if (activeRoom && activeRoom.code === normalizeText(code).toUpperCase()) {
      return ensureRoomDefaults(activeRoom);
    }
    return null;
  }

  async function leaveRoomAsync(roomCode, userId) {
    if (firebaseEnabled()) {
      try {
        const room = await getRoomByCodeAsync(roomCode);
        if (!room) {
          return null;
        }
        if (room.status === "playing" && room.mode !== "offline") {
          return { ok: false, message: "Use desistir depois que o duelo comecar." };
        }
        room.players = room.players.filter((player) => player.userId !== userId);
        room.rematchRequests = (room.rematchRequests || []).filter((id) => id !== userId);
        room.lastRoundFeedbackSeen = (room.lastRoundFeedbackSeen || []).filter((id) => id !== userId);
        room.status = room.players.length ? "waiting" : "abandoned";
        room.countdownStartedAt = null;
        room.timerStartedAt = null;
        await window.TechStartFirebaseClient.updateRoom(room);
        cacheRoomLocally(room);
        return { ok: true, room };
      } catch (error) {
        console.warn("Nao foi possivel sair da sala no Firebase.", error);
      }
    }
    const localResult = leaveRoom(roomCode, userId);
    if (localResult?.room) {
      cacheRoomLocally(localResult.room);
    }
    return localResult;
  }

  async function setPlayerReadyAsync(roomCode, userId, ready) {
    if (firebaseEnabled()) {
      try {
        const room = await getRoomByCodeAsync(roomCode);
        if (!room) {
          return null;
        }
        const player = room.players.find((item) => item.userId === userId);
        if (!player) {
          return null;
        }
        player.ready = ready;
        if (!ready && room.status === "countdown") {
          room.status = "lobby";
          room.countdownStartedAt = null;
        }
        const allReady = room.players.length === 2 && room.players.every((item) => item.ready);
        if (allReady) {
          room.status = "countdown";
          room.countdownStartedAt = room.countdownStartedAt || now();
          room.timerStartedAt = null;
        }
        await window.TechStartFirebaseClient.updateRoom(room);
        cacheRoomLocally(room);
        return room;
      } catch (error) {
        console.warn("Nao foi possivel sincronizar o status pronto no Firebase. Usando fallback local.", error);
      }
    }
    const localRoom = setPlayerReady(roomCode, userId, ready);
    cacheRoomLocally(localRoom);
    return localRoom;
  }

  async function touchPlayerPresenceAsync(roomCode, userId) {
    if (firebaseEnabled()) {
      try {
        const room = await getRoomByCodeAsync(roomCode);
        if (!room) {
          return null;
        }
        const player = room.players.find((item) => item.userId === userId);
        if (!player) {
          return null;
        }
        player.lastSeenAt = now();
        player.presenceStatus = "online";
        await window.TechStartFirebaseClient.updateRoom(room);
        cacheRoomLocally(room);
        return room;
      } catch (error) {
        console.warn("Nao foi possivel sincronizar a presenca no Firebase. Usando fallback local.", error);
      }
    }
    const localRoom = touchPlayerPresence(roomCode, userId);
    cacheRoomLocally(localRoom);
    return localRoom;
  }

  async function finishDisconnectedPlayersAsync(roomCode, activeUserId) {
    if (firebaseEnabled()) {
      try {
        const room = await getRoomByCodeAsync(roomCode);
        if (!room || room.mode === "offline" || room.status !== "playing") {
          return room;
        }

        const disconnectedPlayers = room.players.filter((player) => {
          return player.userId !== activeUserId && player.lastSeenAt && secondsSince(player.lastSeenAt) > PLAYER_HEARTBEAT_STALE_SECONDS;
        });

        if (!disconnectedPlayers.length) {
          return room;
        }

        const winner = room.players.find((player) => player.userId === activeUserId) || room.players.find((player) => {
          return !disconnectedPlayers.some((disconnected) => disconnected.userId === player.userId);
        });

        disconnectedPlayers.forEach((player) => {
          player.presenceStatus = "offline";
          player.solutionStatus = player.solutionStatus === "pending" ? "wrong" : player.solutionStatus;
          player.evaluationMessage = "Jogador desconectado durante o round.";
          player.aiFeedback = "O round foi encerrado automaticamente porque este jogador saiu ou fechou a aba.";
          player.submittedAt = player.submittedAt || now();
        });

        room.status = "finished";
        room.timerStartedAt = null;
        room.countdownStartedAt = null;
        room.winnerUserId = winner ? winner.userId : activeUserId;
        room.finishedReason = "disconnect";
        room.disconnectedUserIds = disconnectedPlayers.map((player) => player.userId);
        await finalizeFirebaseRoomStats(room);
        await window.TechStartFirebaseClient.updateRoom(room);
        cacheRoomLocally(room);
        return room;
      } catch (error) {
        console.warn("Nao foi possivel encerrar por desconexao no Firebase. Usando fallback local.", error);
      }
    }
    const localRoom = finishDisconnectedPlayers(roomCode, activeUserId);
    cacheRoomLocally(localRoom);
    return localRoom;
  }

  async function startRoundAsync(roomCode) {
    if (firebaseEnabled()) {
      try {
        const room = await getRoomByCodeAsync(roomCode);
        if (!room) {
          return null;
        }
        const allReady = room.players.length === 2 && room.players.every((item) => item.ready);
        if (allReady && room.status !== "playing" && room.status !== "finished") {
          room.status = "playing";
          room.countdownStartedAt = null;
          room.timerStartedAt = now();
          room.players.forEach((player) => {
            player.solutionStatus = "pending";
            player.submittedAt = null;
            player.lastSeenAt = now();
            player.presenceStatus = "online";
          });
          await window.TechStartFirebaseClient.updateRoom(room);
        }
        cacheRoomLocally(room);
        return room;
      } catch (error) {
        console.warn("Nao foi possivel iniciar o round no Firebase. Usando fallback local.", error);
      }
    }
    const localRoom = startRound(roomCode);
    cacheRoomLocally(localRoom);
    return localRoom;
  }

  async function startOfflineTrainingAsync(roomCode, userId) {
    if (firebaseEnabled()) {
      try {
        const room = await getRoomByCodeAsync(roomCode);
        if (!room) {
          return null;
        }
        const player = room.players.find((item) => item.userId === userId);
        if (!player) {
          return null;
        }
        room.mode = "offline";
        room.status = "playing";
        room.totalRounds = 1;
        room.currentRound = 1;
        room.currentChallengeId = room.currentChallengeId || room.challengeDeck?.[0] || getChallenges()[0]?.id;
        room.countdownStartedAt = null;
        room.timerStartedAt = now();
        room.winnerUserId = null;
        room.lastRoundWinnerUserId = null;
        room.players = [
          {
            ...player,
            ready: true,
            submittedAt: null,
            solutionStatus: "pending",
          },
        ];
        await window.TechStartFirebaseClient.updateRoom(room);
        cacheRoomLocally(room);
        return room;
      } catch (error) {
        console.warn("Nao foi possivel iniciar o treino no Firebase. Usando fallback local.", error);
      }
    }
    const localRoom = startOfflineTraining(roomCode, userId);
    cacheRoomLocally(localRoom);
    return localRoom;
  }

  async function sendChatMessageAsync(roomCode, userId, message) {
    if (firebaseEnabled()) {
      try {
        const room = await window.TechStartFirebaseClient.sendChatMessage(roomCode, userId, message);
        cacheRoomLocally(room);
        return room;
      } catch (error) {
        console.warn("Nao foi possivel sincronizar o chat no Firebase. Usando fallback local.", error);
      }
    }
    const localRoom = sendChatMessage(roomCode, userId, message);
    cacheRoomLocally(localRoom);
    return localRoom;
  }

  async function requestExternalHelpAsync(roomCode, userId, details) {
    if (firebaseEnabled()) {
      try {
        const room = await getRoomByCodeAsync(roomCode);
        if (!room) {
          return null;
        }
        const request = {
          id: uid("help"),
          roomCode,
          userId,
          details: normalizeText(details) || "Preciso de ajuda neste round.",
          status: "open",
          createdAt: now(),
          helperUserId: null,
        };
        room.helpRequests = [...(room.helpRequests || []), request.id];
        await window.TechStartFirebaseClient.saveHelpRequest(request);
        await window.TechStartFirebaseClient.updateRoom(room);
        cacheRoomLocally(room);
        return request;
      } catch (error) {
        console.warn("Nao foi possivel registrar o pedido de ajuda no Firebase. Usando fallback local.", error);
      }
    }
    return requestExternalHelp(roomCode, userId, details);
  }

  async function getHelpRequestsAsync() {
    if (firebaseEnabled()) {
      return window.TechStartFirebaseClient.getHelpRequests();
    }
    return getHelpRequests();
  }

  async function acceptHelpRequestAsync(requestId, helperUserId) {
    if (firebaseEnabled()) {
      const accepted = await window.TechStartFirebaseClient.acceptHelpRequest(requestId, helperUserId);
      const users = await getUsersAsync();
      const helper = users.find((user) => user.id === helperUserId);
      if (helper) {
        await updateProfileAsync(helperUserId, {
          rankingPoints: (helper.rankingPoints || 0) + 8,
        });
      }
      return accepted;
    }
    return acceptHelpRequest(requestId, helperUserId);
  }

  async function sendSupportMessageAsync(userId, subject, message) {
    if (firebaseEnabled()) {
      return window.TechStartFirebaseClient.saveSupportMessage({
        id: uid("support"),
        userId,
        subject: normalizeText(subject) || "Contato via suporte",
        message: normalizeText(message),
        createdAt: now(),
      });
    }
    return sendSupportMessage(userId, subject, message);
  }

  async function registerOfflineTrainingAsync(userId, language, result) {
    if (!firebaseEnabled()) {
      return registerOfflineTraining(userId, language, result);
    }
    const user = await getCurrentUserAsync();
    if (!user) {
      return;
    }
    const updatedHistory = [
      {
        id: uid("history"),
        date: now(),
        type: "offline",
        opponent: "Treino solo",
        result,
        score: language,
      },
      ...(user.history || []),
    ];
    return updateProfileAsync(userId, {
      history: updatedHistory,
      trainingSessions: (user.trainingSessions || 0) + 1,
      rankingPoints: (user.rankingPoints || 0) + 4,
    });
  }

  async function ensureOfflineOpponentAsync() {
    if (!firebaseEnabled()) {
      return getUsers().find((user) => user.guest) || null;
    }
    const users = await getUsersAsync();
    let guest = users.find((user) => user.guest);
    if (guest) {
      return guest;
    }
    return window.TechStartFirebaseClient.upsertUserProfile({
      id: "offline-bot",
      name: "Convidado TechStart",
      nick: "guest",
      email: "",
      github: "",
      bio: "Perfil temporario para treino.",
      language: "Java",
      guest: true,
    });
  }

  async function finalizeFirebaseRoomStats(room) {
    const users = await getUsersAsync();
    for (const duelPlayer of room.players) {
      const profile = users.find((user) => user.id === duelPlayer.userId);
      const opponent = room.players.find((item) => item.userId !== duelPlayer.userId);
      const opponentProfile = users.find((user) => user.id === opponent?.userId);
      if (!profile) {
        continue;
      }
      const draw = !room.winnerUserId;
      const victory = !draw && duelPlayer.userId === room.winnerUserId;
      const updatedHistory = [
        {
          id: uid("history"),
          date: now(),
          type: "duel",
          opponent: opponentProfile ? opponentProfile.nick : "Sem adversario",
          result: draw ? "Empate" : victory ? "Vitoria" : "Derrota",
          score: `${duelPlayer.score} x ${opponent ? opponent.score : 0}`,
        },
        ...(profile.history || []),
      ];
      await updateProfileAsync(duelPlayer.userId, {
        history: updatedHistory,
        rankingPoints: (profile.rankingPoints || 0) + (draw ? 10 : victory ? 20 : 5),
        duelWins: (profile.duelWins || 0) + (victory ? 1 : 0),
        duelLosses: (profile.duelLosses || 0) + (draw || victory ? 0 : 1),
      });
    }
  }

  async function submitSolutionAsync(roomCode, userId, source) {
    if (firebaseEnabled()) {
      try {
        const room = await getRoomByCodeAsync(roomCode);
        if (!room) {
          return { ok: false, message: "Sala nao encontrada." };
        }

        const challenge = getChallengeById(room.currentChallengeId);
        const evaluation = evaluateChallenge(source, room.currentChallengeId);
        const aiFeedback = await generateAiFeedbackAsync(source, evaluation, challenge);
        const player = room.players.find((item) => item.userId === userId);
        if (!player) {
          return { ok: false, message: "Jogador nao encontrado na sala." };
        }

        player.submittedAt = now();
        player.solutionStatus = evaluation.correct ? "correct" : "wrong";
        player.evaluationMessage = evaluation.message;
        player.aiFeedback = aiFeedback;
        player.scoredThisRound = false;

        const correctPlayers = room.players.filter((item) => item.solutionStatus === "correct");
        if (correctPlayers.length) {
          const winner = [...correctPlayers].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))[0];
          room.winnerUserId = winner.userId;
        }

        completeRoundIfNeeded(room, false);
        if (room.matchFinishedAfterFeedback) {
          await finalizeFirebaseRoomStats(room);
        }

        await window.TechStartFirebaseClient.updateRoom(room);
        cacheRoomLocally(room);
        return { ok: true, evaluation, aiFeedback, room };
      } catch (error) {
        console.warn("Nao foi possivel sincronizar a submissao no Firebase. Usando fallback local.", error);
      }
    }
    const localResult = submitSolution(roomCode, userId, source);
    if (localResult.ok) {
      const aiFeedback = await generateAiFeedbackAsync(source, localResult.evaluation, localResult.challenge);
      localResult.aiFeedback = aiFeedback;
      const player = localResult.room.players.find((item) => item.userId === userId);
      if (player) {
        player.aiFeedback = aiFeedback;
      }
      const roundFeedback = (localResult.room.lastRoundFeedback || []).find((item) => item.userId === userId);
      if (roundFeedback) {
        roundFeedback.aiFeedback = aiFeedback;
      }
      updateRoom(localResult.room);
      cacheRoomLocally(localResult.room);
    }
    return localResult;
  }

  async function finishExpiredRoundAsync(roomCode) {
    if (firebaseEnabled()) {
      try {
        const room = await getRoomByCodeAsync(roomCode);
        if (!room) {
          return null;
        }
        if (room.status !== "playing" || getRoundRemainingSeconds(room) > 0) {
          return room;
        }
        room.players.forEach((player) => {
          if (player.solutionStatus === "pending") {
            player.solutionStatus = "wrong";
            player.submittedAt = now();
            player.evaluationMessage = "Tempo esgotado antes do envio da solucao.";
            player.aiFeedback = "Organize a solucao pelo metodo pedido, escreva o retorno primeiro e depois ajuste os detalhes.";
          }
        });
        completeRoundIfNeeded(room, false);
        if (room.matchFinishedAfterFeedback) {
          await finalizeFirebaseRoomStats(room);
        }
        await window.TechStartFirebaseClient.updateRoom(room);
        cacheRoomLocally(room);
        return room;
      } catch (error) {
        console.warn("Nao foi possivel finalizar o round expirado no Firebase. Usando fallback local.", error);
      }
    }
    const localRoom = finishExpiredRound(roomCode);
    cacheRoomLocally(localRoom);
    return localRoom;
  }

  async function giveUpRoundAsync(roomCode, userId) {
    if (firebaseEnabled()) {
      try {
        const room = await getRoomByCodeAsync(roomCode);
        if (!room || room.status !== "playing") {
          return { ok: false, message: "Este round não está disponível." };
        }
        const player = room.players.find((item) => item.userId === userId);
        if (!player || player.solutionStatus !== "pending") {
          return { ok: false, message: "Você já enviou uma resposta neste round." };
        }
        player.submittedAt = now();
        player.solutionStatus = "wrong";
        player.scoredThisRound = false;
        player.evaluationMessage = "Você desistiu deste round.";
        player.aiFeedback = "Use o feedback e a solução de referência para tentar novamente no próximo desafio.";
        completeRoundIfNeeded(room, false);
        if (room.matchFinishedAfterFeedback) {
          await finalizeFirebaseRoomStats(room);
        }
        await window.TechStartFirebaseClient.updateRoom(room);
        cacheRoomLocally(room);
        return { ok: true, room };
      } catch (error) {
        console.warn("Não foi possível desistir do round no Firebase.", error);
      }
    }
    const localResult = giveUpRound(roomCode, userId);
    if (localResult.room) {
      cacheRoomLocally(localResult.room);
    }
    return localResult;
  }

  async function markRoundFeedbackSeenAsync(roomCode, userId) {
    if (firebaseEnabled()) {
      try {
        const room = await getRoomByCodeAsync(roomCode);
        if (!room) {
          return null;
        }
        if (!room.lastRoundFeedbackSeen.includes(userId)) {
          room.lastRoundFeedbackSeen.push(userId);
        }
        const allPlayersSawFeedback = room.players.every((player) => room.lastRoundFeedbackSeen.includes(player.userId));
        if (allPlayersSawFeedback) {
          room.status = room.matchFinishedAfterFeedback ? "finished" : "lobby";
          room.matchFinishedAfterFeedback = false;
          room.players.forEach((player) => {
            player.ready = false;
          });
        }
        await window.TechStartFirebaseClient.updateRoom(room);
        cacheRoomLocally(room);
        return room;
      } catch (error) {
        console.warn("Nao foi possivel marcar o feedback como visto no Firebase. Usando fallback local.", error);
      }
    }
    const localRoom = markRoundFeedbackSeen(roomCode, userId);
    cacheRoomLocally(localRoom);
    return localRoom;
  }

  async function giveUpAsync(roomCode, userId) {
    if (firebaseEnabled()) {
      try {
        const room = await getRoomByCodeAsync(roomCode);
        if (!room) {
          return null;
        }
        const opponent = room.players.find((player) => player.userId !== userId);
        if (!opponent) {
          room.status = "abandoned";
          room.winnerUserId = null;
          room.finishedReason = "abandoned";
          await window.TechStartFirebaseClient.updateRoom(room);
          cacheRoomLocally(room);
          return room;
        }
        room.status = "finished";
        room.winnerUserId = opponent.userId;
        await finalizeFirebaseRoomStats(room);
        await window.TechStartFirebaseClient.updateRoom(room);
        cacheRoomLocally(room);
        return room;
      } catch (error) {
        console.warn("Nao foi possivel sincronizar a desistencia no Firebase. Usando fallback local.", error);
      }
    }
    const localRoom = giveUp(roomCode, userId);
    cacheRoomLocally(localRoom);
    return localRoom;
  }

  async function requestRematchAsync(roomCode, userId) {
    if (firebaseEnabled()) {
      try {
        const room = await getRoomByCodeAsync(roomCode);
        if (!room) {
          return null;
        }
        if (!room.rematchRequests.includes(userId)) {
          room.rematchRequests.push(userId);
        }
        if (room.rematchRequests.length === 2) {
          room.status = "lobby";
          room.currentRound = 1;
          room.challengeDeck = buildChallengeDeck();
          room.currentChallengeId = room.challengeDeck[0] || getChallenges()[0]?.id;
          room.totalRounds = MATCH_TOTAL_ROUNDS;
          room.winnerUserId = null;
          room.rematchRequests = [];
          room.timerStartedAt = null;
          room.countdownStartedAt = null;
          room.lastRoundWinnerUserId = null;
          room.lastRoundNumber = null;
          room.lastRoundChallengeId = null;
          room.lastRoundFeedback = [];
          room.lastRoundFeedbackSeen = [];
          room.matchFinishedAfterFeedback = false;
          room.finishedReason = null;
          room.disconnectedUserIds = [];
          room.players.forEach((player) => {
            player.ready = false;
            player.score = 0;
            player.submittedAt = null;
            player.solutionStatus = "pending";
          });
        }
        await window.TechStartFirebaseClient.updateRoom(room);
        cacheRoomLocally(room);
        return room;
      } catch (error) {
        console.warn("Nao foi possivel sincronizar a revanche no Firebase. Usando fallback local.", error);
      }
    }
    const localRoom = requestRematch(roomCode, userId);
    cacheRoomLocally(localRoom);
    return localRoom;
  }

  async function requestRandomMatchAsync(userId, language) {
    if (firebaseEnabled()) {
      try {
        const snapshot = await window.TechStartFirebaseClient.db.collection("rooms").get();
        const rooms = snapshot.docs.map((doc) => doc.data());
        let room = rooms.find(
          (item) => item.randomQueue && item.language === language && item.players.length === 1 && item.players[0].userId !== userId
        );
        if (room) {
          const result = await window.TechStartFirebaseClient.joinRoomByCode(room.code, userId);
          if (result.ok) {
            cacheRoomLocally(result.room);
          }
          return result;
        }
        room = await window.TechStartFirebaseClient.createRoom(userId, language);
        room.randomQueue = true;
        await window.TechStartFirebaseClient.updateRoom(room);
        cacheRoomLocally(room);
        return { ok: true, room };
      } catch (error) {
        console.warn("Nao foi possivel sincronizar a fila aleatoria no Firebase. Usando fallback local.", error);
      }
    }
    const localResult = requestRandomMatch(userId, language);
    if (localResult.ok) {
      cacheRoomLocally(localResult.room);
    }
    return localResult;
  }

  return {
    seed,
    loadChallengesAsync,
    getCurrentUserAsync,
    requireAuthAsync,
    getCurrentUser,
    requireAuth,
    registerAsync,
    register,
    loginAsync,
    login,
    loginAsGuestAsync,
    loginAsGuest,
    logoutAsync,
    logout,
    updateProfileAsync,
    updateProfile,
    connectUsersAsync,
    connectUsers,
    getPublicProfilesAsync,
    getPublicProfiles,
    getUsersAsync,
    getUsers,
    createRoomAsync,
    createRoom,
    joinRoomByCodeAsync,
    joinRoomByCode,
    getRoomByCodeAsync,
    getRoomByCode,
    setPlayerReadyAsync,
    setPlayerReady,
    touchPlayerPresenceAsync,
    touchPlayerPresence,
    finishDisconnectedPlayersAsync,
    finishDisconnectedPlayers,
    startRoundAsync,
    startRound,
    startOfflineTrainingAsync,
    startOfflineTraining,
    sendChatMessageAsync,
    sendChatMessage,
    getChallengeById,
    previewSolution,
    previewSolutionAsync,
    submitSolutionAsync,
    submitSolution,
    giveUpRoundAsync,
    giveUpRound,
    finishExpiredRoundAsync,
    finishExpiredRound,
    markRoundFeedbackSeenAsync,
    markRoundFeedbackSeen,
    ensureOfflineOpponentAsync,
    giveUpAsync,
    giveUp,
    leaveRoomAsync,
    leaveRoom,
    requestRematchAsync,
    requestRematch,
    requestRandomMatchAsync,
    requestRandomMatch,
    requestExternalHelpAsync,
    requestExternalHelp,
    getHelpRequestsAsync,
    getHelpRequests,
    acceptHelpRequestAsync,
    acceptHelpRequest,
    sendSupportMessageAsync,
    sendSupportMessage,
    registerOfflineTrainingAsync,
    registerOfflineTraining,
    formatDate,
    renderFeedbackHtml,
    getCountdownRemainingSeconds,
    getRoundRemainingSeconds,
    getActiveRoom,
  };
})();

window.TechStartApp = TechStartApp;