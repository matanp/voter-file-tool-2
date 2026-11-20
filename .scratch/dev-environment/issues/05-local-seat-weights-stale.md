# 05 - Local Seat.weight values are stale

Status: ready-for-agent
Tier: 3 (polish) · Priority: P3
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), finding N1

## Problem

Locally, Seats & Weight shows seat weight 7.4375 under "LTED weight 29.75 per seat". All 1,748 local `Seat.weight`
values are the old ÷4 figure (leader-feedback-2026-11/02). Prod is correct.

## Fix

Re-run the seat-weight backfill against the local DB, and make sure a fresh local seed or restore produces current
weights. Local DB only; set the local URL explicitly when running it.

## Acceptance criteria

- [ ] Local seat weights match the LTED weight per seat.
