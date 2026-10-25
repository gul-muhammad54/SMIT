// ============================================================================
// validation.js - Form validation functions with SweetAlert2
// ============================================================================
import Swal from "./alert.js";

// First-run setup form ki validation
export const setupValidation = (companyName, name, email, password, confirmPassword) => {
  if (!companyName || companyName.trim().length < 2) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Please enter a valid company name (minimum 2 characters)."
    });
    return false;
  }

  if (!name || name.trim().length < 3) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Please enter admin full name (minimum 3 characters)."
    });
    return false;
  }

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!email || !emailRegex.test(email.trim())) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Please provide a valid email address."
    });
    return false;
  }

  if (!password || password.length < 6) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Password must be at least 6 characters long."
    });
    return false;
  }

  if (password !== confirmPassword) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Passwords do not match. Please re-enter."
    });
    return false;
  }

  return true;
};

// Login form ki validation
export const loginValidation = (email, password) => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!email || !emailRegex.test(email.trim())) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Please enter a valid email address."
    });
    return false;
  }

  if (!password || password.trim().length === 0) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Please enter your password."
    });
    return false;
  }

  return true;
};

// Change password form ki validation
export const changePasswordValidation = (password, confirmPassword) => {
  if (!password || password.length < 6) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "New password must be at least 6 characters long."
    });
    return false;
  }

  if (password !== confirmPassword) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Passwords do not match. Please check again."
    });
    return false;
  }

  return true;
};

// Company settings validation
export const companySettingsValidation = (name, start, grace, half, radius) => {
  if (!name || name.trim().length < 2) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Company name is required."
    });
    return false;
  }
  if (!start) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Office start time is required (e.g. 09:00)."
    });
    return false;
  }
  if (grace === "" || Number(grace) < 0) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Please enter a valid grace time in minutes."
    });
    return false;
  }
  if (half === "" || Number(half) <= 0) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Half-day hours must be greater than zero."
    });
    return false;
  }
  if (radius === "" || Number(radius) <= 0) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Office radius in meters must be greater than zero."
    });
    return false;
  }
  return true;
};

// HR Login registration validation
export const hrUserValidation = (name, email, password) => {
  if (!name || name.trim().length < 3) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Full Name must be at least 3 characters."
    });
    return false;
  }

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!email || !emailRegex.test(email.trim())) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Please provide a valid HR email."
    });
    return false;
  }

  if (!password || password.length < 6) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Temporary password must be at least 6 characters."
    });
    return false;
  }

  return true;
};

// Employee registration validation
export const employeeValidation = (code, name, email, joinDate, basicSalary) => {
  if (!code || code.trim().length === 0) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Employee code is required (e.g. EMP-001)."
    });
    return false;
  }

  if (!name || name.trim().length < 3) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Employee name must be at least 3 characters."
    });
    return false;
  }

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!email || !emailRegex.test(email.trim())) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Please provide a valid employee work email."
    });
    return false;
  }

  if (!joinDate) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Join date is required."
    });
    return false;
  }

  if (basicSalary === "" || Number(basicSalary) < 0) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Basic salary must be 0 or greater."
    });
    return false;
  }

  return true;
};

// Leave application validation
export const leaveApplicationValidation = (leaveTypeId, startDate, endDate, reason) => {
  if (!leaveTypeId) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Please select a leave type."
    });
    return false;
  }

  if (!startDate || !endDate) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Please select both start and end dates."
    });
    return false;
  }

  if (startDate > endDate) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Start date cannot be after end date."
    });
    return false;
  }

  if (!reason || reason.trim().length < 3) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Please enter a valid reason (minimum 3 characters)."
    });
    return false;
  }

  return true;
};

// Announcement validation
export const announcementValidation = (title, body) => {
  if (!title || title.trim().length < 3) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Announcement title must be at least 3 characters."
    });
    return false;
  }

  if (!body || body.trim().length < 5) {
    Swal.fire({
      icon: "warning",
      title: "Validation Error",
      text: "Announcement body must be at least 5 characters."
    });
    return false;
  }

  return true;
};
