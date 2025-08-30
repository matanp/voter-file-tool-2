
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.15.0
 * Query Engine version: 12e25d8d06f6ea5a0252864dd9a03b1bb51f3022
 */
Prisma.prismaVersion = {
  client: "5.15.0",
  engine: "12e25d8d06f6ea5a0252864dd9a03b1bb51f3022"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}

/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  emailVerified: 'emailVerified',
  image: 'image',
  privilegeLevel: 'privilegeLevel',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  userId: 'userId',
  type: 'type',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  refresh_token: 'refresh_token',
  access_token: 'access_token',
  expires_at: 'expires_at',
  token_type: 'token_type',
  scope: 'scope',
  id_token: 'id_token',
  session_state: 'session_state',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SessionScalarFieldEnum = {
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PrivilegedUserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  privilegeLevel: 'privilegeLevel'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  identifier: 'identifier',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.AuthenticatorScalarFieldEnum = {
  credentialID: 'credentialID',
  userId: 'userId',
  providerAccountId: 'providerAccountId',
  credentialPublicKey: 'credentialPublicKey',
  counter: 'counter',
  credentialDeviceType: 'credentialDeviceType',
  credentialBackedUp: 'credentialBackedUp',
  transports: 'transports'
};

exports.Prisma.VoterRecordArchiveScalarFieldEnum = {
  id: 'id',
  VRCNUM: 'VRCNUM',
  recordEntryYear: 'recordEntryYear',
  recordEntryNumber: 'recordEntryNumber',
  lastName: 'lastName',
  firstName: 'firstName',
  middleInitial: 'middleInitial',
  suffixName: 'suffixName',
  houseNum: 'houseNum',
  street: 'street',
  apartment: 'apartment',
  halfAddress: 'halfAddress',
  resAddrLine2: 'resAddrLine2',
  resAddrLine3: 'resAddrLine3',
  city: 'city',
  state: 'state',
  zipCode: 'zipCode',
  zipSuffix: 'zipSuffix',
  telephone: 'telephone',
  email: 'email',
  mailingAddress1: 'mailingAddress1',
  mailingAddress2: 'mailingAddress2',
  mailingAddress3: 'mailingAddress3',
  mailingAddress4: 'mailingAddress4',
  mailingCity: 'mailingCity',
  mailingState: 'mailingState',
  mailingZip: 'mailingZip',
  mailingZipSuffix: 'mailingZipSuffix',
  party: 'party',
  gender: 'gender',
  DOB: 'DOB',
  L_T: 'L_T',
  electionDistrict: 'electionDistrict',
  countyLegDistrict: 'countyLegDistrict',
  stateAssmblyDistrict: 'stateAssmblyDistrict',
  stateSenateDistrict: 'stateSenateDistrict',
  congressionalDistrict: 'congressionalDistrict',
  CC_WD_Village: 'CC_WD_Village',
  townCode: 'townCode',
  lastUpdate: 'lastUpdate',
  originalRegDate: 'originalRegDate',
  statevid: 'statevid'
};

exports.Prisma.VoterRecordScalarFieldEnum = {
  VRCNUM: 'VRCNUM',
  committeeId: 'committeeId',
  addressForCommittee: 'addressForCommittee',
  latestRecordEntryYear: 'latestRecordEntryYear',
  latestRecordEntryNumber: 'latestRecordEntryNumber',
  lastName: 'lastName',
  firstName: 'firstName',
  middleInitial: 'middleInitial',
  suffixName: 'suffixName',
  houseNum: 'houseNum',
  street: 'street',
  apartment: 'apartment',
  halfAddress: 'halfAddress',
  resAddrLine2: 'resAddrLine2',
  resAddrLine3: 'resAddrLine3',
  city: 'city',
  state: 'state',
  zipCode: 'zipCode',
  zipSuffix: 'zipSuffix',
  telephone: 'telephone',
  email: 'email',
  mailingAddress1: 'mailingAddress1',
  mailingAddress2: 'mailingAddress2',
  mailingAddress3: 'mailingAddress3',
  mailingAddress4: 'mailingAddress4',
  mailingCity: 'mailingCity',
  mailingState: 'mailingState',
  mailingZip: 'mailingZip',
  mailingZipSuffix: 'mailingZipSuffix',
  party: 'party',
  gender: 'gender',
  DOB: 'DOB',
  L_T: 'L_T',
  electionDistrict: 'electionDistrict',
  countyLegDistrict: 'countyLegDistrict',
  stateAssmblyDistrict: 'stateAssmblyDistrict',
  stateSenateDistrict: 'stateSenateDistrict',
  congressionalDistrict: 'congressionalDistrict',
  CC_WD_Village: 'CC_WD_Village',
  townCode: 'townCode',
  lastUpdate: 'lastUpdate',
  originalRegDate: 'originalRegDate',
  statevid: 'statevid',
  hasDiscrepancy: 'hasDiscrepancy'
};

exports.Prisma.VotingHistoryRecordScalarFieldEnum = {
  id: 'id',
  voterRecordId: 'voterRecordId',
  date: 'date',
  value: 'value'
};

exports.Prisma.CommitteeListScalarFieldEnum = {
  id: 'id',
  cityTown: 'cityTown',
  legDistrict: 'legDistrict',
  electionDistrict: 'electionDistrict'
};

exports.Prisma.CommitteeRequestScalarFieldEnum = {
  id: 'id',
  committeeListId: 'committeeListId',
  addVoterRecordId: 'addVoterRecordId',
  removeVoterRecordId: 'removeVoterRecordId',
  requestNotes: 'requestNotes'
};

exports.Prisma.DropdownListsScalarFieldEnum = {
  id: 'id',
  city: 'city',
  zipCode: 'zipCode',
  street: 'street',
  countyLegDistrict: 'countyLegDistrict',
  stateAssmblyDistrict: 'stateAssmblyDistrict',
  stateSenateDistrict: 'stateSenateDistrict',
  congressionalDistrict: 'congressionalDistrict',
  townCode: 'townCode',
  electionDistrict: 'electionDistrict',
  party: 'party'
};

exports.Prisma.CommitteeUploadDiscrepancyScalarFieldEnum = {
  id: 'id',
  VRCNUM: 'VRCNUM',
  committeeId: 'committeeId',
  discrepancy: 'discrepancy'
};

exports.Prisma.ElectionDateScalarFieldEnum = {
  id: 'id',
  date: 'date'
};

exports.Prisma.OfficeNameScalarFieldEnum = {
  id: 'id',
  officeName: 'officeName'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.PrivilegeLevel = exports.$Enums.PrivilegeLevel = {
  Developer: 'Developer',
  Admin: 'Admin',
  RequestAccess: 'RequestAccess',
  ReadAccess: 'ReadAccess'
};

exports.Prisma.ModelName = {
  User: 'User',
  Account: 'Account',
  Session: 'Session',
  PrivilegedUser: 'PrivilegedUser',
  VerificationToken: 'VerificationToken',
  Authenticator: 'Authenticator',
  VoterRecordArchive: 'VoterRecordArchive',
  VoterRecord: 'VoterRecord',
  VotingHistoryRecord: 'VotingHistoryRecord',
  CommitteeList: 'CommitteeList',
  CommitteeRequest: 'CommitteeRequest',
  DropdownLists: 'DropdownLists',
  CommitteeUploadDiscrepancy: 'CommitteeUploadDiscrepancy',
  ElectionDate: 'ElectionDate',
  OfficeName: 'OfficeName'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
