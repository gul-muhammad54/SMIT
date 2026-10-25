// ============================================================================
// common.js - Shared utilities, Auth guard, and Role-based Navbar
// ============================================================================
import supabase from "./credential.js";
import Swal from "./alert.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

// Supabase project credentials for secondary client creation (without replacing current session)
const SUPABASE_URL = "https://qydjaldtnzjpveubmrrg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5ZGphbGR0bnpqcHZldWJtcnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NjQzODgsImV4cCI6MjEwODQ0MDM4OH0.od8by95GL8iHGconQhFQL0W1xEViDQ0xWfCHNS5VvxE";

// Global cache variables
export let currentUser = null;
export let currentProfile = null;
export let currentEmployee = null;

// Page ka naam nikalne ke liye helper
export const getCurrentPage = () => {
  const path = window.location.pathname;
  return path.split("/").pop() || "index.html";
};

// Button loading state lagane ke liye
export const setButtonLoading = (button, loadingText = "Saving...") => {
  if (!button) return;
  button.disabled = true;
  button.dataset.originalText = button.innerText;
  button.innerText = loadingText;
};

// Button loading state hatane ke liye
export const restoreButton = (button) => {
  if (!button) return;
  button.disabled = false;
  if (button.dataset.originalText) {
    button.innerText = button.dataset.originalText;
  }
};

// Asia/Karachi time zone me aaj ki tareekh
export const getToday = () => {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
};

// Time format helper (HH:MM)
export const formatTime = (isoString) => {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit"
  });
};

// Date format helper (YYYY-MM-DD)
export const formatDate = (isoString) => {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleDateString("en-CA");
};

// Working days calculation (Sat-Sun aur public holidays skip)
export const calculateWorkingDays = (startDate, endDate, holidaysList = []) => {
  let count = 0;
  const cur = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  while (cur <= end) {
    const day = cur.getDay(); // 0 = Sunday, 6 = Saturday
    const dateStr = cur.toLocaleDateString("en-CA");
    if (day !== 0 && day !== 6 && !holidaysList.includes(dateStr)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

// Monthly Tax slab on gross x 12
export const calculateTaxMonthly = (monthlyGross) => {
  const annual = (Number(monthlyGross) || 0) * 12;
  let annualTax = 0;

  if (annual <= 600000) {
    annualTax = 0;
  } else if (annual <= 1200000) {
    annualTax = (annual - 600000) * 0.05;
  } else if (annual <= 2400000) {
    annualTax = 30000 + (annual - 1200000) * 0.15;
  } else if (annual <= 3600000) {
    annualTax = 210000 + (annual - 2400000) * 0.25;
  } else {
    annualTax = 510000 + (annual - 3600000) * 0.35;
  }

  return Math.round(annualTax / 12);
};

// Audit log helper
export const addAuditLog = async (action, entity, beforeData = null, afterData = null) => {
  try {
    const actorName = currentProfile ? currentProfile.name : "System";
    const actorId = currentUser ? currentUser.id : null;
    await supabase.from("audit_log").insert({
      actor_id: actorId,
      actor_name: actorName,
      action: action,
      entity: entity,
      before_data: beforeData,
      after_data: afterData
    });
  } catch (error) {
    console.warn("Audit log notice:", error.message);
  }
};

// Notification helper
export const sendNotification = async (userId, message) => {
  try {
    if (!userId) return;
    await supabase.from("notifications").insert({
      user_id: userId,
      message: message
    });
  } catch (error) {
    console.warn("Notification notice:", error.message);
  }
};

// Secondary client se naya user create karna taake Admin/HR logout na ho
export const createSecondaryUser = async (email, password) => {
  try {
    const secondaryClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });

    const { data, error } = await secondaryClient.auth.signUp({
      email: email,
      password: password
    });

    if (error) {
      throw error;
    }

    return data.user ? data.user.id : null;
  } catch (error) {
    console.error("Secondary user creation error:", error);
    throw error;
  }
};

// Modal helpers
export const openModal = (id) => {
  const modalEl = document.getElementById(id);
  if (modalEl) {
    modalEl.classList.add("active");
  }
};

export const closeModal = (id) => {
  if (id) {
    const modalEl = document.getElementById(id);
    if (modalEl) modalEl.classList.remove("active");
  } else {
    const modals = document.querySelectorAll(".modal");
    for (let i = 0; i < modals.length; i++) {
      modals[i].classList.remove("active");
    }
  }
};

// Window click se modal close
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    e.target.classList.remove("active");
  }
});

// Logout function
export const logout = async () => {
  try {
    const result = await Swal.fire({
      icon: "question",
      title: "Logout Confirmation",
      text: "Are you sure you want to sign out?",
      showCancelButton: true,
      confirmButtonText: "Yes, Logout",
      cancelButtonText: "Cancel"
    });

    if (result.isConfirmed) {
      await supabase.auth.signOut();
      window.location.href = "login.html";
    }
  } catch (error) {
    console.error("Logout error:", error);
    await supabase.auth.signOut();
    window.location.href = "login.html";
  }
};

