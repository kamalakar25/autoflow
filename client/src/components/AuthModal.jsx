import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaPhone,
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const AuthModal = ({ isOpen, onClose, initialMode, onLogin }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode); // 'signin', 'signup', 'forgotPassword'
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    forgotEmail: "",
    otp: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(300); // 5 minutes in seconds
  const [isOtpExpired, setIsOtpExpired] = useState(false);

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z-]{2,}\.[a-zA-Z]{2,}$/;
  const namePattern = /^[A-Za-z\s]+$/;
  const phonePattern = /^[6-9]\d{9}$/;

  useEffect(() => {
    if (location.state && mode === "forgotPassword") {
      setFormData((prev) => ({
        ...prev,
        forgotEmail: location.state.email || "",
      }));
    }
  }, [location.state, mode]);

  useEffect(() => {
    let timer;
    if (isOtpSent && !isOtpVerified && otpTimer > 0) {
      timer = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsOtpExpired(true);
            setErrors({
              ...errors,
              otp: "OTP has expired. Please request a new one.",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpSent, isOtpVerified, otpTimer, errors]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const validate = () => {
    const newErrors = {};
    if (mode === "signup") {
      if (!formData.firstName.trim())
        newErrors.firstName = "First name is required";
      else if (!namePattern.test(formData.firstName))
        newErrors.firstName = "First name can only contain letters and spaces";
      if (!formData.lastName.trim())
        newErrors.lastName = "Last name is required";
      else if (!namePattern.test(formData.lastName))
        newErrors.lastName = "Last name can only contain letters and spaces";
      if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
      else if (!phonePattern.test(formData.phone))
        newErrors.phone =
          "Phone number must be 10 digits and start with 6, 7, 8, or 9";
      if (!formData.email.trim()) newErrors.email = "Email is required";
      else if (!emailPattern.test(formData.email))
        newErrors.email = "Enter a valid email address";
      if (!formData.password.trim())
        newErrors.password = "Password is required";
      else if (!passwordRegex.test(formData.password))
        newErrors.password =
          "Password must be at least 8 characters with uppercase, lowercase, number, and special character";
      if (formData.password !== formData.confirmPassword)
        newErrors.confirmPassword = "Passwords do not match";
    } else if (mode === "signin") {
      if (!formData.email.trim()) newErrors.email = "Email is required";
      else if (!emailPattern.test(formData.email))
        newErrors.email = "Enter a valid email address";
      if (!formData.password.trim())
        newErrors.password = "Password is required";
    } else if (mode === "forgotPassword" && !isOtpSent) {
      if (!formData.forgotEmail.trim())
        newErrors.forgotEmail = "Email is required";
      else if (!emailPattern.test(formData.forgotEmail))
        newErrors.forgotEmail = "Enter a valid email address";
    } else if (mode === "forgotPassword" && isOtpSent && !isOtpVerified) {
      if (!formData.otp.trim()) newErrors.otp = "OTP is required";
    } else if (mode === "forgotPassword" && isOtpVerified) {
      if (!formData.newPassword.trim())
        newErrors.newPassword = "New password is required";
      else if (!passwordRegex.test(formData.newPassword))
        newErrors.newPassword =
          "Password must be at least 8 characters with uppercase, lowercase, number, and special character";
      if (formData.newPassword !== formData.confirmNewPassword)
        newErrors.confirmNewPassword = "Passwords do not match";
    }
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" });

    if (name === "otp") {
      setErrors((prev) => ({ ...prev, otp: value ? "" : "OTP is required" }));
    }
    if (name === "newPassword") {
      let error = "";
      if (!value) error = "Password is required";
      else if (!passwordRegex.test(value))
        error =
          "Password must be at least 8 characters with uppercase, lowercase, number, and special character";
      setErrors((prev) => ({ ...prev, newPassword: error }));
    }
    if (name === "confirmNewPassword") {
      let error = "";
      if (!value) error = "Confirm password is required";
      else if (value !== formData.newPassword) error = "Passwords do not match";
      setErrors((prev) => ({ ...prev, confirmNewPassword: error }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "signup") {
        const response = await axios.post(`${BASE_URL}/users/signup`, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
          status: "pending",
        });
        alert(
          response.data.message || "Signup submitted! Awaiting admin approval."
        );
        setMode("signin");
        resetForm();
      } else if (mode === "signin") {
        const response = await axios.post(`${BASE_URL}/users/signin`, {
          email: formData.email,
          password: formData.password,
        });
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("userId", response.data.user.id);
        localStorage.setItem("userRole", response.data.user.role);

        if (response.data.status === "pending") {
          setErrors({ api: "Your signup is under review." });
        } else if (response.data.status === "rejected") {
          setErrors({ api: "Your signup was rejected by admin." });
        } else if (response.data.status === "approved" && response.data.user) {
          if (typeof onLogin === "function") {
            onLogin(response.data.user.role);
          }
          onClose();
          if (response.data.user.role === "Admin") {
            navigate("/admin/overview");
          } else {
            navigate("/dashboard");
          }
          resetForm();
        }
      }
    } catch (error) {
      console.error(
        `${mode === "signup" ? "Signup" : "Signin"} error:`,
        error.response?.data || error.message
      );
      setErrors({
        api:
          error.response?.data?.message ||
          "Unable to connect to server. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/users/ForgotPassword/SendOTP`,
        {
          email: formData.forgotEmail,
        }
      );
      alert(response.data.message || "OTP sent successfully");
      setIsOtpSent(true);
      setIsOtpExpired(false);
      setOtpTimer(300);
      setErrors({ ...errors, otp: "" });
    } catch (error) {
      console.error("Send OTP error:", error.response?.data || error.message);
      setErrors({ api: error.response?.data?.message || "Failed to send OTP" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/users/get/otp`, {
        email: formData.forgotEmail,
        otp: formData.otp,
      });
      alert(response.data.message || "OTP verified successfully");
      setIsOtpVerified(true);
      setFormData({ ...formData, otp: "" });
      setErrors({ ...errors, otp: "" });
    } catch (error) {
      console.error("Verify OTP error:", error.response?.data || error.message);
      setErrors({
        api: error.response?.data?.message || "Failed to verify OTP",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.put(`${BASE_URL}/users/update/password`, {
        email: formData.forgotEmail,
        password: formData.newPassword,
        otp: formData.otp,
      });
      alert(response.data.message || "Password updated successfully");
      setMode("signin");
      resetForm();
    } catch (error) {
      console.error(
        "Reset password error:",
        error.response?.data || error.message
      );
      setErrors({
        api: error.response?.data?.message || "Failed to update password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      forgotEmail: mode === "forgotPassword" ? formData.forgotEmail : "",
      otp: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setIsOtpSent(false);
    setIsOtpVerified(false);
    setOtpTimer(300);
    setIsOtpExpired(false);
  };

  const handleOverlayClick = (e) => {
    if (e.currentTarget === e.target) {
      onClose();
      resetForm();
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () =>
    setShowConfirmPassword(!showConfirmPassword);
  const toggleNewPasswordVisibility = () =>
    setShowNewPassword(!showNewPassword);
  const toggleConfirmNewPasswordVisibility = () =>
    setShowConfirmNewPassword(!showConfirmNewPassword);

  const inputStyles =
    "w-full pl-10 pr-12 py-3 bg-gray-800 bg-opacity-50 text-white border border-gray-600 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-400 focus:outline-none transition-all duration-300 hover:bg-opacity-70 disabled:bg-gray-700 disabled:cursor-not-allowed text-sm sm:text-base placeholder-gray-400";
  const buttonStyles =
    "w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-full hover:from-purple-600 hover:to-purple-700 transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed text-sm sm:text-base";
  const linkStyles = "text-purple-400 hover:text-purple-300 cursor-pointer";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-[3000] p-4"
      onClick={handleOverlayClick}
    >
      <div
        className="w-full max-w-md max-h-[100vh] overflow-y-auto bg-white bg-opacity-10 backdrop-blur-xl rounded-2xl border border-white border-opacity-30 p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {mode === "signin" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-purple-400 mb-2">
                AutoFlow
              </h2>
              <p className="text-lg text-gray-200">Welcome Back</p>
              <p className="text-sm text-gray-400">
                Sign in to access your automations
              </p>
            </div>
            {errors.api && (
              <p className="text-center text-red-400 text-sm bg-red-500 bg-opacity-10 p-2 rounded-lg">
                {errors.api}
              </p>
            )}
            <div className="space-y-4">
              <div className="relative">
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputStyles}
                  disabled={isLoading}
                  aria-label="Email address"
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                )}
              </div>
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className={inputStyles}
                  disabled={isLoading}
                  aria-label="Password"
                />
                {formData.password && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    onClick={togglePasswordVisibility}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                )}
                {errors.password && (
                  <p className="text-red-400 text-xs mt-1">{errors.password}</p>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className={buttonStyles}
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </motion.button>
            </div>
            <p className="text-center text-gray-400 text-sm">
              <span
                onClick={() => setMode("forgotPassword")}
                className={linkStyles}
              >
                Forgot Password?
              </span>
            </p>
            <hr className="border-gray-600 my-6" />
            <p className="text-center text-gray-400 text-sm">
              Don't have an account?{" "}
              <span onClick={() => setMode("signup")} className={linkStyles}>
                Sign Up
              </span>
            </p>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-purple-400 mb-2">
                AutoFlow
              </h2>
              <p className="text-lg text-gray-200">Create Account</p>
              <p className="text-sm text-gray-400">
                Start building your automations
              </p>
            </div>
            {errors.api && (
              <p className="text-center text-red-400 text-sm bg-red-500 bg-opacity-10 p-2 rounded-lg">
                {errors.api}
              </p>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label htmlFor="firstName" className="sr-only">
                    First Name
                  </label>
                  <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="firstName"
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={inputStyles}
                    disabled={isLoading}
                    aria-label="First name"
                  />
                  {errors.firstName && (
                    <p className="text-red-400 text-xs mt-1">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <label htmlFor="lastName" className="sr-only">
                    Last Name
                  </label>
                  <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="lastName"
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={inputStyles}
                    disabled={isLoading}
                    aria-label="Last name"
                  />
                  {errors.lastName && (
                    <p className="text-red-400 text-xs mt-1">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>
              <div className="relative">
                <label htmlFor="phone" className="sr-only">
                  Phone Number
                </label>
                <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="phone"
                  type="text"
                  name="phone"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={handleChange}
                  className={inputStyles}
                  disabled={isLoading}
                  aria-label="Phone number"
                />
                {errors.phone && (
                  <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
                )}
              </div>
              <div className="relative">
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputStyles}
                  disabled={isLoading}
                  aria-label="Email address"
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    className={inputStyles}
                    disabled={isLoading}
                    aria-label="Password"
                  />
                  {formData.password && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      onClick={togglePasswordVisibility}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  )}
                  {errors.password && (
                    <p className="text-red-400 text-xs mt-1">
                      {errors.password}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <label htmlFor="confirmPassword" className="sr-only">
                    Confirm Password
                  </label>
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={inputStyles}
                    disabled={isLoading}
                    aria-label="Confirm password"
                  />
                  {formData.confirmPassword && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      onClick={toggleConfirmPasswordVisibility}
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  )}
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className={buttonStyles}
                disabled={isLoading}
              >
                {isLoading ? "Signing Up..." : "Sign Up"}
              </motion.button>
            </div>
            <p className="text-center text-gray-400 text-sm">
              Already have an account?{" "}
              <span onClick={() => setMode("signin")} className={linkStyles}>
                Sign In
              </span>
            </p>
          </form>
        )}

        {mode === "forgotPassword" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-purple-400 mb-2">
                Forgot Password
              </h2>
              <p className="text-sm text-gray-400">
                Reset your password to regain access
              </p>
            </div>
            {errors.api && (
              <p className="text-center text-red-400 text-sm bg-red-500 bg-opacity-10 p-2 rounded-lg">
                {errors.api}
              </p>
            )}
            <p className="text-center text-gray-400 text-sm">
              <strong>Email:</strong> {formData.forgotEmail || "Not provided"}
            </p>
            {!isOtpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="relative">
                  <label htmlFor="forgotEmail" className="sr-only">
                    Email
                  </label>
                  <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="forgotEmail"
                    type="email"
                    name="forgotEmail"
                    placeholder="Email"
                    value={formData.forgotEmail}
                    onChange={handleChange}
                    className={inputStyles}
                    disabled={isLoading}
                    aria-label="Email address for password reset"
                  />
                  {errors.forgotEmail && (
                    <p className="text-red-400 text-xs mt-1">
                      {errors.forgotEmail}
                    </p>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className={buttonStyles}
                  disabled={isLoading || !formData.forgotEmail}
                >
                  {isLoading ? "Sending OTP..." : "Send OTP"}
                </motion.button>
              </form>
            ) : !isOtpVerified ? (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <p
                  className={`text-center text-sm ${
                    isOtpExpired ? "text-red-400" : "text-gray-400"
                  }`}
                >
                  {isOtpExpired
                    ? "OTP has expired."
                    : `OTP expires in: ${formatTime(otpTimer)}`}
                </p>
                <div className="relative">
                  <label htmlFor="otp" className="sr-only">
                    OTP
                  </label>
                  <input
                    id="otp"
                    type="text"
                    name="otp"
                    placeholder="Enter OTP"
                    value={formData.otp}
                    onChange={handleChange}
                    className={inputStyles}
                    disabled={isLoading || isOtpExpired}
                    maxLength="6"
                    pattern="[0-9]*"
                    aria-label="One-time password"
                  />
                  {errors.otp && (
                    <p className="text-red-400 text-xs mt-1">{errors.otp}</p>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className={buttonStyles}
                  disabled={isLoading || !formData.otp || isOtpExpired}
                >
                  {isLoading ? "Verifying OTP..." : "Verify OTP"}
                </motion.button>
                {isOtpExpired && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleSendOTP}
                    className="w-full py-3 border border-purple-500 text-purple-400 rounded-full hover:bg-purple-500 hover:text-white transition-all duration-300 disabled:border-gray-500 disabled:text-gray-500 disabled:cursor-not-allowed text-sm sm:text-base"
                    disabled={isLoading}
                  >
                    Resend OTP
                  </motion.button>
                )}
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative flex items-center">
                  <FaLock className="absolute left-3 text-gray-400 pointer-events-none" />
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    placeholder="New Password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className={`${inputStyles} pl-10 pr-10`}
                    disabled={isLoading}
                    aria-label="New password"
                  />
                  {formData.newPassword && (
                    <button
                      type="button"
                      className="absolute right-3 text-gray-400"
                      onClick={toggleNewPasswordVisibility}
                      aria-label={
                        showNewPassword
                          ? "Hide new password"
                          : "Show new password"
                      }
                    >
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  )}
                </div>
                {errors.newPassword && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors.newPassword}
                  </p>
                )}

                <div className="relative flex items-center">
                  <FaLock className="absolute left-3 text-gray-400 pointer-events-none" />
                  <input
                    id="confirmNewPassword"
                    type={showConfirmNewPassword ? "text" : "password"}
                    name="confirmNewPassword"
                    placeholder="Confirm New Password"
                    value={formData.confirmNewPassword}
                    onChange={handleChange}
                    className={`${inputStyles} pl-10 pr-10`}
                    disabled={isLoading}
                    aria-label="Confirm new password"
                  />
                  {formData.confirmNewPassword && (
                    <button
                      type="button"
                      className="absolute right-3 text-gray-400"
                      onClick={toggleConfirmNewPasswordVisibility}
                      aria-label={
                        showConfirmNewPassword
                          ? "Hide confirm new password"
                          : "Show confirm new password"
                      }
                    >
                      {showConfirmNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  )}
                </div>
                {errors.confirmNewPassword && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors.confirmNewPassword}
                  </p>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className={buttonStyles}
                  disabled={
                    isLoading ||
                    errors.newPassword ||
                    errors.confirmNewPassword ||
                    !formData.newPassword
                  }
                >
                  {isLoading ? "Updating Password..." : "Update Password"}
                </motion.button>
              </form>
            )}
            <p className="text-center text-gray-400 text-sm mt-4">
              Back to{" "}
              <span onClick={() => setMode("signin")} className={linkStyles}>
                Sign In
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
