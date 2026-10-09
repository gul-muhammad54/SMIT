import { validation, productValidation } from "./validation.js";

// Sidebar navigation is in common.js

// ================= Get elements =================
const sellForm = document.getElementById("sellForm");
const sellCustomer = document.getElementById("sellCustomer");
const sellPhone = document.getElementById("sellPhone");
const sellProduct = document.getElementById("sellProduct");
const sellAvailable = document.getElementById("sellAvailable");
const sellQty = document.getElementById("sellQty");
const sellPrice = document.getElementById("sellPrice");
const sellDiscount = document.getElementById("sellDiscount");
const sellPayment = document.getElementById("sellPayment");
const sellDate = document.getElementById("sellDate");
const sellTotal = document.getElementById("sellTotal");
const sellClearBtn = document.getElementById("sellClearBtn");
const sellSaveBtn = document.getElementById("sellSaveBtn");
const sellTableBody = document.getElementById("sellTableBody");

// ================= Save sale =================
sellSaveBtn.onclick = () => {
  // customer ka naam name field ki tarah check hoga
  const validateCustomer = validation(sellCustomer.value, false, false, false);
  if (validateCustomer === false) {
    return;
  }

  const validateProduct = productValidation(
    sellProduct.value,
    sellQty.value,
    sellPrice.value,
    sellDate.value
  );

  // validation false hui to yahin ruk jao
  if (validateProduct === false) {
    return;
  }

  Swal.fire({
    icon: "success",
    title: "Done",
    text: "Sale form is valid",
  });
};