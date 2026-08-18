// Busca a chave do Firestore
async function loadAiConfig() {
    const doc = await db.collection('config').doc('ai').get();

    if (doc.exists) {
        window.TechStartAiFeedbackEndpoint = doc.data().apiKey;
        console.log("API Key carregada.");
    } else {
        console.error("Documento config/ai não encontrado.");
    }
}

// Testa a API do Gemini
async function testAI() {
    const apiKey = window.TechStartAiFeedbackEndpoint;

    if (!apiKey) {
        console.error("API Key não foi carregada.");
        return;
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
                                    text: "Responda apenas: API funcionando!"
                                }
                            ]
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        console.log("Resposta completa:", data);

        if (data.candidates) {
            console.log(
                "Texto da IA:",
                data.candidates[0].content.parts[0].text
            );
        } else {
            console.error("Erro da API:", data);
        }

    } catch (error) {
        console.error("Erro ao chamar a IA:", error);
    }
}

// Primeiro carrega a chave, depois testa a API
loadAiConfig().then(() => {
    testAI();
});