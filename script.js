TechStartApp.seed();

const loginForm = document.getElementById("login-form");
const feedback = document.getElementById("login-feedback");
const popup = document.getElementById("success-popup");
const popupConfirm = document.getElementById("popup-confirm");
const guestLoginButton = document.getElementById("guest-login");
const focusLoginButton = document.getElementById("focus-login");
const userInput = document.getElementById("usuario");
const popupTitle = document.getElementById("popup-title");


function hidePopupAndRedirect() {
  window.location.href = "./pages/dashboard/dashboard.html";
}

TechStartApp.getCurrentUserAsync().then((user) => {
  if (user) {
    hidePopupAndRedirect();
  }
});

// 1. Modifique a função showPopup para aceitar um título opcional
function showPopup(tituloCustomizado) {
  console.log("Título recebido:", tituloCustomizado);
  if (tituloCustomizado) {
    popupTitle.innerText = tituloCustomizado;
  }
  popup.classList.remove("hidden");
}

// 2. No evento de Formulário (Login Real), passe o título de sucesso padrão
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const result = await TechStartApp.loginAsync(userInput.value, document.getElementById("senha").value);

  if (!result.ok) {
    feedback.textContent = result.message;
    feedback.classList.remove("success");
    return;
  }

  feedback.textContent = "Credenciais validadas com sucesso.";
  feedback.classList.add("success");
  showPopup("Login efetuado com sucesso"); // Texto para login real
});

// 3. No evento de Convidado, passe o novo texto
guestLoginButton.addEventListener("click", async () => {
  await TechStartApp.loginAsGuestAsync();
  feedback.textContent = "Acesso como convidado liberado.";
  feedback.classList.add("success");
  showPopup("Acesso como convidado liberado"); // Texto para convidado
});


focusLoginButton.addEventListener("click", () => userInput.focus());
popupConfirm.addEventListener("click", hidePopupAndRedirect);
