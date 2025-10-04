const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = './logs';
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getLogFileName(level) {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${level}-${date}.log`);
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}\n`;
  }

  writeToFile(level, message, meta = {}) {
    const logFile = this.getLogFileName(level);
    const formattedMessage = this.formatMessage(level, message, meta);
    
    fs.appendFile(logFile, formattedMessage, (err) => {
      if (err) {
        console.error('Failed to write to log file:', err);
      }
    });
  }

  log(level, message, meta = {}) {
    // Console output
    const timestamp = new Date().toISOString();
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`);
    
    // File output
    this.writeToFile(level, message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, meta);
    }
  }

  // Express middleware for request logging
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        };
        
        if (res.statusCode >= 400) {
          this.error(`${req.method} ${req.url}`, logData);
        } else {
          this.info(`${req.method} ${req.url}`, logData);
        }
      });
      
      next();
    };
  }
}

module.exports = new Logger();
