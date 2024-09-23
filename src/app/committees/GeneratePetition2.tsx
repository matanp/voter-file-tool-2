"use client";
import React, { useState, useRef } from "react";
import { Button } from "~/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const PetitionForm = React.forwardRef<HTMLDivElement, { debugMode: boolean }>(
  ({ debugMode }, ref) => {
    return (
      <div
        ref={ref}
        className={`w-[8.5in] h-[11in] p-4 font-sans bg-white ${!debugMode && "hidden"}`}
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <div className="flex justify-center gap-2 items-center">
          <h2 className="text-center text-lg font-extrabold">
            Designating Petition
          </h2>
          <p className="text-center text-xs font-semibold pt-1">
            Sec. 6-132, Election Law
          </p>
        </div>
        <p className="text-xs leading-tight">
          I, the undersigned, do hereby state that I am a duly enrolled voter of
          the __________________ Party and entitled to vote at the next primary
          election of such party, to be held on ________________, 20____; that
          my place of residence is truly stated opposite my signature hereto,
          and I do hereby designate the following named person (or persons) as a
          candidate (or candidates) for the nomination of such party for public
          office or for election to a party position of such party.
        </p>

        <table className="w-full border-collapse mt-2 text-xs">
          <thead>
            <tr>
              <th className="border border-black p-1 w-1/3 text-left align-top">
                Name(s) of Candidate(s)
              </th>
              <th className="border border-black p-1 w-1/3 text-left align-top">
                Public Office or Party Position
                <br />
                <span className="text-[10px]">
                  (Include district number, if applicable)
                </span>
              </th>
              <th className="border border-black p-1 w-1/3 text-left align-top">
                Residence Address
                <br />
                <span className="text-[10px]">
                  (Also post office address if not identical)
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black h-10"></td>
              <td className="border border-black h-10"></td>
              <td className="border border-black h-10"></td>
            </tr>
          </tbody>
        </table>

        <p className="text-xs mt-2">
          I do hereby appoint as a committee to fill vacancies in accordance
          with the provisions of the election law (here insert the names and
          addresses of at least three persons, all of whom shall be enrolled
          voters of said party):
        </p>
        <div className="border border-black h-16 mt-2"></div>

        <p className="text-xs mt-2">
          In witness whereof, I have hereunto set my hand, the day and year
          placed opposite my signature.
        </p>

        <table className="w-full mt-2 text-xs border-2 border-black">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="border border-black p-1 w-[12%]">Date</th>
              <th className="border border-black p-1 w-1/3">
                Name of Signer
                <br />
                <span className="text-[10px]">
                  (Signature required. Printed name may be added)
                </span>
              </th>
              <th className="border border-black p-1 w-1/3">Residence</th>
              <th className="border border-black p-1 w-1/6 border-l-2">
                Enter Town or City
                <br />
                <span className="text-[10px]">
                  (Except in NYC enter county)
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <React.Fragment key={i}>
                  <tr className={i % 2 === 1 ? "border-t-2 border-black" : ""}>
                    <td className="border border-black h-6 p-1">
                      {i + 1}. __/__/20__
                    </td>
                    <td className="border border-black h-6 p-1"></td>
                    <td
                      className="border border-black h-12 p-1"
                      rowSpan={2}
                    ></td>
                    <td
                      className="border border-black h-12 p-1 border-l-2"
                      rowSpan={2}
                    ></td>
                  </tr>
                  <tr className={i % 2 === 1 ? "border-b-2 border-black" : ""}>
                    <td className="border border-black h-6 p-1 text-center">
                      {"Printed Name ->"}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
          </tbody>
        </table>

        <h4 className="text-center text-sm mt-4 border border-black border-b-0 font-semibold italic">
          Complete <u>ONE</u> of the following
        </h4>

        <div className="border border-black p-2">
          <p className="text-xs leading-5">
            <b>
              1. <u>Statement of Witness:</u>
            </b>{" "}
            I <i>(name of witness)</i> ____________________ state: I am a duly
            qualified voter of the State of New York and am an enrolled voter of
            the ____________________ Party.
          </p>
          <p className="text-xs leading-5 pt-2">
            I now reside at <i>(residence address)</i>
            ________________________________________________________________________.
          </p>
          <p className="text-xs leading-5 pt-2">
            Each of the individuals whose names are subscribed to this petition
            sheet containing (fill in number) __________ signatures, subscribed
            the same in my presence on the dates above indicated and identified
            himself or herself to be the individual who signed this sheet.
          </p>
          <p className="text-xs leading-5 pt-2">
            I understand that this statement will be accepted for all purposes
            as the equivalent of an affidavit and, if it contains a material
            false statement, shall subject me to the same penalties as if I had
            been duly sworn.
          </p>
          <div className="flex pt-3 text-xs gap-8">
            <div>
              <div>____________________</div>
              <div className="font-semibold italic">Date</div>
            </div>
            <div>
              <div>
                ____________________________________________________________
              </div>
              <div className="font-semibold italic">Signature of Witness</div>
            </div>
          </div>
          <div className="text-xs mt-2">
            <p>
              <b>
                <u>Witness Identification Information:</u>
              </b>{" "}
              The following information for the witness named above must be
              completed prior to filing with the board of elections in order for
              this petition to be valid.{" "}
            </p>
          </div>
          <div className="flex gap-24 w-full">
            <div className="text-xs pt-1 pb-3">
              <div>______________________________</div>
              <div className="italic">Town or City Where Witness Resides</div>
            </div>
            <div className="text-xs pt-1 pb-3">
              <div>______________________________</div>
              <div className="italic">County Where Witness Resides</div>
            </div>
          </div>
        </div>
        <div className="border border-black p-2 border-t-0">
          <p className="text-xs leading-5">
            <b>
              2. <u>Notary Public or Commissioner of Deeds:</u>
            </b>{" "}
            On the dates above indicated before me personally came each of the
            voters whose signatures appear on this petition sheet containing
            (fill in number) __________ signatures, who signed same in my
            presence and who, being by me duly sworn, each for himself or
            herself, said that the foregoing statement made and subscribed by
            him or her was true.
          </p>
          <div className="flex mt-4 text-xs gap-8">
            <div>
              <div>____________________</div>
              <div className="font-semibold italic">Date</div>
            </div>
            <div>
              <div>
                ____________________________________________________________
              </div>
              <div className="font-semibold italic">
                Signature and Official Title of Officer Administering Oath{" "}
              </div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-right mt-4">Sheet No. __________</p>
      </div>
    );
  },
);

