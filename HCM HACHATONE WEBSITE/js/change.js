// ============================================================================
// change.js - Change Password (First-time sign in or password reset)
// ============================================================================
import supabase from "./credential.js";
import Swal from "./alert.js";
import { changePasswordValidation } from "./validation.js";
import { setButtonLoading, restoreButton, logout } from "./common.js";

// DOM elements top par get kar rahe hain
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const btnChangePassword = document.getElementById("btnChangePassword");
const btnLogout = document.getElementById("btnLogout");

// User session check kar rahe hain
const initChangePassword = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      window.location.href = "login.html";
    }
  } catch (error) {
    console.error("Session check error in change.js:", error);
    window.location.href = "login.html";
  }
};

// Page load hone par session verify karein
initChangePassword();

// Logout button click handler
if (btnLogout) {
  btnLogout.onclick = async () => {
    await logout();
  };
}

// Enter key par bhi save trigger ho
if (confirmPasswordInput) {
  confirmPasswordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      btnChangePassword.click();
    }
  });
}

// Save password button click handler
btnChangePassword.onclick = async () => {
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // Validation function chalate hain
  const isValid = changePasswordValidation(newPassword, confirmPassword);
  if (!isValid) {
    return; // Validation fail hui to yahin stop ho jao
  }

  // Button loading state me dal rahe hain
  setButtonLoading(btnChangePassword, "Saving...");

  try {
    // 1. Supabase Auth me user ka password update kar rahe hain
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Password Update Failed",
        text: error.message
      });
      return;
    }

    // 2. Profiles table me must_change flag ko false kar rahe hain
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ must_change: false, updated_at: new Date().toISOString() })
        .eq("id", session.user.id);

      if (profileError) {
        console.error("Could not update must_change flag:", profileError.message);
      }
    }

    // 3. Success message show karke dashboard par bhej rahe hain
    await Swal.fire({
      icon: "success",
      title: "Password Changed!",
      text: "Your new password has been set successfully."
    });

    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Change password unexpected error:", error);
    Swal.fire({
      icon: "error",
      title: "Unexpected Error",
      text: error.message || "An unexpected error occurred while changing password."
    });
  } finally {
    // Button restore kar rahe hain
    restoreButton(btnChangePassword);
  }
};
