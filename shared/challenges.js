(function () {
  const scriptUrl = document.currentScript ? document.currentScript.src : "";
  const fallbackChallenges = [
    {
      id: "java-soma",
      title: "Soma de dois numeros",
      language: "Java",
      difficulty: "Iniciante",
      description: "Crie um metodo chamado soma que receba dois inteiros e retorne a soma deles.",
      starter: "public class Solution {\n  public static int soma(int a, int b) {\n    \n  }\n}",
      methodName: "soma",
      requiredPatterns: ["public static int soma", "return", "+"],
      tests: [{ call: "soma(2, 3)", expected: "5" }],
      hints: ["Retorne a + b."],
    },
  ];

  async function loadChallenges() {
    if (Array.isArray(window.TechStartChallenges) && window.TechStartChallenges.length > 1) {
      return window.TechStartChallenges;
    }

    try {
      const catalogUrl = new URL("challenges.json", scriptUrl || window.location.href);
      const response = await fetch(catalogUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Catalogo indisponivel.");
      }
      const challenges = await response.json();
      window.TechStartChallenges = challenges;
      return challenges;
    } catch (error) {
      console.warn("Nao foi possivel carregar shared/challenges.json. Usando fallback minimo.", error);
      window.TechStartChallenges = fallbackChallenges;
      return fallbackChallenges;
    }
  }

  window.TechStartChallenges = window.TechStartChallenges || [];
  window.TechStartChallengesLoader = loadChallenges();
})();
