import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "~/components/ui/use-toast";
import { DatePicker } from "~/components/ui/datePicker";

type GeneratePetitionFormProps = {
  defaultOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export const GeneratePetitionForm: React.FC<GeneratePetitionFormProps> = ({
  defaultOpen,
  onOpenChange,
}) => {
  const [names, setNames] = useState<string[]>([]);
  const [office, setOffice] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [extraNames, setExtraNames] = useState<string[]>([]);
  const [party, setParty] = useState<string>("");
  const [electionDate, setElectionDate] = useState<Date | null>(null);
  const handleSubmit = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.preventDefault();

    const response = await fetch(`/api/generatePdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        names,
        office,
        address,
        extraNames,
        party,
        electionDate,
      }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
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

    if (response.ok) {
      toast({
        title: "Success",
        description: "Submitted your request for approval",
      });
    } else {
      toast({
        title: "Error",
        description: "Something went wrong with your request",
      });
    }

    // onSubmit();
  };

  return (
    <Dialog defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Designated Petition</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor="names">Names</label>
          <Textarea
            onChange={(e) => setNames(e.target.value.split(","))}
            placeholder="Enter names"
          />
          <label htmlFor="office">Office</label>
          <Textarea
            onChange={(e) => setOffice(e.target.value)}
            placeholder="Enter office"
          />
          <label htmlFor="address">Address</label>
          <Textarea
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address"
          />
          <label htmlFor="extraNames">Extra Names</label>
          <Textarea
            onChange={(e) => setExtraNames(e.target.value.split(","))}
            placeholder="Enter extra names"
          />
          <label htmlFor="party">Party</label>
          <Textarea
            onChange={(e) => setParty(e.target.value)}
            placeholder="Enter party"
          />
          <label htmlFor="electionDate">Election Date</label>
          <DatePicker onChange={(date) => setElectionDate(date)} />
        </div>

        <Button onClick={(e) => handleSubmit(e)}>Submit Request</Button>
      </DialogContent>
    </Dialog>
  );
};

export default GeneratePetitionForm;
