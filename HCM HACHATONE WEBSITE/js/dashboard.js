// ============================================================================
// dashboard.js - Executive, HR & Employee Intelligence Dashboard
// ============================================================================
import supabase from "./credential.js";
import Swal from "./alert.js";
import { checkLogin, getToday, formatDate } from "./common.js";

// DOM elements
const welcomeTitle = document.getElementById("welcomeTitle");
const welcomeSubtitle = document.getElementById("welcomeSubtitle");
const filterBox = document.getElementById("filterBox");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");
const deptFilter = document.getElementById("deptFilter");
const btnApplyFilters = document.getElementById("btnApplyFilters");
const cards = document.getElementById("cards");

// Panel breakdown containers
const panelAttStatus = document.getElementById("panelAttStatus");
const chartAttStatus = document.getElementById("chartAttStatus");
const panelLateComers = document.getElementById("panelLateComers");
const chartLateComers = document.getElementById("chartLateComers");
const panelLeaveTypes = document.getElementById("panelLeaveTypes");
const chartLeaveTypes = document.getElementById("chartLeaveTypes");
const panelDeptHeadcount = document.getElementById("panelDeptHeadcount");
const chartDeptHeadcount = document.getElementById("chartDeptHeadcount");

const annList = document.getElementById("annList");
const notifList = document.getElementById("notifList");

let currentUserProfile = null;
let currentEmpRecord = null;
let isManager = false;

// Bar row generator for aesthetic visualization
const renderBarRow = (label, value, maxVal) => {
  const percentage = maxVal > 0 ? Math.min(100, Math.round((value / maxVal) * 100)) : 0;
  return `
    <div class="bar-row" style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-size: 13px;">
      <span style="width: 130px; font-weight: 600; color: var(--text-secondary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${label}</span>
      <div style="flex: 1; height: 10px; background: var(--bg); border-radius: 999px; overflow: hidden; border: 1px solid var(--border);">
        <div style="height: 100%; width: ${percentage}%; background: var(--primary-gradient); border-radius: 999px;"></div>
      </div>
      <b style="width: 45px; text-align: right;">${value}</b>
    </div>
  `;
};

