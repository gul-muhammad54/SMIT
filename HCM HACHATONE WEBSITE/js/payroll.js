// ============================================================================
// payroll.js - Salary Calculations, progressive tax, finalization & payslips
// ============================================================================
import supabase from "./credential.js";
import Swal from "./alert.js";
import {
  checkLogin,
  setButtonLoading,
  restoreButton,
  addAuditLog,
  sendNotification,
  calculateTaxMonthly,
  openModal,
  closeModal,
  calculateWorkingDays,
  getToday
} from "./common.js";

// DOM elements
const payrollControlBox = document.getElementById("payrollControlBox");
const payrollMonth = document.getElementById("payrollMonth");
const workingDaysInput = document.getElementById("workingDaysInput");
const btnGenerateDraft = document.getElementById("btnGenerateDraft");
const btnFinalizeRun = document.getElementById("btnFinalizeRun");
const payrollRunBanner = document.getElementById("payrollRunBanner");
const payslipsTableTitle = document.getElementById("payslipsTableTitle");
const payslipsTable = document.getElementById("payslipsTable");

// Printable Voucher Modal elements
const btnClosePayslipModal = document.getElementById("btnClosePayslipModal");
const btnCloseSlip = document.getElementById("btnCloseSlip");
const btnPrintSlip = document.getElementById("btnPrintSlip");
const slipCompany = document.getElementById("slipCompany");
const slipMonth = document.getElementById("slipMonth");
const slipStatusBadge = document.getElementById("slipStatusBadge");
const slipEmpName = document.getElementById("slipEmpName");
const slipEmpCode = document.getElementById("slipEmpCode");
const slipEmpDept = document.getElementById("slipEmpDept");
const slipEmpDes = document.getElementById("slipEmpDes");
const slipBasic = document.getElementById("slipBasic");
const slipAllowances = document.getElementById("slipAllowances");
const slipGross = document.getElementById("slipGross");
const slipDeductDays = document.getElementById("slipDeductDays");
const slipDeductions = document.getElementById("slipDeductions");
const slipTax = document.getElementById("slipTax");
const slipNet = document.getElementById("slipNet");

let currentUserProfile = null;
let currentEmpRecord = null;
let isManager = false;
let isAdmin = false;
let companySettings = null;
let activeRun = null;
let holidaysList = [];

// 1. Company & Holidays info load
const loadPayrollMeta = async () => {
  try {
    const { data: comp } = await supabase.from("company").select("*").eq("id", 1).maybeSingle();
    companySettings = comp || { name: "HCM Lite" };

    const { data: hols } = await supabase.from("holidays").select("date");
    holidaysList = (hols || []).map((h) => h.date);
  } catch (error) {
    console.error("Meta payroll error:", error);
  }
};

