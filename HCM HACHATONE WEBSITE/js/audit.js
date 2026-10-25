// ============================================================================
// audit.js - System Audit Log Viewer (Admin Only)
// ============================================================================
import supabase from "./credential.js";
import { checkLogin, formatTime, formatDate } from "./common.js";

// DOM elements
const auditTable = document.getElementById("auditTable");
const btnRefreshAudit = document.getElementById("btnRefreshAudit");

// 1. Audit Log Entries Load
const loadAuditLogs = async () => {
  try {
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Fetch audit error:", error);
      return;
    }

    auditTable.innerHTML = "";
    if (!data || data.length === 0) {
      auditTable.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 24px;">No audit logs recorded yet.</td></tr>`;
      return;
    }

    // For loop se table rows build kar rahe hain
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const timeFormatted = `${formatDate(item.created_at)} ${formatTime(item.created_at)}`;

      let payloadHtml = "";
      if (item.before_data) {
        payloadHtml += `<div style="font-size: 11px; color: var(--danger); margin-bottom: 4px;"><b>Before:</b> <code>${JSON.stringify(item.before_data)}</code></div>`;
      }
      if (item.after_data) {
        payloadHtml += `<div style="font-size: 11px; color: var(--success);"><b>After:</b> <code>${JSON.stringify(item.after_data)}</code></div>`;
      }
      if (!item.before_data && !item.after_data) {
        payloadHtml = `<span style="color: var(--muted); font-size: 12px;">No snapshot data</span>`;
      }

      auditTable.innerHTML += `
        <tr>
          <td><small style="color: var(--muted);">${timeFormatted}</small></td>
          <td><strong>${item.actor_name}</strong></td>
          <td><span class="badge" style="background: var(--bg); border: 1px solid var(--border); font-size: 11px;">${item.action}</span></td>
          <td><code>${item.entity}</code></td>
          <td style="max-width: 400px; word-break: break-all;">${payloadHtml}</td>
        </tr>
      `;
    }
  } catch (error) {
    console.error("Load audit error:", error);
  }
};

btnRefreshAudit.onclick = loadAuditLogs;

// Initialization: Admin check
const initAudit = async () => {
  const authInfo = await checkLogin(["admin"]);
  if (!authInfo) return;

  await loadAuditLogs();
};

initAudit();
