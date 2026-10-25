// ============================================================================
// leave.js - Leave Application, Quotas, Working-Days Calculation, and Approvals
// ============================================================================
import supabase from "./credential.js";
import Swal from "./alert.js";
import { leaveApplicationValidation } from "./validation.js";
import {
  checkLogin,
  setButtonLoading,
  restoreButton,
  addAuditLog,
  sendNotification,
  openModal,
  closeModal,
  calculateWorkingDays,
  getToday
} from "./common.js";

// DOM elements
const leaveBalanceContainer = document.getElementById("leaveBalanceContainer");
const balanceCards = document.getElementById("balanceCards");
const applyLeaveBox = document.getElementById("applyLeaveBox");

const leaveTypeSelect = document.getElementById("leaveTypeSelect");
const leaveStart = document.getElementById("leaveStart");
const leaveEnd = document.getElementById("leaveEnd");
const leaveReason = document.getElementById("leaveReason");
const workingDaysPreview = document.getElementById("workingDaysPreview");
const btnSubmitLeave = document.getElementById("btnSubmitLeave");

const hrApprovalsBox = document.getElementById("hrApprovalsBox");
const approvalsTable = document.getElementById("approvalsTable");
const leavesHistoryTitle = document.getElementById("leavesHistoryTitle");
const leavesHistoryTable = document.getElementById("leavesHistoryTable");

// Review Modal elements
const btnCloseReviewModal = document.getElementById("btnCloseReviewModal");
const btnCancelReview = document.getElementById("btnCancelReview");
const btnConfirmReview = document.getElementById("btnConfirmReview");
const reviewLeaveId = document.getElementById("reviewLeaveId");
const reviewDecision = document.getElementById("reviewDecision");
const reviewEmpUserId = document.getElementById("reviewEmpUserId");
const reviewEmpDetails = document.getElementById("reviewEmpDetails");
const reviewComment = document.getElementById("reviewComment");
const reviewModalTitle = document.getElementById("reviewModalTitle");

let currentUserProfile = null;
let currentEmpRecord = null;
let isManager = false;
let leaveTypesList = [];
let holidaysList = [];

// 1. Leave Types aur Holidays load karna
const loadMeta = async () => {
  try {
    const { data: ltData } = await supabase.from("leave_types").select("*").order("id");
    leaveTypesList = ltData || [];

    leaveTypeSelect.innerHTML = `<option value="">Select Leave Type</option>`;
    for (let i = 0; i < leaveTypesList.length; i++) {
      const quotaStr = leaveTypesList[i].quota === null ? "Unlimited" : `${leaveTypesList[i].quota} days/yr`;
      leaveTypeSelect.innerHTML += `<option value="${leaveTypesList[i].id}">${leaveTypesList[i].name} (${quotaStr})</option>`;
    }

    const { data: hData } = await supabase.from("holidays").select("date");
    holidaysList = (hData || []).map((h) => h.date);
  } catch (error) {
    console.error("Meta load error:", error);
  }
};

// 2. Working days live preview
const updateDaysPreview = () => {
  const start = leaveStart.value;
  const end = leaveEnd.value;
  if (!start || !end || start > end) {
    workingDaysPreview.innerText = "";
    return;
  }

  const days = calculateWorkingDays(start, end, holidaysList);
  workingDaysPreview.innerText = `Total Deductible Days: ${days} (working days only)`;
};

leaveStart.onchange = updateDaysPreview;
leaveEnd.onchange = updateDaysPreview;

