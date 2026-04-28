'use client';

import { useState } from 'react';
import Link from 'next/link';
import { InputField } from '@/components/forms/InputField';
import { useLogin } from '@/hooks/useLogin';

export default function LoginForm() {
  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useLogin();
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6">
      <h1 className="text-2xl text-gray-600 font-bold mb-2">Sign In</h1>
      <p className="text-gray-600 mb-6">
        Welcome back! Please sign in to your account
      </p>

      <InputField
        name="email"
        label="Email Address"
        type="email"
        placeholder="Enter your email"
        required
        value={values.email}
        error={errors.email}
        onChange={(value) => handleChange('email', value)}
        onBlur={() => handleBlur('email')}
      />

      <div className="mb-4">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Password
          <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={values.password || ''}
            placeholder="Enter your password"
            onChange={(e) => handleChange('password', e.target.value)}
            onBlur={() => handleBlur('password')}
            className={`
              w-full px-3 py-2 border rounded-md shadow-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${
                errors.password
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }
            `}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-500">{errors.password}</p>
        )}
      </div>

      <div className="mb-6 flex items-center justify-between">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            aria-label="Remember me"
          />
          <span className="ml-2 text-sm text-gray-700">Remember me</span>
        </label>
        <Link
          href="/forgot-password"
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          Forgot Password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`
          w-full py-2 px-4 rounded-md font-semibold text-white
          transition duration-200 ease-in-out
          ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }
        `}
      >
        {isSubmitting ? 'Signing In...' : 'Sign In'}
      </button>

      <p className="mt-4 text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
