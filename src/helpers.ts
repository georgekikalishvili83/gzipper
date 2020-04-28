import fs from 'fs';
import util from 'util';

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
}
