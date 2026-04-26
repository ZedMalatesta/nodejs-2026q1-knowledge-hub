import {
  appendFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
} from 'fs';
import { join } from 'path';

export class FileRotatingWriter {
  private readonly filePath: string;
  private readonly maxBytes: number;

  constructor(dir: string, maxKb: number) {
    this.maxBytes = maxKb * 1024;
    this.filePath = join(dir, 'app.log');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  write(line: string): void {
    try {
      this.rotateIfNeeded();
      appendFileSync(this.filePath, line);
    } catch {
      // never let log I/O crash the app
    }
  }

  private rotateIfNeeded(): void {
    if (!existsSync(this.filePath)) return;
    if (statSync(this.filePath).size < this.maxBytes) return;
    const ts = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const rotated = this.filePath.replace('app.log', `app-${ts}.log`);
    renameSync(this.filePath, rotated);
  }
}