// 2. Calculate / Generate Payroll Draft
btnGenerateDraft.onclick = async () => {
  const month = payrollMonth.value;
  const standardWorkingDays = Number(workingDaysInput.value) || 22;

  if (!month) {
    Swal.fire({ icon: "warning", title: "Select Month", text: "Please select payroll month (YYYY-MM)." });
    return;
  }

  // Check if run already finalized
  if (activeRun && activeRun.month === month && activeRun.status === "finalized") {
    Swal.fire({
      icon: "warning",
      title: "Run Locked",
      text: "This payroll run is already finalized and cannot be recalculated."
    });
    return;
  }

  setButtonLoading(btnGenerateDraft, "Calculating...");

  try {
    // 1. Fetch all active employees
    const { data: employees } = await supabase
      .from("employees")
      .select("*, departments(name), designations(name)")
      .eq("status", "active");

    if (!employees || employees.length === 0) {
      Swal.fire({ icon: "info", title: "No Employees", text: "No active employees found to run payroll." });
      return;
    }

    const monthStart = `${month}-01`;
    const year = Number(month.split("-")[0]);
    const monthNum = Number(month.split("-")[1]);
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    const monthEnd = `${month}-${String(lastDayOfMonth).padStart(2, "0")}`;

    // 2. Fetch Unpaid leave type ID
    const { data: unpaidType } = await supabase.from("leave_types").select("id").eq("name", "Unpaid").maybeSingle();
    const unpaidTypeId = unpaidType ? unpaidType.id : null;

    // 3. Upsert payroll_runs record (draft)
    let runId = activeRun ? activeRun.id : null;
    if (!runId) {
      const { data: existingRun } = await supabase.from("payroll_runs").select("id, status").eq("month", month).maybeSingle();
      if (existingRun) {
        if (existingRun.status === "finalized") {
          Swal.fire({ icon: "warning", title: "Locked", text: "This month's run is already finalized." });
          return;
        }
        runId = existingRun.id;
      } else {
        const { data: newRun, error: runError } = await supabase
          .from("payroll_runs")
          .insert({
            month: month,
            status: "draft",
            working_days: standardWorkingDays,
            created_by: currentUserProfile.id
          })
          .select("id")
          .single();

        if (runError) throw runError;
        runId = newRun.id;
      }
    }

    let runTotalGross = 0;
    let runTotalDeductions = 0;
    let runTotalTax = 0;
    let runTotalNet = 0;

    // 4. Calculate for each employee
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      let basic = Number(emp.basic) || 0;
      let gross = basic * 1.5;

      // Join date proration check
      if (emp.join_date && emp.join_date > monthStart && emp.join_date <= monthEnd) {
        const workingDaysSinceJoin = calculateWorkingDays(emp.join_date, monthEnd, holidaysList);
        const ratio = Math.min(1, workingDaysSinceJoin / standardWorkingDays);
        gross = Math.round(gross * ratio);
        basic = Math.round(basic * ratio);
      }

      const perDaySalary = Math.round(gross / standardWorkingDays);

      // Attendance half-days
      const { data: halfDayRecords } = await supabase
        .from("attendance")
        .select("id")
        .eq("employee_id", emp.id)
        .eq("status", "half_day")
        .gte("date", monthStart)
        .lte("date", monthEnd);
      const halfDaysCount = halfDayRecords ? halfDayRecords.length : 0;

      // Unpaid leaves
      let unpaidDaysCount = 0;
      if (unpaidTypeId) {
        const { data: unpaidLeaves } = await supabase
          .from("leaves")
          .select("days")
          .eq("employee_id", emp.id)
          .eq("leave_type_id", unpaidTypeId)
          .eq("status", "approved")
          .gte("start_date", monthStart)
          .lte("end_date", monthEnd);

        for (let u = 0; u < (unpaidLeaves || []).length; u++) {
          unpaidDaysCount += Number(unpaidLeaves[u].days);
        }
      }

      // Absent days check
      const { data: presentRecords } = await supabase
        .from("attendance")
        .select("id")
        .eq("employee_id", emp.id)
        .in("status", ["present", "late"])
        .gte("date", monthStart)
        .lte("date", monthEnd);
      const presentCount = presentRecords ? presentRecords.length : 0;

      const { data: approvedLeavesAll } = await supabase
        .from("leaves")
        .select("days")
        .eq("employee_id", emp.id)
        .eq("status", "approved")
        .gte("start_date", monthStart)
        .lte("end_date", monthEnd);

      let approvedLeaveDays = 0;
      for (let l = 0; l < (approvedLeavesAll || []).length; l++) {
        approvedLeaveDays += Number(approvedLeavesAll[l].days);
      }

      const attendedOrApprovedDays = presentCount + approvedLeaveDays + halfDaysCount;
      const absentDaysCount = Math.max(0, standardWorkingDays - attendedOrApprovedDays);

      // Deductions formula: (absent + unpaid + 0.5 * half_days) * per_day
      const deductionDays = absentDaysCount + unpaidDaysCount + 0.5 * halfDaysCount;
      const totalDeductions = Math.round(deductionDays * perDaySalary);

      // Tax slab
      const monthlyTax = calculateTaxMonthly(gross);

      // Net
      const net = Math.max(0, gross - totalDeductions - monthlyTax);

      runTotalGross += gross;
      runTotalDeductions += totalDeductions;
      runTotalTax += monthlyTax;
      runTotalNet += net;

      // Upsert payslip
      await supabase.from("payslips").upsert(
        {
          run_id: runId,
          employee_id: emp.id,
          basic: basic,
          gross: gross,
          deductions: totalDeductions,
          tax: monthlyTax,
          net: net,
          absent_days: absentDaysCount,
          unpaid_days: unpaidDaysCount,
          half_days: halfDaysCount,
          per_day_salary: perDaySalary
        },
        { onConflict: "run_id,employee_id" }
      );
    }

    // 5. Update payroll_runs summary totals
    await supabase.from("payroll_runs").update({
      total_gross: runTotalGross,
      total_deductions: runTotalDeductions,
      total_tax: runTotalTax,
      total_net: runTotalNet
    }).eq("id", runId);

    await addAuditLog("CALCULATE_PAYROLL_DRAFT", `payroll_run: ${month}`, null, {
      month: month,
      total_net: runTotalNet
    });

    Swal.fire({
      icon: "success",
      title: "Payroll Draft Generated!",
      text: `Calculated for ${employees.length} employees. Total Net: PKR ${runTotalNet.toLocaleString()}`
    });

    await checkActivePayrollRun();
    await loadPayslips();
  } catch (error) {
    console.error("Generate payroll error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  } finally {
    restoreButton(btnGenerateDraft);
  }
};

