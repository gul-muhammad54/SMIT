// ============================================================================
// forget.js - Account Password Recovery Controller
// ============================================================================
import supabase from "./credential.js";
import Swal from "./alert.js";
import { setButtonLoading, restoreButton } from "./common.js";

// DOM elements
const emailInput = document.getElementById("email");
const btnForget = document.getElementById("btnForget");

// Enter key submit
if (emailInput) {
  emailInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      btnForget.click();
    }
  });
}

// Send reset link click handler
btnForget.onclick = async () => {
  const email = emailInput.value.trim();

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!email || !emailRegex.test(email)) {
    Swal.fire({ icon: "warning", title: "Validation Error", text: "Please enter a valid work email." });
    return;
  }

  setButtonLoading(btnForget, "Sending...");

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset.html"
    });

    if (error) {
      Swal.fire({ icon: "error", title: "Reset Error", text: error.message });
      return;
    }

    Swal.fire({
      icon: "success",
      title: "Reset Link Sent",
      text: `Password reset instructions have been dispatched to ${email}.`
    });

    emailInput.value = "";
  } catch (error) {
    console.error("Forget password error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  } finally {
    restoreButton(btnForget);
  }
};
