// ============================================================================
// reset.js - Password Reset Callback Controller
// ============================================================================
import supabase from "./credential.js";
import Swal from "./alert.js";
import { changePasswordValidation } from "./validation.js";
import { setButtonLoading, restoreButton } from "./common.js";

// DOM elements
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const btnReset = document.getElementById("btnReset");

// Enter key submit
if (confirmPasswordInput) {
  confirmPasswordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      btnReset.click();
    }
  });
}

// Reset password button click
btnReset.onclick = async () => {
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  const isValid = changePasswordValidation(newPassword, confirmPassword);
  if (!isValid) return;

  setButtonLoading(btnReset, "Saving...");

  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      Swal.fire({ icon: "error", title: "Reset Failed", text: error.message });
      return;
    }

    // Set must_change to false
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      await supabase.from("profiles").update({
        must_change: false,
        updated_at: new Date().toISOString()
      }).eq("id", session.user.id);
    }

    await Swal.fire({
      icon: "success",
      title: "Password Updated!",
      text: "Your password has been reset. Please sign in with your new credentials."
    });

    await supabase.auth.signOut();
    window.location.href = "login.html";
  } catch (error) {
    console.error("Reset error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  } finally {
    restoreButton(btnReset);
  }
};
