"use client";
import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import jsPDF from "jspdf";

const GeneratePetitionButton3: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async (): Promise<void> => {
    try {
      setIsGenerating(true);

      const pdf = new jsPDF({ unit: "in", format: [8.5, 11] });
      const pageWidth = 8.5;
      const pageHeight = 11;
      const margin = 0.5;

      // Set font styles
      pdf.setFont("helvetica");
      pdf.setFontSize(12);

      // Header
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Designating Petition", pageWidth / 2, margin, {
        align: "center",
      });

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text("Sec. 6-132, Election Law", pageWidth / 2, margin - 20, {
        align: "center",
      });

      // Main text
      pdf.setFontSize(10);
      const mainText =
        "I, the undersigned, do hereby state that I am a duly enrolled voter of the __________________ Party and entitled to vote at the next primary election of such party, to be held on ________________, 20____; that my place of residence is truly stated opposite my signature hereto, and I do hereby designate the following named person (or persons) as a candidate (or candidates) for the nomination of such party for public office or for election to a party position of such party.";
      pdf.text(mainText, margin, margin + 40, {
        maxWidth: pageWidth - 2 * margin,
      });

      // Table
      const tableTop = margin + 100;
      const colWidth = (pageWidth - 2 * margin) / 3;
      pdf.rect(margin, tableTop, pageWidth - 2 * margin, 80);
      pdf.line(margin + colWidth, tableTop, margin + colWidth, tableTop + 80);
      pdf.line(
        margin + 2 * colWidth,
        tableTop,
        margin + 2 * colWidth,
        tableTop + 80,
      );

      pdf.setFontSize(9);
      pdf.text("Name(s) of Candidate(s)", margin + 5, tableTop + 15);
      pdf.text(
        "Public Office or Party Position",
        margin + colWidth + 5,
        tableTop + 15,
      );
      pdf.text(
        "(Include district number, if applicable)",
        margin + colWidth + 5,
        tableTop + 25,
      );
      pdf.text("Residence Address", margin + 2 * colWidth + 5, tableTop + 15);
      pdf.text(
        "(Also post office address if not identical)",
        margin + 2 * colWidth + 5,
        tableTop + 25,
      );

      // Committee to fill vacancies
      const committeeTop = tableTop + 100;
      pdf.setFontSize(10);
      pdf.text(
        "I do hereby appoint as a committee to fill vacancies in accordance with the provisions of the election law (here insert the names and addresses of at least three persons, all of whom shall be enrolled voters of said party):",
        margin,
        committeeTop,
        { maxWidth: pageWidth - 2 * margin },
      );
      pdf.rect(margin, committeeTop + 30, pageWidth - 2 * margin, 60);

      // Witness statement
      pdf.setFontSize(10);
      pdf.text(
        "In witness whereof, I have hereunto set my hand, the day and year placed opposite my signature.",
        margin,
        committeeTop + 110,
      );

      // Signature table
      const sigTableTop = committeeTop + 140;
      pdf.rect(margin, sigTableTop, pageWidth - 2 * margin, 200);
      pdf.line(margin, sigTableTop + 30, pageWidth - margin, sigTableTop + 30);

      const sigColWidths = [
        60,
        (pageWidth - 2 * margin - 60) / 3,
        (pageWidth - 2 * margin - 60) / 3,
        (pageWidth - 2 * margin - 60) / 3,
      ];

      for (let i = 0; i < 3; i++) {
        pdf.line(
          margin + sigColWidths[i],
          sigTableTop,
          margin + sigColWidths[i],
          sigTableTop + 200,
        );
      }

      pdf.setFontSize(9);
      pdf.text("Date", margin + 5, sigTableTop + 15);
      pdf.text(
        "Name of Signer",
        margin + sigColWidths[0] + 5,
        sigTableTop + 15,
      );
      pdf.text(
        "(Signature required. Printed name may be added)",
        margin + sigColWidths[0] + 5,
        sigTableTop + 25,
      );
      pdf.text(
        "Residence",
        margin + sigColWidths[0] + sigColWidths[1] + 5,
        sigTableTop + 15,
      );
      pdf.text(
        "Enter Town or City",
        margin + sigColWidths[0] + sigColWidths[1] + sigColWidths[2] + 5,
        sigTableTop + 15,
      );
      pdf.text(
        "(Except in NYC enter county)",
        margin + sigColWidths[0] + sigColWidths[1] + sigColWidths[2] + 5,
        sigTableTop + 25,
      );

      // Save the PDF
      pdf.save("designating-petition.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePdf2 = async (): Promise<void> => {
    try {
      const pdf = new jsPDF();
      const pageWidth = 8.5;
      const pageHeight = 11;
      const margin = 0.5;
      // Set font styles
      pdf.setFont("helvetica");
      pdf.setFontSize(12);

      // Header
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Designating Petition", pageWidth / 2, margin, {
        align: "center",
      });

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text("Sec. 6-132, Election Law", pageWidth / 2, margin + 20, {
        align: "center",
      });

      pdf.save("example.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <Button onClick={generatePDF} disabled={isGenerating}>
      {isGenerating ? "Generating..." : "Generate Designating Petition"}
    </Button>
  );
};

export default GeneratePetitionButton3;
