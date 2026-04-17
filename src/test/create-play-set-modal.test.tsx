import { fireEvent, render, screen } from "@testing-library/react";
import { CreatePlaySetModal } from "../components/CreatePlaySetModal";

describe("CreatePlaySetModal", () => {
  it("lets numeric fields stay empty while editing and disables create", () => {
    render(
      <CreatePlaySetModal
        defaultName="Play Set 1"
        onClose={() => undefined}
        onSubmit={() => undefined}
        open
      />,
    );

    const rowsInput = screen.getByRole("spinbutton", { name: "Rows per page" });
    fireEvent.change(rowsInput, { target: { value: "" } });

    expect(rowsInput).toHaveValue(null);
    expect(screen.getByRole("button", { name: "Create Play Set" })).toBeDisabled();
  });
});
