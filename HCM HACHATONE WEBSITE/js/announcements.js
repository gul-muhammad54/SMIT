// ============================================================================
// announcements.js - Company Announcements Publisher and Feed
// ============================================================================
import supabase from "./credential.js";
import Swal from "./alert.js";
import { announcementValidation } from "./validation.js";
import {
  checkLogin,
  setButtonLoading,
  restoreButton,
  addAuditLog,
  openModal,
  closeModal,
  formatDate
} from "./common.js";

// DOM elements
const announcementToolbar = document.getElementById("announcementToolbar");
const btnOpenAnnModal = document.getElementById("btnOpenAnnModal");
const btnCloseAnnModal = document.getElementById("btnCloseAnnModal");
const btnCancelAnn = document.getElementById("btnCancelAnn");
const btnSaveAnn = document.getElementById("btnSaveAnn");
const annTitle = document.getElementById("annTitle");
const annBody = document.getElementById("annBody");
const announcementsFeed = document.getElementById("announcementsFeed");

let currentUserProfile = null;
let isManager = false;

// 1. Announcements Feed Load
const loadAnnouncements = async () => {
  try {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch announcements error:", error);
      return;
    }

    announcementsFeed.innerHTML = "";
    if (!data || data.length === 0) {
      announcementsFeed.innerHTML = `
        <div class="box" style="text-align: center; color: var(--muted); padding: 32px;">
          No announcements published yet.
        </div>
      `;
      return;
    }

    // Loop se cards create kar rahe hain
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      announcementsFeed.innerHTML += `
        <div class="box" style="margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 12px;">
            <h3 style="margin-bottom: 0; font-size: 18px; color: var(--text);">${item.title}</h3>
            <span class="badge" style="background: var(--primary-light); color: var(--primary); font-size: 11px;">
              ${formatDate(item.created_at)}
            </span>
          </div>
          <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.6; white-space: pre-line; margin-bottom: 14px;">
            ${item.body}
          </p>
          <div style="font-size: 12px; color: var(--muted); border-top: 1px solid var(--border); padding-top: 10px;">
            Posted by <strong>${item.author_name}</strong>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error("Load announcements error:", error);
  }
};

// 2. Open / Close Modal
if (btnOpenAnnModal) {
  btnOpenAnnModal.onclick = () => {
    annTitle.value = "";
    annBody.value = "";
    openModal("annModal");
  };
}

btnCloseAnnModal.onclick = () => closeModal("annModal");
btnCancelAnn.onclick = () => closeModal("annModal");

// 3. Publish Announcement
btnSaveAnn.onclick = async () => {
  const title = annTitle.value.trim();
  const body = annBody.value.trim();

  const isValid = announcementValidation(title, body);
  if (!isValid) return;

  setButtonLoading(btnSaveAnn, "Publishing...");

  try {
    const payload = {
      title: title,
      body: body,
      author_id: currentUserProfile.id,
      author_name: currentUserProfile.name
    };

    const { error } = await supabase.from("announcements").insert(payload);
    if (error) {
      Swal.fire({ icon: "error", title: "Publish Error", text: error.message });
      return;
    }

    await addAuditLog("PUBLISH_ANNOUNCEMENT", "announcements", null, { title: title });
    closeModal("annModal");

    Swal.fire({
      icon: "success",
      title: "Announcement Published!",
      text: "The notice has been posted to all staff members."
    });

    await loadAnnouncements();
  } catch (error) {
    console.error("Publish announcement error:", error);
    Swal.fire({ icon: "error", title: "Error", text: error.message });
  } finally {
    restoreButton(btnSaveAnn);
  }
};

// Initialization
const initAnnouncements = async () => {
  const authInfo = await checkLogin();
  if (!authInfo) return;

  currentUserProfile = authInfo.profile;
  isManager = currentUserProfile.role === "admin" || currentUserProfile.role === "hr";

  if (isManager) {
    announcementToolbar.style.display = "flex";
  }

  await loadAnnouncements();
};

initAnnouncements();
