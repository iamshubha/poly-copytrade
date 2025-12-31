/**
 * Structured Logging Utility
 * Production-ready logger with log levels, context, and formatting
 * 
 * Features:
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR, CRITICAL)
 * - Structured JSON output for production
 * - Pretty printing for development
 * - Context preservation
 * - Performance tracking
 * - Error tracking integration ready
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  tradeId?: string;
  marketId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.level = this.parseLogLevel(process.env.LOG_LEVEL || 'INFO');
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toUpperCase()) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      case 'CRITICAL':
        return LogLevel.CRITICAL;
      default:
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Pretty print for development
      const emoji = this.getLevelEmoji(entry.level);
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      let output = `${emoji} [${timestamp}] ${entry.level}: ${entry.message}`;
      
      if (entry.context && Object.keys(entry.context).length > 0) {
        output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
      }
      
      if (entry.error) {
        output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
        if (entry.error.stack) {
          output += `\n${entry.error.stack}`;
        }
      }
      
      if (entry.duration) {
        output += `\n  Duration: ${entry.duration}ms`;
      }
      
      return output;
    } else {
      // JSON output for production (easy to parse)
      return JSON.stringify(entry);
    }
  }

  private getLevelEmoji(level: string): string {
    switch (level) {
      case 'DEBUG':
        return '🐛';
      case 'INFO':
        return 'ℹ️';
      case 'WARN':
        return '⚠️';
      case 'ERROR':
        return '❌';
      case 'CRITICAL':
        return '🔥';
      default:
        return '📝';
    }
  }

  private log(level: LogLevel, levelName: string, message: string, context?: LogContext, error?: Error) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const formatted = this.formatLog(entry);
    
    // Output to appropriate stream
    if (level >= LogLevel.ERROR) {
      console.error(formatted);
    } else {
      console.log(formatted);
    }

    // In production, you might also want to:
    // - Send to external logging service (Datadog, Sentry, etc.)
    // - Write to file
    // - Send to log aggregation service
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, 'INFO', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, 'WARN', message, context);
  }

  error(message: string, errorOrContext?: Error | LogContext, context?: LogContext) {
    const error = errorOrContext instanceof Error ? errorOrContext : undefined;
    const ctx = errorOrContext instanceof Error ? context : errorOrContext;
    this.log(LogLevel.ERROR, 'ERROR', message, ctx, error);
  }

  critical(message: string, errorOrContext?: Error | LogContext, context?: LogContext) {
    const error = errorOrContext instanceof Error ? errorOrContext : undefined;
    const ctx = errorOrContext instanceof Error ? context : errorOrContext;
    this.log(LogLevel.CRITICAL, 'CRITICAL', message, ctx, error);
  }

  /**
   * Create a child logger with preset context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    const originalLog = this.log.bind(this);
    
    childLogger.log = (level: LogLevel, levelName: string, message: string, ctx?: LogContext, error?: Error) => {
      const mergedContext = { ...context, ...ctx };
      originalLog(level, levelName, message, mergedContext, error);
    };
    
    return childLogger;
  }

  /**
   * Measure execution time of an async function
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const start = Date.now();
    this.debug(`Starting: ${operation}`, context);
    
    try {
      const result = await fn();
      const duration = Date.now() - start;
      
      this.info(`Completed: ${operation}`, {
        ...context,
        duration,
      });
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - start;
      
      this.error(`Failed: ${operation}`, error, {
        ...context,
        duration,
      });
      
      throw error;
    }
  }

  /**
   * Log API request
   */
  logRequest(method: string, path: string, context?: LogContext) {
    this.info(`${method} ${path}`, {
      ...context,
      type: 'request',
    });
  }

  /**
   * Log API response
   */
  logResponse(method: string, path: string, status: number, duration: number, context?: LogContext) {
    const level = status >= 400 ? 'error' : 'info';
    
    this[level](`${method} ${path} - ${status}`, {
      ...context,
      type: 'response',
      status,
      duration,
    });
  }

  /**
   * Log trade execution
   */
  logTrade(action: string, tradeData: any, context?: LogContext) {
    this.info(`Trade ${action}`, {
      ...context,
      ...tradeData,
      type: 'trade',
    });
  }

  /**
   * Log database operation
   */
  logDatabase(operation: string, table: string, duration?: number, context?: LogContext) {
    this.debug(`DB ${operation}: ${table}`, {
      ...context,
      duration,
      type: 'database',
    });
  }

  /**
   * Log authentication event
   */
  logAuth(event: string, userId?: string, context?: LogContext) {
    this.info(`Auth: ${event}`, {
      ...context,
      userId,
      type: 'auth',
    });
  }

  /**
   * Log security event (always logs regardless of level)
   */
  logSecurity(event: string, context?: LogContext) {
    this.log(LogLevel.WARN, 'SECURITY', event, {
      ...context,
      type: 'security',
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export helper to create child loggers
export function createLogger(context: LogContext): Logger {
  return logger.child(context);
}

// Example usage in API routes:
// 
// import { logger } from '@/lib/logger';
// 
// export async function GET(req: NextRequest) {
//   const requestId = crypto.randomUUID();
//   const log = logger.child({ requestId });
//   
//   log.logRequest('GET', '/api/trades');
//   
//   try {
//     const result = await log.measure('fetch-trades', async () => {
//       return await prisma.trade.findMany();
//     });
//     
//     return NextResponse.json({ success: true, data: result });
//   } catch (error) {
//     log.error('Failed to fetch trades', error);
//     return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
//   }
// }
