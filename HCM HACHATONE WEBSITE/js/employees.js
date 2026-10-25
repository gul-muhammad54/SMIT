// ============================================================================
// employees.js - Employee Directory, Registration, CSV Import (Dry Run) & Export
// ============================================================================
import supabase from "./credential.js";
import Swal from "./alert.js";
import { employeeValidation } from "./validation.js";
import {
  checkLogin,
  setButtonLoading,
  restoreButton,
  addAuditLog,
  createSecondaryUser,
  openModal,
  closeModal,
  getToday
} from "./common.js";

// DOM elements
const searchEmployee = document.getElementById("searchEmployee");
const filterDepartment = document.getElementById("filterDepartment");
const btnExportCsv = document.getElementById("btnExportCsv");
const btnTriggerImport = document.getElementById("btnTriggerImport");
const csvFileInput = document.getElementById("csvFileInput");
const btnOpenEmpModal = document.getElementById("btnOpenEmpModal");
const employeesTable = document.getElementById("employeesTable");

// Modal elements
const modalTitle = document.getElementById("modalTitle");
const btnCloseEmpModal = document.getElementById("btnCloseEmpModal");
const btnCancelEmpModal = document.getElementById("btnCancelEmpModal");
const btnSaveEmployee = document.getElementById("btnSaveEmployee");
const editEmployeeId = document.getElementById("editEmployeeId");
const empCodeInput = document.getElementById("empCode");
const empNameInput = document.getElementById("empName");
const empEmailInput = document.getElementById("empEmail");
const empPhoneInput = document.getElementById("empPhone");
const empAddressInput = document.getElementById("empAddress");
const empDepartment = document.getElementById("empDepartment");
const empDesignation = document.getElementById("empDesignation");
const empJoinDate = document.getElementById("empJoinDate");
const empBasic = document.getElementById("empBasic");
const empPassword = document.getElementById("empPassword");
const tempPasswordGroup = document.getElementById("tempPasswordGroup");

// Dry Run Modal elements
const btnCloseDryRunModal = document.getElementById("btnCloseDryRunModal");
const btnCancelDryRun = document.getElementById("btnCancelDryRun");
const btnConfirmDryRun = document.getElementById("btnConfirmDryRun");
const dryRunSummary = document.getElementById("dryRunSummary");
const dryRunTable = document.getElementById("dryRunTable");

// Global memory cache
let allEmployees = [];
let departmentsList = [];
let designationsList = [];
let validDryRunRows = [];

// 1. Dropdowns load kar rahe hain (Departments & Designations)
const loadDropdowns = async () => {
  try {
    const { data: depts } = await supabase.from("departments").select("*").order("name");
    departmentsList = depts || [];

    empDepartment.innerHTML = `<option value="">Select Department</option>`;
    filterDepartment.innerHTML = `<option value="">All Departments</option>`;
    for (let i = 0; i < departmentsList.length; i++) {
      empDepartment.innerHTML += `<option value="${departmentsList[i].id}">${departmentsList[i].name}</option>`;
      filterDepartment.innerHTML += `<option value="${departmentsList[i].id}">${departmentsList[i].name}</option>`;
    }

    const { data: desigs } = await supabase.from("designations").select("*").order("name");
    designationsList = desigs || [];

    empDesignation.innerHTML = `<option value="">Select Designation</option>`;
    for (let j = 0; j < designationsList.length; j++) {
      empDesignation.innerHTML += `<option value="${designationsList[j].id}">${designationsList[j].name}</option>`;
    }
  } catch (error) {
    console.error("Dropdowns load error:", error);
  }
};

// 2. Employees table fetch & render
const loadEmployees = async () => {
  try {
    const { data, error } = await supabase
      .from("employees")
      .select("*, departments(name), designations(name)")
      .order("id", { ascending: true });

    if (error) {
      console.error("Employees fetch error:", error);
      return;
    }

    allEmployees = data || [];
    renderEmployeesTable(allEmployees);
  } catch (error) {
    console.error("Load employees unexpected error:", error);
  }
};

