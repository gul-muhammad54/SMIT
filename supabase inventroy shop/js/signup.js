import supabase from "./credential.js";
import { validation } from "./validation.js";

console.log(supabase);

// ================= Get elements =================
const signupName = document.getElementById("signupName");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupConfirm = document.getElementById("signupConfirm");
const signupBtn = document.getElementById("signupBtn");
const goToLogin = document.getElementById("goToLogin");

// ================= Signup =================
signupBtn.onclick = async () => {
  // click hote hi button ka text badlo aur disable kar do
  signupBtn.innerHTML = "Signing up...";
  signupBtn.disabled = true;

  const validateForm = validation(
    signupName.value,
    signupEmail.value,
    signupPassword.value,
    signupConfirm.value,
  );

  // validation false hui to button wapis theek karo aur yahin ruk jao
  if (validateForm === false) {
    signupBtn.innerHTML = "Sign up";
    signupBtn.disabled = false;
    return;
  }

  // NOTE: "email rate limit exceeded" error
  // Supabase ki free built-in email service ek ghante mein sirf 2 emails bhejti hai.
  // Har signUp par confirmation email jati hai, is liye 2-3 signup ke baad ye error aata hai.
  // Testing ke liye: Dashboard -> Authentication -> Sign In / Providers -> Email -> "Confirm email" off kar dein.
  // Real app ke liye: Authentication -> SMTP Settings mein apna SMTP (jaise Resend) lagayein aur Confirm email on rakhein.
  try {
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail.value,
      password: signupPassword.value,
    });

    console.log("data", data);

    // Supabase apni errors (jaise "User already registered") throw nahi karta,
    // try ke andar hi { error } me wapis deta hai. Is liye catch tak nahi pohonchti,
    // yahan khud check karna parta hai.
    if (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.message,
      });
    } else if (data.user && data.user.identities.length === 0) {
      // "Confirm email" on ho to same email dobara signup karne par error nahi aata,
      // bas user ki identities khali [] aati hain. Isi se pata chalta hai ke user pehle se hai.
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "This email is already registered",
      });
    } else {
      Swal.fire({
        icon: "success",
        title: "Account created",
        text: "Please check your email to confirm your account",
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
  signupBtn.innerHTML = "Sign up";
  signupBtn.disabled = false;

  // window.location.href = "login.html";
};

// ================= Navigation =================
goToLogin.onclick = (e) => {
  e.preventDefault();
  window.location.href = "login.html";
};