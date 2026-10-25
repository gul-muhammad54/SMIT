// ============================================================================
// login.js - Single Login Page for all roles (Admin, HR, Employee)
// ============================================================================
import supabase from "./credential.js";
import Swal from "./alert.js";
import { loginValidation } from "./validation.js";
import { setButtonLoading, restoreButton } from "./common.js";

// DOM elements top par get kar rahe hain
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");

// Check karte hain ke company bani hai ya nahi
const checkCompanySetup = async () => {
  try {
    const { data, error } = await supabase.from("company").select("id").limit(1);
    if (!data || data.length === 0) {
      // Company nahi bani to setup page par bhej dein
      window.location.href = "setup.html";
    }
  } catch (error) {
    console.error("Check company setup error:", error);
  }
};

// Page load hone par check karein
checkCompanySetup();

// Enter key press par login trigger ho
if (passwordInput) {
  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      btnLogin.click();
    }
  });
}

// Login button ka click handler
btnLogin.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Validation function chalate hain
  const isValid = loginValidation(email, password);
  if (!isValid) {
    return; // Validation fail hui to yahin stop ho jao
  }

  // Button loading state me dal rahe hain
  setButtonLoading(btnLogin, "Saving...");

  try {
    // 1. Supabase Auth se login kar rahe hain
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (authError) {
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: authError.message
      });
      return;
    }

    // 2. Profiles table se user ka role aur status check kar rahe hain
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      Swal.fire({
        icon: "error",
        title: "Profile Not Found",
        text: "User profile record does not exist. Please contact admin."
      });
      return;
    }

    // 3. Agar account deactive hai to login rok dein
    if (profile.active === false) {
      await supabase.auth.signOut();
      Swal.fire({
        icon: "error",
        title: "Account Deactivated",
        text: "Your account is deactivated. Please contact your company administrator."
      });
      return;
    }

    // 4. Temporary password change check (must_change flag)
    if (profile.must_change === true) {
      await Swal.fire({
        icon: "info",
        title: "First-time Sign In",
        text: "Please set your new permanent password to continue."
      });
      window.location.href = "change.html";
      return;
    }

    // 5. Successful login -> Dashboard par bhej rahe hain
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Login unexpected error:", error);
    Swal.fire({
      icon: "error",
      title: "Unexpected Error",
      text: error.message || "An unexpected error occurred during login."
    });
  } finally {
    // Button restore kar rahe hain
    restoreButton(btnLogin);
  }
};
