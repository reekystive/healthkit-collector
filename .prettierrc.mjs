/** @type {import('prettier').Config} */
export default {
  semi: true,
  printWidth: 120,
  trailingComma: 'es5',
  singleQuote: true,
  tabWidth: 2,
  plugins: ['prettier-plugin-organize-imports'],
  organizeImportsSkipDestructiveCodeActions: true,
  overrides: [
    {
      files: 'tsconfig{,.node}.json',
      options: { parser: 'jsonc' },
    },
  ],
};
