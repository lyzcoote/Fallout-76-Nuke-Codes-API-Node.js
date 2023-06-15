const util = require('util');
const dateFormat = require('dateformat');

module.exports = class LogManager {
    constructor() {
        this.logger = null;
        this.logFileName = '';

        this.initializeLogFileName();
    }

    initializeLogFileName() {
        const dateNow = new Date();
        this.logFileName = util.format('%s.log', dateFormat(dateNow, 'yyyy-mm-dd HH-MM-ss-l'));
    }

    logLine(level, message) {
        const dateNow = new Date();
        const dateLOG = dateFormat(dateNow, 'dd/mm/yyyy HH:MM:ss:l');
        return util.format('[%s] - [%s] - %s\n', dateLOG, level, typeof message === 'object' ? JSON.stringify(message) : message);
    }

    info(message) {
        const logLine = this.logLine('INFO', message);
        this.logToConsole(logLine);
    }

    debug(message) {
        const logLine = this.logLine('DEBG', message);
        this.logToConsole(logLine);
    }

    error(message) {
        const logLine = this.logLine('ERROR', message);
        this.logToConsole(logLine);
    }

    crash(exception) {
        const errorMessage = exception.message || exception;
        const stackTrace = exception.stack || '';
        const logLine = this.logLine('CRASH', errorMessage);
        const errorLogLine = this.logLine('CRASH', stackTrace);

        this.logToConsole(logLine);
        console.log('STACK TRACE:', stackTrace);
        this.logToConsole(errorLogLine);
    }

    warn(message) {
        const logLine = this.logLine('WARN', message);
        this.logToConsole(logLine);
    }

    log(message) {
        const logLine = this.logLine('INFO', message);
        this.logToConsole(logLine);
    }

    logToConsole(message) {
        console.log(message);
    }
};