// 3. Employee Leave Balances Calculate & Render
const loadLeaveBalances = async () => {
  if (!currentEmpRecord) return;

  const currentYear = getToday().substring(0, 4);

  try {
    // Current year ke approved leaves fetch karte hain
    const { data: approvedLeaves } = await supabase
      .from("leaves")
      .select("leave_type_id, days")
      .eq("employee_id", currentEmpRecord.id)
      .eq("status", "approved")
      .gte("start_date", `${currentYear}-01-01`);

    const usedMap = {};
    for (let i = 0; i < (approvedLeaves || []).length; i++) {
      const tid = approvedLeaves[i].leave_type_id;
      usedMap[tid] = (usedMap[tid] || 0) + Number(approvedLeaves[i].days);
    }

    balanceCards.innerHTML = "";
    for (let j = 0; j < leaveTypesList.length; j++) {
      const type = leaveTypesList[j];
      const used = usedMap[type.id] || 0;
      let remainingText = "Unlimited";

      if (type.quota !== null) {
        const remaining = Math.max(0, type.quota - used);
        remainingText = `${remaining} / ${type.quota} Days Left`;
      }

      balanceCards.innerHTML += `
        <div class="card">
          <p style="color: var(--muted); font-size: 13px;">${type.name} Leave</p>
          <h3 style="margin-top: 6px; font-size: 22px;">${remainingText}</h3>
          <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">Used: ${used} Days</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("Leave balances load error:", error);
  }
};

// 4. Submit Leave Application with Overlap & Quota Guard (422)
btnSubmitLeave.onclick = async () => {
  if (!currentEmpRecord) return;

  const ltId = leaveTypeSelect.value;
  const start = leaveStart.value;
  const end = leaveEnd.value;
  const reason = leaveReason.value.trim();

  const isValid = leaveApplicationValidation(ltId, start, end, reason);
  if (!isValid) return;

  // Working days count (skip Sat-Sun aur holidays)
  const daysCount = calculateWorkingDays(start, end, holidaysList);
  if (daysCount <= 0) {
    Swal.fire({
      icon: "warning",
      title: "Zero Working Days",
      text: "The selected date range contains only weekends or public holidays. No working days to deduct."
    });
    return;
  }

  setButtonLoading(btnSubmitLeave, "Validating...");

  try {
    // 1. Overlap Check (Status 422)
    const { data: overlapping } = await supabase
      .from("leaves")
      .select("id, start_date, end_date")
      .eq("employee_id", currentEmpRecord.id)
      .in("status", ["pending", "approved"])
      .lte("start_date", end)
      .gte("end_date", start);

    if (overlapping && overlapping.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Leave Overlap (422)",
        text: `You already have an active leave application between ${overlapping[0].start_date} and ${overlapping[0].end_date}. Overlapping dates are not allowed.`
      });
      return;
    }

    // 2. Quota Check (Status 422)
    const matchedType = leaveTypesList.find((t) => String(t.id) === String(ltId));
    if (matchedType && matchedType.quota !== null) {
      const currentYear = getToday().substring(0, 4);
      const { data: approvedLeaves } = await supabase
        .from("leaves")
        .select("days")
        .eq("employee_id", currentEmpRecord.id)
        .eq("leave_type_id", ltId)
        .eq("status", "approved")
        .gte("start_date", `${currentYear}-01-01`);

      let totalUsed = 0;
      for (let u = 0; u < (approvedLeaves || []).length; u++) {
        totalUsed += Number(approvedLeaves[u].days);
      }

      if (totalUsed + daysCount > matchedType.quota) {
        const remaining = Math.max(0, matchedType.quota - totalUsed);
        Swal.fire({
          icon: "warning",
          title: "Insufficient Balance (422)",
          text: `You requested ${daysCount} working days, but only ${remaining} days remain in your annual ${matchedType.name} quota (${matchedType.quota} total).`
        });
        return;
      }
    }

    // 3. Insert leave application
    const leavePayload = {
      employee_id: currentEmpRecord.id,
      leave_type_id: Number(ltId),
      start_date: start,
      end_date: end,
      days: daysCount,
      reason: reason,
      status: "pending"
    };

    const { error: insertError } = await supabase.from("leaves").insert(leavePayload);
    if (insertError) {
      Swal.fire({ icon: "error", title: "Submission Failed", text: insertError.message });
      return;
    }

    await addAuditLog("APPLY_LEAVE", `employee: ${currentEmpRecord.code}`, null, leavePayload);
    Swal.fire({
      icon: "success",
      title: "Application Submitted",
      text: `Your request for ${daysCount} working days has been forwarded to HR for approval.`
    });

    leaveReason.value = "";
    leaveStart.value = "";
    leaveEnd.value = "";
    workingDaysPreview.innerText = "";

    await loadLeaveBalances();
    await loadLeavesHistory();
  } catch (error) {
    console.error("Apply leave error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  } finally {
    restoreButton(btnSubmitLeave);
  }
};

// 5. Leave History Table Load
const loadLeavesHistory = async () => {
  try {
    let query = supabase
      .from("leaves")
      .select("*, employees(name, code, user_id), leave_types(name)")
      .order("created_at", { ascending: false });

    // Agar employee hai to sirf apna data dekhe
    if (!isManager && currentEmpRecord) {
      query = query.eq("employee_id", currentEmpRecord.id);
      leavesHistoryTitle.innerText = "My Leave History";
    } else {
      leavesHistoryTitle.innerText = "All Staff Leave Records";
    }

    const { data, error } = await query;
    if (error) {
      console.error("Fetch leave history error:", error);
      return;
    }

    leavesHistoryTable.innerHTML = "";
    if (!data || data.length === 0) {
      leavesHistoryTable.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--muted); padding: 24px;">No leave applications found.</td></tr>`;
      return;
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const empName = item.employees ? `${item.employees.name} (${item.employees.code})` : "Employee #" + item.employee_id;
      const typeName = item.leave_types ? item.leave_types.name : "-";
      const statusBadge = `<span class="badge ${item.status}">${item.status.toUpperCase()}</span>`;

      // Cancel button agar pending hai
      const isOwnPending = currentEmpRecord && item.employee_id === currentEmpRecord.id && item.status === "pending";
      const actionHtml = isOwnPending
        ? `<button class="small-btn red btn-cancel-leave" data-id="${item.id}">Cancel</button>`
        : `<span style="color: var(--muted);">-</span>`;

      leavesHistoryTable.innerHTML += `
        <tr>
          <td><strong>${empName}</strong></td>
          <td>${typeName}</td>
          <td>${item.start_date} to ${item.end_date}</td>
          <td><strong>${item.days} Days</strong></td>
          <td>${item.reason || "-"}</td>
          <td>${statusBadge}</td>
          <td><small style="color: var(--muted);">${item.comment || "-"}</small></td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }

    // Cancel listeners
    const cancelBtns = leavesHistoryTable.querySelectorAll(".btn-cancel-leave");
    for (let c = 0; c < cancelBtns.length; c++) {
      cancelBtns[c].onclick = async () => {
        const id = cancelBtns[c].dataset.id;
        await cancelMyLeave(id);
      };
    }
  } catch (error) {
    console.error("Leave history load error:", error);
  }
};

// 6. Cancel pending leave by employee
const cancelMyLeave = async (leaveId) => {
  const result = await Swal.fire({
    icon: "question",
    title: "Cancel Application",
    text: "Are you sure you want to cancel this pending leave request?",
    showCancelButton: true,
    confirmButtonText: "Yes, Cancel Request"
  });

  if (!result.isConfirmed) return;

  try {
    const { error } = await supabase.from("leaves").update({ status: "cancelled" }).eq("id", leaveId);
    if (error) {
      Swal.fire({ icon: "error", title: "Error", text: error.message });
      return;
    }

    await addAuditLog("CANCEL_LEAVE", "leaves", { id: leaveId }, { status: "cancelled" });
    Swal.fire({ icon: "success", title: "Cancelled", text: "Leave application cancelled." });

    await loadLeaveBalances();
    await loadLeavesHistory();
  } catch (error) {
    console.error("Cancel leave error:", error);
  }
};

// 7. HR Approvals Queue Load
const loadApprovalsQueue = async () => {
  try {
    const { data, error } = await supabase
      .from("leaves")
      .select("*, employees(name, code, user_id), leave_types(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fetch pending leaves error:", error);
      return;
    }

    approvalsTable.innerHTML = "";
    if (!data || data.length === 0) {
      approvalsTable.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 20px;">No pending leave applications requiring approval.</td></tr>`;
      return;
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const empName = item.employees ? `${item.employees.name} (${item.employees.code})` : "Employee #" + item.employee_id;
      const typeName = item.leave_types ? item.leave_types.name : "-";

      approvalsTable.innerHTML += `
        <tr>
          <td><strong>${empName}</strong></td>
          <td>${typeName}</td>
          <td>${item.start_date} to ${item.end_date}</td>
          <td><strong>${item.days} Days</strong></td>
          <td>${item.reason}</td>
          <td><span class="badge pending">PENDING</span></td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="small-btn green btn-decision" data-id="${item.id}" data-action="approved" data-emp="${empName}" data-days="${item.days}" data-uid="${item.employees?.user_id}">Approve</button>
              <button class="small-btn red btn-decision" data-id="${item.id}" data-action="rejected" data-emp="${empName}" data-days="${item.days}" data-uid="${item.employees?.user_id}">Reject</button>
            </div>
          </td>
        </tr>
      `;
    }

    const decisionBtns = approvalsTable.querySelectorAll(".btn-decision");
    for (let d = 0; d < decisionBtns.length; d++) {
      decisionBtns[d].onclick = () => {
        const id = decisionBtns[d].dataset.id;
        const action = decisionBtns[d].dataset.action;
        const empName = decisionBtns[d].dataset.emp;
        const days = decisionBtns[d].dataset.days;
        const uid = decisionBtns[d].dataset.uid;

        reviewLeaveId.value = id;
        reviewDecision.value = action;
        reviewEmpUserId.value = uid || "";
        reviewModalTitle.innerText = `${action.toUpperCase()} Leave Request`;
        reviewEmpDetails.innerText = `Decision for: ${empName} (${days} working days)`;
        reviewComment.value = "";
        btnConfirmReview.className = action === "approved" ? "add-btn" : "small-btn red";
        btnConfirmReview.innerText = `Confirm ${action.toUpperCase()}`;

        openModal("reviewModal");
      };
    }
  } catch (error) {
    console.error("Load approvals queue error:", error);
  }
};

