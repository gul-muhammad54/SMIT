// ============================================================================
// setup.js - First Run Setup (Company + Admin Account)
// ============================================================================
import supabase from "./credential.js";
import Swal from "./alert.js";
import { setupValidation } from "./validation.js";
import { setButtonLoading, restoreButton } from "./common.js";

// DOM elements ko top par get kar rahe hain
const companyNameInput = document.getElementById("companyName");
const adminNameInput = document.getElementById("adminName");
const adminEmailInput = document.getElementById("adminEmail");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const btnSetup = document.getElementById("btnSetup");

// Agar company pehle se bani hui hai to setup par nahi jane dena
const checkCompanyExists = async () => {
  try {
    const { data, error } = await supabase.from("company").select("id").limit(1);
    if (data && data.length > 0) {
      window.location.href = "login.html";
    }
  } catch (error) {
    console.error("Check company setup error:", error);
  }
};

// Page load hone par check karein
checkCompanyExists();

// Enter key press par setup trigger ho
if (confirmPasswordInput) {
  confirmPasswordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      btnSetup.click();
    }
  });
}

// Setup button ka click event
btnSetup.onclick = async () => {
  const companyName = companyNameInput.value.trim();
  const adminName = adminNameInput.value.trim();
  const adminEmail = adminEmailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // Validation function chalate hain
  const isValid = setupValidation(companyName, adminName, adminEmail, password, confirmPassword);
  if (!isValid) {
    return; // Validation fail hui to yahin stop ho jao
  }

  // Button ko saving state me dal rahe hain
  setButtonLoading(btnSetup, "Saving...");

  try {
    // 1. Supabase auth me admin account sign up karte hain
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: adminEmail,
      password: password
    });

    if (authError) {
      Swal.fire({
        icon: "error",
        title: "Account Creation Failed",
        text: authError.message
      });
      return;
    }

    if (!authData.user) {
      Swal.fire({
        icon: "error",
        title: "User Error",
        text: "Could not create user account. Please check Supabase Auth settings."
      });
      return;
    }

    const adminUserId = authData.user.id;

    // 2. Profiles table me admin profile insert kar rahe hain
    const { error: profileError } = await supabase.from("profiles").insert({
      id: adminUserId,
      name: adminName,
      email: adminEmail,
      role: "admin",
      must_change: false,
      active: true
    });

    if (profileError) {
      Swal.fire({
        icon: "error",
        title: "Profile Creation Failed",
        text: profileError.message
      });
      return;
    }

    // 3. Company record insert kar rahe hain
    const { error: companyError } = await supabase.from("company").insert({
      id: 1,
      name: companyName,
      office_start: "09:00",
      grace_min: 15,
      halfday_hours: 5,
      weekend_days: ["Saturday", "Sunday"],
      radius: 150
    });

    if (companyError) {
      Swal.fire({
        icon: "error",
        title: "Company Creation Failed",
        text: companyError.message
      });
      return;
    }

    // 4. Default leave types insert kar rahe hain (Annual 14, Sick 8, Casual 10, Unpaid unlimited)
    const { error: leaveTypesError } = await supabase.from("leave_types").insert([
      { name: "Annual", quota: 14 },
      { name: "Sick", quota: 8 },
      { name: "Casual", quota: 10 },
      { name: "Unpaid", quota: null }
    ]);

    if (leaveTypesError) {
      console.warn("Default leave types warning:", leaveTypesError.message);
    }

    // 5. Initial audit log record add karte hain
    try {
      await supabase.from("audit_log").insert({
        actor_id: adminUserId,
        actor_name: adminName,
        action: "INITIAL_SETUP",
        entity: "company",
        after_data: { company_name: companyName, admin_email: adminEmail }
      });
    } catch (auditErr) {
      console.warn("Audit log notice:", auditErr.message);
    }

    // 6. Sign out karke login page par bhejte hain
    await supabase.auth.signOut();

    await Swal.fire({
      icon: "success",
      title: "Company Setup Completed!",
      text: "Company and Admin account created successfully. Please login to continue."
    });

    window.location.href = "login.html";
  } catch (error) {
    console.error("Setup unexpected error:", error);
    Swal.fire({
      icon: "error",
      title: "Unexpected Error",
      text: error.message || "An error occurred during setup."
    });
  } finally {
    // Button ko wapis restore kar rahe hain
    restoreButton(btnSetup);
  }
};