// Table filter aur loop se render karne ka helper
const renderEmployeesTable = (list) => {
  employeesTable.innerHTML = "";
  if (!list || list.length === 0) {
    employeesTable.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--muted); padding: 24px;">No employees match the criteria.</td></tr>`;
    return;
  }

  for (let i = 0; i < list.length; i++) {
    const emp = list[i];
    const deptName = emp.departments ? emp.departments.name : "-";
    const desName = emp.designations ? emp.designations.name : "-";
    const statusBadge = emp.status === "active"
      ? `<span class="badge active">Active</span>`
      : `<span class="badge inactive">Inactive</span>`;

    employeesTable.innerHTML += `
      <tr>
        <td><strong>${emp.code}</strong></td>
        <td>${emp.name}</td>
        <td>${emp.email}</td>
        <td>${deptName}</td>
        <td>${desName}</td>
        <td>${emp.join_date}</td>
        <td>PKR ${Number(emp.basic).toLocaleString()}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="small-btn grey btn-edit-emp" data-id="${emp.id}">Edit</button>
        </td>
      </tr>
    `;
  }

  // Edit button click listeners
  const editButtons = employeesTable.querySelectorAll(".btn-edit-emp");
  for (let j = 0; j < editButtons.length; j++) {
    editButtons[j].onclick = () => {
      const id = editButtons[j].dataset.id;
      openEditModal(id);
    };
  }
};

// Search & Filter event listeners
const applyFilter = () => {
  const query = searchEmployee.value.trim().toLowerCase();
  const selectedDept = filterDepartment.value;

  const filtered = allEmployees.filter((emp) => {
    const matchesQuery =
      emp.name.toLowerCase().includes(query) ||
      emp.code.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query);

    const matchesDept = !selectedDept || String(emp.department_id) === String(selectedDept);
    return matchesQuery && matchesDept;
  });

  renderEmployeesTable(filtered);
};

searchEmployee.oninput = applyFilter;
filterDepartment.onchange = applyFilter;

// 3. Register Employee Modal Open
btnOpenEmpModal.onclick = () => {
  modalTitle.innerText = "Register New Employee";
  editEmployeeId.value = "";
  empCodeInput.value = "";
  empCodeInput.disabled = false;
  empNameInput.value = "";
  empEmailInput.value = "";
  empEmailInput.disabled = false;
  empPhoneInput.value = "";
  empAddressInput.value = "";
  empDepartment.value = "";
  empDesignation.value = "";
  empJoinDate.value = getToday();
  empBasic.value = "";
  empPassword.value = "";
  tempPasswordGroup.style.display = "block";
  openModal("empModal");
};

// Edit Employee Modal Open
const openEditModal = (empId) => {
  const emp = allEmployees.find((e) => String(e.id) === String(empId));
  if (!emp) return;

  modalTitle.innerText = "Edit Employee: " + emp.code;
  editEmployeeId.value = emp.id;
  empCodeInput.value = emp.code;
  empCodeInput.disabled = true; // Code fixed
  empNameInput.value = emp.name;
  empEmailInput.value = emp.email;
  empEmailInput.disabled = true; // Email fixed
  empPhoneInput.value = emp.phone || "";
  empAddressInput.value = emp.address || "";
  empDepartment.value = emp.department_id || "";
  empDesignation.value = emp.designation_id || "";
  empJoinDate.value = emp.join_date;
  empBasic.value = emp.basic;
  tempPasswordGroup.style.display = "none"; // No password on edit
  openModal("empModal");
};

btnCloseEmpModal.onclick = () => closeModal("empModal");
btnCancelEmpModal.onclick = () => closeModal("empModal");

