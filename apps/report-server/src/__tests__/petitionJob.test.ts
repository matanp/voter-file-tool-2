import { processPetitionJob, type PetitionJobDeps } from '../petitionJob';
import type { PetitionOverflowPage } from '../petitionFit';

const input = {
  candidates: [
    {
      name: 'PETC0001 TESTER',
      address: '1 MAIN ST',
      office: 'County Committee',
    },
  ],
  vacancyAppointments: [{ name: 'PETV0001 TESTER', address: '1 ELM ST' }],
  party: 'Democratic',
  electionDate: '2026-06-23',
  numPages: 3,
};

/**
 * A generatePDFAndUpload mock whose page reports `overflowing` sheets (1-based), or
 * whose page read throws when `overflowing` is an Error.
 */
function deps(overflowing: number[] | Error) {
  const generateHTML = jest.fn(() => '<html></html>');
  const generatePDFAndUpload = jest.fn<
    ReturnType<PetitionJobDeps['generatePDFAndUpload']>,
    Parameters<PetitionJobDeps['generatePDFAndUpload']>
  >(async (_html, _landscape, _file, _overrides, inspectPage) => {
    const sheets = Array.from({ length: input.numPages }, (_, i) => ({
      hasAttribute: (name: string) =>
        name === 'data-petition-overflow' &&
        Array.isArray(overflowing) &&
        overflowing.includes(i + 1),
    }));
    const page: PetitionOverflowPage = {
      $$eval: async (_sel, fn) => {
        if (overflowing instanceof Error) throw overflowing;
        return fn(sheets);
      },
    };
    await inspectPage(page);
  });
  return { generateHTML, generatePDFAndUpload };
}

describe('processPetitionJob', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('uploads the PDF and returns no metadata when every sheet fits', async () => {
    const d = deps([]);
    await expect(processPetitionJob(input, 'petition.pdf', d)).resolves.toEqual(
      {},
    );
    expect(d.generatePDFAndUpload).toHaveBeenCalledWith(
      '<html></html>',
      false,
      'petition.pdf',
      undefined,
      expect.any(Function),
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('still completes, and records and logs a warning, when a sheet overflows', async () => {
    const d = deps([2]);
    const result = await processPetitionJob(input, 'petition.pdf', d);
    expect(d.generatePDFAndUpload).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      metadata: {
        warnings: [
          'Sheet 2 runs onto a second page; shorten the candidate or vacancy-committee entries so each sheet fits on one page.',
        ],
      },
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('petition.pdf'));
  });

  it('still uploads and completes, without a warning, when reading the overflow fails', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const d = deps(new Error('Execution context was destroyed'));
      await expect(
        processPetitionJob(input, 'petition.pdf', d),
      ).resolves.toEqual({});
      expect(d.generatePDFAndUpload).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('could not read sheet overflow'),
        expect.any(Error),
      );
      expect(warn).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });

  it('propagates an upload failure so the job is reported as failed', async () => {
    const d = deps([]);
    d.generatePDFAndUpload.mockRejectedValueOnce(new Error('upload failed'));
    await expect(processPetitionJob(input, 'petition.pdf', d)).rejects.toThrow(
      'upload failed',
    );
  });
});
