"use client";
import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "~/components/ui/button";
import { VoterRecordsContext } from "~/components/providers/VoterRecordsContext";

const RECORDS_PER_PAGE = 5; // Set the number of records per page

const VoterRecordPDF: React.FC = () => {
  const { voterRecords } = React.useContext(VoterRecordsContext);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async (): Promise<void> => {
    setIsGenerating(true);

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "in",
      format: "letter",
    });

    try {
      for (let i = 0; i < voterRecords.length; i += RECORDS_PER_PAGE) {
        const pageRecords = voterRecords.slice(i, i + RECORDS_PER_PAGE);

        // Create a temporary div to render each page
        const tempDiv = document.createElement("div");
        tempDiv.style.width = "11in";
        tempDiv.style.height = "8.5in";
        tempDiv.style.padding = "20px";
        tempDiv.style.backgroundColor = "white";

        // Create content for the page
        const title = document.createElement("h1");
        title.innerText = "Voter Records";
        title.style.fontSize = "24px";
        title.style.fontWeight = "bold";
        title.style.marginBottom = "20px";
        tempDiv.appendChild(title);

        pageRecords.forEach((voter, index) => {
          const recordDiv = document.createElement("div");
          recordDiv.style.marginBottom = "20px";
          recordDiv.style.border = "1px solid gray";
          recordDiv.style.padding = "10px";

          const voterInfo = `
            <strong>${voter.firstName} ${voter.lastName}</strong><br>
            ${voter.houseNum} ${voter.street}<br>
            ${voter.city}, ${voter.state} ${voter.zipCode}<br>
            Phone: ${voter.telephone}<br>
            Sex: ${voter.gender} Age: ${voter.DOB ? new Date(voter.DOB).getFullYear() : ""}<br>
            Party: ${voter.party}
          `;

          recordDiv.innerHTML = voterInfo;
          tempDiv.appendChild(recordDiv);
        });

        document.body.appendChild(tempDiv); // Add the temp div to the body

        const canvas = await html2canvas(tempDiv);
        const data = canvas.toDataURL("image/png");
        const imgProperties = pdf.getImageProperties(data);
        const pdfWidth = pdf.internal.pageSize.getWidth(); // Should be 11 in
        const pdfHeight =
          (imgProperties.height * pdfWidth) / imgProperties.width;

        pdf.addImage(data, "PNG", 0, 0, pdfWidth, pdfHeight);
        if (i + RECORDS_PER_PAGE < voterRecords.length) {
          pdf.addPage(); // Add a new page if there are more records
        }

        document.body.removeChild(tempDiv); // Clean up
      }

      pdf.save("voter_records.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "in",
      format: "letter",
    });

    if (!pdfRef.current) return;

    const canvas = await html2canvas(pdfRef.current);
    const data = canvas.toDataURL("image/png");
    const imgProperties = pdf.getImageProperties(data);
    const pdfWidth = pdf.internal.pageSize.getWidth(); // Should be 11 in
    const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;

    pdf.addImage(data, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("voter_records.pdf");
  };

  return (
    <div>
      <Button
        onClick={handleDownloadPDF}
        disabled={isGenerating}
        className="mb-4"
      >
        {isGenerating ? "Generating PDF..." : "Generate and Download PDF"}
      </Button>

      <div
        ref={pdfRef}
        className="p-4 bg-white"
        style={{ width: "11in", height: "8.5in" }}
      >
        {/* <h1 className="text-2xl font-bold mb-4">Voter Records</h1> */}
        {voterRecords.map((voter, index) => (
          <div key={index} className="p-1 border border-gray-300 w-full">
            <div className="flex justify-between">
              <p>{voter.VRCNUM}</p>
              <div>
                <p className="font-semibold">
                  {voter.lastName}, {voter.firstName}
                  {voter.middleInitial ? ` ${voter.middleInitial}` : ""}
                </p>
                <p>
                  {voter.houseNum} {voter.street}
                </p>
                <p>
                  {voter.city}, {voter.state} {voter.zipCode}
                </p>
              </div>
              <div>
                <p>{voter.telephone}</p>
                <p className={voter.telephone ? "mt-2" : "mt-8"}>
                  Sex: {voter.gender} Age: {/* :OHNO: calculate age */}
                  {voter.DOB ? new Date(voter.DOB).getFullYear() : ""}
                </p>
                <p>Party: {voter.party}</p>
              </div>
              <div className="leading-tight">
                <p>□ 1-Strong Support</p>
                <p>□ 2-Lean</p>
                <p>□ 3-Undecided</p>
                <p>□ 4-Lean Against</p>
                <p>□ 5-Strong Against</p>
                <p>□ Volunteer</p>
              </div>
              <div className="leading-tight">
                <p>□ Not Home</p>
                <p>□ Refused</p>
                <p>□ Vacant</p>
                <p>□ Hostile</p>
                <p>□ Other Language</p>
                <p>□ Deceased</p>
                <p>□ Moved</p>
              </div>
            </div>
            {/* <div className="flex justify-between">
              <div className="w-3/4">
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
              <div className="w-1/4">
                <p>Phone: {voter.telephone}</p>
                <p>
                  Sex: {voter.gender} Age:{" "}
                  {voter.DOB ? new Date(voter.DOB).getFullYear() : ""}
                </p>
                <p>Party: {voter.party}</p>
              </div>
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
            </div> */}
            {/* <div className="mt-2 grid grid-cols-2 gap-2">
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
            </div> */}
          </div>
        ))}
      </div>

      {/* 
      <div className="flex justify-between mt-4">
        <Button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <Button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div> */}
    </div>
  );
};

export default VoterRecordPDF;
