import coreWebVitals from 'eslint-config-next/core-web-vitals';

// eslint-config-next already ignores `.next`, `out`, `build`, `next-env.d.ts`
// (and ESLint ignores `node_modules`/`.git`), so only what it misses is listed.
const generatedOutput = ['coverage/**', '**/*.tsbuildinfo'];

const config = [
  { ignores: generatedOutput },
  ...coreWebVitals,
  {
    rules: {
      'no-console': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react/display-name': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react/jsx-no-undef': 'warn',
    },
  },
  {
    // The base rule misreports on TypeScript (types, enums and implements
    // clauses); eslint-config-next already enables the TS-aware variant.
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // Shared application code must not use `any`; reach for `unknown` plus a
    // type guard (see lib/errorUtils.ts) or a proper interface instead.
    // Tests and Cypress specs keep their looser mocks.
    files: ['**/*.{ts,tsx,mts,cts}'],
    ignores: [
      '**/__tests__/**',
      '**/*.{test,spec}.{ts,tsx}',
      'cypress/**',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['**/*.{js,cjs,mjs,jsx}'],
    rules: {
      'no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];

export default config;
