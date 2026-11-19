TechStartApp.seed();

const registerForm = document.getElementById("register-form");
const feedback = document.getElementById("register-feedback");
const popup = document.getElementById("success-popup");
const popupConfirm = document.getElementById("popup-confirm");


const languageInput = document.getElementById("language");
const languageTrigger = document.getElementById("language-trigger");
const languageSelected = document.getElementById("language-selected");
const languageOptions = document.getElementById("language-options");

const linguagensCadastro = [
  {
    nome: "Java",
    cor: "#f89820",
    icone: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg",
    exemplo: `
      <span class="code-class">System</span><span class="code-default">.</span><span class="code-property">out</span><span class="code-default">.</span><span class="code-function">println</span><span class="code-default">(</span><span class="code-string">"Olá, mundo!"</span><span class="code-default">);</span>
    `
  },
  {
    nome: "JavaScript",
    cor: "#f7df1e",
    icone: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg",
    exemplo: `
      <span class="code-object">console</span><span class="code-default">.</span><span class="code-function">log</span><span class="code-default">(</span><span class="code-string">"Olá, mundo!"</span><span class="code-default">);</span>
    `
  },
  {
    nome: "Python",
    cor: "#79b8e8",
    icone: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg",
    exemplo: `
      <span class="code-function">print</span><span class="code-default">(</span><span class="code-string">"Olá, mundo!"</span><span class="code-default">)</span>
    `
  },
  {
    nome: "C#",
    cor: "#a78bfa",
    icone: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/csharp/csharp-original.svg",
    exemplo: `
      <span class="code-class">Console</span><span class="code-default">.</span><span class="code-function">WriteLine</span><span class="code-default">(</span><span class="code-string">"Olá, mundo!"</span><span class="code-default">);</span>
    `
  }
];

languageOptions.innerHTML = linguagensCadastro.map((linguagem) => `
  <button type="button" class="language-select-option" data-language="${linguagem.nome}">
    <span class="language-name" style="color: ${linguagem.cor}">
      ${linguagem.nome}
    </span>
    <code class="language-example">${linguagem.exemplo}</code>
    <img class="language-icon" src="${linguagem.icone}" alt="">
  </button>
`).join("");

function fecharSeletorLinguagem() {
  languageOptions.hidden = true;
  languageTrigger.setAttribute("aria-expanded", "false");
}

languageTrigger.addEventListener("click", () => {
  const abrir = languageOptions.hidden;
  languageOptions.hidden = !abrir;
  languageTrigger.setAttribute("aria-expanded", String(abrir));
});

languageOptions.addEventListener("click", (event) => {
  const opcao = event.target.closest(".language-select-option");

  if (!opcao) return;

  const linguagem = linguagensCadastro.find(
    (item) => item.nome === opcao.dataset.language
  );

  if (!linguagem) return;

  languageInput.value = linguagem.nome;
  languageSelected.textContent = linguagem.nome;
  languageSelected.style.color = linguagem.cor;

  languageInput.dispatchEvent(new Event("change", { bubbles: true }));

  fecharSeletorLinguagem();
  languageTrigger.focus();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".language-select")) {
    fecharSeletorLinguagem();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !languageOptions.hidden) {
    fecharSeletorLinguagem();
    languageTrigger.focus();
  }
});



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
