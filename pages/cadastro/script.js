TechStartApp.seed();

const registerForm = document.getElementById("register-form");
const feedback = document.getElementById("register-feedback");
const popup = document.getElementById("success-popup");
const popupConfirm = document.getElementById("popup-confirm");

// Elementos dos inputs
const nameInput = document.getElementById("name");
const nickInput = document.getElementById("nick");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");

// Funções de validação
function validatePasswordMatch() {
  const mismatch = confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value;
  feedback.textContent = mismatch ? "As senhas precisam ser iguais." : "";
  feedback.classList.remove("success");
}

function validateForm() {
  let isValid = true;
  let errorMessage = "";

  if (!nameInput.value.trim()) {
    errorMessage = "Por favor, preencha o nome completo.";
    isValid = false;
  } else if (!nickInput.value.trim()) {
    errorMessage = "Por favor, preencha um nick.";
    isValid = false;
  } else if (!emailInput.value.trim()) {
    errorMessage = "Por favor, preencha o e-mail.";
    isValid = false;
  } else if (!emailInput.value.includes("@")) {
    errorMessage = "Por favor, digite um e-mail válido.";
    isValid = false;
  } else if (!passwordInput.value) {
    errorMessage = "Por favor, preencha a senha.";
    isValid = false;
  } else if (passwordInput.value.length < 6) {
    errorMessage = "A senha deve ter no mínimo 6 caracteres.";
    isValid = false;
  } else if (!confirmPasswordInput.value) {
    errorMessage = "Por favor, confirme a senha.";
    isValid = false;
  } else if (passwordInput.value !== confirmPasswordInput.value) {
    errorMessage = "As senhas precisam ser iguais.";
    isValid = false;
  }

  if (!isValid) {
    feedback.textContent = errorMessage;
    feedback.classList.remove("success");
  }

  return isValid;
}

// Listeners para limpar erro ao digitar
nameInput.addEventListener("input", () => {
  if (feedback.textContent) feedback.textContent = "";
});
nickInput.addEventListener("input", () => {
  if (feedback.textContent) feedback.textContent = "";
});
emailInput.addEventListener("input", () => {
  if (feedback.textContent) feedback.textContent = "";
});
passwordInput.addEventListener("input", validatePasswordMatch);
confirmPasswordInput.addEventListener("input", validatePasswordMatch);

// Submit do formulário
registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  const result = await TechStartApp.registerAsync({
    name: nameInput.value,
    nick: nickInput.value,
    email: emailInput.value,
    password: passwordInput.value,
    confirmPassword: confirmPasswordInput.value,
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
