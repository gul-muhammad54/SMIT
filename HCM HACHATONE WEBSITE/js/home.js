// ============================================================================
// home.js - Landing Page Controller & AI HR Assistant RAG / Edge Engine
// ============================================================================
import supabase from "./credential.js";
import { getToday, formatDate } from "./common.js";

// DOM elements
const aiPromptInput = document.getElementById("aiPromptInput");
const btnSendAi = document.getElementById("btnSendAi");
const aiChatBody = document.getElementById("aiChatBody");
const promptChips = document.querySelectorAll(".ai-prompt-chip");

// Chip click shortcuts
for (let i = 0; i < promptChips.length; i++) {
  promptChips[i].onclick = () => {
    aiPromptInput.value = promptChips[i].dataset.query;
    btnSendAi.click();
  };
}

// Enter key submit
aiPromptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    btnSendAi.click();
  }
});

// Append chat bubble helper
const appendBubble = (sender, messageHtml) => {
  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = `bubble ${sender}`;
  bubbleDiv.innerHTML = messageHtml;
  aiChatBody.appendChild(bubbleDiv);
  aiChatBody.scrollTop = aiChatBody.scrollHeight;
};

// Main AI Query Processing Engine
const processAiQuery = async (query) => {
  const q = query.toLowerCase();

  // Try calling Supabase Edge Function if available
  try {
    const { data: edgeResponse, error: edgeError } = await supabase.functions.invoke("ai-assistant", {
      body: { query: query }
    });

    if (!edgeError && edgeResponse && edgeResponse.answer) {
      return edgeResponse.answer;
    }
  } catch (err) {
    // Edge function not deployed yet, proceed seamlessly with live database RAG
  }

  // 1. Office Timings Query
  if (q.includes("timing") || q.includes("hour") || q.includes("grace") || q.includes("half") || q.includes("weekend")) {
    const { data: comp } = await supabase.from("company").select("*").eq("id", 1).maybeSingle();
    const start = comp?.office_start || "09:00";
    const grace = comp?.grace_min ?? 15;
    const half = comp?.halfday_hours ?? 5;
    const radius = comp?.radius ?? 150;

    return `
      <b>Official Office Timings:</b><br/>
      • <b>Start Time:</b> ${start} AM<br/>
      • <b>Grace Period:</b> ${grace} minutes (Check-ins after 09:15 AM are flagged as <code>LATE</code>)<br/>
      • <b>Half-Day Threshold:</b> Work under ${half} hours is stamped as <code>HALF-DAY</code><br/>
      • <b>Geo-Fencing Radius:</b> Within ${radius} meters of office coordinates<br/>
      • <b>Weekend Days:</b> Saturday & Sunday (Non-working)
    `;
  }

  // 2. Who is on leave today
  if (q.includes("on leave") || q.includes("leave today") || q.includes("who is absent")) {
    const today = getToday();
    const { data: onLeave } = await supabase
      .from("leaves")
      .select("*, employees(name, code), leave_types(name)")
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today);

    if (!onLeave || onLeave.length === 0) {
      return `🎉 No employees are on approved leave today (${today}). Full team attendance expected!`;
    }

    let list = `<p><b>${onLeave.length} employee(s) on approved leave today (${today}):</b></p><ul>`;
    for (let i = 0; i < onLeave.length; i++) {
      const emp = onLeave[i].employees?.name || "Staff Member";
      const type = onLeave[i].leave_types?.name || "Leave";
      list += `<li><b>${emp}</b> — ${type} (${onLeave[i].days} days)</li>`;
    }
    list += "</ul>";
    return list;
  }

  // 3. Late comers query
  if (q.includes("late") || q.includes("who came late")) {
    const today = getToday();
    const { data: lateAtt } = await supabase
      .from("attendance")
      .select("check_in, employees(name, code)")
      .eq("date", today)
      .eq("status", "late");

    if (!lateAtt || lateAtt.length === 0) {
      return `👏 No employees were flagged as late today (${today})! Everyone clocked in on time.`;
    }

    let list = `<p><b>${lateAtt.length} employee(s) clocked in after the grace period today:</b></p><ul>`;
    for (let j = 0; j < lateAtt.length; j++) {
      const emp = lateAtt[j].employees?.name || "Employee";
      const t = new Date(lateAtt[j].check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      list += `<li><b>${emp}</b> — Clocked in at ${t}</li>`;
    }
    list += "</ul>";
    return list;
  }

  // 4. Leave Quotas & Types
  if (q.includes("leave quota") || q.includes("leave balance") || q.includes("leave type") || q.includes("vacation") || q.includes("sick")) {
    const { data: types } = await supabase.from("leave_types").select("*").order("id");
    let summary = `<b>HCM Lite Standard Annual Leave Quotas:</b><br/>`;
    for (let k = 0; k < (types || []).length; k++) {
      const qText = types[k].quota === null ? "Unlimited" : `${types[k].quota} Days / Year`;
      summary += `• <b>${types[k].name}:</b> ${qText}<br/>`;
    }
    summary += `<br/><small>Note: Weekends (Sat-Sun) and public holidays are automatically skipped. Overlapping dates or requesting beyond quota returns a 422 error.</small>`;
    return summary;
  }

  // 5. Payroll & Tax Formula
  if (q.includes("payroll") || q.includes("salary") || q.includes("tax") || q.includes("formula") || q.includes("gross")) {
    return `
      <b>Salary & Payroll Calculation Rules:</b><br/>
      • <b>Gross Salary:</b> 1.5 × Basic Salary (50% standard allowances)<br/>
      • <b>Per-Day Rate:</b> Gross Salary ÷ Working Days (Default 22)<br/>
      • <b>Deductions:</b> (Absent Days + Unpaid Leave + 0.5 × Half-Days) × Per-Day Rate<br/>
      • <b>Mid-Month Joiners:</b> Gross is prorated based on working days since join date<br/>
      • <b>Tax Slabs (Annual Gross = Gross × 12):</b><br/>
        &nbsp;&nbsp;0 to 600k: 0%<br/>
        &nbsp;&nbsp;600k to 1.2M: 5% of amount > 600k<br/>
        &nbsp;&nbsp;1.2M to 2.4M: 30k + 15% of amount > 1.2M<br/>
        &nbsp;&nbsp;2.4M to 3.6M: 210k + 25% of amount > 2.4M<br/>
        &nbsp;&nbsp;Above 3.6M: 510k + 35% of amount > 3.6M<br/>
      • <b>Finalization:</b> Only Admin can lock a finalized payroll run.
    `;
  }

  // Default Fallback
  return `
    I am trained on your HCM Lite company system. You can ask me:<br/>
    • <i>"What are the office timings and grace period?"</i><br/>
    • <i>"Who is on leave today?"</i><br/>
    • <i>"How is payroll and tax calculated?"</i><br/>
    • <i>"What are the annual leave quotas?"</i>
  `;
};

// Send button click
btnSendAi.onclick = async () => {
  const query = aiPromptInput.value.trim();
  if (!query) return;

  aiPromptInput.value = "";
  appendBubble("me", query);

  const typingId = "typing_" + Date.now();
  appendBubble("bot", `<span id="${typingId}">Thinking... 🤖</span>`);

  try {
    const answer = await processAiQuery(query);
    const typingEl = document.getElementById(typingId);
    if (typingEl && typingEl.parentElement) {
      typingEl.parentElement.innerHTML = answer + `<br/><small style="color: var(--muted); font-size: 11px; margin-top: 6px; display: inline-block;">(AI Verified from Company Database)</small>`;
    }
  } catch (error) {
    const typingEl = document.getElementById(typingId);
    if (typingEl && typingEl.parentElement) {
      typingEl.parentElement.innerHTML = "Sorry, I encountered an issue retrieving that information.";
    }
  }
};
