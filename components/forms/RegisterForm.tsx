'use client';
import { InputField } from '@/components/forms/InputField';
import { SelectField } from '@/components/forms/SelectField';
import { TextareaField } from '@/components/forms/TextareaField';
import { useFormValidation } from '@/hooks/useFormValidation';

export default function RegisterForm() {
  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
  } = useFormValidation({
    onSubmit: async (data) => {
      console.log('Form submitted:', data);
    },
  });

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Registration Form</h1>

      <InputField
        name="username"
        label="Username"
        placeholder="Enter your username"
        required
        value={values.username}
        error={errors.username}
        onChange={(value) => handleChange('username', value)}
        onBlur={() => handleBlur('username')}
      />

      <InputField
        name="email"
        label="Email"
        type="email"
        placeholder="Enter your email"
        required
        value={values.email}
        error={errors.email}
        onChange={(value) => handleChange('email', value)}
        onBlur={() => handleBlur('email')}
      />

      <InputField
        name="password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        required
        value={values.password}
        error={errors.password}
        onChange={(value) => handleChange('password', value)}
        onBlur={() => handleBlur('password')}
      />

      <SelectField
        name="role"
        label="Role"
        options={[
          { value: 'user', label: 'User' },
          { value: 'admin', label: 'Admin' },
          { value: 'moderator', label: 'Moderator' },
        ]}
        placeholder="Select a role"
        required
        value={values.role}
        error={errors.role}
        onChange={(value) => handleChange('role', value)}
        onBlur={() => handleBlur('role')}
      />

      <TextareaField
        name="bio"
        label="Bio"
        placeholder="Tell us about yourself"
        rows={4}
        maxLength={500}
        value={values.bio}
        error={errors.bio}
        onChange={(value) => handleChange('bio', value)}
        onBlur={() => handleBlur('bio')}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
