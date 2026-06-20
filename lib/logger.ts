import { config } from "./config";

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

class Logger {
  private format(level: LogLevel, context: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] [${context}] ${message}${metaString}`;
  }

  public info(context: string, message: string, meta?: any) {
    console.log(this.format('INFO', context, message, meta));
  }

  public warn(context: string, message: string, meta?: any) {
    console.warn(this.format('WARN', context, message, meta));
  }

  public error(context: string, message: string, error?: any, meta?: any) {
    let errMeta = meta || {};
    if (error) {
      errMeta = {
        ...errMeta,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };
    }
    console.error(this.format('ERROR', context, message, errMeta));
  }

  public debug(context: string, message: string, meta?: any) {
    if (!config.isProduction) {
      console.log(this.format('DEBUG', context, message, meta));
    }
  }
}

export const logger = new Logger();
