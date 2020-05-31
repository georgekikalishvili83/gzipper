import sinon from 'sinon';
import assert from 'assert';

import { Index } from '../../../src/bin';
import { Compress } from '../../../src/Compress';
import { CompressOptions } from '../../../src/interfaces';

describe('Index CLI', () => {
  let sinonSandbox: sinon.SinonSandbox;

  function compareValues(value1: unknown, value2: unknown): boolean {
    if (Array.isArray(value1) && Array.isArray(value2)) {
      return (
        value1.length === value2.length &&
        value1.every((value, index) => value === value2[index])
      );
    }

    return value1 === value2;
  }

  beforeEach(() => {
    sinonSandbox = sinon.createSandbox();
  });

  afterEach(async () => {
    sinonSandbox.restore();
    sinon.restore();
  });

  it("compress <path> [outputPath] - should exec 'runCompress' with options", () => {
    const cliArguments = [
      'node.exe',
      'index.js',
      'compress',
      'folder_to_compress',
      'folder_to_compress_out',
      '--verbose',
      '--incremental',
      '--exclude',
      'png,jpg,js',
      '--include',
      'png,wav',
      '--threshold',
      '500',
      '--level',
      '7',
      '--memory-level',
      '1',
      '--strategy',
      '3',
      '--brotli',
      '--deflate',
      '--brotli-param-mode',
      'text',
      '--brotli-quality',
      '5',
      '--brotli-size-hint',
      '77',
      '--output-file-format',
      'test-[filename].[ext].[compressExt]',
    ];
    const index = new Index();
    (index as any).argv = cliArguments;
    const runCompressSpy = sinonSandbox.spy(index as any, 'runCompress');
    const filterOptionsSpy = sinonSandbox.spy(index as any, 'filterOptions');
    const compressRunStub = sinonSandbox
      .stub(Compress.prototype, 'run')
      .resolves([]);
    index.exec();
    assert.strictEqual(runCompressSpy.callCount, 1);
    assert.strictEqual(compressRunStub.callCount, 1);
    assert.strictEqual(filterOptionsSpy.callCount, 1);
    const [target, outputPath, options] = runCompressSpy.args[0];
    assert.strictEqual(target, 'folder_to_compress');
    assert.strictEqual(outputPath, 'folder_to_compress_out');
    const response: CompressOptions = {
      verbose: true,
      incremental: true,
      exclude: ['png', 'jpg', 'js'],
      include: ['png', 'wav'],
      threshold: 500,
      level: 7,
      memoryLevel: 1,
      strategy: 3,
      brotli: true,
      deflate: true,
      brotliParamMode: 'text',
      brotliQuality: 5,
      brotliSizeHint: 77,
      outputFileFormat: 'test-[filename].[ext].[compressExt]',
    };
    assert.deepStrictEqual(filterOptionsSpy.args[0][0], response);
    assert.ok(
      Object.entries(response).every(([key, val]) =>
        compareValues(options[key], val),
      ),
    );
  });

  it("compress <path> [outputPath] - should exec 'runCompress' with filtered options", () => {
    const cliArguments = [
      'node.exe',
      'index.js',
      'compress',
      'folder_to_compress',
      'folder_to_compress_out',
      '--verbose',
      '--exclude',
      'php,cc',
      '--include',
      'css',
      '--threshold',
      '800',
      '--level',
      '4',
      '--memory-level',
      '2',
      '--strategy',
      '4',
      '--output-file-format',
      'test-[filename]-out.[ext].[compressExt]',
    ];
    const index = new Index();
    (index as any).argv = cliArguments;
    const runCompressSpy = sinonSandbox.spy(index as any, 'runCompress');
    const filterOptionsSpy = sinonSandbox.spy(index as any, 'filterOptions');
    const compressRunStub = sinonSandbox
      .stub(Compress.prototype, 'run')
      .resolves([]);
    index.exec();
    assert.strictEqual(runCompressSpy.callCount, 1);
    assert.strictEqual(compressRunStub.callCount, 1);
    assert.strictEqual(filterOptionsSpy.callCount, 1);
    const [target, outputPath, options] = runCompressSpy.args[0];
    assert.strictEqual(target, 'folder_to_compress');
    assert.strictEqual(outputPath, 'folder_to_compress_out');
    const response: CompressOptions = {
      verbose: true,
      exclude: ['php', 'cc'],
      include: ['css'],
      threshold: 800,
      level: 4,
      memoryLevel: 2,
      strategy: 4,
      outputFileFormat: 'test-[filename]-out.[ext].[compressExt]',
    };
    assert.deepStrictEqual(filterOptionsSpy.args[0][0], response);
    assert.ok(
      !Object.values(options).some(val => val !== val || val === undefined),
    );
    assert.ok(
      Object.entries(response).every(([key, val]) =>
        compareValues(options[key], val),
      ),
    );
  });

  it("compress <path> [outputPath] - should exec 'runCompress' with overwrite options", () => {
    const envArguments = {
      GZIPPER_INCREMENTAL: '0',
      GZIPPER_VERBOSE: '0',
      GZIPPER_EXCLUDE: 'py,c',
      GZIPPER_INCLUDE: 'r,rs',
      GZIPPER_THRESHOLD: '800',
      GZIPPER_LEVEL: '2',
      GZIPPER_MEMORY_LEVEL: '2',
      GZIPPER_STRATEGY: '4',
      GZIPPER_BROTLI: '0',
      GZIPPER_DEFLATE: '0',
      GZIPPER_BROTLI_PARAM_MODE: 'font',
      GZIPPER_BROTLI_QUALITY: '3',
      GZIPPER_BROTLI_SIZE_HINT: '10',
      GZIPPER_OUTPUT_FILE_FORMAT: '[filename]-[hash].[ext].[compressExt]',
    };
    const cliArguments = [
      'node.exe',
      'index.js',
      'compress',
      'folder_to_compress',
      'folder_to_compress_out',
      '--incremental',
      '--verbose',
      '--exclude',
      'png,jpg,js',
      '--include',
      'png,wav',
      '--threshold',
      '500',
      '--level',
      '7',
      '--memory-level',
      '1',
      '--strategy',
      '3',
      '--brotli',
      '--deflate',
      '--brotli-param-mode',
      'text',
      '--brotli-quality',
      '5',
      '--brotli-size-hint',
      '77',
      '--output-file-format',
      'test-[filename].[ext].[compressExt]',
    ];
    const index = new Index();
    (index as any).argv = cliArguments;
    (index as any).env = envArguments;
    const runCompressSpy = sinonSandbox.spy(index as any, 'runCompress');
    const filterOptionsSpy = sinonSandbox.spy(index as any, 'filterOptions');
    const compressRunStub = sinonSandbox
      .stub(Compress.prototype, 'run')
      .resolves([]);
    index.exec();
    assert.strictEqual(runCompressSpy.callCount, 1);
    assert.strictEqual(compressRunStub.callCount, 1);
    assert.strictEqual(filterOptionsSpy.callCount, 1);
    const [target, outputPath, options] = runCompressSpy.args[0];
    assert.strictEqual(target, 'folder_to_compress');
    assert.strictEqual(outputPath, 'folder_to_compress_out');
    const response: CompressOptions = {
      incremental: false,
      verbose: false,
      exclude: ['py', 'c'],
      include: ['r', 'rs'],
      threshold: 800,
      level: 2,
      memoryLevel: 2,
      strategy: 4,
      brotli: false,
      deflate: false,
      brotliParamMode: 'font',
      brotliQuality: 3,
      brotliSizeHint: 10,
      outputFileFormat: '[filename]-[hash].[ext].[compressExt]',
    };
    assert.ok(
      Object.entries(response).every(([key, val]) =>
        compareValues(options[key], val),
      ),
    );
  });
});
