(function () {
  const config = window.TechStartFirebaseConfig;
  const canInit = Boolean(window.firebase && config && config.apiKey && config.projectId && config.appId);

  if (!canInit) {
    window.TechStartFirebaseClient = {
      enabled: false,
    };
    return;
  }

  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const usersCollection = db.collection("users");
  const roomsCollection = db.collection("rooms");
  const helpCollection = db.collection("helpRequests");
  const supportCollection = db.collection("supportMessages");

  function normalizeRoom(room) {
    return room.exists ? room.data() : null;
  }

  async function getUserDoc(uid) {
    const snapshot = await usersCollection.doc(uid).get();
    return snapshot.exists ? snapshot.data() : null;
  }

  async function ensureUserProfile(authUser, extra = {}) {
    const ref = usersCollection.doc(authUser.uid);
    const snapshot = await ref.get();
    const existing = snapshot.exists ? snapshot.data() : {};
    const payload = {
      id: authUser.uid,
      name: extra.name || existing.name || authUser.displayName || "Jogador TechStart",
      nick: extra.nick || existing.nick || authUser.email?.split("@")[0] || `player-${authUser.uid.slice(0, 6)}`,
      email: authUser.email || existing.email || "",
      github: extra.github ?? existing.github ?? "",
      bio: extra.bio ?? existing.bio ?? "",
      language: extra.language || existing.language || "Java",
      connections: existing.connections || [],
      rankingPoints: existing.rankingPoints || 0,
      duelWins: existing.duelWins || 0,
      duelLosses: existing.duelLosses || 0,
      trainingSessions: existing.trainingSessions || 0,
      history: existing.history || [],
      guest: extra.guest ?? existing.guest ?? authUser.isAnonymous ?? false,
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ref.set(payload, { merge: true });
    return payload;
  }

  async function upsertUserProfile(user) {
    const ref = usersCollection.doc(user.id);
    const snapshot = await ref.get();
    const payload = {
      connections: [],
      rankingPoints: 0,
      duelWins: 0,
      duelLosses: 0,
      trainingSessions: 0,
      history: [],
      createdAt: new Date().toISOString(),
      ...snapshot.data(),
      ...user,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(payload, { merge: true });
    return payload;
  }

  function mapAuthError(error) {
    const code = error?.code || "";
    if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
      return "Usuario ou senha incorretos.";
    }
    if (code.includes("email-already-in-use")) {
      return "Ja existe um usuario cadastrado com este email.";
    }
    if (code.includes("weak-password")) {
      return "A senha precisa ter pelo menos 6 caracteres.";
    }
    if (code.includes("invalid-email")) {
      return "Email invalido.";
    }
    if (code.includes("operation-not-allowed")) {
      return "Ative o metodo correspondente no Firebase Authentication.";
    }
    return error?.message || "Nao foi possivel concluir a operacao no Firebase.";
  }

  async function getCurrentUser() {
    const authUser = auth.currentUser;
    if (!authUser) {
      return null;
    }
    return ensureUserProfile(authUser);
  }

  function waitForAuth() {
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(async () => {
        unsubscribe();
        resolve(await getCurrentUser());
      });
    });
  }

  async function register(data) {
    if (String(data.password || "") !== String(data.confirmPassword || "")) {
      return { ok: false, message: "As senhas nao coincidem." };
    }
    try {
      const credential = await auth.createUserWithEmailAndPassword(data.email, data.password);
      if (data.name) {
        await credential.user.updateProfile({ displayName: data.name });
      }
      const user = await ensureUserProfile(credential.user, data);
      return { ok: true, user };
    } catch (error) {
      return { ok: false, message: mapAuthError(error) };
    }
  }

  async function login(email, password) {
    try {
      const credential = await auth.signInWithEmailAndPassword(email, password);
      const user = await ensureUserProfile(credential.user);
      return { ok: true, user };
    } catch (error) {
      return { ok: false, message: mapAuthError(error) };
    }
  }

  async function loginAsGuest() {
    const credential = await auth.signInAnonymously();
    return ensureUserProfile(credential.user, {
      name: "Convidado TechStart",
      nick: `guest-${credential.user.uid.slice(0, 5)}`,
      guest: true,
    });
  }

  async function logout() {
    await auth.signOut();
  }

  async function getUsers() {
    const snapshot = await usersCollection.get();
    return snapshot.docs.map((doc) => doc.data());
  }

  async function updateProfile(userId, changes) {
    const ref = usersCollection.doc(userId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return null;
    }
    const updated = {
      ...snapshot.data(),
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(updated, { merge: true });
    if (auth.currentUser && auth.currentUser.uid === userId && changes.name) {
      await auth.currentUser.updateProfile({ displayName: changes.name });
    }
    return updated;
  }

  async function connectUsers(currentUserId, targetUserId) {
    const currentRef = usersCollection.doc(currentUserId);
    const targetRef = usersCollection.doc(targetUserId);
    const [currentSnapshot, targetSnapshot] = await Promise.all([currentRef.get(), targetRef.get()]);
    if (!currentSnapshot.exists || !targetSnapshot.exists) {
      return null;
    }
    const current = currentSnapshot.data();
    const target = targetSnapshot.data();
    current.connections = [...new Set([...(current.connections || []), targetUserId])];
    target.connections = [...new Set([...(target.connections || []), currentUserId])];
    await Promise.all([currentRef.set(current, { merge: true }), targetRef.set(target, { merge: true })]);
    return current;
  }

  async function createRoom(ownerUserId, language) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const room = {
      id: code,
      code,
      language: language || "Java",
      players: [
        {
          userId: ownerUserId,
          ready: false,
          score: 0,
          submittedAt: null,
          solutionStatus: "pending",
          lastSeenAt: null,
          presenceStatus: "offline",
        },
      ],
      chat: [],
      status: "waiting",
      currentRound: 1,
      totalRounds: 3,
      currentChallengeId: window.TechStartChallenges?.[0]?.id || "java-soma",
      createdAt: new Date().toISOString(),
      winnerUserId: null,
      rematchRequests: [],
      helpRequests: [],
      timerStartedAt: null,
      countdownStartedAt: null,
      roundDurationSeconds: 300,
      readyCountdownSeconds: 5,
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
    await roomsCollection.doc(code).set(room);
    return room;
  }

  async function getRoomByCode(code) {
    const snapshot = await roomsCollection.doc(String(code || "").toUpperCase()).get();
    return normalizeRoom(snapshot);
  }

  async function updateRoom(room) {
    await roomsCollection.doc(room.code).set(room, { merge: true });
    return room;
  }

  async function joinRoomByCode(code, userId) {
    const room = await getRoomByCode(code);
    if (!room) {
      return { ok: false, message: "Sala nao encontrada." };
    }
    if (room.players.some((player) => player.userId === userId)) {
      return { ok: true, room };
    }
    if (room.players.length >= 2) {
      return { ok: false, message: "Esta sala ja esta cheia." };
    }
    room.players.push({
      userId,
      ready: false,
      score: 0,
      submittedAt: null,
      solutionStatus: "pending",
      lastSeenAt: null,
      presenceStatus: "offline",
    });
    room.status = "lobby";
    await updateRoom(room);
    return { ok: true, room };
  }

  async function setPlayerReady(roomCode, userId, ready) {
    const room = await getRoomByCode(roomCode);
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
    if (room.players.length === 2 && room.players.every((item) => item.ready)) {
      room.status = "countdown";
      room.countdownStartedAt = room.countdownStartedAt || new Date().toISOString();
      room.timerStartedAt = null;
    }
    await updateRoom(room);
    return room;
  }

  async function sendChatMessage(roomCode, userId, message) {
    const room = await getRoomByCode(roomCode);
    if (!room) {
      return null;
    }
    room.chat.push({
      id: `chat_${Math.random().toString(36).slice(2, 10)}`,
      userId,
      message: String(message || "").trim(),
      createdAt: new Date().toISOString(),
    });
    await updateRoom(room);
    return room;
  }

  async function saveHelpRequest(request) {
    await helpCollection.doc(request.id).set(request);
    return request;
  }

  async function getHelpRequests() {
    const snapshot = await helpCollection.get();
    return snapshot.docs.map((doc) => doc.data());
  }

  async function acceptHelpRequest(requestId, helperUserId) {
    const ref = helpCollection.doc(requestId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return null;
    }
    const updated = {
      ...snapshot.data(),
      helperUserId,
      status: "accepted",
    };
    await ref.set(updated, { merge: true });
    return updated;
  }

  async function saveSupportMessage(message) {
    await supportCollection.doc(message.id).set(message);
    return message;
  }

  window.TechStartFirebaseClient = {
    enabled: true,
    app,
    auth,
    db,
    waitForAuth,
    getCurrentUser,
    register,
    login,
    loginAsGuest,
    logout,
    getUsers,
    upsertUserProfile,
    updateProfile,
    connectUsers,
    createRoom,
    getRoomByCode,
    updateRoom,
    joinRoomByCode,
    setPlayerReady,
    sendChatMessage,
    saveHelpRequest,
    getHelpRequests,
    acceptHelpRequest,
    saveSupportMessage,
  };

  window.TechStartFirebase.enabled = true;
  window.TechStartFirebase.status = "Firebase Auth e Firestore carregados no navegador.";
})();
