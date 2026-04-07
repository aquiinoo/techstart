const recoveryForm = document.getElementById("recovery-form");
const feedback = document.getElementById("recovery-feedback");
const popup = document.getElementById("success-popup");
const popupConfirm = document.getElementById("popup-confirm");

recoveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  if (!email) {
    feedback.textContent = "Informe um email valido para recuperar sua senha.";
    feedback.classList.remove("success");
    return;
  }

  try {
    if (!window.TechStartFirebaseClient || !window.TechStartFirebaseClient.enabled) {
      feedback.textContent = "O Firebase nao esta ativo neste ambiente.";
      feedback.classList.remove("success");
      return;
    }

    await window.TechStartFirebaseClient.auth.sendPasswordResetEmail(email);
    feedback.textContent = "Link de recuperacao enviado com sucesso.";
    feedback.classList.add("success");
    popup.classList.remove("hidden");
  } catch (error) {
    feedback.textContent = "Nao foi possivel enviar o email de recuperacao. Verifique o endereco informado.";
    feedback.classList.remove("success");
  }
});

popupConfirm.addEventListener("click", () => {
  window.location.href = "../../index.html";
});
