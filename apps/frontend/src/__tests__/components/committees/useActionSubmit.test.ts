/**
 * `useActionSubmit` (drawer mutations): the action stays in flight until
 * `onSuccess` settles (ticket 27), and never stays stuck in flight if
 * `onSuccess` rejects.
 */
import { act, renderHook } from "@testing-library/react";

import { useActionSubmit } from "~/app/committees/workspace/drawer/drawerParts";
import type { ActionOutcome } from "~/app/committees/workspace/adapters";

const succeeded = (): Promise<ActionOutcome> =>
  Promise.resolve({ ok: true, message: "Added" });

describe("useActionSubmit", () => {
  it("stays submitting until onSuccess settles", async () => {
    let release: () => void = () => undefined;
    const onSuccess = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const { result } = renderHook(() => useActionSubmit(onSuccess));

    let run: Promise<unknown> = Promise.resolve();
    await act(async () => {
      run = result.current.run(succeeded);
    });
    expect(onSuccess).toHaveBeenCalledWith("Added");
    expect(result.current.submitting).toBe(true);

    await act(async () => {
      release();
      await run;
    });
    expect(result.current.submitting).toBe(false);
  });

  it("stops submitting when onSuccess rejects", async () => {
    const onSuccess = jest.fn(() => Promise.reject(new Error("refresh failed")));
    const { result } = renderHook(() => useActionSubmit(onSuccess));

    await act(async () => {
      await expect(result.current.run(succeeded)).rejects.toThrow("refresh failed");
    });
    expect(result.current.submitting).toBe(false);
  });
});
