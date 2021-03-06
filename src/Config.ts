import path from 'path';
import util from 'util';
import fs from 'fs';

import { FileConfig } from './interfaces';
import { CONFIG_FILE, CONFIG_FOLDER } from './constants';
import { Helpers } from './helpers';

export class Config {
  readonly configFile: string;
  private readonly nativeFs = {
    writeFile: util.promisify(fs.writeFile),
  };
  private readonly writableContent: FileConfig = {} as FileConfig;

  /**
   * Creates an instance of Config.
   */
  constructor() {
    this.configFile = path.resolve(process.cwd(), CONFIG_FOLDER, CONFIG_FILE);
    this.setWritableContentProperty('version', Helpers.getVersion());
  }

  /**
   * set additional data for property to config file (.gzipperconfig).
   */
  setWritableContentProperty<
    T extends keyof FileConfig,
    K extends FileConfig[T]
  >(field: T, content: K): void {
    this.writableContent[field] = content;
  }

  /**
   * delete property from config file (.gzipperconfig).
   */
  deleteWritableContentProperty<T extends keyof FileConfig>(field: T): void {
    delete this.writableContent[field];
  }

  /**
   * Init or update config (.gzipperconfig).
   */
  async writeConfig(): Promise<void> {
    await this.nativeFs.writeFile(
      path.resolve(this.configFile),
      JSON.stringify(this.writableContent, null, 2),
    );
  }
}
