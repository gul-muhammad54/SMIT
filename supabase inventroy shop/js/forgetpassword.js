import supabase from "./credential.js";
import { validation } from "./validation.js";

// ================= Get elements =================
const forgotEmail = document.getElementById("forgotEmail");
const sendCodeBtn = document.getElementById("sendCodeBtn");
const goToLogin = document.getElementById("goToLogin");

// ================= Send code =================
sendCodeBtn.onclick = async () => {
  // click hote hi button ka text badlo aur disable kar do
  sendCodeBtn.innerHTML = "Sending...";
  sendCodeBtn.disabled = true;

  const validateForm = validation(false, forgotEmail.value, false, false);

  // validation false hui to button wapis theek karo aur yahin ruk jao
  if (validateForm === false) {
    sendCodeBtn.innerHTML = "Send code";
    sendCodeBtn.disabled = false;
    return;
  }

  try {
    // Email me ek link jata hai, us par click karne se user reset-password.html par aata hai.
    // NOTE: ye URL Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs
    // me add hona chahiye, warna link Site URL par chala jata hai.
    const { data, error } = await supabase.auth.resetPasswordForEmail(forgotEmail.value, {
      redirectTo: new URL("reset-password.html", window.location.href).href,
    });

    console.log("data", data);

    // Supabase apni errors (jaise "email rate limit exceeded") throw nahi karta,
    // try ke andar hi { error } me deta hai. Is liye yahan khud check karo.
    // Note: jo email registered hi nahi, us par bhi error nahi aata (security ke liye).
    if (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.message,
      });
    } else {
      Swal.fire({
        icon: "success",
        title: "Email sent",
        text: "Please check your email for the reset link",
      });
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
  sendCodeBtn.innerHTML = "Send code";
  sendCodeBtn.disabled = false;
};

// ================= Navigation =================
goToLogin.onclick = (e) => {
  e.preventDefault();
  window.location.href = "login.html";
};