// 3. Finalize Payroll Run (Admin Only)
btnFinalizeRun.onclick = async () => {
  if (!activeRun || activeRun.status === "finalized") return;

  const result = await Swal.fire({
    icon: "warning",
    title: "Lock & Finalize Payroll?",
    text: `Once finalized, payroll for ${activeRun.month} will be permanently locked and notifications dispatched to all staff. Proceed?`,
    showCancelButton: true,
    confirmButtonColor: "#16a34a",
    confirmButtonText: "Yes, Finalize Payroll"
  });

  if (!result.isConfirmed) return;

  setButtonLoading(btnFinalizeRun, "Locking...");

  try {
    const { error: runError } = await supabase.from("payroll_runs").update({
      status: "finalized",
      finalized_by: currentUserProfile.id,
      finalized_at: new Date().toISOString()
    }).eq("id", activeRun.id);

    if (runError) throw runError;

    // Dispatches notification to all employees
    const { data: slips } = await supabase
      .from("payslips")
      .select("employee_id, employees(user_id)")
      .eq("run_id", activeRun.id);

    for (let s = 0; s < (slips || []).length; s++) {
      const uid = slips[s].employees?.user_id;
      if (uid) {
        await sendNotification(uid, `Your payslip for ${activeRun.month} has been finalized. Download your voucher now.`);
      }
    }

    await addAuditLog("FINALIZE_PAYROLL", `payroll_run: ${activeRun.month}`, null, { run_id: activeRun.id });

    Swal.fire({
      icon: "success",
      title: "Payroll Finalized!",
      text: `Payroll for ${activeRun.month} is locked. All staff notified.`
    });

    await checkActivePayrollRun();
    await loadPayslips();
  } catch (error) {
    console.error("Finalize error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  } finally {
    restoreButton(btnFinalizeRun);
  }
};

// 4. Check active run status
const checkActivePayrollRun = async () => {
  const month = payrollMonth.value;
  if (!month) return;

  try {
    const { data: run } = await supabase.from("payroll_runs").select("*").eq("month", month).maybeSingle();
    activeRun = run;

    if (run) {
      const badgeClass = run.status === "finalized" ? "finalized" : "draft";
      payrollRunBanner.innerHTML = `
        Current Run Status: <span class="badge ${badgeClass}">${run.status.toUpperCase()}</span>
        • Total Net Payout: PKR ${Number(run.total_net).toLocaleString()}
      `;

      if (isAdmin && run.status === "draft") {
        btnFinalizeRun.style.display = "inline-flex";
      } else {
        btnFinalizeRun.style.display = "none";
      }
    } else {
      payrollRunBanner.innerHTML = `<span style="color: var(--muted);">No run created yet for ${month}.</span>`;
      btnFinalizeRun.style.display = "none";
    }
  } catch (error) {
    console.error("Check active run error:", error);
  }
};

payrollMonth.onchange = async () => {
  await checkActivePayrollRun();
  await loadPayslips();
};

// 5. Load Payslips Table
const loadPayslips = async () => {
  try {
    let query = supabase
      .from("payslips")
      .select("*, payroll_runs(month, status), employees(code, name, user_id, departments(name), designations(name))")
      .order("created_at", { ascending: false });

    if (!isManager && currentEmpRecord) {
      query = query.eq("employee_id", currentEmpRecord.id);
      payslipsTableTitle.innerText = "My Payslips";
    } else {
      const selectedMonth = payrollMonth.value;
      if (selectedMonth && activeRun) {
        query = query.eq("run_id", activeRun.id);
      }
      payslipsTableTitle.innerText = "Staff Payslips Overview";
    }

    const { data, error } = await query;
    if (error) {
      console.error("Fetch payslips error:", error);
      return;
    }

    payslipsTable.innerHTML = "";
    if (!data || data.length === 0) {
      payslipsTable.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--muted); padding: 24px;">No payslips generated for this period.</td></tr>`;
      return;
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const monthStr = item.payroll_runs ? item.payroll_runs.month : "-";
      const empName = item.employees ? `${item.employees.name} (${item.employees.code})` : "Employee #" + item.employee_id;

      payslipsTable.innerHTML += `
        <tr>
          <td><strong>${monthStr}</strong></td>
          <td>${empName}</td>
          <td>PKR ${Number(item.basic).toLocaleString()}</td>
          <td>PKR ${Number(item.gross).toLocaleString()}</td>
          <td style="color: var(--danger);">-PKR ${Number(item.deductions).toLocaleString()}</td>
          <td style="color: var(--danger);">-PKR ${Number(item.tax).toLocaleString()}</td>
          <td><strong style="color: var(--primary);">PKR ${Number(item.net).toLocaleString()}</strong></td>
          <td>
            <button class="small-btn blue btn-view-slip" data-idx="${i}">View Voucher</button>
          </td>
        </tr>
      `;
    }

    // View Voucher button listeners
    const viewButtons = payslipsTable.querySelectorAll(".btn-view-slip");
    for (let v = 0; v < viewButtons.length; v++) {
      viewButtons[v].onclick = () => {
        const idx = Number(viewButtons[v].dataset.idx);
        renderVoucherModal(data[idx]);
      };
    }
  } catch (error) {
    console.error("Load payslips error:", error);
  }
};

