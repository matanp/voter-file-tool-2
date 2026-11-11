import puppeteer from 'puppeteer';
import { generatePDFAndUpload } from '../utils';

jest.mock('puppeteer', () => ({ __esModule: true, default: { launch: jest.fn() } }));
jest.mock('../s3Utils', () => ({ uploadFileToR2: jest.fn() }));

const launch = puppeteer.launch as jest.Mock;
const CHROME_PID = 4242;

type Close = 'resolves' | 'hangs' | 'rejects';

function fakeBrowser(close: Close) {
  const kill = jest.fn();
  const browser = {
    newPage: jest.fn().mockRejectedValue(new Error('newPage failed')),
    close: jest.fn(() => {
      if (close === 'hangs') return new Promise<void>(() => {});
      if (close === 'rejects') return Promise.reject(new Error('close failed'));
      return Promise.resolve();
    }),
    process: () => ({ pid: CHROME_PID, kill }),
  };
  return { browser, kill };
}

describe('generatePDFAndUpload closing Chrome', () => {
  let processKill: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    processKill = jest.spyOn(process, 'kill').mockImplementation(() => true);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('kills the Chrome process group when close() hangs, and still reports the original error', async () => {
    // chrome-headless-shell with --single-process deadlocks in close() when no page was opened.
    const { browser } = fakeBrowser('hangs');
    launch.mockResolvedValue(browser);

    const result = generatePDFAndUpload('<p>x</p>', true, 'report.pdf');
    const settled = expect(result).rejects.toThrow('newPage failed');
    await jest.advanceTimersByTimeAsync(10_000);

    await settled;
    expect(processKill).toHaveBeenCalledWith(-CHROME_PID, 'SIGKILL');
  });

  it('falls back to killing the Chrome process when the group kill fails', async () => {
    const { browser, kill } = fakeBrowser('hangs');
    launch.mockResolvedValue(browser);
    processKill.mockImplementation(() => {
      throw new Error('ESRCH');
    });

    const result = generatePDFAndUpload('<p>x</p>', true, 'report.pdf');
    const settled = expect(result).rejects.toThrow('newPage failed');
    await jest.advanceTimersByTimeAsync(10_000);

    await settled;
    expect(kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('kills Chrome when close() rejects, without replacing the original error', async () => {
    const { browser } = fakeBrowser('rejects');
    launch.mockResolvedValue(browser);

    await expect(generatePDFAndUpload('<p>x</p>', true, 'report.pdf')).rejects.toThrow('newPage failed');

    expect(processKill).toHaveBeenCalledWith(-CHROME_PID, 'SIGKILL');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not kill Chrome or leave a timer behind when close() finishes', async () => {
    const { browser, kill } = fakeBrowser('resolves');
    launch.mockResolvedValue(browser);

    await expect(generatePDFAndUpload('<p>x</p>', true, 'report.pdf')).rejects.toThrow('newPage failed');

    expect(browser.close).toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    expect(processKill).not.toHaveBeenCalled();
    expect(kill).not.toHaveBeenCalled();
  });

  it('launches chrome-headless-shell with --single-process', async () => {
    const { browser } = fakeBrowser('resolves');
    launch.mockResolvedValue(browser);

    await expect(generatePDFAndUpload('<p>x</p>', true, 'report.pdf')).rejects.toThrow();

    expect(launch).toHaveBeenCalledWith(
      expect.objectContaining({ headless: 'shell', args: expect.arrayContaining(['--single-process']) }),
    );
  });
});
