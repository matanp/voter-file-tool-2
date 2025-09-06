/**
 * Test suite for apps/report-server/src/utils.test.ts
 *
 * Testing library/framework: Jest (TypeScript via ts-jest) — chosen to match the repository's existing setup.
 * If the project uses Vitest, this suite is still largely compatible with its Jest-like API;
 * update imports (e.g., vi instead of jest) if necessary.
 */

import React from 'react';

// We will import the functions under test from the implementation file,
// even though it has a .test.ts suffix.
import {
  generateHTML,
  generatePDF,
  generateCommitteeReportHTML,
} from '../utils.test';

// Mock the heavy puppeteer dependency to avoid launching a real browser in unit tests.
jest.mock('puppeteer', () => {
  const pdfMock = jest.fn(async (_opts?: any) => {
    // Return something Buffer.from can consume; Node's Buffer.from accepts Uint8Array|ArrayBuffer|string.
    // We'll return a Uint8Array here.
    return new Uint8Array([1, 2, 3, 4]);
  });

  const setContentMock = jest.fn(async (_html: string, _opts?: any) => {});
  const newPageMock = jest.fn(async () => ({
    setContent: setContentMock,
    pdf: pdfMock,
  }));

  const closeMock = jest.fn(async () => {});

  const launchMock = jest.fn(async (_opts?: any) => ({
    newPage: newPageMock,
    close: closeMock,
  }));

  return {
    __esModule: true,
    default: { launch: launchMock },
    launch: launchMock,
    // Expose internals for assertions
    __mocks__: {
      pdfMock,
      setContentMock,
      newPageMock,
      closeMock,
      launchMock,
    },
  };
});

// Import the puppeteer mock helpers for assertions
import puppeteer from 'puppeteer';

// Mock the component modules used by ReactDOMServer so we can assert the produced HTML predictably.
jest.mock('../components/DesignatingPetition', () => {
  const React = require('react');
  const PetitionMock = ({ sheetNumber, candidates, vacancyAppointments, party, electionDate }: any) =>
    React.createElement(
      'div',
      {
        'data-testid': 'petition',
        'data-sheet': String(sheetNumber),
        'data-party': party,
        'data-election': electionDate,
        'data-candidates': String((candidates ?? []).length),
        'data-vacancies': String((vacancyAppointments ?? []).length),
      },
      `Sheet ${sheetNumber}`
    );
  return { __esModule: true, default: PetitionMock };
});

jest.mock('../components/CommitteeReport', () => {
  const React = require('react');
  const CommitteeReportMock = ({ groupedCommittees }: any) =>
    React.createElement(
      'section',
      {
        'data-testid': 'committee-report',
        'data-groups': String((groupedCommittees ?? []).length),
      },
      'Committee Report'
    );
  return { __esModule: true, default: CommitteeReportMock };
});

describe('generateHTML', () => {
  const baseCandidates = [
    { name: 'Alice', address: '1 Main St', office: 'Mayor' },
    { name: 'Bob', address: '2 Main St', office: 'Clerk' },
  ];
  const baseVacancies = [{ name: 'Vacancy A', address: '3 Main St' }];

  it('renders the correct number of petition sheets and includes Tailwind link', () => {
    const html = generateHTML(baseCandidates, baseVacancies, 'Independent', '2025-11-04', 3);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>PDF Content</title>');
    expect(html).toContain('http://localhost:8080/tailwind.css');

    // Our mocked Petition component renders a div with data-testid="petition"
    const occurrences = (html.match(/data-testid="petition"/g) || []).length;
    expect(occurrences).toBe(3);
  });

  it('passes sheetNumber 1..N to each sheet in order', () => {
    const html = generateHTML(baseCandidates, baseVacancies, 'Working Families', '2026-06-15', 2);
    // Look for our mocked attributes
    expect(html).toContain('data-sheet="1"');
    expect(html).toContain('data-sheet="2"');
    // Ensure values correlate across attributes
    expect(html).toContain('data-party="Working Families"');
    expect(html).toContain('data-election="2026-06-15"');
    // Candidate and vacancy counts propagated
    expect(html).toContain('data-candidates="2"');
    expect(html).toContain('data-vacancies="1"');
  });

  it('handles zero pages by producing a valid skeleton with no petition elements', () => {
    const html = generateHTML([], [], 'Demo', '2025-01-01', 0);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).not.toContain('data-testid="petition"');
  });

  it('handles empty candidates and vacancyAppointments arrays correctly', () => {
    const html = generateHTML([], [], 'Party X', '2030-01-01', 1);
    expect(html).toContain('data-candidates="0"');
    expect(html).toContain('data-vacancies="0"');
  });
});

describe('generateCommitteeReportHTML', () => {
  it('renders CommitteeReport with correct group count and Tailwind link', () => {
    const groups = [
      { name: 'Group A', committees: [1, 2] },
      { name: 'Group B', committees: [3] },
    ];
    const html = generateCommitteeReportHTML(groups);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>Committee Report</title>');
    expect(html).toContain('http://localhost:8080/tailwind.css');
    expect(html).toContain('data-testid="committee-report"');
    expect(html).toContain('data-groups="2"');
  });

  it('handles empty groups gracefully', () => {
    const html = generateCommitteeReportHTML([]);
    expect(html).toContain('data-groups="0"');
  });
});

describe('generatePDF', () => {
  const sampleHTML = '<!doctype html><html><head></head><body><div>Hi</div></body></html>';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates a Buffer and uses landscape "Letter" format when useLandscape=true', async () => {
    const buf = await generatePDF(sampleHTML, true);
    expect(Buffer.isBuffer(buf)).toBe(true);
    // Check that puppeteer was launched with expected options
    // launch mock is available as puppeteer.__mocks__.launchMock
    expect((puppeteer as any).__mocks__.launchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: true,
        args: expect.arrayContaining(['--no-sandbox', '--disable-setuid-sandbox']),
      })
    );
    // Verify page.setContent called with our HTML and waitUntil option
    expect((puppeteer as any).__mocks__.setContentMock).toHaveBeenCalledWith(
      sampleHTML,
      expect.objectContaining({ waitUntil: 'networkidle0' })
    );
    // Verify pdf called with Letter + landscape=true
    expect((puppeteer as any).__mocks__.pdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'Letter',
        landscape: true,
        printBackground: true,
      })
    );
    // Browser closed
    expect((puppeteer as any).__mocks__.closeMock).toHaveBeenCalled();
  });

  it('uses "Legal" format and landscape=false when useLandscape=false', async () => {
    await generatePDF(sampleHTML, false);
    expect((puppeteer as any).__mocks__.pdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'Legal',
        landscape: false,
        printBackground: true,
      })
    );
  });

  it('propagates pdf generation errors (rejects) if page.pdf throws', async () => {
    const original = (puppeteer as any).__mocks__.pdfMock;
    (puppeteer as any).__mocks__.pdfMock = jest.fn(async () => {
      throw new Error('PDF failed');
    });

    await expect(generatePDF(sampleHTML, true)).rejects.toThrow('PDF failed');

    // Restore the original mock for subsequent tests
    (puppeteer as any).__mocks__.pdfMock = original;
  });
});