// Navigation menu definition per role
const menuConfig = {
  admin: {
    main: [
      { name: "Dashboard", href: "dashboard.html" },
      { name: "Employees", href: "employees.html" },
      { name: "Attendance", href: "attendance.html" },
      { name: "Leave", href: "leave.html" },
      { name: "Payroll", href: "payroll.html" },
      { name: "Announcements", href: "announcements.html" }
    ],
    more: [
      { name: "Company Setup", href: "settings.html" },
      { name: "HR Logins", href: "users.html" },
      { name: "Audit Log", href: "audit.html" },
      { name: "My Profile", href: "profile.html" }
    ]
  },
  hr: {
    main: [
      { name: "Dashboard", href: "dashboard.html" },
      { name: "Employees", href: "employees.html" },
      { name: "Attendance", href: "attendance.html" },
      { name: "Leave", href: "leave.html" },
      { name: "Payroll", href: "payroll.html" },
      { name: "Announcements", href: "announcements.html" }
    ],
    more: [
      { name: "Company Setup", href: "settings.html" },
      { name: "My Profile", href: "profile.html" }
    ]
  },
  employee: {
    main: [
      { name: "Dashboard", href: "dashboard.html" },
      { name: "Attendance", href: "attendance.html" },
      { name: "Leave", href: "leave.html" },
      { name: "Payroll", href: "payroll.html" },
      { name: "Announcements", href: "announcements.html" }
    ],
    more: [
      { name: "My Profile", href: "profile.html" }
    ]
  }
};

// Dynamic Navbar render karne ka function
export const renderNavbar = (profile) => {
  const navLinksContainer = document.getElementById("navLinks");
  if (!navLinksContainer) return;

  const role = profile.role || "employee";
  const currentPage = getCurrentPage();
  const config = menuConfig[role] || menuConfig.employee;

  // Main links render kar rahe hain
  let linksHtml = "";
  for (let i = 0; i < config.main.length; i++) {
    const item = config.main[i];
    const isActive = item.href === currentPage ? "active" : "";
    linksHtml += `<a href="${item.href}" class="${isActive}">${item.name}</a>`;
  }

  // More dropdown render kar rahe hain
  if (config.more && config.more.length > 0) {
    let moreHtml = "";
    for (let j = 0; j < config.more.length; j++) {
      const moreItem = config.more[j];
      const isMoreActive = moreItem.href === currentPage ? "active" : "";
      moreHtml += `<a href="${moreItem.href}" class="${isMoreActive}">${moreItem.name}</a>`;
    }

    linksHtml += `
      <div class="dropdown">
        <span>More ▾</span>
        <div class="dropdown-menu">
          ${moreHtml}
        </div>
      </div>
    `;
  }

  navLinksContainer.innerHTML = linksHtml;

  // Profile icon aur user name display
  const profileCircle = document.getElementById("profileCircle");
  if (profileCircle && profile.name) {
    profileCircle.innerText = profile.name.charAt(0).toUpperCase();
  }

  const profileName = document.getElementById("profileName");
  if (profileName && profile.name) {
    profileName.innerText = `${profile.name} (${profile.role.toUpperCase()})`;
  }

  // Logout button click listener
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.onclick = async () => {
      await logout();
    };
  }
};

// Auth Guard: login check aur role verification
export const checkLogin = async (allowedRoles = []) => {
  try {
    // 1. Supabase session check kar rahe hain
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      window.location.href = "login.html";
      return null;
    }

    currentUser = session.user;

    // 2. User ki profile Supabase se mangwa rahe hain
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      await supabase.auth.signOut();
      window.location.href = "login.html";
      return null;
    }

    // 3. Agar account deactivated hai
    if (profile.active === false) {
      await supabase.auth.signOut();
      await Swal.fire({
        icon: "error",
        title: "Account Deactivated",
        text: "Your account is deactivated. Please contact your company administrator."
      });
      window.location.href = "login.html";
      return null;
    }

    currentProfile = profile;

    const currentPage = getCurrentPage();

    // 4. Must change password check (first sign-in ke liye)
    if (profile.must_change === true && currentPage !== "change.html") {
      window.location.href = "change.html";
      return null;
    }

    // 5. Role guard check
    if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
      await Swal.fire({
        icon: "error",
        title: "Access Denied",
        text: "You do not have permission to view this page."
      });
      window.location.href = "dashboard.html";
      return null;
    }

    // 6. Agar employee/HR hai to employee record fetch kar lo
    const { data: empData } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", profile.id)
      .maybeSingle();

    currentEmployee = empData;

    // 7. Dynamic Navbar render karo
    renderNavbar(profile);

    return {
      session,
      profile,
      employee: currentEmployee
    };
  } catch (error) {
    console.error("checkLogin unexpected error:", error);
    window.location.href = "login.html";
    return null;
  }
};
