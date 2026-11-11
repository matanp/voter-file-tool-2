import puppeteer from 'puppeteer';
import { generatePDFAndUpload } from '../utils';

jest.mock('puppeteer', () => ({ __esModule: true, default: { launch: jest.fn() } }));
jest.mock('../s3Utils', () => ({ uploadFileToR2: jest.fn() }));

const launch = puppeteer.launch as jest.Mock;

function fakeBrowser({ closeHangs }: { closeHangs: boolean }) {
  const kill = jest.fn();
  const browser = {
    newPage: jest.fn().mockRejectedValue(new Error('newPage failed')),
    close: jest.fn(() => (closeHangs ? new Promise<void>(() => {}) : Promise.resolve())),
    process: () => ({ kill }),
  };
  return { browser, kill };
}

describe('generatePDFAndUpload closing Chrome', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('kills Chrome when close() hangs, and still reports the original error', async () => {
    // chrome-headless-shell with --single-process deadlocks in close() when no page was opened.
    const { browser, kill } = fakeBrowser({ closeHangs: true });
    launch.mockResolvedValue(browser);

    const result = generatePDFAndUpload('<p>x</p>', true, 'report.pdf');
    const settled = expect(result).rejects.toThrow('newPage failed');
    await jest.advanceTimersByTimeAsync(10_000);

    await settled;
    expect(kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('does not kill Chrome when close() finishes', async () => {
    const { browser, kill } = fakeBrowser({ closeHangs: false });
    launch.mockResolvedValue(browser);

    await expect(generatePDFAndUpload('<p>x</p>', true, 'report.pdf')).rejects.toThrow('newPage failed');
    await jest.advanceTimersByTimeAsync(10_000);

    expect(browser.close).toHaveBeenCalled();
    expect(kill).not.toHaveBeenCalled();
  });

  it('launches chrome-headless-shell with --single-process', async () => {
    const { browser } = fakeBrowser({ closeHangs: false });
    launch.mockResolvedValue(browser);

    await expect(generatePDFAndUpload('<p>x</p>', true, 'report.pdf')).rejects.toThrow();

    expect(launch).toHaveBeenCalledWith(
      expect.objectContaining({ headless: 'shell', args: expect.arrayContaining(['--single-process']) }),
    );
  });
});
