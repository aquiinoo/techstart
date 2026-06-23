TechStartApp.seed();

const registerForm = document.getElementById("register-form");
const feedback = document.getElementById("register-feedback");
const popup = document.getElementById("success-popup");
const popupConfirm = document.getElementById("popup-confirm");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");

function validatePasswordMatch() {
  const mismatch = confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value;
  confirmPasswordInput.setCustomValidity(mismatch ? "As senhas nao coincidem." : "");
  feedback.textContent = mismatch ? "As senhas precisam ser iguais." : "";
  feedback.classList.remove("success");
}

passwordInput.addEventListener("input", validatePasswordMatch);
confirmPasswordInput.addEventListener("input", validatePasswordMatch);

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  validatePasswordMatch();
  if (!registerForm.reportValidity()) {
    return;
  }

  const result = await TechStartApp.registerAsync({
    name: document.getElementById("name").value,
    nick: document.getElementById("nick").value,
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
    confirmPassword: document.getElementById("confirm-password").value,
    github: document.getElementById("github").value,
    bio: document.getElementById("bio").value,
    language: document.getElementById("language").value,
  });

  if (!result.ok) {
    feedback.textContent = result.message;
    feedback.classList.remove("success");
    return;
  }

  feedback.textContent = "Campos validados e conta criada com sucesso.";
  feedback.classList.add("success");
  popup.classList.remove("hidden");
});

popupConfirm.addEventListener("click", () => {
  window.location.href = "../dashboard/dashboard.html";
});
