import React from 'react';
import { ArrowRight } from '../icons/arrowRight';

const NUM_SIGNATURES = 5;

const PetitionForm = React.forwardRef<
  HTMLDivElement,
  {
    sheetNumber: number;
    candidates: { name: string; address: string; office: string }[];
    vacancyAppointments: { name: string; address: string }[];
    party?: string;
    electionDate?: string; // assumed to be in Month Day, Year format
  }
>(
  (
    { sheetNumber, candidates, vacancyAppointments, party, electionDate },
    ref
  ) => {
    const title = 'Designating Petition';
    const subtitle = 'Sec. 6-132, Election Law';
    const introduction = `I, the undersigned, do hereby state that I am a duly enrolled voter of the ${
      party ? party : '__________________'
    } Party and entitled to vote at the next primary election of such party, to be held on ${
      electionDate ? electionDate : '________________, 20____'
    }; that my place of residence is truly stated opposite my signature hereto, and I do hereby designate the following named person (or persons) as a candidate (or candidates) for the nomination of such party for public office or for election to a party position of such party.`;

    const committeeAppointment = `I do hereby appoint as a committee to fill vacancies in accordance with the provisions of the election law`;
    const committeeAppointment2 = `(here insert the names and addresses of at least three persons, all of whom shall be enrolled voters of said party):`;
    const witnessStatementIntro = `In witness whereof, I have hereunto set my hand, the day and year placed opposite my signature.`;
    const witnessStatement = `____________________ state: I am a duly qualified voter of the State of New York and am an enrolled voter of the ${
      party ? party : '____________________'
    } Party.`;
    const witnessResidence = `I now reside at (residence address) ________________________________________________________________________.`;
    const witnessResidences2 = `Each of the individuals whose names are subscribed to this petition sheet containing ${
      NUM_SIGNATURES ? NUM_SIGNATURES : `(fill in number) __________`
    } signatures, subscribed the same in my presence on the dates above indicated and identified himself or herself to be the individual who signed this sheet.`;
    const witnessUnderstanding = `I understand that this statement will be accepted for all purposes as the equivalent of an affidavit and, if it contains a material false statement, shall subject me to the same penalties as if I had been duly sworn.`;
    const witnessIdHeader = `Witness Identification Information:`;
    const witnessIdInfo = `The following information for the witness named above must be completed prior to filing with the board of elections in order for this petition to be valid.`;
    const notaryStatement = `On the dates above indicated before me personally came each of the voters whose signatures appear on this petition sheet containing ${
      NUM_SIGNATURES ? NUM_SIGNATURES : '(fill in number) __________'
    } signatures, who signed same in my presence and who, being by me duly sworn, each for himself or herself, said that the foregoing statement made and subscribed by him or her was true.`;
    const sheetNoText = `Sheet No. ${sheetNumber ? sheetNumber : '__________'}`;

    const repeatUnderscore = (count: number) => '_'.repeat(count);

    return (
      <div
        ref={ref}
        className={`w-[8.5in] h-[14in] p-8 font-sans bg-white`}
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <div className="flex justify-center gap-1 items-center">
          <h2 className="text-center text-2xl font-black pt-4">{title}</h2>
          <p className="text-center text-xs font-semibold pt-6 pl-2">
            {subtitle}
          </p>
        </div>
        <p className="text-xs leading-snug pb-4 pt-2">{introduction}</p>

        <table className="w-full border-collapse mt-1 text-xs">
          <thead>
            <tr className="h-2">
              <th className="border border-black pl-2 w-1/3 text-left align-top">
                Name(s) of Candidate(s)
              </th>
              <th className="border border-black w-1/3 pl-2 text-left align-top">
                Public Office or Party Position
                <br />
                <span className="text-[9px] font-[400]">
                  (Include district number, if applicable)
                </span>
              </th>
              <th className="border border-black pl-2 w-1/3 text-left align-top">
                Residence Address
                <br />
                <span className="text-[9px] leading-none font-[400]">
                  (Also post office address if not identical)
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.name}>
                <td className="border border-black h-8 p-1">
                  {candidate.name}
                </td>
                <td className="border border-black h-8 p-1">
                  {candidate.office}
                </td>
                <td className="border border-black h-8 p-1 text-[9px]">
                  {candidate.address}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-[11px] my-2">
          {committeeAppointment} <i>{committeeAppointment2}</i>
        </p>
        <div className="border border-black h-16 mt-1 text-[11px] p-1">
          {vacancyAppointments.map((v) => `${v.name}, ${v.address}`).join('; ')}
        </div>

        <p className="text-xs mt-2">{witnessStatementIntro}</p>

        <table className="w-full mt-1 text-xs border-2 border-black">
          <thead>
            <tr className="border-b-2 border-black text-left align-top">
              <th className="border border-black w-[12%] pl-2 font-bold">
                Date
              </th>
              <th className="border border-black w-1/3 pl-2 pb-2 font-bold">
                Name of Signer
                <br />
                <span className="text-[9px] font-[400]">
                  (Signature required. Printed name may be added)
                </span>
              </th>
              <th className="border border-black w-1/3 pl-2 font-bold">
                Residence
              </th>
              <th className="border border-black w-[18%] border-l-2 pl-2 font-bold">
                Enter Town or City
                <br />
                <span className="text-[9px] font-[400]">
                  (Except in NYC enter county)
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array(NUM_SIGNATURES)
              .fill(0)
              .map((_, i) => (
                <React.Fragment key={i}>
                  <tr className={i % 2 === 1 ? 'border-t-2 border-black' : ''}>
                    <td className="border border-black h-5 p-1">
                      {i + 1}. __/__/{electionDate?.split(',')[1].trim()}
                    </td>
                    <td className="border border-black h-8 p-1"></td>
                    <td
                      className="border border-black h-16 p-1"
                      rowSpan={2}
                    ></td>
                    <td
                      className="border border-black h-16 p-1 border-l-2"
                      rowSpan={2}
                    ></td>
                  </tr>
                  <tr className={i % 2 === 1 ? 'border-b-2 border-black' : ''}>
                    <td className="border border-black h-8 p-1 text-[9px] text-right flex gap-1 items-center justify-end">
                      {'Printed Name '} <ArrowRight />
                    </td>
                  </tr>
                </React.Fragment>
              ))}
          </tbody>
        </table>

        <h4 className="text-center text-xs mt-3 py-1 border border-black border-b-0 font-bold italic">
          Complete <u>ONE</u> of the following
        </h4>

        <div className="border border-black p-2 flex">
          <p className="text-xs leading-4 pr-1">
            <b>1. </b>
          </p>
          <div>
            <p className="text-xs leading-4">
              <b>
                <u>Statement of Witness:</u>
              </b>{' '}
              I <i>(name of witness)</i> {witnessStatement}
            </p>
            <p className="text-xs leading-5 py-2">{witnessResidence}</p>
            <p className="text-xs leading-5 py-1">{witnessResidences2}</p>
            <p className="text-xs leading-5 py-2">{witnessUnderstanding}</p>
            <div className="flex pt-2 text-xs gap-4">
              <div>
                <div>{repeatUnderscore(16)}</div>
                <div className="italic">Date</div>
              </div>
              <div className="pl-8">
                <div>{repeatUnderscore(48)}</div>
                <div className="italic">Signature of Witness</div>
              </div>
            </div>
            <div className="text-xs my-2">
              <p>
                <b>
                  <u>{witnessIdHeader}</u>
                </b>{' '}
                {witnessIdInfo}
              </p>
            </div>
            <div className="flex gap-20 w-full">
              <div className="text-xs pt-1 pb-2">
                <div>{repeatUnderscore(32)}</div>
                <div className="italic">Town or City Where Witness Resides</div>
              </div>
              <div className="text-xs pt-1 pb-2 ml-32">
                <div>{repeatUnderscore(32)}</div>
                <div className="italic">County Where Witness Resides</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-black p-1 border-t-0 flex">
          <p className="text-xs leading-5 pr-1">
            <b>2. </b>
          </p>
          <div>
            <p className="text-xs leading-5">
              <b>
                <u>Notary Public or Commissioner of Deeds:</u>
              </b>{' '}
              {notaryStatement}
            </p>
            <div className="flex mt-3 text-xs gap-4">
              <div>
                <div>{repeatUnderscore(16)}</div>
                <div className="italic">Date</div>
              </div>
              <div>
                <div>{repeatUnderscore(56)}</div>
                <div className="italic">
                  Signature and Official Title of Officer Administering Oath
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[9px] text-right mt-3">{sheetNoText}</p>
      </div>
    );
  }
);

// Adding displayName to the forwardRef component
PetitionForm.displayName = 'PetitionForm';

export default PetitionForm;