// 4. Save Employee (Create or Edit)
btnSaveEmployee.onclick = async () => {
  const isEditing = !!editEmployeeId.value;
  const code = empCodeInput.value.trim();
  const name = empNameInput.value.trim();
  const email = empEmailInput.value.trim();
  const phone = empPhoneInput.value.trim();
  const address = empAddressInput.value.trim();
  const deptId = empDepartment.value ? Number(empDepartment.value) : null;
  const desId = empDesignation.value ? Number(empDesignation.value) : null;
  const joinDate = empJoinDate.value;
  const basic = empBasic.value;
  const password = empPassword.value;

  const isValid = employeeValidation(code, name, email, joinDate, basic);
  if (!isValid) return;

  if (!isEditing && (!password || password.length < 6)) {
    Swal.fire({ icon: "warning", title: "Validation Error", text: "Temporary password must be at least 6 characters." });
    return;
  }

  setButtonLoading(btnSaveEmployee, "Saving...");

  try {
    if (isEditing) {
      // Edit existing employee
      const updateData = {
        name: name,
        phone: phone,
        address: address,
        department_id: deptId,
        designation_id: desId,
        join_date: joinDate,
        basic: Number(basic),
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from("employees")
        .update(updateData)
        .eq("id", editEmployeeId.value);

      if (updateError) {
        Swal.fire({ icon: "error", title: "Update Failed", text: updateError.message });
        return;
      }

      await addAuditLog("UPDATE_EMPLOYEE", `employee: ${code}`, null, updateData);
      closeModal("empModal");
      Swal.fire({ icon: "success", title: "Updated", text: `Employee ${code} details updated.` });
      await loadEmployees();
    } else {
      // Register new employee login with secondary client
      const newUserId = await createSecondaryUser(email, password);
      if (!newUserId) {
        Swal.fire({ icon: "error", title: "Auth Failed", text: "Could not create login user." });
        return;
      }

      // Profiles table me insert
      const { error: profileError } = await supabase.from("profiles").insert({
        id: newUserId,
        name: name,
        email: email,
        role: "employee",
        must_change: true,
        active: true
      });

      if (profileError) {
        Swal.fire({ icon: "error", title: "Profile Error", text: profileError.message });
        return;
      }

      // Employees table me insert
      const employeePayload = {
        user_id: newUserId,
        code: code,
        name: name,
        email: email,
        phone: phone,
        address: address,
        department_id: deptId,
        designation_id: desId,
        join_date: joinDate,
        basic: Number(basic),
        status: "active"
      };

      const { error: empError } = await supabase.from("employees").insert(employeePayload);
      if (empError) {
        Swal.fire({ icon: "error", title: "Employee Error", text: empError.message });
        return;
      }

      await addAuditLog("REGISTER_EMPLOYEE", `employee: ${code}`, null, employeePayload);
      closeModal("empModal");
      Swal.fire({
        icon: "success",
        title: "Employee Registered!",
        text: `Employee account for ${name} (${code}) created successfully.`
      });

      await loadEmployees();
    }
  } catch (error) {
    console.error("Save employee error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message || "Failed to save employee." });
  } finally {
    restoreButton(btnSaveEmployee);
  }
};

// 5. CSV Export
btnExportCsv.onclick = () => {
  if (allEmployees.length === 0) {
    Swal.fire({ icon: "info", title: "Export", text: "No employee data to export." });
    return;
  }

  let csvContent = "code,name,email,phone,address,department,designation,join_date,basic,status\n";
  for (let i = 0; i < allEmployees.length; i++) {
    const e = allEmployees[i];
    const dept = e.departments ? e.departments.name : "";
    const des = e.designations ? e.designations.name : "";
    const row = [
      `"${e.code}"`,
      `"${e.name}"`,
      `"${e.email}"`,
      `"${e.phone || ""}"`,
      `"${(e.address || "").replace(/"/g, '""')}"`,
      `"${dept}"`,
      `"${des}"`,
      `"${e.join_date}"`,
      e.basic,
      `"${e.status}"`
    ].join(",");
    csvContent += row + "\n";
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `employees_${getToday()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 6. CSV Import Trigger
btnTriggerImport.onclick = () => {
  csvFileInput.value = "";
  csvFileInput.click();
};

// CSV parsing with Dry Run
csvFileInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length <= 1) {
    Swal.fire({ icon: "warning", title: "CSV Import", text: "CSV file is empty or only contains headers." });
    return;
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const dryRunFindings = [];
  validDryRunRows = [];

  const existingCodes = allEmployees.map((e) => e.code.toLowerCase());
  const existingEmails = allEmployees.map((e) => e.email.toLowerCase());
  const seenCodes = new Set();
  const seenEmails = new Set();

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const rowObj = {};
    for (let h = 0; h < headers.length; h++) {
      rowObj[headers[h]] = values[h] || "";
    }

    let hasError = false;

    // Check Code
    if (!rowObj.code) {
      dryRunFindings.push({ row: rowNumber, field: "code", reason: "Missing employee code" });
      hasError = true;
    } else if (existingCodes.includes(rowObj.code.toLowerCase()) || seenCodes.has(rowObj.code.toLowerCase())) {
      dryRunFindings.push({ row: rowNumber, field: "code", reason: `Duplicate code "${rowObj.code}"` });
      hasError = true;
    }

    // Check Name
    if (!rowObj.name || rowObj.name.length < 3) {
      dryRunFindings.push({ row: rowNumber, field: "name", reason: "Name must be at least 3 characters" });
      hasError = true;
    }

    // Check Email
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!rowObj.email || !emailRegex.test(rowObj.email)) {
      dryRunFindings.push({ row: rowNumber, field: "email", reason: "Invalid email format" });
      hasError = true;
    } else if (existingEmails.includes(rowObj.email.toLowerCase()) || seenEmails.has(rowObj.email.toLowerCase())) {
      dryRunFindings.push({ row: rowNumber, field: "email", reason: `Duplicate email "${rowObj.email}"` });
      hasError = true;
    }

    // Check Basic Salary
    if (!rowObj.basic || isNaN(Number(rowObj.basic))) {
      dryRunFindings.push({ row: rowNumber, field: "basic", reason: "Invalid salary amount" });
      hasError = true;
    }

    // Check Password
    const password = rowObj.password || "TempPass123";

    if (!hasError) {
      seenCodes.add(rowObj.code.toLowerCase());
      seenEmails.add(rowObj.email.toLowerCase());

      // Department & Designation mapping
      const matchedDept = departmentsList.find((d) => d.name.toLowerCase() === (rowObj.department || "").toLowerCase());
      const matchedDes = designationsList.find((d) => d.name.toLowerCase() === (rowObj.designation || "").toLowerCase());

      validDryRunRows.push({
        code: rowObj.code,
        name: rowObj.name,
        email: rowObj.email,
        phone: rowObj.phone || "",
        address: rowObj.address || "",
        department_id: matchedDept ? matchedDept.id : null,
        designation_id: matchedDes ? matchedDes.id : null,
        join_date: rowObj.join_date || getToday(),
        basic: Number(rowObj.basic),
        password: password
      });

      dryRunFindings.push({ row: rowNumber, field: "All Fields", reason: "✅ Valid for Import" });
    }
  }

  // Render Dry Run Modal
  dryRunTable.innerHTML = "";
  for (let k = 0; k < dryRunFindings.length; k++) {
    const f = dryRunFindings[k];
    const isSuccess = f.reason.startsWith("✅");
    const reasonHtml = isSuccess
      ? `<span style="color: var(--success); font-weight: 600;">${f.reason}</span>`
      : `<span style="color: var(--danger); font-weight: 600;">${f.reason}</span>`;

    dryRunTable.innerHTML += `
      <tr>
        <td>Row ${f.row}</td>
        <td><code>${f.field}</code></td>
        <td>${reasonHtml}</td>
      </tr>
    `;
  }

  dryRunSummary.innerHTML = `Summary: <span style="color: var(--success);">${validDryRunRows.length} Valid</span> | <span style="color: var(--danger);">${dryRunFindings.length - validDryRunRows.length} Errors</span>`;

  btnConfirmDryRun.disabled = validDryRunRows.length === 0;
  openModal("dryRunModal");
};

btnCloseDryRunModal.onclick = () => closeModal("dryRunModal");
btnCancelDryRun.onclick = () => closeModal("dryRunModal");

// 7. Confirm Dry Run Bulk Import
btnConfirmDryRun.onclick = async () => {
  if (validDryRunRows.length === 0) return;

  setButtonLoading(btnConfirmDryRun, "Importing...");

  let successCount = 0;
  try {
    for (let i = 0; i < validDryRunRows.length; i++) {
      const item = validDryRunRows[i];
      try {
        const uid = await createSecondaryUser(item.email, item.password);
        if (uid) {
          await supabase.from("profiles").insert({
            id: uid,
            name: item.name,
            email: item.email,
            role: "employee",
            must_change: true,
            active: true
          });

          await supabase.from("employees").insert({
            user_id: uid,
            code: item.code,
            name: item.name,
            email: item.email,
            phone: item.phone,
            address: item.address,
            department_id: item.department_id,
            designation_id: item.designation_id,
            join_date: item.join_date,
            basic: item.basic,
            status: "active"
          });

          successCount++;
        }
      } catch (err) {
        console.warn(`Row ${item.code} import error:`, err.message);
      }
    }

    await addAuditLog("CSV_BULK_IMPORT", "employees", null, { imported_count: successCount });
    closeModal("dryRunModal");

    Swal.fire({
      icon: "success",
      title: "Import Completed",
      text: `Successfully imported ${successCount} employees.`
    });

    await loadEmployees();
  } catch (error) {
    console.error("Bulk import error:", error);
    Swal.fire({ icon: "error", title: "Import Error", text: error.message });
  } finally {
    restoreButton(btnConfirmDryRun);
  }
};

// Initialization: Admin & HR access
const initEmployees = async () => {
  const authInfo = await checkLogin(["admin", "hr"]);
  if (!authInfo) return;

  await loadDropdowns();
  await loadEmployees();
};

initEmployees();
