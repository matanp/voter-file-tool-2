import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PetitionOutcomesClient } from "~/app/admin/petition-outcomes/PetitionOutcomesClient";

const mutateMock = jest.fn().mockResolvedValue(undefined);

jest.mock("~/hooks/useApiMutation", () => ({
  useApiMutation: () => ({
    mutate: mutateMock,
    loading: false,
  }),
}));

jest.mock("~/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock("~/components/ui/select", () => {
  const ReactActual = jest.requireActual<typeof React>("react");

  type SelectTriggerProps = { id?: string; children: React.ReactNode };
  type MarkedSelectTrigger = ((props: SelectTriggerProps) => React.ReactNode) & {
    __isSelectTrigger: true;
  };
  type SelectTriggerElement = React.ReactElement<SelectTriggerProps> & {
    type: MarkedSelectTrigger;
  };

  const SelectTrigger = Object.assign(
    function SelectTrigger({ children }: SelectTriggerProps) {
      return <>{children}</>;
    },
    { __isSelectTrigger: true as const },
  );

  function isSelectTriggerElement(child: React.ReactNode): child is SelectTriggerElement {
    return (
      ReactActual.isValidElement<SelectTriggerProps>(child) &&
      typeof child.type !== "string" &&
      "__isSelectTrigger" in child.type &&
      child.type.__isSelectTrigger === true
    );
  }

  function SelectValue() {
    return null;
  }

  function SelectContent({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }

  function SelectItem({
    value,
    disabled,
    children,
  }: {
    value: string;
    disabled?: boolean;
    children: React.ReactNode;
  }) {
    return (
      <option value={value} disabled={disabled}>
        {children}
      </option>
    );
  }

  function Select({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) {
    const childArray = ReactActual.Children.toArray(children);
    const trigger = childArray.find(isSelectTriggerElement);
    const id = trigger?.props.id;
    const rest = childArray.filter((child) => !isSelectTriggerElement(child));
    return (
      <select
        id={id}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="" />
        {rest}
      </select>
    );
  }

  return {
    Select,
    SelectGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectLabel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectSeparator: () => null,
  };
});

function buildCommitteeList(
  seats: Array<{ id: string; seatNumber: number; isPetitioned: boolean }>,
) {
  return [
    {
      id: 1,
      cityTown: "Test City",
      legDistrict: 1,
      electionDistrict: 1,
      termId: "term-1",
      seats,
    },
  ];
}

describe("PetitionOutcomesClient seat picker (SRS P1 revision)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders non-petitioned seats as enabled and already-petitioned seats as disabled with reason", async () => {
    const committeeLists = buildCommitteeList([
      { id: "seat-1", seatNumber: 1, isPetitioned: false },
      { id: "seat-2", seatNumber: 2, isPetitioned: true },
    ]);
    render(
      <PetitionOutcomesClient
        activeTermId="term-1"
        termLabel="2024–2026"
        committeeLists={committeeLists}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Committee"), "1");

    const seatOption1 = screen.getByRole("option", { name: "Seat 1" });
    const seatOption2 = screen.getByRole("option", {
      name: "Seat 2 — Outcome already recorded",
    });
    expect(seatOption1).not.toBeDisabled();
    expect(seatOption2).toBeDisabled();
  });

  it("shows a helper message when every seat already has a recorded outcome", async () => {
    const committeeLists = buildCommitteeList([
      { id: "seat-1", seatNumber: 1, isPetitioned: true },
    ]);
    render(
      <PetitionOutcomesClient
        activeTermId="term-1"
        termLabel="2024–2026"
        committeeLists={committeeLists}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Committee"), "1");

    expect(
      screen.getByText(
        "Every seat in this committee already has a recorded outcome for this term.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record outcome" })).toBeDisabled();
  });

  it("disables Record outcome once the selected seat's outcome is recorded elsewhere (stale-state guard)", async () => {
    const initialCommitteeLists = buildCommitteeList([
      { id: "seat-1", seatNumber: 1, isPetitioned: false },
    ]);
    const { rerender } = render(
      <PetitionOutcomesClient
        activeTermId="term-1"
        termLabel="2024–2026"
        committeeLists={initialCommitteeLists}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Committee"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Seat"), "1");

    expect(screen.getByRole("button", { name: "Record outcome" })).not.toBeDisabled();

    const updatedCommitteeLists = buildCommitteeList([
      { id: "seat-1", seatNumber: 1, isPetitioned: true },
    ]);
    rerender(
      <PetitionOutcomesClient
        activeTermId="term-1"
        termLabel="2024–2026"
        committeeLists={updatedCommitteeLists}
      />,
    );

    expect(screen.getByRole("button", { name: "Record outcome" })).toBeDisabled();
  });
});