btnCloseReviewModal.onclick = () => closeModal("reviewModal");
btnCancelReview.onclick = () => closeModal("reviewModal");

// 8. Confirm Leave Review Decision
btnConfirmReview.onclick = async () => {
  const id = reviewLeaveId.value;
  const decision = reviewDecision.value;
  const comment = reviewComment.value.trim();
  const targetUid = reviewEmpUserId.value;

  setButtonLoading(btnConfirmReview, "Saving...");
  try {
    const { error } = await supabase.from("leaves").update({
      status: decision,
      comment: comment || null,
      reviewed_by: currentUserProfile.id,
      reviewed_at: new Date().toISOString()
    }).eq("id", id);

    if (error) {
      Swal.fire({ icon: "error", title: "Error", text: error.message });
      return;
    }

    // Employee ko notification bhejte hain
    if (targetUid) {
      const msg = `Your leave application has been ${decision} by HR.${comment ? ' Comment: ' + comment : ''}`;
      await sendNotification(targetUid, msg);
    }

    await addAuditLog(`LEAVE_${decision.toUpperCase()}`, "leaves", { id: id }, { decision: decision, comment: comment });
    closeModal("reviewModal");

    Swal.fire({
      icon: "success",
      title: "Decision Recorded",
      text: `Leave request has been marked as ${decision}.`
    });

    await loadApprovalsQueue();
    await loadLeavesHistory();
  } catch (error) {
    console.error("Confirm review error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  } finally {
    restoreButton(btnConfirmReview);
  }
};

// Initialization
const initLeave = async () => {
  const authInfo = await checkLogin();
  if (!authInfo) return;

  currentUserProfile = authInfo.profile;
  currentEmpRecord = authInfo.employee;
  isManager = currentUserProfile.role === "admin" || currentUserProfile.role === "hr";

  await loadMeta();

  if (currentEmpRecord) {
    leaveBalanceContainer.style.display = "block";
    applyLeaveBox.style.display = "block";
    await loadLeaveBalances();
  }

  if (isManager) {
    hrApprovalsBox.style.display = "block";
    await loadApprovalsQueue();
  }

  await loadLeavesHistory();
};

initLeave();
