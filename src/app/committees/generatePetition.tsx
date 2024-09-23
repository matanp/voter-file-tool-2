"use client";
import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import jsPDF from "jspdf";

const GeneratePetitionButton: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePetitionPDF = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const margin = 10;
      const usableWidth = pageWidth - 2 * margin;

      // Helper function to wrap text
      const wrapText = (
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number,
      ): number => {
        const lines = doc.splitTextToSize(text, maxWidth);
        lines.forEach((line: string, i: number) => {
          doc.text(line, x, y + i * lineHeight);
        });
        return y + lines.length * lineHeight;
      };

      // Helper function to draw light blue rectangles
      const drawLightBlueRect = (
        x: number,
        y: number,
        width: number,
        height: number,
      ) => {
        doc.setFillColor(235, 245, 255);
        doc.rect(x, y, width, height, "F");
      };

      // Title
      doc.setFontSize(16);
      doc.text("Designating Petition", pageWidth / 2, 15, { align: "center" });
      doc.setFontSize(10);
      doc.text("Sec. 6-132, Election Law", pageWidth / 2, 20, {
        align: "center",
      });

      // Main text
      doc.setFontSize(9);
      let y = 25;
      const mainText =
        "I, the undersigned, do hereby state that I am a duly enrolled voter of the _______________________ Party and entitled to vote at the next primary election of such party, to be held on ____________________, 20____ ; that my place of residence is truly stated opposite my signature hereto, and I do hereby designate the following named person (or persons) as a candidate (or candidates) for the nomination of such party for public office or for election to a party position of such party.";
      y = wrapText(mainText, margin, y, usableWidth, 4) + 5;

      // Draw light blue rectangles for blank spaces in main text
      drawLightBlueRect(margin + 115, y - 14, 60, 5);
      drawLightBlueRect(margin + 80, y - 9, 40, 5);
      drawLightBlueRect(margin + 125, y - 9, 10, 5);

      // Candidate information table
      y += 5;
      doc.setFontSize(10);
      const colWidths = [60, 60, 60];
      const startX = margin;
      doc.rect(startX, y, usableWidth, 20);
      doc.line(startX + colWidths[0], y, startX + colWidths[0], y + 20);
      doc.line(
        startX + colWidths[0] + colWidths[1],
        y,
        startX + colWidths[0] + colWidths[1],
        y + 20,
      );

      doc.text("Name(s) of Candidate(s)", startX + 2, y + 5);
      doc.text(
        "Public Office or Party Position",
        startX + colWidths[0] + 2,
        y + 5,
      );
      doc.setFontSize(8);
      doc.text(
        "(Include district number, if applicable)",
        startX + colWidths[0] + 2,
        y + 10,
      );
      doc.setFontSize(10);
      doc.text(
        "Residence Address",
        startX + colWidths[0] + colWidths[1] + 2,
        y + 5,
      );
      doc.setFontSize(8);
      doc.text(
        "(Also post office address if not identical)",
        startX + colWidths[0] + colWidths[1] + 2,
        y + 10,
      );

      // Draw light blue rectangles for candidate information
      drawLightBlueRect(startX + 1, y + 1, colWidths[0] - 2, 18);
      drawLightBlueRect(startX + colWidths[0] + 1, y + 1, colWidths[1] - 2, 18);
      drawLightBlueRect(
        startX + colWidths[0] + colWidths[1] + 1,
        y + 1,
        colWidths[2] - 2,
        18,
      );

      // Committee to fill vacancies
      y += 25;
      doc.setFontSize(9);
      const committeeText =
        "I do hereby appoint as a committee to fill vacancies in accordance with the provisions of the election law (here insert the names and addresses of at least three persons, all of whom shall be enrolled voters of said party):";
      y = wrapText(committeeText, margin, y, usableWidth, 4) + 5;

      // Box for committee names
      doc.rect(margin, y, usableWidth, 20);
      drawLightBlueRect(margin + 1, y + 1, usableWidth - 2, 18);
      y += 25;

      // Witness statement
      doc.setFontSize(9);
      const witnessText =
        "In witness whereof, I have hereunto set my hand, the day and year placed opposite my signature.";
      y = wrapText(witnessText, margin, y, usableWidth, 4) + 5;

      // Signature table
      y += 5;
      doc.setFontSize(10);
      const sigColWidths = [25, 70, 60, 35];
      doc.rect(startX, y, usableWidth, 10);
      doc.line(startX + sigColWidths[0], y, startX + sigColWidths[0], y + 10);
      doc.line(
        startX + sigColWidths[0] + sigColWidths[1],
        y,
        startX + sigColWidths[0] + sigColWidths[1],
        y + 10,
      );
      doc.line(
        startX + sigColWidths[0] + sigColWidths[1] + sigColWidths[2],
        y,
        startX + sigColWidths[0] + sigColWidths[1] + sigColWidths[2],
        y + 10,
      );

      doc.text("Date", startX + 2, y + 7);
      doc.text("Name of Signer", startX + sigColWidths[0] + 2, y + 7);
      doc.setFontSize(8);
      doc.text(
        "(Signature required. Printed name may be added)",
        startX + sigColWidths[0] + 2,
        y + 13,
      );
      doc.setFontSize(10);
      doc.text(
        "Residence",
        startX + sigColWidths[0] + sigColWidths[1] + 2,
        y + 7,
      );
      doc.text(
        "Enter Town or City",
        startX + sigColWidths[0] + sigColWidths[1] + sigColWidths[2] + 2,
        y + 7,
      );
      doc.setFontSize(8);
      doc.text(
        "(Except in NYC enter county)",
        startX + sigColWidths[0] + sigColWidths[1] + sigColWidths[2] + 2,
        y + 13,
      );

      for (let i = 1; i <= 5; i++) {
        y += 15;
        doc.rect(startX, y, usableWidth, 20);
        doc.line(startX + sigColWidths[0], y, startX + sigColWidths[0], y + 20);
        doc.line(
          startX + sigColWidths[0] + sigColWidths[1],
          y,
          startX + sigColWidths[0] + sigColWidths[1],
          y + 20,
        );
        doc.line(
          startX + sigColWidths[0] + sigColWidths[1] + sigColWidths[2],
          y,
          startX + sigColWidths[0] + sigColWidths[1] + sigColWidths[2],
          y + 20,
        );

        doc.setFontSize(10);
        doc.text(`${i}.`, startX + 2, y + 5);
        doc.text("/ /20___", startX + 7, y + 5);
        doc.setFontSize(8);
        doc.text("Printed Name →", startX + 2, y + 17);

        // Draw light blue rectangles for signature lines
        drawLightBlueRect(
          startX + sigColWidths[0] + 1,
          y + 1,
          sigColWidths[1] - 2,
          8,
        );
        drawLightBlueRect(
          startX + sigColWidths[0] + 1,
          y + 11,
          sigColWidths[1] - 2,
          8,
        );
        drawLightBlueRect(
          startX + sigColWidths[0] + sigColWidths[1] + 1,
          y + 1,
          sigColWidths[2] - 2,
          18,
        );
        drawLightBlueRect(
          startX + sigColWidths[0] + sigColWidths[1] + sigColWidths[2] + 1,
          y + 1,
          sigColWidths[3] - 2,
          18,
        );
      }

      y += 25;
      doc.setFontSize(8);
      doc.text(
        "(You may use fewer or more signature lines - this is only to show format.)",
        pageWidth / 2,
        y,
        { align: "center" },
      );

      // Witness section
      y += 10;
      doc.setFontSize(10);
      doc.text("Complete ONE of the following", pageWidth / 2, y, {
        align: "center",
      });
      y += 5;
      doc.rect(startX, y, usableWidth, 70);

      doc.setFontSize(9);
      let witnessY = y + 5;
      const witnessStatement = [
        "1. Statement of Witness: I (name of witness) ______________________________ state: I am a duly qualified voter of the State of New York and am an enrolled voter of the ______________________________ Party.",
        "I now reside at (residence address) __________________________________________________________________________.",
        "Each of the individuals whose names are subscribed to this petition sheet containing (fill in number) __________ signatures, subscribed the same in my presence on the dates above indicated and identified himself or herself to be the individual who signed this sheet.",
        "I understand that this statement will be accepted for all purposes as the equivalent of an affidavit and, if it contains a material false statement, shall subject me to the same penalties as if I had been duly sworn.",
      ];

      witnessStatement.forEach((text) => {
        witnessY = wrapText(text, startX + 2, witnessY, usableWidth - 4, 4) + 2;
      });

      // Draw light blue rectangles for blank spaces in witness statement
      drawLightBlueRect(startX + 70, y + 8, 100, 5);
      drawLightBlueRect(startX + 160, y + 13, 80, 5);
      drawLightBlueRect(startX + 85, y + 18, 180, 5);
      drawLightBlueRect(startX + 140, y + 28, 20, 5);

      doc.line(startX + 30, witnessY, startX + 80, witnessY);
      doc.line(startX + 90, witnessY, pageWidth - margin, witnessY);
      witnessY += 5;
      doc.setFontSize(8);
      doc.text("Date", startX + 45, witnessY);
      doc.text("Signature of Witness", startX + 130, witnessY);

      // Footer
      doc.setFontSize(8);
      doc.text("Sheet No. __________", pageWidth - 30, 290);

      // Save the PDF
      doc.save("designating-petition.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={generatePetitionPDF} disabled={isGenerating}>
      {isGenerating ? "Generating..." : "Generate Designating Petition"}
    </Button>
  );
};

export default GeneratePetitionButton;
