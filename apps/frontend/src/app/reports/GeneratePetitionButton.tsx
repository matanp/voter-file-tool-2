"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import GeneratePetitionForm from "./GeneratePetitionForm";

export const GeneratePetitionButton = ({ parties }: { parties: string[] }) => {
  const [showForm, setShowForm] = useState<boolean>(false);

  return (
    <>
      <Button onClick={() => setShowForm(true)}>Generate Petition</Button>
      {showForm && (
        <GeneratePetitionForm
          defaultOpen={showForm}
          onOpenChange={setShowForm}
          parties={parties}
        />
      )}
    </>
  );
};
