// Fundo animado (estrelas + blocos de codigo) para paginas que tem os containers
// #estrelas-container e #codigos-container mas nenhum script que os preencha.
(function () {
  function criarEstrelas() {
    const container = document.getElementById("estrelas-container");
    if (!container || container.childElementCount) return;
    for (let i = 0; i < 50; i++) {
      const estrela = document.createElement("div");
      estrela.className = "estrela";
      estrela.style.left = Math.random() * 100 + "%";
      estrela.style.top = Math.random() * 100 + "%";
      estrela.style.animationDelay = Math.random() * 3 + "s";
      container.appendChild(estrela);
    }
  }

  function criarCodigos() {
    const container = document.getElementById("codigos-container");
    if (!container || container.childElementCount) return;
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

  function iniciar() {
    criarEstrelas();
    criarCodigos();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
