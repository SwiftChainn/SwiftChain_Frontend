'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { InputField } from '@/components/forms/InputField';
import { SelectField } from '@/components/forms/SelectField';
import { useRegistration } from '@/hooks/useRegistration';
import { useRegistrationStore } from '@/store/registrationStore';

export default function RegisterForm() {
  const {
    handleRoleSelect,
    handlePersonalDetailsSubmit,
    handleDriverDetailsSubmit,
    handleFinalSubmit,
    errors,
    setErrors,
  } = useRegistration();

  const {
    role,
    currentStep,
    isSubmitting,
    email,
    password,
    confirmPassword,
    fullName,
    phone,
    businessName,
    businessRegistration,
    licenseNumber,
    licenseExpiry,
    vehicleType,
    vehicleRegistration,
    vehicleModel,
    setPersonalDetails,
    setDriverDetails,
    previousStep,
  } = useRegistrationStore();

  const [formData, setFormData] = useState({
    email,
    password,
    confirmPassword,
    fullName,
    phone,
    businessName: businessName || '',
    businessRegistration: businessRegistration || '',
    licenseNumber: licenseNumber || '',
    licenseExpiry: licenseExpiry || '',
    vehicleType: vehicleType || '',
    vehicleRegistration: vehicleRegistration || '',
    vehicleModel: vehicleModel || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const maxSteps = useMemo(() => {
    return role === 'driver' ? 3 : 2;
  }, [role]);

  // Step 1: Role Selection
  if (currentStep === 1) {
    return (
      <form className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-600 font-bold mb-2">
            Create Your Account
          </h1>
          <p className="text-gray-600">Step 1 of 2: Select your role</p>
        </div>

        {errors.form && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{errors.form}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Customer Role */}
          <button
            type="button"
            onClick={() => handleRoleSelect('customer')}
            className={`p-6 rounded-lg border-2 transition text-left ${
              role === 'customer'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-600 text-lg">
                  Customer
                </h3>
                <p className="text-sm text-gray-600">Order deliveries</p>
              </div>
              {role === 'customer' && (
                <CheckCircle2 className="w-6 h-6 text-blue-500" />
              )}
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Send packages</li>
              <li>• Track deliveries</li>
              <li>• Manage payments</li>
            </ul>
          </button>

          {/* Driver Role */}
          <button
            type="button"
            onClick={() => handleRoleSelect('driver')}
            className={`p-6 rounded-lg border-2 transition text-left ${
              role === 'driver'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-600 text-lg">Driver</h3>
                <p className="text-sm text-gray-600">Deliver packages</p>
              </div>
              {role === 'driver' && (
                <CheckCircle2 className="w-6 h-6 text-blue-500" />
              )}
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Accept jobs</li>
              <li>• Manage vehicle</li>
              <li>• Earn income</li>
            </ul>
          </button>

          {/* Admin Role */}
          <button
            type="button"
            onClick={() => handleRoleSelect('admin')}
            className={`p-6 rounded-lg border-2 transition text-left ${
              role === 'admin'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-600  text-lg">Admin</h3>
                <p className="text-sm text-gray-600">Manage platform</p>
              </div>
              {role === 'admin' && (
                <CheckCircle2 className="w-6 h-6 text-blue-500" />
              )}
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• View analytics</li>
              <li>• Manage users</li>
              <li>• System settings</li>
            </ul>
          </button>
        </div>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-800 font-semibold"
          >
            Sign in
          </Link>
        </p>
      </form>
    );
  }

  // Step 2: Personal/Business Details
  if (currentStep === 2) {
    const isDriver = role === 'driver';

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isDriver) {
            handlePersonalDetailsSubmit(formData);
          } else {
            handleFinalSubmit();
          }
        }}
        className="max-w-2xl mx-auto p-6"
      >
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Create Your Account</h1>
              <p className="text-gray-600">
                Step 2 of {maxSteps}:{' '}
                {isDriver ? 'Personal Details' : 'Account Details'}
              </p>
            </div>
            <div className="text-sm font-semibold text-blue-600">
              {currentStep} / {maxSteps}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 flex gap-2">
          {Array.from({ length: maxSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition ${
                i < currentStep ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {errors.form && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{errors.form}</p>
          </div>
        )}

        {/* Email Field */}
        <InputField
          name="email"
          label="Email Address"
          type="email"
          placeholder="Enter your email"
          required
          value={formData.email}
          error={errors.email}
          onChange={(value) => handleInputChange('email', value)}
        />

        {/* Password Field */}
        <InputField
          name="password"
          label="Password"
          type="password"
          placeholder="At least 8 characters with uppercase, lowercase, and number"
          required
          value={formData.password}
          error={errors.password}
          onChange={(value) => handleInputChange('password', value)}
        />

        {/* Confirm Password Field */}
        <InputField
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="Confirm your password"
          required
          value={formData.confirmPassword}
          error={errors.confirmPassword}
          onChange={(value) => handleInputChange('confirmPassword', value)}
        />

        {/* Full Name Field */}
        <InputField
          name="fullName"
          label="Full Name"
          type="text"
          placeholder="Enter your full name"
          required
          value={formData.fullName}
          error={errors.fullName}
          onChange={(value) => handleInputChange('fullName', value)}
        />

        {/* Phone Field */}
        <InputField
          name="phone"
          label="Phone Number"
          type="tel"
          placeholder="Enter your phone number"
          required
          value={formData.phone}
          error={errors.phone}
          onChange={(value) => handleInputChange('phone', value)}
        />

        {/* Business Details (for non-drivers) */}
        {!isDriver && (
          <>
            <InputField
              name="businessName"
              label="Business Name"
              type="text"
              placeholder="Your business name"
              required={role !== 'customer'}
              value={formData.businessName}
              error={errors.businessName}
              onChange={(value) => handleInputChange('businessName', value)}
            />

            <InputField
              name="businessRegistration"
              label="Business Registration Number"
              type="text"
              placeholder="Optional"
              value={formData.businessRegistration}
              error={errors.businessRegistration}
              onChange={(value) =>
                handleInputChange('businessRegistration', value)
              }
            />
          </>
        )}

        {/* Driver License (preview for drivers) */}
        {isDriver && (
          <InputField
            name="licenseNumber"
            label="Driver License Number"
            type="text"
            placeholder="Your license number"
            required
            value={formData.licenseNumber}
            error={errors.licenseNumber}
            onChange={(value) => handleInputChange('licenseNumber', value)}
          />
        )}

        {/* Button Group */}
        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={previousStep}
            className="flex-1 py-2 px-4 rounded-md font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 py-2 px-4 rounded-md font-semibold text-white transition ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Processing...
              </span>
            ) : isDriver ? (
              'Next'
            ) : (
              'Create Account'
            )}
          </button>
        </div>
      </form>
    );
  }

  // Step 3: Driver Details
  if (currentStep === 3 && role === 'driver') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleDriverDetailsSubmit(formData);
        }}
        className="max-w-2xl mx-auto p-6"
      >
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
              <p className="text-gray-600">Step 3 of 3: Vehicle Details</p>
            </div>
            <div className="text-sm font-semibold text-blue-600">
              {currentStep} / {maxSteps}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 flex gap-2">
          {Array.from({ length: maxSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition ${
                i < currentStep ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {errors.form && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{errors.form}</p>
          </div>
        )}

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Dynamically shown:</strong> These vehicle details fields
            appear only when driver role is selected.
          </p>
        </div>

        {/* License Expiry */}
        <InputField
          name="licenseExpiry"
          label="License Expiry Date"
          type="date"
          required
          value={formData.licenseExpiry}
          error={errors.licenseExpiry}
          onChange={(value) => handleInputChange('licenseExpiry', value)}
        />

        {/* Vehicle Type */}
        <SelectField
          name="vehicleType"
          label="Vehicle Type"
          options={[
            { value: 'car', label: 'Car' },
            { value: 'van', label: 'Van' },
            { value: 'truck', label: 'Truck' },
            { value: 'motorcycle', label: 'Motorcycle' },
            { value: 'bicycle', label: 'Bicycle' },
          ]}
          placeholder="Select vehicle type"
          required
          value={formData.vehicleType}
          error={errors.vehicleType}
          onChange={(value) => handleInputChange('vehicleType', value)}
        />

        {/* Vehicle Registration */}
        <InputField
          name="vehicleRegistration"
          label="Vehicle Registration Number"
          type="text"
          placeholder="e.g., ABC-1234"
          required
          value={formData.vehicleRegistration}
          error={errors.vehicleRegistration}
          onChange={(value) => handleInputChange('vehicleRegistration', value)}
        />

        {/* Vehicle Model */}
        <InputField
          name="vehicleModel"
          label="Vehicle Model"
          type="text"
          placeholder="e.g., Toyota Corolla"
          required
          value={formData.vehicleModel}
          error={errors.vehicleModel}
          onChange={(value) => handleInputChange('vehicleModel', value)}
        />

        {/* Button Group */}
        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={previousStep}
            className="flex-1 py-2 px-4 rounded-md font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 py-2 px-4 rounded-md font-semibold text-white transition ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Creating Account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </div>
      </form>
    );
  }

  return null;
}
