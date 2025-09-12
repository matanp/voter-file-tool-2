#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PRISMA_SCHEMA_PATH = path.join(
  __dirname,
  '../apps/frontend/prisma/schema.prisma'
);
const SHARED_PRISMA_INDEX_PATH = path.join(
  __dirname,
  '../packages/shared-prisma/src/index.ts'
);
const SHARED_PRISMA_PACKAGE_PATH = path.join(
  __dirname,
  '../packages/shared-prisma'
);

/**
 * Parse Prisma schema file to extract model and enum names
 */
function parsePrismaSchema(schemaPath) {
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  const models = [];
  const enums = [];

  // Parse models
  const modelRegex = /^model\s+(\w+)\s*{/gm;
  let match;
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    models.push(match[1]);
  }

  // Parse enums
  const enumRegex = /^enum\s+(\w+)\s*{/gm;
  while ((match = enumRegex.exec(schemaContent)) !== null) {
    enums.push(match[1]);
  }

  return { models, enums };
}

/**
 * Generate the updated index.ts content
 */
function generateIndexContent(models, enums) {
  const sortedEnums = [...enums].sort();
  const sortedModels = [...models].sort();

  return `// Re-export all Prisma types and utilities
export type {
  // Enums
${sortedEnums.map((enumName) => `  ${enumName},`).join('\n')}

  // Model types
${sortedModels.map((modelName) => `  ${modelName},`).join('\n')}
} from '@prisma/client';

// Re-export PrismaClient class
export { PrismaClient } from '@prisma/client';

// Re-export Prisma namespace for all input types, where clauses, etc.
export type { Prisma } from '@prisma/client';

// Re-export common Prisma utilities
export {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
} from '@prisma/client/runtime/library';
`;
}

/**
 * Update the shared-prisma index.ts file
 */
function updateSharedPrismaIndex(models, enums) {
  const newContent = generateIndexContent(models, enums);
  fs.writeFileSync(SHARED_PRISMA_INDEX_PATH, newContent, 'utf8');
  console.log('✅ Updated shared-prisma/src/index.ts');
}

/**
 * Build the shared-prisma package
 */
function buildSharedPrismaPackage() {
  try {
    console.log('🔨 Building shared-prisma package...');
    execSync('pnpm build', {
      cwd: SHARED_PRISMA_PACKAGE_PATH,
      stdio: 'inherit',
    });
    console.log('✅ Successfully built shared-prisma package');
  } catch (error) {
    console.error('❌ Failed to build shared-prisma package:', error.message);
    process.exit(1);
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔄 Syncing Prisma models to shared-prisma package...');

  try {
    // Check if Prisma schema exists
    if (!fs.existsSync(PRISMA_SCHEMA_PATH)) {
      console.error(`❌ Prisma schema not found at: ${PRISMA_SCHEMA_PATH}`);
      process.exit(1);
    }

    // Parse the schema
    const { models, enums } = parsePrismaSchema(PRISMA_SCHEMA_PATH);

    console.log(`📋 Found ${models.length} models: ${models.join(', ')}`);
    console.log(`📋 Found ${enums.length} enums: ${enums.join(', ')}`);

    // Update the shared-prisma index
    updateSharedPrismaIndex(models, enums);

    // Build the package
    buildSharedPrismaPackage();

    console.log(
      '🎉 Successfully synced Prisma models to shared-prisma package!'
    );
  } catch (error) {
    console.error('❌ Error syncing Prisma models:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  parsePrismaSchema,
  generateIndexContent,
  updateSharedPrismaIndex,
};
