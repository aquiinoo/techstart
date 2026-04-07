const TechStartApp = (() => {
  const STORAGE_KEYS = {
    users: "techstart_users",
    session: "techstart_session",
    rooms: "techstart_rooms",
    helpRequests: "techstart_help_requests",
    supportMessages: "techstart_support_messages",
    activeRoom: "techstart_active_room",
  };

  const DEFAULT_CHALLENGES = [
    {
      id: "sum-js",
      title: "Funcao soma",
      language: "JavaScript",
      description: "Crie uma funcao chamada soma que receba dois parametros e retorne a soma entre eles.",
      starter: "function soma(a, b) {\n  \n}",
      evaluator(source) {
        const fn = new Function(`${source}; return typeof soma === "function" ? soma : null;`)();
        if (!fn) {
          return { correct: false, message: "Voce precisa criar uma funcao chamada soma." };
        }

        const tests = [
          { input: [2, 3], expected: 5 },
          { input: [-1, 1], expected: 0 },
          { input: [10, 15], expected: 25 },
        ];

        for (const test of tests) {
          const result = fn(...test.input);
          if (result !== test.expected) {
            return {
              correct: false,
              message: `Teste falhou para soma(${test.input.join(", ")}). Resultado esperado: ${test.expected}.`,
            };
          }
        }

        return { correct: true, message: "Todos os testes passaram." };
      },
      hints: [
        "Declare a funcao com o nome exato soma.",
        "Use dois parametros, por exemplo: a e b.",
        "Retorne o valor com return a + b.",
      ],
    },
    {
      id: "even-js",
      title: "Numero par",
      language: "JavaScript",
      description: "Crie uma funcao chamada ehPar que receba um numero e retorne true quando ele for par.",
      starter: "function ehPar(numero) {\n  \n}",
      evaluator(source) {
        const fn = new Function(`${source}; return typeof ehPar === "function" ? ehPar : null;`)();
        if (!fn) {
          return { correct: false, message: "Voce precisa criar uma funcao chamada ehPar." };
        }

        const tests = [
          { input: [2], expected: true },
          { input: [7], expected: false },
          { input: [0], expected: true },
        ];

        for (const test of tests) {
          const result = fn(...test.input);
          if (result !== test.expected) {
            return {
              correct: false,
              message: `Teste falhou para ehPar(${test.input.join(", ")}).`,
            };
          }
        }

        return { correct: true, message: "Todos os testes passaram." };
      },
      hints: [
        "Use o operador % para descobrir o resto da divisao.",
        "Numeros pares possuem resto 0 quando divididos por 2.",
        "Retorne true ou false.",
      ],
    },
  ];

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
        language: "JavaScript",
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
        language: "JavaScript",
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
      language: normalizeText(data.language) || "JavaScript",
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
    const room = {
      id: uid("room"),
      code,
      language: normalizeText(language) || "JavaScript",
      players: [
        {
          userId: ownerUserId,
          ready: false,
          score: 0,
          submittedAt: null,
          solutionStatus: "pending",
        },
      ],
      chat: [],
      status: "waiting",
      currentRound: 1,
      totalRounds: DEFAULT_CHALLENGES.length,
      currentChallengeId: DEFAULT_CHALLENGES[0].id,
      createdAt: now(),
      winnerUserId: null,
      rematchRequests: [],
      helpRequests: [],
      timerStartedAt: null,
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

    const room = rooms[roomIndex];
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
    });
    room.status = "lobby";
    saveRooms(rooms);
    saveActiveRoom(room);
    return { ok: true, room };
  }

  function getRoomByCode(code) {
    return getRooms().find((room) => room.code === normalizeText(code).toUpperCase()) || null;
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

  function setPlayerReady(roomCode, userId, ready) {
    const room = getRoomByCode(roomCode);
    if (!room) {
      return null;
    }
    const player = room.players.find((item) => item.userId === userId);
    if (!player) {
      return null;
    }
    player.ready = ready;
    const allReady = room.players.length === 2 && room.players.every((item) => item.ready);
    if (allReady) {
      room.status = "playing";
      room.timerStartedAt = now();
    }
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
    return DEFAULT_CHALLENGES.find((challenge) => challenge.id === challengeId) || DEFAULT_CHALLENGES[0];
  }

  function evaluateChallenge(source, challengeId) {
    const challenge = getChallengeById(challengeId);
    try {
      return challenge.evaluator(source);
    } catch (error) {
      return {
        correct: false,
        message: `Erro ao executar o codigo: ${error.message}`,
      };
    }
  }

  function generateAiFeedback(source, evaluation) {
    const lines = source.split("\n").filter(Boolean).length;
    const feedback = [];
    feedback.push(evaluation.correct ? "A IA identificou que sua solucao atende aos testes deste round." : "A IA identificou pontos para ajuste antes da submissao final.");
    feedback.push(lines <= 3 ? "Sua resposta esta objetiva." : "Sua resposta pode ser simplificada para ficar mais clara.");
    feedback.push(source.includes("return") ? "Bom uso de retorno explicito na funcao." : "Inclua um return para entregar o resultado esperado.");
    return feedback.join(" ");
  }

  function previewSolution(source, challengeId) {
    const evaluation = evaluateChallenge(source, challengeId);
    return {
      evaluation,
      aiFeedback: generateAiFeedback(source, evaluation),
    };
  }

  function submitSolution(roomCode, userId, source) {
    const room = getRoomByCode(roomCode);
    if (!room) {
      return { ok: false, message: "Sala nao encontrada." };
    }

    const challenge = getChallengeById(room.currentChallengeId);
    const evaluation = evaluateChallenge(source, room.currentChallengeId);
    const aiFeedback = generateAiFeedback(source, evaluation);
    const player = room.players.find((item) => item.userId === userId);
    if (!player) {
      return { ok: false, message: "Jogador nao encontrado na sala." };
    }

    player.submittedAt = now();
    player.solutionStatus = evaluation.correct ? "correct" : "wrong";
    if (evaluation.correct) {
      player.score += 1;
    }

    const correctPlayers = room.players.filter((item) => item.solutionStatus === "correct");
    if (correctPlayers.length) {
      const winner = correctPlayers.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))[0];
      room.winnerUserId = winner.userId;
    } else if (room.players.every((item) => item.solutionStatus !== "pending")) {
      room.winnerUserId = room.players[0].userId;
    }

    const finishedRound = room.players.every((item) => item.solutionStatus !== "pending");
    if (finishedRound && room.currentRound < room.totalRounds) {
      room.currentRound += 1;
      room.currentChallengeId = DEFAULT_CHALLENGES[room.currentRound - 1].id;
      room.timerStartedAt = now();
      room.players.forEach((item) => {
        item.ready = true;
        item.solutionStatus = "pending";
        item.submittedAt = null;
      });
    } else if (finishedRound) {
      room.status = "finished";
      const playerWinner = room.players.sort((a, b) => b.score - a.score)[0];
      room.winnerUserId = playerWinner.userId;
      finalizeRoomStats(room);
    }

    updateRoom(room);
    return {
      ok: true,
      evaluation,
      aiFeedback,
      challenge,
      room,
    };
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
      const victory = player.userId === winnerId;
      addHistoryEntry(player.userId, {
        type: "duel",
        opponent: opponentUser ? opponentUser.nick : "Sem adversario",
        result: victory ? "Vitoria" : "Derrota",
        score: `${player.score} x ${opponent ? opponent.score : 0}`,
      });

      const users = getUsers();
      const index = users.findIndex((item) => item.id === player.userId);
      if (index === -1) {
        return;
      }
      users[index].rankingPoints += victory ? 20 : 5;
      users[index].duelWins += victory ? 1 : 0;
      users[index].duelLosses += victory ? 0 : 1;
      saveUsers(users);
    });
  }

  function giveUp(roomCode, userId) {
    const room = getRoomByCode(roomCode);
    if (!room) {
      return null;
    }
    const opponent = room.players.find((player) => player.userId !== userId);
    room.status = "finished";
    room.winnerUserId = opponent ? opponent.userId : userId;
    finalizeRoomStats(room);
    updateRoom(room);
    return room;
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
      room.currentChallengeId = DEFAULT_CHALLENGES[0].id;
      room.winnerUserId = null;
      room.rematchRequests = [];
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
        cacheRoomLocally(room);
        return room;
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
          cacheRoomLocally(firebaseRoom);
          return firebaseRoom;
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
      return activeRoom;
    }
    return null;
  }

  async function setPlayerReadyAsync(roomCode, userId, ready) {
    if (firebaseEnabled()) {
      try {
        const room = await window.TechStartFirebaseClient.setPlayerReady(roomCode, userId, ready);
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
      bio: "Perfil temporario para treino offline.",
      language: "JavaScript",
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
      const updatedHistory = [
        {
          id: uid("history"),
          date: now(),
          type: "duel",
          opponent: opponentProfile ? opponentProfile.nick : "Sem adversario",
          result: duelPlayer.userId === room.winnerUserId ? "Vitoria" : "Derrota",
          score: `${duelPlayer.score} x ${opponent ? opponent.score : 0}`,
        },
        ...(profile.history || []),
      ];
      await updateProfileAsync(duelPlayer.userId, {
        history: updatedHistory,
        rankingPoints: (profile.rankingPoints || 0) + (duelPlayer.userId === room.winnerUserId ? 20 : 5),
        duelWins: (profile.duelWins || 0) + (duelPlayer.userId === room.winnerUserId ? 1 : 0),
        duelLosses: (profile.duelLosses || 0) + (duelPlayer.userId === room.winnerUserId ? 0 : 1),
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

        const evaluation = evaluateChallenge(source, room.currentChallengeId);
        const aiFeedback = generateAiFeedback(source, evaluation);
        const player = room.players.find((item) => item.userId === userId);
        if (!player) {
          return { ok: false, message: "Jogador nao encontrado na sala." };
        }

        player.submittedAt = now();
        player.solutionStatus = evaluation.correct ? "correct" : "wrong";
        if (evaluation.correct) {
          player.score += 1;
        }

        const finishedRound = room.players.every((item) => item.solutionStatus !== "pending");
        const correctPlayers = room.players.filter((item) => item.solutionStatus === "correct");
        if (correctPlayers.length) {
          const winner = [...correctPlayers].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))[0];
          room.winnerUserId = winner.userId;
        }

        if (finishedRound && room.currentRound < room.totalRounds) {
          room.currentRound += 1;
          room.currentChallengeId = DEFAULT_CHALLENGES[room.currentRound - 1].id;
          room.timerStartedAt = now();
          room.players.forEach((item) => {
            item.ready = true;
            item.solutionStatus = "pending";
            item.submittedAt = null;
          });
        } else if (finishedRound) {
          room.status = "finished";
          const playerWinner = [...room.players].sort((a, b) => b.score - a.score)[0];
          room.winnerUserId = playerWinner.userId;
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
      cacheRoomLocally(localResult.room);
    }
    return localResult;
  }

  async function giveUpAsync(roomCode, userId) {
    if (firebaseEnabled()) {
      try {
        const room = await getRoomByCodeAsync(roomCode);
        if (!room) {
          return null;
        }
        const opponent = room.players.find((player) => player.userId !== userId);
        room.status = "finished";
        room.winnerUserId = opponent ? opponent.userId : userId;
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
          room.currentChallengeId = DEFAULT_CHALLENGES[0].id;
          room.winnerUserId = null;
          room.rematchRequests = [];
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
    sendChatMessageAsync,
    sendChatMessage,
    getChallengeById,
    previewSolution,
    submitSolutionAsync,
    submitSolution,
    ensureOfflineOpponentAsync,
    giveUpAsync,
    giveUp,
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
    getActiveRoom,
  };
})();

window.TechStartApp = TechStartApp;
