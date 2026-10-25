// ============================================================================
// profile.js - Account Profile & Employee Contact Information
// ============================================================================
import supabase from "./credential.js";
import Swal from "./alert.js";
import {
  checkLogin,
  setButtonLoading,
  restoreButton,
  addAuditLog
} from "./common.js";

// DOM elements
const cardAvatar = document.getElementById("cardAvatar");
const profileFullName = document.getElementById("profileFullName");
const profileRoleBadge = document.getElementById("profileRoleBadge");
const profileEmail = document.getElementById("profileEmail");
const btnGoChangePassword = document.getElementById("btnGoChangePassword");

const employeeDetailsBox = document.getElementById("employeeDetailsBox");
const profEmpCode = document.getElementById("profEmpCode");
const profEmpJoinDate = document.getElementById("profEmpJoinDate");
const profEmpDept = document.getElementById("profEmpDept");
const profEmpDes = document.getElementById("profEmpDes");
const profEmpPhone = document.getElementById("profEmpPhone");
const profEmpAddress = document.getElementById("profEmpAddress");
const btnSaveProfile = document.getElementById("btnSaveProfile");

let currentUserProfile = null;
let currentEmpRecord = null;

// 1. Save Phone & Address (Employee only editable fields)
btnSaveProfile.onclick = async () => {
  if (!currentEmpRecord) return;

  const phone = profEmpPhone.value.trim();
  const address = profEmpAddress.value.trim();

  setButtonLoading(btnSaveProfile, "Saving...");

  try {
    const payload = {
      phone: phone,
      address: address,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("employees")
      .update(payload)
      .eq("id", currentEmpRecord.id);

    if (error) {
      Swal.fire({ icon: "error", title: "Update Failed", text: error.message });
      return;
    }

    await addAuditLog("UPDATE_PROFILE_CONTACT", `employee: ${currentEmpRecord.code}`, null, payload);
    Swal.fire({
      icon: "success",
      title: "Contact Updated",
      text: "Your phone number and address have been updated successfully."
    });
  } catch (error) {
    console.error("Save profile error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  } finally {
    restoreButton(btnSaveProfile);
  }
};

// 2. Change password redirect
btnGoChangePassword.onclick = () => {
  window.location.href = "change.html";
};

// Initialization
const initProfile = async () => {
  const authInfo = await checkLogin();
  if (!authInfo) return;

  currentUserProfile = authInfo.profile;
  currentEmpRecord = authInfo.employee;

  // Basic profile display
  profileFullName.innerText = currentUserProfile.name;
  profileEmail.value = currentUserProfile.email;
  profileRoleBadge.innerText = currentUserProfile.role.toUpperCase();
  cardAvatar.innerText = currentUserProfile.name.charAt(0).toUpperCase();

  // If employee profile exists, load job placement and contact info
  if (currentEmpRecord) {
    employeeDetailsBox.style.display = "block";

    // Department & Designation fetch
    const { data: empWithMeta } = await supabase
      .from("employees")
      .select("*, departments(name), designations(name)")
      .eq("id", currentEmpRecord.id)
      .single();

    if (empWithMeta) {
      profEmpCode.value = empWithMeta.code;
      profEmpJoinDate.value = empWithMeta.join_date;
      profEmpDept.value = empWithMeta.departments ? empWithMeta.departments.name : "Not Assigned";
      profEmpDes.value = empWithMeta.designations ? empWithMeta.designations.name : "Not Assigned";
      profEmpPhone.value = empWithMeta.phone || "";
      profEmpAddress.value = empWithMeta.address || "";
    }
  }
};

initProfile();
