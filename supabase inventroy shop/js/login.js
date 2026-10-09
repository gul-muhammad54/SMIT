import supabase from "./credential.js";
import { validation } from "./validation.js";

// ================= Get elements =================
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const goToSignup = document.getElementById("goToSignup");
const goToForgot = document.getElementById("goToForgot");

// ================= Login =================
loginBtn.onclick = async () => {
  // click hote hi button ka text badlo aur disable kar do
  loginBtn.innerHTML = "Logging in...";
  loginBtn.disabled = true;

  const validateForm = validation(false, loginEmail.value, loginPassword.value, false);

  // validation false hui to button wapis theek karo aur yahin ruk jao
  if (validateForm === false) {
    loginBtn.innerHTML = "Log in";
    loginBtn.disabled = false;
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.value,
      password: loginPassword.value,
    });

    console.log("data", data);

    // Supabase apni errors (jaise "Invalid login credentials", "Email not confirmed")
    // throw nahi karta, try ke andar hi { error } me deta hai. Is liye yahan khud check karo.
    if (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.message,
      });
    } else {
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    // catch me sirf wo errors aati hain jo throw hon, jaise internet band ho
    console.log("catch error", err);
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: err.message,
    });
  }

  // function ke akhir me button wapis theek
  loginBtn.innerHTML = "Log in";
  loginBtn.disabled = false;
};

// ================= Navigation =================
goToSignup.onclick = (e) => {
  e.preventDefault();
  window.location.href = "signup.html";
};

goToForgot.onclick = (e) => {
  e.preventDefault();
  window.location.href = "forgot-password.html";
};