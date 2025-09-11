-- CreateIndex
CREATE INDEX "Report_generatedById_idx" ON "Report"("generatedById");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_public_idx" ON "Report"("public");

-- CreateIndex
CREATE INDEX "Report_requestedAt_idx" ON "Report"("requestedAt");

-- CreateIndex
CREATE INDEX "Report_generatedById_status_idx" ON "Report"("generatedById", "status");

-- CreateIndex
CREATE INDEX "Report_public_status_idx" ON "Report"("public", "status");
