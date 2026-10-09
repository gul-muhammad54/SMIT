import { validation, productValidation } from "./validation.js";

// Sidebar navigation is in common.js

// ================= Get elements =================
const purchaseForm = document.getElementById("purchaseForm");
const purchaseSupplier = document.getElementById("purchaseSupplier");
const purchaseInvoice = document.getElementById("purchaseInvoice");
const purchaseProduct = document.getElementById("purchaseProduct");
const purchaseCategory = document.getElementById("purchaseCategory");
const purchaseQty = document.getElementById("purchaseQty");
const purchasePrice = document.getElementById("purchasePrice");
const purchaseDate = document.getElementById("purchaseDate");
const purchasePayment = document.getElementById("purchasePayment");
const purchaseNotes = document.getElementById("purchaseNotes");
const purchaseTotal = document.getElementById("purchaseTotal");
const purchaseClearBtn = document.getElementById("purchaseClearBtn");
const purchaseSaveBtn = document.getElementById("purchaseSaveBtn");
const purchaseTableBody = document.getElementById("purchaseTableBody");

// ================= Save purchase =================
purchaseSaveBtn.onclick = () => {
  // supplier ka naam name field ki tarah check hoga
  const validateSupplier = validation(purchaseSupplier.value, false, false, false);
  if (validateSupplier === false) {
    return;
  }

  const validateProduct = productValidation(
    purchaseProduct.value,
    purchaseQty.value,
    purchasePrice.value,
    purchaseDate.value
  );

  // validation false hui to yahin ruk jao
  if (validateProduct === false) {
    return;
  }

  Swal.fire({
    icon: "success",
    title: "Done",
    text: "Purchase form is valid",
  });
};