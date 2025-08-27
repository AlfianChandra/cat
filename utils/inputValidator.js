export const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/; // Alphanumeric and underscores, 3-20 characters
  return usernameRegex.test(username);
}

export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 symbol
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

export const validateName = (name) => {
  const nameRegex = /^[a-zA-Z\s]{3,}$/; // Only letters and spaces, at least 3 characters
  return nameRegex.test(name);
}

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email format
  return emailRegex.test(email);
}

export const validatePhoneNumber = (phoneNumber) => {
  //+62 format
  const phoneNumberRegex = /^\+62[0-9]{10,15}$/; // Indonesian phone number format
  return phoneNumberRegex.test(phoneNumber);
}

export const validateDateOfBirth = (dateOfBirth) => {
  const dateOfBirthRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD format
  return dateOfBirthRegex.test(dateOfBirth);
}

export const validateAddress = (address) => {
  const addressRegex = /^[a-zA-Z0-9\s,.'-]{3,}$/; // Basic address format
  return addressRegex.test(address);
}