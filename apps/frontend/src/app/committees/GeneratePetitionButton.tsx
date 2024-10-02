"use client";

import { useState } from "react";
import GeneratePetitionForm from "./GeneratePetitionForm";
import { Button } from "~/components/ui/button";

export const GeneratePetitionButton = () => {
  const [showForm, setShowForm] = useState<boolean>(false);

  return (
    <>
      <Button onClick={() => setShowForm(true)}>Generate Petition</Button>
      {showForm && (
        <GeneratePetitionForm
          defaultOpen={showForm}
          onOpenChange={setShowForm}
        />
      )}
    </>
  );
};
