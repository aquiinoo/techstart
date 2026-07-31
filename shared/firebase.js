(function () {
  const config = window.TechStartFirebaseConfig || null;
  const configured = Boolean(
    config &&
      config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.appId
  );

  window.TechStartFirebase = {
    enabled: configured,
    configured,
    status: configured
      ? "Firebase configurado no front-end. O proximo passo e conectar Auth e Firestore com as credenciais reais do projeto."
      : "Firebase ainda nao esta configurado. O sistema esta usando localStorage como fallback local.",
    configExample: {
      apiKey: "SUA_API_KEY",
      authDomain: "seu-projeto.firebaseapp.com",
      projectId: "seu-projeto",
      storageBucket: "seu-projeto.appspot.com",
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:seuappid",
    },
  };
})();
