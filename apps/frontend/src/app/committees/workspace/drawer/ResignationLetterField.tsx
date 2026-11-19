"use client";
/**
 * The optional Resignation Letter upload (leader-feedback-2026-11 ticket 08),
 * shared by the Leader's resignation Exit Report and the Admin's Record
 * resignation.
 *
 * Picking a file uploads it straight away (presigned PUT to staging) with a
 * progress line; the parent's submit sends the staged key, and the
 * server checks the real bytes then. One file: picking another replaces it,
 * and Remove drops it. The parent lists `letterFieldProblems(value)` with its
 * own, so it can't submit while an upload is running.
 */
import React, { useEffect, useId, useRef } from "react";

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  LETTER_ACCEPT,
  LETTER_MAX_LABEL,
  LETTER_TYPE_LABEL,
  letterViewHref,
  type StagedLetter,
} from "~/lib/resignationLetter";
import type { CommitteeRef } from "../committeeAction";
import { uploadResignationLetter, type ActionOutcome } from "../adapters";

export type LetterFieldState =
  | { status: "empty" }
  | { status: "uploading"; fileName: string; progress: number }
  | { status: "ready"; fileName: string; staged: StagedLetter }
  | { status: "error"; message: string };

export const EMPTY_LETTER: LetterFieldState = { status: "empty" };

/** What blocks submitting: an upload still running. */
export function letterFieldProblems(state: LetterFieldState): string[] {
  return state.status === "uploading"
    ? ["Wait for the letter to finish uploading."]
    : [];
}

export const LETTER_REFUSED_FORM_MESSAGE = "The letter wasn't accepted. Attach it again, or remove it.";

/**
 * After a submit: when the server refused the staged letter (it deletes it),
 * the field shows why instead of a stale "Attached", and the form's own alert
 * points at the field rather than repeating the reason.
 */
export function letterAfterSubmit(
  state: LetterFieldState,
  outcome: ActionOutcome,
): { letter: LetterFieldState; outcome: ActionOutcome } {
  if (outcome.ok || outcome.kind !== "error" || !outcome.letterRejected) {
    return { letter: state, outcome };
  }
  return {
    letter: { status: "error", message: outcome.message },
    outcome: { ...outcome, message: LETTER_REFUSED_FORM_MESSAGE },
  };
}

/** The staged letter to submit, or null. */
export function stagedLetterOf(state: LetterFieldState): StagedLetter | null {
  return state.status === "ready" ? state.staged : null;
}

export function ResignationLetterField({
  target,
  value,
  onChange,
  disabled = false,
}: {
  target: { committee: CommitteeRef; memberId: string };
  value: LetterFieldState;
  onChange: (next: LetterFieldState) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<AbortController | null>(null);
  useEffect(() => () => uploadRef.current?.abort(), []);

  const start = async (file: File) => {
    uploadRef.current?.abort();
    const controller = new AbortController();
    uploadRef.current = controller;
    onChange({ status: "uploading", fileName: file.name, progress: 0 });
    const result = await uploadResignationLetter(
      target,
      file,
      (progress) => {
        if (!controller.signal.aborted) {
          onChange({ status: "uploading", fileName: file.name, progress });
        }
      },
      controller.signal,
    );
    if (controller.signal.aborted) return;
    uploadRef.current = null;
    onChange(
      result.ok
        ? { status: "ready", fileName: file.name, staged: result.staged }
        : { status: "error", message: result.message },
    );
  };

  const remove = () => {
    uploadRef.current?.abort();
    uploadRef.current = null;
    onChange(EMPTY_LETTER);
  };

  const hasFile = value.status === "ready" || value.status === "uploading";

  return (
    <div className="grid gap-1" data-testid="resignation-letter-field">
      <Label id={`${id}-label`} htmlFor={id}>
        Resignation letter (optional)
      </Label>
      <p id={`${id}-hint`} className="text-xs text-slate-600 dark:text-slate-400">
        {`${LETTER_TYPE_LABEL}, up to ${LETTER_MAX_LABEL}.`}
      </p>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={LETTER_ACCEPT}
        className="sr-only"
        // The "Choose file" button opens it; one tab stop, not two.
        tabIndex={-1}
        aria-describedby={`${id}-hint`}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void start(file);
        }}
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          // The input isn't a tab stop, so the button carries its label and hint.
          aria-describedby={`${id}-label ${id}-hint`}
          onClick={() => inputRef.current?.click()}
        >
          {hasFile ? "Replace file" : "Choose file"}
        </Button>
        {hasFile && (
          <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={remove}>
            Remove
          </Button>
        )}
      </div>
      <div aria-live="polite" className="text-sm">
        {value.status === "uploading" && (
          <p>
            Uploading {value.fileName}… {Math.round(value.progress * 100)}%
          </p>
        )}
        {value.status === "ready" && (
          <p data-testid="letter-ready">
            Attached: <span className="font-medium">{value.fileName}</span>
          </p>
        )}
        {value.status === "error" && (
          <p role="alert" className="text-red-700 dark:text-red-400">
            {value.message}
          </p>
        )}
      </div>
    </div>
  );
}

/** "View letter": opens through the access check; HEIC downloads instead. */
export function ViewLetterLink({
  membershipId,
  fileName,
}: {
  membershipId: string;
  fileName: string;
}) {
  return (
    <a
      href={letterViewHref(membershipId)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      aria-label={`View letter: ${fileName} (opens in a new tab)`}
    >
      View letter
    </a>
  );
}
