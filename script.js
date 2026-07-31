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
        "Acesso como convidado liberado"
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