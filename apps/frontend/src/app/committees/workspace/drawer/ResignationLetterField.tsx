"use client";
/**
 * The optional Resignation Letter upload (leader-feedback-2026-11 ticket 08),
 * shared by the Leader's resignation Exit Report and the Admin's Record
 * resignation (and meant for ticket 09).
 *
 * Picking a file uploads it straight away (presigned PUT to staging) with a
 * progress line; the parent's submit sends the staged key, and the
 * server checks the real bytes then. One file: picking another replaces it,
 * and Remove drops it. The parent should block submitting while
 * `letterFieldBusy(value)`.
 */
import React, { useEffect, useId, useRef } from "react";

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  LETTER_ACCEPT,
  LETTER_TYPE_LABEL,
  type StagedLetter,
} from "~/lib/resignationLetter";
import type { CommitteeRef } from "../committeeAction";
import { uploadResignationLetter } from "../adapters";

export type LetterFieldState =
  | { status: "empty" }
  | { status: "uploading"; fileName: string; progress: number }
  | { status: "ready"; fileName: string; staged: StagedLetter }
  | { status: "error"; message: string };

export const EMPTY_LETTER: LetterFieldState = { status: "empty" };

export function letterFieldBusy(state: LetterFieldState): boolean {
  return state.status === "uploading";
}

/** The staged letter to submit, or null. */
export function stagedLetterOf(state: LetterFieldState): StagedLetter | null {
  return state.status === "ready" ? state.staged : null;
}

export function ResignationLetterField({
  target,
  value,
  onChange,
  label = "Resignation letter (optional)",
  hint,
  disabled = false,
}: {
  target: { committee: CommitteeRef; memberId: string };
  value: LetterFieldState;
  onChange: (next: LetterFieldState) => void;
  label?: string;
  hint?: string;
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
      <Label htmlFor={id}>{label}</Label>
      <p id={`${id}-hint`} className="text-xs text-slate-600 dark:text-slate-400">
        {hint ?? `${LETTER_TYPE_LABEL}, up to 10 MB.`}
      </p>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={LETTER_ACCEPT}
        className="sr-only"
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
  href,
  fileName,
  label = "View letter",
}: {
  href: string;
  fileName: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      aria-label={`${label}: ${fileName} (opens in a new tab)`}
    >
      {label}
    </a>
  );
}
