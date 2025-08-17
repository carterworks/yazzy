function formatMessage(message: string) {
  return `[${new Date().toISOString()}] ${message}`;
}

export class Logger {
  log(message: string, ...rest: string[]) {
    console.log(formatMessage(message), ...rest);
  }
  error(message: string, ...rest: string[]) {
    console.error(formatMessage(message), ...rest);
  }
}

export const logger = new Logger();
