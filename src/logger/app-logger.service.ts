import {
  ConsoleLogger,
  ConsoleLoggerOptions,
  Injectable,
  LogLevel,
} from '@nestjs/common';

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

  constructor(context?: string, options?: ConsoleLoggerOptions) {
    super(context ?? '', options ?? {});
  }

  log(message: any, context?: string): void {
    if (!this.isLevelEnabled('log')) return;
    this.isProd
      ? this.writeJson('log', message, context)
      : super.log(message, context);
  }

  warn(message: any, context?: string): void {
    if (!this.isLevelEnabled('warn')) return;
    this.isProd
      ? this.writeJson('warn', message, context)
      : super.warn(message, context);
  }

  error(message: any, stack?: string, context?: string): void {
    if (!this.isLevelEnabled('error')) return;
    this.isProd
      ? this.writeJson('error', message, context, 'stderr', stack)
      : super.error(message, stack, context);
  }

  verbose(message: any, context?: string): void {
    if (!this.isLevelEnabled('verbose')) return;
    this.isProd
      ? this.writeJson('verbose', message, context)
      : super.verbose(message, context);
  }

  debug(message: any, context?: string): void {
    if (!this.isLevelEnabled('debug')) return;
    this.isProd
      ? this.writeJson('debug', message, context)
      : super.debug(message, context);
  }

  private writeJson(
    level: string,
    message: any,
    context?: string,
    stream: 'stdout' | 'stderr' = 'stdout',
    stack?: string,
  ): void {
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
    process[stream].write(JSON.stringify(entry) + '\n');
  }
}