// 1. Employee Self-Service Personal Dashboard
const loadEmployeePersonalDashboard = async () => {
  if (!currentEmpRecord) return;

  const today = getToday();

  // 1. Check today's punch
  const { data: todayAtt } = await supabase
    .from("attendance")
    .select("status, check_in")
    .eq("employee_id", currentEmpRecord.id)
    .eq("date", today)
    .maybeSingle();

  const punchText = todayAtt ? todayAtt.status.toUpperCase() : "Not Punched";

  // 2. Count used leaves
  const currentYear = today.substring(0, 4);
  const { data: leaves } = await supabase
    .from("leaves")
    .select("days")
    .eq("employee_id", currentEmpRecord.id)
    .eq("status", "approved")
    .gte("start_date", `${currentYear}-01-01`);

  let totalLeavesUsed = 0;
  for (let l = 0; l < (leaves || []).length; l++) {
    totalLeavesUsed += Number(leaves[l].days);
  }

  // 3. Latest payslip net pay
  const { data: latestSlip } = await supabase
    .from("payslips")
    .select("net, payroll_runs(month)")
    .eq("employee_id", currentEmpRecord.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const netPayDisplay = latestSlip ? `PKR ${Number(latestSlip.net).toLocaleString()}` : "Pending";
  const netPaySub = latestSlip?.payroll_runs ? `Month: ${latestSlip.payroll_runs.month}` : "No payslip yet";

  // 4. Pending applications
  const { data: pendingL } = await supabase.from("leaves").select("id").eq("employee_id", currentEmpRecord.id).eq("status", "pending");
  const { data: pendingC } = await supabase.from("corrections").select("id").eq("employee_id", currentEmpRecord.id).eq("status", "pending");
  const pendingTotal = (pendingL?.length || 0) + (pendingC?.length || 0);

  cards.innerHTML = `
    <div class="card">
      <p style="color: var(--muted); font-size: 13px;">Today's Punch Status</p>
      <h3 style="margin-top: 6px; font-size: 24px; color: var(--primary);">${punchText}</h3>
      <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">${today}</p>
    </div>
    <div class="card">
      <p style="color: var(--muted); font-size: 13px;">Leave Days Used (${currentYear})</p>
      <h3 style="margin-top: 6px; font-size: 24px;">${totalLeavesUsed} Days</h3>
      <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">Approved absence</p>
    </div>
    <div class="card">
      <p style="color: var(--muted); font-size: 13px;">Latest Net Pay</p>
      <h3 style="margin-top: 6px; font-size: 24px; color: var(--success);">${netPayDisplay}</h3>
      <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">${netPaySub}</p>
    </div>
    <div class="card">
      <p style="color: var(--muted); font-size: 13px;">Pending Requests</p>
      <h3 style="margin-top: 6px; font-size: 24px; color: var(--warning);">${pendingTotal}</h3>
      <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">Awaiting HR review</p>
    </div>
  `;
};

// 2. Manager / Executive KPI Dashboard
const loadManagerDashboard = async () => {
  const from = fromDate.value;
  const to = toDate.value;
  const selectedDeptId = deptFilter.value;
  const today = getToday();

  // 1. Employees query
  let empQuery = supabase.from("employees").select("id, name, code, basic, status, department_id, departments(name)");
  if (selectedDeptId) {
    empQuery = empQuery.eq("department_id", selectedDeptId);
  }
  const { data: empData } = await empQuery;
  const allEmps = empData || [];

  const activeEmps = allEmps.filter((e) => e.status === "active");
  const inactiveEmps = allEmps.filter((e) => e.status === "inactive");

  const headcount = activeEmps.length;
  let totalPayrollCost = 0;
  for (let e = 0; e < activeEmps.length; e++) {
    totalPayrollCost += (Number(activeEmps[e].basic) || 0) * 1.5;
  }
  const avgSalary = headcount > 0 ? Math.round(totalPayrollCost / headcount) : 0;
  const attritionRate = allEmps.length > 0 ? ((inactiveEmps.length / allEmps.length) * 100).toFixed(1) + "%" : "0%";

  // 2. Attendance today
  const activeEmpIds = activeEmps.map((e) => e.id);
  const { data: attToday } = await supabase
    .from("attendance")
    .select("employee_id, status")
    .eq("date", today)
    .in("employee_id", activeEmpIds.length > 0 ? activeEmpIds : [-1]);

  let presentTodayCount = 0;
  let lateTodayCount = 0;
  for (let a = 0; a < (attToday || []).length; a++) {
    if (attToday[a].status === "present" || attToday[a].status === "late") {
      presentTodayCount++;
    }
    if (attToday[a].status === "late") {
      lateTodayCount++;
    }
  }

  // 3. On leave today
  const { data: leavesToday } = await supabase
    .from("leaves")
    .select("employee_id")
    .eq("status", "approved")
    .lte("start_date", today)
    .gte("end_date", today)
    .in("employee_id", activeEmpIds.length > 0 ? activeEmpIds : [-1]);

  const onLeaveTodayCount = leavesToday ? leavesToday.length : 0;

  // 4. Pending approvals
  const { data: pendingL } = await supabase.from("leaves").select("id").eq("status", "pending");
  const { data: pendingC } = await supabase.from("corrections").select("id").eq("status", "pending");
  const pendingApprovalsCount = (pendingL?.length || 0) + (pendingC?.length || 0);

  // Cards render
  cards.innerHTML = `
    <div class="card">
      <p style="color: var(--muted); font-size: 13px;">Active Headcount</p>
      <h3 style="margin-top: 6px; font-size: 26px;">${headcount}</h3>
      <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">Total workforce</p>
    </div>
    <div class="card">
      <p style="color: var(--muted); font-size: 13px;">Present Today</p>
      <h3 style="margin-top: 6px; font-size: 26px; color: var(--success);">${presentTodayCount}</h3>
      <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">Clocked in</p>
    </div>
    <div class="card">
      <p style="color: var(--muted); font-size: 13px;">Late Today</p>
      <h3 style="margin-top: 6px; font-size: 26px; color: var(--warning);">${lateTodayCount}</h3>
      <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">After grace period</p>
    </div>
    <div class="card">
      <p style="color: var(--muted); font-size: 13px;">On Leave Today</p>
      <h3 style="margin-top: 6px; font-size: 26px; color: var(--info);">${onLeaveTodayCount}</h3>
      <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">Approved leaves</p>
    </div>
    <div class="card">
      <p style="color: var(--muted); font-size: 13px;">Pending Approvals</p>
      <h3 style="margin-top: 6px; font-size: 26px; color: var(--danger);">${pendingApprovalsCount}</h3>
      <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">Leaves & Corrections</p>
    </div>
    <div class="card">
      <p style="color: var(--muted); font-size: 13px;">Est. Payroll Cost</p>
      <h3 style="margin-top: 6px; font-size: 24px; color: var(--primary);">PKR ${(totalPayrollCost / 1000).toFixed(0)}k</h3>
      <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">Gross cost / month</p>
    </div>
    <div class="card">
      <p style="color: var(--muted); font-size: 13px;">Average Salary</p>
      <h3 style="margin-top: 6px; font-size: 24px;">PKR ${(avgSalary / 1000).toFixed(0)}k</h3>
      <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">Per employee</p>
    </div>
    <div class="card">
      <p style="color: var(--muted); font-size: 13px;">Attrition Rate</p>
      <h3 style="margin-top: 6px; font-size: 24px;">${attritionRate}</h3>
      <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">Inactive ratio</p>
    </div>
  `;

  // 5. Attendance Breakdown within Date Range
  const { data: rangeAtt } = await supabase
    .from("attendance")
    .select("status, employee_id")
    .gte("date", from)
    .lte("date", to)
    .in("employee_id", activeEmpIds.length > 0 ? activeEmpIds : [-1]);

  const attStatusCounts = { Present: 0, Late: 0, "Half Day": 0, Absent: 0 };
  const lateEmpCounts = {};

  for (let r = 0; r < (rangeAtt || []).length; r++) {
    const s = rangeAtt[r].status;
    if (s === "present") attStatusCounts.Present++;
    if (s === "late") {
      attStatusCounts.Late++;
      lateEmpCounts[rangeAtt[r].employee_id] = (lateEmpCounts[rangeAtt[r].employee_id] || 0) + 1;
    }
    if (s === "half_day") attStatusCounts["Half Day"]++;
    if (s === "absent") attStatusCounts.Absent++;
  }

  let maxAttVal = Math.max(...Object.values(attStatusCounts), 1);
  chartAttStatus.innerHTML = "";
  for (const [st, val] of Object.entries(attStatusCounts)) {
    chartAttStatus.innerHTML += renderBarRow(st, val, maxAttVal);
  }

  // 6. Top 5 Late Comers
  const sortedLate = Object.entries(lateEmpCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  chartLateComers.innerHTML = "";
  if (sortedLate.length === 0) {
    chartLateComers.innerHTML = `<p style="color: var(--muted); font-size: 13px;">No late comers recorded in this period.</p>`;
  } else {
    const maxLate = sortedLate[0][1];
    for (let l = 0; l < sortedLate.length; l++) {
      const empId = Number(sortedLate[l][0]);
      const lateTimes = sortedLate[l][1];
      const foundEmp = activeEmps.find((e) => e.id === empId);
      const name = foundEmp ? foundEmp.name : "Employee #" + empId;
      chartLateComers.innerHTML += renderBarRow(name, lateTimes + " times", maxLate);
    }
  }

  // 7. Leaves by Type
  const { data: rangeLeaves } = await supabase
    .from("leaves")
    .select("days, leave_types(name)")
    .eq("status", "approved")
    .gte("start_date", from)
    .lte("end_date", to);

  const leaveTypeMap = {};
  for (let lt = 0; lt < (rangeLeaves || []).length; lt++) {
    const tName = rangeLeaves[lt].leave_types ? rangeLeaves[lt].leave_types.name : "Other";
    leaveTypeMap[tName] = (leaveTypeMap[tName] || 0) + Number(rangeLeaves[lt].days);
  }

  chartLeaveTypes.innerHTML = "";
  const leaveEntries = Object.entries(leaveTypeMap);
  if (leaveEntries.length === 0) {
    chartLeaveTypes.innerHTML = `<p style="color: var(--muted); font-size: 13px;">No approved leaves in this range.</p>`;
  } else {
    const maxLeave = Math.max(...Object.values(leaveTypeMap), 1);
    for (const [tName, dCount] of leaveEntries) {
      chartLeaveTypes.innerHTML += renderBarRow(tName, dCount + " days", maxLeave);
    }
  }

  // 8. Headcount by Department
  const deptCountMap = {};
  for (let d = 0; d < activeEmps.length; d++) {
    const dName = activeEmps[d].departments ? activeEmps[d].departments.name : "Unassigned";
    deptCountMap[dName] = (deptCountMap[dName] || 0) + 1;
  }

  chartDeptHeadcount.innerHTML = "";
  const deptEntries = Object.entries(deptCountMap);
  if (deptEntries.length === 0) {
    chartDeptHeadcount.innerHTML = `<p style="color: var(--muted); font-size: 13px;">No department assignments.</p>`;
  } else {
    const maxDept = Math.max(...Object.values(deptCountMap), 1);
    for (const [dName, cNum] of deptEntries) {
      chartDeptHeadcount.innerHTML += renderBarRow(dName, cNum + " staff", maxDept);
    }
  }
};

// Apply Filter Click
btnApplyFilters.onclick = loadManagerDashboard;

// 3. Load Recent Announcements
const loadAnnouncementsFeed = async () => {
  try {
    const { data: anns } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(3);
    annList.innerHTML = "";
    if (!anns || anns.length === 0) {
      annList.innerHTML = `<p style="color: var(--muted); font-size: 13px;">No announcements posted yet.</p>`;
      return;
    }

    for (let i = 0; i < anns.length; i++) {
      const a = anns[i];
      annList.innerHTML += `
        <div style="padding: 12px 0; border-bottom: 1px solid var(--border);">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${a.title}</div>
          <p style="color: var(--text-secondary); font-size: 13px; line-height: 1.5;">${a.body}</p>
          <small style="color: var(--muted); font-size: 11px;">By ${a.author_name} • ${formatDate(a.created_at)}</small>
        </div>
      `;
    }
  } catch (error) {
    console.error("Announcements feed error:", error);
  }
};

// 4. Load User Notifications
const loadNotificationsFeed = async () => {
  try {
    const { data: notifs } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", currentUserProfile.id)
      .order("created_at", { ascending: false })
      .limit(5);

    notifList.innerHTML = "";
    if (!notifs || notifs.length === 0) {
      notifList.innerHTML = `<p style="color: var(--muted); font-size: 13px;">No unread notifications.</p>`;
      return;
    }

    for (let j = 0; j < notifs.length; j++) {
      const n = notifs[j];
      notifList.innerHTML += `
        <div style="padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 13px;">
          <div style="color: var(--text);">${n.message}</div>
          <small style="color: var(--muted); font-size: 11px;">${formatDate(n.created_at)}</small>
        </div>
      `;
    }
  } catch (error) {
    console.error("Notifications feed error:", error);
  }
};

// 5. Populate Department Dropdown Filter
const loadDeptFilterOptions = async () => {
  try {
    const { data: depts } = await supabase.from("departments").select("*").order("name");
    deptFilter.innerHTML = `<option value="">All Departments</option>`;
    for (let i = 0; i < (depts || []).length; i++) {
      deptFilter.innerHTML += `<option value="${depts[i].id}">${depts[i].name}</option>`;
    }
  } catch (error) {
    console.error("Dept options load error:", error);
  }
};

// Initialization
const initDashboard = async () => {
  const authInfo = await checkLogin();
  if (!authInfo) return;

  currentUserProfile = authInfo.profile;
  currentEmpRecord = authInfo.employee;
  isManager = currentUserProfile.role === "admin" || currentUserProfile.role === "hr";

  // Company name fetch
  const { data: companyData } = await supabase.from("company").select("name").eq("id", 1).maybeSingle();
  const companyName = companyData ? companyData.name : "HCM Lite";

  welcomeTitle.innerText = `Welcome, ${currentUserProfile.name}`;
  welcomeSubtitle.innerText = `Logged in as ${currentUserProfile.role.toUpperCase()} • ${companyName}`;

  if (isManager) {
    filterBox.style.display = "block";
    panelAttStatus.style.display = "block";
    panelLateComers.style.display = "block";
    panelLeaveTypes.style.display = "block";
    panelDeptHeadcount.style.display = "block";

    // Default dates: 1st of month to today
    const todayStr = getToday();
    fromDate.value = `${todayStr.substring(0, 8)}01`;
    toDate.value = todayStr;

    await loadDeptFilterOptions();
    await loadManagerDashboard();
  } else {
    await loadEmployeePersonalDashboard();
  }

  await loadAnnouncementsFeed();
  await loadNotificationsFeed();
};

initDashboard();
