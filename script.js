TechStartApp.seed();

const loginForm = document.getElementById("login-form");
const feedback = document.getElementById("login-feedback");
const popup = document.getElementById("success-popup");
const popupConfirm = document.getElementById("popup-confirm");
const guestLoginButton = document.getElementById("guest-login");
const focusLoginButton = document.getElementById("focus-login");
const userInput = document.getElementById("usuario");

function showPopup() {
  popup.classList.remove("hidden");
}

function hidePopupAndRedirect() {
  window.location.href = "./pages/dashboard/dashboard.html";
}

TechStartApp.getCurrentUserAsync().then((user) => {
  if (user) {
    hidePopupAndRedirect();
  }
});

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
  showPopup();
});

guestLoginButton.addEventListener("click", async () => {
  await TechStartApp.loginAsGuestAsync();
  feedback.textContent = "Acesso como convidado liberado.";
  feedback.classList.add("success");
  showPopup();
});

focusLoginButton.addEventListener("click", () => userInput.focus());
popupConfirm.addEventListener("click", hidePopupAndRedirect);
