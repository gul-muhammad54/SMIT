// ============================================================================
// settings.js - Company Settings, Departments, Designations, Leave Types, Holidays
// ============================================================================
import supabase from "./credential.js";
import Swal from "./alert.js";
import { companySettingsValidation } from "./validation.js";
import { checkLogin, setButtonLoading, restoreButton, addAuditLog } from "./common.js";

// DOM elements ko top par get kar rahe hain
const cNameInput = document.getElementById("cName");
const cStartInput = document.getElementById("cStart");
const cGraceInput = document.getElementById("cGrace");
const cHalfInput = document.getElementById("cHalf");
const cLatInput = document.getElementById("cLat");
const cLngInput = document.getElementById("cLng");
const cRadiusInput = document.getElementById("cRadius");
const btnUseLocation = document.getElementById("btnUseLocation");
const btnSaveCompany = document.getElementById("btnSaveCompany");

const depNameInput = document.getElementById("depName");
const btnAddDepartment = document.getElementById("btnAddDepartment");
const departmentsTable = document.getElementById("departmentsTable");

const desNameInput = document.getElementById("desName");
const btnAddDesignation = document.getElementById("btnAddDesignation");
const designationsTable = document.getElementById("designationsTable");

const ltNameInput = document.getElementById("ltName");
const ltQuotaInput = document.getElementById("ltQuota");
const btnAddLeaveType = document.getElementById("btnAddLeaveType");
const leaveTypesTable = document.getElementById("leaveTypesTable");

const holNameInput = document.getElementById("holName");
const holDateInput = document.getElementById("holDate");
const btnAddHoliday = document.getElementById("btnAddHoliday");
const holidaysTable = document.getElementById("holidaysTable");

let isAdmin = false;

// 1. Company data load kar rahe hain
const loadCompanySettings = async () => {
  try {
    const { data, error } = await supabase.from("company").select("*").eq("id", 1).single();
    if (error) {
      console.error("Company fetch error:", error);
      return;
    }
    if (data) {
      cNameInput.value = data.name || "";
      cStartInput.value = data.office_start || "09:00";
      cGraceInput.value = data.grace_min ?? 15;
      cHalfInput.value = data.halfday_hours ?? 5;
      cLatInput.value = data.office_lat || "";
      cLngInput.value = data.office_lng || "";
      cRadiusInput.value = data.radius ?? 150;
    }
  } catch (error) {
    console.error("Load company settings unexpected error:", error);
  }
};

// 2. Departments load kar rahe hain
const loadDepartments = async () => {
  try {
    const { data, error } = await supabase.from("departments").select("*").order("name");
    if (error) {
      console.error("Departments fetch error:", error);
      return;
    }

    departmentsTable.innerHTML = "";
    if (!data || data.length === 0) {
      departmentsTable.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--muted);">No departments configured yet.</td></tr>`;
      return;
    }

    // For loop se table rows bana rahe hain
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const actionBtn = isAdmin
        ? `<button class="small-btn red btn-del-dept" data-id="${item.id}" data-name="${item.name}">Delete</button>`
        : `<span style="color: var(--muted);">-</span>`;
      departmentsTable.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${item.name}</strong></td>
          <td>${actionBtn}</td>
        </tr>
      `;
    }

    // Delete buttons ke event listeners attach kar rahe hain
    if (isAdmin) {
      const delButtons = departmentsTable.querySelectorAll(".btn-del-dept");
      for (let j = 0; j < delButtons.length; j++) {
        delButtons[j].onclick = async () => {
          const id = delButtons[j].dataset.id;
          const name = delButtons[j].dataset.name;
          await deleteItem("departments", id, name, loadDepartments);
        };
      }
    }
  } catch (error) {
    console.error("Load departments error:", error);
  }
};

// 3. Designations load kar rahe hain
const loadDesignations = async () => {
  try {
    const { data, error } = await supabase.from("designations").select("*").order("name");
    if (error) {
      console.error("Designations fetch error:", error);
      return;
    }

    designationsTable.innerHTML = "";
    if (!data || data.length === 0) {
      designationsTable.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--muted);">No designations configured yet.</td></tr>`;
      return;
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const actionBtn = isAdmin
        ? `<button class="small-btn red btn-del-des" data-id="${item.id}" data-name="${item.name}">Delete</button>`
        : `<span style="color: var(--muted);">-</span>`;
      designationsTable.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${item.name}</strong></td>
          <td>${actionBtn}</td>
        </tr>
      `;
    }

    if (isAdmin) {
      const delButtons = designationsTable.querySelectorAll(".btn-del-des");
      for (let j = 0; j < delButtons.length; j++) {
        delButtons[j].onclick = async () => {
          const id = delButtons[j].dataset.id;
          const name = delButtons[j].dataset.name;
          await deleteItem("designations", id, name, loadDesignations);
        };
      }
    }
  } catch (error) {
    console.error("Load designations error:", error);
  }
};

// 4. Leave Types load kar rahe hain
const loadLeaveTypes = async () => {
  try {
    const { data, error } = await supabase.from("leave_types").select("*").order("id");
    if (error) {
      console.error("Leave types fetch error:", error);
      return;
    }

    leaveTypesTable.innerHTML = "";
    if (!data || data.length === 0) {
      leaveTypesTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--muted);">No leave types configured yet.</td></tr>`;
      return;
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const quotaDisplay = item.quota === null ? `<span class="badge on_leave">Unlimited</span>` : `<strong>${item.quota} Days</strong>`;
      const actionBtn = isAdmin
        ? `<button class="small-btn red btn-del-lt" data-id="${item.id}" data-name="${item.name}">Delete</button>`
        : `<span style="color: var(--muted);">-</span>`;

      leaveTypesTable.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${item.name}</td>
          <td>${quotaDisplay}</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    }

    if (isAdmin) {
      const delButtons = leaveTypesTable.querySelectorAll(".btn-del-lt");
      for (let j = 0; j < delButtons.length; j++) {
        delButtons[j].onclick = async () => {
          const id = delButtons[j].dataset.id;
          const name = delButtons[j].dataset.name;
          await deleteItem("leave_types", id, name, loadLeaveTypes);
        };
      }
    }
  } catch (error) {
    console.error("Load leave types error:", error);
  }
};

