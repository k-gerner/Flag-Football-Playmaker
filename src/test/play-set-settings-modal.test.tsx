import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { PlaySetSettingsModal } from "../components/PlaySetSettingsModal";
import { createPlaySet } from "../lib/playbook";

describe("PlaySetSettingsModal", () => {
  it("shows the export button in a loading state while exporting", () => {
    const onExportPlaySet = vi.fn();

    render(
      <PlaySetSettingsModal
        exporting
        onClose={() => undefined}
        onExportPlaySet={onExportPlaySet}
        onSave={() => undefined}
        open
        playSet={createPlaySet("Test Set")}
      />,
    );

    const exportButton = screen.getByRole("button", { name: "Exporting PDF..." });

    expect(exportButton).toBeDisabled();
    expect(exportButton).toHaveAttribute("aria-busy", "true");

    fireEvent.click(exportButton);
    expect(onExportPlaySet).not.toHaveBeenCalled();
  });
});
