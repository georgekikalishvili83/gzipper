import fs from 'fs';
import util from 'util';

import * as pack from '../package.json';

export class Helpers {
  private static readonly nativeFs = {
    mkdir: util.promisify(fs.mkdir),
  };

  /**
   * Create folders by path.
   */
  static async createFolders(target: string): Promise<void> {
    await this.nativeFs.mkdir(target, { recursive: true });
  }

  /**
   * Convert Map to JSON.
   */
  static mapToJSON<K extends string, V>(map: Map<K, V>): Record<K, V> {
    return Array.from(map).reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {} as Record<K, V>);
  }

  /**
   * Returns package version.
   */
  static getVersion(): string {
    return pack.version;
  }

  /**
   * Converts a long string of bytes into a readable format e.g KB, MB, GB, TB, YB
   */
  static readableSize(bytes: number): string {
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    return `${Number((bytes / Math.pow(1024, i)).toFixed(2)).toString()} ${
      sizes[i] || 'b'
    }`;
  }

  /**
   * returns readable format from hrtime.
   */
  static readableHrtime(hrTime: [number, number]): string {
    const [seconds, nanoseconds] = hrTime;
    return `${seconds ? seconds + 's ' : ''}${nanoseconds / 1e6}ms`;
  }

  /**
   * Read file via readable stream.
   */
  static async readFile(file: string): Promise<string> {
    let data = '';
    const stream = fs.createReadStream(file, { encoding: 'utf8' });

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => (data += chunk));
      stream.on('end', () => resolve(data));
      stream.on('error', (err) => reject(err));
    });
  }
}