// 5. Public Holidays load kar rahe hain
const loadHolidays = async () => {
  try {
    const { data, error } = await supabase.from("holidays").select("*").order("date");
    if (error) {
      console.error("Holidays fetch error:", error);
      return;
    }

    holidaysTable.innerHTML = "";
    if (!data || data.length === 0) {
      holidaysTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--muted);">No public holidays added yet.</td></tr>`;
      return;
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const actionBtn = isAdmin
        ? `<button class="small-btn red btn-del-hol" data-id="${item.id}" data-name="${item.name}">Delete</button>`
        : `<span style="color: var(--muted);">-</span>`;

      holidaysTable.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${item.name}</strong></td>
          <td>${item.date}</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    }

    if (isAdmin) {
      const delButtons = holidaysTable.querySelectorAll(".btn-del-hol");
      for (let j = 0; j < delButtons.length; j++) {
        delButtons[j].onclick = async () => {
          const id = delButtons[j].dataset.id;
          const name = delButtons[j].dataset.name;
          await deleteItem("holidays", id, name, loadHolidays);
        };
      }
    }
  } catch (error) {
    console.error("Load holidays error:", error);
  }
};

// Generic Delete Helper with Confirmation
const deleteItem = async (table, id, name, reloadFn) => {
  const confirmResult = await Swal.fire({
    icon: "warning",
    title: "Confirm Deletion",
    text: `Are you sure you want to remove "${name}"?`,
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    confirmButtonText: "Yes, Delete"
  });

  if (!confirmResult.isConfirmed) return;

  try {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      Swal.fire({ icon: "error", title: "Delete Failed", text: error.message });
      return;
    }

    await addAuditLog("DELETE", `${table}: ${name}`, { id: id, name: name }, null);
    Swal.fire({ icon: "success", title: "Deleted", text: `Item removed successfully.` });
    await reloadFn();
  } catch (error) {
    console.error("Delete error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  }
};

// 6. Geolocation set karna
btnUseLocation.onclick = () => {
  if (!navigator.geolocation) {
    Swal.fire({ icon: "error", title: "Geolocation", text: "Geolocation is not supported by your browser." });
    return;
  }

  btnUseLocation.innerText = "Locating...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      cLatInput.value = pos.coords.latitude.toFixed(6);
      cLngInput.value = pos.coords.longitude.toFixed(6);
      btnUseLocation.innerText = "📍 Use My Current Location";
      Swal.fire({
        icon: "success",
        title: "Location Acquired",
        text: `Latitude: ${cLatInput.value}, Longitude: ${cLngInput.value}`
      });
    },
    (err) => {
      btnUseLocation.innerText = "📍 Use My Current Location";
      Swal.fire({ icon: "error", title: "Location Error", text: err.message });
    }
  );
};

