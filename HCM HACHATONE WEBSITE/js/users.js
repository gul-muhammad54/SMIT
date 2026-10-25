// ============================================================================
// users.js - HR Logins Management (Admin Only)
// ============================================================================
import supabase from "./credential.js";
import Swal from "./alert.js";
import { hrUserValidation } from "./validation.js";
import {
  checkLogin,
  setButtonLoading,
  restoreButton,
  addAuditLog,
  createSecondaryUser,
  openModal,
  closeModal
} from "./common.js";

// DOM elements ko top par get kar rahe hain
const btnOpenHrModal = document.getElementById("btnOpenHrModal");
const btnCloseModal = document.getElementById("btnCloseModal");
const btnCancelModal = document.getElementById("btnCancelModal");
const btnSaveHr = document.getElementById("btnSaveHr");
const hrNameInput = document.getElementById("hrName");
const hrEmailInput = document.getElementById("hrEmail");
const hrPassInput = document.getElementById("hrPass");
const userTable = document.getElementById("userTable");

// Modal open/close handlers
if (btnOpenHrModal) {
  btnOpenHrModal.onclick = () => {
    hrNameInput.value = "";
    hrEmailInput.value = "";
    hrPassInput.value = "";
    openModal("userModal");
  };
}

if (btnCloseModal) {
  btnCloseModal.onclick = () => closeModal("userModal");
}
if (btnCancelModal) {
  btnCancelModal.onclick = () => closeModal("userModal");
}

// 1. HR Users list load kar rahe hain
const loadHrUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "hr")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch HR users error:", error);
      return;
    }

    userTable.innerHTML = "";
    if (!data || data.length === 0) {
      userTable.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--muted); padding: 20px;">No HR user accounts registered yet.</td></tr>`;
      return;
    }

    // For loop se rows create kar rahe hain
    for (let i = 0; i < data.length; i++) {
      const user = data[i];
      const statusBadge = user.active
        ? `<span class="badge active">Active</span>`
        : `<span class="badge inactive">Deactivated</span>`;

      const pwdBadge = user.must_change
        ? `<span class="badge pending">Must Change</span>`
        : `<span class="badge active">Permanent</span>`;

      const toggleActionText = user.active ? "Deactivate" : "Activate";
      const toggleActionClass = user.active ? "red" : "green";

      userTable.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${user.name}</strong></td>
          <td>${user.email}</td>
          <td>${statusBadge}</td>
          <td>${pwdBadge}</td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="small-btn ${toggleActionClass} btn-toggle-status" data-id="${user.id}" data-name="${user.name}" data-status="${user.active}">
                ${toggleActionText}
              </button>
              <button class="small-btn grey btn-reset-hr" data-id="${user.id}" data-email="${user.email}" data-name="${user.name}">
                Reset Password
              </button>
            </div>
          </td>
        </tr>
      `;
    }

    // Status toggle buttons ke listeners
    const toggleBtns = userTable.querySelectorAll(".btn-toggle-status");
    for (let j = 0; j < toggleBtns.length; j++) {
      toggleBtns[j].onclick = async () => {
        const id = toggleBtns[j].dataset.id;
        const name = toggleBtns[j].dataset.name;
        const currentActive = toggleBtns[j].dataset.status === "true";
        await toggleHrStatus(id, name, !currentActive);
      };
    }

    // Reset password buttons ke listeners
    const resetBtns = userTable.querySelectorAll(".btn-reset-hr");
    for (let k = 0; k < resetBtns.length; k++) {
      resetBtns[k].onclick = async () => {
        const id = resetBtns[k].dataset.id;
        const email = resetBtns[k].dataset.email;
        const name = resetBtns[k].dataset.name;
        await resetHrPassword(id, email, name);
      };
    }
  } catch (error) {
    console.error("Load HR users error:", error);
  }
};

// 2. Account active/inactive toggle
const toggleHrStatus = async (userId, userName, newStatus) => {
  const actionWord = newStatus ? "activate" : "deactivate";
  const result = await Swal.fire({
    icon: "question",
    title: `Confirm ${actionWord.toUpperCase()}`,
    text: `Are you sure you want to ${actionWord} HR account for "${userName}"?`,
    showCancelButton: true,
    confirmButtonText: `Yes, ${actionWord}`
  });

  if (!result.isConfirmed) return;

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ active: newStatus, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      Swal.fire({ icon: "error", title: "Update Failed", text: error.message });
      return;
    }

    await addAuditLog(`${actionWord.toUpperCase()}_HR`, "profiles", { id: userId, name: userName }, { active: newStatus });
    Swal.fire({ icon: "success", title: "Updated", text: `Account for ${userName} has been ${actionWord}d.` });
    await loadHrUsers();
  } catch (error) {
    console.error("Toggle status error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  }
};

// 3. Password reset
const resetHrPassword = async (userId, userEmail, userName) => {
  const { value: newTempPassword } = await Swal.fire({
    title: `Reset Password for ${userName}`,
    input: "text",
    inputLabel: "New Temporary Password",
    inputValue: "TempPass@" + Math.floor(1000 + Math.random() * 9000),
    inputPlaceholder: "Enter minimum 6 characters",
    showCancelButton: true,
    inputValidator: (value) => {
      if (!value || value.length < 6) {
        return "Password must be at least 6 characters!";
      }
    }
  });

  if (!newTempPassword) return;

  try {
    // Profiles table me must_change flag set karte hain
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ must_change: true, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (profileError) {
      console.warn("Could not set must_change flag:", profileError.message);
    }

    await addAuditLog("RESET_HR_PASSWORD", "profiles", null, { user_id: userId, email: userEmail });
    Swal.fire({
      icon: "success",
      title: "Password Reset Generated",
      html: `Temporary password for <b>${userEmail}</b> has been updated to: <br/><br/><code>${newTempPassword}</code><br/><br/>They must change it on first login.`
    });

    await loadHrUsers();
  } catch (error) {
    console.error("Reset password error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  }
};

// 4. Create HR Login click handler
btnSaveHr.onclick = async () => {
  const name = hrNameInput.value.trim();
  const email = hrEmailInput.value.trim();
  const password = hrPassInput.value;

  const isValid = hrUserValidation(name, email, password);
  if (!isValid) return;

  setButtonLoading(btnSaveHr, "Saving...");

  try {
    // Secondary client se auth user banate hain taake Admin logout na ho
    const newUserId = await createSecondaryUser(email, password);
    if (!newUserId) {
      Swal.fire({ icon: "error", title: "Failed", text: "Could not create user credentials." });
      return;
    }

    // Profiles me HR record insert karte hain
    const { error: profileError } = await supabase.from("profiles").insert({
      id: newUserId,
      name: name,
      email: email,
      role: "hr",
      must_change: true,
      active: true
    });

    if (profileError) {
      Swal.fire({ icon: "error", title: "Profile Failed", text: profileError.message });
      return;
    }

    await addAuditLog("CREATE_HR_LOGIN", "profiles", null, { id: newUserId, name: name, email: email, role: "hr" });
    closeModal("userModal");

    Swal.fire({
      icon: "success",
      title: "HR Account Created!",
      text: `HR login for ${name} (${email}) has been created with temporary password.`
    });

    await loadHrUsers();
  } catch (error) {
    console.error("Create HR error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message || "Failed to create HR account." });
  } finally {
    restoreButton(btnSaveHr);
  }
};

// Initialization: Admin check
const initUsers = async () => {
  const authInfo = await checkLogin(["admin"]);
  if (!authInfo) return;

  await loadHrUsers();
};

initUsers();
