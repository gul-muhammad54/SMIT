import supabase from "./credential.js";
import { validation } from "./validation.js";

// ================= Get elements =================
const newPassword = document.getElementById("newPassword");
const confirmNewPassword = document.getElementById("confirmNewPassword");
const resetBtn = document.getElementById("resetBtn");
const goToLogin = document.getElementById("goToLogin");

// ================= Reset password =================
resetBtn.onclick = async () => {
  // click hote hi button ka text badlo aur disable kar do
  resetBtn.innerHTML = "Resetting...";
  resetBtn.disabled = true;

  const validateForm = validation(false, false, newPassword.value, confirmNewPassword.value);

  // validation false hui to button wapis theek karo aur yahin ruk jao
  if (validateForm === false) {
    resetBtn.innerHTML = "Reset password";
    resetBtn.disabled = false;
    return;
  }

  try {
    // Email wale link se aaye hain to Supabase ne khud session bana diya hota hai,
    // is liye sirf naya password dena hai.
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword.value,
    });

    console.log("data", data);

    // Supabase apni errors (jaise "Auth session missing!" ya purana password hi dobara dena)
    // throw nahi karta, try ke andar hi { error } me deta hai. Is liye yahan khud check karo.
    if (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.message,
      });
    } else {
      await Swal.fire({
        icon: "success",
        title: "Password updated",
        text: "Please log in with your new password",
      });
      window.location.href = "login.html";
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
  resetBtn.innerHTML = "Reset password";
  resetBtn.disabled = false;
};

// ================= Navigation =================
goToLogin.onclick = (e) => {
  e.preventDefault();
  window.location.href = "login.html";
};