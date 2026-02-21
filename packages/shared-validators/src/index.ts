// Export all schemas and types
export * from './schemas/designatedPetition';
export * from './schemas/ldCommittees';
export * from './schemas/voterRecord';
export * from './schemas/report';
export * from './schemas/api';

// Export voter import types and validators
export * from './voterImport';

// Export utility functions
export * from './compoundFieldUtils';
export * from './committeeUtils';
export * from './searchQueryUtils';
export * from './searchQueryFieldGuards';
export * from './searchQueryErrors';
export * from './searchQueryFieldValidators';
export * from './searchQueryNormalizers';
export * from './fileUtils';

// Export shared constants
export * from './constants';

// Export report type mappings
export * from './reportTypeMapping';

// Export shared BOE eligibility flagging helpers
export {
  getMostRecentImportVersion,
  isVoterPossiblyInactive,
  runBoeEligibilityFlagging,
  type MostRecentImportVersion,
  type BoeEligibilityFlaggingRunInput,
  type BoeEligibilityFlaggingRunResult,
} from '@voter-file-tool/shared-prisma';

// Re-export commonly used Zod utilities
export { z } from 'zod';
