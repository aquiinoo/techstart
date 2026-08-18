TechStartApp.seed();

const loginForm = document.getElementById("login-form");
const feedback = document.getElementById("login-feedback");
const popup = document.getElementById("success-popup");
const popupConfirm = document.getElementById("popup-confirm");
const guestLoginButton = document.getElementById("guest-login");
const focusLoginButton = document.getElementById("focus-login");
const userInput = document.getElementById("usuario");
const passwordInput = document.getElementById("senha");
const popupTitle = document.getElementById("popup-title");

// Limpar mensagens de erro quando o usuário digita
userInput.addEventListener("input", () => {
  userInput.setCustomValidity("");
});

passwordInput.addEventListener("input", () => {
  passwordInput.setCustomValidity("");
});

function hidePopupAndRedirect() {
  popup.classList.add("hidden");

  window.location.href =
    "./pages/dashboard/dashboard.html";
}

async function checkExistingSession() {
  try {
    const user = await TechStartApp.getCurrentUserAsync();

    if (user) {
      hidePopupAndRedirect();
    }
  } catch (error) {
    console.error(
      "Erro ao verificar sessão:",
      error
    );
  }
}

checkExistingSession();

function resetFeedback() {
  feedback.textContent = "";
  feedback.classList.remove("success");
  feedback.classList.remove("error");
}

function showFeedback(message, type = "success") {
  feedback.textContent = message;

  feedback.classList.remove("success");
  feedback.classList.remove("error");

  feedback.classList.add(type);
}

function showPopup(customTitle = "Login efetuado com sucesso") {
  if (popupTitle) {
    popupTitle.innerText = customTitle;
  }

  popup.classList.remove("hidden");
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    resetFeedback();

    // Validação manual
    let isValid = true;
    
    if (!userInput.value.trim()) {
      showFeedback("Por favor, preencha o e-mail.", "error");
      isValid = false;
    } else if (!userInput.value.includes("@")) {
      showFeedback("Por favor, digite um e-mail válido.", "error");
      isValid = false;
    }

    if (!passwordInput.value) {
      showFeedback("Por favor, preencha a senha.", "error");
      isValid = false;
    }

    if (!isValid) return;

    try {
      const result = await TechStartApp.loginAsync(
        userInput.value,
        passwordInput.value
      );

      if (!result.ok) {
        showFeedback(
          result.message || "Falha ao realizar login.",
          "error"
        );
        return;
      }

      showFeedback(
        "Credenciais validadas com sucesso.",
        "success"
      );

      showPopup("Login efetuado com sucesso");
    } catch (error) {
      console.error("Erro no login:", error);
      showFeedback(
        "Erro interno ao realizar login.",
        "error"
      );
    }
  });
}

if (guestLoginButton) {
  guestLoginButton.addEventListener("click", async () => {
    resetFeedback();

    try {
      await TechStartApp.loginAsGuestAsync();

      showFeedback(
        "Acesso como convidado liberado.",
        "success"
      );

      showPopup(
        "Acesso como convidado liberado!"
      );
    } catch (error) {
      console.error(
        "Erro ao entrar como convidado:",
        error
      );

      showFeedback(
        "Não foi possível entrar como convidado.",
        "error"
      );
    }
  });
}

if (focusLoginButton) {
  focusLoginButton.addEventListener("click", () => {
    userInput?.focus();
  });
}

if (popupConfirm) {
  popupConfirm.addEventListener(
    "click",
    hidePopupAndRedirect
  );
}

// Criar estrelas
function criarEstrelas() {
  const container = document.getElementById("estrelas-container");
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