const recoveryForm = document.getElementById("recovery-form");
const feedback = document.getElementById("recovery-feedback");
const popup = document.getElementById("success-popup");
const popupConfirm = document.getElementById("popup-confirm");

recoveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  
  if (!email) {
    feedback.textContent = "Por favor, preencha o e-mail.";
    feedback.classList.remove("success");
    return;
  }

  if (!email.includes("@")) {
    feedback.textContent = "Por favor, digite um e-mail válido.";
    feedback.classList.remove("success");
    return;
  }

  try {
    if (!window.TechStartFirebaseClient || !window.TechStartFirebaseClient.enabled) {
      feedback.textContent = "Firebase não está ativo neste ambiente.";
      feedback.classList.remove("success");
      return;
    }

    await window.TechStartFirebaseClient.auth.sendPasswordResetEmail(email);
    feedback.textContent = "Link de recuperação enviado com sucesso!";
    feedback.classList.add("success");
    popup.classList.remove("hidden");
  } catch (error) {
    feedback.textContent = "Não foi possível enviar o e-mail. Verifique o endereço informado.";
    feedback.classList.remove("success");
  }
});

popupConfirm.addEventListener("click", () => {
  window.location.href = "../../index.html";
});
