// ============================================================================
// attendance.js - Attendance Punching, Board, and Correction Management
// ============================================================================
import supabase from "./credential.js";
import Swal from "./alert.js";
import {
  checkLogin,
  setButtonLoading,
  restoreButton,
  addAuditLog,
  sendNotification,
  openModal,
  closeModal,
  getToday,
  formatTime
} from "./common.js";

// DOM elements
const employeePunchBox = document.getElementById("employeePunchBox");
const btnCheckIn = document.getElementById("btnCheckIn");
const btnCheckOut = document.getElementById("btnCheckOut");
const btnOpenCorrectionModal = document.getElementById("btnOpenCorrectionModal");
const punchStatusText = document.getElementById("punchStatusText");

const adminBoardFilters = document.getElementById("adminBoardFilters");
const boardDate = document.getElementById("boardDate");
const boardDept = document.getElementById("boardDept");
const btnRefreshBoard = document.getElementById("btnRefreshBoard");

const tableTitle = document.getElementById("tableTitle");
const attendanceTable = document.getElementById("attendanceTable");
const pendingCorrectionsBox = document.getElementById("pendingCorrectionsBox");
const correctionsTable = document.getElementById("correctionsTable");

// Modal elements
const btnCloseCorrectionModal = document.getElementById("btnCloseCorrectionModal");
const btnCancelCorrection = document.getElementById("btnCancelCorrection");
const btnSubmitCorrection = document.getElementById("btnSubmitCorrection");
const correctionDate = document.getElementById("correctionDate");
const correctionReason = document.getElementById("correctionReason");

let currentUserProfile = null;
let currentEmpRecord = null;
let isManager = false;

// 1. Employee punch status check
const checkTodayPunchState = async () => {
  if (!currentEmpRecord) return;

  const today = getToday();
  try {
    const { data: att } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", currentEmpRecord.id)
      .eq("date", today)
      .maybeSingle();

    if (!att) {
      btnCheckIn.disabled = false;
      btnCheckOut.disabled = true;
      punchStatusText.innerHTML = `<span style="color: var(--muted);">Not checked in today yet.</span>`;
    } else if (att.check_in && !att.check_out) {
      btnCheckIn.disabled = true;
      btnCheckOut.disabled = false;
      punchStatusText.innerHTML = `<span style="color: var(--success);">Checked In at ${formatTime(att.check_in)} (${att.status.toUpperCase()})</span>`;
    } else {
      btnCheckIn.disabled = true;
      btnCheckOut.disabled = true;
      punchStatusText.innerHTML = `<span style="color: var(--info);">Clocked out at ${formatTime(att.check_out)} • Status: ${att.status.toUpperCase()}</span>`;
    }
  } catch (error) {
    console.error("Check today punch error:", error);
  }
};

