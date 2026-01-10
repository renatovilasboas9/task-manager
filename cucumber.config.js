export default {
    import: [
        'src/e2e/support/hooks.ts',
        'src/e2e/steps/*.ts'
    ],
    format: [
        'progress-bar',
        'json:reports/tests/e2e.json'
    ],
    formatOptions: {
        snippetInterface: 'async-await'
    },
    paths: ['src/e2e/features/*.feature'],
    parallel: 1,
    retry: 0,
    timeout: 90000  // Increased from 60s to 90s for complex multi-task scenarios
};