// 6. Render Voucher Modal
const renderVoucherModal = (slip) => {
  if (!slip) return;

  slipCompany.innerText = companySettings ? companySettings.name : "HCM Lite";
  slipMonth.innerText = slip.payroll_runs ? slip.payroll_runs.month : payrollMonth.value;

  const isFin = slip.payroll_runs && slip.payroll_runs.status === "finalized";
  slipStatusBadge.className = isFin ? "badge finalized" : "badge draft";
  slipStatusBadge.innerText = isFin ? "FINALIZED" : "DRAFT";

  slipEmpName.innerText = slip.employees ? slip.employees.name : "Staff";
  slipEmpCode.innerText = slip.employees ? slip.employees.code : "-";
  slipEmpDept.innerText = slip.employees?.departments ? slip.employees.departments.name : "General";
  slipEmpDes.innerText = slip.employees?.designations ? slip.employees.designations.name : "Staff";

  const basic = Number(slip.basic) || 0;
  const gross = Number(slip.gross) || 0;
  const allowances = Math.max(0, gross - basic);
  const deductions = Number(slip.deductions) || 0;
  const tax = Number(slip.tax) || 0;
  const net = Number(slip.net) || 0;

  const deductDays = (Number(slip.absent_days) || 0) + (Number(slip.unpaid_days) || 0) + 0.5 * (Number(slip.half_days) || 0);

  slipBasic.innerText = `PKR ${basic.toLocaleString()}`;
  slipAllowances.innerText = `PKR ${allowances.toLocaleString()}`;
  slipGross.innerText = `PKR ${gross.toLocaleString()}`;
  slipDeductDays.innerText = deductDays;
  slipDeductions.innerText = `-PKR ${deductions.toLocaleString()}`;
  slipTax.innerText = `-PKR ${tax.toLocaleString()}`;
  slipNet.innerText = `PKR ${net.toLocaleString()}`;

  openModal("payslipModal");
};

btnClosePayslipModal.onclick = () => closeModal("payslipModal");
btnCloseSlip.onclick = () => closeModal("payslipModal");
btnPrintSlip.onclick = () => window.print();

// Initialization
const initPayroll = async () => {
  const authInfo = await checkLogin();
  if (!authInfo) return;

  currentUserProfile = authInfo.profile;
  currentEmpRecord = authInfo.employee;
  isAdmin = currentUserProfile.role === "admin";
  isManager = isAdmin || currentUserProfile.role === "hr";

  await loadPayrollMeta();

  // Set default current month (YYYY-MM)
  const todayStr = getToday();
  payrollMonth.value = todayStr.substring(0, 7);

  if (isManager) {
    payrollControlBox.style.display = "block";
    await checkActivePayrollRun();
  }

  await loadPayslips();
};

initPayroll();
