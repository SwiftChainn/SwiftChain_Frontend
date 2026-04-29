import coreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...coreWebVitals,
  {
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'warn',
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'tsconfig.tsbuildinfo'],
  },
];

export default config;
