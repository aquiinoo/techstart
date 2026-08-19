async function loadAiConfig() {
    const client = window.TechStartFirebaseClient;

    if (!client || !client.enabled || !client.db) {
        throw new Error("Firebase ainda não está pronto/configurado.");
    }

    const doc = await client.db.collection("config").doc("ai").get();

    if (!doc.exists) {
        throw new Error("Documento config/ai não encontrado.");
    }

    window.TechStartGeminiApiKey = doc.data().apiKey;

    console.log("Configuração da IA carregada.");
}

window.TechStartAiConfigReady = loadAiConfig().catch((error) => {
    console.error("Erro ao carregar configuração da IA:", error);
    throw error;
});