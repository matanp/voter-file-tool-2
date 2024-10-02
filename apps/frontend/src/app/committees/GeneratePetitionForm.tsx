import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { DatePicker } from "~/components/ui/datePicker";
import * as z from "zod";
import { Input } from "~/components/ui/input";
import { ComboboxDropdown } from "~/components/ui/ComboBox";

type GeneratePetitionFormProps = {
  defaultOpen: boolean;
  onOpenChange: (open: boolean) => void;
  parties: string[];
};
export const PRINT_PARTY_MAP = {
  BLK: "Blank",
  CON: "Congressional",
  IND: "Independent",
  LBT: "Libertarian",
  GRE: "Green",
  DEM: "Democratic",
  REP: "Republican",
  OTH: "Other",
  WEP: "We the People",
} as const;

export type PartyCode = keyof typeof PRINT_PARTY_MAP;

const partyCodes = [
  "BLK",
  "CON",
  "IND",
  "LBT",
  "GRE",
  "DEM",
  "REP",
  "OTH",
  "WEP",
] as const;

const generatePetitionSchema = z.object({
  names: z.array(z.string().min(1)).nonempty("Names cannot be empty"),
  office: z.string().min(1, { message: "Office is required" }),
  address: z.string().min(1, { message: "Address is required" }),
  extraNames: z.array(z.string()).optional(),
  party: z.enum(partyCodes),
  electionDate: z
    .date()
    .nullable()
    .refine((date) => date !== null, {
      message: "Election date is required",
    }),
  numPages: z
    .number()
    .min(1, { message: "Minimum 1 page" })
    .max(25, { message: "No more than 25 pages allowed" }),
});

export const GeneratePetitionForm: React.FC<GeneratePetitionFormProps> = ({
  defaultOpen,
  onOpenChange,
  parties,
}) => {
  const [names, setNames] = useState<string[]>([]);
  const [office, setOffice] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [extraNames, setExtraNames] = useState<string[]>([]);
  const [party, setParty] = useState<string>("");
  const [electionDate, setElectionDate] = useState<Date | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const handleSubmit = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.preventDefault();

    const formData = {
      names,
      office,
      address,
      extraNames,
      party,
      electionDate,
      numPages,
    };

    const validationResult = generatePetitionSchema.safeParse(formData);

    if (!validationResult.success) {
      const fieldErrors: Partial<Record<string, string>> = {};
      validationResult.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    const response = await fetch(`/api/generatePdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...formData,
        party: PRINT_PARTY_MAP[formData.party as PartyCode],
      }),
    });

    if (!response.ok) {
      return;
    }

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "output.pdf");
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Designated Petition</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor="names">Name(s) of Candidate(s)</label>
          <Textarea
            onChange={(e) => setNames(e.target.value.split(","))}
            placeholder="Enter names"
            className={`${
              errors.names ? "border-red-500" : ""
            } border rounded-md`}
          />
          {errors.names && <p className="text-red-500">{errors.names}</p>}

          <label htmlFor="office">Public Office or Party Position</label>
          <Input
            onChange={(e) => setOffice(e.target.value)}
            placeholder="Enter office"
            className={`${
              errors.office ? "border-red-500" : ""
            } border rounded-md`}
          />
          {errors.office && <p className="text-red-500">{errors.office}</p>}

          <label htmlFor="address">Residence Address</label>
          <Input
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address"
            className={`${
              errors.address ? "border-red-500" : ""
            } border rounded-md`}
          />
          {errors.address && <p className="text-red-500">{errors.address}</p>}

          <label htmlFor="extraNames">Extra Names</label>
          <Textarea
            onChange={(e) => setExtraNames(e.target.value.split(","))}
            placeholder="Enter extra names"
            className={`${
              errors.extraNames ? "border-red-500" : ""
            } border rounded-md`}
          />
          {errors.extraNames && (
            <p className="text-red-500">{errors.extraNames}</p>
          )}

          <div className="flex gap-2 items-center">
            <label htmlFor="party">Party:</label>
            <ComboboxDropdown
              items={parties.map((party) => {
                return { label: party, value: party };
              })}
              displayLabel={"Select Party"}
              onSelect={(party) => {
                setParty(party);
              }}
            />
          </div>
          {errors.party && <p className="text-red-500">{errors.party}</p>}

          <div className="flex gap-2 items-center">
            <label htmlFor="electionDate">Election Date</label>
            <DatePicker onChange={(date) => setElectionDate(date)} />
          </div>
          {errors.electionDate && (
            <p className="text-red-500">{errors.electionDate}</p>
          )}

          <div className="flex gap-2 items-center">
            <label htmlFor="numberOfPages">Number of Pages</label>
            <Input
              type="number"
              value={numPages}
              onChange={(e) => setNumPages(Number(e.target.value))}
            />
          </div>
          {errors.numPages && <p className="text-red-500">{errors.numPages}</p>}

          <Button onClick={(e) => handleSubmit(e)}>Generate Petition</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GeneratePetitionForm;