// Adding displayName to the forwardRef component
PetitionForm.displayName = "PetitionForm";

const GeneratePetitionButton: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  //   const [showForm, setShowForm] = useState(false);
  const petitionRef = useRef<HTMLDivElement>(null);

  const generatePDF = async (): Promise<void> => {
    try {
      if (!petitionRef.current) {
        throw new Error("Petition form not found");
      }

      petitionRef.current.style.display = "block";

      const canvas = await html2canvas(petitionRef.current, {
        scale: 2,
        useCORS: true,
        logging: true,
      });

      const imgData = canvas.toDataURL("image/png");
      console.log(imgData);

      if (!imgData.startsWith("data:image/png")) {
        throw new Error("Invalid image format");
      }

      const pdf = new jsPDF({ unit: "px", format: "a4", precision: 16 });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      pdf.save("designating-petition.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      if (petitionRef.current) {
        petitionRef.current.style.display = "none";
      }
      setIsGenerating(false);
    }
  };

  const handleGeneratePDF = () => {
    setIsGenerating(true);
    generatePDF();
  };

  const debugMode = true;

  return (
    <>
      <Button onClick={handleGeneratePDF} disabled={isGenerating}>
        {isGenerating ? "Generating..." : "Generate Designating Petition"}
      </Button>
      {
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: debugMode ? 1 : -1,
            overflow: "auto",
          }}
        >
          <div>
            <PetitionForm ref={petitionRef} debugMode={debugMode} />
          </div>
        </div>
      }
    </>
  );
};

export default GeneratePetitionButton;
