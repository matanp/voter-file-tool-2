import React from 'react';
import ReactDOMServer from 'react-dom/server';
import SignInSheet from '../components/SignInSheet';

describe('SignInSheet', () => {
  it('renders header, member rows, blank rows, and footer', () => {
    const committees = [
      {
        cityTown: 'ROCHESTER',
        legDistrict: 1,
        electionDistrict: 42,
        members: [
          { name: 'Jane Doe', address: '123 Main St' },
          { name: 'John Smith', address: '456 Oak Ave' },
        ],
      },
    ];

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(SignInSheet, {
        committees,
        reportAuthor: 'Test Author',
      }),
    );

    expect(html).toContain('Sign-In Sheet');
    expect(html).toContain('LD 01');
    expect(html).toContain('ED 042');
    expect(html).toContain('Jane Doe');
    expect(html).toContain('123 Main St');
    expect(html).toContain('John Smith');
    expect(html).toContain('Signature');
    expect(html).toContain('Notes');
    expect(html).toContain('Test Author');
    expect(html).toContain('<tr'); // table rows including blank rows
  });

  it('includes meeting date when provided', () => {
    const committees = [
      {
        cityTown: 'BRIGHTON',
        legDistrict: 1,
        electionDistrict: 1,
        members: [],
      },
    ];

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(SignInSheet, {
        committees,
        meetingDate: '2025-03-15',
        reportAuthor: 'Author',
      }),
    );

    expect(html).toContain('Meeting:');
    expect(html).toContain('March');
    expect(html).toContain('2025');
  });
});
