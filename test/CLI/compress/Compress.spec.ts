import assert from 'assert';
import sinon from 'sinon';
import zlib from 'zlib';
import path from 'path';
import util from 'util';
import fs from 'fs';

import { Compress } from '../../../src/Compress';
import {
  EMPTY_FOLDER_PATH,
  COMPRESS_PATH,
  COMPRESS_PATH_TARGET,
  getFiles,
  createFolder,
  clear,
  COMPRESSION_EXTENSIONS,
} from '../../utils';
import { CompressOptions } from '../../../src/interfaces';
import { NO_FILES_MESSAGE } from '../../../src/constants';

const lstat = util.promisify(fs.lstat);

describe('CLI Compress', () => {
  let sinonSandbox: sinon.SinonSandbox;

  beforeEach(async () => {
    await createFolder(EMPTY_FOLDER_PATH);
    await createFolder(COMPRESS_PATH_TARGET);
    await clear(COMPRESS_PATH, COMPRESSION_EXTENSIONS);
    sinonSandbox = sinon.createSandbox();
  });

  afterEach(async () => {
    await clear(EMPTY_FOLDER_PATH, true);
    await clear(COMPRESS_PATH_TARGET, true);
    await clear(COMPRESS_PATH, COMPRESSION_EXTENSIONS);
    sinonSandbox.restore();
    sinon.restore();
  });

  it('should throw an error if no path found', () => {
    try {
      new Compress(null as any, null);
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, `Can't find a path.`);
    }
  });

  it('should throw on compress error', async () => {
    const compress = new Compress(COMPRESS_PATH, null);
    const compileFolderRecursivelySpy = sinon.spy(
      compress,
      'compileFolderRecursively' as any,
    );
    const errorSpy = sinon.spy((compress as any).logger, 'error');
    sinonSandbox
      .stub(compress, 'compressFile' as any)
      .rejects(new Error('Compressing error.'));

    try {
      await compress.run();
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, 'Compressing error.');
      assert.ok(compileFolderRecursivelySpy.calledWithExactly(COMPRESS_PATH));
      assert.ok(
        errorSpy.calledOnceWithExactly(sinon.match.instanceOf(Error), true),
      );
    }
  });

  it('should print message about appropriate files', async () => {
    const options = {
      threshold: 0,
      exclude: [
        'js',
        'css',
        'html',
        'png',
        'jpg',
        'jpeg',
        'webp',
        'svg',
        'json',
        'csv',
        'txt',
        'xml',
        'ico',
        'md',
        'gif',
        'sunny',
      ],
    };
    const compress = new Compress(COMPRESS_PATH, null, options);
    const noFilesWarnSpy = sinon.spy((compress as any).logger, 'warn');
    await compress.run();

    assert.ok(noFilesWarnSpy.calledWithExactly(NO_FILES_MESSAGE, true));
    assert.ok(
      (compress as any).createCompression() instanceof (zlib as any).Gzip,
    );
    assert.strictEqual((compress as any).compressionInstance.ext, 'gz');
    assert.strictEqual(
      Object.keys((compress as any).compressionInstance.compressionOptions)
        .length,
      0,
    );
    assert.strictEqual(Object.keys((compress as any).options).length, 2);
  });

  it('should print message about empty folder', async () => {
    const compress = new Compress(EMPTY_FOLDER_PATH, null);
    const noFilesWarnSpy = sinon.spy((compress as any).logger, 'warn');
    await compress.run();

    assert.ok(noFilesWarnSpy.calledWithExactly(NO_FILES_MESSAGE, true));
    assert.ok(
      (compress as any).createCompression() instanceof (zlib as any).Gzip,
    );
    assert.strictEqual((compress as any).compressionInstance.ext, 'gz');
    assert.strictEqual(
      Object.keys((compress as any).compressionInstance.compressionOptions)
        .length,
      0,
    );
    assert.strictEqual(Object.keys((compress as any).options).length, 0);
  });

  it('--verbose should print logs to console and use default configuration', async () => {
    const options = { verbose: true, threshold: 0 };
    const compress = new Compress(COMPRESS_PATH, null, options);
    const loggerSuccessSpy = sinon.spy((compress as any).logger, 'success');
    const loggerInfoSpy = sinon.spy((compress as any).logger, 'info');
    await compress.run();
    const files = await getFiles(COMPRESS_PATH, ['.gz']);

    assert.ok(
      loggerSuccessSpy.calledOnceWithExactly(
        `${files.length} files have been compressed.`,
        true,
      ),
    );
    assert.strictEqual(loggerInfoSpy.callCount, files.length + 1);
    assert.ok(
      (compress as any).createCompression() instanceof (zlib as any).Gzip,
    );
    assert.strictEqual((compress as any).compressionInstance.ext, 'gz');
    assert.strictEqual(
      Object.keys((compress as any).compressionInstance.compressionOptions)
        .length,
      0,
    );
    assert.strictEqual(Object.keys((compress as any).options).length, 2);
  });

  it('should compress a single file to a certain folder', async () => {
    const file = `${COMPRESS_PATH}${path.sep}index.txt`;
    const compress = new Compress(file, COMPRESS_PATH_TARGET);
    const loggerSuccessSpy = sinon.spy((compress as any).logger, 'success');
    await compress.run();
    const compressedFiles = await getFiles(COMPRESS_PATH_TARGET, ['.gz']);

    assert.ok(
      loggerSuccessSpy.calledOnceWithExactly(
        `1 file has been compressed.`,
        true,
      ),
    );
    assert.strictEqual(compressedFiles.length, 1);
    assert.ok(
      (compress as any).createCompression() instanceof (zlib as any).Gzip,
    );
    assert.strictEqual((compress as any).compressionInstance.ext, 'gz');
    assert.strictEqual(
      Object.keys((compress as any).compressionInstance.compressionOptions)
        .length,
      0,
    );
    assert.strictEqual(Object.keys((compress as any).options).length, 0);
  });

  it('should compress files to a certain folder with existing folder structure', async () => {
    const compress = new Compress(COMPRESS_PATH, COMPRESS_PATH_TARGET);
    const loggerSuccessSpy = sinon.spy((compress as any).logger, 'success');
    await compress.run();
    const files = await getFiles(COMPRESS_PATH);
    const compressedFiles = await getFiles(COMPRESS_PATH_TARGET, ['.gz']);

    const filesRelative = files.map(file => path.relative(COMPRESS_PATH, file));
    const compressedRelative = compressedFiles.map(file =>
      path.relative(COMPRESS_PATH_TARGET, file),
    );

    assert.ok(
      loggerSuccessSpy.calledOnceWithExactly(
        `${files.length} files have been compressed.`,
        true,
      ),
    );
    assert.strictEqual(files.length, compressedFiles.length);
    for (const file of filesRelative) {
      assert.ok(
        compressedRelative.some(compressedFile => {
          const withoutExtFile = compressedFile.replace(
            path.basename(compressedFile),
            path.parse(path.basename(compressedFile)).name,
          );
          return withoutExtFile === file;
        }),
      );
    }
    assert.ok(
      (compress as any).createCompression() instanceof (zlib as any).Gzip,
    );
    assert.strictEqual((compress as any).compressionInstance.ext, 'gz');
    assert.strictEqual(
      Object.keys((compress as any).compressionInstance.compressionOptions)
        .length,
      0,
    );
    assert.strictEqual(Object.keys((compress as any).options).length, 0);
  });

  it('getOutputPath should returns correct file path', () => {
    const compress = new Compress(COMPRESS_PATH, null);
    const target = '/the/elder/scrolls/';
    const file = 'skyrim.js';

    let outputFilePath = (compress as any).getOutputPath(target, file);
    assert.strictEqual(
      outputFilePath,
      '/the/elder/scrolls/skyrim.js.gz'.split('/').join(path.sep),
    );

    (compress as any).options.outputFileFormat =
      'test[filename].[compressExt].[ext]';
    outputFilePath = (compress as any).getOutputPath(target, file);
    assert.strictEqual(
      outputFilePath,
      '/the/elder/scrolls/testskyrim.gz.js'.split('/').join(path.sep),
    );

    (compress as any).options.outputFileFormat =
      '[filename]-test.[compressExt]';
    outputFilePath = (compress as any).getOutputPath(target, file);
    assert.strictEqual(
      outputFilePath,
      '/the/elder/scrolls/skyrim-test.gz'.split('/').join(path.sep),
    );

    (compress as any).options.outputFileFormat =
      '[filename]-[hash]-[filename]-test.[compressExt].[ext]';
    outputFilePath = (compress as any).getOutputPath(target, file);
    const execHash = /(?<=skyrim-)(.*)(?=-skyrim)/.exec(
      outputFilePath,
    ) as RegExpExecArray;
    assert.strictEqual(
      outputFilePath,
      `/the/elder/scrolls/skyrim-${execHash[0]}-skyrim-test.gz.js`
        .split('/')
        .join(path.sep),
    );
  });

  it('should use default file format artifacts via --output-file-format and print to console via --verbose flag', async () => {
    const options = { verbose: true, threshold: 0 };
    const compress = new Compress(COMPRESS_PATH, null, options);
    const loggerSuccessSpy = sinon.spy((compress as any).logger, 'success');
    const loggerInfoSpy = sinon.spy((compress as any).logger, 'info');
    const getOutputPathSpy = sinon.spy(compress, 'getOutputPath' as any);
    await compress.run();
    const files = await getFiles(COMPRESS_PATH, ['.gz']);

    assert.ok(
      loggerSuccessSpy.calledOnceWithExactly(
        `${files.length} files have been compressed.`,
        true,
      ),
    );
    assert.ok(
      loggerInfoSpy.calledWithExactly(
        `Default output file format: [filename].[ext].[compressExt]`,
      ),
    );
    assert.strictEqual(loggerInfoSpy.callCount, files.length + 1);
    assert.strictEqual(getOutputPathSpy.callCount, files.length);
    assert.ok(
      (compress as any).createCompression() instanceof (zlib as any).Gzip,
    );
    assert.strictEqual((compress as any).compressionInstance.ext, 'gz');
    assert.strictEqual(
      Object.keys((compress as any).compressionInstance.compressionOptions)
        .length,
      0,
    );
    assert.strictEqual(Object.keys((compress as any).options).length, 2);
    assert.strictEqual((compress as any).options.outputFileFormat, undefined);

    for (let index = 0; index < getOutputPathSpy.callCount; index++) {
      const call = getOutputPathSpy.getCall(index);
      const [fullPath, filename] = call.args;
      assert.strictEqual(
        call.returnValue,
        path.join(
          fullPath,
          `${filename}.${(compress as any).compressionInstance.ext}`,
        ),
      );
    }
  });

  async function validateOutputFileFormat(
    options: CompressOptions,
    outputFileFormat: string,
  ): Promise<[Compress, sinon.SinonSpy]> {
    const compress = new Compress(COMPRESS_PATH, COMPRESS_PATH_TARGET, options);
    const loggerSuccessSpy = sinon.spy((compress as any).logger, 'success');
    const loggerInfoSpy = sinon.spy((compress as any).logger, 'info');
    const getOutputPathSpy = sinon.spy(compress, 'getOutputPath' as any);
    await compress.run();
    const files = await getFiles(COMPRESS_PATH_TARGET);

    assert.ok(
      loggerSuccessSpy.calledOnceWithExactly(
        `${files.length} files have been compressed.`,
        true,
      ),
    );
    assert.ok(
      loggerInfoSpy.neverCalledWithMatch(
        `Default output file format: [filename].[ext].[compressExt]`,
      ),
    );
    assert.strictEqual(getOutputPathSpy.callCount, files.length);
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
    assert.strictEqual(
      (compress as any).options.outputFileFormat,
      outputFileFormat,
    );

    return [compress, getOutputPathSpy];
  }

  it('should set custom file format artifacts (test-[filename]-55-[filename].[compressExt]x.[ext]) via --output-file-format', async () => {
    const options = {
      outputFileFormat: 'test-[filename]-55-[filename].[compressExt]x.[ext]',
      verbose: true,
      threshold: 0,
    };

    const [compress, getOutputPathSpy] = await validateOutputFileFormat(
      options,
      options.outputFileFormat,
    );

    for (let index = 0; index < getOutputPathSpy.callCount; index++) {
      const call = getOutputPathSpy.getCall(index);
      const [fullPath, file] = call.args;
      const filename = path.parse(file).name;
      const ext = path.extname(file).slice(1);
      assert.strictEqual(
        call.returnValue,
        path.join(
          fullPath,
          `test-${filename}-55-${filename}.${
            (compress as any).compressionInstance.ext
          }x.${ext}`,
        ),
      );
    }
  });

  it('should set custom file format artifacts ([filename]-[hash]-55.[ext]) via --output-file-format', async () => {
    const options = {
      outputFileFormat: '[filename]-[hash]-55.[ext]',
      verbose: true,
      threshold: 0,
    };

    const [, getOutputPathSpy] = await validateOutputFileFormat(
      options,
      options.outputFileFormat,
    );

    for (let index = 0; index < getOutputPathSpy.callCount; index++) {
      const call = getOutputPathSpy.getCall(index);
      const [fullPath, file] = call.args;
      const filename = path.parse(file).name;
      const ext = path.extname(file).slice(1);
      const execHash = new RegExp(`(?<=${filename}-)(.*)(?=-55)`, 'g').exec(
        call.returnValue,
      ) as RegExpExecArray;
      assert.strictEqual(
        call.returnValue,
        path.join(fullPath, `${filename}-${execHash[0]}-55.${ext}`),
      );
    }
  });

  it('should include specific file extensions for compression (also exclude others)', async () => {
    const options = {
      include: ['sunny'],
      verbose: true,
      threshold: 0,
    };
    const compress = new Compress(COMPRESS_PATH, null, options);
    const loggerSuccessSpy = sinon.spy((compress as any).logger, 'success');
    const loggerInfoSpy = sinon.spy((compress as any).logger, 'info');
    await compress.run();
    const files = await getFiles(COMPRESS_PATH, ['.gz']);

    assert.ok(
      loggerSuccessSpy.calledOnceWithExactly(
        `${files.length} file has been compressed.`,
        true,
      ),
    );
    assert.equal(files.length, 1);
    assert.strictEqual(loggerInfoSpy.callCount, files.length + 1);
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

  it('should exclude file extensions from compression jpeg,jpg', async () => {
    const options = {
      exclude: ['jpeg', 'jpg'],
      verbose: true,
      threshold: 0,
    };
    const beforeFiles = (await getFiles(COMPRESS_PATH)).filter(file => {
      const ext = path.extname(file);
      return !(ext === '.jpeg' || ext === '.jpg');
    });
    const compress = new Compress(COMPRESS_PATH, null, options);
    const loggerSuccessSpy = sinon.spy((compress as any).logger, 'success');
    const loggerInfoSpy = sinon.spy((compress as any).logger, 'info');
    await compress.run();
    const files = await getFiles(COMPRESS_PATH, ['.gz']);

    assert.ok(
      loggerSuccessSpy.calledOnceWithExactly(
        `${files.length} files have been compressed.`,
        true,
      ),
    );
    assert.equal(beforeFiles.length, files.length);
    assert.strictEqual(loggerInfoSpy.callCount, beforeFiles.length + 1);
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

  it('should exclude file sizes smaller than 860 bytes from compression', async () => {
    const THRESHOLD = 860;
    const options = {
      threshold: THRESHOLD,
      verbose: true,
    };
    let includedFiles = 0;
    const files = await getFiles(COMPRESS_PATH);
    for (const filePath of files) {
      const { size: fileSize } = await lstat(filePath);
      if (fileSize < THRESHOLD) {
        continue;
      }
      ++includedFiles;
    }
    const compress = new Compress(COMPRESS_PATH, null, options);
    const loggerSuccessSpy = sinon.spy((compress as any).logger, 'success');
    const loggerInfoSpy = sinon.spy((compress as any).logger, 'info');
    await compress.run();
    const filesGzipped = await getFiles(COMPRESS_PATH, ['.gz']);

    assert.ok(
      loggerSuccessSpy.calledOnceWithExactly(
        `${filesGzipped.length} files have been compressed.`,
        true,
      ),
    );
    assert.strictEqual(loggerInfoSpy.callCount, includedFiles + 1);
    assert.ok(
      (compress as any).createCompression() instanceof (zlib as any).Gzip,
    );
    assert.strictEqual((compress as any).compressionInstance.ext, 'gz');
    assert.strictEqual(
      Object.keys((compress as any).compressionInstance.compressionOptions)
        .length,
      0,
    );
    assert.strictEqual(Object.keys((compress as any).options).length, 2);
  });
});