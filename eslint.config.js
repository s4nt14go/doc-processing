import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Inherit community-standard rules for both JS and TS.
  // Note: @typescript-eslint/no-explicit-any will error by default.
  // Use // eslint-disable-next-line @typescript-eslint/no-explicit-any to bypass locally.
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  
  {
    languageOptions: {
      // Inject Node.js global variables (like process, __dirname, etc.)
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Should use a structured logger (e.g., @aws-lambda-powertools/logger).
      'no-console': 'error',

      // Allow unused variables only if they start with an underscore (e.g., _req).
      // Useful for satisfying interface signatures without triggering errors.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      
      // Allow @ts-ignore and similar comments
      '@typescript-eslint/ban-ts-comment': 'off',
      
      // Allow the use of TypeScript namespaces
      '@typescript-eslint/no-namespace': 'off',
      
      // Require trailing commas in multiline arrays/objects.
      // This results in cleaner git diffs when adding new lines.
      'comma-dangle': ['error', 'always-multiline'],
    },
  },

  {
    // Apply these strict OOP rules only to TypeScript files
    files: ['**/*.ts', '**/*.mts', '**/*.cts', '**/*.tsx'],
    rules: {
      // Require explicit 'public', 'private', or 'protected' modifiers on class properties and methods.
      // Exceptions are made for accessors (getters/setters).
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'explicit',
          overrides: {
            accessors: 'off',
          },
        },
      ],
    },
  },

  {
    // Placeholder for additional ignores. 
    // Note: node_modules and .git are ignored by default in Flat Config.
    // ignores: ['dist/', 'pack/**', 'coverage/'],
  },
);
