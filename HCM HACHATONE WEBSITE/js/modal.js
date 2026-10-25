// ===== Modal (aap ka tareeqa) =====
var modal = null
function openModal(id) {
    modal = document.getElementById(id || "userModal")
    modal.style.display = "flex"
}

function closeModal() {
    if (modal) {
        modal.style.display = "none"
    }
}

function windowClick() {
    if (event.target.classList.contains("modal")) {
        event.target.style.display = "none"
    }
}

// Close modal when clicking outside
window.onclick = windowClick

