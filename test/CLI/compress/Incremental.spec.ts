import sinon from 'sinon';
import assert from 'assert';
import zlib from 'zlib';
import path from 'path';
import fs from 'fs';
import util from 'util';

import {
  COMPRESSION_EXTENSIONS,
  COMPRESS_PATH,
  clear,
  getFiles,
  GZIPPER_CONFIG_FOLDER,
} from '../../utils';
import { Compress } from '../../../src/Compress';
import { LogLevel } from '../../../src/logger/LogLevel.enum';
import { INCREMENTAL_ENABLE_MESSAGE } from '../../../src/constants';
import { FileConfig } from '../../../src/interfaces';

const fsExists = util.promisify(fs.exists);
const fsReadFile = util.promisify(fs.readFile);

function validateConfig(config: FileConfig, files: string[]): boolean {
  const version = config.version;
  const incremental = config.incremental;

  if (version && incremental) {
    const hasFiles = Object.keys(incremental.files).length === files.length;
    const hasRevisions = Object.values(incremental.files).every(
      (file) => file.revisions.length,
    );
    const hasRevisionConfig = Object.values(incremental.files)
      .map((file) => file.revisions)
      .every((revisions) =>
        revisions.every(
          (revision) =>
            revision.date &&
            revision.lastChecksum &&
            revision.fileId &&
            revision.options,
        ),
      );
    return hasFiles && hasRevisions && hasRevisionConfig;
  }

  return false;
}

describe('CLI Compress -> Incremental', () => {
  let sinonSandbox: sinon.SinonSandbox;

  beforeEach(async () => {
    await clear(COMPRESS_PATH, COMPRESSION_EXTENSIONS);
    sinonSandbox = sinon.createSandbox();
  });

  afterEach(async () => {
    await clear(COMPRESS_PATH, COMPRESSION_EXTENSIONS);
    await clear(GZIPPER_CONFIG_FOLDER, true);
    sinonSandbox.restore();
    sinon.restore();
  });

  it('should compile files and create .gzipper folder', async () => {
    const options = { verbose: true, threshold: 0, incremental: true };
    const compress = new Compress(COMPRESS_PATH, null, options);
    const logSpy = sinon.spy((compress as any).logger, 'log');
    await compress.run();
    const files = await getFiles(COMPRESS_PATH, ['.gz']);

    const exists = await fsExists(path.resolve(process.cwd(), './.gzipper'));
    assert.ok(exists);
    assert.ok(
      logSpy.calledWithExactly(INCREMENTAL_ENABLE_MESSAGE, LogLevel.INFO),
    );
    assert.ok(logSpy.calledWithExactly('Compression GZIP | ', LogLevel.INFO));
    assert.ok(
      logSpy.calledWithExactly(
        'Default output file format: [filename].[ext].[compressExt]',
        LogLevel.INFO,
      ),
    );
    assert.ok(
      logSpy.calledWithExactly(
        sinon.match(
          new RegExp(`${files.length} files have been compressed\. \(.+\)`),
        ),
        LogLevel.SUCCESS,
      ),
    );
    assert.strictEqual(
      logSpy.withArgs(
        sinon.match(
          /File \w+\.\w+ has been compressed \d+\.?\d+ \w+ -> \d+\.?\d+ \w+ \(.+\)/,
        ),
      ).callCount,
      files.length,
    );
    assert.ok(
      (compress as any).createCompression() instanceof (zlib as any).Gzip,
    );
    assert.strictEqual((compress as any).compressionInstance.ext, 'gz');
    assert.strictEqual(
      Object.keys((compress as any).compressionInstance.compressionOptions)
        .length,
      0,
    );
    assert.strictEqual(Object.keys((compress as any).options).length, 3);
  });

  it('should generate .gzipperconfig', async () => {
    const options = { threshold: 0, incremental: true };
    const compress = new Compress(COMPRESS_PATH, null, options);
    const files = await getFiles(COMPRESS_PATH);
    await compress.run();

    const configPath = path.resolve(process.cwd(), './.gzipper/.gzipperconfig');
    const exists = await fsExists(configPath);
    assert.ok(exists);
    const fileConfig = await fsReadFile(configPath);
    const config = JSON.parse(fileConfig.toString());
    assert.ok(validateConfig(config, files));
  });

  it('should retrieve all files from cache', async () => {
    const options = { threshold: 0, incremental: true };
    const configPath = path.resolve(process.cwd(), './.gzipper/.gzipperconfig');
    const compress = new Compress(COMPRESS_PATH, null, options);
    const compressFileSpy = sinon.spy(compress as any, 'compressFile');

    await compress.run();
    const configBefore = JSON.parse((await fsReadFile(configPath)).toString());
    assert.ok(
      compressFileSpy.alwaysReturned(Promise.resolve({ isCached: false })),
    );

    await clear(COMPRESS_PATH, COMPRESSION_EXTENSIONS);

    await compress.run();
    const configAfter = JSON.parse((await fsReadFile(configPath)).toString());
    assert.ok(
      compressFileSpy.alwaysReturned(Promise.resolve({ isCached: true })),
    );

    assert.deepStrictEqual(configBefore, configAfter);
  });
});