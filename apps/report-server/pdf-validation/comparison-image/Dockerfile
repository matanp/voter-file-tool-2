# Pinned PDF comparison image for `pdf-validation verify`. Runs on the operator's machine, never the box.
#
# Pinned: the Node base image by digest (linux/amd64 manifest of node:22.21.1-bookworm-slim) and
# Poppler by exact package version from a fixed snapshot.debian.org date, so rebuilding later
# installs the same bytes. The image diff is the harness's own dependency-free code
# (src/image.ts), mounted read-only at run time with the rest of the compiled harness.
#
# verify builds this as vft-pdf-compare:<sha256 of this file, 12 chars> and records the image ID.
# Change anything here and the tag changes, so old and new results are never mixed silently.
FROM node:22.21.1-bookworm-slim@sha256:650d460b4e6b02411caa0e563838f07fafc9792314d5091859d837d8b070712b

ARG SNAPSHOT=20251101T000000Z
RUN rm -f /etc/apt/sources.list.d/* \
 && printf 'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian/%s bookworm main\ndeb [check-valid-until=no] http://snapshot.debian.org/archive/debian-security/%s bookworm-security main\n' "$SNAPSHOT" "$SNAPSHOT" > /etc/apt/sources.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends poppler-utils=22.12.0-2+deb12u1 \
 && rm -rf /var/lib/apt/lists/*

# No network or credentials at run time: verify passes --network none and mounts only the run.
USER node
WORKDIR /work
