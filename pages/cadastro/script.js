TechStartApp.seed();

const registerForm = document.getElementById("register-form");
const feedback = document.getElementById("register-feedback");
const popup = document.getElementById("success-popup");
const popupConfirm = document.getElementById("popup-confirm");

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

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