// 2. Clock In button handler (Server Stamped)
btnCheckIn.onclick = async () => {
  if (!currentEmpRecord) return;

  setButtonLoading(btnCheckIn, "Stamping...");
  try {
    const { data, error } = await supabase.rpc("record_check_in", {
      p_employee_id: currentEmpRecord.id
    });

    if (error) {
      // Duplicate check-in error code 409
      if (error.code === "23505" || error.message.includes("already recorded")) {
        Swal.fire({
          icon: "warning",
          title: "Check-in Already Recorded (409)",
          text: "You have already clocked in for today. Multiple check-ins are restricted."
        });
      } else {
        Swal.fire({ icon: "error", title: "Check-in Error", text: error.message });
      }
      return;
    }

    await addAuditLog("ATTENDANCE_CHECK_IN", `employee: ${currentEmpRecord.code}`, null, data);
    Swal.fire({
      icon: "success",
      title: "Checked In Successfully!",
      text: `Status stamped: ${data.status.toUpperCase()} at ${formatTime(data.check_in)}`
    });

    await checkTodayPunchState();
    await loadEmployeeAttendanceHistory();
  } catch (error) {
    console.error("Check in error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  } finally {
    restoreButton(btnCheckIn);
  }
};

// 3. Clock Out button handler (Server Stamped)
btnCheckOut.onclick = async () => {
  if (!currentEmpRecord) return;

  setButtonLoading(btnCheckOut, "Stamping...");
  try {
    const { data, error } = await supabase.rpc("record_check_out", {
      p_employee_id: currentEmpRecord.id
    });

    if (error) {
      Swal.fire({ icon: "error", title: "Check-out Error", text: error.message });
      return;
    }

    await addAuditLog("ATTENDANCE_CHECK_OUT", `employee: ${currentEmpRecord.code}`, null, data);
    Swal.fire({
      icon: "success",
      title: "Checked Out Successfully!",
      text: `Total hours: ${Number(data.hours_worked).toFixed(1)} hrs. Final Status: ${data.status.toUpperCase()}`
    });

    await checkTodayPunchState();
    await loadEmployeeAttendanceHistory();
  } catch (error) {
    console.error("Check out error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  } finally {
    restoreButton(btnCheckOut);
  }
};

// 4. Employee's own attendance history
const loadEmployeeAttendanceHistory = async () => {
  if (!currentEmpRecord) return;

  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", currentEmpRecord.id)
      .order("date", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Fetch personal attendance error:", error);
      return;
    }

    tableTitle.innerText = "My Attendance History (Past 30 Days)";
    attendanceTable.innerHTML = "";
    if (!data || data.length === 0) {
      attendanceTable.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 20px;">No attendance records found yet.</td></tr>`;
      return;
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      let statusClass = row.status;
      // Missing checkout check if date < today and no check_out
      if (row.check_in && !row.check_out && row.date < getToday()) {
        statusClass = "missing_checkout";
      }

      const badgeHtml = `<span class="badge ${statusClass}">${statusClass.replace("_", " ").toUpperCase()}</span>`;

      attendanceTable.innerHTML += `
        <tr>
          <td><strong>${row.date}</strong></td>
          <td>${currentEmpRecord.name} (${currentEmpRecord.code})</td>
          <td>Self</td>
          <td>${formatTime(row.check_in)}</td>
          <td>${formatTime(row.check_out)}</td>
          <td>${badgeHtml}</td>
          <td>
            <button class="small-btn grey btn-request-corr" data-date="${row.date}">Request Correction</button>
          </td>
        </tr>
      `;
    }

    const corrBtns = attendanceTable.querySelectorAll(".btn-request-corr");
    for (let j = 0; j < corrBtns.length; j++) {
      corrBtns[j].onclick = () => {
        correctionDate.value = corrBtns[j].dataset.date;
        correctionReason.value = "";
        openModal("correctionModal");
      };
    }
  } catch (error) {
    console.error("Personal attendance load error:", error);
  }
};

// 5. Correction Modal triggers
btnOpenCorrectionModal.onclick = () => {
  correctionDate.value = getToday();
  correctionReason.value = "";
  openModal("correctionModal");
};

btnCloseCorrectionModal.onclick = () => closeModal("correctionModal");
btnCancelCorrection.onclick = () => closeModal("correctionModal");

btnSubmitCorrection.onclick = async () => {
  if (!currentEmpRecord) return;
  const targetDate = correctionDate.value;
  const reason = correctionReason.value.trim();

  if (!targetDate || !reason || reason.length < 3) {
    Swal.fire({ icon: "warning", title: "Validation Error", text: "Please provide both date and a valid reason." });
    return;
  }

  setButtonLoading(btnSubmitCorrection, "Submitting...");
  try {
    const { error } = await supabase.from("corrections").insert({
      employee_id: currentEmpRecord.id,
      date: targetDate,
      reason: reason,
      status: "pending"
    });

    if (error) {
      Swal.fire({ icon: "error", title: "Submission Failed", text: error.message });
      return;
    }

    await addAuditLog("REQUEST_CORRECTION", `employee: ${currentEmpRecord.code}`, null, { date: targetDate, reason: reason });
    closeModal("correctionModal");
    Swal.fire({
      icon: "success",
      title: "Correction Submitted",
      text: "Your correction request has been routed to HR for review."
    });
  } catch (error) {
    console.error("Submit correction error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  } finally {
    restoreButton(btnSubmitCorrection);
  }
};

// 6. Admin / HR Attendance Board
const loadAttendanceBoard = async () => {
  const selectedDate = boardDate.value || getToday();
  const selectedDeptId = boardDept.value;

  try {
    // 1. All active employees fetch kar rahe hain
    let empQuery = supabase.from("employees").select("id, code, name, department_id, departments(name)").eq("status", "active");
    if (selectedDeptId) {
      empQuery = empQuery.eq("department_id", selectedDeptId);
    }
    const { data: employeesData } = await empQuery.order("name");

    // 2. Attendance records for that date
    const { data: attData } = await supabase.from("attendance").select("*").eq("date", selectedDate);

    // 3. Approved leaves on that date
    const { data: leavesData } = await supabase
      .from("leaves")
      .select("employee_id")
      .eq("status", "approved")
      .lte("start_date", selectedDate)
      .gte("end_date", selectedDate);

    const onLeaveEmpIds = (leavesData || []).map((l) => l.employee_id);
    const attMap = {};
    for (let a = 0; a < (attData || []).length; a++) {
      attMap[attData[a].employee_id] = attData[a];
    }

    tableTitle.innerText = `Attendance Board for ${selectedDate}`;
    attendanceTable.innerHTML = "";

    if (!employeesData || employeesData.length === 0) {
      attendanceTable.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 24px;">No employees in selected filter.</td></tr>`;
      return;
    }

    for (let i = 0; i < employeesData.length; i++) {
      const emp = employeesData[i];
      const deptName = emp.departments ? emp.departments.name : "-";
      const att = attMap[emp.id];

      let checkInTime = "-";
      let checkOutTime = "-";
      let statusKey = "absent";

      if (att) {
        checkInTime = formatTime(att.check_in);
        checkOutTime = formatTime(att.check_out);
        statusKey = att.status;

        // Missing checkout rule
        if (att.check_in && !att.check_out && selectedDate < getToday()) {
          statusKey = "missing_checkout";
        }
      } else if (onLeaveEmpIds.includes(emp.id)) {
        statusKey = "on_leave";
      } else if (selectedDate > getToday()) {
        statusKey = "upcoming";
      }

      const badgeHtml = `<span class="badge ${statusKey}">${statusKey.replace("_", " ").toUpperCase()}</span>`;

      attendanceTable.innerHTML += `
        <tr>
          <td>${selectedDate}</td>
          <td><strong>${emp.name}</strong> (${emp.code})</td>
          <td>${deptName}</td>
          <td>${checkInTime}</td>
          <td>${checkOutTime}</td>
          <td>${badgeHtml}</td>
          <td>-</td>
        </tr>
      `;
    }
  } catch (error) {
    console.error("Attendance board load error:", error);
  }
};

btnRefreshBoard.onclick = loadAttendanceBoard;

// 7. Load Pending Corrections (HR & Admin)
const loadPendingCorrections = async () => {
  try {
    const { data, error } = await supabase
      .from("corrections")
      .select("*, employees(name, code, user_id)")
      .eq("status", "pending")
      .order("date", { ascending: false });

    if (error) {
      console.error("Fetch corrections error:", error);
      return;
    }

    correctionsTable.innerHTML = "";
    if (!data || data.length === 0) {
      correctionsTable.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 20px;">No pending correction requests.</td></tr>`;
      return;
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const empName = item.employees ? `${item.employees.name} (${item.employees.code})` : "Employee #" + item.employee_id;

      correctionsTable.innerHTML += `
        <tr>
          <td><strong>${empName}</strong></td>
          <td>${item.date}</td>
          <td>${item.reason}</td>
          <td><span class="badge pending">PENDING</span></td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="small-btn green btn-approve-corr" data-id="${item.id}" data-emp="${item.employee_id}" data-date="${item.date}" data-uid="${item.employees?.user_id}">Approve</button>
              <button class="small-btn red btn-reject-corr" data-id="${item.id}" data-uid="${item.employees?.user_id}">Reject</button>
            </div>
          </td>
        </tr>
      `;
    }

    // Approve handlers
    const approveBtns = correctionsTable.querySelectorAll(".btn-approve-corr");
    for (let a = 0; a < approveBtns.length; a++) {
      approveBtns[a].onclick = async () => {
        const cId = approveBtns[a].dataset.id;
        const empId = approveBtns[a].dataset.emp;
        const targetDate = approveBtns[a].dataset.date;
        const empUserId = approveBtns[a].dataset.uid;
        await resolveCorrection(cId, empId, targetDate, "approved", empUserId);
      };
    }

    // Reject handlers
    const rejectBtns = correctionsTable.querySelectorAll(".btn-reject-corr");
    for (let r = 0; r < rejectBtns.length; r++) {
      rejectBtns[r].onclick = async () => {
        const cId = rejectBtns[r].dataset.id;
        const empUserId = rejectBtns[r].dataset.uid;
        await resolveCorrection(cId, null, null, "rejected", empUserId);
      };
    }
  } catch (error) {
    console.error("Load corrections error:", error);
  }
};

// 8. Resolve Correction (Approve/Reject)
const resolveCorrection = async (correctionId, employeeId, targetDate, decision, empUserId) => {
  const result = await Swal.fire({
    icon: "question",
    title: `Confirm ${decision.toUpperCase()}`,
    text: `Are you sure you want to mark this correction as ${decision}?`,
    showCancelButton: true,
    confirmButtonText: `Yes, ${decision}`
  });

  if (!result.isConfirmed) return;

  try {
    // 1. Correction record update
    await supabase.from("corrections").update({
      status: decision,
      reviewed_by: currentUserProfile.id,
      reviewed_at: new Date().toISOString()
    }).eq("id", correctionId);

    // 2. Agar approve hui to attendance record ko 'present' status set karte hain
    if (decision === "approved" && employeeId && targetDate) {
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("employee_id", employeeId)
        .eq("date", targetDate)
        .maybeSingle();

      if (existing) {
        await supabase.from("attendance").update({ status: "present" }).eq("id", existing.id);
      } else {
        await supabase.from("attendance").insert({
          employee_id: employeeId,
          date: targetDate,
          check_in: new Date(`${targetDate}T09:00:00Z`).toISOString(),
          check_out: new Date(`${targetDate}T17:00:00Z`).toISOString(),
          status: "present"
        });
      }
    }

    // 3. Employee ko notification bhejte hain
    if (empUserId) {
      await sendNotification(empUserId, `Your attendance correction for ${targetDate || 'date'} was ${decision} by HR.`);
    }

    await addAuditLog(`CORRECTION_${decision.toUpperCase()}`, "corrections", { id: correctionId }, { decision: decision });
    Swal.fire({ icon: "success", title: "Resolved", text: `Correction marked as ${decision}.` });

    await loadPendingCorrections();
    if (isManager) await loadAttendanceBoard();
  } catch (error) {
    console.error("Resolve correction error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  }
};

// 9. Department dropdown for board filter
const loadBoardDepartments = async () => {
  try {
    const { data: depts } = await supabase.from("departments").select("*").order("name");
    boardDept.innerHTML = `<option value="">All Departments</option>`;
    for (let i = 0; i < (depts || []).length; i++) {
      boardDept.innerHTML += `<option value="${depts[i].id}">${depts[i].name}</option>`;
    }
  } catch (e) {
    console.error("Depts board load error:", e);
  }
};

// Initialization
const initAttendance = async () => {
  const authInfo = await checkLogin();
  if (!authInfo) return;

  currentUserProfile = authInfo.profile;
  currentEmpRecord = authInfo.employee;
  isManager = currentUserProfile.role === "admin" || currentUserProfile.role === "hr";

  if (currentEmpRecord) {
    employeePunchBox.style.display = "block";
    await checkTodayPunchState();
    await loadEmployeeAttendanceHistory();
  }

  if (isManager) {
    adminBoardFilters.style.display = "block";
    pendingCorrectionsBox.style.display = "block";
    boardDate.value = getToday();
    await loadBoardDepartments();
    await loadAttendanceBoard();
    await loadPendingCorrections();
  }
};

initAttendance();
