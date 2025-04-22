// This file provides logging functionality for the application. 
// It enhances console logging with timestamps and can be extended to log to files or external services.

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(...args) {
    const timestamp = new Date().toISOString();
    originalConsoleLog.apply(console, [`[${timestamp}]`, ...args]);
};

console.error = function(...args) {
    const timestamp = new Date().toISOString();
    originalConsoleError.apply(console, [`[${timestamp}] ERROR:`, ...args]);
};