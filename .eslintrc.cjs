module.exports = {
    root: true,
    env: { browser: true, es2020: true, node: true },
    extends: [
        'eslint:recommended',
    ],
    ignorePatterns: ['dist', '.eslintrc.cjs', 'reports', 'node_modules', 'scripts', 'src/**/*.ts', 'src/**/*.tsx'],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        'no-unused-vars': 'error',
        'no-console': 'off',
    },
}