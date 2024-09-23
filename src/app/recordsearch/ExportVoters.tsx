import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "~/components/ui/button";
import { type VoterRecord } from "@prisma/client";

interface VoterRecordPDFProps {
  voterRecords: VoterRecord[];
}

const VoterRecordPDF: React.FC<VoterRecordPDFProps> = ({ voterRecords }) => {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async (): Promise<void> => {
    if (!pdfRef.current) return;

    setIsGenerating(true);

    try {
      const element = pdfRef.current;
      const canvas = await html2canvas(element);
      const data = canvas.toDataURL("image/png");

      const pdf = new jsPDF();
      const imgProperties = pdf.getImageProperties(data);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;

      pdf.addImage(data, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("voter_records.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <Button onClick={generatePDF} disabled={isGenerating} className="mb-4">
        {isGenerating ? "Generating PDF..." : "Generate and Download PDF"}
      </Button>

      <div ref={pdfRef} className="p-4 bg-white">
        <h1 className="text-2xl font-bold mb-4">Voter Records</h1>
        {voterRecords.map((voter, index) => (
          <div key={index} className="mb-4 p-2 border border-gray-300">
            <div className="flex">
              <div className="flex">
                <div>
                  <p className="font-bold">
                    {voter.firstName} {voter.lastName}
                  </p>
                  <p>
                    {voter.houseNum} {voter.street}
                  </p>
                  <p>
                    {voter.city}, {voter.state} {voter.zipCode}
                  </p>
                </div>
                <div>
                  <p>Phone: {voter.telephone}</p>
                  <p>
                    Sex: {voter.gender} Age:{" "}
                    {voter.DOB ? new Date(voter.DOB).getFullYear() : ""}
                  </p>
                  <p>Party: {voter.party}</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <p>□ 1-Strong Support</p>
                  <p>□ 2-Lean</p>
                  <p>□ 3-Undecided</p>
                  <p>□ 4-Lean Against</p>
                  <p>□ 5-Strong Against</p>
                  <p>□ Volunteer</p>
                </div>
                <div>
                  <p>□ Not Home</p>
                  <p>□ Refused</p>
                  <p>□ Vacant</p>
                  <p>□ Hostile</p>
                  <p>□ Other Language</p>
                  <p>□ Deceased</p>
                  <p>□ Moved</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoterRecordPDF;