// 7. Save Company Settings Button click
btnSaveCompany.onclick = async () => {
  const name = cNameInput.value.trim();
  const start = cStartInput.value;
  const grace = cGraceInput.value;
  const half = cHalfInput.value;
  const lat = cLatInput.value ? Number(cLatInput.value) : null;
  const lng = cLngInput.value ? Number(cLngInput.value) : null;
  const radius = cRadiusInput.value;

  const isValid = companySettingsValidation(name, start, grace, half, radius);
  if (!isValid) return;

  setButtonLoading(btnSaveCompany, "Saving...");

  try {
    const updatePayload = {
      name: name,
      office_start: start,
      grace_min: Number(grace),
      halfday_hours: Number(half),
      office_lat: lat,
      office_lng: lng,
      radius: Number(radius),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("company").update(updatePayload).eq("id", 1);
    if (error) {
      Swal.fire({ icon: "error", title: "Save Failed", text: error.message });
      return;
    }

    await addAuditLog("UPDATE_COMPANY_SETTINGS", "company", null, updatePayload);
    Swal.fire({ icon: "success", title: "Saved", text: "Company settings updated successfully." });
  } catch (error) {
    console.error("Save company error:", error);
    Swal.fire({ icon: "error", title: "Unexpected Error", text: error.message });
  } finally {
    restoreButton(btnSaveCompany);
  }
};

// 8. Add Department
btnAddDepartment.onclick = async () => {
  const name = depNameInput.value.trim();
  if (!name || name.length < 2) {
    Swal.fire({ icon: "warning", title: "Validation", text: "Please enter department name." });
    return;
  }

  setButtonLoading(btnAddDepartment, "Saving...");
  try {
    const { error } = await supabase.from("departments").insert({ name: name });
    if (error) {
      Swal.fire({ icon: "error", title: "Insert Failed", text: error.message });
      return;
    }

    depNameInput.value = "";
    await addAuditLog("ADD_DEPARTMENT", "departments", null, { name: name });
    Swal.fire({ icon: "success", title: "Added", text: `Department "${name}" created.` });
    await loadDepartments();
  } catch (error) {
    console.error("Add department error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  } finally {
    restoreButton(btnAddDepartment);
  }
};

// 9. Add Designation
btnAddDesignation.onclick = async () => {
  const name = desNameInput.value.trim();
  if (!name || name.length < 2) {
    Swal.fire({ icon: "warning", title: "Validation", text: "Please enter designation title." });
    return;
  }

  setButtonLoading(btnAddDesignation, "Saving...");
  try {
    const { error } = await supabase.from("designations").insert({ name: name });
    if (error) {
      Swal.fire({ icon: "error", title: "Insert Failed", text: error.message });
      return;
    }

    desNameInput.value = "";
    await addAuditLog("ADD_DESIGNATION", "designations", null, { name: name });
    Swal.fire({ icon: "success", title: "Added", text: `Designation "${name}" created.` });
    await loadDesignations();
  } catch (error) {
    console.error("Add designation error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  } finally {
    restoreButton(btnAddDesignation);
  }
};

// 10. Add Leave Type
btnAddLeaveType.onclick = async () => {
  const name = ltNameInput.value.trim();
  const quotaVal = ltQuotaInput.value.trim();

  if (!name || name.length < 2) {
    Swal.fire({ icon: "warning", title: "Validation", text: "Please enter leave type name." });
    return;
  }

  const quota = quotaVal === "" ? null : Number(quotaVal);

  setButtonLoading(btnAddLeaveType, "Saving...");
  try {
    const { error } = await supabase.from("leave_types").insert({ name: name, quota: quota });
    if (error) {
      Swal.fire({ icon: "error", title: "Insert Failed", text: error.message });
      return;
    }

    ltNameInput.value = "";
    ltQuotaInput.value = "";
    await addAuditLog("ADD_LEAVE_TYPE", "leave_types", null, { name: name, quota: quota });
    Swal.fire({ icon: "success", title: "Added", text: `Leave type "${name}" created.` });
    await loadLeaveTypes();
  } catch (error) {
    console.error("Add leave type error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  } finally {
    restoreButton(btnAddLeaveType);
  }
};

// 11. Add Holiday
btnAddHoliday.onclick = async () => {
  const name = holNameInput.value.trim();
  const date = holDateInput.value;

  if (!name || name.length < 2) {
    Swal.fire({ icon: "warning", title: "Validation", text: "Please enter holiday name." });
    return;
  }
  if (!date) {
    Swal.fire({ icon: "warning", title: "Validation", text: "Please select holiday date." });
    return;
  }

  setButtonLoading(btnAddHoliday, "Saving...");
  try {
    const { error } = await supabase.from("holidays").insert({ name: name, date: date });
    if (error) {
      Swal.fire({ icon: "error", title: "Insert Failed", text: error.message });
      return;
    }

    holNameInput.value = "";
    holDateInput.value = "";
    await addAuditLog("ADD_HOLIDAY", "holidays", null, { name: name, date: date });
    Swal.fire({ icon: "success", title: "Added", text: `Holiday "${name}" on ${date} added.` });
    await loadHolidays();
  } catch (error) {
    console.error("Add holiday error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  } finally {
    restoreButton(btnAddHoliday);
  }
};

// Initialization
const initSettings = async () => {
  const authInfo = await checkLogin(["admin", "hr"]);
  if (!authInfo) return;

  isAdmin = authInfo.profile.role === "admin";

  // Agar HR hai to modifying controls hide kar dein
  if (!isAdmin) {
    const adminActions = document.querySelectorAll(".admin-action");
    for (let i = 0; i < adminActions.length; i++) {
      adminActions[i].style.display = "none";
    }
    // Form inputs disabled kar dein
    cNameInput.disabled = true;
    cStartInput.disabled = true;
    cGraceInput.disabled = true;
    cHalfInput.disabled = true;
    cLatInput.disabled = true;
    cLngInput.disabled = true;
    cRadiusInput.disabled = true;
  }

  await loadCompanySettings();
  await loadDepartments();
  await loadDesignations();
  await loadLeaveTypes();
  await loadHolidays();
};

initSettings();
