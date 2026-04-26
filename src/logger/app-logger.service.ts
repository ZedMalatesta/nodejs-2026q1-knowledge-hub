import {
  ConsoleLogger,
  ConsoleLoggerOptions,
  Injectable,
  LogLevel,
} from '@nestjs/common';
import { join } from 'path';
import { FileRotatingWriter } from './file-rotating-writer';

const LEVEL_HIERARCHY: LogLevel[] = [
  'error',
  'warn',
  'log',
  'verbose',
  'debug',
];

export function getLogLevels(level: string): LogLevel[] {
  const idx = LEVEL_HIERARCHY.indexOf(level as LogLevel);
  return idx >= 0
    ? LEVEL_HIERARCHY.slice(0, idx + 1)
    : ['error', 'warn', 'log'];
}

@Injectable()
export class AppLogger extends ConsoleLogger {
  private readonly isProd = process.env.NODE_ENV === 'production';
  private readonly fileWriter: FileRotatingWriter;

  constructor(context?: string, options?: ConsoleLoggerOptions) {
    super(context ?? '', options ?? {});
    const maxKb = parseInt(process.env.LOG_MAX_FILE_SIZE ?? '1024', 10);
    this.fileWriter = new FileRotatingWriter(
      join(process.cwd(), 'logs'),
      maxKb,
    );
  }

  log(message: any, context?: string): void {
    if (!this.isLevelEnabled('log')) return;
    this.isProd
      ? this.writeJson('log', message, context)
      : super.log(message, context);
    this.writeFile('log', message, context);
  }

  warn(message: any, context?: string): void {
    if (!this.isLevelEnabled('warn')) return;
    this.isProd
      ? this.writeJson('warn', message, context)
      : super.warn(message, context);
    this.writeFile('warn', message, context);
  }

  error(message: any, stack?: string, context?: string): void {
    if (!this.isLevelEnabled('error')) return;
    this.isProd
      ? this.writeJson('error', message, context, 'stderr', stack)
      : super.error(message, stack, context);
    this.writeFile('error', message, context, stack);
  }

  verbose(message: any, context?: string): void {
    if (!this.isLevelEnabled('verbose')) return;
    this.isProd
      ? this.writeJson('verbose', message, context)
      : super.verbose(message, context);
    this.writeFile('verbose', message, context);
  }

  debug(message: any, context?: string): void {
    if (!this.isLevelEnabled('debug')) return;
    this.isProd
      ? this.writeJson('debug', message, context)
      : super.debug(message, context);
    this.writeFile('debug', message, context);
  }

  private writeJson(
    level: string,
    message: any,
    context?: string,
    stream: 'stdout' | 'stderr' = 'stdout',
    stack?: string,
  ): void {
    process[stream].write(
      JSON.stringify(this.buildEntry(level, message, context, stack)) + '\n',
    );
  }

  private writeFile(
    level: string,
    message: any,
    context?: string,
    stack?: string,
  ): void {
    this.fileWriter.write(
      JSON.stringify(this.buildEntry(level, message, context, stack)) + '\n',
    );
  }

  private buildEntry(
    level: string,
    message: any,
    context?: string,
    stack?: string,
  ): Record<string, unknown> {
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      pid: process.pid,
      context: context ?? this.context ?? '',
      message:
        typeof message === 'object' && message !== null
          ? message
          : String(message),
    };
    if (stack) entry.stack = stack;
    return entry;
  }
}
