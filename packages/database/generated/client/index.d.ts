
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Account
 * 
 */
export type Account = $Result.DefaultSelection<Prisma.$AccountPayload>
/**
 * Model Session
 * 
 */
export type Session = $Result.DefaultSelection<Prisma.$SessionPayload>
/**
 * Model PrivilegedUser
 * 
 */
export type PrivilegedUser = $Result.DefaultSelection<Prisma.$PrivilegedUserPayload>
/**
 * Model VerificationToken
 * 
 */
export type VerificationToken = $Result.DefaultSelection<Prisma.$VerificationTokenPayload>
/**
 * Model Authenticator
 * 
 */
export type Authenticator = $Result.DefaultSelection<Prisma.$AuthenticatorPayload>
/**
 * Model VoterRecordArchive
 * 
 */
export type VoterRecordArchive = $Result.DefaultSelection<Prisma.$VoterRecordArchivePayload>
/**
 * Model VoterRecord
 * 
 */
export type VoterRecord = $Result.DefaultSelection<Prisma.$VoterRecordPayload>
/**
 * Model VotingHistoryRecord
 * 
 */
export type VotingHistoryRecord = $Result.DefaultSelection<Prisma.$VotingHistoryRecordPayload>
/**
 * Model CommitteeList
 * 
 */
export type CommitteeList = $Result.DefaultSelection<Prisma.$CommitteeListPayload>
/**
 * Model CommitteeRequest
 * 
 */
export type CommitteeRequest = $Result.DefaultSelection<Prisma.$CommitteeRequestPayload>
/**
 * Model DropdownLists
 * 
 */
export type DropdownLists = $Result.DefaultSelection<Prisma.$DropdownListsPayload>
/**
 * Model CommitteeUploadDiscrepancy
 * 
 */
export type CommitteeUploadDiscrepancy = $Result.DefaultSelection<Prisma.$CommitteeUploadDiscrepancyPayload>
/**
 * Model ElectionDate
 * 
 */
export type ElectionDate = $Result.DefaultSelection<Prisma.$ElectionDatePayload>
/**
 * Model OfficeName
 * 
 */
export type OfficeName = $Result.DefaultSelection<Prisma.$OfficeNamePayload>

/**
 * Enums
 */
export namespace $Enums {
  export const PrivilegeLevel: {
  Developer: 'Developer',
  Admin: 'Admin',
  RequestAccess: 'RequestAccess',
  ReadAccess: 'ReadAccess'
};

export type PrivilegeLevel = (typeof PrivilegeLevel)[keyof typeof PrivilegeLevel]

}

export type PrivilegeLevel = $Enums.PrivilegeLevel

export const PrivilegeLevel: typeof $Enums.PrivilegeLevel

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  T extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof T ? T['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<T['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<T, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<'extends', Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs>;

  /**
   * `prisma.account`: Exposes CRUD operations for the **Account** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Accounts
    * const accounts = await prisma.account.findMany()
    * ```
    */
  get account(): Prisma.AccountDelegate<ExtArgs>;

  /**
   * `prisma.session`: Exposes CRUD operations for the **Session** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Sessions
    * const sessions = await prisma.session.findMany()
    * ```
    */
  get session(): Prisma.SessionDelegate<ExtArgs>;

  /**
   * `prisma.privilegedUser`: Exposes CRUD operations for the **PrivilegedUser** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PrivilegedUsers
    * const privilegedUsers = await prisma.privilegedUser.findMany()
    * ```
    */
  get privilegedUser(): Prisma.PrivilegedUserDelegate<ExtArgs>;

  /**
   * `prisma.verificationToken`: Exposes CRUD operations for the **VerificationToken** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more VerificationTokens
    * const verificationTokens = await prisma.verificationToken.findMany()
    * ```
    */
  get verificationToken(): Prisma.VerificationTokenDelegate<ExtArgs>;

  /**
   * `prisma.authenticator`: Exposes CRUD operations for the **Authenticator** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Authenticators
    * const authenticators = await prisma.authenticator.findMany()
    * ```
    */
  get authenticator(): Prisma.AuthenticatorDelegate<ExtArgs>;

  /**
   * `prisma.voterRecordArchive`: Exposes CRUD operations for the **VoterRecordArchive** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more VoterRecordArchives
    * const voterRecordArchives = await prisma.voterRecordArchive.findMany()
    * ```
    */
  get voterRecordArchive(): Prisma.VoterRecordArchiveDelegate<ExtArgs>;

  /**
   * `prisma.voterRecord`: Exposes CRUD operations for the **VoterRecord** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more VoterRecords
    * const voterRecords = await prisma.voterRecord.findMany()
    * ```
    */
  get voterRecord(): Prisma.VoterRecordDelegate<ExtArgs>;

  /**
   * `prisma.votingHistoryRecord`: Exposes CRUD operations for the **VotingHistoryRecord** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more VotingHistoryRecords
    * const votingHistoryRecords = await prisma.votingHistoryRecord.findMany()
    * ```
    */
  get votingHistoryRecord(): Prisma.VotingHistoryRecordDelegate<ExtArgs>;

  /**
   * `prisma.committeeList`: Exposes CRUD operations for the **CommitteeList** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CommitteeLists
    * const committeeLists = await prisma.committeeList.findMany()
    * ```
    */
  get committeeList(): Prisma.CommitteeListDelegate<ExtArgs>;

  /**
   * `prisma.committeeRequest`: Exposes CRUD operations for the **CommitteeRequest** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CommitteeRequests
    * const committeeRequests = await prisma.committeeRequest.findMany()
    * ```
    */
  get committeeRequest(): Prisma.CommitteeRequestDelegate<ExtArgs>;

  /**
   * `prisma.dropdownLists`: Exposes CRUD operations for the **DropdownLists** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more DropdownLists
    * const dropdownLists = await prisma.dropdownLists.findMany()
    * ```
    */
  get dropdownLists(): Prisma.DropdownListsDelegate<ExtArgs>;

  /**
   * `prisma.committeeUploadDiscrepancy`: Exposes CRUD operations for the **CommitteeUploadDiscrepancy** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CommitteeUploadDiscrepancies
    * const committeeUploadDiscrepancies = await prisma.committeeUploadDiscrepancy.findMany()
    * ```
    */
  get committeeUploadDiscrepancy(): Prisma.CommitteeUploadDiscrepancyDelegate<ExtArgs>;

  /**
   * `prisma.electionDate`: Exposes CRUD operations for the **ElectionDate** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ElectionDates
    * const electionDates = await prisma.electionDate.findMany()
    * ```
    */
  get electionDate(): Prisma.ElectionDateDelegate<ExtArgs>;

  /**
   * `prisma.officeName`: Exposes CRUD operations for the **OfficeName** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more OfficeNames
    * const officeNames = await prisma.officeName.findMany()
    * ```
    */
  get officeName(): Prisma.OfficeNameDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql

  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.15.0
   * Query Engine version: 12e25d8d06f6ea5a0252864dd9a03b1bb51f3022
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches a JSON object.
   * This type can be useful to enforce some input to be JSON-compatible or as a super-type to be extended from. 
   */
  export type JsonObject = {[Key in string]?: JsonValue}

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches a JSON array.
   */
  export interface JsonArray extends Array<JsonValue> {}

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches any valid JSON value.
   */
  export type JsonValue = string | number | boolean | JsonObject | JsonArray | null

  /**
   * Matches a JSON object.
   * Unlike `JsonObject`, this type allows undefined and read-only properties.
   */
  export type InputJsonObject = {readonly [Key in string]?: InputJsonValue | null}

  /**
   * Matches a JSON array.
   * Unlike `JsonArray`, readonly arrays are assignable to this type.
   */
  export interface InputJsonArray extends ReadonlyArray<InputJsonValue | null> {}

  /**
   * Matches any valid value that can be used as an input for operations like
   * create and update as the value of a JSON field. Unlike `JsonValue`, this
   * type allows read-only arrays and read-only object properties and disallows
   * `null` at the top level.
   *
   * `null` cannot be used as the value of a JSON field because its meaning
   * would be ambiguous. Use `Prisma.JsonNull` to store the JSON null value or
   * `Prisma.DbNull` to clear the JSON value and set the field to the database
   * NULL value instead.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-by-null-values
   */
  export type InputJsonValue = string | number | boolean | InputJsonObject | InputJsonArray | { toJSON(): unknown }

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
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

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }


  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs}, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    meta: {
      modelProps: 'user' | 'account' | 'session' | 'privilegedUser' | 'verificationToken' | 'authenticator' | 'voterRecordArchive' | 'voterRecord' | 'votingHistoryRecord' | 'committeeList' | 'committeeRequest' | 'dropdownLists' | 'committeeUploadDiscrepancy' | 'electionDate' | 'officeName'
      txIsolationLevel: Prisma.TransactionIsolationLevel
    },
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>,
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>,
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Account: {
        payload: Prisma.$AccountPayload<ExtArgs>
        fields: Prisma.AccountFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AccountFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AccountPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AccountFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          findFirst: {
            args: Prisma.AccountFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AccountPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AccountFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          findMany: {
            args: Prisma.AccountFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>[]
          }
          create: {
            args: Prisma.AccountCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          createMany: {
            args: Prisma.AccountCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AccountCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>[]
          }
          delete: {
            args: Prisma.AccountDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          update: {
            args: Prisma.AccountUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          deleteMany: {
            args: Prisma.AccountDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.AccountUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.AccountUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          aggregate: {
            args: Prisma.AccountAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateAccount>
          }
          groupBy: {
            args: Prisma.AccountGroupByArgs<ExtArgs>,
            result: $Utils.Optional<AccountGroupByOutputType>[]
          }
          count: {
            args: Prisma.AccountCountArgs<ExtArgs>,
            result: $Utils.Optional<AccountCountAggregateOutputType> | number
          }
        }
      }
      Session: {
        payload: Prisma.$SessionPayload<ExtArgs>
        fields: Prisma.SessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SessionFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SessionFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findFirst: {
            args: Prisma.SessionFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SessionFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findMany: {
            args: Prisma.SessionFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          create: {
            args: Prisma.SessionCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          createMany: {
            args: Prisma.SessionCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SessionCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          delete: {
            args: Prisma.SessionDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          update: {
            args: Prisma.SessionUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          deleteMany: {
            args: Prisma.SessionDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.SessionUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.SessionUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          aggregate: {
            args: Prisma.SessionAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateSession>
          }
          groupBy: {
            args: Prisma.SessionGroupByArgs<ExtArgs>,
            result: $Utils.Optional<SessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SessionCountArgs<ExtArgs>,
            result: $Utils.Optional<SessionCountAggregateOutputType> | number
          }
        }
      }
      PrivilegedUser: {
        payload: Prisma.$PrivilegedUserPayload<ExtArgs>
        fields: Prisma.PrivilegedUserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PrivilegedUserFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$PrivilegedUserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PrivilegedUserFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$PrivilegedUserPayload>
          }
          findFirst: {
            args: Prisma.PrivilegedUserFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$PrivilegedUserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PrivilegedUserFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$PrivilegedUserPayload>
          }
          findMany: {
            args: Prisma.PrivilegedUserFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$PrivilegedUserPayload>[]
          }
          create: {
            args: Prisma.PrivilegedUserCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$PrivilegedUserPayload>
          }
          createMany: {
            args: Prisma.PrivilegedUserCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PrivilegedUserCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$PrivilegedUserPayload>[]
          }
          delete: {
            args: Prisma.PrivilegedUserDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$PrivilegedUserPayload>
          }
          update: {
            args: Prisma.PrivilegedUserUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$PrivilegedUserPayload>
          }
          deleteMany: {
            args: Prisma.PrivilegedUserDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.PrivilegedUserUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.PrivilegedUserUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$PrivilegedUserPayload>
          }
          aggregate: {
            args: Prisma.PrivilegedUserAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregatePrivilegedUser>
          }
          groupBy: {
            args: Prisma.PrivilegedUserGroupByArgs<ExtArgs>,
            result: $Utils.Optional<PrivilegedUserGroupByOutputType>[]
          }
          count: {
            args: Prisma.PrivilegedUserCountArgs<ExtArgs>,
            result: $Utils.Optional<PrivilegedUserCountAggregateOutputType> | number
          }
        }
      }
      VerificationToken: {
        payload: Prisma.$VerificationTokenPayload<ExtArgs>
        fields: Prisma.VerificationTokenFieldRefs
        operations: {
          findUnique: {
            args: Prisma.VerificationTokenFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.VerificationTokenFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>
          }
          findFirst: {
            args: Prisma.VerificationTokenFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.VerificationTokenFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>
          }
          findMany: {
            args: Prisma.VerificationTokenFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>[]
          }
          create: {
            args: Prisma.VerificationTokenCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>
          }
          createMany: {
            args: Prisma.VerificationTokenCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.VerificationTokenCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>[]
          }
          delete: {
            args: Prisma.VerificationTokenDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>
          }
          update: {
            args: Prisma.VerificationTokenUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>
          }
          deleteMany: {
            args: Prisma.VerificationTokenDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.VerificationTokenUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.VerificationTokenUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>
          }
          aggregate: {
            args: Prisma.VerificationTokenAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateVerificationToken>
          }
          groupBy: {
            args: Prisma.VerificationTokenGroupByArgs<ExtArgs>,
            result: $Utils.Optional<VerificationTokenGroupByOutputType>[]
          }
          count: {
            args: Prisma.VerificationTokenCountArgs<ExtArgs>,
            result: $Utils.Optional<VerificationTokenCountAggregateOutputType> | number
          }
        }
      }
      Authenticator: {
        payload: Prisma.$AuthenticatorPayload<ExtArgs>
        fields: Prisma.AuthenticatorFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuthenticatorFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AuthenticatorPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuthenticatorFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AuthenticatorPayload>
          }
          findFirst: {
            args: Prisma.AuthenticatorFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AuthenticatorPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuthenticatorFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AuthenticatorPayload>
          }
          findMany: {
            args: Prisma.AuthenticatorFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AuthenticatorPayload>[]
          }
          create: {
            args: Prisma.AuthenticatorCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AuthenticatorPayload>
          }
          createMany: {
            args: Prisma.AuthenticatorCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AuthenticatorCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AuthenticatorPayload>[]
          }
          delete: {
            args: Prisma.AuthenticatorDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AuthenticatorPayload>
          }
          update: {
            args: Prisma.AuthenticatorUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AuthenticatorPayload>
          }
          deleteMany: {
            args: Prisma.AuthenticatorDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.AuthenticatorUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.AuthenticatorUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AuthenticatorPayload>
          }
          aggregate: {
            args: Prisma.AuthenticatorAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateAuthenticator>
          }
          groupBy: {
            args: Prisma.AuthenticatorGroupByArgs<ExtArgs>,
            result: $Utils.Optional<AuthenticatorGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuthenticatorCountArgs<ExtArgs>,
            result: $Utils.Optional<AuthenticatorCountAggregateOutputType> | number
          }
        }
      }
      VoterRecordArchive: {
        payload: Prisma.$VoterRecordArchivePayload<ExtArgs>
        fields: Prisma.VoterRecordArchiveFieldRefs
        operations: {
          findUnique: {
            args: Prisma.VoterRecordArchiveFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordArchivePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.VoterRecordArchiveFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordArchivePayload>
          }
          findFirst: {
            args: Prisma.VoterRecordArchiveFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordArchivePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.VoterRecordArchiveFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordArchivePayload>
          }
          findMany: {
            args: Prisma.VoterRecordArchiveFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordArchivePayload>[]
          }
          create: {
            args: Prisma.VoterRecordArchiveCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordArchivePayload>
          }
          createMany: {
            args: Prisma.VoterRecordArchiveCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.VoterRecordArchiveCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordArchivePayload>[]
          }
          delete: {
            args: Prisma.VoterRecordArchiveDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordArchivePayload>
          }
          update: {
            args: Prisma.VoterRecordArchiveUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordArchivePayload>
          }
          deleteMany: {
            args: Prisma.VoterRecordArchiveDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.VoterRecordArchiveUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.VoterRecordArchiveUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordArchivePayload>
          }
          aggregate: {
            args: Prisma.VoterRecordArchiveAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateVoterRecordArchive>
          }
          groupBy: {
            args: Prisma.VoterRecordArchiveGroupByArgs<ExtArgs>,
            result: $Utils.Optional<VoterRecordArchiveGroupByOutputType>[]
          }
          count: {
            args: Prisma.VoterRecordArchiveCountArgs<ExtArgs>,
            result: $Utils.Optional<VoterRecordArchiveCountAggregateOutputType> | number
          }
        }
      }
      VoterRecord: {
        payload: Prisma.$VoterRecordPayload<ExtArgs>
        fields: Prisma.VoterRecordFieldRefs
        operations: {
          findUnique: {
            args: Prisma.VoterRecordFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.VoterRecordFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordPayload>
          }
          findFirst: {
            args: Prisma.VoterRecordFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.VoterRecordFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordPayload>
          }
          findMany: {
            args: Prisma.VoterRecordFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordPayload>[]
          }
          create: {
            args: Prisma.VoterRecordCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordPayload>
          }
          createMany: {
            args: Prisma.VoterRecordCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.VoterRecordCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordPayload>[]
          }
          delete: {
            args: Prisma.VoterRecordDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordPayload>
          }
          update: {
            args: Prisma.VoterRecordUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordPayload>
          }
          deleteMany: {
            args: Prisma.VoterRecordDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.VoterRecordUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.VoterRecordUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VoterRecordPayload>
          }
          aggregate: {
            args: Prisma.VoterRecordAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateVoterRecord>
          }
          groupBy: {
            args: Prisma.VoterRecordGroupByArgs<ExtArgs>,
            result: $Utils.Optional<VoterRecordGroupByOutputType>[]
          }
          count: {
            args: Prisma.VoterRecordCountArgs<ExtArgs>,
            result: $Utils.Optional<VoterRecordCountAggregateOutputType> | number
          }
        }
      }
      VotingHistoryRecord: {
        payload: Prisma.$VotingHistoryRecordPayload<ExtArgs>
        fields: Prisma.VotingHistoryRecordFieldRefs
        operations: {
          findUnique: {
            args: Prisma.VotingHistoryRecordFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VotingHistoryRecordPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.VotingHistoryRecordFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VotingHistoryRecordPayload>
          }
          findFirst: {
            args: Prisma.VotingHistoryRecordFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VotingHistoryRecordPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.VotingHistoryRecordFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VotingHistoryRecordPayload>
          }
          findMany: {
            args: Prisma.VotingHistoryRecordFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VotingHistoryRecordPayload>[]
          }
          create: {
            args: Prisma.VotingHistoryRecordCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VotingHistoryRecordPayload>
          }
          createMany: {
            args: Prisma.VotingHistoryRecordCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.VotingHistoryRecordCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VotingHistoryRecordPayload>[]
          }
          delete: {
            args: Prisma.VotingHistoryRecordDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VotingHistoryRecordPayload>
          }
          update: {
            args: Prisma.VotingHistoryRecordUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VotingHistoryRecordPayload>
          }
          deleteMany: {
            args: Prisma.VotingHistoryRecordDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.VotingHistoryRecordUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.VotingHistoryRecordUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$VotingHistoryRecordPayload>
          }
          aggregate: {
            args: Prisma.VotingHistoryRecordAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateVotingHistoryRecord>
          }
          groupBy: {
            args: Prisma.VotingHistoryRecordGroupByArgs<ExtArgs>,
            result: $Utils.Optional<VotingHistoryRecordGroupByOutputType>[]
          }
          count: {
            args: Prisma.VotingHistoryRecordCountArgs<ExtArgs>,
            result: $Utils.Optional<VotingHistoryRecordCountAggregateOutputType> | number
          }
        }
      }
      CommitteeList: {
        payload: Prisma.$CommitteeListPayload<ExtArgs>
        fields: Prisma.CommitteeListFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CommitteeListFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeListPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CommitteeListFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeListPayload>
          }
          findFirst: {
            args: Prisma.CommitteeListFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeListPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CommitteeListFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeListPayload>
          }
          findMany: {
            args: Prisma.CommitteeListFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeListPayload>[]
          }
          create: {
            args: Prisma.CommitteeListCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeListPayload>
          }
          createMany: {
            args: Prisma.CommitteeListCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CommitteeListCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeListPayload>[]
          }
          delete: {
            args: Prisma.CommitteeListDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeListPayload>
          }
          update: {
            args: Prisma.CommitteeListUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeListPayload>
          }
          deleteMany: {
            args: Prisma.CommitteeListDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.CommitteeListUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.CommitteeListUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeListPayload>
          }
          aggregate: {
            args: Prisma.CommitteeListAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateCommitteeList>
          }
          groupBy: {
            args: Prisma.CommitteeListGroupByArgs<ExtArgs>,
            result: $Utils.Optional<CommitteeListGroupByOutputType>[]
          }
          count: {
            args: Prisma.CommitteeListCountArgs<ExtArgs>,
            result: $Utils.Optional<CommitteeListCountAggregateOutputType> | number
          }
        }
      }
      CommitteeRequest: {
        payload: Prisma.$CommitteeRequestPayload<ExtArgs>
        fields: Prisma.CommitteeRequestFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CommitteeRequestFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeRequestPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CommitteeRequestFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeRequestPayload>
          }
          findFirst: {
            args: Prisma.CommitteeRequestFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeRequestPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CommitteeRequestFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeRequestPayload>
          }
          findMany: {
            args: Prisma.CommitteeRequestFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeRequestPayload>[]
          }
          create: {
            args: Prisma.CommitteeRequestCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeRequestPayload>
          }
          createMany: {
            args: Prisma.CommitteeRequestCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CommitteeRequestCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeRequestPayload>[]
          }
          delete: {
            args: Prisma.CommitteeRequestDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeRequestPayload>
          }
          update: {
            args: Prisma.CommitteeRequestUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeRequestPayload>
          }
          deleteMany: {
            args: Prisma.CommitteeRequestDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.CommitteeRequestUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.CommitteeRequestUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeRequestPayload>
          }
          aggregate: {
            args: Prisma.CommitteeRequestAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateCommitteeRequest>
          }
          groupBy: {
            args: Prisma.CommitteeRequestGroupByArgs<ExtArgs>,
            result: $Utils.Optional<CommitteeRequestGroupByOutputType>[]
          }
          count: {
            args: Prisma.CommitteeRequestCountArgs<ExtArgs>,
            result: $Utils.Optional<CommitteeRequestCountAggregateOutputType> | number
          }
        }
      }
      DropdownLists: {
        payload: Prisma.$DropdownListsPayload<ExtArgs>
        fields: Prisma.DropdownListsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DropdownListsFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$DropdownListsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DropdownListsFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$DropdownListsPayload>
          }
          findFirst: {
            args: Prisma.DropdownListsFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$DropdownListsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DropdownListsFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$DropdownListsPayload>
          }
          findMany: {
            args: Prisma.DropdownListsFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$DropdownListsPayload>[]
          }
          create: {
            args: Prisma.DropdownListsCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$DropdownListsPayload>
          }
          createMany: {
            args: Prisma.DropdownListsCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.DropdownListsCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$DropdownListsPayload>[]
          }
          delete: {
            args: Prisma.DropdownListsDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$DropdownListsPayload>
          }
          update: {
            args: Prisma.DropdownListsUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$DropdownListsPayload>
          }
          deleteMany: {
            args: Prisma.DropdownListsDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.DropdownListsUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.DropdownListsUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$DropdownListsPayload>
          }
          aggregate: {
            args: Prisma.DropdownListsAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateDropdownLists>
          }
          groupBy: {
            args: Prisma.DropdownListsGroupByArgs<ExtArgs>,
            result: $Utils.Optional<DropdownListsGroupByOutputType>[]
          }
          count: {
            args: Prisma.DropdownListsCountArgs<ExtArgs>,
            result: $Utils.Optional<DropdownListsCountAggregateOutputType> | number
          }
        }
      }
      CommitteeUploadDiscrepancy: {
        payload: Prisma.$CommitteeUploadDiscrepancyPayload<ExtArgs>
        fields: Prisma.CommitteeUploadDiscrepancyFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CommitteeUploadDiscrepancyFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeUploadDiscrepancyPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CommitteeUploadDiscrepancyFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeUploadDiscrepancyPayload>
          }
          findFirst: {
            args: Prisma.CommitteeUploadDiscrepancyFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeUploadDiscrepancyPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CommitteeUploadDiscrepancyFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeUploadDiscrepancyPayload>
          }
          findMany: {
            args: Prisma.CommitteeUploadDiscrepancyFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeUploadDiscrepancyPayload>[]
          }
          create: {
            args: Prisma.CommitteeUploadDiscrepancyCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeUploadDiscrepancyPayload>
          }
          createMany: {
            args: Prisma.CommitteeUploadDiscrepancyCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CommitteeUploadDiscrepancyCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeUploadDiscrepancyPayload>[]
          }
          delete: {
            args: Prisma.CommitteeUploadDiscrepancyDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeUploadDiscrepancyPayload>
          }
          update: {
            args: Prisma.CommitteeUploadDiscrepancyUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeUploadDiscrepancyPayload>
          }
          deleteMany: {
            args: Prisma.CommitteeUploadDiscrepancyDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.CommitteeUploadDiscrepancyUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.CommitteeUploadDiscrepancyUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CommitteeUploadDiscrepancyPayload>
          }
          aggregate: {
            args: Prisma.CommitteeUploadDiscrepancyAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateCommitteeUploadDiscrepancy>
          }
          groupBy: {
            args: Prisma.CommitteeUploadDiscrepancyGroupByArgs<ExtArgs>,
            result: $Utils.Optional<CommitteeUploadDiscrepancyGroupByOutputType>[]
          }
          count: {
            args: Prisma.CommitteeUploadDiscrepancyCountArgs<ExtArgs>,
            result: $Utils.Optional<CommitteeUploadDiscrepancyCountAggregateOutputType> | number
          }
        }
      }
      ElectionDate: {
        payload: Prisma.$ElectionDatePayload<ExtArgs>
        fields: Prisma.ElectionDateFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ElectionDateFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ElectionDatePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ElectionDateFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ElectionDatePayload>
          }
          findFirst: {
            args: Prisma.ElectionDateFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ElectionDatePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ElectionDateFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ElectionDatePayload>
          }
          findMany: {
            args: Prisma.ElectionDateFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ElectionDatePayload>[]
          }
          create: {
            args: Prisma.ElectionDateCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ElectionDatePayload>
          }
          createMany: {
            args: Prisma.ElectionDateCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ElectionDateCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ElectionDatePayload>[]
          }
          delete: {
            args: Prisma.ElectionDateDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ElectionDatePayload>
          }
          update: {
            args: Prisma.ElectionDateUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ElectionDatePayload>
          }
          deleteMany: {
            args: Prisma.ElectionDateDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.ElectionDateUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.ElectionDateUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ElectionDatePayload>
          }
          aggregate: {
            args: Prisma.ElectionDateAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateElectionDate>
          }
          groupBy: {
            args: Prisma.ElectionDateGroupByArgs<ExtArgs>,
            result: $Utils.Optional<ElectionDateGroupByOutputType>[]
          }
          count: {
            args: Prisma.ElectionDateCountArgs<ExtArgs>,
            result: $Utils.Optional<ElectionDateCountAggregateOutputType> | number
          }
        }
      }
      OfficeName: {
        payload: Prisma.$OfficeNamePayload<ExtArgs>
        fields: Prisma.OfficeNameFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OfficeNameFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OfficeNamePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OfficeNameFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OfficeNamePayload>
          }
          findFirst: {
            args: Prisma.OfficeNameFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OfficeNamePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OfficeNameFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OfficeNamePayload>
          }
          findMany: {
            args: Prisma.OfficeNameFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OfficeNamePayload>[]
          }
          create: {
            args: Prisma.OfficeNameCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OfficeNamePayload>
          }
          createMany: {
            args: Prisma.OfficeNameCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.OfficeNameCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OfficeNamePayload>[]
          }
          delete: {
            args: Prisma.OfficeNameDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OfficeNamePayload>
          }
          update: {
            args: Prisma.OfficeNameUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OfficeNamePayload>
          }
          deleteMany: {
            args: Prisma.OfficeNameDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.OfficeNameUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.OfficeNameUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OfficeNamePayload>
          }
          aggregate: {
            args: Prisma.OfficeNameAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateOfficeName>
          }
          groupBy: {
            args: Prisma.OfficeNameGroupByArgs<ExtArgs>,
            result: $Utils.Optional<OfficeNameGroupByOutputType>[]
          }
          count: {
            args: Prisma.OfficeNameCountArgs<ExtArgs>,
            result: $Utils.Optional<OfficeNameCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<'define', Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    accounts: number
    sessions: number
    Authenticator: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    accounts?: boolean | UserCountOutputTypeCountAccountsArgs
    sessions?: boolean | UserCountOutputTypeCountSessionsArgs
    Authenticator?: boolean | UserCountOutputTypeCountAuthenticatorArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAccountsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AccountWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAuthenticatorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuthenticatorWhereInput
  }


  /**
   * Count Type VoterRecordCountOutputType
   */

  export type VoterRecordCountOutputType = {
    votingRecords: number
    addToCommitteeRequest: number
    removeFromCommitteeRequest: number
  }

  export type VoterRecordCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    votingRecords?: boolean | VoterRecordCountOutputTypeCountVotingRecordsArgs
    addToCommitteeRequest?: boolean | VoterRecordCountOutputTypeCountAddToCommitteeRequestArgs
    removeFromCommitteeRequest?: boolean | VoterRecordCountOutputTypeCountRemoveFromCommitteeRequestArgs
  }

  // Custom InputTypes
  /**
   * VoterRecordCountOutputType without action
   */
  export type VoterRecordCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecordCountOutputType
     */
    select?: VoterRecordCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * VoterRecordCountOutputType without action
   */
  export type VoterRecordCountOutputTypeCountVotingRecordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VotingHistoryRecordWhereInput
  }

  /**
   * VoterRecordCountOutputType without action
   */
  export type VoterRecordCountOutputTypeCountAddToCommitteeRequestArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CommitteeRequestWhereInput
  }

  /**
   * VoterRecordCountOutputType without action
   */
  export type VoterRecordCountOutputTypeCountRemoveFromCommitteeRequestArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CommitteeRequestWhereInput
  }


  /**
   * Count Type CommitteeListCountOutputType
   */

  export type CommitteeListCountOutputType = {
    committeeMemberList: number
    CommitteeRequest: number
    CommitteeDiscrepancyRecords: number
  }

  export type CommitteeListCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    committeeMemberList?: boolean | CommitteeListCountOutputTypeCountCommitteeMemberListArgs
    CommitteeRequest?: boolean | CommitteeListCountOutputTypeCountCommitteeRequestArgs
    CommitteeDiscrepancyRecords?: boolean | CommitteeListCountOutputTypeCountCommitteeDiscrepancyRecordsArgs
  }

  // Custom InputTypes
  /**
   * CommitteeListCountOutputType without action
   */
  export type CommitteeListCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeListCountOutputType
     */
    select?: CommitteeListCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CommitteeListCountOutputType without action
   */
  export type CommitteeListCountOutputTypeCountCommitteeMemberListArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VoterRecordWhereInput
  }

  /**
   * CommitteeListCountOutputType without action
   */
  export type CommitteeListCountOutputTypeCountCommitteeRequestArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CommitteeRequestWhereInput
  }

  /**
   * CommitteeListCountOutputType without action
   */
  export type CommitteeListCountOutputTypeCountCommitteeDiscrepancyRecordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CommitteeUploadDiscrepancyWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    emailVerified: Date | null
    image: string | null
    privilegeLevel: $Enums.PrivilegeLevel | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    emailVerified: Date | null
    image: string | null
    privilegeLevel: $Enums.PrivilegeLevel | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    name: number
    email: number
    emailVerified: number
    image: number
    privilegeLevel: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    name?: true
    email?: true
    emailVerified?: true
    image?: true
    privilegeLevel?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    name?: true
    email?: true
    emailVerified?: true
    image?: true
    privilegeLevel?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    name?: true
    email?: true
    emailVerified?: true
    image?: true
    privilegeLevel?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    name: string | null
    email: string
    emailVerified: Date | null
    image: string | null
    privilegeLevel: $Enums.PrivilegeLevel
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    emailVerified?: boolean
    image?: boolean
    privilegeLevel?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    accounts?: boolean | User$accountsArgs<ExtArgs>
    sessions?: boolean | User$sessionsArgs<ExtArgs>
    Authenticator?: boolean | User$AuthenticatorArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    emailVerified?: boolean
    image?: boolean
    privilegeLevel?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    name?: boolean
    email?: boolean
    emailVerified?: boolean
    image?: boolean
    privilegeLevel?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    accounts?: boolean | User$accountsArgs<ExtArgs>
    sessions?: boolean | User$sessionsArgs<ExtArgs>
    Authenticator?: boolean | User$AuthenticatorArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      accounts: Prisma.$AccountPayload<ExtArgs>[]
      sessions: Prisma.$SessionPayload<ExtArgs>[]
      Authenticator: Prisma.$AuthenticatorPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string | null
      email: string
      emailVerified: Date | null
      image: string | null
      privilegeLevel: $Enums.PrivilegeLevel
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends UserFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends UserFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends UserFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
    **/
    create<T extends UserCreateArgs<ExtArgs>>(
      args: SelectSubset<T, UserCreateArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends UserCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends UserCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
    **/
    delete<T extends UserDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, UserDeleteArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends UserUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, UserUpdateArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends UserDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends UserUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
    **/
    upsert<T extends UserUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, UserUpsertArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    accounts<T extends User$accountsArgs<ExtArgs> = {}>(args?: Subset<T, User$accountsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, 'findMany'> | Null>;

    sessions<T extends User$sessionsArgs<ExtArgs> = {}>(args?: Subset<T, User$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, 'findMany'> | Null>;

    Authenticator<T extends User$AuthenticatorArgs<ExtArgs> = {}>(args?: Subset<T, User$AuthenticatorArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuthenticatorPayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the User model
   */ 
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly name: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly emailVerified: FieldRef<"User", 'DateTime'>
    readonly image: FieldRef<"User", 'String'>
    readonly privilegeLevel: FieldRef<"User", 'PrivilegeLevel'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
  }

  /**
   * User.accounts
   */
  export type User$accountsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    where?: AccountWhereInput
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    cursor?: AccountWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * User.sessions
   */
  export type User$sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    cursor?: SessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * User.Authenticator
   */
  export type User$AuthenticatorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Authenticator
     */
    select?: AuthenticatorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuthenticatorInclude<ExtArgs> | null
    where?: AuthenticatorWhereInput
    orderBy?: AuthenticatorOrderByWithRelationInput | AuthenticatorOrderByWithRelationInput[]
    cursor?: AuthenticatorWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AuthenticatorScalarFieldEnum | AuthenticatorScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Account
   */

  export type AggregateAccount = {
    _count: AccountCountAggregateOutputType | null
    _avg: AccountAvgAggregateOutputType | null
    _sum: AccountSumAggregateOutputType | null
    _min: AccountMinAggregateOutputType | null
    _max: AccountMaxAggregateOutputType | null
  }

  export type AccountAvgAggregateOutputType = {
    expires_at: number | null
  }

  export type AccountSumAggregateOutputType = {
    expires_at: number | null
  }

  export type AccountMinAggregateOutputType = {
    userId: string | null
    type: string | null
    provider: string | null
    providerAccountId: string | null
    refresh_token: string | null
    access_token: string | null
    expires_at: number | null
    token_type: string | null
    scope: string | null
    id_token: string | null
    session_state: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AccountMaxAggregateOutputType = {
    userId: string | null
    type: string | null
    provider: string | null
    providerAccountId: string | null
    refresh_token: string | null
    access_token: string | null
    expires_at: number | null
    token_type: string | null
    scope: string | null
    id_token: string | null
    session_state: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AccountCountAggregateOutputType = {
    userId: number
    type: number
    provider: number
    providerAccountId: number
    refresh_token: number
    access_token: number
    expires_at: number
    token_type: number
    scope: number
    id_token: number
    session_state: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AccountAvgAggregateInputType = {
    expires_at?: true
  }

  export type AccountSumAggregateInputType = {
    expires_at?: true
  }

  export type AccountMinAggregateInputType = {
    userId?: true
    type?: true
    provider?: true
    providerAccountId?: true
    refresh_token?: true
    access_token?: true
    expires_at?: true
    token_type?: true
    scope?: true
    id_token?: true
    session_state?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AccountMaxAggregateInputType = {
    userId?: true
    type?: true
    provider?: true
    providerAccountId?: true
    refresh_token?: true
    access_token?: true
    expires_at?: true
    token_type?: true
    scope?: true
    id_token?: true
    session_state?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AccountCountAggregateInputType = {
    userId?: true
    type?: true
    provider?: true
    providerAccountId?: true
    refresh_token?: true
    access_token?: true
    expires_at?: true
    token_type?: true
    scope?: true
    id_token?: true
    session_state?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AccountAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Account to aggregate.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Accounts
    **/
    _count?: true | AccountCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AccountAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AccountSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AccountMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AccountMaxAggregateInputType
  }

  export type GetAccountAggregateType<T extends AccountAggregateArgs> = {
        [P in keyof T & keyof AggregateAccount]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAccount[P]>
      : GetScalarType<T[P], AggregateAccount[P]>
  }




  export type AccountGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AccountWhereInput
    orderBy?: AccountOrderByWithAggregationInput | AccountOrderByWithAggregationInput[]
    by: AccountScalarFieldEnum[] | AccountScalarFieldEnum
    having?: AccountScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AccountCountAggregateInputType | true
    _avg?: AccountAvgAggregateInputType
    _sum?: AccountSumAggregateInputType
    _min?: AccountMinAggregateInputType
    _max?: AccountMaxAggregateInputType
  }

  export type AccountGroupByOutputType = {
    userId: string
    type: string
    provider: string
    providerAccountId: string
    refresh_token: string | null
    access_token: string | null
    expires_at: number | null
    token_type: string | null
    scope: string | null
    id_token: string | null
    session_state: string | null
    createdAt: Date
    updatedAt: Date
    _count: AccountCountAggregateOutputType | null
    _avg: AccountAvgAggregateOutputType | null
    _sum: AccountSumAggregateOutputType | null
    _min: AccountMinAggregateOutputType | null
    _max: AccountMaxAggregateOutputType | null
  }

  type GetAccountGroupByPayload<T extends AccountGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AccountGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AccountGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AccountGroupByOutputType[P]>
            : GetScalarType<T[P], AccountGroupByOutputType[P]>
        }
      >
    >


  export type AccountSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userId?: boolean
    type?: boolean
    provider?: boolean
    providerAccountId?: boolean
    refresh_token?: boolean
    access_token?: boolean
    expires_at?: boolean
    token_type?: boolean
    scope?: boolean
    id_token?: boolean
    session_state?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["account"]>

  export type AccountSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userId?: boolean
    type?: boolean
    provider?: boolean
    providerAccountId?: boolean
    refresh_token?: boolean
    access_token?: boolean
    expires_at?: boolean
    token_type?: boolean
    scope?: boolean
    id_token?: boolean
    session_state?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["account"]>

  export type AccountSelectScalar = {
    userId?: boolean
    type?: boolean
    provider?: boolean
    providerAccountId?: boolean
    refresh_token?: boolean
    access_token?: boolean
    expires_at?: boolean
    token_type?: boolean
    scope?: boolean
    id_token?: boolean
    session_state?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AccountInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type AccountIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $AccountPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Account"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      userId: string
      type: string
      provider: string
      providerAccountId: string
      refresh_token: string | null
      access_token: string | null
      expires_at: number | null
      token_type: string | null
      scope: string | null
      id_token: string | null
      session_state: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["account"]>
    composites: {}
  }

  type AccountGetPayload<S extends boolean | null | undefined | AccountDefaultArgs> = $Result.GetResult<Prisma.$AccountPayload, S>

  type AccountCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<AccountFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: AccountCountAggregateInputType | true
    }

  export interface AccountDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Account'], meta: { name: 'Account' } }
    /**
     * Find zero or one Account that matches the filter.
     * @param {AccountFindUniqueArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends AccountFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, AccountFindUniqueArgs<ExtArgs>>
    ): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one Account that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {AccountFindUniqueOrThrowArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends AccountFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, AccountFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first Account that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountFindFirstArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends AccountFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, AccountFindFirstArgs<ExtArgs>>
    ): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first Account that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountFindFirstOrThrowArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends AccountFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, AccountFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more Accounts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Accounts
     * const accounts = await prisma.account.findMany()
     * 
     * // Get first 10 Accounts
     * const accounts = await prisma.account.findMany({ take: 10 })
     * 
     * // Only select the `userId`
     * const accountWithUserIdOnly = await prisma.account.findMany({ select: { userId: true } })
     * 
    **/
    findMany<T extends AccountFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, AccountFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a Account.
     * @param {AccountCreateArgs} args - Arguments to create a Account.
     * @example
     * // Create one Account
     * const Account = await prisma.account.create({
     *   data: {
     *     // ... data to create a Account
     *   }
     * })
     * 
    **/
    create<T extends AccountCreateArgs<ExtArgs>>(
      args: SelectSubset<T, AccountCreateArgs<ExtArgs>>
    ): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many Accounts.
     * @param {AccountCreateManyArgs} args - Arguments to create many Accounts.
     * @example
     * // Create many Accounts
     * const account = await prisma.account.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends AccountCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, AccountCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Accounts and returns the data saved in the database.
     * @param {AccountCreateManyAndReturnArgs} args - Arguments to create many Accounts.
     * @example
     * // Create many Accounts
     * const account = await prisma.account.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Accounts and only return the `userId`
     * const accountWithUserIdOnly = await prisma.account.createManyAndReturn({ 
     *   select: { userId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends AccountCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, AccountCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a Account.
     * @param {AccountDeleteArgs} args - Arguments to delete one Account.
     * @example
     * // Delete one Account
     * const Account = await prisma.account.delete({
     *   where: {
     *     // ... filter to delete one Account
     *   }
     * })
     * 
    **/
    delete<T extends AccountDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, AccountDeleteArgs<ExtArgs>>
    ): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one Account.
     * @param {AccountUpdateArgs} args - Arguments to update one Account.
     * @example
     * // Update one Account
     * const account = await prisma.account.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends AccountUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, AccountUpdateArgs<ExtArgs>>
    ): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more Accounts.
     * @param {AccountDeleteManyArgs} args - Arguments to filter Accounts to delete.
     * @example
     * // Delete a few Accounts
     * const { count } = await prisma.account.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends AccountDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, AccountDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Accounts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Accounts
     * const account = await prisma.account.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends AccountUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, AccountUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Account.
     * @param {AccountUpsertArgs} args - Arguments to update or create a Account.
     * @example
     * // Update or create a Account
     * const account = await prisma.account.upsert({
     *   create: {
     *     // ... data to create a Account
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Account we want to update
     *   }
     * })
    **/
    upsert<T extends AccountUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, AccountUpsertArgs<ExtArgs>>
    ): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of Accounts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountCountArgs} args - Arguments to filter Accounts to count.
     * @example
     * // Count the number of Accounts
     * const count = await prisma.account.count({
     *   where: {
     *     // ... the filter for the Accounts we want to count
     *   }
     * })
    **/
    count<T extends AccountCountArgs>(
      args?: Subset<T, AccountCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AccountCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Account.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AccountAggregateArgs>(args: Subset<T, AccountAggregateArgs>): Prisma.PrismaPromise<GetAccountAggregateType<T>>

    /**
     * Group by Account.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AccountGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AccountGroupByArgs['orderBy'] }
        : { orderBy?: AccountGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AccountGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAccountGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Account model
   */
  readonly fields: AccountFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Account.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AccountClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the Account model
   */ 
  interface AccountFieldRefs {
    readonly userId: FieldRef<"Account", 'String'>
    readonly type: FieldRef<"Account", 'String'>
    readonly provider: FieldRef<"Account", 'String'>
    readonly providerAccountId: FieldRef<"Account", 'String'>
    readonly refresh_token: FieldRef<"Account", 'String'>
    readonly access_token: FieldRef<"Account", 'String'>
    readonly expires_at: FieldRef<"Account", 'Int'>
    readonly token_type: FieldRef<"Account", 'String'>
    readonly scope: FieldRef<"Account", 'String'>
    readonly id_token: FieldRef<"Account", 'String'>
    readonly session_state: FieldRef<"Account", 'String'>
    readonly createdAt: FieldRef<"Account", 'DateTime'>
    readonly updatedAt: FieldRef<"Account", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Account findUnique
   */
  export type AccountFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account findUniqueOrThrow
   */
  export type AccountFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account findFirst
   */
  export type AccountFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Accounts.
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Accounts.
     */
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * Account findFirstOrThrow
   */
  export type AccountFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Accounts.
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Accounts.
     */
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * Account findMany
   */
  export type AccountFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Accounts to fetch.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Accounts.
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * Account create
   */
  export type AccountCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * The data needed to create a Account.
     */
    data: XOR<AccountCreateInput, AccountUncheckedCreateInput>
  }

  /**
   * Account createMany
   */
  export type AccountCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Accounts.
     */
    data: AccountCreateManyInput | AccountCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Account createManyAndReturn
   */
  export type AccountCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Accounts.
     */
    data: AccountCreateManyInput | AccountCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Account update
   */
  export type AccountUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * The data needed to update a Account.
     */
    data: XOR<AccountUpdateInput, AccountUncheckedUpdateInput>
    /**
     * Choose, which Account to update.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account updateMany
   */
  export type AccountUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Accounts.
     */
    data: XOR<AccountUpdateManyMutationInput, AccountUncheckedUpdateManyInput>
    /**
     * Filter which Accounts to update
     */
    where?: AccountWhereInput
  }

  /**
   * Account upsert
   */
  export type AccountUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * The filter to search for the Account to update in case it exists.
     */
    where: AccountWhereUniqueInput
    /**
     * In case the Account found by the `where` argument doesn't exist, create a new Account with this data.
     */
    create: XOR<AccountCreateInput, AccountUncheckedCreateInput>
    /**
     * In case the Account was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AccountUpdateInput, AccountUncheckedUpdateInput>
  }

  /**
   * Account delete
   */
  export type AccountDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter which Account to delete.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account deleteMany
   */
  export type AccountDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Accounts to delete
     */
    where?: AccountWhereInput
  }

  /**
   * Account without action
   */
  export type AccountDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
  }


  /**
   * Model Session
   */

  export type AggregateSession = {
    _count: SessionCountAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  export type SessionMinAggregateOutputType = {
    sessionToken: string | null
    userId: string | null
    expires: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SessionMaxAggregateOutputType = {
    sessionToken: string | null
    userId: string | null
    expires: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SessionCountAggregateOutputType = {
    sessionToken: number
    userId: number
    expires: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SessionMinAggregateInputType = {
    sessionToken?: true
    userId?: true
    expires?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SessionMaxAggregateInputType = {
    sessionToken?: true
    userId?: true
    expires?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SessionCountAggregateInputType = {
    sessionToken?: true
    userId?: true
    expires?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Session to aggregate.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Sessions
    **/
    _count?: true | SessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SessionMaxAggregateInputType
  }

  export type GetSessionAggregateType<T extends SessionAggregateArgs> = {
        [P in keyof T & keyof AggregateSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSession[P]>
      : GetScalarType<T[P], AggregateSession[P]>
  }




  export type SessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithAggregationInput | SessionOrderByWithAggregationInput[]
    by: SessionScalarFieldEnum[] | SessionScalarFieldEnum
    having?: SessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SessionCountAggregateInputType | true
    _min?: SessionMinAggregateInputType
    _max?: SessionMaxAggregateInputType
  }

  export type SessionGroupByOutputType = {
    sessionToken: string
    userId: string
    expires: Date
    createdAt: Date
    updatedAt: Date
    _count: SessionCountAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  type GetSessionGroupByPayload<T extends SessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SessionGroupByOutputType[P]>
            : GetScalarType<T[P], SessionGroupByOutputType[P]>
        }
      >
    >


  export type SessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    sessionToken?: boolean
    userId?: boolean
    expires?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    sessionToken?: boolean
    userId?: boolean
    expires?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectScalar = {
    sessionToken?: boolean
    userId?: boolean
    expires?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type SessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type SessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $SessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Session"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      sessionToken: string
      userId: string
      expires: Date
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["session"]>
    composites: {}
  }

  type SessionGetPayload<S extends boolean | null | undefined | SessionDefaultArgs> = $Result.GetResult<Prisma.$SessionPayload, S>

  type SessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<SessionFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: SessionCountAggregateInputType | true
    }

  export interface SessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Session'], meta: { name: 'Session' } }
    /**
     * Find zero or one Session that matches the filter.
     * @param {SessionFindUniqueArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends SessionFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, SessionFindUniqueArgs<ExtArgs>>
    ): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one Session that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {SessionFindUniqueOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends SessionFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, SessionFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first Session that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends SessionFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, SessionFindFirstArgs<ExtArgs>>
    ): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first Session that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends SessionFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, SessionFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more Sessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Sessions
     * const sessions = await prisma.session.findMany()
     * 
     * // Get first 10 Sessions
     * const sessions = await prisma.session.findMany({ take: 10 })
     * 
     * // Only select the `sessionToken`
     * const sessionWithSessionTokenOnly = await prisma.session.findMany({ select: { sessionToken: true } })
     * 
    **/
    findMany<T extends SessionFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, SessionFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a Session.
     * @param {SessionCreateArgs} args - Arguments to create a Session.
     * @example
     * // Create one Session
     * const Session = await prisma.session.create({
     *   data: {
     *     // ... data to create a Session
     *   }
     * })
     * 
    **/
    create<T extends SessionCreateArgs<ExtArgs>>(
      args: SelectSubset<T, SessionCreateArgs<ExtArgs>>
    ): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many Sessions.
     * @param {SessionCreateManyArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends SessionCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, SessionCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Sessions and returns the data saved in the database.
     * @param {SessionCreateManyAndReturnArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Sessions and only return the `sessionToken`
     * const sessionWithSessionTokenOnly = await prisma.session.createManyAndReturn({ 
     *   select: { sessionToken: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends SessionCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, SessionCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a Session.
     * @param {SessionDeleteArgs} args - Arguments to delete one Session.
     * @example
     * // Delete one Session
     * const Session = await prisma.session.delete({
     *   where: {
     *     // ... filter to delete one Session
     *   }
     * })
     * 
    **/
    delete<T extends SessionDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, SessionDeleteArgs<ExtArgs>>
    ): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one Session.
     * @param {SessionUpdateArgs} args - Arguments to update one Session.
     * @example
     * // Update one Session
     * const session = await prisma.session.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends SessionUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, SessionUpdateArgs<ExtArgs>>
    ): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more Sessions.
     * @param {SessionDeleteManyArgs} args - Arguments to filter Sessions to delete.
     * @example
     * // Delete a few Sessions
     * const { count } = await prisma.session.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends SessionDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, SessionDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Sessions
     * const session = await prisma.session.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends SessionUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, SessionUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Session.
     * @param {SessionUpsertArgs} args - Arguments to update or create a Session.
     * @example
     * // Update or create a Session
     * const session = await prisma.session.upsert({
     *   create: {
     *     // ... data to create a Session
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Session we want to update
     *   }
     * })
    **/
    upsert<T extends SessionUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, SessionUpsertArgs<ExtArgs>>
    ): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionCountArgs} args - Arguments to filter Sessions to count.
     * @example
     * // Count the number of Sessions
     * const count = await prisma.session.count({
     *   where: {
     *     // ... the filter for the Sessions we want to count
     *   }
     * })
    **/
    count<T extends SessionCountArgs>(
      args?: Subset<T, SessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SessionAggregateArgs>(args: Subset<T, SessionAggregateArgs>): Prisma.PrismaPromise<GetSessionAggregateType<T>>

    /**
     * Group by Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SessionGroupByArgs['orderBy'] }
        : { orderBy?: SessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Session model
   */
  readonly fields: SessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Session.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the Session model
   */ 
  interface SessionFieldRefs {
    readonly sessionToken: FieldRef<"Session", 'String'>
    readonly userId: FieldRef<"Session", 'String'>
    readonly expires: FieldRef<"Session", 'DateTime'>
    readonly createdAt: FieldRef<"Session", 'DateTime'>
    readonly updatedAt: FieldRef<"Session", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Session findUnique
   */
  export type SessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findUniqueOrThrow
   */
  export type SessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findFirst
   */
  export type SessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findFirstOrThrow
   */
  export type SessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findMany
   */
  export type SessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Sessions to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session create
   */
  export type SessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to create a Session.
     */
    data: XOR<SessionCreateInput, SessionUncheckedCreateInput>
  }

  /**
   * Session createMany
   */
  export type SessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Session createManyAndReturn
   */
  export type SessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Session update
   */
  export type SessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to update a Session.
     */
    data: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
    /**
     * Choose, which Session to update.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session updateMany
   */
  export type SessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Sessions.
     */
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyInput>
    /**
     * Filter which Sessions to update
     */
    where?: SessionWhereInput
  }

  /**
   * Session upsert
   */
  export type SessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The filter to search for the Session to update in case it exists.
     */
    where: SessionWhereUniqueInput
    /**
     * In case the Session found by the `where` argument doesn't exist, create a new Session with this data.
     */
    create: XOR<SessionCreateInput, SessionUncheckedCreateInput>
    /**
     * In case the Session was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
  }

  /**
   * Session delete
   */
  export type SessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter which Session to delete.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session deleteMany
   */
  export type SessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Sessions to delete
     */
    where?: SessionWhereInput
  }

  /**
   * Session without action
   */
  export type SessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
  }


  /**
   * Model PrivilegedUser
   */

  export type AggregatePrivilegedUser = {
    _count: PrivilegedUserCountAggregateOutputType | null
    _avg: PrivilegedUserAvgAggregateOutputType | null
    _sum: PrivilegedUserSumAggregateOutputType | null
    _min: PrivilegedUserMinAggregateOutputType | null
    _max: PrivilegedUserMaxAggregateOutputType | null
  }

  export type PrivilegedUserAvgAggregateOutputType = {
    id: number | null
  }

  export type PrivilegedUserSumAggregateOutputType = {
    id: number | null
  }

  export type PrivilegedUserMinAggregateOutputType = {
    id: number | null
    email: string | null
    privilegeLevel: $Enums.PrivilegeLevel | null
  }

  export type PrivilegedUserMaxAggregateOutputType = {
    id: number | null
    email: string | null
    privilegeLevel: $Enums.PrivilegeLevel | null
  }

  export type PrivilegedUserCountAggregateOutputType = {
    id: number
    email: number
    privilegeLevel: number
    _all: number
  }


  export type PrivilegedUserAvgAggregateInputType = {
    id?: true
  }

  export type PrivilegedUserSumAggregateInputType = {
    id?: true
  }

  export type PrivilegedUserMinAggregateInputType = {
    id?: true
    email?: true
    privilegeLevel?: true
  }

  export type PrivilegedUserMaxAggregateInputType = {
    id?: true
    email?: true
    privilegeLevel?: true
  }

  export type PrivilegedUserCountAggregateInputType = {
    id?: true
    email?: true
    privilegeLevel?: true
    _all?: true
  }

  export type PrivilegedUserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PrivilegedUser to aggregate.
     */
    where?: PrivilegedUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PrivilegedUsers to fetch.
     */
    orderBy?: PrivilegedUserOrderByWithRelationInput | PrivilegedUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PrivilegedUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PrivilegedUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PrivilegedUsers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PrivilegedUsers
    **/
    _count?: true | PrivilegedUserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PrivilegedUserAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PrivilegedUserSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PrivilegedUserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PrivilegedUserMaxAggregateInputType
  }

  export type GetPrivilegedUserAggregateType<T extends PrivilegedUserAggregateArgs> = {
        [P in keyof T & keyof AggregatePrivilegedUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePrivilegedUser[P]>
      : GetScalarType<T[P], AggregatePrivilegedUser[P]>
  }




  export type PrivilegedUserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PrivilegedUserWhereInput
    orderBy?: PrivilegedUserOrderByWithAggregationInput | PrivilegedUserOrderByWithAggregationInput[]
    by: PrivilegedUserScalarFieldEnum[] | PrivilegedUserScalarFieldEnum
    having?: PrivilegedUserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PrivilegedUserCountAggregateInputType | true
    _avg?: PrivilegedUserAvgAggregateInputType
    _sum?: PrivilegedUserSumAggregateInputType
    _min?: PrivilegedUserMinAggregateInputType
    _max?: PrivilegedUserMaxAggregateInputType
  }

  export type PrivilegedUserGroupByOutputType = {
    id: number
    email: string
    privilegeLevel: $Enums.PrivilegeLevel
    _count: PrivilegedUserCountAggregateOutputType | null
    _avg: PrivilegedUserAvgAggregateOutputType | null
    _sum: PrivilegedUserSumAggregateOutputType | null
    _min: PrivilegedUserMinAggregateOutputType | null
    _max: PrivilegedUserMaxAggregateOutputType | null
  }

  type GetPrivilegedUserGroupByPayload<T extends PrivilegedUserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PrivilegedUserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PrivilegedUserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PrivilegedUserGroupByOutputType[P]>
            : GetScalarType<T[P], PrivilegedUserGroupByOutputType[P]>
        }
      >
    >


  export type PrivilegedUserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    privilegeLevel?: boolean
  }, ExtArgs["result"]["privilegedUser"]>

  export type PrivilegedUserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    privilegeLevel?: boolean
  }, ExtArgs["result"]["privilegedUser"]>

  export type PrivilegedUserSelectScalar = {
    id?: boolean
    email?: boolean
    privilegeLevel?: boolean
  }


  export type $PrivilegedUserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PrivilegedUser"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      email: string
      privilegeLevel: $Enums.PrivilegeLevel
    }, ExtArgs["result"]["privilegedUser"]>
    composites: {}
  }

  type PrivilegedUserGetPayload<S extends boolean | null | undefined | PrivilegedUserDefaultArgs> = $Result.GetResult<Prisma.$PrivilegedUserPayload, S>

  type PrivilegedUserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<PrivilegedUserFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: PrivilegedUserCountAggregateInputType | true
    }

  export interface PrivilegedUserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PrivilegedUser'], meta: { name: 'PrivilegedUser' } }
    /**
     * Find zero or one PrivilegedUser that matches the filter.
     * @param {PrivilegedUserFindUniqueArgs} args - Arguments to find a PrivilegedUser
     * @example
     * // Get one PrivilegedUser
     * const privilegedUser = await prisma.privilegedUser.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends PrivilegedUserFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, PrivilegedUserFindUniqueArgs<ExtArgs>>
    ): Prisma__PrivilegedUserClient<$Result.GetResult<Prisma.$PrivilegedUserPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one PrivilegedUser that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {PrivilegedUserFindUniqueOrThrowArgs} args - Arguments to find a PrivilegedUser
     * @example
     * // Get one PrivilegedUser
     * const privilegedUser = await prisma.privilegedUser.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends PrivilegedUserFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, PrivilegedUserFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__PrivilegedUserClient<$Result.GetResult<Prisma.$PrivilegedUserPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first PrivilegedUser that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PrivilegedUserFindFirstArgs} args - Arguments to find a PrivilegedUser
     * @example
     * // Get one PrivilegedUser
     * const privilegedUser = await prisma.privilegedUser.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends PrivilegedUserFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, PrivilegedUserFindFirstArgs<ExtArgs>>
    ): Prisma__PrivilegedUserClient<$Result.GetResult<Prisma.$PrivilegedUserPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first PrivilegedUser that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PrivilegedUserFindFirstOrThrowArgs} args - Arguments to find a PrivilegedUser
     * @example
     * // Get one PrivilegedUser
     * const privilegedUser = await prisma.privilegedUser.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends PrivilegedUserFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, PrivilegedUserFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__PrivilegedUserClient<$Result.GetResult<Prisma.$PrivilegedUserPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more PrivilegedUsers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PrivilegedUserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PrivilegedUsers
     * const privilegedUsers = await prisma.privilegedUser.findMany()
     * 
     * // Get first 10 PrivilegedUsers
     * const privilegedUsers = await prisma.privilegedUser.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const privilegedUserWithIdOnly = await prisma.privilegedUser.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends PrivilegedUserFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, PrivilegedUserFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PrivilegedUserPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a PrivilegedUser.
     * @param {PrivilegedUserCreateArgs} args - Arguments to create a PrivilegedUser.
     * @example
     * // Create one PrivilegedUser
     * const PrivilegedUser = await prisma.privilegedUser.create({
     *   data: {
     *     // ... data to create a PrivilegedUser
     *   }
     * })
     * 
    **/
    create<T extends PrivilegedUserCreateArgs<ExtArgs>>(
      args: SelectSubset<T, PrivilegedUserCreateArgs<ExtArgs>>
    ): Prisma__PrivilegedUserClient<$Result.GetResult<Prisma.$PrivilegedUserPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many PrivilegedUsers.
     * @param {PrivilegedUserCreateManyArgs} args - Arguments to create many PrivilegedUsers.
     * @example
     * // Create many PrivilegedUsers
     * const privilegedUser = await prisma.privilegedUser.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends PrivilegedUserCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, PrivilegedUserCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PrivilegedUsers and returns the data saved in the database.
     * @param {PrivilegedUserCreateManyAndReturnArgs} args - Arguments to create many PrivilegedUsers.
     * @example
     * // Create many PrivilegedUsers
     * const privilegedUser = await prisma.privilegedUser.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PrivilegedUsers and only return the `id`
     * const privilegedUserWithIdOnly = await prisma.privilegedUser.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends PrivilegedUserCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, PrivilegedUserCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PrivilegedUserPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a PrivilegedUser.
     * @param {PrivilegedUserDeleteArgs} args - Arguments to delete one PrivilegedUser.
     * @example
     * // Delete one PrivilegedUser
     * const PrivilegedUser = await prisma.privilegedUser.delete({
     *   where: {
     *     // ... filter to delete one PrivilegedUser
     *   }
     * })
     * 
    **/
    delete<T extends PrivilegedUserDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, PrivilegedUserDeleteArgs<ExtArgs>>
    ): Prisma__PrivilegedUserClient<$Result.GetResult<Prisma.$PrivilegedUserPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one PrivilegedUser.
     * @param {PrivilegedUserUpdateArgs} args - Arguments to update one PrivilegedUser.
     * @example
     * // Update one PrivilegedUser
     * const privilegedUser = await prisma.privilegedUser.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends PrivilegedUserUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, PrivilegedUserUpdateArgs<ExtArgs>>
    ): Prisma__PrivilegedUserClient<$Result.GetResult<Prisma.$PrivilegedUserPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more PrivilegedUsers.
     * @param {PrivilegedUserDeleteManyArgs} args - Arguments to filter PrivilegedUsers to delete.
     * @example
     * // Delete a few PrivilegedUsers
     * const { count } = await prisma.privilegedUser.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends PrivilegedUserDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, PrivilegedUserDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PrivilegedUsers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PrivilegedUserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PrivilegedUsers
     * const privilegedUser = await prisma.privilegedUser.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends PrivilegedUserUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, PrivilegedUserUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one PrivilegedUser.
     * @param {PrivilegedUserUpsertArgs} args - Arguments to update or create a PrivilegedUser.
     * @example
     * // Update or create a PrivilegedUser
     * const privilegedUser = await prisma.privilegedUser.upsert({
     *   create: {
     *     // ... data to create a PrivilegedUser
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PrivilegedUser we want to update
     *   }
     * })
    **/
    upsert<T extends PrivilegedUserUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, PrivilegedUserUpsertArgs<ExtArgs>>
    ): Prisma__PrivilegedUserClient<$Result.GetResult<Prisma.$PrivilegedUserPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of PrivilegedUsers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PrivilegedUserCountArgs} args - Arguments to filter PrivilegedUsers to count.
     * @example
     * // Count the number of PrivilegedUsers
     * const count = await prisma.privilegedUser.count({
     *   where: {
     *     // ... the filter for the PrivilegedUsers we want to count
     *   }
     * })
    **/
    count<T extends PrivilegedUserCountArgs>(
      args?: Subset<T, PrivilegedUserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PrivilegedUserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PrivilegedUser.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PrivilegedUserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PrivilegedUserAggregateArgs>(args: Subset<T, PrivilegedUserAggregateArgs>): Prisma.PrismaPromise<GetPrivilegedUserAggregateType<T>>

    /**
     * Group by PrivilegedUser.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PrivilegedUserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PrivilegedUserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PrivilegedUserGroupByArgs['orderBy'] }
        : { orderBy?: PrivilegedUserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PrivilegedUserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPrivilegedUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PrivilegedUser model
   */
  readonly fields: PrivilegedUserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PrivilegedUser.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PrivilegedUserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';


    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the PrivilegedUser model
   */ 
  interface PrivilegedUserFieldRefs {
    readonly id: FieldRef<"PrivilegedUser", 'Int'>
    readonly email: FieldRef<"PrivilegedUser", 'String'>
    readonly privilegeLevel: FieldRef<"PrivilegedUser", 'PrivilegeLevel'>
  }
    

  // Custom InputTypes
  /**
   * PrivilegedUser findUnique
   */
  export type PrivilegedUserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PrivilegedUser
     */
    select?: PrivilegedUserSelect<ExtArgs> | null
    /**
     * Filter, which PrivilegedUser to fetch.
     */
    where: PrivilegedUserWhereUniqueInput
  }

  /**
   * PrivilegedUser findUniqueOrThrow
   */
  export type PrivilegedUserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PrivilegedUser
     */
    select?: PrivilegedUserSelect<ExtArgs> | null
    /**
     * Filter, which PrivilegedUser to fetch.
     */
    where: PrivilegedUserWhereUniqueInput
  }

  /**
   * PrivilegedUser findFirst
   */
  export type PrivilegedUserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PrivilegedUser
     */
    select?: PrivilegedUserSelect<ExtArgs> | null
    /**
     * Filter, which PrivilegedUser to fetch.
     */
    where?: PrivilegedUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PrivilegedUsers to fetch.
     */
    orderBy?: PrivilegedUserOrderByWithRelationInput | PrivilegedUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PrivilegedUsers.
     */
    cursor?: PrivilegedUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PrivilegedUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PrivilegedUsers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PrivilegedUsers.
     */
    distinct?: PrivilegedUserScalarFieldEnum | PrivilegedUserScalarFieldEnum[]
  }

  /**
   * PrivilegedUser findFirstOrThrow
   */
  export type PrivilegedUserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PrivilegedUser
     */
    select?: PrivilegedUserSelect<ExtArgs> | null
    /**
     * Filter, which PrivilegedUser to fetch.
     */
    where?: PrivilegedUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PrivilegedUsers to fetch.
     */
    orderBy?: PrivilegedUserOrderByWithRelationInput | PrivilegedUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PrivilegedUsers.
     */
    cursor?: PrivilegedUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PrivilegedUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PrivilegedUsers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PrivilegedUsers.
     */
    distinct?: PrivilegedUserScalarFieldEnum | PrivilegedUserScalarFieldEnum[]
  }

  /**
   * PrivilegedUser findMany
   */
  export type PrivilegedUserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PrivilegedUser
     */
    select?: PrivilegedUserSelect<ExtArgs> | null
    /**
     * Filter, which PrivilegedUsers to fetch.
     */
    where?: PrivilegedUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PrivilegedUsers to fetch.
     */
    orderBy?: PrivilegedUserOrderByWithRelationInput | PrivilegedUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PrivilegedUsers.
     */
    cursor?: PrivilegedUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PrivilegedUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PrivilegedUsers.
     */
    skip?: number
    distinct?: PrivilegedUserScalarFieldEnum | PrivilegedUserScalarFieldEnum[]
  }

  /**
   * PrivilegedUser create
   */
  export type PrivilegedUserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PrivilegedUser
     */
    select?: PrivilegedUserSelect<ExtArgs> | null
    /**
     * The data needed to create a PrivilegedUser.
     */
    data: XOR<PrivilegedUserCreateInput, PrivilegedUserUncheckedCreateInput>
  }

  /**
   * PrivilegedUser createMany
   */
  export type PrivilegedUserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PrivilegedUsers.
     */
    data: PrivilegedUserCreateManyInput | PrivilegedUserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PrivilegedUser createManyAndReturn
   */
  export type PrivilegedUserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PrivilegedUser
     */
    select?: PrivilegedUserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many PrivilegedUsers.
     */
    data: PrivilegedUserCreateManyInput | PrivilegedUserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PrivilegedUser update
   */
  export type PrivilegedUserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PrivilegedUser
     */
    select?: PrivilegedUserSelect<ExtArgs> | null
    /**
     * The data needed to update a PrivilegedUser.
     */
    data: XOR<PrivilegedUserUpdateInput, PrivilegedUserUncheckedUpdateInput>
    /**
     * Choose, which PrivilegedUser to update.
     */
    where: PrivilegedUserWhereUniqueInput
  }

  /**
   * PrivilegedUser updateMany
   */
  export type PrivilegedUserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PrivilegedUsers.
     */
    data: XOR<PrivilegedUserUpdateManyMutationInput, PrivilegedUserUncheckedUpdateManyInput>
    /**
     * Filter which PrivilegedUsers to update
     */
    where?: PrivilegedUserWhereInput
  }

  /**
   * PrivilegedUser upsert
   */
  export type PrivilegedUserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PrivilegedUser
     */
    select?: PrivilegedUserSelect<ExtArgs> | null
    /**
     * The filter to search for the PrivilegedUser to update in case it exists.
     */
    where: PrivilegedUserWhereUniqueInput
    /**
     * In case the PrivilegedUser found by the `where` argument doesn't exist, create a new PrivilegedUser with this data.
     */
    create: XOR<PrivilegedUserCreateInput, PrivilegedUserUncheckedCreateInput>
    /**
     * In case the PrivilegedUser was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PrivilegedUserUpdateInput, PrivilegedUserUncheckedUpdateInput>
  }

  /**
   * PrivilegedUser delete
   */
  export type PrivilegedUserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PrivilegedUser
     */
    select?: PrivilegedUserSelect<ExtArgs> | null
    /**
     * Filter which PrivilegedUser to delete.
     */
    where: PrivilegedUserWhereUniqueInput
  }

  /**
   * PrivilegedUser deleteMany
   */
  export type PrivilegedUserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PrivilegedUsers to delete
     */
    where?: PrivilegedUserWhereInput
  }

  /**
   * PrivilegedUser without action
   */
  export type PrivilegedUserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PrivilegedUser
     */
    select?: PrivilegedUserSelect<ExtArgs> | null
  }


  /**
   * Model VerificationToken
   */

  export type AggregateVerificationToken = {
    _count: VerificationTokenCountAggregateOutputType | null
    _min: VerificationTokenMinAggregateOutputType | null
    _max: VerificationTokenMaxAggregateOutputType | null
  }

  export type VerificationTokenMinAggregateOutputType = {
    identifier: string | null
    token: string | null
    expires: Date | null
  }

  export type VerificationTokenMaxAggregateOutputType = {
    identifier: string | null
    token: string | null
    expires: Date | null
  }

  export type VerificationTokenCountAggregateOutputType = {
    identifier: number
    token: number
    expires: number
    _all: number
  }


  export type VerificationTokenMinAggregateInputType = {
    identifier?: true
    token?: true
    expires?: true
  }

  export type VerificationTokenMaxAggregateInputType = {
    identifier?: true
    token?: true
    expires?: true
  }

  export type VerificationTokenCountAggregateInputType = {
    identifier?: true
    token?: true
    expires?: true
    _all?: true
  }

  export type VerificationTokenAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which VerificationToken to aggregate.
     */
    where?: VerificationTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VerificationTokens to fetch.
     */
    orderBy?: VerificationTokenOrderByWithRelationInput | VerificationTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: VerificationTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VerificationTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VerificationTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned VerificationTokens
    **/
    _count?: true | VerificationTokenCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: VerificationTokenMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: VerificationTokenMaxAggregateInputType
  }

  export type GetVerificationTokenAggregateType<T extends VerificationTokenAggregateArgs> = {
        [P in keyof T & keyof AggregateVerificationToken]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateVerificationToken[P]>
      : GetScalarType<T[P], AggregateVerificationToken[P]>
  }




  export type VerificationTokenGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VerificationTokenWhereInput
    orderBy?: VerificationTokenOrderByWithAggregationInput | VerificationTokenOrderByWithAggregationInput[]
    by: VerificationTokenScalarFieldEnum[] | VerificationTokenScalarFieldEnum
    having?: VerificationTokenScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: VerificationTokenCountAggregateInputType | true
    _min?: VerificationTokenMinAggregateInputType
    _max?: VerificationTokenMaxAggregateInputType
  }

  export type VerificationTokenGroupByOutputType = {
    identifier: string
    token: string
    expires: Date
    _count: VerificationTokenCountAggregateOutputType | null
    _min: VerificationTokenMinAggregateOutputType | null
    _max: VerificationTokenMaxAggregateOutputType | null
  }

  type GetVerificationTokenGroupByPayload<T extends VerificationTokenGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<VerificationTokenGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof VerificationTokenGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], VerificationTokenGroupByOutputType[P]>
            : GetScalarType<T[P], VerificationTokenGroupByOutputType[P]>
        }
      >
    >


  export type VerificationTokenSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    identifier?: boolean
    token?: boolean
    expires?: boolean
  }, ExtArgs["result"]["verificationToken"]>

  export type VerificationTokenSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    identifier?: boolean
    token?: boolean
    expires?: boolean
  }, ExtArgs["result"]["verificationToken"]>

  export type VerificationTokenSelectScalar = {
    identifier?: boolean
    token?: boolean
    expires?: boolean
  }


  export type $VerificationTokenPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "VerificationToken"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      identifier: string
      token: string
      expires: Date
    }, ExtArgs["result"]["verificationToken"]>
    composites: {}
  }

  type VerificationTokenGetPayload<S extends boolean | null | undefined | VerificationTokenDefaultArgs> = $Result.GetResult<Prisma.$VerificationTokenPayload, S>

  type VerificationTokenCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<VerificationTokenFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: VerificationTokenCountAggregateInputType | true
    }

  export interface VerificationTokenDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['VerificationToken'], meta: { name: 'VerificationToken' } }
    /**
     * Find zero or one VerificationToken that matches the filter.
     * @param {VerificationTokenFindUniqueArgs} args - Arguments to find a VerificationToken
     * @example
     * // Get one VerificationToken
     * const verificationToken = await prisma.verificationToken.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends VerificationTokenFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, VerificationTokenFindUniqueArgs<ExtArgs>>
    ): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one VerificationToken that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {VerificationTokenFindUniqueOrThrowArgs} args - Arguments to find a VerificationToken
     * @example
     * // Get one VerificationToken
     * const verificationToken = await prisma.verificationToken.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends VerificationTokenFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, VerificationTokenFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first VerificationToken that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationTokenFindFirstArgs} args - Arguments to find a VerificationToken
     * @example
     * // Get one VerificationToken
     * const verificationToken = await prisma.verificationToken.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends VerificationTokenFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, VerificationTokenFindFirstArgs<ExtArgs>>
    ): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first VerificationToken that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationTokenFindFirstOrThrowArgs} args - Arguments to find a VerificationToken
     * @example
     * // Get one VerificationToken
     * const verificationToken = await prisma.verificationToken.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends VerificationTokenFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, VerificationTokenFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more VerificationTokens that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationTokenFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all VerificationTokens
     * const verificationTokens = await prisma.verificationToken.findMany()
     * 
     * // Get first 10 VerificationTokens
     * const verificationTokens = await prisma.verificationToken.findMany({ take: 10 })
     * 
     * // Only select the `identifier`
     * const verificationTokenWithIdentifierOnly = await prisma.verificationToken.findMany({ select: { identifier: true } })
     * 
    **/
    findMany<T extends VerificationTokenFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, VerificationTokenFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a VerificationToken.
     * @param {VerificationTokenCreateArgs} args - Arguments to create a VerificationToken.
     * @example
     * // Create one VerificationToken
     * const VerificationToken = await prisma.verificationToken.create({
     *   data: {
     *     // ... data to create a VerificationToken
     *   }
     * })
     * 
    **/
    create<T extends VerificationTokenCreateArgs<ExtArgs>>(
      args: SelectSubset<T, VerificationTokenCreateArgs<ExtArgs>>
    ): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many VerificationTokens.
     * @param {VerificationTokenCreateManyArgs} args - Arguments to create many VerificationTokens.
     * @example
     * // Create many VerificationTokens
     * const verificationToken = await prisma.verificationToken.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends VerificationTokenCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, VerificationTokenCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many VerificationTokens and returns the data saved in the database.
     * @param {VerificationTokenCreateManyAndReturnArgs} args - Arguments to create many VerificationTokens.
     * @example
     * // Create many VerificationTokens
     * const verificationToken = await prisma.verificationToken.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many VerificationTokens and only return the `identifier`
     * const verificationTokenWithIdentifierOnly = await prisma.verificationToken.createManyAndReturn({ 
     *   select: { identifier: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends VerificationTokenCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, VerificationTokenCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a VerificationToken.
     * @param {VerificationTokenDeleteArgs} args - Arguments to delete one VerificationToken.
     * @example
     * // Delete one VerificationToken
     * const VerificationToken = await prisma.verificationToken.delete({
     *   where: {
     *     // ... filter to delete one VerificationToken
     *   }
     * })
     * 
    **/
    delete<T extends VerificationTokenDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, VerificationTokenDeleteArgs<ExtArgs>>
    ): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one VerificationToken.
     * @param {VerificationTokenUpdateArgs} args - Arguments to update one VerificationToken.
     * @example
     * // Update one VerificationToken
     * const verificationToken = await prisma.verificationToken.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends VerificationTokenUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, VerificationTokenUpdateArgs<ExtArgs>>
    ): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more VerificationTokens.
     * @param {VerificationTokenDeleteManyArgs} args - Arguments to filter VerificationTokens to delete.
     * @example
     * // Delete a few VerificationTokens
     * const { count } = await prisma.verificationToken.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends VerificationTokenDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, VerificationTokenDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more VerificationTokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationTokenUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many VerificationTokens
     * const verificationToken = await prisma.verificationToken.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends VerificationTokenUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, VerificationTokenUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one VerificationToken.
     * @param {VerificationTokenUpsertArgs} args - Arguments to update or create a VerificationToken.
     * @example
     * // Update or create a VerificationToken
     * const verificationToken = await prisma.verificationToken.upsert({
     *   create: {
     *     // ... data to create a VerificationToken
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the VerificationToken we want to update
     *   }
     * })
    **/
    upsert<T extends VerificationTokenUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, VerificationTokenUpsertArgs<ExtArgs>>
    ): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of VerificationTokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationTokenCountArgs} args - Arguments to filter VerificationTokens to count.
     * @example
     * // Count the number of VerificationTokens
     * const count = await prisma.verificationToken.count({
     *   where: {
     *     // ... the filter for the VerificationTokens we want to count
     *   }
     * })
    **/
    count<T extends VerificationTokenCountArgs>(
      args?: Subset<T, VerificationTokenCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], VerificationTokenCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a VerificationToken.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationTokenAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends VerificationTokenAggregateArgs>(args: Subset<T, VerificationTokenAggregateArgs>): Prisma.PrismaPromise<GetVerificationTokenAggregateType<T>>

    /**
     * Group by VerificationToken.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationTokenGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends VerificationTokenGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: VerificationTokenGroupByArgs['orderBy'] }
        : { orderBy?: VerificationTokenGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, VerificationTokenGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetVerificationTokenGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the VerificationToken model
   */
  readonly fields: VerificationTokenFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for VerificationToken.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__VerificationTokenClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';


    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the VerificationToken model
   */ 
  interface VerificationTokenFieldRefs {
    readonly identifier: FieldRef<"VerificationToken", 'String'>
    readonly token: FieldRef<"VerificationToken", 'String'>
    readonly expires: FieldRef<"VerificationToken", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * VerificationToken findUnique
   */
  export type VerificationTokenFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Filter, which VerificationToken to fetch.
     */
    where: VerificationTokenWhereUniqueInput
  }

  /**
   * VerificationToken findUniqueOrThrow
   */
  export type VerificationTokenFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Filter, which VerificationToken to fetch.
     */
    where: VerificationTokenWhereUniqueInput
  }

  /**
   * VerificationToken findFirst
   */
  export type VerificationTokenFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Filter, which VerificationToken to fetch.
     */
    where?: VerificationTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VerificationTokens to fetch.
     */
    orderBy?: VerificationTokenOrderByWithRelationInput | VerificationTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for VerificationTokens.
     */
    cursor?: VerificationTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VerificationTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VerificationTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of VerificationTokens.
     */
    distinct?: VerificationTokenScalarFieldEnum | VerificationTokenScalarFieldEnum[]
  }

  /**
   * VerificationToken findFirstOrThrow
   */
  export type VerificationTokenFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Filter, which VerificationToken to fetch.
     */
    where?: VerificationTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VerificationTokens to fetch.
     */
    orderBy?: VerificationTokenOrderByWithRelationInput | VerificationTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for VerificationTokens.
     */
    cursor?: VerificationTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VerificationTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VerificationTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of VerificationTokens.
     */
    distinct?: VerificationTokenScalarFieldEnum | VerificationTokenScalarFieldEnum[]
  }

  /**
   * VerificationToken findMany
   */
  export type VerificationTokenFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Filter, which VerificationTokens to fetch.
     */
    where?: VerificationTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VerificationTokens to fetch.
     */
    orderBy?: VerificationTokenOrderByWithRelationInput | VerificationTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing VerificationTokens.
     */
    cursor?: VerificationTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VerificationTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VerificationTokens.
     */
    skip?: number
    distinct?: VerificationTokenScalarFieldEnum | VerificationTokenScalarFieldEnum[]
  }

  /**
   * VerificationToken create
   */
  export type VerificationTokenCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * The data needed to create a VerificationToken.
     */
    data: XOR<VerificationTokenCreateInput, VerificationTokenUncheckedCreateInput>
  }

  /**
   * VerificationToken createMany
   */
  export type VerificationTokenCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many VerificationTokens.
     */
    data: VerificationTokenCreateManyInput | VerificationTokenCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * VerificationToken createManyAndReturn
   */
  export type VerificationTokenCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many VerificationTokens.
     */
    data: VerificationTokenCreateManyInput | VerificationTokenCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * VerificationToken update
   */
  export type VerificationTokenUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * The data needed to update a VerificationToken.
     */
    data: XOR<VerificationTokenUpdateInput, VerificationTokenUncheckedUpdateInput>
    /**
     * Choose, which VerificationToken to update.
     */
    where: VerificationTokenWhereUniqueInput
  }

  /**
   * VerificationToken updateMany
   */
  export type VerificationTokenUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update VerificationTokens.
     */
    data: XOR<VerificationTokenUpdateManyMutationInput, VerificationTokenUncheckedUpdateManyInput>
    /**
     * Filter which VerificationTokens to update
     */
    where?: VerificationTokenWhereInput
  }

  /**
   * VerificationToken upsert
   */
  export type VerificationTokenUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * The filter to search for the VerificationToken to update in case it exists.
     */
    where: VerificationTokenWhereUniqueInput
    /**
     * In case the VerificationToken found by the `where` argument doesn't exist, create a new VerificationToken with this data.
     */
    create: XOR<VerificationTokenCreateInput, VerificationTokenUncheckedCreateInput>
    /**
     * In case the VerificationToken was found with the provided `where` argument, update it with this data.
     */
    update: XOR<VerificationTokenUpdateInput, VerificationTokenUncheckedUpdateInput>
  }

  /**
   * VerificationToken delete
   */
  export type VerificationTokenDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Filter which VerificationToken to delete.
     */
    where: VerificationTokenWhereUniqueInput
  }

  /**
   * VerificationToken deleteMany
   */
  export type VerificationTokenDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which VerificationTokens to delete
     */
    where?: VerificationTokenWhereInput
  }

  /**
   * VerificationToken without action
   */
  export type VerificationTokenDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
  }


  /**
   * Model Authenticator
   */

  export type AggregateAuthenticator = {
    _count: AuthenticatorCountAggregateOutputType | null
    _avg: AuthenticatorAvgAggregateOutputType | null
    _sum: AuthenticatorSumAggregateOutputType | null
    _min: AuthenticatorMinAggregateOutputType | null
    _max: AuthenticatorMaxAggregateOutputType | null
  }

  export type AuthenticatorAvgAggregateOutputType = {
    counter: number | null
  }

  export type AuthenticatorSumAggregateOutputType = {
    counter: number | null
  }

  export type AuthenticatorMinAggregateOutputType = {
    credentialID: string | null
    userId: string | null
    providerAccountId: string | null
    credentialPublicKey: string | null
    counter: number | null
    credentialDeviceType: string | null
    credentialBackedUp: boolean | null
    transports: string | null
  }

  export type AuthenticatorMaxAggregateOutputType = {
    credentialID: string | null
    userId: string | null
    providerAccountId: string | null
    credentialPublicKey: string | null
    counter: number | null
    credentialDeviceType: string | null
    credentialBackedUp: boolean | null
    transports: string | null
  }

  export type AuthenticatorCountAggregateOutputType = {
    credentialID: number
    userId: number
    providerAccountId: number
    credentialPublicKey: number
    counter: number
    credentialDeviceType: number
    credentialBackedUp: number
    transports: number
    _all: number
  }


  export type AuthenticatorAvgAggregateInputType = {
    counter?: true
  }

  export type AuthenticatorSumAggregateInputType = {
    counter?: true
  }

  export type AuthenticatorMinAggregateInputType = {
    credentialID?: true
    userId?: true
    providerAccountId?: true
    credentialPublicKey?: true
    counter?: true
    credentialDeviceType?: true
    credentialBackedUp?: true
    transports?: true
  }

  export type AuthenticatorMaxAggregateInputType = {
    credentialID?: true
    userId?: true
    providerAccountId?: true
    credentialPublicKey?: true
    counter?: true
    credentialDeviceType?: true
    credentialBackedUp?: true
    transports?: true
  }

  export type AuthenticatorCountAggregateInputType = {
    credentialID?: true
    userId?: true
    providerAccountId?: true
    credentialPublicKey?: true
    counter?: true
    credentialDeviceType?: true
    credentialBackedUp?: true
    transports?: true
    _all?: true
  }

  export type AuthenticatorAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Authenticator to aggregate.
     */
    where?: AuthenticatorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Authenticators to fetch.
     */
    orderBy?: AuthenticatorOrderByWithRelationInput | AuthenticatorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuthenticatorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Authenticators from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Authenticators.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Authenticators
    **/
    _count?: true | AuthenticatorCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AuthenticatorAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AuthenticatorSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuthenticatorMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuthenticatorMaxAggregateInputType
  }

  export type GetAuthenticatorAggregateType<T extends AuthenticatorAggregateArgs> = {
        [P in keyof T & keyof AggregateAuthenticator]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAuthenticator[P]>
      : GetScalarType<T[P], AggregateAuthenticator[P]>
  }




  export type AuthenticatorGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuthenticatorWhereInput
    orderBy?: AuthenticatorOrderByWithAggregationInput | AuthenticatorOrderByWithAggregationInput[]
    by: AuthenticatorScalarFieldEnum[] | AuthenticatorScalarFieldEnum
    having?: AuthenticatorScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuthenticatorCountAggregateInputType | true
    _avg?: AuthenticatorAvgAggregateInputType
    _sum?: AuthenticatorSumAggregateInputType
    _min?: AuthenticatorMinAggregateInputType
    _max?: AuthenticatorMaxAggregateInputType
  }

  export type AuthenticatorGroupByOutputType = {
    credentialID: string
    userId: string
    providerAccountId: string
    credentialPublicKey: string
    counter: number
    credentialDeviceType: string
    credentialBackedUp: boolean
    transports: string | null
    _count: AuthenticatorCountAggregateOutputType | null
    _avg: AuthenticatorAvgAggregateOutputType | null
    _sum: AuthenticatorSumAggregateOutputType | null
    _min: AuthenticatorMinAggregateOutputType | null
    _max: AuthenticatorMaxAggregateOutputType | null
  }

  type GetAuthenticatorGroupByPayload<T extends AuthenticatorGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuthenticatorGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuthenticatorGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuthenticatorGroupByOutputType[P]>
            : GetScalarType<T[P], AuthenticatorGroupByOutputType[P]>
        }
      >
    >


  export type AuthenticatorSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    credentialID?: boolean
    userId?: boolean
    providerAccountId?: boolean
    credentialPublicKey?: boolean
    counter?: boolean
    credentialDeviceType?: boolean
    credentialBackedUp?: boolean
    transports?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["authenticator"]>

  export type AuthenticatorSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    credentialID?: boolean
    userId?: boolean
    providerAccountId?: boolean
    credentialPublicKey?: boolean
    counter?: boolean
    credentialDeviceType?: boolean
    credentialBackedUp?: boolean
    transports?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["authenticator"]>

  export type AuthenticatorSelectScalar = {
    credentialID?: boolean
    userId?: boolean
    providerAccountId?: boolean
    credentialPublicKey?: boolean
    counter?: boolean
    credentialDeviceType?: boolean
    credentialBackedUp?: boolean
    transports?: boolean
  }

  export type AuthenticatorInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type AuthenticatorIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $AuthenticatorPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Authenticator"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      credentialID: string
      userId: string
      providerAccountId: string
      credentialPublicKey: string
      counter: number
      credentialDeviceType: string
      credentialBackedUp: boolean
      transports: string | null
    }, ExtArgs["result"]["authenticator"]>
    composites: {}
  }

  type AuthenticatorGetPayload<S extends boolean | null | undefined | AuthenticatorDefaultArgs> = $Result.GetResult<Prisma.$AuthenticatorPayload, S>

  type AuthenticatorCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<AuthenticatorFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: AuthenticatorCountAggregateInputType | true
    }

  export interface AuthenticatorDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Authenticator'], meta: { name: 'Authenticator' } }
    /**
     * Find zero or one Authenticator that matches the filter.
     * @param {AuthenticatorFindUniqueArgs} args - Arguments to find a Authenticator
     * @example
     * // Get one Authenticator
     * const authenticator = await prisma.authenticator.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends AuthenticatorFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, AuthenticatorFindUniqueArgs<ExtArgs>>
    ): Prisma__AuthenticatorClient<$Result.GetResult<Prisma.$AuthenticatorPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one Authenticator that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {AuthenticatorFindUniqueOrThrowArgs} args - Arguments to find a Authenticator
     * @example
     * // Get one Authenticator
     * const authenticator = await prisma.authenticator.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends AuthenticatorFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, AuthenticatorFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__AuthenticatorClient<$Result.GetResult<Prisma.$AuthenticatorPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first Authenticator that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuthenticatorFindFirstArgs} args - Arguments to find a Authenticator
     * @example
     * // Get one Authenticator
     * const authenticator = await prisma.authenticator.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends AuthenticatorFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, AuthenticatorFindFirstArgs<ExtArgs>>
    ): Prisma__AuthenticatorClient<$Result.GetResult<Prisma.$AuthenticatorPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first Authenticator that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuthenticatorFindFirstOrThrowArgs} args - Arguments to find a Authenticator
     * @example
     * // Get one Authenticator
     * const authenticator = await prisma.authenticator.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends AuthenticatorFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, AuthenticatorFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__AuthenticatorClient<$Result.GetResult<Prisma.$AuthenticatorPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more Authenticators that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuthenticatorFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Authenticators
     * const authenticators = await prisma.authenticator.findMany()
     * 
     * // Get first 10 Authenticators
     * const authenticators = await prisma.authenticator.findMany({ take: 10 })
     * 
     * // Only select the `credentialID`
     * const authenticatorWithCredentialIDOnly = await prisma.authenticator.findMany({ select: { credentialID: true } })
     * 
    **/
    findMany<T extends AuthenticatorFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, AuthenticatorFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuthenticatorPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a Authenticator.
     * @param {AuthenticatorCreateArgs} args - Arguments to create a Authenticator.
     * @example
     * // Create one Authenticator
     * const Authenticator = await prisma.authenticator.create({
     *   data: {
     *     // ... data to create a Authenticator
     *   }
     * })
     * 
    **/
    create<T extends AuthenticatorCreateArgs<ExtArgs>>(
      args: SelectSubset<T, AuthenticatorCreateArgs<ExtArgs>>
    ): Prisma__AuthenticatorClient<$Result.GetResult<Prisma.$AuthenticatorPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many Authenticators.
     * @param {AuthenticatorCreateManyArgs} args - Arguments to create many Authenticators.
     * @example
     * // Create many Authenticators
     * const authenticator = await prisma.authenticator.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends AuthenticatorCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, AuthenticatorCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Authenticators and returns the data saved in the database.
     * @param {AuthenticatorCreateManyAndReturnArgs} args - Arguments to create many Authenticators.
     * @example
     * // Create many Authenticators
     * const authenticator = await prisma.authenticator.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Authenticators and only return the `credentialID`
     * const authenticatorWithCredentialIDOnly = await prisma.authenticator.createManyAndReturn({ 
     *   select: { credentialID: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends AuthenticatorCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, AuthenticatorCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuthenticatorPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a Authenticator.
     * @param {AuthenticatorDeleteArgs} args - Arguments to delete one Authenticator.
     * @example
     * // Delete one Authenticator
     * const Authenticator = await prisma.authenticator.delete({
     *   where: {
     *     // ... filter to delete one Authenticator
     *   }
     * })
     * 
    **/
    delete<T extends AuthenticatorDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, AuthenticatorDeleteArgs<ExtArgs>>
    ): Prisma__AuthenticatorClient<$Result.GetResult<Prisma.$AuthenticatorPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one Authenticator.
     * @param {AuthenticatorUpdateArgs} args - Arguments to update one Authenticator.
     * @example
     * // Update one Authenticator
     * const authenticator = await prisma.authenticator.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends AuthenticatorUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, AuthenticatorUpdateArgs<ExtArgs>>
    ): Prisma__AuthenticatorClient<$Result.GetResult<Prisma.$AuthenticatorPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more Authenticators.
     * @param {AuthenticatorDeleteManyArgs} args - Arguments to filter Authenticators to delete.
     * @example
     * // Delete a few Authenticators
     * const { count } = await prisma.authenticator.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends AuthenticatorDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, AuthenticatorDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Authenticators.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuthenticatorUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Authenticators
     * const authenticator = await prisma.authenticator.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends AuthenticatorUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, AuthenticatorUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Authenticator.
     * @param {AuthenticatorUpsertArgs} args - Arguments to update or create a Authenticator.
     * @example
     * // Update or create a Authenticator
     * const authenticator = await prisma.authenticator.upsert({
     *   create: {
     *     // ... data to create a Authenticator
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Authenticator we want to update
     *   }
     * })
    **/
    upsert<T extends AuthenticatorUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, AuthenticatorUpsertArgs<ExtArgs>>
    ): Prisma__AuthenticatorClient<$Result.GetResult<Prisma.$AuthenticatorPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of Authenticators.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuthenticatorCountArgs} args - Arguments to filter Authenticators to count.
     * @example
     * // Count the number of Authenticators
     * const count = await prisma.authenticator.count({
     *   where: {
     *     // ... the filter for the Authenticators we want to count
     *   }
     * })
    **/
    count<T extends AuthenticatorCountArgs>(
      args?: Subset<T, AuthenticatorCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuthenticatorCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Authenticator.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuthenticatorAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AuthenticatorAggregateArgs>(args: Subset<T, AuthenticatorAggregateArgs>): Prisma.PrismaPromise<GetAuthenticatorAggregateType<T>>

    /**
     * Group by Authenticator.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuthenticatorGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AuthenticatorGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuthenticatorGroupByArgs['orderBy'] }
        : { orderBy?: AuthenticatorGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AuthenticatorGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuthenticatorGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Authenticator model
   */
  readonly fields: AuthenticatorFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Authenticator.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuthenticatorClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the Authenticator model
   */ 
  interface AuthenticatorFieldRefs {
    readonly credentialID: FieldRef<"Authenticator", 'String'>
    readonly userId: FieldRef<"Authenticator", 'String'>
    readonly providerAccountId: FieldRef<"Authenticator", 'String'>
    readonly credentialPublicKey: FieldRef<"Authenticator", 'String'>
    readonly counter: FieldRef<"Authenticator", 'Int'>
    readonly credentialDeviceType: FieldRef<"Authenticator", 'String'>
    readonly credentialBackedUp: FieldRef<"Authenticator", 'Boolean'>
    readonly transports: FieldRef<"Authenticator", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Authenticator findUnique
   */
  export type AuthenticatorFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Authenticator
     */
    select?: AuthenticatorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuthenticatorInclude<ExtArgs> | null
    /**
     * Filter, which Authenticator to fetch.
     */
    where: AuthenticatorWhereUniqueInput
  }

  /**
   * Authenticator findUniqueOrThrow
   */
  export type AuthenticatorFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Authenticator
     */
    select?: AuthenticatorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuthenticatorInclude<ExtArgs> | null
    /**
     * Filter, which Authenticator to fetch.
     */
    where: AuthenticatorWhereUniqueInput
  }

  /**
   * Authenticator findFirst
   */
  export type AuthenticatorFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Authenticator
     */
    select?: AuthenticatorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuthenticatorInclude<ExtArgs> | null
    /**
     * Filter, which Authenticator to fetch.
     */
    where?: AuthenticatorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Authenticators to fetch.
     */
    orderBy?: AuthenticatorOrderByWithRelationInput | AuthenticatorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Authenticators.
     */
    cursor?: AuthenticatorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Authenticators from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Authenticators.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Authenticators.
     */
    distinct?: AuthenticatorScalarFieldEnum | AuthenticatorScalarFieldEnum[]
  }

  /**
   * Authenticator findFirstOrThrow
   */
  export type AuthenticatorFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Authenticator
     */
    select?: AuthenticatorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuthenticatorInclude<ExtArgs> | null
    /**
     * Filter, which Authenticator to fetch.
     */
    where?: AuthenticatorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Authenticators to fetch.
     */
    orderBy?: AuthenticatorOrderByWithRelationInput | AuthenticatorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Authenticators.
     */
    cursor?: AuthenticatorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Authenticators from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Authenticators.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Authenticators.
     */
    distinct?: AuthenticatorScalarFieldEnum | AuthenticatorScalarFieldEnum[]
  }

  /**
   * Authenticator findMany
   */
  export type AuthenticatorFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Authenticator
     */
    select?: AuthenticatorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuthenticatorInclude<ExtArgs> | null
    /**
     * Filter, which Authenticators to fetch.
     */
    where?: AuthenticatorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Authenticators to fetch.
     */
    orderBy?: AuthenticatorOrderByWithRelationInput | AuthenticatorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Authenticators.
     */
    cursor?: AuthenticatorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Authenticators from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Authenticators.
     */
    skip?: number
    distinct?: AuthenticatorScalarFieldEnum | AuthenticatorScalarFieldEnum[]
  }

  /**
   * Authenticator create
   */
  export type AuthenticatorCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Authenticator
     */
    select?: AuthenticatorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuthenticatorInclude<ExtArgs> | null
    /**
     * The data needed to create a Authenticator.
     */
    data: XOR<AuthenticatorCreateInput, AuthenticatorUncheckedCreateInput>
  }

  /**
   * Authenticator createMany
   */
  export type AuthenticatorCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Authenticators.
     */
    data: AuthenticatorCreateManyInput | AuthenticatorCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Authenticator createManyAndReturn
   */
  export type AuthenticatorCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Authenticator
     */
    select?: AuthenticatorSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Authenticators.
     */
    data: AuthenticatorCreateManyInput | AuthenticatorCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuthenticatorIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Authenticator update
   */
  export type AuthenticatorUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Authenticator
     */
    select?: AuthenticatorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuthenticatorInclude<ExtArgs> | null
    /**
     * The data needed to update a Authenticator.
     */
    data: XOR<AuthenticatorUpdateInput, AuthenticatorUncheckedUpdateInput>
    /**
     * Choose, which Authenticator to update.
     */
    where: AuthenticatorWhereUniqueInput
  }

  /**
   * Authenticator updateMany
   */
  export type AuthenticatorUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Authenticators.
     */
    data: XOR<AuthenticatorUpdateManyMutationInput, AuthenticatorUncheckedUpdateManyInput>
    /**
     * Filter which Authenticators to update
     */
    where?: AuthenticatorWhereInput
  }

  /**
   * Authenticator upsert
   */
  export type AuthenticatorUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Authenticator
     */
    select?: AuthenticatorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuthenticatorInclude<ExtArgs> | null
    /**
     * The filter to search for the Authenticator to update in case it exists.
     */
    where: AuthenticatorWhereUniqueInput
    /**
     * In case the Authenticator found by the `where` argument doesn't exist, create a new Authenticator with this data.
     */
    create: XOR<AuthenticatorCreateInput, AuthenticatorUncheckedCreateInput>
    /**
     * In case the Authenticator was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuthenticatorUpdateInput, AuthenticatorUncheckedUpdateInput>
  }

  /**
   * Authenticator delete
   */
  export type AuthenticatorDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Authenticator
     */
    select?: AuthenticatorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuthenticatorInclude<ExtArgs> | null
    /**
     * Filter which Authenticator to delete.
     */
    where: AuthenticatorWhereUniqueInput
  }

  /**
   * Authenticator deleteMany
   */
  export type AuthenticatorDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Authenticators to delete
     */
    where?: AuthenticatorWhereInput
  }

  /**
   * Authenticator without action
   */
  export type AuthenticatorDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Authenticator
     */
    select?: AuthenticatorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuthenticatorInclude<ExtArgs> | null
  }


  /**
   * Model VoterRecordArchive
   */

  export type AggregateVoterRecordArchive = {
    _count: VoterRecordArchiveCountAggregateOutputType | null
    _avg: VoterRecordArchiveAvgAggregateOutputType | null
    _sum: VoterRecordArchiveSumAggregateOutputType | null
    _min: VoterRecordArchiveMinAggregateOutputType | null
    _max: VoterRecordArchiveMaxAggregateOutputType | null
  }

  export type VoterRecordArchiveAvgAggregateOutputType = {
    id: number | null
    recordEntryYear: number | null
    recordEntryNumber: number | null
    houseNum: number | null
    electionDistrict: number | null
  }

  export type VoterRecordArchiveSumAggregateOutputType = {
    id: number | null
    recordEntryYear: number | null
    recordEntryNumber: number | null
    houseNum: number | null
    electionDistrict: number | null
  }

  export type VoterRecordArchiveMinAggregateOutputType = {
    id: number | null
    VRCNUM: string | null
    recordEntryYear: number | null
    recordEntryNumber: number | null
    lastName: string | null
    firstName: string | null
    middleInitial: string | null
    suffixName: string | null
    houseNum: number | null
    street: string | null
    apartment: string | null
    halfAddress: string | null
    resAddrLine2: string | null
    resAddrLine3: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    zipSuffix: string | null
    telephone: string | null
    email: string | null
    mailingAddress1: string | null
    mailingAddress2: string | null
    mailingAddress3: string | null
    mailingAddress4: string | null
    mailingCity: string | null
    mailingState: string | null
    mailingZip: string | null
    mailingZipSuffix: string | null
    party: string | null
    gender: string | null
    DOB: Date | null
    L_T: string | null
    electionDistrict: number | null
    countyLegDistrict: string | null
    stateAssmblyDistrict: string | null
    stateSenateDistrict: string | null
    congressionalDistrict: string | null
    CC_WD_Village: string | null
    townCode: string | null
    lastUpdate: Date | null
    originalRegDate: Date | null
    statevid: string | null
  }

  export type VoterRecordArchiveMaxAggregateOutputType = {
    id: number | null
    VRCNUM: string | null
    recordEntryYear: number | null
    recordEntryNumber: number | null
    lastName: string | null
    firstName: string | null
    middleInitial: string | null
    suffixName: string | null
    houseNum: number | null
    street: string | null
    apartment: string | null
    halfAddress: string | null
    resAddrLine2: string | null
    resAddrLine3: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    zipSuffix: string | null
    telephone: string | null
    email: string | null
    mailingAddress1: string | null
    mailingAddress2: string | null
    mailingAddress3: string | null
    mailingAddress4: string | null
    mailingCity: string | null
    mailingState: string | null
    mailingZip: string | null
    mailingZipSuffix: string | null
    party: string | null
    gender: string | null
    DOB: Date | null
    L_T: string | null
    electionDistrict: number | null
    countyLegDistrict: string | null
    stateAssmblyDistrict: string | null
    stateSenateDistrict: string | null
    congressionalDistrict: string | null
    CC_WD_Village: string | null
    townCode: string | null
    lastUpdate: Date | null
    originalRegDate: Date | null
    statevid: string | null
  }

  export type VoterRecordArchiveCountAggregateOutputType = {
    id: number
    VRCNUM: number
    recordEntryYear: number
    recordEntryNumber: number
    lastName: number
    firstName: number
    middleInitial: number
    suffixName: number
    houseNum: number
    street: number
    apartment: number
    halfAddress: number
    resAddrLine2: number
    resAddrLine3: number
    city: number
    state: number
    zipCode: number
    zipSuffix: number
    telephone: number
    email: number
    mailingAddress1: number
    mailingAddress2: number
    mailingAddress3: number
    mailingAddress4: number
    mailingCity: number
    mailingState: number
    mailingZip: number
    mailingZipSuffix: number
    party: number
    gender: number
    DOB: number
    L_T: number
    electionDistrict: number
    countyLegDistrict: number
    stateAssmblyDistrict: number
    stateSenateDistrict: number
    congressionalDistrict: number
    CC_WD_Village: number
    townCode: number
    lastUpdate: number
    originalRegDate: number
    statevid: number
    _all: number
  }


  export type VoterRecordArchiveAvgAggregateInputType = {
    id?: true
    recordEntryYear?: true
    recordEntryNumber?: true
    houseNum?: true
    electionDistrict?: true
  }

  export type VoterRecordArchiveSumAggregateInputType = {
    id?: true
    recordEntryYear?: true
    recordEntryNumber?: true
    houseNum?: true
    electionDistrict?: true
  }

  export type VoterRecordArchiveMinAggregateInputType = {
    id?: true
    VRCNUM?: true
    recordEntryYear?: true
    recordEntryNumber?: true
    lastName?: true
    firstName?: true
    middleInitial?: true
    suffixName?: true
    houseNum?: true
    street?: true
    apartment?: true
    halfAddress?: true
    resAddrLine2?: true
    resAddrLine3?: true
    city?: true
    state?: true
    zipCode?: true
    zipSuffix?: true
    telephone?: true
    email?: true
    mailingAddress1?: true
    mailingAddress2?: true
    mailingAddress3?: true
    mailingAddress4?: true
    mailingCity?: true
    mailingState?: true
    mailingZip?: true
    mailingZipSuffix?: true
    party?: true
    gender?: true
    DOB?: true
    L_T?: true
    electionDistrict?: true
    countyLegDistrict?: true
    stateAssmblyDistrict?: true
    stateSenateDistrict?: true
    congressionalDistrict?: true
    CC_WD_Village?: true
    townCode?: true
    lastUpdate?: true
    originalRegDate?: true
    statevid?: true
  }

  export type VoterRecordArchiveMaxAggregateInputType = {
    id?: true
    VRCNUM?: true
    recordEntryYear?: true
    recordEntryNumber?: true
    lastName?: true
    firstName?: true
    middleInitial?: true
    suffixName?: true
    houseNum?: true
    street?: true
    apartment?: true
    halfAddress?: true
    resAddrLine2?: true
    resAddrLine3?: true
    city?: true
    state?: true
    zipCode?: true
    zipSuffix?: true
    telephone?: true
    email?: true
    mailingAddress1?: true
    mailingAddress2?: true
    mailingAddress3?: true
    mailingAddress4?: true
    mailingCity?: true
    mailingState?: true
    mailingZip?: true
    mailingZipSuffix?: true
    party?: true
    gender?: true
    DOB?: true
    L_T?: true
    electionDistrict?: true
    countyLegDistrict?: true
    stateAssmblyDistrict?: true
    stateSenateDistrict?: true
    congressionalDistrict?: true
    CC_WD_Village?: true
    townCode?: true
    lastUpdate?: true
    originalRegDate?: true
    statevid?: true
  }

  export type VoterRecordArchiveCountAggregateInputType = {
    id?: true
    VRCNUM?: true
    recordEntryYear?: true
    recordEntryNumber?: true
    lastName?: true
    firstName?: true
    middleInitial?: true
    suffixName?: true
    houseNum?: true
    street?: true
    apartment?: true
    halfAddress?: true
    resAddrLine2?: true
    resAddrLine3?: true
    city?: true
    state?: true
    zipCode?: true
    zipSuffix?: true
    telephone?: true
    email?: true
    mailingAddress1?: true
    mailingAddress2?: true
    mailingAddress3?: true
    mailingAddress4?: true
    mailingCity?: true
    mailingState?: true
    mailingZip?: true
    mailingZipSuffix?: true
    party?: true
    gender?: true
    DOB?: true
    L_T?: true
    electionDistrict?: true
    countyLegDistrict?: true
    stateAssmblyDistrict?: true
    stateSenateDistrict?: true
    congressionalDistrict?: true
    CC_WD_Village?: true
    townCode?: true
    lastUpdate?: true
    originalRegDate?: true
    statevid?: true
    _all?: true
  }

  export type VoterRecordArchiveAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which VoterRecordArchive to aggregate.
     */
    where?: VoterRecordArchiveWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VoterRecordArchives to fetch.
     */
    orderBy?: VoterRecordArchiveOrderByWithRelationInput | VoterRecordArchiveOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: VoterRecordArchiveWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VoterRecordArchives from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VoterRecordArchives.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned VoterRecordArchives
    **/
    _count?: true | VoterRecordArchiveCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: VoterRecordArchiveAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: VoterRecordArchiveSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: VoterRecordArchiveMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: VoterRecordArchiveMaxAggregateInputType
  }

  export type GetVoterRecordArchiveAggregateType<T extends VoterRecordArchiveAggregateArgs> = {
        [P in keyof T & keyof AggregateVoterRecordArchive]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateVoterRecordArchive[P]>
      : GetScalarType<T[P], AggregateVoterRecordArchive[P]>
  }




  export type VoterRecordArchiveGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VoterRecordArchiveWhereInput
    orderBy?: VoterRecordArchiveOrderByWithAggregationInput | VoterRecordArchiveOrderByWithAggregationInput[]
    by: VoterRecordArchiveScalarFieldEnum[] | VoterRecordArchiveScalarFieldEnum
    having?: VoterRecordArchiveScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: VoterRecordArchiveCountAggregateInputType | true
    _avg?: VoterRecordArchiveAvgAggregateInputType
    _sum?: VoterRecordArchiveSumAggregateInputType
    _min?: VoterRecordArchiveMinAggregateInputType
    _max?: VoterRecordArchiveMaxAggregateInputType
  }

  export type VoterRecordArchiveGroupByOutputType = {
    id: number
    VRCNUM: string
    recordEntryYear: number
    recordEntryNumber: number
    lastName: string | null
    firstName: string | null
    middleInitial: string | null
    suffixName: string | null
    houseNum: number | null
    street: string | null
    apartment: string | null
    halfAddress: string | null
    resAddrLine2: string | null
    resAddrLine3: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    zipSuffix: string | null
    telephone: string | null
    email: string | null
    mailingAddress1: string | null
    mailingAddress2: string | null
    mailingAddress3: string | null
    mailingAddress4: string | null
    mailingCity: string | null
    mailingState: string | null
    mailingZip: string | null
    mailingZipSuffix: string | null
    party: string | null
    gender: string | null
    DOB: Date | null
    L_T: string | null
    electionDistrict: number | null
    countyLegDistrict: string | null
    stateAssmblyDistrict: string | null
    stateSenateDistrict: string | null
    congressionalDistrict: string | null
    CC_WD_Village: string | null
    townCode: string | null
    lastUpdate: Date | null
    originalRegDate: Date | null
    statevid: string | null
    _count: VoterRecordArchiveCountAggregateOutputType | null
    _avg: VoterRecordArchiveAvgAggregateOutputType | null
    _sum: VoterRecordArchiveSumAggregateOutputType | null
    _min: VoterRecordArchiveMinAggregateOutputType | null
    _max: VoterRecordArchiveMaxAggregateOutputType | null
  }

  type GetVoterRecordArchiveGroupByPayload<T extends VoterRecordArchiveGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<VoterRecordArchiveGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof VoterRecordArchiveGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], VoterRecordArchiveGroupByOutputType[P]>
            : GetScalarType<T[P], VoterRecordArchiveGroupByOutputType[P]>
        }
      >
    >


  export type VoterRecordArchiveSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    VRCNUM?: boolean
    recordEntryYear?: boolean
    recordEntryNumber?: boolean
    lastName?: boolean
    firstName?: boolean
    middleInitial?: boolean
    suffixName?: boolean
    houseNum?: boolean
    street?: boolean
    apartment?: boolean
    halfAddress?: boolean
    resAddrLine2?: boolean
    resAddrLine3?: boolean
    city?: boolean
    state?: boolean
    zipCode?: boolean
    zipSuffix?: boolean
    telephone?: boolean
    email?: boolean
    mailingAddress1?: boolean
    mailingAddress2?: boolean
    mailingAddress3?: boolean
    mailingAddress4?: boolean
    mailingCity?: boolean
    mailingState?: boolean
    mailingZip?: boolean
    mailingZipSuffix?: boolean
    party?: boolean
    gender?: boolean
    DOB?: boolean
    L_T?: boolean
    electionDistrict?: boolean
    countyLegDistrict?: boolean
    stateAssmblyDistrict?: boolean
    stateSenateDistrict?: boolean
    congressionalDistrict?: boolean
    CC_WD_Village?: boolean
    townCode?: boolean
    lastUpdate?: boolean
    originalRegDate?: boolean
    statevid?: boolean
  }, ExtArgs["result"]["voterRecordArchive"]>

  export type VoterRecordArchiveSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    VRCNUM?: boolean
    recordEntryYear?: boolean
    recordEntryNumber?: boolean
    lastName?: boolean
    firstName?: boolean
    middleInitial?: boolean
    suffixName?: boolean
    houseNum?: boolean
    street?: boolean
    apartment?: boolean
    halfAddress?: boolean
    resAddrLine2?: boolean
    resAddrLine3?: boolean
    city?: boolean
    state?: boolean
    zipCode?: boolean
    zipSuffix?: boolean
    telephone?: boolean
    email?: boolean
    mailingAddress1?: boolean
    mailingAddress2?: boolean
    mailingAddress3?: boolean
    mailingAddress4?: boolean
    mailingCity?: boolean
    mailingState?: boolean
    mailingZip?: boolean
    mailingZipSuffix?: boolean
    party?: boolean
    gender?: boolean
    DOB?: boolean
    L_T?: boolean
    electionDistrict?: boolean
    countyLegDistrict?: boolean
    stateAssmblyDistrict?: boolean
    stateSenateDistrict?: boolean
    congressionalDistrict?: boolean
    CC_WD_Village?: boolean
    townCode?: boolean
    lastUpdate?: boolean
    originalRegDate?: boolean
    statevid?: boolean
  }, ExtArgs["result"]["voterRecordArchive"]>

  export type VoterRecordArchiveSelectScalar = {
    id?: boolean
    VRCNUM?: boolean
    recordEntryYear?: boolean
    recordEntryNumber?: boolean
    lastName?: boolean
    firstName?: boolean
    middleInitial?: boolean
    suffixName?: boolean
    houseNum?: boolean
    street?: boolean
    apartment?: boolean
    halfAddress?: boolean
    resAddrLine2?: boolean
    resAddrLine3?: boolean
    city?: boolean
    state?: boolean
    zipCode?: boolean
    zipSuffix?: boolean
    telephone?: boolean
    email?: boolean
    mailingAddress1?: boolean
    mailingAddress2?: boolean
    mailingAddress3?: boolean
    mailingAddress4?: boolean
    mailingCity?: boolean
    mailingState?: boolean
    mailingZip?: boolean
    mailingZipSuffix?: boolean
    party?: boolean
    gender?: boolean
    DOB?: boolean
    L_T?: boolean
    electionDistrict?: boolean
    countyLegDistrict?: boolean
    stateAssmblyDistrict?: boolean
    stateSenateDistrict?: boolean
    congressionalDistrict?: boolean
    CC_WD_Village?: boolean
    townCode?: boolean
    lastUpdate?: boolean
    originalRegDate?: boolean
    statevid?: boolean
  }


  export type $VoterRecordArchivePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "VoterRecordArchive"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      VRCNUM: string
      recordEntryYear: number
      recordEntryNumber: number
      lastName: string | null
      firstName: string | null
      middleInitial: string | null
      suffixName: string | null
      houseNum: number | null
      street: string | null
      apartment: string | null
      halfAddress: string | null
      resAddrLine2: string | null
      resAddrLine3: string | null
      city: string | null
      state: string | null
      zipCode: string | null
      zipSuffix: string | null
      telephone: string | null
      email: string | null
      mailingAddress1: string | null
      mailingAddress2: string | null
      mailingAddress3: string | null
      mailingAddress4: string | null
      mailingCity: string | null
      mailingState: string | null
      mailingZip: string | null
      mailingZipSuffix: string | null
      party: string | null
      gender: string | null
      DOB: Date | null
      L_T: string | null
      electionDistrict: number | null
      countyLegDistrict: string | null
      stateAssmblyDistrict: string | null
      stateSenateDistrict: string | null
      congressionalDistrict: string | null
      CC_WD_Village: string | null
      townCode: string | null
      lastUpdate: Date | null
      originalRegDate: Date | null
      statevid: string | null
    }, ExtArgs["result"]["voterRecordArchive"]>
    composites: {}
  }

  type VoterRecordArchiveGetPayload<S extends boolean | null | undefined | VoterRecordArchiveDefaultArgs> = $Result.GetResult<Prisma.$VoterRecordArchivePayload, S>

  type VoterRecordArchiveCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<VoterRecordArchiveFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: VoterRecordArchiveCountAggregateInputType | true
    }

  export interface VoterRecordArchiveDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['VoterRecordArchive'], meta: { name: 'VoterRecordArchive' } }
    /**
     * Find zero or one VoterRecordArchive that matches the filter.
     * @param {VoterRecordArchiveFindUniqueArgs} args - Arguments to find a VoterRecordArchive
     * @example
     * // Get one VoterRecordArchive
     * const voterRecordArchive = await prisma.voterRecordArchive.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends VoterRecordArchiveFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, VoterRecordArchiveFindUniqueArgs<ExtArgs>>
    ): Prisma__VoterRecordArchiveClient<$Result.GetResult<Prisma.$VoterRecordArchivePayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one VoterRecordArchive that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {VoterRecordArchiveFindUniqueOrThrowArgs} args - Arguments to find a VoterRecordArchive
     * @example
     * // Get one VoterRecordArchive
     * const voterRecordArchive = await prisma.voterRecordArchive.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends VoterRecordArchiveFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, VoterRecordArchiveFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__VoterRecordArchiveClient<$Result.GetResult<Prisma.$VoterRecordArchivePayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first VoterRecordArchive that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VoterRecordArchiveFindFirstArgs} args - Arguments to find a VoterRecordArchive
     * @example
     * // Get one VoterRecordArchive
     * const voterRecordArchive = await prisma.voterRecordArchive.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends VoterRecordArchiveFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, VoterRecordArchiveFindFirstArgs<ExtArgs>>
    ): Prisma__VoterRecordArchiveClient<$Result.GetResult<Prisma.$VoterRecordArchivePayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first VoterRecordArchive that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VoterRecordArchiveFindFirstOrThrowArgs} args - Arguments to find a VoterRecordArchive
     * @example
     * // Get one VoterRecordArchive
     * const voterRecordArchive = await prisma.voterRecordArchive.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends VoterRecordArchiveFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, VoterRecordArchiveFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__VoterRecordArchiveClient<$Result.GetResult<Prisma.$VoterRecordArchivePayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more VoterRecordArchives that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VoterRecordArchiveFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all VoterRecordArchives
     * const voterRecordArchives = await prisma.voterRecordArchive.findMany()
     * 
     * // Get first 10 VoterRecordArchives
     * const voterRecordArchives = await prisma.voterRecordArchive.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const voterRecordArchiveWithIdOnly = await prisma.voterRecordArchive.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends VoterRecordArchiveFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, VoterRecordArchiveFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VoterRecordArchivePayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a VoterRecordArchive.
     * @param {VoterRecordArchiveCreateArgs} args - Arguments to create a VoterRecordArchive.
     * @example
     * // Create one VoterRecordArchive
     * const VoterRecordArchive = await prisma.voterRecordArchive.create({
     *   data: {
     *     // ... data to create a VoterRecordArchive
     *   }
     * })
     * 
    **/
    create<T extends VoterRecordArchiveCreateArgs<ExtArgs>>(
      args: SelectSubset<T, VoterRecordArchiveCreateArgs<ExtArgs>>
    ): Prisma__VoterRecordArchiveClient<$Result.GetResult<Prisma.$VoterRecordArchivePayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many VoterRecordArchives.
     * @param {VoterRecordArchiveCreateManyArgs} args - Arguments to create many VoterRecordArchives.
     * @example
     * // Create many VoterRecordArchives
     * const voterRecordArchive = await prisma.voterRecordArchive.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends VoterRecordArchiveCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, VoterRecordArchiveCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many VoterRecordArchives and returns the data saved in the database.
     * @param {VoterRecordArchiveCreateManyAndReturnArgs} args - Arguments to create many VoterRecordArchives.
     * @example
     * // Create many VoterRecordArchives
     * const voterRecordArchive = await prisma.voterRecordArchive.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many VoterRecordArchives and only return the `id`
     * const voterRecordArchiveWithIdOnly = await prisma.voterRecordArchive.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends VoterRecordArchiveCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, VoterRecordArchiveCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VoterRecordArchivePayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a VoterRecordArchive.
     * @param {VoterRecordArchiveDeleteArgs} args - Arguments to delete one VoterRecordArchive.
     * @example
     * // Delete one VoterRecordArchive
     * const VoterRecordArchive = await prisma.voterRecordArchive.delete({
     *   where: {
     *     // ... filter to delete one VoterRecordArchive
     *   }
     * })
     * 
    **/
    delete<T extends VoterRecordArchiveDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, VoterRecordArchiveDeleteArgs<ExtArgs>>
    ): Prisma__VoterRecordArchiveClient<$Result.GetResult<Prisma.$VoterRecordArchivePayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one VoterRecordArchive.
     * @param {VoterRecordArchiveUpdateArgs} args - Arguments to update one VoterRecordArchive.
     * @example
     * // Update one VoterRecordArchive
     * const voterRecordArchive = await prisma.voterRecordArchive.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends VoterRecordArchiveUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, VoterRecordArchiveUpdateArgs<ExtArgs>>
    ): Prisma__VoterRecordArchiveClient<$Result.GetResult<Prisma.$VoterRecordArchivePayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more VoterRecordArchives.
     * @param {VoterRecordArchiveDeleteManyArgs} args - Arguments to filter VoterRecordArchives to delete.
     * @example
     * // Delete a few VoterRecordArchives
     * const { count } = await prisma.voterRecordArchive.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends VoterRecordArchiveDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, VoterRecordArchiveDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more VoterRecordArchives.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VoterRecordArchiveUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many VoterRecordArchives
     * const voterRecordArchive = await prisma.voterRecordArchive.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends VoterRecordArchiveUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, VoterRecordArchiveUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one VoterRecordArchive.
     * @param {VoterRecordArchiveUpsertArgs} args - Arguments to update or create a VoterRecordArchive.
     * @example
     * // Update or create a VoterRecordArchive
     * const voterRecordArchive = await prisma.voterRecordArchive.upsert({
     *   create: {
     *     // ... data to create a VoterRecordArchive
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the VoterRecordArchive we want to update
     *   }
     * })
    **/
    upsert<T extends VoterRecordArchiveUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, VoterRecordArchiveUpsertArgs<ExtArgs>>
    ): Prisma__VoterRecordArchiveClient<$Result.GetResult<Prisma.$VoterRecordArchivePayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of VoterRecordArchives.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VoterRecordArchiveCountArgs} args - Arguments to filter VoterRecordArchives to count.
     * @example
     * // Count the number of VoterRecordArchives
     * const count = await prisma.voterRecordArchive.count({
     *   where: {
     *     // ... the filter for the VoterRecordArchives we want to count
     *   }
     * })
    **/
    count<T extends VoterRecordArchiveCountArgs>(
      args?: Subset<T, VoterRecordArchiveCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], VoterRecordArchiveCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a VoterRecordArchive.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VoterRecordArchiveAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends VoterRecordArchiveAggregateArgs>(args: Subset<T, VoterRecordArchiveAggregateArgs>): Prisma.PrismaPromise<GetVoterRecordArchiveAggregateType<T>>

    /**
     * Group by VoterRecordArchive.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VoterRecordArchiveGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends VoterRecordArchiveGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: VoterRecordArchiveGroupByArgs['orderBy'] }
        : { orderBy?: VoterRecordArchiveGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, VoterRecordArchiveGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetVoterRecordArchiveGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the VoterRecordArchive model
   */
  readonly fields: VoterRecordArchiveFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for VoterRecordArchive.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__VoterRecordArchiveClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';


    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the VoterRecordArchive model
   */ 
  interface VoterRecordArchiveFieldRefs {
    readonly id: FieldRef<"VoterRecordArchive", 'Int'>
    readonly VRCNUM: FieldRef<"VoterRecordArchive", 'String'>
    readonly recordEntryYear: FieldRef<"VoterRecordArchive", 'Int'>
    readonly recordEntryNumber: FieldRef<"VoterRecordArchive", 'Int'>
    readonly lastName: FieldRef<"VoterRecordArchive", 'String'>
    readonly firstName: FieldRef<"VoterRecordArchive", 'String'>
    readonly middleInitial: FieldRef<"VoterRecordArchive", 'String'>
    readonly suffixName: FieldRef<"VoterRecordArchive", 'String'>
    readonly houseNum: FieldRef<"VoterRecordArchive", 'Int'>
    readonly street: FieldRef<"VoterRecordArchive", 'String'>
    readonly apartment: FieldRef<"VoterRecordArchive", 'String'>
    readonly halfAddress: FieldRef<"VoterRecordArchive", 'String'>
    readonly resAddrLine2: FieldRef<"VoterRecordArchive", 'String'>
    readonly resAddrLine3: FieldRef<"VoterRecordArchive", 'String'>
    readonly city: FieldRef<"VoterRecordArchive", 'String'>
    readonly state: FieldRef<"VoterRecordArchive", 'String'>
    readonly zipCode: FieldRef<"VoterRecordArchive", 'String'>
    readonly zipSuffix: FieldRef<"VoterRecordArchive", 'String'>
    readonly telephone: FieldRef<"VoterRecordArchive", 'String'>
    readonly email: FieldRef<"VoterRecordArchive", 'String'>
    readonly mailingAddress1: FieldRef<"VoterRecordArchive", 'String'>
    readonly mailingAddress2: FieldRef<"VoterRecordArchive", 'String'>
    readonly mailingAddress3: FieldRef<"VoterRecordArchive", 'String'>
    readonly mailingAddress4: FieldRef<"VoterRecordArchive", 'String'>
    readonly mailingCity: FieldRef<"VoterRecordArchive", 'String'>
    readonly mailingState: FieldRef<"VoterRecordArchive", 'String'>
    readonly mailingZip: FieldRef<"VoterRecordArchive", 'String'>
    readonly mailingZipSuffix: FieldRef<"VoterRecordArchive", 'String'>
    readonly party: FieldRef<"VoterRecordArchive", 'String'>
    readonly gender: FieldRef<"VoterRecordArchive", 'String'>
    readonly DOB: FieldRef<"VoterRecordArchive", 'DateTime'>
    readonly L_T: FieldRef<"VoterRecordArchive", 'String'>
    readonly electionDistrict: FieldRef<"VoterRecordArchive", 'Int'>
    readonly countyLegDistrict: FieldRef<"VoterRecordArchive", 'String'>
    readonly stateAssmblyDistrict: FieldRef<"VoterRecordArchive", 'String'>
    readonly stateSenateDistrict: FieldRef<"VoterRecordArchive", 'String'>
    readonly congressionalDistrict: FieldRef<"VoterRecordArchive", 'String'>
    readonly CC_WD_Village: FieldRef<"VoterRecordArchive", 'String'>
    readonly townCode: FieldRef<"VoterRecordArchive", 'String'>
    readonly lastUpdate: FieldRef<"VoterRecordArchive", 'DateTime'>
    readonly originalRegDate: FieldRef<"VoterRecordArchive", 'DateTime'>
    readonly statevid: FieldRef<"VoterRecordArchive", 'String'>
  }
    

  // Custom InputTypes
  /**
   * VoterRecordArchive findUnique
   */
  export type VoterRecordArchiveFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecordArchive
     */
    select?: VoterRecordArchiveSelect<ExtArgs> | null
    /**
     * Filter, which VoterRecordArchive to fetch.
     */
    where: VoterRecordArchiveWhereUniqueInput
  }

  /**
   * VoterRecordArchive findUniqueOrThrow
   */
  export type VoterRecordArchiveFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecordArchive
     */
    select?: VoterRecordArchiveSelect<ExtArgs> | null
    /**
     * Filter, which VoterRecordArchive to fetch.
     */
    where: VoterRecordArchiveWhereUniqueInput
  }

  /**
   * VoterRecordArchive findFirst
   */
  export type VoterRecordArchiveFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecordArchive
     */
    select?: VoterRecordArchiveSelect<ExtArgs> | null
    /**
     * Filter, which VoterRecordArchive to fetch.
     */
    where?: VoterRecordArchiveWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VoterRecordArchives to fetch.
     */
    orderBy?: VoterRecordArchiveOrderByWithRelationInput | VoterRecordArchiveOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for VoterRecordArchives.
     */
    cursor?: VoterRecordArchiveWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VoterRecordArchives from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VoterRecordArchives.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of VoterRecordArchives.
     */
    distinct?: VoterRecordArchiveScalarFieldEnum | VoterRecordArchiveScalarFieldEnum[]
  }

  /**
   * VoterRecordArchive findFirstOrThrow
   */
  export type VoterRecordArchiveFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecordArchive
     */
    select?: VoterRecordArchiveSelect<ExtArgs> | null
    /**
     * Filter, which VoterRecordArchive to fetch.
     */
    where?: VoterRecordArchiveWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VoterRecordArchives to fetch.
     */
    orderBy?: VoterRecordArchiveOrderByWithRelationInput | VoterRecordArchiveOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for VoterRecordArchives.
     */
    cursor?: VoterRecordArchiveWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VoterRecordArchives from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VoterRecordArchives.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of VoterRecordArchives.
     */
    distinct?: VoterRecordArchiveScalarFieldEnum | VoterRecordArchiveScalarFieldEnum[]
  }

  /**
   * VoterRecordArchive findMany
   */
  export type VoterRecordArchiveFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecordArchive
     */
    select?: VoterRecordArchiveSelect<ExtArgs> | null
    /**
     * Filter, which VoterRecordArchives to fetch.
     */
    where?: VoterRecordArchiveWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VoterRecordArchives to fetch.
     */
    orderBy?: VoterRecordArchiveOrderByWithRelationInput | VoterRecordArchiveOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing VoterRecordArchives.
     */
    cursor?: VoterRecordArchiveWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VoterRecordArchives from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VoterRecordArchives.
     */
    skip?: number
    distinct?: VoterRecordArchiveScalarFieldEnum | VoterRecordArchiveScalarFieldEnum[]
  }

  /**
   * VoterRecordArchive create
   */
  export type VoterRecordArchiveCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecordArchive
     */
    select?: VoterRecordArchiveSelect<ExtArgs> | null
    /**
     * The data needed to create a VoterRecordArchive.
     */
    data: XOR<VoterRecordArchiveCreateInput, VoterRecordArchiveUncheckedCreateInput>
  }

  /**
   * VoterRecordArchive createMany
   */
  export type VoterRecordArchiveCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many VoterRecordArchives.
     */
    data: VoterRecordArchiveCreateManyInput | VoterRecordArchiveCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * VoterRecordArchive createManyAndReturn
   */
  export type VoterRecordArchiveCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecordArchive
     */
    select?: VoterRecordArchiveSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many VoterRecordArchives.
     */
    data: VoterRecordArchiveCreateManyInput | VoterRecordArchiveCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * VoterRecordArchive update
   */
  export type VoterRecordArchiveUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecordArchive
     */
    select?: VoterRecordArchiveSelect<ExtArgs> | null
    /**
     * The data needed to update a VoterRecordArchive.
     */
    data: XOR<VoterRecordArchiveUpdateInput, VoterRecordArchiveUncheckedUpdateInput>
    /**
     * Choose, which VoterRecordArchive to update.
     */
    where: VoterRecordArchiveWhereUniqueInput
  }

  /**
   * VoterRecordArchive updateMany
   */
  export type VoterRecordArchiveUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update VoterRecordArchives.
     */
    data: XOR<VoterRecordArchiveUpdateManyMutationInput, VoterRecordArchiveUncheckedUpdateManyInput>
    /**
     * Filter which VoterRecordArchives to update
     */
    where?: VoterRecordArchiveWhereInput
  }

  /**
   * VoterRecordArchive upsert
   */
  export type VoterRecordArchiveUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecordArchive
     */
    select?: VoterRecordArchiveSelect<ExtArgs> | null
    /**
     * The filter to search for the VoterRecordArchive to update in case it exists.
     */
    where: VoterRecordArchiveWhereUniqueInput
    /**
     * In case the VoterRecordArchive found by the `where` argument doesn't exist, create a new VoterRecordArchive with this data.
     */
    create: XOR<VoterRecordArchiveCreateInput, VoterRecordArchiveUncheckedCreateInput>
    /**
     * In case the VoterRecordArchive was found with the provided `where` argument, update it with this data.
     */
    update: XOR<VoterRecordArchiveUpdateInput, VoterRecordArchiveUncheckedUpdateInput>
  }

  /**
   * VoterRecordArchive delete
   */
  export type VoterRecordArchiveDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecordArchive
     */
    select?: VoterRecordArchiveSelect<ExtArgs> | null
    /**
     * Filter which VoterRecordArchive to delete.
     */
    where: VoterRecordArchiveWhereUniqueInput
  }

  /**
   * VoterRecordArchive deleteMany
   */
  export type VoterRecordArchiveDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which VoterRecordArchives to delete
     */
    where?: VoterRecordArchiveWhereInput
  }

  /**
   * VoterRecordArchive without action
   */
  export type VoterRecordArchiveDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecordArchive
     */
    select?: VoterRecordArchiveSelect<ExtArgs> | null
  }


  /**
   * Model VoterRecord
   */

  export type AggregateVoterRecord = {
    _count: VoterRecordCountAggregateOutputType | null
    _avg: VoterRecordAvgAggregateOutputType | null
    _sum: VoterRecordSumAggregateOutputType | null
    _min: VoterRecordMinAggregateOutputType | null
    _max: VoterRecordMaxAggregateOutputType | null
  }

  export type VoterRecordAvgAggregateOutputType = {
    committeeId: number | null
    latestRecordEntryYear: number | null
    latestRecordEntryNumber: number | null
    houseNum: number | null
    electionDistrict: number | null
  }

  export type VoterRecordSumAggregateOutputType = {
    committeeId: number | null
    latestRecordEntryYear: number | null
    latestRecordEntryNumber: number | null
    houseNum: number | null
    electionDistrict: number | null
  }

  export type VoterRecordMinAggregateOutputType = {
    VRCNUM: string | null
    committeeId: number | null
    addressForCommittee: string | null
    latestRecordEntryYear: number | null
    latestRecordEntryNumber: number | null
    lastName: string | null
    firstName: string | null
    middleInitial: string | null
    suffixName: string | null
    houseNum: number | null
    street: string | null
    apartment: string | null
    halfAddress: string | null
    resAddrLine2: string | null
    resAddrLine3: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    zipSuffix: string | null
    telephone: string | null
    email: string | null
    mailingAddress1: string | null
    mailingAddress2: string | null
    mailingAddress3: string | null
    mailingAddress4: string | null
    mailingCity: string | null
    mailingState: string | null
    mailingZip: string | null
    mailingZipSuffix: string | null
    party: string | null
    gender: string | null
    DOB: Date | null
    L_T: string | null
    electionDistrict: number | null
    countyLegDistrict: string | null
    stateAssmblyDistrict: string | null
    stateSenateDistrict: string | null
    congressionalDistrict: string | null
    CC_WD_Village: string | null
    townCode: string | null
    lastUpdate: Date | null
    originalRegDate: Date | null
    statevid: string | null
    hasDiscrepancy: boolean | null
  }

  export type VoterRecordMaxAggregateOutputType = {
    VRCNUM: string | null
    committeeId: number | null
    addressForCommittee: string | null
    latestRecordEntryYear: number | null
    latestRecordEntryNumber: number | null
    lastName: string | null
    firstName: string | null
    middleInitial: string | null
    suffixName: string | null
    houseNum: number | null
    street: string | null
    apartment: string | null
    halfAddress: string | null
    resAddrLine2: string | null
    resAddrLine3: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    zipSuffix: string | null
    telephone: string | null
    email: string | null
    mailingAddress1: string | null
    mailingAddress2: string | null
    mailingAddress3: string | null
    mailingAddress4: string | null
    mailingCity: string | null
    mailingState: string | null
    mailingZip: string | null
    mailingZipSuffix: string | null
    party: string | null
    gender: string | null
    DOB: Date | null
    L_T: string | null
    electionDistrict: number | null
    countyLegDistrict: string | null
    stateAssmblyDistrict: string | null
    stateSenateDistrict: string | null
    congressionalDistrict: string | null
    CC_WD_Village: string | null
    townCode: string | null
    lastUpdate: Date | null
    originalRegDate: Date | null
    statevid: string | null
    hasDiscrepancy: boolean | null
  }

  export type VoterRecordCountAggregateOutputType = {
    VRCNUM: number
    committeeId: number
    addressForCommittee: number
    latestRecordEntryYear: number
    latestRecordEntryNumber: number
    lastName: number
    firstName: number
    middleInitial: number
    suffixName: number
    houseNum: number
    street: number
    apartment: number
    halfAddress: number
    resAddrLine2: number
    resAddrLine3: number
    city: number
    state: number
    zipCode: number
    zipSuffix: number
    telephone: number
    email: number
    mailingAddress1: number
    mailingAddress2: number
    mailingAddress3: number
    mailingAddress4: number
    mailingCity: number
    mailingState: number
    mailingZip: number
    mailingZipSuffix: number
    party: number
    gender: number
    DOB: number
    L_T: number
    electionDistrict: number
    countyLegDistrict: number
    stateAssmblyDistrict: number
    stateSenateDistrict: number
    congressionalDistrict: number
    CC_WD_Village: number
    townCode: number
    lastUpdate: number
    originalRegDate: number
    statevid: number
    hasDiscrepancy: number
    _all: number
  }


  export type VoterRecordAvgAggregateInputType = {
    committeeId?: true
    latestRecordEntryYear?: true
    latestRecordEntryNumber?: true
    houseNum?: true
    electionDistrict?: true
  }

  export type VoterRecordSumAggregateInputType = {
    committeeId?: true
    latestRecordEntryYear?: true
    latestRecordEntryNumber?: true
    houseNum?: true
    electionDistrict?: true
  }

  export type VoterRecordMinAggregateInputType = {
    VRCNUM?: true
    committeeId?: true
    addressForCommittee?: true
    latestRecordEntryYear?: true
    latestRecordEntryNumber?: true
    lastName?: true
    firstName?: true
    middleInitial?: true
    suffixName?: true
    houseNum?: true
    street?: true
    apartment?: true
    halfAddress?: true
    resAddrLine2?: true
    resAddrLine3?: true
    city?: true
    state?: true
    zipCode?: true
    zipSuffix?: true
    telephone?: true
    email?: true
    mailingAddress1?: true
    mailingAddress2?: true
    mailingAddress3?: true
    mailingAddress4?: true
    mailingCity?: true
    mailingState?: true
    mailingZip?: true
    mailingZipSuffix?: true
    party?: true
    gender?: true
    DOB?: true
    L_T?: true
    electionDistrict?: true
    countyLegDistrict?: true
    stateAssmblyDistrict?: true
    stateSenateDistrict?: true
    congressionalDistrict?: true
    CC_WD_Village?: true
    townCode?: true
    lastUpdate?: true
    originalRegDate?: true
    statevid?: true
    hasDiscrepancy?: true
  }

  export type VoterRecordMaxAggregateInputType = {
    VRCNUM?: true
    committeeId?: true
    addressForCommittee?: true
    latestRecordEntryYear?: true
    latestRecordEntryNumber?: true
    lastName?: true
    firstName?: true
    middleInitial?: true
    suffixName?: true
    houseNum?: true
    street?: true
    apartment?: true
    halfAddress?: true
    resAddrLine2?: true
    resAddrLine3?: true
    city?: true
    state?: true
    zipCode?: true
    zipSuffix?: true
    telephone?: true
    email?: true
    mailingAddress1?: true
    mailingAddress2?: true
    mailingAddress3?: true
    mailingAddress4?: true
    mailingCity?: true
    mailingState?: true
    mailingZip?: true
    mailingZipSuffix?: true
    party?: true
    gender?: true
    DOB?: true
    L_T?: true
    electionDistrict?: true
    countyLegDistrict?: true
    stateAssmblyDistrict?: true
    stateSenateDistrict?: true
    congressionalDistrict?: true
    CC_WD_Village?: true
    townCode?: true
    lastUpdate?: true
    originalRegDate?: true
    statevid?: true
    hasDiscrepancy?: true
  }

  export type VoterRecordCountAggregateInputType = {
    VRCNUM?: true
    committeeId?: true
    addressForCommittee?: true
    latestRecordEntryYear?: true
    latestRecordEntryNumber?: true
    lastName?: true
    firstName?: true
    middleInitial?: true
    suffixName?: true
    houseNum?: true
    street?: true
    apartment?: true
    halfAddress?: true
    resAddrLine2?: true
    resAddrLine3?: true
    city?: true
    state?: true
    zipCode?: true
    zipSuffix?: true
    telephone?: true
    email?: true
    mailingAddress1?: true
    mailingAddress2?: true
    mailingAddress3?: true
    mailingAddress4?: true
    mailingCity?: true
    mailingState?: true
    mailingZip?: true
    mailingZipSuffix?: true
    party?: true
    gender?: true
    DOB?: true
    L_T?: true
    electionDistrict?: true
    countyLegDistrict?: true
    stateAssmblyDistrict?: true
    stateSenateDistrict?: true
    congressionalDistrict?: true
    CC_WD_Village?: true
    townCode?: true
    lastUpdate?: true
    originalRegDate?: true
    statevid?: true
    hasDiscrepancy?: true
    _all?: true
  }

  export type VoterRecordAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which VoterRecord to aggregate.
     */
    where?: VoterRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VoterRecords to fetch.
     */
    orderBy?: VoterRecordOrderByWithRelationInput | VoterRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: VoterRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VoterRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VoterRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned VoterRecords
    **/
    _count?: true | VoterRecordCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: VoterRecordAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: VoterRecordSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: VoterRecordMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: VoterRecordMaxAggregateInputType
  }

  export type GetVoterRecordAggregateType<T extends VoterRecordAggregateArgs> = {
        [P in keyof T & keyof AggregateVoterRecord]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateVoterRecord[P]>
      : GetScalarType<T[P], AggregateVoterRecord[P]>
  }




  export type VoterRecordGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VoterRecordWhereInput
    orderBy?: VoterRecordOrderByWithAggregationInput | VoterRecordOrderByWithAggregationInput[]
    by: VoterRecordScalarFieldEnum[] | VoterRecordScalarFieldEnum
    having?: VoterRecordScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: VoterRecordCountAggregateInputType | true
    _avg?: VoterRecordAvgAggregateInputType
    _sum?: VoterRecordSumAggregateInputType
    _min?: VoterRecordMinAggregateInputType
    _max?: VoterRecordMaxAggregateInputType
  }

  export type VoterRecordGroupByOutputType = {
    VRCNUM: string
    committeeId: number | null
    addressForCommittee: string | null
    latestRecordEntryYear: number
    latestRecordEntryNumber: number
    lastName: string | null
    firstName: string | null
    middleInitial: string | null
    suffixName: string | null
    houseNum: number | null
    street: string | null
    apartment: string | null
    halfAddress: string | null
    resAddrLine2: string | null
    resAddrLine3: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    zipSuffix: string | null
    telephone: string | null
    email: string | null
    mailingAddress1: string | null
    mailingAddress2: string | null
    mailingAddress3: string | null
    mailingAddress4: string | null
    mailingCity: string | null
    mailingState: string | null
    mailingZip: string | null
    mailingZipSuffix: string | null
    party: string | null
    gender: string | null
    DOB: Date | null
    L_T: string | null
    electionDistrict: number | null
    countyLegDistrict: string | null
    stateAssmblyDistrict: string | null
    stateSenateDistrict: string | null
    congressionalDistrict: string | null
    CC_WD_Village: string | null
    townCode: string | null
    lastUpdate: Date | null
    originalRegDate: Date | null
    statevid: string | null
    hasDiscrepancy: boolean | null
    _count: VoterRecordCountAggregateOutputType | null
    _avg: VoterRecordAvgAggregateOutputType | null
    _sum: VoterRecordSumAggregateOutputType | null
    _min: VoterRecordMinAggregateOutputType | null
    _max: VoterRecordMaxAggregateOutputType | null
  }

  type GetVoterRecordGroupByPayload<T extends VoterRecordGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<VoterRecordGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof VoterRecordGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], VoterRecordGroupByOutputType[P]>
            : GetScalarType<T[P], VoterRecordGroupByOutputType[P]>
        }
      >
    >


  export type VoterRecordSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    VRCNUM?: boolean
    committeeId?: boolean
    addressForCommittee?: boolean
    latestRecordEntryYear?: boolean
    latestRecordEntryNumber?: boolean
    lastName?: boolean
    firstName?: boolean
    middleInitial?: boolean
    suffixName?: boolean
    houseNum?: boolean
    street?: boolean
    apartment?: boolean
    halfAddress?: boolean
    resAddrLine2?: boolean
    resAddrLine3?: boolean
    city?: boolean
    state?: boolean
    zipCode?: boolean
    zipSuffix?: boolean
    telephone?: boolean
    email?: boolean
    mailingAddress1?: boolean
    mailingAddress2?: boolean
    mailingAddress3?: boolean
    mailingAddress4?: boolean
    mailingCity?: boolean
    mailingState?: boolean
    mailingZip?: boolean
    mailingZipSuffix?: boolean
    party?: boolean
    gender?: boolean
    DOB?: boolean
    L_T?: boolean
    electionDistrict?: boolean
    countyLegDistrict?: boolean
    stateAssmblyDistrict?: boolean
    stateSenateDistrict?: boolean
    congressionalDistrict?: boolean
    CC_WD_Village?: boolean
    townCode?: boolean
    lastUpdate?: boolean
    originalRegDate?: boolean
    statevid?: boolean
    hasDiscrepancy?: boolean
    votingRecords?: boolean | VoterRecord$votingRecordsArgs<ExtArgs>
    committee?: boolean | VoterRecord$committeeArgs<ExtArgs>
    addToCommitteeRequest?: boolean | VoterRecord$addToCommitteeRequestArgs<ExtArgs>
    removeFromCommitteeRequest?: boolean | VoterRecord$removeFromCommitteeRequestArgs<ExtArgs>
    _count?: boolean | VoterRecordCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["voterRecord"]>

  export type VoterRecordSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    VRCNUM?: boolean
    committeeId?: boolean
    addressForCommittee?: boolean
    latestRecordEntryYear?: boolean
    latestRecordEntryNumber?: boolean
    lastName?: boolean
    firstName?: boolean
    middleInitial?: boolean
    suffixName?: boolean
    houseNum?: boolean
    street?: boolean
    apartment?: boolean
    halfAddress?: boolean
    resAddrLine2?: boolean
    resAddrLine3?: boolean
    city?: boolean
    state?: boolean
    zipCode?: boolean
    zipSuffix?: boolean
    telephone?: boolean
    email?: boolean
    mailingAddress1?: boolean
    mailingAddress2?: boolean
    mailingAddress3?: boolean
    mailingAddress4?: boolean
    mailingCity?: boolean
    mailingState?: boolean
    mailingZip?: boolean
    mailingZipSuffix?: boolean
    party?: boolean
    gender?: boolean
    DOB?: boolean
    L_T?: boolean
    electionDistrict?: boolean
    countyLegDistrict?: boolean
    stateAssmblyDistrict?: boolean
    stateSenateDistrict?: boolean
    congressionalDistrict?: boolean
    CC_WD_Village?: boolean
    townCode?: boolean
    lastUpdate?: boolean
    originalRegDate?: boolean
    statevid?: boolean
    hasDiscrepancy?: boolean
    committee?: boolean | VoterRecord$committeeArgs<ExtArgs>
  }, ExtArgs["result"]["voterRecord"]>

  export type VoterRecordSelectScalar = {
    VRCNUM?: boolean
    committeeId?: boolean
    addressForCommittee?: boolean
    latestRecordEntryYear?: boolean
    latestRecordEntryNumber?: boolean
    lastName?: boolean
    firstName?: boolean
    middleInitial?: boolean
    suffixName?: boolean
    houseNum?: boolean
    street?: boolean
    apartment?: boolean
    halfAddress?: boolean
    resAddrLine2?: boolean
    resAddrLine3?: boolean
    city?: boolean
    state?: boolean
    zipCode?: boolean
    zipSuffix?: boolean
    telephone?: boolean
    email?: boolean
    mailingAddress1?: boolean
    mailingAddress2?: boolean
    mailingAddress3?: boolean
    mailingAddress4?: boolean
    mailingCity?: boolean
    mailingState?: boolean
    mailingZip?: boolean
    mailingZipSuffix?: boolean
    party?: boolean
    gender?: boolean
    DOB?: boolean
    L_T?: boolean
    electionDistrict?: boolean
    countyLegDistrict?: boolean
    stateAssmblyDistrict?: boolean
    stateSenateDistrict?: boolean
    congressionalDistrict?: boolean
    CC_WD_Village?: boolean
    townCode?: boolean
    lastUpdate?: boolean
    originalRegDate?: boolean
    statevid?: boolean
    hasDiscrepancy?: boolean
  }

  export type VoterRecordInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    votingRecords?: boolean | VoterRecord$votingRecordsArgs<ExtArgs>
    committee?: boolean | VoterRecord$committeeArgs<ExtArgs>
    addToCommitteeRequest?: boolean | VoterRecord$addToCommitteeRequestArgs<ExtArgs>
    removeFromCommitteeRequest?: boolean | VoterRecord$removeFromCommitteeRequestArgs<ExtArgs>
    _count?: boolean | VoterRecordCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type VoterRecordIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    committee?: boolean | VoterRecord$committeeArgs<ExtArgs>
  }

  export type $VoterRecordPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "VoterRecord"
    objects: {
      votingRecords: Prisma.$VotingHistoryRecordPayload<ExtArgs>[]
      committee: Prisma.$CommitteeListPayload<ExtArgs> | null
      addToCommitteeRequest: Prisma.$CommitteeRequestPayload<ExtArgs>[]
      removeFromCommitteeRequest: Prisma.$CommitteeRequestPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      VRCNUM: string
      committeeId: number | null
      addressForCommittee: string | null
      latestRecordEntryYear: number
      latestRecordEntryNumber: number
      lastName: string | null
      firstName: string | null
      middleInitial: string | null
      suffixName: string | null
      houseNum: number | null
      street: string | null
      apartment: string | null
      halfAddress: string | null
      resAddrLine2: string | null
      resAddrLine3: string | null
      city: string | null
      state: string | null
      zipCode: string | null
      zipSuffix: string | null
      telephone: string | null
      email: string | null
      mailingAddress1: string | null
      mailingAddress2: string | null
      mailingAddress3: string | null
      mailingAddress4: string | null
      mailingCity: string | null
      mailingState: string | null
      mailingZip: string | null
      mailingZipSuffix: string | null
      party: string | null
      gender: string | null
      DOB: Date | null
      L_T: string | null
      electionDistrict: number | null
      countyLegDistrict: string | null
      stateAssmblyDistrict: string | null
      stateSenateDistrict: string | null
      congressionalDistrict: string | null
      CC_WD_Village: string | null
      townCode: string | null
      lastUpdate: Date | null
      originalRegDate: Date | null
      statevid: string | null
      hasDiscrepancy: boolean | null
    }, ExtArgs["result"]["voterRecord"]>
    composites: {}
  }

  type VoterRecordGetPayload<S extends boolean | null | undefined | VoterRecordDefaultArgs> = $Result.GetResult<Prisma.$VoterRecordPayload, S>

  type VoterRecordCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<VoterRecordFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: VoterRecordCountAggregateInputType | true
    }

  export interface VoterRecordDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['VoterRecord'], meta: { name: 'VoterRecord' } }
    /**
     * Find zero or one VoterRecord that matches the filter.
     * @param {VoterRecordFindUniqueArgs} args - Arguments to find a VoterRecord
     * @example
     * // Get one VoterRecord
     * const voterRecord = await prisma.voterRecord.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends VoterRecordFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, VoterRecordFindUniqueArgs<ExtArgs>>
    ): Prisma__VoterRecordClient<$Result.GetResult<Prisma.$VoterRecordPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one VoterRecord that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {VoterRecordFindUniqueOrThrowArgs} args - Arguments to find a VoterRecord
     * @example
     * // Get one VoterRecord
     * const voterRecord = await prisma.voterRecord.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends VoterRecordFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, VoterRecordFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__VoterRecordClient<$Result.GetResult<Prisma.$VoterRecordPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first VoterRecord that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VoterRecordFindFirstArgs} args - Arguments to find a VoterRecord
     * @example
     * // Get one VoterRecord
     * const voterRecord = await prisma.voterRecord.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends VoterRecordFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, VoterRecordFindFirstArgs<ExtArgs>>
    ): Prisma__VoterRecordClient<$Result.GetResult<Prisma.$VoterRecordPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first VoterRecord that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VoterRecordFindFirstOrThrowArgs} args - Arguments to find a VoterRecord
     * @example
     * // Get one VoterRecord
     * const voterRecord = await prisma.voterRecord.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends VoterRecordFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, VoterRecordFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__VoterRecordClient<$Result.GetResult<Prisma.$VoterRecordPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more VoterRecords that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VoterRecordFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all VoterRecords
     * const voterRecords = await prisma.voterRecord.findMany()
     * 
     * // Get first 10 VoterRecords
     * const voterRecords = await prisma.voterRecord.findMany({ take: 10 })
     * 
     * // Only select the `VRCNUM`
     * const voterRecordWithVRCNUMOnly = await prisma.voterRecord.findMany({ select: { VRCNUM: true } })
     * 
    **/
    findMany<T extends VoterRecordFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, VoterRecordFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VoterRecordPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a VoterRecord.
     * @param {VoterRecordCreateArgs} args - Arguments to create a VoterRecord.
     * @example
     * // Create one VoterRecord
     * const VoterRecord = await prisma.voterRecord.create({
     *   data: {
     *     // ... data to create a VoterRecord
     *   }
     * })
     * 
    **/
    create<T extends VoterRecordCreateArgs<ExtArgs>>(
      args: SelectSubset<T, VoterRecordCreateArgs<ExtArgs>>
    ): Prisma__VoterRecordClient<$Result.GetResult<Prisma.$VoterRecordPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many VoterRecords.
     * @param {VoterRecordCreateManyArgs} args - Arguments to create many VoterRecords.
     * @example
     * // Create many VoterRecords
     * const voterRecord = await prisma.voterRecord.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends VoterRecordCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, VoterRecordCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many VoterRecords and returns the data saved in the database.
     * @param {VoterRecordCreateManyAndReturnArgs} args - Arguments to create many VoterRecords.
     * @example
     * // Create many VoterRecords
     * const voterRecord = await prisma.voterRecord.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many VoterRecords and only return the `VRCNUM`
     * const voterRecordWithVRCNUMOnly = await prisma.voterRecord.createManyAndReturn({ 
     *   select: { VRCNUM: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends VoterRecordCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, VoterRecordCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VoterRecordPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a VoterRecord.
     * @param {VoterRecordDeleteArgs} args - Arguments to delete one VoterRecord.
     * @example
     * // Delete one VoterRecord
     * const VoterRecord = await prisma.voterRecord.delete({
     *   where: {
     *     // ... filter to delete one VoterRecord
     *   }
     * })
     * 
    **/
    delete<T extends VoterRecordDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, VoterRecordDeleteArgs<ExtArgs>>
    ): Prisma__VoterRecordClient<$Result.GetResult<Prisma.$VoterRecordPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one VoterRecord.
     * @param {VoterRecordUpdateArgs} args - Arguments to update one VoterRecord.
     * @example
     * // Update one VoterRecord
     * const voterRecord = await prisma.voterRecord.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends VoterRecordUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, VoterRecordUpdateArgs<ExtArgs>>
    ): Prisma__VoterRecordClient<$Result.GetResult<Prisma.$VoterRecordPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more VoterRecords.
     * @param {VoterRecordDeleteManyArgs} args - Arguments to filter VoterRecords to delete.
     * @example
     * // Delete a few VoterRecords
     * const { count } = await prisma.voterRecord.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends VoterRecordDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, VoterRecordDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more VoterRecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VoterRecordUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many VoterRecords
     * const voterRecord = await prisma.voterRecord.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends VoterRecordUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, VoterRecordUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one VoterRecord.
     * @param {VoterRecordUpsertArgs} args - Arguments to update or create a VoterRecord.
     * @example
     * // Update or create a VoterRecord
     * const voterRecord = await prisma.voterRecord.upsert({
     *   create: {
     *     // ... data to create a VoterRecord
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the VoterRecord we want to update
     *   }
     * })
    **/
    upsert<T extends VoterRecordUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, VoterRecordUpsertArgs<ExtArgs>>
    ): Prisma__VoterRecordClient<$Result.GetResult<Prisma.$VoterRecordPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of VoterRecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VoterRecordCountArgs} args - Arguments to filter VoterRecords to count.
     * @example
     * // Count the number of VoterRecords
     * const count = await prisma.voterRecord.count({
     *   where: {
     *     // ... the filter for the VoterRecords we want to count
     *   }
     * })
    **/
    count<T extends VoterRecordCountArgs>(
      args?: Subset<T, VoterRecordCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], VoterRecordCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a VoterRecord.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VoterRecordAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends VoterRecordAggregateArgs>(args: Subset<T, VoterRecordAggregateArgs>): Prisma.PrismaPromise<GetVoterRecordAggregateType<T>>

    /**
     * Group by VoterRecord.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VoterRecordGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends VoterRecordGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: VoterRecordGroupByArgs['orderBy'] }
        : { orderBy?: VoterRecordGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, VoterRecordGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetVoterRecordGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the VoterRecord model
   */
  readonly fields: VoterRecordFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for VoterRecord.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__VoterRecordClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    votingRecords<T extends VoterRecord$votingRecordsArgs<ExtArgs> = {}>(args?: Subset<T, VoterRecord$votingRecordsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VotingHistoryRecordPayload<ExtArgs>, T, 'findMany'> | Null>;

    committee<T extends VoterRecord$committeeArgs<ExtArgs> = {}>(args?: Subset<T, VoterRecord$committeeArgs<ExtArgs>>): Prisma__CommitteeListClient<$Result.GetResult<Prisma.$CommitteeListPayload<ExtArgs>, T, 'findUniqueOrThrow'> | null, null, ExtArgs>;

    addToCommitteeRequest<T extends VoterRecord$addToCommitteeRequestArgs<ExtArgs> = {}>(args?: Subset<T, VoterRecord$addToCommitteeRequestArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CommitteeRequestPayload<ExtArgs>, T, 'findMany'> | Null>;

    removeFromCommitteeRequest<T extends VoterRecord$removeFromCommitteeRequestArgs<ExtArgs> = {}>(args?: Subset<T, VoterRecord$removeFromCommitteeRequestArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CommitteeRequestPayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the VoterRecord model
   */ 
  interface VoterRecordFieldRefs {
    readonly VRCNUM: FieldRef<"VoterRecord", 'String'>
    readonly committeeId: FieldRef<"VoterRecord", 'Int'>
    readonly addressForCommittee: FieldRef<"VoterRecord", 'String'>
    readonly latestRecordEntryYear: FieldRef<"VoterRecord", 'Int'>
    readonly latestRecordEntryNumber: FieldRef<"VoterRecord", 'Int'>
    readonly lastName: FieldRef<"VoterRecord", 'String'>
    readonly firstName: FieldRef<"VoterRecord", 'String'>
    readonly middleInitial: FieldRef<"VoterRecord", 'String'>
    readonly suffixName: FieldRef<"VoterRecord", 'String'>
    readonly houseNum: FieldRef<"VoterRecord", 'Int'>
    readonly street: FieldRef<"VoterRecord", 'String'>
    readonly apartment: FieldRef<"VoterRecord", 'String'>
    readonly halfAddress: FieldRef<"VoterRecord", 'String'>
    readonly resAddrLine2: FieldRef<"VoterRecord", 'String'>
    readonly resAddrLine3: FieldRef<"VoterRecord", 'String'>
    readonly city: FieldRef<"VoterRecord", 'String'>
    readonly state: FieldRef<"VoterRecord", 'String'>
    readonly zipCode: FieldRef<"VoterRecord", 'String'>
    readonly zipSuffix: FieldRef<"VoterRecord", 'String'>
    readonly telephone: FieldRef<"VoterRecord", 'String'>
    readonly email: FieldRef<"VoterRecord", 'String'>
    readonly mailingAddress1: FieldRef<"VoterRecord", 'String'>
    readonly mailingAddress2: FieldRef<"VoterRecord", 'String'>
    readonly mailingAddress3: FieldRef<"VoterRecord", 'String'>
    readonly mailingAddress4: FieldRef<"VoterRecord", 'String'>
    readonly mailingCity: FieldRef<"VoterRecord", 'String'>
    readonly mailingState: FieldRef<"VoterRecord", 'String'>
    readonly mailingZip: FieldRef<"VoterRecord", 'String'>
    readonly mailingZipSuffix: FieldRef<"VoterRecord", 'String'>
    readonly party: FieldRef<"VoterRecord", 'String'>
    readonly gender: FieldRef<"VoterRecord", 'String'>
    readonly DOB: FieldRef<"VoterRecord", 'DateTime'>
    readonly L_T: FieldRef<"VoterRecord", 'String'>
    readonly electionDistrict: FieldRef<"VoterRecord", 'Int'>
    readonly countyLegDistrict: FieldRef<"VoterRecord", 'String'>
    readonly stateAssmblyDistrict: FieldRef<"VoterRecord", 'String'>
    readonly stateSenateDistrict: FieldRef<"VoterRecord", 'String'>
    readonly congressionalDistrict: FieldRef<"VoterRecord", 'String'>
    readonly CC_WD_Village: FieldRef<"VoterRecord", 'String'>
    readonly townCode: FieldRef<"VoterRecord", 'String'>
    readonly lastUpdate: FieldRef<"VoterRecord", 'DateTime'>
    readonly originalRegDate: FieldRef<"VoterRecord", 'DateTime'>
    readonly statevid: FieldRef<"VoterRecord", 'String'>
    readonly hasDiscrepancy: FieldRef<"VoterRecord", 'Boolean'>
  }
    

  // Custom InputTypes
  /**
   * VoterRecord findUnique
   */
  export type VoterRecordFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecord
     */
    select?: VoterRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VoterRecordInclude<ExtArgs> | null
    /**
     * Filter, which VoterRecord to fetch.
     */
    where: VoterRecordWhereUniqueInput
  }

  /**
   * VoterRecord findUniqueOrThrow
   */
  export type VoterRecordFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecord
     */
    select?: VoterRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VoterRecordInclude<ExtArgs> | null
    /**
     * Filter, which VoterRecord to fetch.
     */
    where: VoterRecordWhereUniqueInput
  }

  /**
   * VoterRecord findFirst
   */
  export type VoterRecordFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecord
     */
    select?: VoterRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VoterRecordInclude<ExtArgs> | null
    /**
     * Filter, which VoterRecord to fetch.
     */
    where?: VoterRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VoterRecords to fetch.
     */
    orderBy?: VoterRecordOrderByWithRelationInput | VoterRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for VoterRecords.
     */
    cursor?: VoterRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VoterRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VoterRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of VoterRecords.
     */
    distinct?: VoterRecordScalarFieldEnum | VoterRecordScalarFieldEnum[]
  }

  /**
   * VoterRecord findFirstOrThrow
   */
  export type VoterRecordFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecord
     */
    select?: VoterRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VoterRecordInclude<ExtArgs> | null
    /**
     * Filter, which VoterRecord to fetch.
     */
    where?: VoterRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VoterRecords to fetch.
     */
    orderBy?: VoterRecordOrderByWithRelationInput | VoterRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for VoterRecords.
     */
    cursor?: VoterRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VoterRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VoterRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of VoterRecords.
     */
    distinct?: VoterRecordScalarFieldEnum | VoterRecordScalarFieldEnum[]
  }

  /**
   * VoterRecord findMany
   */
  export type VoterRecordFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecord
     */
    select?: VoterRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VoterRecordInclude<ExtArgs> | null
    /**
     * Filter, which VoterRecords to fetch.
     */
    where?: VoterRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VoterRecords to fetch.
     */
    orderBy?: VoterRecordOrderByWithRelationInput | VoterRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing VoterRecords.
     */
    cursor?: VoterRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VoterRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VoterRecords.
     */
    skip?: number
    distinct?: VoterRecordScalarFieldEnum | VoterRecordScalarFieldEnum[]
  }

  /**
   * VoterRecord create
   */
  export type VoterRecordCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecord
     */
    select?: VoterRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VoterRecordInclude<ExtArgs> | null
    /**
     * The data needed to create a VoterRecord.
     */
    data: XOR<VoterRecordCreateInput, VoterRecordUncheckedCreateInput>
  }

  /**
   * VoterRecord createMany
   */
  export type VoterRecordCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many VoterRecords.
     */
    data: VoterRecordCreateManyInput | VoterRecordCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * VoterRecord createManyAndReturn
   */
  export type VoterRecordCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecord
     */
    select?: VoterRecordSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many VoterRecords.
     */
    data: VoterRecordCreateManyInput | VoterRecordCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VoterRecordIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * VoterRecord update
   */
  export type VoterRecordUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecord
     */
    select?: VoterRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VoterRecordInclude<ExtArgs> | null
    /**
     * The data needed to update a VoterRecord.
     */
    data: XOR<VoterRecordUpdateInput, VoterRecordUncheckedUpdateInput>
    /**
     * Choose, which VoterRecord to update.
     */
    where: VoterRecordWhereUniqueInput
  }

  /**
   * VoterRecord updateMany
   */
  export type VoterRecordUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update VoterRecords.
     */
    data: XOR<VoterRecordUpdateManyMutationInput, VoterRecordUncheckedUpdateManyInput>
    /**
     * Filter which VoterRecords to update
     */
    where?: VoterRecordWhereInput
  }

  /**
   * VoterRecord upsert
   */
  export type VoterRecordUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecord
     */
    select?: VoterRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VoterRecordInclude<ExtArgs> | null
    /**
     * The filter to search for the VoterRecord to update in case it exists.
     */
    where: VoterRecordWhereUniqueInput
    /**
     * In case the VoterRecord found by the `where` argument doesn't exist, create a new VoterRecord with this data.
     */
    create: XOR<VoterRecordCreateInput, VoterRecordUncheckedCreateInput>
    /**
     * In case the VoterRecord was found with the provided `where` argument, update it with this data.
     */
    update: XOR<VoterRecordUpdateInput, VoterRecordUncheckedUpdateInput>
  }

  /**
   * VoterRecord delete
   */
  export type VoterRecordDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecord
     */
    select?: VoterRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VoterRecordInclude<ExtArgs> | null
    /**
     * Filter which VoterRecord to delete.
     */
    where: VoterRecordWhereUniqueInput
  }

  /**
   * VoterRecord deleteMany
   */
  export type VoterRecordDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which VoterRecords to delete
     */
    where?: VoterRecordWhereInput
  }

  /**
   * VoterRecord.votingRecords
   */
  export type VoterRecord$votingRecordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VotingHistoryRecord
     */
    select?: VotingHistoryRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VotingHistoryRecordInclude<ExtArgs> | null
    where?: VotingHistoryRecordWhereInput
    orderBy?: VotingHistoryRecordOrderByWithRelationInput | VotingHistoryRecordOrderByWithRelationInput[]
    cursor?: VotingHistoryRecordWhereUniqueInput
    take?: number
    skip?: number
    distinct?: VotingHistoryRecordScalarFieldEnum | VotingHistoryRecordScalarFieldEnum[]
  }

  /**
   * VoterRecord.committee
   */
  export type VoterRecord$committeeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeList
     */
    select?: CommitteeListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeListInclude<ExtArgs> | null
    where?: CommitteeListWhereInput
  }

  /**
   * VoterRecord.addToCommitteeRequest
   */
  export type VoterRecord$addToCommitteeRequestArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeRequest
     */
    select?: CommitteeRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeRequestInclude<ExtArgs> | null
    where?: CommitteeRequestWhereInput
    orderBy?: CommitteeRequestOrderByWithRelationInput | CommitteeRequestOrderByWithRelationInput[]
    cursor?: CommitteeRequestWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CommitteeRequestScalarFieldEnum | CommitteeRequestScalarFieldEnum[]
  }

  /**
   * VoterRecord.removeFromCommitteeRequest
   */
  export type VoterRecord$removeFromCommitteeRequestArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeRequest
     */
    select?: CommitteeRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeRequestInclude<ExtArgs> | null
    where?: CommitteeRequestWhereInput
    orderBy?: CommitteeRequestOrderByWithRelationInput | CommitteeRequestOrderByWithRelationInput[]
    cursor?: CommitteeRequestWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CommitteeRequestScalarFieldEnum | CommitteeRequestScalarFieldEnum[]
  }

  /**
   * VoterRecord without action
   */
  export type VoterRecordDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecord
     */
    select?: VoterRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VoterRecordInclude<ExtArgs> | null
  }


  /**
   * Model VotingHistoryRecord
   */

  export type AggregateVotingHistoryRecord = {
    _count: VotingHistoryRecordCountAggregateOutputType | null
    _avg: VotingHistoryRecordAvgAggregateOutputType | null
    _sum: VotingHistoryRecordSumAggregateOutputType | null
    _min: VotingHistoryRecordMinAggregateOutputType | null
    _max: VotingHistoryRecordMaxAggregateOutputType | null
  }

  export type VotingHistoryRecordAvgAggregateOutputType = {
    id: number | null
  }

  export type VotingHistoryRecordSumAggregateOutputType = {
    id: number | null
  }

  export type VotingHistoryRecordMinAggregateOutputType = {
    id: number | null
    voterRecordId: string | null
    date: Date | null
    value: string | null
  }

  export type VotingHistoryRecordMaxAggregateOutputType = {
    id: number | null
    voterRecordId: string | null
    date: Date | null
    value: string | null
  }

  export type VotingHistoryRecordCountAggregateOutputType = {
    id: number
    voterRecordId: number
    date: number
    value: number
    _all: number
  }


  export type VotingHistoryRecordAvgAggregateInputType = {
    id?: true
  }

  export type VotingHistoryRecordSumAggregateInputType = {
    id?: true
  }

  export type VotingHistoryRecordMinAggregateInputType = {
    id?: true
    voterRecordId?: true
    date?: true
    value?: true
  }

  export type VotingHistoryRecordMaxAggregateInputType = {
    id?: true
    voterRecordId?: true
    date?: true
    value?: true
  }

  export type VotingHistoryRecordCountAggregateInputType = {
    id?: true
    voterRecordId?: true
    date?: true
    value?: true
    _all?: true
  }

  export type VotingHistoryRecordAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which VotingHistoryRecord to aggregate.
     */
    where?: VotingHistoryRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VotingHistoryRecords to fetch.
     */
    orderBy?: VotingHistoryRecordOrderByWithRelationInput | VotingHistoryRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: VotingHistoryRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VotingHistoryRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VotingHistoryRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned VotingHistoryRecords
    **/
    _count?: true | VotingHistoryRecordCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: VotingHistoryRecordAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: VotingHistoryRecordSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: VotingHistoryRecordMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: VotingHistoryRecordMaxAggregateInputType
  }

  export type GetVotingHistoryRecordAggregateType<T extends VotingHistoryRecordAggregateArgs> = {
        [P in keyof T & keyof AggregateVotingHistoryRecord]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateVotingHistoryRecord[P]>
      : GetScalarType<T[P], AggregateVotingHistoryRecord[P]>
  }




  export type VotingHistoryRecordGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VotingHistoryRecordWhereInput
    orderBy?: VotingHistoryRecordOrderByWithAggregationInput | VotingHistoryRecordOrderByWithAggregationInput[]
    by: VotingHistoryRecordScalarFieldEnum[] | VotingHistoryRecordScalarFieldEnum
    having?: VotingHistoryRecordScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: VotingHistoryRecordCountAggregateInputType | true
    _avg?: VotingHistoryRecordAvgAggregateInputType
    _sum?: VotingHistoryRecordSumAggregateInputType
    _min?: VotingHistoryRecordMinAggregateInputType
    _max?: VotingHistoryRecordMaxAggregateInputType
  }

  export type VotingHistoryRecordGroupByOutputType = {
    id: number
    voterRecordId: string
    date: Date
    value: string
    _count: VotingHistoryRecordCountAggregateOutputType | null
    _avg: VotingHistoryRecordAvgAggregateOutputType | null
    _sum: VotingHistoryRecordSumAggregateOutputType | null
    _min: VotingHistoryRecordMinAggregateOutputType | null
    _max: VotingHistoryRecordMaxAggregateOutputType | null
  }

  type GetVotingHistoryRecordGroupByPayload<T extends VotingHistoryRecordGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<VotingHistoryRecordGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof VotingHistoryRecordGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], VotingHistoryRecordGroupByOutputType[P]>
            : GetScalarType<T[P], VotingHistoryRecordGroupByOutputType[P]>
        }
      >
    >


  export type VotingHistoryRecordSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    voterRecordId?: boolean
    date?: boolean
    value?: boolean
    voterRecord?: boolean | VoterRecordDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["votingHistoryRecord"]>

  export type VotingHistoryRecordSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    voterRecordId?: boolean
    date?: boolean
    value?: boolean
    voterRecord?: boolean | VoterRecordDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["votingHistoryRecord"]>

  export type VotingHistoryRecordSelectScalar = {
    id?: boolean
    voterRecordId?: boolean
    date?: boolean
    value?: boolean
  }

  export type VotingHistoryRecordInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    voterRecord?: boolean | VoterRecordDefaultArgs<ExtArgs>
  }
  export type VotingHistoryRecordIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    voterRecord?: boolean | VoterRecordDefaultArgs<ExtArgs>
  }

  export type $VotingHistoryRecordPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "VotingHistoryRecord"
    objects: {
      voterRecord: Prisma.$VoterRecordPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      voterRecordId: string
      date: Date
      value: string
    }, ExtArgs["result"]["votingHistoryRecord"]>
    composites: {}
  }

  type VotingHistoryRecordGetPayload<S extends boolean | null | undefined | VotingHistoryRecordDefaultArgs> = $Result.GetResult<Prisma.$VotingHistoryRecordPayload, S>

  type VotingHistoryRecordCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<VotingHistoryRecordFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: VotingHistoryRecordCountAggregateInputType | true
    }

  export interface VotingHistoryRecordDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['VotingHistoryRecord'], meta: { name: 'VotingHistoryRecord' } }
    /**
     * Find zero or one VotingHistoryRecord that matches the filter.
     * @param {VotingHistoryRecordFindUniqueArgs} args - Arguments to find a VotingHistoryRecord
     * @example
     * // Get one VotingHistoryRecord
     * const votingHistoryRecord = await prisma.votingHistoryRecord.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends VotingHistoryRecordFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, VotingHistoryRecordFindUniqueArgs<ExtArgs>>
    ): Prisma__VotingHistoryRecordClient<$Result.GetResult<Prisma.$VotingHistoryRecordPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one VotingHistoryRecord that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {VotingHistoryRecordFindUniqueOrThrowArgs} args - Arguments to find a VotingHistoryRecord
     * @example
     * // Get one VotingHistoryRecord
     * const votingHistoryRecord = await prisma.votingHistoryRecord.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends VotingHistoryRecordFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, VotingHistoryRecordFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__VotingHistoryRecordClient<$Result.GetResult<Prisma.$VotingHistoryRecordPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first VotingHistoryRecord that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VotingHistoryRecordFindFirstArgs} args - Arguments to find a VotingHistoryRecord
     * @example
     * // Get one VotingHistoryRecord
     * const votingHistoryRecord = await prisma.votingHistoryRecord.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends VotingHistoryRecordFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, VotingHistoryRecordFindFirstArgs<ExtArgs>>
    ): Prisma__VotingHistoryRecordClient<$Result.GetResult<Prisma.$VotingHistoryRecordPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first VotingHistoryRecord that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VotingHistoryRecordFindFirstOrThrowArgs} args - Arguments to find a VotingHistoryRecord
     * @example
     * // Get one VotingHistoryRecord
     * const votingHistoryRecord = await prisma.votingHistoryRecord.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends VotingHistoryRecordFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, VotingHistoryRecordFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__VotingHistoryRecordClient<$Result.GetResult<Prisma.$VotingHistoryRecordPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more VotingHistoryRecords that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VotingHistoryRecordFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all VotingHistoryRecords
     * const votingHistoryRecords = await prisma.votingHistoryRecord.findMany()
     * 
     * // Get first 10 VotingHistoryRecords
     * const votingHistoryRecords = await prisma.votingHistoryRecord.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const votingHistoryRecordWithIdOnly = await prisma.votingHistoryRecord.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends VotingHistoryRecordFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, VotingHistoryRecordFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VotingHistoryRecordPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a VotingHistoryRecord.
     * @param {VotingHistoryRecordCreateArgs} args - Arguments to create a VotingHistoryRecord.
     * @example
     * // Create one VotingHistoryRecord
     * const VotingHistoryRecord = await prisma.votingHistoryRecord.create({
     *   data: {
     *     // ... data to create a VotingHistoryRecord
     *   }
     * })
     * 
    **/
    create<T extends VotingHistoryRecordCreateArgs<ExtArgs>>(
      args: SelectSubset<T, VotingHistoryRecordCreateArgs<ExtArgs>>
    ): Prisma__VotingHistoryRecordClient<$Result.GetResult<Prisma.$VotingHistoryRecordPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many VotingHistoryRecords.
     * @param {VotingHistoryRecordCreateManyArgs} args - Arguments to create many VotingHistoryRecords.
     * @example
     * // Create many VotingHistoryRecords
     * const votingHistoryRecord = await prisma.votingHistoryRecord.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends VotingHistoryRecordCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, VotingHistoryRecordCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many VotingHistoryRecords and returns the data saved in the database.
     * @param {VotingHistoryRecordCreateManyAndReturnArgs} args - Arguments to create many VotingHistoryRecords.
     * @example
     * // Create many VotingHistoryRecords
     * const votingHistoryRecord = await prisma.votingHistoryRecord.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many VotingHistoryRecords and only return the `id`
     * const votingHistoryRecordWithIdOnly = await prisma.votingHistoryRecord.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends VotingHistoryRecordCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, VotingHistoryRecordCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VotingHistoryRecordPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a VotingHistoryRecord.
     * @param {VotingHistoryRecordDeleteArgs} args - Arguments to delete one VotingHistoryRecord.
     * @example
     * // Delete one VotingHistoryRecord
     * const VotingHistoryRecord = await prisma.votingHistoryRecord.delete({
     *   where: {
     *     // ... filter to delete one VotingHistoryRecord
     *   }
     * })
     * 
    **/
    delete<T extends VotingHistoryRecordDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, VotingHistoryRecordDeleteArgs<ExtArgs>>
    ): Prisma__VotingHistoryRecordClient<$Result.GetResult<Prisma.$VotingHistoryRecordPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one VotingHistoryRecord.
     * @param {VotingHistoryRecordUpdateArgs} args - Arguments to update one VotingHistoryRecord.
     * @example
     * // Update one VotingHistoryRecord
     * const votingHistoryRecord = await prisma.votingHistoryRecord.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends VotingHistoryRecordUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, VotingHistoryRecordUpdateArgs<ExtArgs>>
    ): Prisma__VotingHistoryRecordClient<$Result.GetResult<Prisma.$VotingHistoryRecordPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more VotingHistoryRecords.
     * @param {VotingHistoryRecordDeleteManyArgs} args - Arguments to filter VotingHistoryRecords to delete.
     * @example
     * // Delete a few VotingHistoryRecords
     * const { count } = await prisma.votingHistoryRecord.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends VotingHistoryRecordDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, VotingHistoryRecordDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more VotingHistoryRecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VotingHistoryRecordUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many VotingHistoryRecords
     * const votingHistoryRecord = await prisma.votingHistoryRecord.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends VotingHistoryRecordUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, VotingHistoryRecordUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one VotingHistoryRecord.
     * @param {VotingHistoryRecordUpsertArgs} args - Arguments to update or create a VotingHistoryRecord.
     * @example
     * // Update or create a VotingHistoryRecord
     * const votingHistoryRecord = await prisma.votingHistoryRecord.upsert({
     *   create: {
     *     // ... data to create a VotingHistoryRecord
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the VotingHistoryRecord we want to update
     *   }
     * })
    **/
    upsert<T extends VotingHistoryRecordUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, VotingHistoryRecordUpsertArgs<ExtArgs>>
    ): Prisma__VotingHistoryRecordClient<$Result.GetResult<Prisma.$VotingHistoryRecordPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of VotingHistoryRecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VotingHistoryRecordCountArgs} args - Arguments to filter VotingHistoryRecords to count.
     * @example
     * // Count the number of VotingHistoryRecords
     * const count = await prisma.votingHistoryRecord.count({
     *   where: {
     *     // ... the filter for the VotingHistoryRecords we want to count
     *   }
     * })
    **/
    count<T extends VotingHistoryRecordCountArgs>(
      args?: Subset<T, VotingHistoryRecordCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], VotingHistoryRecordCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a VotingHistoryRecord.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VotingHistoryRecordAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends VotingHistoryRecordAggregateArgs>(args: Subset<T, VotingHistoryRecordAggregateArgs>): Prisma.PrismaPromise<GetVotingHistoryRecordAggregateType<T>>

    /**
     * Group by VotingHistoryRecord.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VotingHistoryRecordGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends VotingHistoryRecordGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: VotingHistoryRecordGroupByArgs['orderBy'] }
        : { orderBy?: VotingHistoryRecordGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, VotingHistoryRecordGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetVotingHistoryRecordGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the VotingHistoryRecord model
   */
  readonly fields: VotingHistoryRecordFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for VotingHistoryRecord.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__VotingHistoryRecordClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    voterRecord<T extends VoterRecordDefaultArgs<ExtArgs> = {}>(args?: Subset<T, VoterRecordDefaultArgs<ExtArgs>>): Prisma__VoterRecordClient<$Result.GetResult<Prisma.$VoterRecordPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the VotingHistoryRecord model
   */ 
  interface VotingHistoryRecordFieldRefs {
    readonly id: FieldRef<"VotingHistoryRecord", 'Int'>
    readonly voterRecordId: FieldRef<"VotingHistoryRecord", 'String'>
    readonly date: FieldRef<"VotingHistoryRecord", 'DateTime'>
    readonly value: FieldRef<"VotingHistoryRecord", 'String'>
  }
    

  // Custom InputTypes
  /**
   * VotingHistoryRecord findUnique
   */
  export type VotingHistoryRecordFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VotingHistoryRecord
     */
    select?: VotingHistoryRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VotingHistoryRecordInclude<ExtArgs> | null
    /**
     * Filter, which VotingHistoryRecord to fetch.
     */
    where: VotingHistoryRecordWhereUniqueInput
  }

  /**
   * VotingHistoryRecord findUniqueOrThrow
   */
  export type VotingHistoryRecordFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VotingHistoryRecord
     */
    select?: VotingHistoryRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VotingHistoryRecordInclude<ExtArgs> | null
    /**
     * Filter, which VotingHistoryRecord to fetch.
     */
    where: VotingHistoryRecordWhereUniqueInput
  }

  /**
   * VotingHistoryRecord findFirst
   */
  export type VotingHistoryRecordFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VotingHistoryRecord
     */
    select?: VotingHistoryRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VotingHistoryRecordInclude<ExtArgs> | null
    /**
     * Filter, which VotingHistoryRecord to fetch.
     */
    where?: VotingHistoryRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VotingHistoryRecords to fetch.
     */
    orderBy?: VotingHistoryRecordOrderByWithRelationInput | VotingHistoryRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for VotingHistoryRecords.
     */
    cursor?: VotingHistoryRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VotingHistoryRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VotingHistoryRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of VotingHistoryRecords.
     */
    distinct?: VotingHistoryRecordScalarFieldEnum | VotingHistoryRecordScalarFieldEnum[]
  }

  /**
   * VotingHistoryRecord findFirstOrThrow
   */
  export type VotingHistoryRecordFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VotingHistoryRecord
     */
    select?: VotingHistoryRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VotingHistoryRecordInclude<ExtArgs> | null
    /**
     * Filter, which VotingHistoryRecord to fetch.
     */
    where?: VotingHistoryRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VotingHistoryRecords to fetch.
     */
    orderBy?: VotingHistoryRecordOrderByWithRelationInput | VotingHistoryRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for VotingHistoryRecords.
     */
    cursor?: VotingHistoryRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VotingHistoryRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VotingHistoryRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of VotingHistoryRecords.
     */
    distinct?: VotingHistoryRecordScalarFieldEnum | VotingHistoryRecordScalarFieldEnum[]
  }

  /**
   * VotingHistoryRecord findMany
   */
  export type VotingHistoryRecordFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VotingHistoryRecord
     */
    select?: VotingHistoryRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VotingHistoryRecordInclude<ExtArgs> | null
    /**
     * Filter, which VotingHistoryRecords to fetch.
     */
    where?: VotingHistoryRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VotingHistoryRecords to fetch.
     */
    orderBy?: VotingHistoryRecordOrderByWithRelationInput | VotingHistoryRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing VotingHistoryRecords.
     */
    cursor?: VotingHistoryRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VotingHistoryRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VotingHistoryRecords.
     */
    skip?: number
    distinct?: VotingHistoryRecordScalarFieldEnum | VotingHistoryRecordScalarFieldEnum[]
  }

  /**
   * VotingHistoryRecord create
   */
  export type VotingHistoryRecordCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VotingHistoryRecord
     */
    select?: VotingHistoryRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VotingHistoryRecordInclude<ExtArgs> | null
    /**
     * The data needed to create a VotingHistoryRecord.
     */
    data: XOR<VotingHistoryRecordCreateInput, VotingHistoryRecordUncheckedCreateInput>
  }

  /**
   * VotingHistoryRecord createMany
   */
  export type VotingHistoryRecordCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many VotingHistoryRecords.
     */
    data: VotingHistoryRecordCreateManyInput | VotingHistoryRecordCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * VotingHistoryRecord createManyAndReturn
   */
  export type VotingHistoryRecordCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VotingHistoryRecord
     */
    select?: VotingHistoryRecordSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many VotingHistoryRecords.
     */
    data: VotingHistoryRecordCreateManyInput | VotingHistoryRecordCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VotingHistoryRecordIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * VotingHistoryRecord update
   */
  export type VotingHistoryRecordUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VotingHistoryRecord
     */
    select?: VotingHistoryRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VotingHistoryRecordInclude<ExtArgs> | null
    /**
     * The data needed to update a VotingHistoryRecord.
     */
    data: XOR<VotingHistoryRecordUpdateInput, VotingHistoryRecordUncheckedUpdateInput>
    /**
     * Choose, which VotingHistoryRecord to update.
     */
    where: VotingHistoryRecordWhereUniqueInput
  }

  /**
   * VotingHistoryRecord updateMany
   */
  export type VotingHistoryRecordUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update VotingHistoryRecords.
     */
    data: XOR<VotingHistoryRecordUpdateManyMutationInput, VotingHistoryRecordUncheckedUpdateManyInput>
    /**
     * Filter which VotingHistoryRecords to update
     */
    where?: VotingHistoryRecordWhereInput
  }

  /**
   * VotingHistoryRecord upsert
   */
  export type VotingHistoryRecordUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VotingHistoryRecord
     */
    select?: VotingHistoryRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VotingHistoryRecordInclude<ExtArgs> | null
    /**
     * The filter to search for the VotingHistoryRecord to update in case it exists.
     */
    where: VotingHistoryRecordWhereUniqueInput
    /**
     * In case the VotingHistoryRecord found by the `where` argument doesn't exist, create a new VotingHistoryRecord with this data.
     */
    create: XOR<VotingHistoryRecordCreateInput, VotingHistoryRecordUncheckedCreateInput>
    /**
     * In case the VotingHistoryRecord was found with the provided `where` argument, update it with this data.
     */
    update: XOR<VotingHistoryRecordUpdateInput, VotingHistoryRecordUncheckedUpdateInput>
  }

  /**
   * VotingHistoryRecord delete
   */
  export type VotingHistoryRecordDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VotingHistoryRecord
     */
    select?: VotingHistoryRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VotingHistoryRecordInclude<ExtArgs> | null
    /**
     * Filter which VotingHistoryRecord to delete.
     */
    where: VotingHistoryRecordWhereUniqueInput
  }

  /**
   * VotingHistoryRecord deleteMany
   */
  export type VotingHistoryRecordDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which VotingHistoryRecords to delete
     */
    where?: VotingHistoryRecordWhereInput
  }

  /**
   * VotingHistoryRecord without action
   */
  export type VotingHistoryRecordDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VotingHistoryRecord
     */
    select?: VotingHistoryRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VotingHistoryRecordInclude<ExtArgs> | null
  }


  /**
   * Model CommitteeList
   */

  export type AggregateCommitteeList = {
    _count: CommitteeListCountAggregateOutputType | null
    _avg: CommitteeListAvgAggregateOutputType | null
    _sum: CommitteeListSumAggregateOutputType | null
    _min: CommitteeListMinAggregateOutputType | null
    _max: CommitteeListMaxAggregateOutputType | null
  }

  export type CommitteeListAvgAggregateOutputType = {
    id: number | null
    legDistrict: number | null
    electionDistrict: number | null
  }

  export type CommitteeListSumAggregateOutputType = {
    id: number | null
    legDistrict: number | null
    electionDistrict: number | null
  }

  export type CommitteeListMinAggregateOutputType = {
    id: number | null
    cityTown: string | null
    legDistrict: number | null
    electionDistrict: number | null
  }

  export type CommitteeListMaxAggregateOutputType = {
    id: number | null
    cityTown: string | null
    legDistrict: number | null
    electionDistrict: number | null
  }

  export type CommitteeListCountAggregateOutputType = {
    id: number
    cityTown: number
    legDistrict: number
    electionDistrict: number
    _all: number
  }


  export type CommitteeListAvgAggregateInputType = {
    id?: true
    legDistrict?: true
    electionDistrict?: true
  }

  export type CommitteeListSumAggregateInputType = {
    id?: true
    legDistrict?: true
    electionDistrict?: true
  }

  export type CommitteeListMinAggregateInputType = {
    id?: true
    cityTown?: true
    legDistrict?: true
    electionDistrict?: true
  }

  export type CommitteeListMaxAggregateInputType = {
    id?: true
    cityTown?: true
    legDistrict?: true
    electionDistrict?: true
  }

  export type CommitteeListCountAggregateInputType = {
    id?: true
    cityTown?: true
    legDistrict?: true
    electionDistrict?: true
    _all?: true
  }

  export type CommitteeListAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CommitteeList to aggregate.
     */
    where?: CommitteeListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CommitteeLists to fetch.
     */
    orderBy?: CommitteeListOrderByWithRelationInput | CommitteeListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CommitteeListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CommitteeLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CommitteeLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CommitteeLists
    **/
    _count?: true | CommitteeListCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CommitteeListAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CommitteeListSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CommitteeListMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CommitteeListMaxAggregateInputType
  }

  export type GetCommitteeListAggregateType<T extends CommitteeListAggregateArgs> = {
        [P in keyof T & keyof AggregateCommitteeList]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCommitteeList[P]>
      : GetScalarType<T[P], AggregateCommitteeList[P]>
  }




  export type CommitteeListGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CommitteeListWhereInput
    orderBy?: CommitteeListOrderByWithAggregationInput | CommitteeListOrderByWithAggregationInput[]
    by: CommitteeListScalarFieldEnum[] | CommitteeListScalarFieldEnum
    having?: CommitteeListScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CommitteeListCountAggregateInputType | true
    _avg?: CommitteeListAvgAggregateInputType
    _sum?: CommitteeListSumAggregateInputType
    _min?: CommitteeListMinAggregateInputType
    _max?: CommitteeListMaxAggregateInputType
  }

  export type CommitteeListGroupByOutputType = {
    id: number
    cityTown: string
    legDistrict: number
    electionDistrict: number
    _count: CommitteeListCountAggregateOutputType | null
    _avg: CommitteeListAvgAggregateOutputType | null
    _sum: CommitteeListSumAggregateOutputType | null
    _min: CommitteeListMinAggregateOutputType | null
    _max: CommitteeListMaxAggregateOutputType | null
  }

  type GetCommitteeListGroupByPayload<T extends CommitteeListGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CommitteeListGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CommitteeListGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CommitteeListGroupByOutputType[P]>
            : GetScalarType<T[P], CommitteeListGroupByOutputType[P]>
        }
      >
    >


  export type CommitteeListSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    cityTown?: boolean
    legDistrict?: boolean
    electionDistrict?: boolean
    committeeMemberList?: boolean | CommitteeList$committeeMemberListArgs<ExtArgs>
    CommitteeRequest?: boolean | CommitteeList$CommitteeRequestArgs<ExtArgs>
    CommitteeDiscrepancyRecords?: boolean | CommitteeList$CommitteeDiscrepancyRecordsArgs<ExtArgs>
    _count?: boolean | CommitteeListCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["committeeList"]>

  export type CommitteeListSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    cityTown?: boolean
    legDistrict?: boolean
    electionDistrict?: boolean
  }, ExtArgs["result"]["committeeList"]>

  export type CommitteeListSelectScalar = {
    id?: boolean
    cityTown?: boolean
    legDistrict?: boolean
    electionDistrict?: boolean
  }

  export type CommitteeListInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    committeeMemberList?: boolean | CommitteeList$committeeMemberListArgs<ExtArgs>
    CommitteeRequest?: boolean | CommitteeList$CommitteeRequestArgs<ExtArgs>
    CommitteeDiscrepancyRecords?: boolean | CommitteeList$CommitteeDiscrepancyRecordsArgs<ExtArgs>
    _count?: boolean | CommitteeListCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type CommitteeListIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $CommitteeListPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CommitteeList"
    objects: {
      committeeMemberList: Prisma.$VoterRecordPayload<ExtArgs>[]
      CommitteeRequest: Prisma.$CommitteeRequestPayload<ExtArgs>[]
      CommitteeDiscrepancyRecords: Prisma.$CommitteeUploadDiscrepancyPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      cityTown: string
      legDistrict: number
      electionDistrict: number
    }, ExtArgs["result"]["committeeList"]>
    composites: {}
  }

  type CommitteeListGetPayload<S extends boolean | null | undefined | CommitteeListDefaultArgs> = $Result.GetResult<Prisma.$CommitteeListPayload, S>

  type CommitteeListCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<CommitteeListFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: CommitteeListCountAggregateInputType | true
    }

  export interface CommitteeListDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CommitteeList'], meta: { name: 'CommitteeList' } }
    /**
     * Find zero or one CommitteeList that matches the filter.
     * @param {CommitteeListFindUniqueArgs} args - Arguments to find a CommitteeList
     * @example
     * // Get one CommitteeList
     * const committeeList = await prisma.committeeList.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends CommitteeListFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeListFindUniqueArgs<ExtArgs>>
    ): Prisma__CommitteeListClient<$Result.GetResult<Prisma.$CommitteeListPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one CommitteeList that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {CommitteeListFindUniqueOrThrowArgs} args - Arguments to find a CommitteeList
     * @example
     * // Get one CommitteeList
     * const committeeList = await prisma.committeeList.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends CommitteeListFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeListFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__CommitteeListClient<$Result.GetResult<Prisma.$CommitteeListPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first CommitteeList that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeListFindFirstArgs} args - Arguments to find a CommitteeList
     * @example
     * // Get one CommitteeList
     * const committeeList = await prisma.committeeList.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends CommitteeListFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeListFindFirstArgs<ExtArgs>>
    ): Prisma__CommitteeListClient<$Result.GetResult<Prisma.$CommitteeListPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first CommitteeList that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeListFindFirstOrThrowArgs} args - Arguments to find a CommitteeList
     * @example
     * // Get one CommitteeList
     * const committeeList = await prisma.committeeList.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends CommitteeListFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeListFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__CommitteeListClient<$Result.GetResult<Prisma.$CommitteeListPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more CommitteeLists that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeListFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CommitteeLists
     * const committeeLists = await prisma.committeeList.findMany()
     * 
     * // Get first 10 CommitteeLists
     * const committeeLists = await prisma.committeeList.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const committeeListWithIdOnly = await prisma.committeeList.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends CommitteeListFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeListFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CommitteeListPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a CommitteeList.
     * @param {CommitteeListCreateArgs} args - Arguments to create a CommitteeList.
     * @example
     * // Create one CommitteeList
     * const CommitteeList = await prisma.committeeList.create({
     *   data: {
     *     // ... data to create a CommitteeList
     *   }
     * })
     * 
    **/
    create<T extends CommitteeListCreateArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeListCreateArgs<ExtArgs>>
    ): Prisma__CommitteeListClient<$Result.GetResult<Prisma.$CommitteeListPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many CommitteeLists.
     * @param {CommitteeListCreateManyArgs} args - Arguments to create many CommitteeLists.
     * @example
     * // Create many CommitteeLists
     * const committeeList = await prisma.committeeList.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends CommitteeListCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeListCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CommitteeLists and returns the data saved in the database.
     * @param {CommitteeListCreateManyAndReturnArgs} args - Arguments to create many CommitteeLists.
     * @example
     * // Create many CommitteeLists
     * const committeeList = await prisma.committeeList.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CommitteeLists and only return the `id`
     * const committeeListWithIdOnly = await prisma.committeeList.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends CommitteeListCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeListCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CommitteeListPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a CommitteeList.
     * @param {CommitteeListDeleteArgs} args - Arguments to delete one CommitteeList.
     * @example
     * // Delete one CommitteeList
     * const CommitteeList = await prisma.committeeList.delete({
     *   where: {
     *     // ... filter to delete one CommitteeList
     *   }
     * })
     * 
    **/
    delete<T extends CommitteeListDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeListDeleteArgs<ExtArgs>>
    ): Prisma__CommitteeListClient<$Result.GetResult<Prisma.$CommitteeListPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one CommitteeList.
     * @param {CommitteeListUpdateArgs} args - Arguments to update one CommitteeList.
     * @example
     * // Update one CommitteeList
     * const committeeList = await prisma.committeeList.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends CommitteeListUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeListUpdateArgs<ExtArgs>>
    ): Prisma__CommitteeListClient<$Result.GetResult<Prisma.$CommitteeListPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more CommitteeLists.
     * @param {CommitteeListDeleteManyArgs} args - Arguments to filter CommitteeLists to delete.
     * @example
     * // Delete a few CommitteeLists
     * const { count } = await prisma.committeeList.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends CommitteeListDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeListDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CommitteeLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeListUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CommitteeLists
     * const committeeList = await prisma.committeeList.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends CommitteeListUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeListUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one CommitteeList.
     * @param {CommitteeListUpsertArgs} args - Arguments to update or create a CommitteeList.
     * @example
     * // Update or create a CommitteeList
     * const committeeList = await prisma.committeeList.upsert({
     *   create: {
     *     // ... data to create a CommitteeList
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CommitteeList we want to update
     *   }
     * })
    **/
    upsert<T extends CommitteeListUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeListUpsertArgs<ExtArgs>>
    ): Prisma__CommitteeListClient<$Result.GetResult<Prisma.$CommitteeListPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of CommitteeLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeListCountArgs} args - Arguments to filter CommitteeLists to count.
     * @example
     * // Count the number of CommitteeLists
     * const count = await prisma.committeeList.count({
     *   where: {
     *     // ... the filter for the CommitteeLists we want to count
     *   }
     * })
    **/
    count<T extends CommitteeListCountArgs>(
      args?: Subset<T, CommitteeListCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CommitteeListCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CommitteeList.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeListAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CommitteeListAggregateArgs>(args: Subset<T, CommitteeListAggregateArgs>): Prisma.PrismaPromise<GetCommitteeListAggregateType<T>>

    /**
     * Group by CommitteeList.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeListGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CommitteeListGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CommitteeListGroupByArgs['orderBy'] }
        : { orderBy?: CommitteeListGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CommitteeListGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCommitteeListGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CommitteeList model
   */
  readonly fields: CommitteeListFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CommitteeList.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CommitteeListClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    committeeMemberList<T extends CommitteeList$committeeMemberListArgs<ExtArgs> = {}>(args?: Subset<T, CommitteeList$committeeMemberListArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VoterRecordPayload<ExtArgs>, T, 'findMany'> | Null>;

    CommitteeRequest<T extends CommitteeList$CommitteeRequestArgs<ExtArgs> = {}>(args?: Subset<T, CommitteeList$CommitteeRequestArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CommitteeRequestPayload<ExtArgs>, T, 'findMany'> | Null>;

    CommitteeDiscrepancyRecords<T extends CommitteeList$CommitteeDiscrepancyRecordsArgs<ExtArgs> = {}>(args?: Subset<T, CommitteeList$CommitteeDiscrepancyRecordsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CommitteeUploadDiscrepancyPayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the CommitteeList model
   */ 
  interface CommitteeListFieldRefs {
    readonly id: FieldRef<"CommitteeList", 'Int'>
    readonly cityTown: FieldRef<"CommitteeList", 'String'>
    readonly legDistrict: FieldRef<"CommitteeList", 'Int'>
    readonly electionDistrict: FieldRef<"CommitteeList", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * CommitteeList findUnique
   */
  export type CommitteeListFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeList
     */
    select?: CommitteeListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeListInclude<ExtArgs> | null
    /**
     * Filter, which CommitteeList to fetch.
     */
    where: CommitteeListWhereUniqueInput
  }

  /**
   * CommitteeList findUniqueOrThrow
   */
  export type CommitteeListFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeList
     */
    select?: CommitteeListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeListInclude<ExtArgs> | null
    /**
     * Filter, which CommitteeList to fetch.
     */
    where: CommitteeListWhereUniqueInput
  }

  /**
   * CommitteeList findFirst
   */
  export type CommitteeListFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeList
     */
    select?: CommitteeListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeListInclude<ExtArgs> | null
    /**
     * Filter, which CommitteeList to fetch.
     */
    where?: CommitteeListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CommitteeLists to fetch.
     */
    orderBy?: CommitteeListOrderByWithRelationInput | CommitteeListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CommitteeLists.
     */
    cursor?: CommitteeListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CommitteeLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CommitteeLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CommitteeLists.
     */
    distinct?: CommitteeListScalarFieldEnum | CommitteeListScalarFieldEnum[]
  }

  /**
   * CommitteeList findFirstOrThrow
   */
  export type CommitteeListFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeList
     */
    select?: CommitteeListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeListInclude<ExtArgs> | null
    /**
     * Filter, which CommitteeList to fetch.
     */
    where?: CommitteeListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CommitteeLists to fetch.
     */
    orderBy?: CommitteeListOrderByWithRelationInput | CommitteeListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CommitteeLists.
     */
    cursor?: CommitteeListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CommitteeLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CommitteeLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CommitteeLists.
     */
    distinct?: CommitteeListScalarFieldEnum | CommitteeListScalarFieldEnum[]
  }

  /**
   * CommitteeList findMany
   */
  export type CommitteeListFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeList
     */
    select?: CommitteeListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeListInclude<ExtArgs> | null
    /**
     * Filter, which CommitteeLists to fetch.
     */
    where?: CommitteeListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CommitteeLists to fetch.
     */
    orderBy?: CommitteeListOrderByWithRelationInput | CommitteeListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CommitteeLists.
     */
    cursor?: CommitteeListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CommitteeLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CommitteeLists.
     */
    skip?: number
    distinct?: CommitteeListScalarFieldEnum | CommitteeListScalarFieldEnum[]
  }

  /**
   * CommitteeList create
   */
  export type CommitteeListCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeList
     */
    select?: CommitteeListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeListInclude<ExtArgs> | null
    /**
     * The data needed to create a CommitteeList.
     */
    data: XOR<CommitteeListCreateInput, CommitteeListUncheckedCreateInput>
  }

  /**
   * CommitteeList createMany
   */
  export type CommitteeListCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CommitteeLists.
     */
    data: CommitteeListCreateManyInput | CommitteeListCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CommitteeList createManyAndReturn
   */
  export type CommitteeListCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeList
     */
    select?: CommitteeListSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many CommitteeLists.
     */
    data: CommitteeListCreateManyInput | CommitteeListCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CommitteeList update
   */
  export type CommitteeListUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeList
     */
    select?: CommitteeListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeListInclude<ExtArgs> | null
    /**
     * The data needed to update a CommitteeList.
     */
    data: XOR<CommitteeListUpdateInput, CommitteeListUncheckedUpdateInput>
    /**
     * Choose, which CommitteeList to update.
     */
    where: CommitteeListWhereUniqueInput
  }

  /**
   * CommitteeList updateMany
   */
  export type CommitteeListUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CommitteeLists.
     */
    data: XOR<CommitteeListUpdateManyMutationInput, CommitteeListUncheckedUpdateManyInput>
    /**
     * Filter which CommitteeLists to update
     */
    where?: CommitteeListWhereInput
  }

  /**
   * CommitteeList upsert
   */
  export type CommitteeListUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeList
     */
    select?: CommitteeListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeListInclude<ExtArgs> | null
    /**
     * The filter to search for the CommitteeList to update in case it exists.
     */
    where: CommitteeListWhereUniqueInput
    /**
     * In case the CommitteeList found by the `where` argument doesn't exist, create a new CommitteeList with this data.
     */
    create: XOR<CommitteeListCreateInput, CommitteeListUncheckedCreateInput>
    /**
     * In case the CommitteeList was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CommitteeListUpdateInput, CommitteeListUncheckedUpdateInput>
  }

  /**
   * CommitteeList delete
   */
  export type CommitteeListDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeList
     */
    select?: CommitteeListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeListInclude<ExtArgs> | null
    /**
     * Filter which CommitteeList to delete.
     */
    where: CommitteeListWhereUniqueInput
  }

  /**
   * CommitteeList deleteMany
   */
  export type CommitteeListDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CommitteeLists to delete
     */
    where?: CommitteeListWhereInput
  }

  /**
   * CommitteeList.committeeMemberList
   */
  export type CommitteeList$committeeMemberListArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecord
     */
    select?: VoterRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VoterRecordInclude<ExtArgs> | null
    where?: VoterRecordWhereInput
    orderBy?: VoterRecordOrderByWithRelationInput | VoterRecordOrderByWithRelationInput[]
    cursor?: VoterRecordWhereUniqueInput
    take?: number
    skip?: number
    distinct?: VoterRecordScalarFieldEnum | VoterRecordScalarFieldEnum[]
  }

  /**
   * CommitteeList.CommitteeRequest
   */
  export type CommitteeList$CommitteeRequestArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeRequest
     */
    select?: CommitteeRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeRequestInclude<ExtArgs> | null
    where?: CommitteeRequestWhereInput
    orderBy?: CommitteeRequestOrderByWithRelationInput | CommitteeRequestOrderByWithRelationInput[]
    cursor?: CommitteeRequestWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CommitteeRequestScalarFieldEnum | CommitteeRequestScalarFieldEnum[]
  }

  /**
   * CommitteeList.CommitteeDiscrepancyRecords
   */
  export type CommitteeList$CommitteeDiscrepancyRecordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeUploadDiscrepancy
     */
    select?: CommitteeUploadDiscrepancySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeUploadDiscrepancyInclude<ExtArgs> | null
    where?: CommitteeUploadDiscrepancyWhereInput
    orderBy?: CommitteeUploadDiscrepancyOrderByWithRelationInput | CommitteeUploadDiscrepancyOrderByWithRelationInput[]
    cursor?: CommitteeUploadDiscrepancyWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CommitteeUploadDiscrepancyScalarFieldEnum | CommitteeUploadDiscrepancyScalarFieldEnum[]
  }

  /**
   * CommitteeList without action
   */
  export type CommitteeListDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeList
     */
    select?: CommitteeListSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeListInclude<ExtArgs> | null
  }


  /**
   * Model CommitteeRequest
   */

  export type AggregateCommitteeRequest = {
    _count: CommitteeRequestCountAggregateOutputType | null
    _avg: CommitteeRequestAvgAggregateOutputType | null
    _sum: CommitteeRequestSumAggregateOutputType | null
    _min: CommitteeRequestMinAggregateOutputType | null
    _max: CommitteeRequestMaxAggregateOutputType | null
  }

  export type CommitteeRequestAvgAggregateOutputType = {
    id: number | null
    committeeListId: number | null
  }

  export type CommitteeRequestSumAggregateOutputType = {
    id: number | null
    committeeListId: number | null
  }

  export type CommitteeRequestMinAggregateOutputType = {
    id: number | null
    committeeListId: number | null
    addVoterRecordId: string | null
    removeVoterRecordId: string | null
    requestNotes: string | null
  }

  export type CommitteeRequestMaxAggregateOutputType = {
    id: number | null
    committeeListId: number | null
    addVoterRecordId: string | null
    removeVoterRecordId: string | null
    requestNotes: string | null
  }

  export type CommitteeRequestCountAggregateOutputType = {
    id: number
    committeeListId: number
    addVoterRecordId: number
    removeVoterRecordId: number
    requestNotes: number
    _all: number
  }


  export type CommitteeRequestAvgAggregateInputType = {
    id?: true
    committeeListId?: true
  }

  export type CommitteeRequestSumAggregateInputType = {
    id?: true
    committeeListId?: true
  }

  export type CommitteeRequestMinAggregateInputType = {
    id?: true
    committeeListId?: true
    addVoterRecordId?: true
    removeVoterRecordId?: true
    requestNotes?: true
  }

  export type CommitteeRequestMaxAggregateInputType = {
    id?: true
    committeeListId?: true
    addVoterRecordId?: true
    removeVoterRecordId?: true
    requestNotes?: true
  }

  export type CommitteeRequestCountAggregateInputType = {
    id?: true
    committeeListId?: true
    addVoterRecordId?: true
    removeVoterRecordId?: true
    requestNotes?: true
    _all?: true
  }

  export type CommitteeRequestAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CommitteeRequest to aggregate.
     */
    where?: CommitteeRequestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CommitteeRequests to fetch.
     */
    orderBy?: CommitteeRequestOrderByWithRelationInput | CommitteeRequestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CommitteeRequestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CommitteeRequests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CommitteeRequests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CommitteeRequests
    **/
    _count?: true | CommitteeRequestCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CommitteeRequestAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CommitteeRequestSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CommitteeRequestMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CommitteeRequestMaxAggregateInputType
  }

  export type GetCommitteeRequestAggregateType<T extends CommitteeRequestAggregateArgs> = {
        [P in keyof T & keyof AggregateCommitteeRequest]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCommitteeRequest[P]>
      : GetScalarType<T[P], AggregateCommitteeRequest[P]>
  }




  export type CommitteeRequestGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CommitteeRequestWhereInput
    orderBy?: CommitteeRequestOrderByWithAggregationInput | CommitteeRequestOrderByWithAggregationInput[]
    by: CommitteeRequestScalarFieldEnum[] | CommitteeRequestScalarFieldEnum
    having?: CommitteeRequestScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CommitteeRequestCountAggregateInputType | true
    _avg?: CommitteeRequestAvgAggregateInputType
    _sum?: CommitteeRequestSumAggregateInputType
    _min?: CommitteeRequestMinAggregateInputType
    _max?: CommitteeRequestMaxAggregateInputType
  }

  export type CommitteeRequestGroupByOutputType = {
    id: number
    committeeListId: number
    addVoterRecordId: string | null
    removeVoterRecordId: string | null
    requestNotes: string | null
    _count: CommitteeRequestCountAggregateOutputType | null
    _avg: CommitteeRequestAvgAggregateOutputType | null
    _sum: CommitteeRequestSumAggregateOutputType | null
    _min: CommitteeRequestMinAggregateOutputType | null
    _max: CommitteeRequestMaxAggregateOutputType | null
  }

  type GetCommitteeRequestGroupByPayload<T extends CommitteeRequestGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CommitteeRequestGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CommitteeRequestGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CommitteeRequestGroupByOutputType[P]>
            : GetScalarType<T[P], CommitteeRequestGroupByOutputType[P]>
        }
      >
    >


  export type CommitteeRequestSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    committeeListId?: boolean
    addVoterRecordId?: boolean
    removeVoterRecordId?: boolean
    requestNotes?: boolean
    committeList?: boolean | CommitteeListDefaultArgs<ExtArgs>
    addVoterRecord?: boolean | CommitteeRequest$addVoterRecordArgs<ExtArgs>
    removeVoterRecord?: boolean | CommitteeRequest$removeVoterRecordArgs<ExtArgs>
  }, ExtArgs["result"]["committeeRequest"]>

  export type CommitteeRequestSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    committeeListId?: boolean
    addVoterRecordId?: boolean
    removeVoterRecordId?: boolean
    requestNotes?: boolean
    committeList?: boolean | CommitteeListDefaultArgs<ExtArgs>
    addVoterRecord?: boolean | CommitteeRequest$addVoterRecordArgs<ExtArgs>
    removeVoterRecord?: boolean | CommitteeRequest$removeVoterRecordArgs<ExtArgs>
  }, ExtArgs["result"]["committeeRequest"]>

  export type CommitteeRequestSelectScalar = {
    id?: boolean
    committeeListId?: boolean
    addVoterRecordId?: boolean
    removeVoterRecordId?: boolean
    requestNotes?: boolean
  }

  export type CommitteeRequestInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    committeList?: boolean | CommitteeListDefaultArgs<ExtArgs>
    addVoterRecord?: boolean | CommitteeRequest$addVoterRecordArgs<ExtArgs>
    removeVoterRecord?: boolean | CommitteeRequest$removeVoterRecordArgs<ExtArgs>
  }
  export type CommitteeRequestIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    committeList?: boolean | CommitteeListDefaultArgs<ExtArgs>
    addVoterRecord?: boolean | CommitteeRequest$addVoterRecordArgs<ExtArgs>
    removeVoterRecord?: boolean | CommitteeRequest$removeVoterRecordArgs<ExtArgs>
  }

  export type $CommitteeRequestPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CommitteeRequest"
    objects: {
      committeList: Prisma.$CommitteeListPayload<ExtArgs>
      addVoterRecord: Prisma.$VoterRecordPayload<ExtArgs> | null
      removeVoterRecord: Prisma.$VoterRecordPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      committeeListId: number
      addVoterRecordId: string | null
      removeVoterRecordId: string | null
      requestNotes: string | null
    }, ExtArgs["result"]["committeeRequest"]>
    composites: {}
  }

  type CommitteeRequestGetPayload<S extends boolean | null | undefined | CommitteeRequestDefaultArgs> = $Result.GetResult<Prisma.$CommitteeRequestPayload, S>

  type CommitteeRequestCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<CommitteeRequestFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: CommitteeRequestCountAggregateInputType | true
    }

  export interface CommitteeRequestDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CommitteeRequest'], meta: { name: 'CommitteeRequest' } }
    /**
     * Find zero or one CommitteeRequest that matches the filter.
     * @param {CommitteeRequestFindUniqueArgs} args - Arguments to find a CommitteeRequest
     * @example
     * // Get one CommitteeRequest
     * const committeeRequest = await prisma.committeeRequest.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends CommitteeRequestFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeRequestFindUniqueArgs<ExtArgs>>
    ): Prisma__CommitteeRequestClient<$Result.GetResult<Prisma.$CommitteeRequestPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one CommitteeRequest that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {CommitteeRequestFindUniqueOrThrowArgs} args - Arguments to find a CommitteeRequest
     * @example
     * // Get one CommitteeRequest
     * const committeeRequest = await prisma.committeeRequest.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends CommitteeRequestFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeRequestFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__CommitteeRequestClient<$Result.GetResult<Prisma.$CommitteeRequestPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first CommitteeRequest that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeRequestFindFirstArgs} args - Arguments to find a CommitteeRequest
     * @example
     * // Get one CommitteeRequest
     * const committeeRequest = await prisma.committeeRequest.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends CommitteeRequestFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeRequestFindFirstArgs<ExtArgs>>
    ): Prisma__CommitteeRequestClient<$Result.GetResult<Prisma.$CommitteeRequestPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first CommitteeRequest that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeRequestFindFirstOrThrowArgs} args - Arguments to find a CommitteeRequest
     * @example
     * // Get one CommitteeRequest
     * const committeeRequest = await prisma.committeeRequest.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends CommitteeRequestFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeRequestFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__CommitteeRequestClient<$Result.GetResult<Prisma.$CommitteeRequestPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more CommitteeRequests that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeRequestFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CommitteeRequests
     * const committeeRequests = await prisma.committeeRequest.findMany()
     * 
     * // Get first 10 CommitteeRequests
     * const committeeRequests = await prisma.committeeRequest.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const committeeRequestWithIdOnly = await prisma.committeeRequest.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends CommitteeRequestFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeRequestFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CommitteeRequestPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a CommitteeRequest.
     * @param {CommitteeRequestCreateArgs} args - Arguments to create a CommitteeRequest.
     * @example
     * // Create one CommitteeRequest
     * const CommitteeRequest = await prisma.committeeRequest.create({
     *   data: {
     *     // ... data to create a CommitteeRequest
     *   }
     * })
     * 
    **/
    create<T extends CommitteeRequestCreateArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeRequestCreateArgs<ExtArgs>>
    ): Prisma__CommitteeRequestClient<$Result.GetResult<Prisma.$CommitteeRequestPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many CommitteeRequests.
     * @param {CommitteeRequestCreateManyArgs} args - Arguments to create many CommitteeRequests.
     * @example
     * // Create many CommitteeRequests
     * const committeeRequest = await prisma.committeeRequest.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends CommitteeRequestCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeRequestCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CommitteeRequests and returns the data saved in the database.
     * @param {CommitteeRequestCreateManyAndReturnArgs} args - Arguments to create many CommitteeRequests.
     * @example
     * // Create many CommitteeRequests
     * const committeeRequest = await prisma.committeeRequest.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CommitteeRequests and only return the `id`
     * const committeeRequestWithIdOnly = await prisma.committeeRequest.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends CommitteeRequestCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeRequestCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CommitteeRequestPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a CommitteeRequest.
     * @param {CommitteeRequestDeleteArgs} args - Arguments to delete one CommitteeRequest.
     * @example
     * // Delete one CommitteeRequest
     * const CommitteeRequest = await prisma.committeeRequest.delete({
     *   where: {
     *     // ... filter to delete one CommitteeRequest
     *   }
     * })
     * 
    **/
    delete<T extends CommitteeRequestDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeRequestDeleteArgs<ExtArgs>>
    ): Prisma__CommitteeRequestClient<$Result.GetResult<Prisma.$CommitteeRequestPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one CommitteeRequest.
     * @param {CommitteeRequestUpdateArgs} args - Arguments to update one CommitteeRequest.
     * @example
     * // Update one CommitteeRequest
     * const committeeRequest = await prisma.committeeRequest.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends CommitteeRequestUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeRequestUpdateArgs<ExtArgs>>
    ): Prisma__CommitteeRequestClient<$Result.GetResult<Prisma.$CommitteeRequestPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more CommitteeRequests.
     * @param {CommitteeRequestDeleteManyArgs} args - Arguments to filter CommitteeRequests to delete.
     * @example
     * // Delete a few CommitteeRequests
     * const { count } = await prisma.committeeRequest.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends CommitteeRequestDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeRequestDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CommitteeRequests.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeRequestUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CommitteeRequests
     * const committeeRequest = await prisma.committeeRequest.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends CommitteeRequestUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeRequestUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one CommitteeRequest.
     * @param {CommitteeRequestUpsertArgs} args - Arguments to update or create a CommitteeRequest.
     * @example
     * // Update or create a CommitteeRequest
     * const committeeRequest = await prisma.committeeRequest.upsert({
     *   create: {
     *     // ... data to create a CommitteeRequest
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CommitteeRequest we want to update
     *   }
     * })
    **/
    upsert<T extends CommitteeRequestUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeRequestUpsertArgs<ExtArgs>>
    ): Prisma__CommitteeRequestClient<$Result.GetResult<Prisma.$CommitteeRequestPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of CommitteeRequests.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeRequestCountArgs} args - Arguments to filter CommitteeRequests to count.
     * @example
     * // Count the number of CommitteeRequests
     * const count = await prisma.committeeRequest.count({
     *   where: {
     *     // ... the filter for the CommitteeRequests we want to count
     *   }
     * })
    **/
    count<T extends CommitteeRequestCountArgs>(
      args?: Subset<T, CommitteeRequestCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CommitteeRequestCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CommitteeRequest.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeRequestAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CommitteeRequestAggregateArgs>(args: Subset<T, CommitteeRequestAggregateArgs>): Prisma.PrismaPromise<GetCommitteeRequestAggregateType<T>>

    /**
     * Group by CommitteeRequest.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeRequestGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CommitteeRequestGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CommitteeRequestGroupByArgs['orderBy'] }
        : { orderBy?: CommitteeRequestGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CommitteeRequestGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCommitteeRequestGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CommitteeRequest model
   */
  readonly fields: CommitteeRequestFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CommitteeRequest.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CommitteeRequestClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    committeList<T extends CommitteeListDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CommitteeListDefaultArgs<ExtArgs>>): Prisma__CommitteeListClient<$Result.GetResult<Prisma.$CommitteeListPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    addVoterRecord<T extends CommitteeRequest$addVoterRecordArgs<ExtArgs> = {}>(args?: Subset<T, CommitteeRequest$addVoterRecordArgs<ExtArgs>>): Prisma__VoterRecordClient<$Result.GetResult<Prisma.$VoterRecordPayload<ExtArgs>, T, 'findUniqueOrThrow'> | null, null, ExtArgs>;

    removeVoterRecord<T extends CommitteeRequest$removeVoterRecordArgs<ExtArgs> = {}>(args?: Subset<T, CommitteeRequest$removeVoterRecordArgs<ExtArgs>>): Prisma__VoterRecordClient<$Result.GetResult<Prisma.$VoterRecordPayload<ExtArgs>, T, 'findUniqueOrThrow'> | null, null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the CommitteeRequest model
   */ 
  interface CommitteeRequestFieldRefs {
    readonly id: FieldRef<"CommitteeRequest", 'Int'>
    readonly committeeListId: FieldRef<"CommitteeRequest", 'Int'>
    readonly addVoterRecordId: FieldRef<"CommitteeRequest", 'String'>
    readonly removeVoterRecordId: FieldRef<"CommitteeRequest", 'String'>
    readonly requestNotes: FieldRef<"CommitteeRequest", 'String'>
  }
    

  // Custom InputTypes
  /**
   * CommitteeRequest findUnique
   */
  export type CommitteeRequestFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeRequest
     */
    select?: CommitteeRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeRequestInclude<ExtArgs> | null
    /**
     * Filter, which CommitteeRequest to fetch.
     */
    where: CommitteeRequestWhereUniqueInput
  }

  /**
   * CommitteeRequest findUniqueOrThrow
   */
  export type CommitteeRequestFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeRequest
     */
    select?: CommitteeRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeRequestInclude<ExtArgs> | null
    /**
     * Filter, which CommitteeRequest to fetch.
     */
    where: CommitteeRequestWhereUniqueInput
  }

  /**
   * CommitteeRequest findFirst
   */
  export type CommitteeRequestFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeRequest
     */
    select?: CommitteeRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeRequestInclude<ExtArgs> | null
    /**
     * Filter, which CommitteeRequest to fetch.
     */
    where?: CommitteeRequestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CommitteeRequests to fetch.
     */
    orderBy?: CommitteeRequestOrderByWithRelationInput | CommitteeRequestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CommitteeRequests.
     */
    cursor?: CommitteeRequestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CommitteeRequests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CommitteeRequests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CommitteeRequests.
     */
    distinct?: CommitteeRequestScalarFieldEnum | CommitteeRequestScalarFieldEnum[]
  }

  /**
   * CommitteeRequest findFirstOrThrow
   */
  export type CommitteeRequestFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeRequest
     */
    select?: CommitteeRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeRequestInclude<ExtArgs> | null
    /**
     * Filter, which CommitteeRequest to fetch.
     */
    where?: CommitteeRequestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CommitteeRequests to fetch.
     */
    orderBy?: CommitteeRequestOrderByWithRelationInput | CommitteeRequestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CommitteeRequests.
     */
    cursor?: CommitteeRequestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CommitteeRequests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CommitteeRequests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CommitteeRequests.
     */
    distinct?: CommitteeRequestScalarFieldEnum | CommitteeRequestScalarFieldEnum[]
  }

  /**
   * CommitteeRequest findMany
   */
  export type CommitteeRequestFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeRequest
     */
    select?: CommitteeRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeRequestInclude<ExtArgs> | null
    /**
     * Filter, which CommitteeRequests to fetch.
     */
    where?: CommitteeRequestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CommitteeRequests to fetch.
     */
    orderBy?: CommitteeRequestOrderByWithRelationInput | CommitteeRequestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CommitteeRequests.
     */
    cursor?: CommitteeRequestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CommitteeRequests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CommitteeRequests.
     */
    skip?: number
    distinct?: CommitteeRequestScalarFieldEnum | CommitteeRequestScalarFieldEnum[]
  }

  /**
   * CommitteeRequest create
   */
  export type CommitteeRequestCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeRequest
     */
    select?: CommitteeRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeRequestInclude<ExtArgs> | null
    /**
     * The data needed to create a CommitteeRequest.
     */
    data: XOR<CommitteeRequestCreateInput, CommitteeRequestUncheckedCreateInput>
  }

  /**
   * CommitteeRequest createMany
   */
  export type CommitteeRequestCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CommitteeRequests.
     */
    data: CommitteeRequestCreateManyInput | CommitteeRequestCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CommitteeRequest createManyAndReturn
   */
  export type CommitteeRequestCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeRequest
     */
    select?: CommitteeRequestSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many CommitteeRequests.
     */
    data: CommitteeRequestCreateManyInput | CommitteeRequestCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeRequestIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * CommitteeRequest update
   */
  export type CommitteeRequestUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeRequest
     */
    select?: CommitteeRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeRequestInclude<ExtArgs> | null
    /**
     * The data needed to update a CommitteeRequest.
     */
    data: XOR<CommitteeRequestUpdateInput, CommitteeRequestUncheckedUpdateInput>
    /**
     * Choose, which CommitteeRequest to update.
     */
    where: CommitteeRequestWhereUniqueInput
  }

  /**
   * CommitteeRequest updateMany
   */
  export type CommitteeRequestUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CommitteeRequests.
     */
    data: XOR<CommitteeRequestUpdateManyMutationInput, CommitteeRequestUncheckedUpdateManyInput>
    /**
     * Filter which CommitteeRequests to update
     */
    where?: CommitteeRequestWhereInput
  }

  /**
   * CommitteeRequest upsert
   */
  export type CommitteeRequestUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeRequest
     */
    select?: CommitteeRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeRequestInclude<ExtArgs> | null
    /**
     * The filter to search for the CommitteeRequest to update in case it exists.
     */
    where: CommitteeRequestWhereUniqueInput
    /**
     * In case the CommitteeRequest found by the `where` argument doesn't exist, create a new CommitteeRequest with this data.
     */
    create: XOR<CommitteeRequestCreateInput, CommitteeRequestUncheckedCreateInput>
    /**
     * In case the CommitteeRequest was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CommitteeRequestUpdateInput, CommitteeRequestUncheckedUpdateInput>
  }

  /**
   * CommitteeRequest delete
   */
  export type CommitteeRequestDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeRequest
     */
    select?: CommitteeRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeRequestInclude<ExtArgs> | null
    /**
     * Filter which CommitteeRequest to delete.
     */
    where: CommitteeRequestWhereUniqueInput
  }

  /**
   * CommitteeRequest deleteMany
   */
  export type CommitteeRequestDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CommitteeRequests to delete
     */
    where?: CommitteeRequestWhereInput
  }

  /**
   * CommitteeRequest.addVoterRecord
   */
  export type CommitteeRequest$addVoterRecordArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecord
     */
    select?: VoterRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VoterRecordInclude<ExtArgs> | null
    where?: VoterRecordWhereInput
  }

  /**
   * CommitteeRequest.removeVoterRecord
   */
  export type CommitteeRequest$removeVoterRecordArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VoterRecord
     */
    select?: VoterRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VoterRecordInclude<ExtArgs> | null
    where?: VoterRecordWhereInput
  }

  /**
   * CommitteeRequest without action
   */
  export type CommitteeRequestDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeRequest
     */
    select?: CommitteeRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeRequestInclude<ExtArgs> | null
  }


  /**
   * Model DropdownLists
   */

  export type AggregateDropdownLists = {
    _count: DropdownListsCountAggregateOutputType | null
    _avg: DropdownListsAvgAggregateOutputType | null
    _sum: DropdownListsSumAggregateOutputType | null
    _min: DropdownListsMinAggregateOutputType | null
    _max: DropdownListsMaxAggregateOutputType | null
  }

  export type DropdownListsAvgAggregateOutputType = {
    id: number | null
  }

  export type DropdownListsSumAggregateOutputType = {
    id: number | null
  }

  export type DropdownListsMinAggregateOutputType = {
    id: number | null
  }

  export type DropdownListsMaxAggregateOutputType = {
    id: number | null
  }

  export type DropdownListsCountAggregateOutputType = {
    id: number
    city: number
    zipCode: number
    street: number
    countyLegDistrict: number
    stateAssmblyDistrict: number
    stateSenateDistrict: number
    congressionalDistrict: number
    townCode: number
    electionDistrict: number
    party: number
    _all: number
  }


  export type DropdownListsAvgAggregateInputType = {
    id?: true
  }

  export type DropdownListsSumAggregateInputType = {
    id?: true
  }

  export type DropdownListsMinAggregateInputType = {
    id?: true
  }

  export type DropdownListsMaxAggregateInputType = {
    id?: true
  }

  export type DropdownListsCountAggregateInputType = {
    id?: true
    city?: true
    zipCode?: true
    street?: true
    countyLegDistrict?: true
    stateAssmblyDistrict?: true
    stateSenateDistrict?: true
    congressionalDistrict?: true
    townCode?: true
    electionDistrict?: true
    party?: true
    _all?: true
  }

  export type DropdownListsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DropdownLists to aggregate.
     */
    where?: DropdownListsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DropdownLists to fetch.
     */
    orderBy?: DropdownListsOrderByWithRelationInput | DropdownListsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DropdownListsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DropdownLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DropdownLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned DropdownLists
    **/
    _count?: true | DropdownListsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: DropdownListsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: DropdownListsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DropdownListsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DropdownListsMaxAggregateInputType
  }

  export type GetDropdownListsAggregateType<T extends DropdownListsAggregateArgs> = {
        [P in keyof T & keyof AggregateDropdownLists]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDropdownLists[P]>
      : GetScalarType<T[P], AggregateDropdownLists[P]>
  }




  export type DropdownListsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DropdownListsWhereInput
    orderBy?: DropdownListsOrderByWithAggregationInput | DropdownListsOrderByWithAggregationInput[]
    by: DropdownListsScalarFieldEnum[] | DropdownListsScalarFieldEnum
    having?: DropdownListsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DropdownListsCountAggregateInputType | true
    _avg?: DropdownListsAvgAggregateInputType
    _sum?: DropdownListsSumAggregateInputType
    _min?: DropdownListsMinAggregateInputType
    _max?: DropdownListsMaxAggregateInputType
  }

  export type DropdownListsGroupByOutputType = {
    id: number
    city: string[]
    zipCode: string[]
    street: string[]
    countyLegDistrict: string[]
    stateAssmblyDistrict: string[]
    stateSenateDistrict: string[]
    congressionalDistrict: string[]
    townCode: string[]
    electionDistrict: string[]
    party: string[]
    _count: DropdownListsCountAggregateOutputType | null
    _avg: DropdownListsAvgAggregateOutputType | null
    _sum: DropdownListsSumAggregateOutputType | null
    _min: DropdownListsMinAggregateOutputType | null
    _max: DropdownListsMaxAggregateOutputType | null
  }

  type GetDropdownListsGroupByPayload<T extends DropdownListsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DropdownListsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DropdownListsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DropdownListsGroupByOutputType[P]>
            : GetScalarType<T[P], DropdownListsGroupByOutputType[P]>
        }
      >
    >


  export type DropdownListsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    city?: boolean
    zipCode?: boolean
    street?: boolean
    countyLegDistrict?: boolean
    stateAssmblyDistrict?: boolean
    stateSenateDistrict?: boolean
    congressionalDistrict?: boolean
    townCode?: boolean
    electionDistrict?: boolean
    party?: boolean
  }, ExtArgs["result"]["dropdownLists"]>

  export type DropdownListsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    city?: boolean
    zipCode?: boolean
    street?: boolean
    countyLegDistrict?: boolean
    stateAssmblyDistrict?: boolean
    stateSenateDistrict?: boolean
    congressionalDistrict?: boolean
    townCode?: boolean
    electionDistrict?: boolean
    party?: boolean
  }, ExtArgs["result"]["dropdownLists"]>

  export type DropdownListsSelectScalar = {
    id?: boolean
    city?: boolean
    zipCode?: boolean
    street?: boolean
    countyLegDistrict?: boolean
    stateAssmblyDistrict?: boolean
    stateSenateDistrict?: boolean
    congressionalDistrict?: boolean
    townCode?: boolean
    electionDistrict?: boolean
    party?: boolean
  }


  export type $DropdownListsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "DropdownLists"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      city: string[]
      zipCode: string[]
      street: string[]
      countyLegDistrict: string[]
      stateAssmblyDistrict: string[]
      stateSenateDistrict: string[]
      congressionalDistrict: string[]
      townCode: string[]
      electionDistrict: string[]
      party: string[]
    }, ExtArgs["result"]["dropdownLists"]>
    composites: {}
  }

  type DropdownListsGetPayload<S extends boolean | null | undefined | DropdownListsDefaultArgs> = $Result.GetResult<Prisma.$DropdownListsPayload, S>

  type DropdownListsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<DropdownListsFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: DropdownListsCountAggregateInputType | true
    }

  export interface DropdownListsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['DropdownLists'], meta: { name: 'DropdownLists' } }
    /**
     * Find zero or one DropdownLists that matches the filter.
     * @param {DropdownListsFindUniqueArgs} args - Arguments to find a DropdownLists
     * @example
     * // Get one DropdownLists
     * const dropdownLists = await prisma.dropdownLists.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends DropdownListsFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, DropdownListsFindUniqueArgs<ExtArgs>>
    ): Prisma__DropdownListsClient<$Result.GetResult<Prisma.$DropdownListsPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one DropdownLists that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {DropdownListsFindUniqueOrThrowArgs} args - Arguments to find a DropdownLists
     * @example
     * // Get one DropdownLists
     * const dropdownLists = await prisma.dropdownLists.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends DropdownListsFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, DropdownListsFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__DropdownListsClient<$Result.GetResult<Prisma.$DropdownListsPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first DropdownLists that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DropdownListsFindFirstArgs} args - Arguments to find a DropdownLists
     * @example
     * // Get one DropdownLists
     * const dropdownLists = await prisma.dropdownLists.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends DropdownListsFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, DropdownListsFindFirstArgs<ExtArgs>>
    ): Prisma__DropdownListsClient<$Result.GetResult<Prisma.$DropdownListsPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first DropdownLists that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DropdownListsFindFirstOrThrowArgs} args - Arguments to find a DropdownLists
     * @example
     * // Get one DropdownLists
     * const dropdownLists = await prisma.dropdownLists.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends DropdownListsFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, DropdownListsFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__DropdownListsClient<$Result.GetResult<Prisma.$DropdownListsPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more DropdownLists that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DropdownListsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all DropdownLists
     * const dropdownLists = await prisma.dropdownLists.findMany()
     * 
     * // Get first 10 DropdownLists
     * const dropdownLists = await prisma.dropdownLists.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const dropdownListsWithIdOnly = await prisma.dropdownLists.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends DropdownListsFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, DropdownListsFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DropdownListsPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a DropdownLists.
     * @param {DropdownListsCreateArgs} args - Arguments to create a DropdownLists.
     * @example
     * // Create one DropdownLists
     * const DropdownLists = await prisma.dropdownLists.create({
     *   data: {
     *     // ... data to create a DropdownLists
     *   }
     * })
     * 
    **/
    create<T extends DropdownListsCreateArgs<ExtArgs>>(
      args: SelectSubset<T, DropdownListsCreateArgs<ExtArgs>>
    ): Prisma__DropdownListsClient<$Result.GetResult<Prisma.$DropdownListsPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many DropdownLists.
     * @param {DropdownListsCreateManyArgs} args - Arguments to create many DropdownLists.
     * @example
     * // Create many DropdownLists
     * const dropdownLists = await prisma.dropdownLists.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends DropdownListsCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, DropdownListsCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many DropdownLists and returns the data saved in the database.
     * @param {DropdownListsCreateManyAndReturnArgs} args - Arguments to create many DropdownLists.
     * @example
     * // Create many DropdownLists
     * const dropdownLists = await prisma.dropdownLists.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many DropdownLists and only return the `id`
     * const dropdownListsWithIdOnly = await prisma.dropdownLists.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends DropdownListsCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, DropdownListsCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DropdownListsPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a DropdownLists.
     * @param {DropdownListsDeleteArgs} args - Arguments to delete one DropdownLists.
     * @example
     * // Delete one DropdownLists
     * const DropdownLists = await prisma.dropdownLists.delete({
     *   where: {
     *     // ... filter to delete one DropdownLists
     *   }
     * })
     * 
    **/
    delete<T extends DropdownListsDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, DropdownListsDeleteArgs<ExtArgs>>
    ): Prisma__DropdownListsClient<$Result.GetResult<Prisma.$DropdownListsPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one DropdownLists.
     * @param {DropdownListsUpdateArgs} args - Arguments to update one DropdownLists.
     * @example
     * // Update one DropdownLists
     * const dropdownLists = await prisma.dropdownLists.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends DropdownListsUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, DropdownListsUpdateArgs<ExtArgs>>
    ): Prisma__DropdownListsClient<$Result.GetResult<Prisma.$DropdownListsPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more DropdownLists.
     * @param {DropdownListsDeleteManyArgs} args - Arguments to filter DropdownLists to delete.
     * @example
     * // Delete a few DropdownLists
     * const { count } = await prisma.dropdownLists.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends DropdownListsDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, DropdownListsDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DropdownLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DropdownListsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many DropdownLists
     * const dropdownLists = await prisma.dropdownLists.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends DropdownListsUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, DropdownListsUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one DropdownLists.
     * @param {DropdownListsUpsertArgs} args - Arguments to update or create a DropdownLists.
     * @example
     * // Update or create a DropdownLists
     * const dropdownLists = await prisma.dropdownLists.upsert({
     *   create: {
     *     // ... data to create a DropdownLists
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the DropdownLists we want to update
     *   }
     * })
    **/
    upsert<T extends DropdownListsUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, DropdownListsUpsertArgs<ExtArgs>>
    ): Prisma__DropdownListsClient<$Result.GetResult<Prisma.$DropdownListsPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of DropdownLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DropdownListsCountArgs} args - Arguments to filter DropdownLists to count.
     * @example
     * // Count the number of DropdownLists
     * const count = await prisma.dropdownLists.count({
     *   where: {
     *     // ... the filter for the DropdownLists we want to count
     *   }
     * })
    **/
    count<T extends DropdownListsCountArgs>(
      args?: Subset<T, DropdownListsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DropdownListsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a DropdownLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DropdownListsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DropdownListsAggregateArgs>(args: Subset<T, DropdownListsAggregateArgs>): Prisma.PrismaPromise<GetDropdownListsAggregateType<T>>

    /**
     * Group by DropdownLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DropdownListsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DropdownListsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DropdownListsGroupByArgs['orderBy'] }
        : { orderBy?: DropdownListsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DropdownListsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDropdownListsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the DropdownLists model
   */
  readonly fields: DropdownListsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for DropdownLists.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DropdownListsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';


    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the DropdownLists model
   */ 
  interface DropdownListsFieldRefs {
    readonly id: FieldRef<"DropdownLists", 'Int'>
    readonly city: FieldRef<"DropdownLists", 'String[]'>
    readonly zipCode: FieldRef<"DropdownLists", 'String[]'>
    readonly street: FieldRef<"DropdownLists", 'String[]'>
    readonly countyLegDistrict: FieldRef<"DropdownLists", 'String[]'>
    readonly stateAssmblyDistrict: FieldRef<"DropdownLists", 'String[]'>
    readonly stateSenateDistrict: FieldRef<"DropdownLists", 'String[]'>
    readonly congressionalDistrict: FieldRef<"DropdownLists", 'String[]'>
    readonly townCode: FieldRef<"DropdownLists", 'String[]'>
    readonly electionDistrict: FieldRef<"DropdownLists", 'String[]'>
    readonly party: FieldRef<"DropdownLists", 'String[]'>
  }
    

  // Custom InputTypes
  /**
   * DropdownLists findUnique
   */
  export type DropdownListsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DropdownLists
     */
    select?: DropdownListsSelect<ExtArgs> | null
    /**
     * Filter, which DropdownLists to fetch.
     */
    where: DropdownListsWhereUniqueInput
  }

  /**
   * DropdownLists findUniqueOrThrow
   */
  export type DropdownListsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DropdownLists
     */
    select?: DropdownListsSelect<ExtArgs> | null
    /**
     * Filter, which DropdownLists to fetch.
     */
    where: DropdownListsWhereUniqueInput
  }

  /**
   * DropdownLists findFirst
   */
  export type DropdownListsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DropdownLists
     */
    select?: DropdownListsSelect<ExtArgs> | null
    /**
     * Filter, which DropdownLists to fetch.
     */
    where?: DropdownListsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DropdownLists to fetch.
     */
    orderBy?: DropdownListsOrderByWithRelationInput | DropdownListsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DropdownLists.
     */
    cursor?: DropdownListsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DropdownLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DropdownLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DropdownLists.
     */
    distinct?: DropdownListsScalarFieldEnum | DropdownListsScalarFieldEnum[]
  }

  /**
   * DropdownLists findFirstOrThrow
   */
  export type DropdownListsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DropdownLists
     */
    select?: DropdownListsSelect<ExtArgs> | null
    /**
     * Filter, which DropdownLists to fetch.
     */
    where?: DropdownListsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DropdownLists to fetch.
     */
    orderBy?: DropdownListsOrderByWithRelationInput | DropdownListsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DropdownLists.
     */
    cursor?: DropdownListsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DropdownLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DropdownLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DropdownLists.
     */
    distinct?: DropdownListsScalarFieldEnum | DropdownListsScalarFieldEnum[]
  }

  /**
   * DropdownLists findMany
   */
  export type DropdownListsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DropdownLists
     */
    select?: DropdownListsSelect<ExtArgs> | null
    /**
     * Filter, which DropdownLists to fetch.
     */
    where?: DropdownListsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DropdownLists to fetch.
     */
    orderBy?: DropdownListsOrderByWithRelationInput | DropdownListsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing DropdownLists.
     */
    cursor?: DropdownListsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DropdownLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DropdownLists.
     */
    skip?: number
    distinct?: DropdownListsScalarFieldEnum | DropdownListsScalarFieldEnum[]
  }

  /**
   * DropdownLists create
   */
  export type DropdownListsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DropdownLists
     */
    select?: DropdownListsSelect<ExtArgs> | null
    /**
     * The data needed to create a DropdownLists.
     */
    data?: XOR<DropdownListsCreateInput, DropdownListsUncheckedCreateInput>
  }

  /**
   * DropdownLists createMany
   */
  export type DropdownListsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many DropdownLists.
     */
    data: DropdownListsCreateManyInput | DropdownListsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * DropdownLists createManyAndReturn
   */
  export type DropdownListsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DropdownLists
     */
    select?: DropdownListsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many DropdownLists.
     */
    data: DropdownListsCreateManyInput | DropdownListsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * DropdownLists update
   */
  export type DropdownListsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DropdownLists
     */
    select?: DropdownListsSelect<ExtArgs> | null
    /**
     * The data needed to update a DropdownLists.
     */
    data: XOR<DropdownListsUpdateInput, DropdownListsUncheckedUpdateInput>
    /**
     * Choose, which DropdownLists to update.
     */
    where: DropdownListsWhereUniqueInput
  }

  /**
   * DropdownLists updateMany
   */
  export type DropdownListsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update DropdownLists.
     */
    data: XOR<DropdownListsUpdateManyMutationInput, DropdownListsUncheckedUpdateManyInput>
    /**
     * Filter which DropdownLists to update
     */
    where?: DropdownListsWhereInput
  }

  /**
   * DropdownLists upsert
   */
  export type DropdownListsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DropdownLists
     */
    select?: DropdownListsSelect<ExtArgs> | null
    /**
     * The filter to search for the DropdownLists to update in case it exists.
     */
    where: DropdownListsWhereUniqueInput
    /**
     * In case the DropdownLists found by the `where` argument doesn't exist, create a new DropdownLists with this data.
     */
    create: XOR<DropdownListsCreateInput, DropdownListsUncheckedCreateInput>
    /**
     * In case the DropdownLists was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DropdownListsUpdateInput, DropdownListsUncheckedUpdateInput>
  }

  /**
   * DropdownLists delete
   */
  export type DropdownListsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DropdownLists
     */
    select?: DropdownListsSelect<ExtArgs> | null
    /**
     * Filter which DropdownLists to delete.
     */
    where: DropdownListsWhereUniqueInput
  }

  /**
   * DropdownLists deleteMany
   */
  export type DropdownListsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DropdownLists to delete
     */
    where?: DropdownListsWhereInput
  }

  /**
   * DropdownLists without action
   */
  export type DropdownListsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DropdownLists
     */
    select?: DropdownListsSelect<ExtArgs> | null
  }


  /**
   * Model CommitteeUploadDiscrepancy
   */

  export type AggregateCommitteeUploadDiscrepancy = {
    _count: CommitteeUploadDiscrepancyCountAggregateOutputType | null
    _avg: CommitteeUploadDiscrepancyAvgAggregateOutputType | null
    _sum: CommitteeUploadDiscrepancySumAggregateOutputType | null
    _min: CommitteeUploadDiscrepancyMinAggregateOutputType | null
    _max: CommitteeUploadDiscrepancyMaxAggregateOutputType | null
  }

  export type CommitteeUploadDiscrepancyAvgAggregateOutputType = {
    committeeId: number | null
  }

  export type CommitteeUploadDiscrepancySumAggregateOutputType = {
    committeeId: number | null
  }

  export type CommitteeUploadDiscrepancyMinAggregateOutputType = {
    id: string | null
    VRCNUM: string | null
    committeeId: number | null
  }

  export type CommitteeUploadDiscrepancyMaxAggregateOutputType = {
    id: string | null
    VRCNUM: string | null
    committeeId: number | null
  }

  export type CommitteeUploadDiscrepancyCountAggregateOutputType = {
    id: number
    VRCNUM: number
    committeeId: number
    discrepancy: number
    _all: number
  }


  export type CommitteeUploadDiscrepancyAvgAggregateInputType = {
    committeeId?: true
  }

  export type CommitteeUploadDiscrepancySumAggregateInputType = {
    committeeId?: true
  }

  export type CommitteeUploadDiscrepancyMinAggregateInputType = {
    id?: true
    VRCNUM?: true
    committeeId?: true
  }

  export type CommitteeUploadDiscrepancyMaxAggregateInputType = {
    id?: true
    VRCNUM?: true
    committeeId?: true
  }

  export type CommitteeUploadDiscrepancyCountAggregateInputType = {
    id?: true
    VRCNUM?: true
    committeeId?: true
    discrepancy?: true
    _all?: true
  }

  export type CommitteeUploadDiscrepancyAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CommitteeUploadDiscrepancy to aggregate.
     */
    where?: CommitteeUploadDiscrepancyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CommitteeUploadDiscrepancies to fetch.
     */
    orderBy?: CommitteeUploadDiscrepancyOrderByWithRelationInput | CommitteeUploadDiscrepancyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CommitteeUploadDiscrepancyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CommitteeUploadDiscrepancies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CommitteeUploadDiscrepancies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CommitteeUploadDiscrepancies
    **/
    _count?: true | CommitteeUploadDiscrepancyCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CommitteeUploadDiscrepancyAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CommitteeUploadDiscrepancySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CommitteeUploadDiscrepancyMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CommitteeUploadDiscrepancyMaxAggregateInputType
  }

  export type GetCommitteeUploadDiscrepancyAggregateType<T extends CommitteeUploadDiscrepancyAggregateArgs> = {
        [P in keyof T & keyof AggregateCommitteeUploadDiscrepancy]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCommitteeUploadDiscrepancy[P]>
      : GetScalarType<T[P], AggregateCommitteeUploadDiscrepancy[P]>
  }




  export type CommitteeUploadDiscrepancyGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CommitteeUploadDiscrepancyWhereInput
    orderBy?: CommitteeUploadDiscrepancyOrderByWithAggregationInput | CommitteeUploadDiscrepancyOrderByWithAggregationInput[]
    by: CommitteeUploadDiscrepancyScalarFieldEnum[] | CommitteeUploadDiscrepancyScalarFieldEnum
    having?: CommitteeUploadDiscrepancyScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CommitteeUploadDiscrepancyCountAggregateInputType | true
    _avg?: CommitteeUploadDiscrepancyAvgAggregateInputType
    _sum?: CommitteeUploadDiscrepancySumAggregateInputType
    _min?: CommitteeUploadDiscrepancyMinAggregateInputType
    _max?: CommitteeUploadDiscrepancyMaxAggregateInputType
  }

  export type CommitteeUploadDiscrepancyGroupByOutputType = {
    id: string
    VRCNUM: string
    committeeId: number
    discrepancy: JsonValue
    _count: CommitteeUploadDiscrepancyCountAggregateOutputType | null
    _avg: CommitteeUploadDiscrepancyAvgAggregateOutputType | null
    _sum: CommitteeUploadDiscrepancySumAggregateOutputType | null
    _min: CommitteeUploadDiscrepancyMinAggregateOutputType | null
    _max: CommitteeUploadDiscrepancyMaxAggregateOutputType | null
  }

  type GetCommitteeUploadDiscrepancyGroupByPayload<T extends CommitteeUploadDiscrepancyGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CommitteeUploadDiscrepancyGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CommitteeUploadDiscrepancyGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CommitteeUploadDiscrepancyGroupByOutputType[P]>
            : GetScalarType<T[P], CommitteeUploadDiscrepancyGroupByOutputType[P]>
        }
      >
    >


  export type CommitteeUploadDiscrepancySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    VRCNUM?: boolean
    committeeId?: boolean
    discrepancy?: boolean
    committee?: boolean | CommitteeListDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["committeeUploadDiscrepancy"]>

  export type CommitteeUploadDiscrepancySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    VRCNUM?: boolean
    committeeId?: boolean
    discrepancy?: boolean
    committee?: boolean | CommitteeListDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["committeeUploadDiscrepancy"]>

  export type CommitteeUploadDiscrepancySelectScalar = {
    id?: boolean
    VRCNUM?: boolean
    committeeId?: boolean
    discrepancy?: boolean
  }

  export type CommitteeUploadDiscrepancyInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    committee?: boolean | CommitteeListDefaultArgs<ExtArgs>
  }
  export type CommitteeUploadDiscrepancyIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    committee?: boolean | CommitteeListDefaultArgs<ExtArgs>
  }

  export type $CommitteeUploadDiscrepancyPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CommitteeUploadDiscrepancy"
    objects: {
      committee: Prisma.$CommitteeListPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      VRCNUM: string
      committeeId: number
      discrepancy: Prisma.JsonValue
    }, ExtArgs["result"]["committeeUploadDiscrepancy"]>
    composites: {}
  }

  type CommitteeUploadDiscrepancyGetPayload<S extends boolean | null | undefined | CommitteeUploadDiscrepancyDefaultArgs> = $Result.GetResult<Prisma.$CommitteeUploadDiscrepancyPayload, S>

  type CommitteeUploadDiscrepancyCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<CommitteeUploadDiscrepancyFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: CommitteeUploadDiscrepancyCountAggregateInputType | true
    }

  export interface CommitteeUploadDiscrepancyDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CommitteeUploadDiscrepancy'], meta: { name: 'CommitteeUploadDiscrepancy' } }
    /**
     * Find zero or one CommitteeUploadDiscrepancy that matches the filter.
     * @param {CommitteeUploadDiscrepancyFindUniqueArgs} args - Arguments to find a CommitteeUploadDiscrepancy
     * @example
     * // Get one CommitteeUploadDiscrepancy
     * const committeeUploadDiscrepancy = await prisma.committeeUploadDiscrepancy.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends CommitteeUploadDiscrepancyFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeUploadDiscrepancyFindUniqueArgs<ExtArgs>>
    ): Prisma__CommitteeUploadDiscrepancyClient<$Result.GetResult<Prisma.$CommitteeUploadDiscrepancyPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one CommitteeUploadDiscrepancy that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {CommitteeUploadDiscrepancyFindUniqueOrThrowArgs} args - Arguments to find a CommitteeUploadDiscrepancy
     * @example
     * // Get one CommitteeUploadDiscrepancy
     * const committeeUploadDiscrepancy = await prisma.committeeUploadDiscrepancy.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends CommitteeUploadDiscrepancyFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeUploadDiscrepancyFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__CommitteeUploadDiscrepancyClient<$Result.GetResult<Prisma.$CommitteeUploadDiscrepancyPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first CommitteeUploadDiscrepancy that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeUploadDiscrepancyFindFirstArgs} args - Arguments to find a CommitteeUploadDiscrepancy
     * @example
     * // Get one CommitteeUploadDiscrepancy
     * const committeeUploadDiscrepancy = await prisma.committeeUploadDiscrepancy.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends CommitteeUploadDiscrepancyFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeUploadDiscrepancyFindFirstArgs<ExtArgs>>
    ): Prisma__CommitteeUploadDiscrepancyClient<$Result.GetResult<Prisma.$CommitteeUploadDiscrepancyPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first CommitteeUploadDiscrepancy that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeUploadDiscrepancyFindFirstOrThrowArgs} args - Arguments to find a CommitteeUploadDiscrepancy
     * @example
     * // Get one CommitteeUploadDiscrepancy
     * const committeeUploadDiscrepancy = await prisma.committeeUploadDiscrepancy.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends CommitteeUploadDiscrepancyFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeUploadDiscrepancyFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__CommitteeUploadDiscrepancyClient<$Result.GetResult<Prisma.$CommitteeUploadDiscrepancyPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more CommitteeUploadDiscrepancies that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeUploadDiscrepancyFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CommitteeUploadDiscrepancies
     * const committeeUploadDiscrepancies = await prisma.committeeUploadDiscrepancy.findMany()
     * 
     * // Get first 10 CommitteeUploadDiscrepancies
     * const committeeUploadDiscrepancies = await prisma.committeeUploadDiscrepancy.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const committeeUploadDiscrepancyWithIdOnly = await prisma.committeeUploadDiscrepancy.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends CommitteeUploadDiscrepancyFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeUploadDiscrepancyFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CommitteeUploadDiscrepancyPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a CommitteeUploadDiscrepancy.
     * @param {CommitteeUploadDiscrepancyCreateArgs} args - Arguments to create a CommitteeUploadDiscrepancy.
     * @example
     * // Create one CommitteeUploadDiscrepancy
     * const CommitteeUploadDiscrepancy = await prisma.committeeUploadDiscrepancy.create({
     *   data: {
     *     // ... data to create a CommitteeUploadDiscrepancy
     *   }
     * })
     * 
    **/
    create<T extends CommitteeUploadDiscrepancyCreateArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeUploadDiscrepancyCreateArgs<ExtArgs>>
    ): Prisma__CommitteeUploadDiscrepancyClient<$Result.GetResult<Prisma.$CommitteeUploadDiscrepancyPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many CommitteeUploadDiscrepancies.
     * @param {CommitteeUploadDiscrepancyCreateManyArgs} args - Arguments to create many CommitteeUploadDiscrepancies.
     * @example
     * // Create many CommitteeUploadDiscrepancies
     * const committeeUploadDiscrepancy = await prisma.committeeUploadDiscrepancy.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends CommitteeUploadDiscrepancyCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeUploadDiscrepancyCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CommitteeUploadDiscrepancies and returns the data saved in the database.
     * @param {CommitteeUploadDiscrepancyCreateManyAndReturnArgs} args - Arguments to create many CommitteeUploadDiscrepancies.
     * @example
     * // Create many CommitteeUploadDiscrepancies
     * const committeeUploadDiscrepancy = await prisma.committeeUploadDiscrepancy.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CommitteeUploadDiscrepancies and only return the `id`
     * const committeeUploadDiscrepancyWithIdOnly = await prisma.committeeUploadDiscrepancy.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends CommitteeUploadDiscrepancyCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeUploadDiscrepancyCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CommitteeUploadDiscrepancyPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a CommitteeUploadDiscrepancy.
     * @param {CommitteeUploadDiscrepancyDeleteArgs} args - Arguments to delete one CommitteeUploadDiscrepancy.
     * @example
     * // Delete one CommitteeUploadDiscrepancy
     * const CommitteeUploadDiscrepancy = await prisma.committeeUploadDiscrepancy.delete({
     *   where: {
     *     // ... filter to delete one CommitteeUploadDiscrepancy
     *   }
     * })
     * 
    **/
    delete<T extends CommitteeUploadDiscrepancyDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeUploadDiscrepancyDeleteArgs<ExtArgs>>
    ): Prisma__CommitteeUploadDiscrepancyClient<$Result.GetResult<Prisma.$CommitteeUploadDiscrepancyPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one CommitteeUploadDiscrepancy.
     * @param {CommitteeUploadDiscrepancyUpdateArgs} args - Arguments to update one CommitteeUploadDiscrepancy.
     * @example
     * // Update one CommitteeUploadDiscrepancy
     * const committeeUploadDiscrepancy = await prisma.committeeUploadDiscrepancy.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends CommitteeUploadDiscrepancyUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeUploadDiscrepancyUpdateArgs<ExtArgs>>
    ): Prisma__CommitteeUploadDiscrepancyClient<$Result.GetResult<Prisma.$CommitteeUploadDiscrepancyPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more CommitteeUploadDiscrepancies.
     * @param {CommitteeUploadDiscrepancyDeleteManyArgs} args - Arguments to filter CommitteeUploadDiscrepancies to delete.
     * @example
     * // Delete a few CommitteeUploadDiscrepancies
     * const { count } = await prisma.committeeUploadDiscrepancy.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends CommitteeUploadDiscrepancyDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, CommitteeUploadDiscrepancyDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CommitteeUploadDiscrepancies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeUploadDiscrepancyUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CommitteeUploadDiscrepancies
     * const committeeUploadDiscrepancy = await prisma.committeeUploadDiscrepancy.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends CommitteeUploadDiscrepancyUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeUploadDiscrepancyUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one CommitteeUploadDiscrepancy.
     * @param {CommitteeUploadDiscrepancyUpsertArgs} args - Arguments to update or create a CommitteeUploadDiscrepancy.
     * @example
     * // Update or create a CommitteeUploadDiscrepancy
     * const committeeUploadDiscrepancy = await prisma.committeeUploadDiscrepancy.upsert({
     *   create: {
     *     // ... data to create a CommitteeUploadDiscrepancy
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CommitteeUploadDiscrepancy we want to update
     *   }
     * })
    **/
    upsert<T extends CommitteeUploadDiscrepancyUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, CommitteeUploadDiscrepancyUpsertArgs<ExtArgs>>
    ): Prisma__CommitteeUploadDiscrepancyClient<$Result.GetResult<Prisma.$CommitteeUploadDiscrepancyPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of CommitteeUploadDiscrepancies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeUploadDiscrepancyCountArgs} args - Arguments to filter CommitteeUploadDiscrepancies to count.
     * @example
     * // Count the number of CommitteeUploadDiscrepancies
     * const count = await prisma.committeeUploadDiscrepancy.count({
     *   where: {
     *     // ... the filter for the CommitteeUploadDiscrepancies we want to count
     *   }
     * })
    **/
    count<T extends CommitteeUploadDiscrepancyCountArgs>(
      args?: Subset<T, CommitteeUploadDiscrepancyCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CommitteeUploadDiscrepancyCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CommitteeUploadDiscrepancy.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeUploadDiscrepancyAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CommitteeUploadDiscrepancyAggregateArgs>(args: Subset<T, CommitteeUploadDiscrepancyAggregateArgs>): Prisma.PrismaPromise<GetCommitteeUploadDiscrepancyAggregateType<T>>

    /**
     * Group by CommitteeUploadDiscrepancy.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommitteeUploadDiscrepancyGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CommitteeUploadDiscrepancyGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CommitteeUploadDiscrepancyGroupByArgs['orderBy'] }
        : { orderBy?: CommitteeUploadDiscrepancyGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CommitteeUploadDiscrepancyGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCommitteeUploadDiscrepancyGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CommitteeUploadDiscrepancy model
   */
  readonly fields: CommitteeUploadDiscrepancyFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CommitteeUploadDiscrepancy.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CommitteeUploadDiscrepancyClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    committee<T extends CommitteeListDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CommitteeListDefaultArgs<ExtArgs>>): Prisma__CommitteeListClient<$Result.GetResult<Prisma.$CommitteeListPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the CommitteeUploadDiscrepancy model
   */ 
  interface CommitteeUploadDiscrepancyFieldRefs {
    readonly id: FieldRef<"CommitteeUploadDiscrepancy", 'String'>
    readonly VRCNUM: FieldRef<"CommitteeUploadDiscrepancy", 'String'>
    readonly committeeId: FieldRef<"CommitteeUploadDiscrepancy", 'Int'>
    readonly discrepancy: FieldRef<"CommitteeUploadDiscrepancy", 'Json'>
  }
    

  // Custom InputTypes
  /**
   * CommitteeUploadDiscrepancy findUnique
   */
  export type CommitteeUploadDiscrepancyFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeUploadDiscrepancy
     */
    select?: CommitteeUploadDiscrepancySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeUploadDiscrepancyInclude<ExtArgs> | null
    /**
     * Filter, which CommitteeUploadDiscrepancy to fetch.
     */
    where: CommitteeUploadDiscrepancyWhereUniqueInput
  }

  /**
   * CommitteeUploadDiscrepancy findUniqueOrThrow
   */
  export type CommitteeUploadDiscrepancyFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeUploadDiscrepancy
     */
    select?: CommitteeUploadDiscrepancySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeUploadDiscrepancyInclude<ExtArgs> | null
    /**
     * Filter, which CommitteeUploadDiscrepancy to fetch.
     */
    where: CommitteeUploadDiscrepancyWhereUniqueInput
  }

  /**
   * CommitteeUploadDiscrepancy findFirst
   */
  export type CommitteeUploadDiscrepancyFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeUploadDiscrepancy
     */
    select?: CommitteeUploadDiscrepancySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeUploadDiscrepancyInclude<ExtArgs> | null
    /**
     * Filter, which CommitteeUploadDiscrepancy to fetch.
     */
    where?: CommitteeUploadDiscrepancyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CommitteeUploadDiscrepancies to fetch.
     */
    orderBy?: CommitteeUploadDiscrepancyOrderByWithRelationInput | CommitteeUploadDiscrepancyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CommitteeUploadDiscrepancies.
     */
    cursor?: CommitteeUploadDiscrepancyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CommitteeUploadDiscrepancies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CommitteeUploadDiscrepancies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CommitteeUploadDiscrepancies.
     */
    distinct?: CommitteeUploadDiscrepancyScalarFieldEnum | CommitteeUploadDiscrepancyScalarFieldEnum[]
  }

  /**
   * CommitteeUploadDiscrepancy findFirstOrThrow
   */
  export type CommitteeUploadDiscrepancyFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeUploadDiscrepancy
     */
    select?: CommitteeUploadDiscrepancySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeUploadDiscrepancyInclude<ExtArgs> | null
    /**
     * Filter, which CommitteeUploadDiscrepancy to fetch.
     */
    where?: CommitteeUploadDiscrepancyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CommitteeUploadDiscrepancies to fetch.
     */
    orderBy?: CommitteeUploadDiscrepancyOrderByWithRelationInput | CommitteeUploadDiscrepancyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CommitteeUploadDiscrepancies.
     */
    cursor?: CommitteeUploadDiscrepancyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CommitteeUploadDiscrepancies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CommitteeUploadDiscrepancies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CommitteeUploadDiscrepancies.
     */
    distinct?: CommitteeUploadDiscrepancyScalarFieldEnum | CommitteeUploadDiscrepancyScalarFieldEnum[]
  }

  /**
   * CommitteeUploadDiscrepancy findMany
   */
  export type CommitteeUploadDiscrepancyFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeUploadDiscrepancy
     */
    select?: CommitteeUploadDiscrepancySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeUploadDiscrepancyInclude<ExtArgs> | null
    /**
     * Filter, which CommitteeUploadDiscrepancies to fetch.
     */
    where?: CommitteeUploadDiscrepancyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CommitteeUploadDiscrepancies to fetch.
     */
    orderBy?: CommitteeUploadDiscrepancyOrderByWithRelationInput | CommitteeUploadDiscrepancyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CommitteeUploadDiscrepancies.
     */
    cursor?: CommitteeUploadDiscrepancyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CommitteeUploadDiscrepancies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CommitteeUploadDiscrepancies.
     */
    skip?: number
    distinct?: CommitteeUploadDiscrepancyScalarFieldEnum | CommitteeUploadDiscrepancyScalarFieldEnum[]
  }

  /**
   * CommitteeUploadDiscrepancy create
   */
  export type CommitteeUploadDiscrepancyCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeUploadDiscrepancy
     */
    select?: CommitteeUploadDiscrepancySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeUploadDiscrepancyInclude<ExtArgs> | null
    /**
     * The data needed to create a CommitteeUploadDiscrepancy.
     */
    data: XOR<CommitteeUploadDiscrepancyCreateInput, CommitteeUploadDiscrepancyUncheckedCreateInput>
  }

  /**
   * CommitteeUploadDiscrepancy createMany
   */
  export type CommitteeUploadDiscrepancyCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CommitteeUploadDiscrepancies.
     */
    data: CommitteeUploadDiscrepancyCreateManyInput | CommitteeUploadDiscrepancyCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CommitteeUploadDiscrepancy createManyAndReturn
   */
  export type CommitteeUploadDiscrepancyCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeUploadDiscrepancy
     */
    select?: CommitteeUploadDiscrepancySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many CommitteeUploadDiscrepancies.
     */
    data: CommitteeUploadDiscrepancyCreateManyInput | CommitteeUploadDiscrepancyCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeUploadDiscrepancyIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * CommitteeUploadDiscrepancy update
   */
  export type CommitteeUploadDiscrepancyUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeUploadDiscrepancy
     */
    select?: CommitteeUploadDiscrepancySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeUploadDiscrepancyInclude<ExtArgs> | null
    /**
     * The data needed to update a CommitteeUploadDiscrepancy.
     */
    data: XOR<CommitteeUploadDiscrepancyUpdateInput, CommitteeUploadDiscrepancyUncheckedUpdateInput>
    /**
     * Choose, which CommitteeUploadDiscrepancy to update.
     */
    where: CommitteeUploadDiscrepancyWhereUniqueInput
  }

  /**
   * CommitteeUploadDiscrepancy updateMany
   */
  export type CommitteeUploadDiscrepancyUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CommitteeUploadDiscrepancies.
     */
    data: XOR<CommitteeUploadDiscrepancyUpdateManyMutationInput, CommitteeUploadDiscrepancyUncheckedUpdateManyInput>
    /**
     * Filter which CommitteeUploadDiscrepancies to update
     */
    where?: CommitteeUploadDiscrepancyWhereInput
  }

  /**
   * CommitteeUploadDiscrepancy upsert
   */
  export type CommitteeUploadDiscrepancyUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeUploadDiscrepancy
     */
    select?: CommitteeUploadDiscrepancySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeUploadDiscrepancyInclude<ExtArgs> | null
    /**
     * The filter to search for the CommitteeUploadDiscrepancy to update in case it exists.
     */
    where: CommitteeUploadDiscrepancyWhereUniqueInput
    /**
     * In case the CommitteeUploadDiscrepancy found by the `where` argument doesn't exist, create a new CommitteeUploadDiscrepancy with this data.
     */
    create: XOR<CommitteeUploadDiscrepancyCreateInput, CommitteeUploadDiscrepancyUncheckedCreateInput>
    /**
     * In case the CommitteeUploadDiscrepancy was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CommitteeUploadDiscrepancyUpdateInput, CommitteeUploadDiscrepancyUncheckedUpdateInput>
  }

  /**
   * CommitteeUploadDiscrepancy delete
   */
  export type CommitteeUploadDiscrepancyDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeUploadDiscrepancy
     */
    select?: CommitteeUploadDiscrepancySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeUploadDiscrepancyInclude<ExtArgs> | null
    /**
     * Filter which CommitteeUploadDiscrepancy to delete.
     */
    where: CommitteeUploadDiscrepancyWhereUniqueInput
  }

  /**
   * CommitteeUploadDiscrepancy deleteMany
   */
  export type CommitteeUploadDiscrepancyDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CommitteeUploadDiscrepancies to delete
     */
    where?: CommitteeUploadDiscrepancyWhereInput
  }

  /**
   * CommitteeUploadDiscrepancy without action
   */
  export type CommitteeUploadDiscrepancyDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CommitteeUploadDiscrepancy
     */
    select?: CommitteeUploadDiscrepancySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommitteeUploadDiscrepancyInclude<ExtArgs> | null
  }


  /**
   * Model ElectionDate
   */

  export type AggregateElectionDate = {
    _count: ElectionDateCountAggregateOutputType | null
    _avg: ElectionDateAvgAggregateOutputType | null
    _sum: ElectionDateSumAggregateOutputType | null
    _min: ElectionDateMinAggregateOutputType | null
    _max: ElectionDateMaxAggregateOutputType | null
  }

  export type ElectionDateAvgAggregateOutputType = {
    id: number | null
  }

  export type ElectionDateSumAggregateOutputType = {
    id: number | null
  }

  export type ElectionDateMinAggregateOutputType = {
    id: number | null
    date: Date | null
  }

  export type ElectionDateMaxAggregateOutputType = {
    id: number | null
    date: Date | null
  }

  export type ElectionDateCountAggregateOutputType = {
    id: number
    date: number
    _all: number
  }


  export type ElectionDateAvgAggregateInputType = {
    id?: true
  }

  export type ElectionDateSumAggregateInputType = {
    id?: true
  }

  export type ElectionDateMinAggregateInputType = {
    id?: true
    date?: true
  }

  export type ElectionDateMaxAggregateInputType = {
    id?: true
    date?: true
  }

  export type ElectionDateCountAggregateInputType = {
    id?: true
    date?: true
    _all?: true
  }

  export type ElectionDateAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ElectionDate to aggregate.
     */
    where?: ElectionDateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ElectionDates to fetch.
     */
    orderBy?: ElectionDateOrderByWithRelationInput | ElectionDateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ElectionDateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ElectionDates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ElectionDates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ElectionDates
    **/
    _count?: true | ElectionDateCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ElectionDateAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ElectionDateSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ElectionDateMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ElectionDateMaxAggregateInputType
  }

  export type GetElectionDateAggregateType<T extends ElectionDateAggregateArgs> = {
        [P in keyof T & keyof AggregateElectionDate]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateElectionDate[P]>
      : GetScalarType<T[P], AggregateElectionDate[P]>
  }




  export type ElectionDateGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ElectionDateWhereInput
    orderBy?: ElectionDateOrderByWithAggregationInput | ElectionDateOrderByWithAggregationInput[]
    by: ElectionDateScalarFieldEnum[] | ElectionDateScalarFieldEnum
    having?: ElectionDateScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ElectionDateCountAggregateInputType | true
    _avg?: ElectionDateAvgAggregateInputType
    _sum?: ElectionDateSumAggregateInputType
    _min?: ElectionDateMinAggregateInputType
    _max?: ElectionDateMaxAggregateInputType
  }

  export type ElectionDateGroupByOutputType = {
    id: number
    date: Date
    _count: ElectionDateCountAggregateOutputType | null
    _avg: ElectionDateAvgAggregateOutputType | null
    _sum: ElectionDateSumAggregateOutputType | null
    _min: ElectionDateMinAggregateOutputType | null
    _max: ElectionDateMaxAggregateOutputType | null
  }

  type GetElectionDateGroupByPayload<T extends ElectionDateGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ElectionDateGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ElectionDateGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ElectionDateGroupByOutputType[P]>
            : GetScalarType<T[P], ElectionDateGroupByOutputType[P]>
        }
      >
    >


  export type ElectionDateSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    date?: boolean
  }, ExtArgs["result"]["electionDate"]>

  export type ElectionDateSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    date?: boolean
  }, ExtArgs["result"]["electionDate"]>

  export type ElectionDateSelectScalar = {
    id?: boolean
    date?: boolean
  }


  export type $ElectionDatePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ElectionDate"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      date: Date
    }, ExtArgs["result"]["electionDate"]>
    composites: {}
  }

  type ElectionDateGetPayload<S extends boolean | null | undefined | ElectionDateDefaultArgs> = $Result.GetResult<Prisma.$ElectionDatePayload, S>

  type ElectionDateCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ElectionDateFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ElectionDateCountAggregateInputType | true
    }

  export interface ElectionDateDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ElectionDate'], meta: { name: 'ElectionDate' } }
    /**
     * Find zero or one ElectionDate that matches the filter.
     * @param {ElectionDateFindUniqueArgs} args - Arguments to find a ElectionDate
     * @example
     * // Get one ElectionDate
     * const electionDate = await prisma.electionDate.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends ElectionDateFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, ElectionDateFindUniqueArgs<ExtArgs>>
    ): Prisma__ElectionDateClient<$Result.GetResult<Prisma.$ElectionDatePayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one ElectionDate that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ElectionDateFindUniqueOrThrowArgs} args - Arguments to find a ElectionDate
     * @example
     * // Get one ElectionDate
     * const electionDate = await prisma.electionDate.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends ElectionDateFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, ElectionDateFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__ElectionDateClient<$Result.GetResult<Prisma.$ElectionDatePayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first ElectionDate that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ElectionDateFindFirstArgs} args - Arguments to find a ElectionDate
     * @example
     * // Get one ElectionDate
     * const electionDate = await prisma.electionDate.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends ElectionDateFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, ElectionDateFindFirstArgs<ExtArgs>>
    ): Prisma__ElectionDateClient<$Result.GetResult<Prisma.$ElectionDatePayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first ElectionDate that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ElectionDateFindFirstOrThrowArgs} args - Arguments to find a ElectionDate
     * @example
     * // Get one ElectionDate
     * const electionDate = await prisma.electionDate.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends ElectionDateFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, ElectionDateFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__ElectionDateClient<$Result.GetResult<Prisma.$ElectionDatePayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more ElectionDates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ElectionDateFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ElectionDates
     * const electionDates = await prisma.electionDate.findMany()
     * 
     * // Get first 10 ElectionDates
     * const electionDates = await prisma.electionDate.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const electionDateWithIdOnly = await prisma.electionDate.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends ElectionDateFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, ElectionDateFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ElectionDatePayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a ElectionDate.
     * @param {ElectionDateCreateArgs} args - Arguments to create a ElectionDate.
     * @example
     * // Create one ElectionDate
     * const ElectionDate = await prisma.electionDate.create({
     *   data: {
     *     // ... data to create a ElectionDate
     *   }
     * })
     * 
    **/
    create<T extends ElectionDateCreateArgs<ExtArgs>>(
      args: SelectSubset<T, ElectionDateCreateArgs<ExtArgs>>
    ): Prisma__ElectionDateClient<$Result.GetResult<Prisma.$ElectionDatePayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many ElectionDates.
     * @param {ElectionDateCreateManyArgs} args - Arguments to create many ElectionDates.
     * @example
     * // Create many ElectionDates
     * const electionDate = await prisma.electionDate.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends ElectionDateCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, ElectionDateCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ElectionDates and returns the data saved in the database.
     * @param {ElectionDateCreateManyAndReturnArgs} args - Arguments to create many ElectionDates.
     * @example
     * // Create many ElectionDates
     * const electionDate = await prisma.electionDate.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ElectionDates and only return the `id`
     * const electionDateWithIdOnly = await prisma.electionDate.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends ElectionDateCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, ElectionDateCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ElectionDatePayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a ElectionDate.
     * @param {ElectionDateDeleteArgs} args - Arguments to delete one ElectionDate.
     * @example
     * // Delete one ElectionDate
     * const ElectionDate = await prisma.electionDate.delete({
     *   where: {
     *     // ... filter to delete one ElectionDate
     *   }
     * })
     * 
    **/
    delete<T extends ElectionDateDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, ElectionDateDeleteArgs<ExtArgs>>
    ): Prisma__ElectionDateClient<$Result.GetResult<Prisma.$ElectionDatePayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one ElectionDate.
     * @param {ElectionDateUpdateArgs} args - Arguments to update one ElectionDate.
     * @example
     * // Update one ElectionDate
     * const electionDate = await prisma.electionDate.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends ElectionDateUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, ElectionDateUpdateArgs<ExtArgs>>
    ): Prisma__ElectionDateClient<$Result.GetResult<Prisma.$ElectionDatePayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more ElectionDates.
     * @param {ElectionDateDeleteManyArgs} args - Arguments to filter ElectionDates to delete.
     * @example
     * // Delete a few ElectionDates
     * const { count } = await prisma.electionDate.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends ElectionDateDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, ElectionDateDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ElectionDates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ElectionDateUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ElectionDates
     * const electionDate = await prisma.electionDate.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends ElectionDateUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, ElectionDateUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ElectionDate.
     * @param {ElectionDateUpsertArgs} args - Arguments to update or create a ElectionDate.
     * @example
     * // Update or create a ElectionDate
     * const electionDate = await prisma.electionDate.upsert({
     *   create: {
     *     // ... data to create a ElectionDate
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ElectionDate we want to update
     *   }
     * })
    **/
    upsert<T extends ElectionDateUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, ElectionDateUpsertArgs<ExtArgs>>
    ): Prisma__ElectionDateClient<$Result.GetResult<Prisma.$ElectionDatePayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of ElectionDates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ElectionDateCountArgs} args - Arguments to filter ElectionDates to count.
     * @example
     * // Count the number of ElectionDates
     * const count = await prisma.electionDate.count({
     *   where: {
     *     // ... the filter for the ElectionDates we want to count
     *   }
     * })
    **/
    count<T extends ElectionDateCountArgs>(
      args?: Subset<T, ElectionDateCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ElectionDateCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ElectionDate.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ElectionDateAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ElectionDateAggregateArgs>(args: Subset<T, ElectionDateAggregateArgs>): Prisma.PrismaPromise<GetElectionDateAggregateType<T>>

    /**
     * Group by ElectionDate.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ElectionDateGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ElectionDateGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ElectionDateGroupByArgs['orderBy'] }
        : { orderBy?: ElectionDateGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ElectionDateGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetElectionDateGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ElectionDate model
   */
  readonly fields: ElectionDateFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ElectionDate.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ElectionDateClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';


    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the ElectionDate model
   */ 
  interface ElectionDateFieldRefs {
    readonly id: FieldRef<"ElectionDate", 'Int'>
    readonly date: FieldRef<"ElectionDate", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ElectionDate findUnique
   */
  export type ElectionDateFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ElectionDate
     */
    select?: ElectionDateSelect<ExtArgs> | null
    /**
     * Filter, which ElectionDate to fetch.
     */
    where: ElectionDateWhereUniqueInput
  }

  /**
   * ElectionDate findUniqueOrThrow
   */
  export type ElectionDateFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ElectionDate
     */
    select?: ElectionDateSelect<ExtArgs> | null
    /**
     * Filter, which ElectionDate to fetch.
     */
    where: ElectionDateWhereUniqueInput
  }

  /**
   * ElectionDate findFirst
   */
  export type ElectionDateFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ElectionDate
     */
    select?: ElectionDateSelect<ExtArgs> | null
    /**
     * Filter, which ElectionDate to fetch.
     */
    where?: ElectionDateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ElectionDates to fetch.
     */
    orderBy?: ElectionDateOrderByWithRelationInput | ElectionDateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ElectionDates.
     */
    cursor?: ElectionDateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ElectionDates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ElectionDates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ElectionDates.
     */
    distinct?: ElectionDateScalarFieldEnum | ElectionDateScalarFieldEnum[]
  }

  /**
   * ElectionDate findFirstOrThrow
   */
  export type ElectionDateFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ElectionDate
     */
    select?: ElectionDateSelect<ExtArgs> | null
    /**
     * Filter, which ElectionDate to fetch.
     */
    where?: ElectionDateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ElectionDates to fetch.
     */
    orderBy?: ElectionDateOrderByWithRelationInput | ElectionDateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ElectionDates.
     */
    cursor?: ElectionDateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ElectionDates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ElectionDates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ElectionDates.
     */
    distinct?: ElectionDateScalarFieldEnum | ElectionDateScalarFieldEnum[]
  }

  /**
   * ElectionDate findMany
   */
  export type ElectionDateFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ElectionDate
     */
    select?: ElectionDateSelect<ExtArgs> | null
    /**
     * Filter, which ElectionDates to fetch.
     */
    where?: ElectionDateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ElectionDates to fetch.
     */
    orderBy?: ElectionDateOrderByWithRelationInput | ElectionDateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ElectionDates.
     */
    cursor?: ElectionDateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ElectionDates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ElectionDates.
     */
    skip?: number
    distinct?: ElectionDateScalarFieldEnum | ElectionDateScalarFieldEnum[]
  }

  /**
   * ElectionDate create
   */
  export type ElectionDateCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ElectionDate
     */
    select?: ElectionDateSelect<ExtArgs> | null
    /**
     * The data needed to create a ElectionDate.
     */
    data: XOR<ElectionDateCreateInput, ElectionDateUncheckedCreateInput>
  }

  /**
   * ElectionDate createMany
   */
  export type ElectionDateCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ElectionDates.
     */
    data: ElectionDateCreateManyInput | ElectionDateCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ElectionDate createManyAndReturn
   */
  export type ElectionDateCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ElectionDate
     */
    select?: ElectionDateSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ElectionDates.
     */
    data: ElectionDateCreateManyInput | ElectionDateCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ElectionDate update
   */
  export type ElectionDateUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ElectionDate
     */
    select?: ElectionDateSelect<ExtArgs> | null
    /**
     * The data needed to update a ElectionDate.
     */
    data: XOR<ElectionDateUpdateInput, ElectionDateUncheckedUpdateInput>
    /**
     * Choose, which ElectionDate to update.
     */
    where: ElectionDateWhereUniqueInput
  }

  /**
   * ElectionDate updateMany
   */
  export type ElectionDateUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ElectionDates.
     */
    data: XOR<ElectionDateUpdateManyMutationInput, ElectionDateUncheckedUpdateManyInput>
    /**
     * Filter which ElectionDates to update
     */
    where?: ElectionDateWhereInput
  }

  /**
   * ElectionDate upsert
   */
  export type ElectionDateUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ElectionDate
     */
    select?: ElectionDateSelect<ExtArgs> | null
    /**
     * The filter to search for the ElectionDate to update in case it exists.
     */
    where: ElectionDateWhereUniqueInput
    /**
     * In case the ElectionDate found by the `where` argument doesn't exist, create a new ElectionDate with this data.
     */
    create: XOR<ElectionDateCreateInput, ElectionDateUncheckedCreateInput>
    /**
     * In case the ElectionDate was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ElectionDateUpdateInput, ElectionDateUncheckedUpdateInput>
  }

  /**
   * ElectionDate delete
   */
  export type ElectionDateDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ElectionDate
     */
    select?: ElectionDateSelect<ExtArgs> | null
    /**
     * Filter which ElectionDate to delete.
     */
    where: ElectionDateWhereUniqueInput
  }

  /**
   * ElectionDate deleteMany
   */
  export type ElectionDateDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ElectionDates to delete
     */
    where?: ElectionDateWhereInput
  }

  /**
   * ElectionDate without action
   */
  export type ElectionDateDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ElectionDate
     */
    select?: ElectionDateSelect<ExtArgs> | null
  }


  /**
   * Model OfficeName
   */

  export type AggregateOfficeName = {
    _count: OfficeNameCountAggregateOutputType | null
    _avg: OfficeNameAvgAggregateOutputType | null
    _sum: OfficeNameSumAggregateOutputType | null
    _min: OfficeNameMinAggregateOutputType | null
    _max: OfficeNameMaxAggregateOutputType | null
  }

  export type OfficeNameAvgAggregateOutputType = {
    id: number | null
  }

  export type OfficeNameSumAggregateOutputType = {
    id: number | null
  }

  export type OfficeNameMinAggregateOutputType = {
    id: number | null
    officeName: string | null
  }

  export type OfficeNameMaxAggregateOutputType = {
    id: number | null
    officeName: string | null
  }

  export type OfficeNameCountAggregateOutputType = {
    id: number
    officeName: number
    _all: number
  }


  export type OfficeNameAvgAggregateInputType = {
    id?: true
  }

  export type OfficeNameSumAggregateInputType = {
    id?: true
  }

  export type OfficeNameMinAggregateInputType = {
    id?: true
    officeName?: true
  }

  export type OfficeNameMaxAggregateInputType = {
    id?: true
    officeName?: true
  }

  export type OfficeNameCountAggregateInputType = {
    id?: true
    officeName?: true
    _all?: true
  }

  export type OfficeNameAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OfficeName to aggregate.
     */
    where?: OfficeNameWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OfficeNames to fetch.
     */
    orderBy?: OfficeNameOrderByWithRelationInput | OfficeNameOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OfficeNameWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OfficeNames from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OfficeNames.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned OfficeNames
    **/
    _count?: true | OfficeNameCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OfficeNameAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OfficeNameSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OfficeNameMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OfficeNameMaxAggregateInputType
  }

  export type GetOfficeNameAggregateType<T extends OfficeNameAggregateArgs> = {
        [P in keyof T & keyof AggregateOfficeName]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOfficeName[P]>
      : GetScalarType<T[P], AggregateOfficeName[P]>
  }




  export type OfficeNameGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OfficeNameWhereInput
    orderBy?: OfficeNameOrderByWithAggregationInput | OfficeNameOrderByWithAggregationInput[]
    by: OfficeNameScalarFieldEnum[] | OfficeNameScalarFieldEnum
    having?: OfficeNameScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OfficeNameCountAggregateInputType | true
    _avg?: OfficeNameAvgAggregateInputType
    _sum?: OfficeNameSumAggregateInputType
    _min?: OfficeNameMinAggregateInputType
    _max?: OfficeNameMaxAggregateInputType
  }

  export type OfficeNameGroupByOutputType = {
    id: number
    officeName: string
    _count: OfficeNameCountAggregateOutputType | null
    _avg: OfficeNameAvgAggregateOutputType | null
    _sum: OfficeNameSumAggregateOutputType | null
    _min: OfficeNameMinAggregateOutputType | null
    _max: OfficeNameMaxAggregateOutputType | null
  }

  type GetOfficeNameGroupByPayload<T extends OfficeNameGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OfficeNameGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OfficeNameGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OfficeNameGroupByOutputType[P]>
            : GetScalarType<T[P], OfficeNameGroupByOutputType[P]>
        }
      >
    >


  export type OfficeNameSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    officeName?: boolean
  }, ExtArgs["result"]["officeName"]>

  export type OfficeNameSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    officeName?: boolean
  }, ExtArgs["result"]["officeName"]>

  export type OfficeNameSelectScalar = {
    id?: boolean
    officeName?: boolean
  }


  export type $OfficeNamePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "OfficeName"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      officeName: string
    }, ExtArgs["result"]["officeName"]>
    composites: {}
  }

  type OfficeNameGetPayload<S extends boolean | null | undefined | OfficeNameDefaultArgs> = $Result.GetResult<Prisma.$OfficeNamePayload, S>

  type OfficeNameCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<OfficeNameFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: OfficeNameCountAggregateInputType | true
    }

  export interface OfficeNameDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['OfficeName'], meta: { name: 'OfficeName' } }
    /**
     * Find zero or one OfficeName that matches the filter.
     * @param {OfficeNameFindUniqueArgs} args - Arguments to find a OfficeName
     * @example
     * // Get one OfficeName
     * const officeName = await prisma.officeName.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends OfficeNameFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, OfficeNameFindUniqueArgs<ExtArgs>>
    ): Prisma__OfficeNameClient<$Result.GetResult<Prisma.$OfficeNamePayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one OfficeName that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {OfficeNameFindUniqueOrThrowArgs} args - Arguments to find a OfficeName
     * @example
     * // Get one OfficeName
     * const officeName = await prisma.officeName.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends OfficeNameFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, OfficeNameFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__OfficeNameClient<$Result.GetResult<Prisma.$OfficeNamePayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first OfficeName that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OfficeNameFindFirstArgs} args - Arguments to find a OfficeName
     * @example
     * // Get one OfficeName
     * const officeName = await prisma.officeName.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends OfficeNameFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, OfficeNameFindFirstArgs<ExtArgs>>
    ): Prisma__OfficeNameClient<$Result.GetResult<Prisma.$OfficeNamePayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first OfficeName that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OfficeNameFindFirstOrThrowArgs} args - Arguments to find a OfficeName
     * @example
     * // Get one OfficeName
     * const officeName = await prisma.officeName.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends OfficeNameFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, OfficeNameFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__OfficeNameClient<$Result.GetResult<Prisma.$OfficeNamePayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more OfficeNames that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OfficeNameFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all OfficeNames
     * const officeNames = await prisma.officeName.findMany()
     * 
     * // Get first 10 OfficeNames
     * const officeNames = await prisma.officeName.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const officeNameWithIdOnly = await prisma.officeName.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends OfficeNameFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, OfficeNameFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OfficeNamePayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a OfficeName.
     * @param {OfficeNameCreateArgs} args - Arguments to create a OfficeName.
     * @example
     * // Create one OfficeName
     * const OfficeName = await prisma.officeName.create({
     *   data: {
     *     // ... data to create a OfficeName
     *   }
     * })
     * 
    **/
    create<T extends OfficeNameCreateArgs<ExtArgs>>(
      args: SelectSubset<T, OfficeNameCreateArgs<ExtArgs>>
    ): Prisma__OfficeNameClient<$Result.GetResult<Prisma.$OfficeNamePayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many OfficeNames.
     * @param {OfficeNameCreateManyArgs} args - Arguments to create many OfficeNames.
     * @example
     * // Create many OfficeNames
     * const officeName = await prisma.officeName.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends OfficeNameCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, OfficeNameCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many OfficeNames and returns the data saved in the database.
     * @param {OfficeNameCreateManyAndReturnArgs} args - Arguments to create many OfficeNames.
     * @example
     * // Create many OfficeNames
     * const officeName = await prisma.officeName.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many OfficeNames and only return the `id`
     * const officeNameWithIdOnly = await prisma.officeName.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends OfficeNameCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, OfficeNameCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OfficeNamePayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a OfficeName.
     * @param {OfficeNameDeleteArgs} args - Arguments to delete one OfficeName.
     * @example
     * // Delete one OfficeName
     * const OfficeName = await prisma.officeName.delete({
     *   where: {
     *     // ... filter to delete one OfficeName
     *   }
     * })
     * 
    **/
    delete<T extends OfficeNameDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, OfficeNameDeleteArgs<ExtArgs>>
    ): Prisma__OfficeNameClient<$Result.GetResult<Prisma.$OfficeNamePayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one OfficeName.
     * @param {OfficeNameUpdateArgs} args - Arguments to update one OfficeName.
     * @example
     * // Update one OfficeName
     * const officeName = await prisma.officeName.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends OfficeNameUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, OfficeNameUpdateArgs<ExtArgs>>
    ): Prisma__OfficeNameClient<$Result.GetResult<Prisma.$OfficeNamePayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more OfficeNames.
     * @param {OfficeNameDeleteManyArgs} args - Arguments to filter OfficeNames to delete.
     * @example
     * // Delete a few OfficeNames
     * const { count } = await prisma.officeName.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends OfficeNameDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, OfficeNameDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more OfficeNames.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OfficeNameUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many OfficeNames
     * const officeName = await prisma.officeName.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends OfficeNameUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, OfficeNameUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one OfficeName.
     * @param {OfficeNameUpsertArgs} args - Arguments to update or create a OfficeName.
     * @example
     * // Update or create a OfficeName
     * const officeName = await prisma.officeName.upsert({
     *   create: {
     *     // ... data to create a OfficeName
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the OfficeName we want to update
     *   }
     * })
    **/
    upsert<T extends OfficeNameUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, OfficeNameUpsertArgs<ExtArgs>>
    ): Prisma__OfficeNameClient<$Result.GetResult<Prisma.$OfficeNamePayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of OfficeNames.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OfficeNameCountArgs} args - Arguments to filter OfficeNames to count.
     * @example
     * // Count the number of OfficeNames
     * const count = await prisma.officeName.count({
     *   where: {
     *     // ... the filter for the OfficeNames we want to count
     *   }
     * })
    **/
    count<T extends OfficeNameCountArgs>(
      args?: Subset<T, OfficeNameCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OfficeNameCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a OfficeName.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OfficeNameAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OfficeNameAggregateArgs>(args: Subset<T, OfficeNameAggregateArgs>): Prisma.PrismaPromise<GetOfficeNameAggregateType<T>>

    /**
     * Group by OfficeName.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OfficeNameGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OfficeNameGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OfficeNameGroupByArgs['orderBy'] }
        : { orderBy?: OfficeNameGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OfficeNameGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOfficeNameGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the OfficeName model
   */
  readonly fields: OfficeNameFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for OfficeName.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OfficeNameClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';


    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the OfficeName model
   */ 
  interface OfficeNameFieldRefs {
    readonly id: FieldRef<"OfficeName", 'Int'>
    readonly officeName: FieldRef<"OfficeName", 'String'>
  }
    

  // Custom InputTypes
  /**
   * OfficeName findUnique
   */
  export type OfficeNameFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfficeName
     */
    select?: OfficeNameSelect<ExtArgs> | null
    /**
     * Filter, which OfficeName to fetch.
     */
    where: OfficeNameWhereUniqueInput
  }

  /**
   * OfficeName findUniqueOrThrow
   */
  export type OfficeNameFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfficeName
     */
    select?: OfficeNameSelect<ExtArgs> | null
    /**
     * Filter, which OfficeName to fetch.
     */
    where: OfficeNameWhereUniqueInput
  }

  /**
   * OfficeName findFirst
   */
  export type OfficeNameFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfficeName
     */
    select?: OfficeNameSelect<ExtArgs> | null
    /**
     * Filter, which OfficeName to fetch.
     */
    where?: OfficeNameWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OfficeNames to fetch.
     */
    orderBy?: OfficeNameOrderByWithRelationInput | OfficeNameOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OfficeNames.
     */
    cursor?: OfficeNameWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OfficeNames from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OfficeNames.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OfficeNames.
     */
    distinct?: OfficeNameScalarFieldEnum | OfficeNameScalarFieldEnum[]
  }

  /**
   * OfficeName findFirstOrThrow
   */
  export type OfficeNameFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfficeName
     */
    select?: OfficeNameSelect<ExtArgs> | null
    /**
     * Filter, which OfficeName to fetch.
     */
    where?: OfficeNameWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OfficeNames to fetch.
     */
    orderBy?: OfficeNameOrderByWithRelationInput | OfficeNameOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OfficeNames.
     */
    cursor?: OfficeNameWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OfficeNames from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OfficeNames.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OfficeNames.
     */
    distinct?: OfficeNameScalarFieldEnum | OfficeNameScalarFieldEnum[]
  }

  /**
   * OfficeName findMany
   */
  export type OfficeNameFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfficeName
     */
    select?: OfficeNameSelect<ExtArgs> | null
    /**
     * Filter, which OfficeNames to fetch.
     */
    where?: OfficeNameWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OfficeNames to fetch.
     */
    orderBy?: OfficeNameOrderByWithRelationInput | OfficeNameOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing OfficeNames.
     */
    cursor?: OfficeNameWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OfficeNames from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OfficeNames.
     */
    skip?: number
    distinct?: OfficeNameScalarFieldEnum | OfficeNameScalarFieldEnum[]
  }

  /**
   * OfficeName create
   */
  export type OfficeNameCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfficeName
     */
    select?: OfficeNameSelect<ExtArgs> | null
    /**
     * The data needed to create a OfficeName.
     */
    data: XOR<OfficeNameCreateInput, OfficeNameUncheckedCreateInput>
  }

  /**
   * OfficeName createMany
   */
  export type OfficeNameCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many OfficeNames.
     */
    data: OfficeNameCreateManyInput | OfficeNameCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * OfficeName createManyAndReturn
   */
  export type OfficeNameCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfficeName
     */
    select?: OfficeNameSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many OfficeNames.
     */
    data: OfficeNameCreateManyInput | OfficeNameCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * OfficeName update
   */
  export type OfficeNameUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfficeName
     */
    select?: OfficeNameSelect<ExtArgs> | null
    /**
     * The data needed to update a OfficeName.
     */
    data: XOR<OfficeNameUpdateInput, OfficeNameUncheckedUpdateInput>
    /**
     * Choose, which OfficeName to update.
     */
    where: OfficeNameWhereUniqueInput
  }

  /**
   * OfficeName updateMany
   */
  export type OfficeNameUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update OfficeNames.
     */
    data: XOR<OfficeNameUpdateManyMutationInput, OfficeNameUncheckedUpdateManyInput>
    /**
     * Filter which OfficeNames to update
     */
    where?: OfficeNameWhereInput
  }

  /**
   * OfficeName upsert
   */
  export type OfficeNameUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfficeName
     */
    select?: OfficeNameSelect<ExtArgs> | null
    /**
     * The filter to search for the OfficeName to update in case it exists.
     */
    where: OfficeNameWhereUniqueInput
    /**
     * In case the OfficeName found by the `where` argument doesn't exist, create a new OfficeName with this data.
     */
    create: XOR<OfficeNameCreateInput, OfficeNameUncheckedCreateInput>
    /**
     * In case the OfficeName was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OfficeNameUpdateInput, OfficeNameUncheckedUpdateInput>
  }

  /**
   * OfficeName delete
   */
  export type OfficeNameDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfficeName
     */
    select?: OfficeNameSelect<ExtArgs> | null
    /**
     * Filter which OfficeName to delete.
     */
    where: OfficeNameWhereUniqueInput
  }

  /**
   * OfficeName deleteMany
   */
  export type OfficeNameDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OfficeNames to delete
     */
    where?: OfficeNameWhereInput
  }

  /**
   * OfficeName without action
   */
  export type OfficeNameDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OfficeName
     */
    select?: OfficeNameSelect<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    name: 'name',
    email: 'email',
    emailVerified: 'emailVerified',
    image: 'image',
    privilegeLevel: 'privilegeLevel',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const AccountScalarFieldEnum: {
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

  export type AccountScalarFieldEnum = (typeof AccountScalarFieldEnum)[keyof typeof AccountScalarFieldEnum]


  export const SessionScalarFieldEnum: {
    sessionToken: 'sessionToken',
    userId: 'userId',
    expires: 'expires',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type SessionScalarFieldEnum = (typeof SessionScalarFieldEnum)[keyof typeof SessionScalarFieldEnum]


  export const PrivilegedUserScalarFieldEnum: {
    id: 'id',
    email: 'email',
    privilegeLevel: 'privilegeLevel'
  };

  export type PrivilegedUserScalarFieldEnum = (typeof PrivilegedUserScalarFieldEnum)[keyof typeof PrivilegedUserScalarFieldEnum]


  export const VerificationTokenScalarFieldEnum: {
    identifier: 'identifier',
    token: 'token',
    expires: 'expires'
  };

  export type VerificationTokenScalarFieldEnum = (typeof VerificationTokenScalarFieldEnum)[keyof typeof VerificationTokenScalarFieldEnum]


  export const AuthenticatorScalarFieldEnum: {
    credentialID: 'credentialID',
    userId: 'userId',
    providerAccountId: 'providerAccountId',
    credentialPublicKey: 'credentialPublicKey',
    counter: 'counter',
    credentialDeviceType: 'credentialDeviceType',
    credentialBackedUp: 'credentialBackedUp',
    transports: 'transports'
  };

  export type AuthenticatorScalarFieldEnum = (typeof AuthenticatorScalarFieldEnum)[keyof typeof AuthenticatorScalarFieldEnum]


  export const VoterRecordArchiveScalarFieldEnum: {
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

  export type VoterRecordArchiveScalarFieldEnum = (typeof VoterRecordArchiveScalarFieldEnum)[keyof typeof VoterRecordArchiveScalarFieldEnum]


  export const VoterRecordScalarFieldEnum: {
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

  export type VoterRecordScalarFieldEnum = (typeof VoterRecordScalarFieldEnum)[keyof typeof VoterRecordScalarFieldEnum]


  export const VotingHistoryRecordScalarFieldEnum: {
    id: 'id',
    voterRecordId: 'voterRecordId',
    date: 'date',
    value: 'value'
  };

  export type VotingHistoryRecordScalarFieldEnum = (typeof VotingHistoryRecordScalarFieldEnum)[keyof typeof VotingHistoryRecordScalarFieldEnum]


  export const CommitteeListScalarFieldEnum: {
    id: 'id',
    cityTown: 'cityTown',
    legDistrict: 'legDistrict',
    electionDistrict: 'electionDistrict'
  };

  export type CommitteeListScalarFieldEnum = (typeof CommitteeListScalarFieldEnum)[keyof typeof CommitteeListScalarFieldEnum]


  export const CommitteeRequestScalarFieldEnum: {
    id: 'id',
    committeeListId: 'committeeListId',
    addVoterRecordId: 'addVoterRecordId',
    removeVoterRecordId: 'removeVoterRecordId',
    requestNotes: 'requestNotes'
  };

  export type CommitteeRequestScalarFieldEnum = (typeof CommitteeRequestScalarFieldEnum)[keyof typeof CommitteeRequestScalarFieldEnum]


  export const DropdownListsScalarFieldEnum: {
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

  export type DropdownListsScalarFieldEnum = (typeof DropdownListsScalarFieldEnum)[keyof typeof DropdownListsScalarFieldEnum]


  export const CommitteeUploadDiscrepancyScalarFieldEnum: {
    id: 'id',
    VRCNUM: 'VRCNUM',
    committeeId: 'committeeId',
    discrepancy: 'discrepancy'
  };

  export type CommitteeUploadDiscrepancyScalarFieldEnum = (typeof CommitteeUploadDiscrepancyScalarFieldEnum)[keyof typeof CommitteeUploadDiscrepancyScalarFieldEnum]


  export const ElectionDateScalarFieldEnum: {
    id: 'id',
    date: 'date'
  };

  export type ElectionDateScalarFieldEnum = (typeof ElectionDateScalarFieldEnum)[keyof typeof ElectionDateScalarFieldEnum]


  export const OfficeNameScalarFieldEnum: {
    id: 'id',
    officeName: 'officeName'
  };

  export type OfficeNameScalarFieldEnum = (typeof OfficeNameScalarFieldEnum)[keyof typeof OfficeNameScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'PrivilegeLevel'
   */
  export type EnumPrivilegeLevelFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PrivilegeLevel'>
    


  /**
   * Reference to a field of type 'PrivilegeLevel[]'
   */
  export type ListEnumPrivilegeLevelFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PrivilegeLevel[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    name?: StringNullableFilter<"User"> | string | null
    email?: StringFilter<"User"> | string
    emailVerified?: DateTimeNullableFilter<"User"> | Date | string | null
    image?: StringNullableFilter<"User"> | string | null
    privilegeLevel?: EnumPrivilegeLevelFilter<"User"> | $Enums.PrivilegeLevel
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    accounts?: AccountListRelationFilter
    sessions?: SessionListRelationFilter
    Authenticator?: AuthenticatorListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrderInput | SortOrder
    email?: SortOrder
    emailVerified?: SortOrderInput | SortOrder
    image?: SortOrderInput | SortOrder
    privilegeLevel?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    accounts?: AccountOrderByRelationAggregateInput
    sessions?: SessionOrderByRelationAggregateInput
    Authenticator?: AuthenticatorOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    name?: StringNullableFilter<"User"> | string | null
    emailVerified?: DateTimeNullableFilter<"User"> | Date | string | null
    image?: StringNullableFilter<"User"> | string | null
    privilegeLevel?: EnumPrivilegeLevelFilter<"User"> | $Enums.PrivilegeLevel
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    accounts?: AccountListRelationFilter
    sessions?: SessionListRelationFilter
    Authenticator?: AuthenticatorListRelationFilter
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrderInput | SortOrder
    email?: SortOrder
    emailVerified?: SortOrderInput | SortOrder
    image?: SortOrderInput | SortOrder
    privilegeLevel?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    name?: StringNullableWithAggregatesFilter<"User"> | string | null
    email?: StringWithAggregatesFilter<"User"> | string
    emailVerified?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    image?: StringNullableWithAggregatesFilter<"User"> | string | null
    privilegeLevel?: EnumPrivilegeLevelWithAggregatesFilter<"User"> | $Enums.PrivilegeLevel
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type AccountWhereInput = {
    AND?: AccountWhereInput | AccountWhereInput[]
    OR?: AccountWhereInput[]
    NOT?: AccountWhereInput | AccountWhereInput[]
    userId?: StringFilter<"Account"> | string
    type?: StringFilter<"Account"> | string
    provider?: StringFilter<"Account"> | string
    providerAccountId?: StringFilter<"Account"> | string
    refresh_token?: StringNullableFilter<"Account"> | string | null
    access_token?: StringNullableFilter<"Account"> | string | null
    expires_at?: IntNullableFilter<"Account"> | number | null
    token_type?: StringNullableFilter<"Account"> | string | null
    scope?: StringNullableFilter<"Account"> | string | null
    id_token?: StringNullableFilter<"Account"> | string | null
    session_state?: StringNullableFilter<"Account"> | string | null
    createdAt?: DateTimeFilter<"Account"> | Date | string
    updatedAt?: DateTimeFilter<"Account"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
  }

  export type AccountOrderByWithRelationInput = {
    userId?: SortOrder
    type?: SortOrder
    provider?: SortOrder
    providerAccountId?: SortOrder
    refresh_token?: SortOrderInput | SortOrder
    access_token?: SortOrderInput | SortOrder
    expires_at?: SortOrderInput | SortOrder
    token_type?: SortOrderInput | SortOrder
    scope?: SortOrderInput | SortOrder
    id_token?: SortOrderInput | SortOrder
    session_state?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type AccountWhereUniqueInput = Prisma.AtLeast<{
    provider_providerAccountId?: AccountProviderProviderAccountIdCompoundUniqueInput
    AND?: AccountWhereInput | AccountWhereInput[]
    OR?: AccountWhereInput[]
    NOT?: AccountWhereInput | AccountWhereInput[]
    userId?: StringFilter<"Account"> | string
    type?: StringFilter<"Account"> | string
    provider?: StringFilter<"Account"> | string
    providerAccountId?: StringFilter<"Account"> | string
    refresh_token?: StringNullableFilter<"Account"> | string | null
    access_token?: StringNullableFilter<"Account"> | string | null
    expires_at?: IntNullableFilter<"Account"> | number | null
    token_type?: StringNullableFilter<"Account"> | string | null
    scope?: StringNullableFilter<"Account"> | string | null
    id_token?: StringNullableFilter<"Account"> | string | null
    session_state?: StringNullableFilter<"Account"> | string | null
    createdAt?: DateTimeFilter<"Account"> | Date | string
    updatedAt?: DateTimeFilter<"Account"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
  }, "provider_providerAccountId">

  export type AccountOrderByWithAggregationInput = {
    userId?: SortOrder
    type?: SortOrder
    provider?: SortOrder
    providerAccountId?: SortOrder
    refresh_token?: SortOrderInput | SortOrder
    access_token?: SortOrderInput | SortOrder
    expires_at?: SortOrderInput | SortOrder
    token_type?: SortOrderInput | SortOrder
    scope?: SortOrderInput | SortOrder
    id_token?: SortOrderInput | SortOrder
    session_state?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AccountCountOrderByAggregateInput
    _avg?: AccountAvgOrderByAggregateInput
    _max?: AccountMaxOrderByAggregateInput
    _min?: AccountMinOrderByAggregateInput
    _sum?: AccountSumOrderByAggregateInput
  }

  export type AccountScalarWhereWithAggregatesInput = {
    AND?: AccountScalarWhereWithAggregatesInput | AccountScalarWhereWithAggregatesInput[]
    OR?: AccountScalarWhereWithAggregatesInput[]
    NOT?: AccountScalarWhereWithAggregatesInput | AccountScalarWhereWithAggregatesInput[]
    userId?: StringWithAggregatesFilter<"Account"> | string
    type?: StringWithAggregatesFilter<"Account"> | string
    provider?: StringWithAggregatesFilter<"Account"> | string
    providerAccountId?: StringWithAggregatesFilter<"Account"> | string
    refresh_token?: StringNullableWithAggregatesFilter<"Account"> | string | null
    access_token?: StringNullableWithAggregatesFilter<"Account"> | string | null
    expires_at?: IntNullableWithAggregatesFilter<"Account"> | number | null
    token_type?: StringNullableWithAggregatesFilter<"Account"> | string | null
    scope?: StringNullableWithAggregatesFilter<"Account"> | string | null
    id_token?: StringNullableWithAggregatesFilter<"Account"> | string | null
    session_state?: StringNullableWithAggregatesFilter<"Account"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Account"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Account"> | Date | string
  }

  export type SessionWhereInput = {
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    sessionToken?: StringFilter<"Session"> | string
    userId?: StringFilter<"Session"> | string
    expires?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    updatedAt?: DateTimeFilter<"Session"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
  }

  export type SessionOrderByWithRelationInput = {
    sessionToken?: SortOrder
    userId?: SortOrder
    expires?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type SessionWhereUniqueInput = Prisma.AtLeast<{
    sessionToken?: string
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    userId?: StringFilter<"Session"> | string
    expires?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    updatedAt?: DateTimeFilter<"Session"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
  }, "sessionToken">

  export type SessionOrderByWithAggregationInput = {
    sessionToken?: SortOrder
    userId?: SortOrder
    expires?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SessionCountOrderByAggregateInput
    _max?: SessionMaxOrderByAggregateInput
    _min?: SessionMinOrderByAggregateInput
  }

  export type SessionScalarWhereWithAggregatesInput = {
    AND?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    OR?: SessionScalarWhereWithAggregatesInput[]
    NOT?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    sessionToken?: StringWithAggregatesFilter<"Session"> | string
    userId?: StringWithAggregatesFilter<"Session"> | string
    expires?: DateTimeWithAggregatesFilter<"Session"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
  }

  export type PrivilegedUserWhereInput = {
    AND?: PrivilegedUserWhereInput | PrivilegedUserWhereInput[]
    OR?: PrivilegedUserWhereInput[]
    NOT?: PrivilegedUserWhereInput | PrivilegedUserWhereInput[]
    id?: IntFilter<"PrivilegedUser"> | number
    email?: StringFilter<"PrivilegedUser"> | string
    privilegeLevel?: EnumPrivilegeLevelFilter<"PrivilegedUser"> | $Enums.PrivilegeLevel
  }

  export type PrivilegedUserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    privilegeLevel?: SortOrder
  }

  export type PrivilegedUserWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    email?: string
    AND?: PrivilegedUserWhereInput | PrivilegedUserWhereInput[]
    OR?: PrivilegedUserWhereInput[]
    NOT?: PrivilegedUserWhereInput | PrivilegedUserWhereInput[]
    privilegeLevel?: EnumPrivilegeLevelFilter<"PrivilegedUser"> | $Enums.PrivilegeLevel
  }, "id" | "email">

  export type PrivilegedUserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    privilegeLevel?: SortOrder
    _count?: PrivilegedUserCountOrderByAggregateInput
    _avg?: PrivilegedUserAvgOrderByAggregateInput
    _max?: PrivilegedUserMaxOrderByAggregateInput
    _min?: PrivilegedUserMinOrderByAggregateInput
    _sum?: PrivilegedUserSumOrderByAggregateInput
  }

  export type PrivilegedUserScalarWhereWithAggregatesInput = {
    AND?: PrivilegedUserScalarWhereWithAggregatesInput | PrivilegedUserScalarWhereWithAggregatesInput[]
    OR?: PrivilegedUserScalarWhereWithAggregatesInput[]
    NOT?: PrivilegedUserScalarWhereWithAggregatesInput | PrivilegedUserScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"PrivilegedUser"> | number
    email?: StringWithAggregatesFilter<"PrivilegedUser"> | string
    privilegeLevel?: EnumPrivilegeLevelWithAggregatesFilter<"PrivilegedUser"> | $Enums.PrivilegeLevel
  }

  export type VerificationTokenWhereInput = {
    AND?: VerificationTokenWhereInput | VerificationTokenWhereInput[]
    OR?: VerificationTokenWhereInput[]
    NOT?: VerificationTokenWhereInput | VerificationTokenWhereInput[]
    identifier?: StringFilter<"VerificationToken"> | string
    token?: StringFilter<"VerificationToken"> | string
    expires?: DateTimeFilter<"VerificationToken"> | Date | string
  }

  export type VerificationTokenOrderByWithRelationInput = {
    identifier?: SortOrder
    token?: SortOrder
    expires?: SortOrder
  }

  export type VerificationTokenWhereUniqueInput = Prisma.AtLeast<{
    identifier_token?: VerificationTokenIdentifierTokenCompoundUniqueInput
    AND?: VerificationTokenWhereInput | VerificationTokenWhereInput[]
    OR?: VerificationTokenWhereInput[]
    NOT?: VerificationTokenWhereInput | VerificationTokenWhereInput[]
    identifier?: StringFilter<"VerificationToken"> | string
    token?: StringFilter<"VerificationToken"> | string
    expires?: DateTimeFilter<"VerificationToken"> | Date | string
  }, "identifier_token">

  export type VerificationTokenOrderByWithAggregationInput = {
    identifier?: SortOrder
    token?: SortOrder
    expires?: SortOrder
    _count?: VerificationTokenCountOrderByAggregateInput
    _max?: VerificationTokenMaxOrderByAggregateInput
    _min?: VerificationTokenMinOrderByAggregateInput
  }

  export type VerificationTokenScalarWhereWithAggregatesInput = {
    AND?: VerificationTokenScalarWhereWithAggregatesInput | VerificationTokenScalarWhereWithAggregatesInput[]
    OR?: VerificationTokenScalarWhereWithAggregatesInput[]
    NOT?: VerificationTokenScalarWhereWithAggregatesInput | VerificationTokenScalarWhereWithAggregatesInput[]
    identifier?: StringWithAggregatesFilter<"VerificationToken"> | string
    token?: StringWithAggregatesFilter<"VerificationToken"> | string
    expires?: DateTimeWithAggregatesFilter<"VerificationToken"> | Date | string
  }

  export type AuthenticatorWhereInput = {
    AND?: AuthenticatorWhereInput | AuthenticatorWhereInput[]
    OR?: AuthenticatorWhereInput[]
    NOT?: AuthenticatorWhereInput | AuthenticatorWhereInput[]
    credentialID?: StringFilter<"Authenticator"> | string
    userId?: StringFilter<"Authenticator"> | string
    providerAccountId?: StringFilter<"Authenticator"> | string
    credentialPublicKey?: StringFilter<"Authenticator"> | string
    counter?: IntFilter<"Authenticator"> | number
    credentialDeviceType?: StringFilter<"Authenticator"> | string
    credentialBackedUp?: BoolFilter<"Authenticator"> | boolean
    transports?: StringNullableFilter<"Authenticator"> | string | null
    user?: XOR<UserRelationFilter, UserWhereInput>
  }

  export type AuthenticatorOrderByWithRelationInput = {
    credentialID?: SortOrder
    userId?: SortOrder
    providerAccountId?: SortOrder
    credentialPublicKey?: SortOrder
    counter?: SortOrder
    credentialDeviceType?: SortOrder
    credentialBackedUp?: SortOrder
    transports?: SortOrderInput | SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type AuthenticatorWhereUniqueInput = Prisma.AtLeast<{
    credentialID?: string
    userId_credentialID?: AuthenticatorUserIdCredentialIDCompoundUniqueInput
    AND?: AuthenticatorWhereInput | AuthenticatorWhereInput[]
    OR?: AuthenticatorWhereInput[]
    NOT?: AuthenticatorWhereInput | AuthenticatorWhereInput[]
    userId?: StringFilter<"Authenticator"> | string
    providerAccountId?: StringFilter<"Authenticator"> | string
    credentialPublicKey?: StringFilter<"Authenticator"> | string
    counter?: IntFilter<"Authenticator"> | number
    credentialDeviceType?: StringFilter<"Authenticator"> | string
    credentialBackedUp?: BoolFilter<"Authenticator"> | boolean
    transports?: StringNullableFilter<"Authenticator"> | string | null
    user?: XOR<UserRelationFilter, UserWhereInput>
  }, "userId_credentialID" | "credentialID">

  export type AuthenticatorOrderByWithAggregationInput = {
    credentialID?: SortOrder
    userId?: SortOrder
    providerAccountId?: SortOrder
    credentialPublicKey?: SortOrder
    counter?: SortOrder
    credentialDeviceType?: SortOrder
    credentialBackedUp?: SortOrder
    transports?: SortOrderInput | SortOrder
    _count?: AuthenticatorCountOrderByAggregateInput
    _avg?: AuthenticatorAvgOrderByAggregateInput
    _max?: AuthenticatorMaxOrderByAggregateInput
    _min?: AuthenticatorMinOrderByAggregateInput
    _sum?: AuthenticatorSumOrderByAggregateInput
  }

  export type AuthenticatorScalarWhereWithAggregatesInput = {
    AND?: AuthenticatorScalarWhereWithAggregatesInput | AuthenticatorScalarWhereWithAggregatesInput[]
    OR?: AuthenticatorScalarWhereWithAggregatesInput[]
    NOT?: AuthenticatorScalarWhereWithAggregatesInput | AuthenticatorScalarWhereWithAggregatesInput[]
    credentialID?: StringWithAggregatesFilter<"Authenticator"> | string
    userId?: StringWithAggregatesFilter<"Authenticator"> | string
    providerAccountId?: StringWithAggregatesFilter<"Authenticator"> | string
    credentialPublicKey?: StringWithAggregatesFilter<"Authenticator"> | string
    counter?: IntWithAggregatesFilter<"Authenticator"> | number
    credentialDeviceType?: StringWithAggregatesFilter<"Authenticator"> | string
    credentialBackedUp?: BoolWithAggregatesFilter<"Authenticator"> | boolean
    transports?: StringNullableWithAggregatesFilter<"Authenticator"> | string | null
  }

  export type VoterRecordArchiveWhereInput = {
    AND?: VoterRecordArchiveWhereInput | VoterRecordArchiveWhereInput[]
    OR?: VoterRecordArchiveWhereInput[]
    NOT?: VoterRecordArchiveWhereInput | VoterRecordArchiveWhereInput[]
    id?: IntFilter<"VoterRecordArchive"> | number
    VRCNUM?: StringFilter<"VoterRecordArchive"> | string
    recordEntryYear?: IntFilter<"VoterRecordArchive"> | number
    recordEntryNumber?: IntFilter<"VoterRecordArchive"> | number
    lastName?: StringNullableFilter<"VoterRecordArchive"> | string | null
    firstName?: StringNullableFilter<"VoterRecordArchive"> | string | null
    middleInitial?: StringNullableFilter<"VoterRecordArchive"> | string | null
    suffixName?: StringNullableFilter<"VoterRecordArchive"> | string | null
    houseNum?: IntNullableFilter<"VoterRecordArchive"> | number | null
    street?: StringNullableFilter<"VoterRecordArchive"> | string | null
    apartment?: StringNullableFilter<"VoterRecordArchive"> | string | null
    halfAddress?: StringNullableFilter<"VoterRecordArchive"> | string | null
    resAddrLine2?: StringNullableFilter<"VoterRecordArchive"> | string | null
    resAddrLine3?: StringNullableFilter<"VoterRecordArchive"> | string | null
    city?: StringNullableFilter<"VoterRecordArchive"> | string | null
    state?: StringNullableFilter<"VoterRecordArchive"> | string | null
    zipCode?: StringNullableFilter<"VoterRecordArchive"> | string | null
    zipSuffix?: StringNullableFilter<"VoterRecordArchive"> | string | null
    telephone?: StringNullableFilter<"VoterRecordArchive"> | string | null
    email?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingAddress1?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingAddress2?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingAddress3?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingAddress4?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingCity?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingState?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingZip?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingZipSuffix?: StringNullableFilter<"VoterRecordArchive"> | string | null
    party?: StringNullableFilter<"VoterRecordArchive"> | string | null
    gender?: StringNullableFilter<"VoterRecordArchive"> | string | null
    DOB?: DateTimeNullableFilter<"VoterRecordArchive"> | Date | string | null
    L_T?: StringNullableFilter<"VoterRecordArchive"> | string | null
    electionDistrict?: IntNullableFilter<"VoterRecordArchive"> | number | null
    countyLegDistrict?: StringNullableFilter<"VoterRecordArchive"> | string | null
    stateAssmblyDistrict?: StringNullableFilter<"VoterRecordArchive"> | string | null
    stateSenateDistrict?: StringNullableFilter<"VoterRecordArchive"> | string | null
    congressionalDistrict?: StringNullableFilter<"VoterRecordArchive"> | string | null
    CC_WD_Village?: StringNullableFilter<"VoterRecordArchive"> | string | null
    townCode?: StringNullableFilter<"VoterRecordArchive"> | string | null
    lastUpdate?: DateTimeNullableFilter<"VoterRecordArchive"> | Date | string | null
    originalRegDate?: DateTimeNullableFilter<"VoterRecordArchive"> | Date | string | null
    statevid?: StringNullableFilter<"VoterRecordArchive"> | string | null
  }

  export type VoterRecordArchiveOrderByWithRelationInput = {
    id?: SortOrder
    VRCNUM?: SortOrder
    recordEntryYear?: SortOrder
    recordEntryNumber?: SortOrder
    lastName?: SortOrderInput | SortOrder
    firstName?: SortOrderInput | SortOrder
    middleInitial?: SortOrderInput | SortOrder
    suffixName?: SortOrderInput | SortOrder
    houseNum?: SortOrderInput | SortOrder
    street?: SortOrderInput | SortOrder
    apartment?: SortOrderInput | SortOrder
    halfAddress?: SortOrderInput | SortOrder
    resAddrLine2?: SortOrderInput | SortOrder
    resAddrLine3?: SortOrderInput | SortOrder
    city?: SortOrderInput | SortOrder
    state?: SortOrderInput | SortOrder
    zipCode?: SortOrderInput | SortOrder
    zipSuffix?: SortOrderInput | SortOrder
    telephone?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    mailingAddress1?: SortOrderInput | SortOrder
    mailingAddress2?: SortOrderInput | SortOrder
    mailingAddress3?: SortOrderInput | SortOrder
    mailingAddress4?: SortOrderInput | SortOrder
    mailingCity?: SortOrderInput | SortOrder
    mailingState?: SortOrderInput | SortOrder
    mailingZip?: SortOrderInput | SortOrder
    mailingZipSuffix?: SortOrderInput | SortOrder
    party?: SortOrderInput | SortOrder
    gender?: SortOrderInput | SortOrder
    DOB?: SortOrderInput | SortOrder
    L_T?: SortOrderInput | SortOrder
    electionDistrict?: SortOrderInput | SortOrder
    countyLegDistrict?: SortOrderInput | SortOrder
    stateAssmblyDistrict?: SortOrderInput | SortOrder
    stateSenateDistrict?: SortOrderInput | SortOrder
    congressionalDistrict?: SortOrderInput | SortOrder
    CC_WD_Village?: SortOrderInput | SortOrder
    townCode?: SortOrderInput | SortOrder
    lastUpdate?: SortOrderInput | SortOrder
    originalRegDate?: SortOrderInput | SortOrder
    statevid?: SortOrderInput | SortOrder
  }

  export type VoterRecordArchiveWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    VRCNUM_recordEntryYear_recordEntryNumber?: VoterRecordArchiveVRCNUMRecordEntryYearRecordEntryNumberCompoundUniqueInput
    AND?: VoterRecordArchiveWhereInput | VoterRecordArchiveWhereInput[]
    OR?: VoterRecordArchiveWhereInput[]
    NOT?: VoterRecordArchiveWhereInput | VoterRecordArchiveWhereInput[]
    VRCNUM?: StringFilter<"VoterRecordArchive"> | string
    recordEntryYear?: IntFilter<"VoterRecordArchive"> | number
    recordEntryNumber?: IntFilter<"VoterRecordArchive"> | number
    lastName?: StringNullableFilter<"VoterRecordArchive"> | string | null
    firstName?: StringNullableFilter<"VoterRecordArchive"> | string | null
    middleInitial?: StringNullableFilter<"VoterRecordArchive"> | string | null
    suffixName?: StringNullableFilter<"VoterRecordArchive"> | string | null
    houseNum?: IntNullableFilter<"VoterRecordArchive"> | number | null
    street?: StringNullableFilter<"VoterRecordArchive"> | string | null
    apartment?: StringNullableFilter<"VoterRecordArchive"> | string | null
    halfAddress?: StringNullableFilter<"VoterRecordArchive"> | string | null
    resAddrLine2?: StringNullableFilter<"VoterRecordArchive"> | string | null
    resAddrLine3?: StringNullableFilter<"VoterRecordArchive"> | string | null
    city?: StringNullableFilter<"VoterRecordArchive"> | string | null
    state?: StringNullableFilter<"VoterRecordArchive"> | string | null
    zipCode?: StringNullableFilter<"VoterRecordArchive"> | string | null
    zipSuffix?: StringNullableFilter<"VoterRecordArchive"> | string | null
    telephone?: StringNullableFilter<"VoterRecordArchive"> | string | null
    email?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingAddress1?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingAddress2?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingAddress3?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingAddress4?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingCity?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingState?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingZip?: StringNullableFilter<"VoterRecordArchive"> | string | null
    mailingZipSuffix?: StringNullableFilter<"VoterRecordArchive"> | string | null
    party?: StringNullableFilter<"VoterRecordArchive"> | string | null
    gender?: StringNullableFilter<"VoterRecordArchive"> | string | null
    DOB?: DateTimeNullableFilter<"VoterRecordArchive"> | Date | string | null
    L_T?: StringNullableFilter<"VoterRecordArchive"> | string | null
    electionDistrict?: IntNullableFilter<"VoterRecordArchive"> | number | null
    countyLegDistrict?: StringNullableFilter<"VoterRecordArchive"> | string | null
    stateAssmblyDistrict?: StringNullableFilter<"VoterRecordArchive"> | string | null
    stateSenateDistrict?: StringNullableFilter<"VoterRecordArchive"> | string | null
    congressionalDistrict?: StringNullableFilter<"VoterRecordArchive"> | string | null
    CC_WD_Village?: StringNullableFilter<"VoterRecordArchive"> | string | null
    townCode?: StringNullableFilter<"VoterRecordArchive"> | string | null
    lastUpdate?: DateTimeNullableFilter<"VoterRecordArchive"> | Date | string | null
    originalRegDate?: DateTimeNullableFilter<"VoterRecordArchive"> | Date | string | null
    statevid?: StringNullableFilter<"VoterRecordArchive"> | string | null
  }, "id" | "VRCNUM_recordEntryYear_recordEntryNumber">

  export type VoterRecordArchiveOrderByWithAggregationInput = {
    id?: SortOrder
    VRCNUM?: SortOrder
    recordEntryYear?: SortOrder
    recordEntryNumber?: SortOrder
    lastName?: SortOrderInput | SortOrder
    firstName?: SortOrderInput | SortOrder
    middleInitial?: SortOrderInput | SortOrder
    suffixName?: SortOrderInput | SortOrder
    houseNum?: SortOrderInput | SortOrder
    street?: SortOrderInput | SortOrder
    apartment?: SortOrderInput | SortOrder
    halfAddress?: SortOrderInput | SortOrder
    resAddrLine2?: SortOrderInput | SortOrder
    resAddrLine3?: SortOrderInput | SortOrder
    city?: SortOrderInput | SortOrder
    state?: SortOrderInput | SortOrder
    zipCode?: SortOrderInput | SortOrder
    zipSuffix?: SortOrderInput | SortOrder
    telephone?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    mailingAddress1?: SortOrderInput | SortOrder
    mailingAddress2?: SortOrderInput | SortOrder
    mailingAddress3?: SortOrderInput | SortOrder
    mailingAddress4?: SortOrderInput | SortOrder
    mailingCity?: SortOrderInput | SortOrder
    mailingState?: SortOrderInput | SortOrder
    mailingZip?: SortOrderInput | SortOrder
    mailingZipSuffix?: SortOrderInput | SortOrder
    party?: SortOrderInput | SortOrder
    gender?: SortOrderInput | SortOrder
    DOB?: SortOrderInput | SortOrder
    L_T?: SortOrderInput | SortOrder
    electionDistrict?: SortOrderInput | SortOrder
    countyLegDistrict?: SortOrderInput | SortOrder
    stateAssmblyDistrict?: SortOrderInput | SortOrder
    stateSenateDistrict?: SortOrderInput | SortOrder
    congressionalDistrict?: SortOrderInput | SortOrder
    CC_WD_Village?: SortOrderInput | SortOrder
    townCode?: SortOrderInput | SortOrder
    lastUpdate?: SortOrderInput | SortOrder
    originalRegDate?: SortOrderInput | SortOrder
    statevid?: SortOrderInput | SortOrder
    _count?: VoterRecordArchiveCountOrderByAggregateInput
    _avg?: VoterRecordArchiveAvgOrderByAggregateInput
    _max?: VoterRecordArchiveMaxOrderByAggregateInput
    _min?: VoterRecordArchiveMinOrderByAggregateInput
    _sum?: VoterRecordArchiveSumOrderByAggregateInput
  }

  export type VoterRecordArchiveScalarWhereWithAggregatesInput = {
    AND?: VoterRecordArchiveScalarWhereWithAggregatesInput | VoterRecordArchiveScalarWhereWithAggregatesInput[]
    OR?: VoterRecordArchiveScalarWhereWithAggregatesInput[]
    NOT?: VoterRecordArchiveScalarWhereWithAggregatesInput | VoterRecordArchiveScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"VoterRecordArchive"> | number
    VRCNUM?: StringWithAggregatesFilter<"VoterRecordArchive"> | string
    recordEntryYear?: IntWithAggregatesFilter<"VoterRecordArchive"> | number
    recordEntryNumber?: IntWithAggregatesFilter<"VoterRecordArchive"> | number
    lastName?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    firstName?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    middleInitial?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    suffixName?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    houseNum?: IntNullableWithAggregatesFilter<"VoterRecordArchive"> | number | null
    street?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    apartment?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    halfAddress?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    resAddrLine2?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    resAddrLine3?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    city?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    state?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    zipCode?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    zipSuffix?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    telephone?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    email?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    mailingAddress1?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    mailingAddress2?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    mailingAddress3?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    mailingAddress4?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    mailingCity?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    mailingState?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    mailingZip?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    mailingZipSuffix?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    party?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    gender?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    DOB?: DateTimeNullableWithAggregatesFilter<"VoterRecordArchive"> | Date | string | null
    L_T?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    electionDistrict?: IntNullableWithAggregatesFilter<"VoterRecordArchive"> | number | null
    countyLegDistrict?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    stateAssmblyDistrict?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    stateSenateDistrict?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    congressionalDistrict?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    CC_WD_Village?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    townCode?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
    lastUpdate?: DateTimeNullableWithAggregatesFilter<"VoterRecordArchive"> | Date | string | null
    originalRegDate?: DateTimeNullableWithAggregatesFilter<"VoterRecordArchive"> | Date | string | null
    statevid?: StringNullableWithAggregatesFilter<"VoterRecordArchive"> | string | null
  }

  export type VoterRecordWhereInput = {
    AND?: VoterRecordWhereInput | VoterRecordWhereInput[]
    OR?: VoterRecordWhereInput[]
    NOT?: VoterRecordWhereInput | VoterRecordWhereInput[]
    VRCNUM?: StringFilter<"VoterRecord"> | string
    committeeId?: IntNullableFilter<"VoterRecord"> | number | null
    addressForCommittee?: StringNullableFilter<"VoterRecord"> | string | null
    latestRecordEntryYear?: IntFilter<"VoterRecord"> | number
    latestRecordEntryNumber?: IntFilter<"VoterRecord"> | number
    lastName?: StringNullableFilter<"VoterRecord"> | string | null
    firstName?: StringNullableFilter<"VoterRecord"> | string | null
    middleInitial?: StringNullableFilter<"VoterRecord"> | string | null
    suffixName?: StringNullableFilter<"VoterRecord"> | string | null
    houseNum?: IntNullableFilter<"VoterRecord"> | number | null
    street?: StringNullableFilter<"VoterRecord"> | string | null
    apartment?: StringNullableFilter<"VoterRecord"> | string | null
    halfAddress?: StringNullableFilter<"VoterRecord"> | string | null
    resAddrLine2?: StringNullableFilter<"VoterRecord"> | string | null
    resAddrLine3?: StringNullableFilter<"VoterRecord"> | string | null
    city?: StringNullableFilter<"VoterRecord"> | string | null
    state?: StringNullableFilter<"VoterRecord"> | string | null
    zipCode?: StringNullableFilter<"VoterRecord"> | string | null
    zipSuffix?: StringNullableFilter<"VoterRecord"> | string | null
    telephone?: StringNullableFilter<"VoterRecord"> | string | null
    email?: StringNullableFilter<"VoterRecord"> | string | null
    mailingAddress1?: StringNullableFilter<"VoterRecord"> | string | null
    mailingAddress2?: StringNullableFilter<"VoterRecord"> | string | null
    mailingAddress3?: StringNullableFilter<"VoterRecord"> | string | null
    mailingAddress4?: StringNullableFilter<"VoterRecord"> | string | null
    mailingCity?: StringNullableFilter<"VoterRecord"> | string | null
    mailingState?: StringNullableFilter<"VoterRecord"> | string | null
    mailingZip?: StringNullableFilter<"VoterRecord"> | string | null
    mailingZipSuffix?: StringNullableFilter<"VoterRecord"> | string | null
    party?: StringNullableFilter<"VoterRecord"> | string | null
    gender?: StringNullableFilter<"VoterRecord"> | string | null
    DOB?: DateTimeNullableFilter<"VoterRecord"> | Date | string | null
    L_T?: StringNullableFilter<"VoterRecord"> | string | null
    electionDistrict?: IntNullableFilter<"VoterRecord"> | number | null
    countyLegDistrict?: StringNullableFilter<"VoterRecord"> | string | null
    stateAssmblyDistrict?: StringNullableFilter<"VoterRecord"> | string | null
    stateSenateDistrict?: StringNullableFilter<"VoterRecord"> | string | null
    congressionalDistrict?: StringNullableFilter<"VoterRecord"> | string | null
    CC_WD_Village?: StringNullableFilter<"VoterRecord"> | string | null
    townCode?: StringNullableFilter<"VoterRecord"> | string | null
    lastUpdate?: DateTimeNullableFilter<"VoterRecord"> | Date | string | null
    originalRegDate?: DateTimeNullableFilter<"VoterRecord"> | Date | string | null
    statevid?: StringNullableFilter<"VoterRecord"> | string | null
    hasDiscrepancy?: BoolNullableFilter<"VoterRecord"> | boolean | null
    votingRecords?: VotingHistoryRecordListRelationFilter
    committee?: XOR<CommitteeListNullableRelationFilter, CommitteeListWhereInput> | null
    addToCommitteeRequest?: CommitteeRequestListRelationFilter
    removeFromCommitteeRequest?: CommitteeRequestListRelationFilter
  }

  export type VoterRecordOrderByWithRelationInput = {
    VRCNUM?: SortOrder
    committeeId?: SortOrderInput | SortOrder
    addressForCommittee?: SortOrderInput | SortOrder
    latestRecordEntryYear?: SortOrder
    latestRecordEntryNumber?: SortOrder
    lastName?: SortOrderInput | SortOrder
    firstName?: SortOrderInput | SortOrder
    middleInitial?: SortOrderInput | SortOrder
    suffixName?: SortOrderInput | SortOrder
    houseNum?: SortOrderInput | SortOrder
    street?: SortOrderInput | SortOrder
    apartment?: SortOrderInput | SortOrder
    halfAddress?: SortOrderInput | SortOrder
    resAddrLine2?: SortOrderInput | SortOrder
    resAddrLine3?: SortOrderInput | SortOrder
    city?: SortOrderInput | SortOrder
    state?: SortOrderInput | SortOrder
    zipCode?: SortOrderInput | SortOrder
    zipSuffix?: SortOrderInput | SortOrder
    telephone?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    mailingAddress1?: SortOrderInput | SortOrder
    mailingAddress2?: SortOrderInput | SortOrder
    mailingAddress3?: SortOrderInput | SortOrder
    mailingAddress4?: SortOrderInput | SortOrder
    mailingCity?: SortOrderInput | SortOrder
    mailingState?: SortOrderInput | SortOrder
    mailingZip?: SortOrderInput | SortOrder
    mailingZipSuffix?: SortOrderInput | SortOrder
    party?: SortOrderInput | SortOrder
    gender?: SortOrderInput | SortOrder
    DOB?: SortOrderInput | SortOrder
    L_T?: SortOrderInput | SortOrder
    electionDistrict?: SortOrderInput | SortOrder
    countyLegDistrict?: SortOrderInput | SortOrder
    stateAssmblyDistrict?: SortOrderInput | SortOrder
    stateSenateDistrict?: SortOrderInput | SortOrder
    congressionalDistrict?: SortOrderInput | SortOrder
    CC_WD_Village?: SortOrderInput | SortOrder
    townCode?: SortOrderInput | SortOrder
    lastUpdate?: SortOrderInput | SortOrder
    originalRegDate?: SortOrderInput | SortOrder
    statevid?: SortOrderInput | SortOrder
    hasDiscrepancy?: SortOrderInput | SortOrder
    votingRecords?: VotingHistoryRecordOrderByRelationAggregateInput
    committee?: CommitteeListOrderByWithRelationInput
    addToCommitteeRequest?: CommitteeRequestOrderByRelationAggregateInput
    removeFromCommitteeRequest?: CommitteeRequestOrderByRelationAggregateInput
  }

  export type VoterRecordWhereUniqueInput = Prisma.AtLeast<{
    VRCNUM?: string
    AND?: VoterRecordWhereInput | VoterRecordWhereInput[]
    OR?: VoterRecordWhereInput[]
    NOT?: VoterRecordWhereInput | VoterRecordWhereInput[]
    committeeId?: IntNullableFilter<"VoterRecord"> | number | null
    addressForCommittee?: StringNullableFilter<"VoterRecord"> | string | null
    latestRecordEntryYear?: IntFilter<"VoterRecord"> | number
    latestRecordEntryNumber?: IntFilter<"VoterRecord"> | number
    lastName?: StringNullableFilter<"VoterRecord"> | string | null
    firstName?: StringNullableFilter<"VoterRecord"> | string | null
    middleInitial?: StringNullableFilter<"VoterRecord"> | string | null
    suffixName?: StringNullableFilter<"VoterRecord"> | string | null
    houseNum?: IntNullableFilter<"VoterRecord"> | number | null
    street?: StringNullableFilter<"VoterRecord"> | string | null
    apartment?: StringNullableFilter<"VoterRecord"> | string | null
    halfAddress?: StringNullableFilter<"VoterRecord"> | string | null
    resAddrLine2?: StringNullableFilter<"VoterRecord"> | string | null
    resAddrLine3?: StringNullableFilter<"VoterRecord"> | string | null
    city?: StringNullableFilter<"VoterRecord"> | string | null
    state?: StringNullableFilter<"VoterRecord"> | string | null
    zipCode?: StringNullableFilter<"VoterRecord"> | string | null
    zipSuffix?: StringNullableFilter<"VoterRecord"> | string | null
    telephone?: StringNullableFilter<"VoterRecord"> | string | null
    email?: StringNullableFilter<"VoterRecord"> | string | null
    mailingAddress1?: StringNullableFilter<"VoterRecord"> | string | null
    mailingAddress2?: StringNullableFilter<"VoterRecord"> | string | null
    mailingAddress3?: StringNullableFilter<"VoterRecord"> | string | null
    mailingAddress4?: StringNullableFilter<"VoterRecord"> | string | null
    mailingCity?: StringNullableFilter<"VoterRecord"> | string | null
    mailingState?: StringNullableFilter<"VoterRecord"> | string | null
    mailingZip?: StringNullableFilter<"VoterRecord"> | string | null
    mailingZipSuffix?: StringNullableFilter<"VoterRecord"> | string | null
    party?: StringNullableFilter<"VoterRecord"> | string | null
    gender?: StringNullableFilter<"VoterRecord"> | string | null
    DOB?: DateTimeNullableFilter<"VoterRecord"> | Date | string | null
    L_T?: StringNullableFilter<"VoterRecord"> | string | null
    electionDistrict?: IntNullableFilter<"VoterRecord"> | number | null
    countyLegDistrict?: StringNullableFilter<"VoterRecord"> | string | null
    stateAssmblyDistrict?: StringNullableFilter<"VoterRecord"> | string | null
    stateSenateDistrict?: StringNullableFilter<"VoterRecord"> | string | null
    congressionalDistrict?: StringNullableFilter<"VoterRecord"> | string | null
    CC_WD_Village?: StringNullableFilter<"VoterRecord"> | string | null
    townCode?: StringNullableFilter<"VoterRecord"> | string | null
    lastUpdate?: DateTimeNullableFilter<"VoterRecord"> | Date | string | null
    originalRegDate?: DateTimeNullableFilter<"VoterRecord"> | Date | string | null
    statevid?: StringNullableFilter<"VoterRecord"> | string | null
    hasDiscrepancy?: BoolNullableFilter<"VoterRecord"> | boolean | null
    votingRecords?: VotingHistoryRecordListRelationFilter
    committee?: XOR<CommitteeListNullableRelationFilter, CommitteeListWhereInput> | null
    addToCommitteeRequest?: CommitteeRequestListRelationFilter
    removeFromCommitteeRequest?: CommitteeRequestListRelationFilter
  }, "VRCNUM">

  export type VoterRecordOrderByWithAggregationInput = {
    VRCNUM?: SortOrder
    committeeId?: SortOrderInput | SortOrder
    addressForCommittee?: SortOrderInput | SortOrder
    latestRecordEntryYear?: SortOrder
    latestRecordEntryNumber?: SortOrder
    lastName?: SortOrderInput | SortOrder
    firstName?: SortOrderInput | SortOrder
    middleInitial?: SortOrderInput | SortOrder
    suffixName?: SortOrderInput | SortOrder
    houseNum?: SortOrderInput | SortOrder
    street?: SortOrderInput | SortOrder
    apartment?: SortOrderInput | SortOrder
    halfAddress?: SortOrderInput | SortOrder
    resAddrLine2?: SortOrderInput | SortOrder
    resAddrLine3?: SortOrderInput | SortOrder
    city?: SortOrderInput | SortOrder
    state?: SortOrderInput | SortOrder
    zipCode?: SortOrderInput | SortOrder
    zipSuffix?: SortOrderInput | SortOrder
    telephone?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    mailingAddress1?: SortOrderInput | SortOrder
    mailingAddress2?: SortOrderInput | SortOrder
    mailingAddress3?: SortOrderInput | SortOrder
    mailingAddress4?: SortOrderInput | SortOrder
    mailingCity?: SortOrderInput | SortOrder
    mailingState?: SortOrderInput | SortOrder
    mailingZip?: SortOrderInput | SortOrder
    mailingZipSuffix?: SortOrderInput | SortOrder
    party?: SortOrderInput | SortOrder
    gender?: SortOrderInput | SortOrder
    DOB?: SortOrderInput | SortOrder
    L_T?: SortOrderInput | SortOrder
    electionDistrict?: SortOrderInput | SortOrder
    countyLegDistrict?: SortOrderInput | SortOrder
    stateAssmblyDistrict?: SortOrderInput | SortOrder
    stateSenateDistrict?: SortOrderInput | SortOrder
    congressionalDistrict?: SortOrderInput | SortOrder
    CC_WD_Village?: SortOrderInput | SortOrder
    townCode?: SortOrderInput | SortOrder
    lastUpdate?: SortOrderInput | SortOrder
    originalRegDate?: SortOrderInput | SortOrder
    statevid?: SortOrderInput | SortOrder
    hasDiscrepancy?: SortOrderInput | SortOrder
    _count?: VoterRecordCountOrderByAggregateInput
    _avg?: VoterRecordAvgOrderByAggregateInput
    _max?: VoterRecordMaxOrderByAggregateInput
    _min?: VoterRecordMinOrderByAggregateInput
    _sum?: VoterRecordSumOrderByAggregateInput
  }

  export type VoterRecordScalarWhereWithAggregatesInput = {
    AND?: VoterRecordScalarWhereWithAggregatesInput | VoterRecordScalarWhereWithAggregatesInput[]
    OR?: VoterRecordScalarWhereWithAggregatesInput[]
    NOT?: VoterRecordScalarWhereWithAggregatesInput | VoterRecordScalarWhereWithAggregatesInput[]
    VRCNUM?: StringWithAggregatesFilter<"VoterRecord"> | string
    committeeId?: IntNullableWithAggregatesFilter<"VoterRecord"> | number | null
    addressForCommittee?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    latestRecordEntryYear?: IntWithAggregatesFilter<"VoterRecord"> | number
    latestRecordEntryNumber?: IntWithAggregatesFilter<"VoterRecord"> | number
    lastName?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    firstName?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    middleInitial?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    suffixName?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    houseNum?: IntNullableWithAggregatesFilter<"VoterRecord"> | number | null
    street?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    apartment?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    halfAddress?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    resAddrLine2?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    resAddrLine3?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    city?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    state?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    zipCode?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    zipSuffix?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    telephone?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    email?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    mailingAddress1?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    mailingAddress2?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    mailingAddress3?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    mailingAddress4?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    mailingCity?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    mailingState?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    mailingZip?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    mailingZipSuffix?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    party?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    gender?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    DOB?: DateTimeNullableWithAggregatesFilter<"VoterRecord"> | Date | string | null
    L_T?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    electionDistrict?: IntNullableWithAggregatesFilter<"VoterRecord"> | number | null
    countyLegDistrict?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    stateAssmblyDistrict?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    stateSenateDistrict?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    congressionalDistrict?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    CC_WD_Village?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    townCode?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    lastUpdate?: DateTimeNullableWithAggregatesFilter<"VoterRecord"> | Date | string | null
    originalRegDate?: DateTimeNullableWithAggregatesFilter<"VoterRecord"> | Date | string | null
    statevid?: StringNullableWithAggregatesFilter<"VoterRecord"> | string | null
    hasDiscrepancy?: BoolNullableWithAggregatesFilter<"VoterRecord"> | boolean | null
  }

  export type VotingHistoryRecordWhereInput = {
    AND?: VotingHistoryRecordWhereInput | VotingHistoryRecordWhereInput[]
    OR?: VotingHistoryRecordWhereInput[]
    NOT?: VotingHistoryRecordWhereInput | VotingHistoryRecordWhereInput[]
    id?: IntFilter<"VotingHistoryRecord"> | number
    voterRecordId?: StringFilter<"VotingHistoryRecord"> | string
    date?: DateTimeFilter<"VotingHistoryRecord"> | Date | string
    value?: StringFilter<"VotingHistoryRecord"> | string
    voterRecord?: XOR<VoterRecordRelationFilter, VoterRecordWhereInput>
  }

  export type VotingHistoryRecordOrderByWithRelationInput = {
    id?: SortOrder
    voterRecordId?: SortOrder
    date?: SortOrder
    value?: SortOrder
    voterRecord?: VoterRecordOrderByWithRelationInput
  }

  export type VotingHistoryRecordWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: VotingHistoryRecordWhereInput | VotingHistoryRecordWhereInput[]
    OR?: VotingHistoryRecordWhereInput[]
    NOT?: VotingHistoryRecordWhereInput | VotingHistoryRecordWhereInput[]
    voterRecordId?: StringFilter<"VotingHistoryRecord"> | string
    date?: DateTimeFilter<"VotingHistoryRecord"> | Date | string
    value?: StringFilter<"VotingHistoryRecord"> | string
    voterRecord?: XOR<VoterRecordRelationFilter, VoterRecordWhereInput>
  }, "id">

  export type VotingHistoryRecordOrderByWithAggregationInput = {
    id?: SortOrder
    voterRecordId?: SortOrder
    date?: SortOrder
    value?: SortOrder
    _count?: VotingHistoryRecordCountOrderByAggregateInput
    _avg?: VotingHistoryRecordAvgOrderByAggregateInput
    _max?: VotingHistoryRecordMaxOrderByAggregateInput
    _min?: VotingHistoryRecordMinOrderByAggregateInput
    _sum?: VotingHistoryRecordSumOrderByAggregateInput
  }

  export type VotingHistoryRecordScalarWhereWithAggregatesInput = {
    AND?: VotingHistoryRecordScalarWhereWithAggregatesInput | VotingHistoryRecordScalarWhereWithAggregatesInput[]
    OR?: VotingHistoryRecordScalarWhereWithAggregatesInput[]
    NOT?: VotingHistoryRecordScalarWhereWithAggregatesInput | VotingHistoryRecordScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"VotingHistoryRecord"> | number
    voterRecordId?: StringWithAggregatesFilter<"VotingHistoryRecord"> | string
    date?: DateTimeWithAggregatesFilter<"VotingHistoryRecord"> | Date | string
    value?: StringWithAggregatesFilter<"VotingHistoryRecord"> | string
  }

  export type CommitteeListWhereInput = {
    AND?: CommitteeListWhereInput | CommitteeListWhereInput[]
    OR?: CommitteeListWhereInput[]
    NOT?: CommitteeListWhereInput | CommitteeListWhereInput[]
    id?: IntFilter<"CommitteeList"> | number
    cityTown?: StringFilter<"CommitteeList"> | string
    legDistrict?: IntFilter<"CommitteeList"> | number
    electionDistrict?: IntFilter<"CommitteeList"> | number
    committeeMemberList?: VoterRecordListRelationFilter
    CommitteeRequest?: CommitteeRequestListRelationFilter
    CommitteeDiscrepancyRecords?: CommitteeUploadDiscrepancyListRelationFilter
  }

  export type CommitteeListOrderByWithRelationInput = {
    id?: SortOrder
    cityTown?: SortOrder
    legDistrict?: SortOrder
    electionDistrict?: SortOrder
    committeeMemberList?: VoterRecordOrderByRelationAggregateInput
    CommitteeRequest?: CommitteeRequestOrderByRelationAggregateInput
    CommitteeDiscrepancyRecords?: CommitteeUploadDiscrepancyOrderByRelationAggregateInput
  }

  export type CommitteeListWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    cityTown_legDistrict_electionDistrict?: CommitteeListCityTownLegDistrictElectionDistrictCompoundUniqueInput
    AND?: CommitteeListWhereInput | CommitteeListWhereInput[]
    OR?: CommitteeListWhereInput[]
    NOT?: CommitteeListWhereInput | CommitteeListWhereInput[]
    cityTown?: StringFilter<"CommitteeList"> | string
    legDistrict?: IntFilter<"CommitteeList"> | number
    electionDistrict?: IntFilter<"CommitteeList"> | number
    committeeMemberList?: VoterRecordListRelationFilter
    CommitteeRequest?: CommitteeRequestListRelationFilter
    CommitteeDiscrepancyRecords?: CommitteeUploadDiscrepancyListRelationFilter
  }, "id" | "cityTown_legDistrict_electionDistrict">

  export type CommitteeListOrderByWithAggregationInput = {
    id?: SortOrder
    cityTown?: SortOrder
    legDistrict?: SortOrder
    electionDistrict?: SortOrder
    _count?: CommitteeListCountOrderByAggregateInput
    _avg?: CommitteeListAvgOrderByAggregateInput
    _max?: CommitteeListMaxOrderByAggregateInput
    _min?: CommitteeListMinOrderByAggregateInput
    _sum?: CommitteeListSumOrderByAggregateInput
  }

  export type CommitteeListScalarWhereWithAggregatesInput = {
    AND?: CommitteeListScalarWhereWithAggregatesInput | CommitteeListScalarWhereWithAggregatesInput[]
    OR?: CommitteeListScalarWhereWithAggregatesInput[]
    NOT?: CommitteeListScalarWhereWithAggregatesInput | CommitteeListScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"CommitteeList"> | number
    cityTown?: StringWithAggregatesFilter<"CommitteeList"> | string
    legDistrict?: IntWithAggregatesFilter<"CommitteeList"> | number
    electionDistrict?: IntWithAggregatesFilter<"CommitteeList"> | number
  }

  export type CommitteeRequestWhereInput = {
    AND?: CommitteeRequestWhereInput | CommitteeRequestWhereInput[]
    OR?: CommitteeRequestWhereInput[]
    NOT?: CommitteeRequestWhereInput | CommitteeRequestWhereInput[]
    id?: IntFilter<"CommitteeRequest"> | number
    committeeListId?: IntFilter<"CommitteeRequest"> | number
    addVoterRecordId?: StringNullableFilter<"CommitteeRequest"> | string | null
    removeVoterRecordId?: StringNullableFilter<"CommitteeRequest"> | string | null
    requestNotes?: StringNullableFilter<"CommitteeRequest"> | string | null
    committeList?: XOR<CommitteeListRelationFilter, CommitteeListWhereInput>
    addVoterRecord?: XOR<VoterRecordNullableRelationFilter, VoterRecordWhereInput> | null
    removeVoterRecord?: XOR<VoterRecordNullableRelationFilter, VoterRecordWhereInput> | null
  }

  export type CommitteeRequestOrderByWithRelationInput = {
    id?: SortOrder
    committeeListId?: SortOrder
    addVoterRecordId?: SortOrderInput | SortOrder
    removeVoterRecordId?: SortOrderInput | SortOrder
    requestNotes?: SortOrderInput | SortOrder
    committeList?: CommitteeListOrderByWithRelationInput
    addVoterRecord?: VoterRecordOrderByWithRelationInput
    removeVoterRecord?: VoterRecordOrderByWithRelationInput
  }

  export type CommitteeRequestWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: CommitteeRequestWhereInput | CommitteeRequestWhereInput[]
    OR?: CommitteeRequestWhereInput[]
    NOT?: CommitteeRequestWhereInput | CommitteeRequestWhereInput[]
    committeeListId?: IntFilter<"CommitteeRequest"> | number
    addVoterRecordId?: StringNullableFilter<"CommitteeRequest"> | string | null
    removeVoterRecordId?: StringNullableFilter<"CommitteeRequest"> | string | null
    requestNotes?: StringNullableFilter<"CommitteeRequest"> | string | null
    committeList?: XOR<CommitteeListRelationFilter, CommitteeListWhereInput>
    addVoterRecord?: XOR<VoterRecordNullableRelationFilter, VoterRecordWhereInput> | null
    removeVoterRecord?: XOR<VoterRecordNullableRelationFilter, VoterRecordWhereInput> | null
  }, "id">

  export type CommitteeRequestOrderByWithAggregationInput = {
    id?: SortOrder
    committeeListId?: SortOrder
    addVoterRecordId?: SortOrderInput | SortOrder
    removeVoterRecordId?: SortOrderInput | SortOrder
    requestNotes?: SortOrderInput | SortOrder
    _count?: CommitteeRequestCountOrderByAggregateInput
    _avg?: CommitteeRequestAvgOrderByAggregateInput
    _max?: CommitteeRequestMaxOrderByAggregateInput
    _min?: CommitteeRequestMinOrderByAggregateInput
    _sum?: CommitteeRequestSumOrderByAggregateInput
  }

  export type CommitteeRequestScalarWhereWithAggregatesInput = {
    AND?: CommitteeRequestScalarWhereWithAggregatesInput | CommitteeRequestScalarWhereWithAggregatesInput[]
    OR?: CommitteeRequestScalarWhereWithAggregatesInput[]
    NOT?: CommitteeRequestScalarWhereWithAggregatesInput | CommitteeRequestScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"CommitteeRequest"> | number
    committeeListId?: IntWithAggregatesFilter<"CommitteeRequest"> | number
    addVoterRecordId?: StringNullableWithAggregatesFilter<"CommitteeRequest"> | string | null
    removeVoterRecordId?: StringNullableWithAggregatesFilter<"CommitteeRequest"> | string | null
    requestNotes?: StringNullableWithAggregatesFilter<"CommitteeRequest"> | string | null
  }

  export type DropdownListsWhereInput = {
    AND?: DropdownListsWhereInput | DropdownListsWhereInput[]
    OR?: DropdownListsWhereInput[]
    NOT?: DropdownListsWhereInput | DropdownListsWhereInput[]
    id?: IntFilter<"DropdownLists"> | number
    city?: StringNullableListFilter<"DropdownLists">
    zipCode?: StringNullableListFilter<"DropdownLists">
    street?: StringNullableListFilter<"DropdownLists">
    countyLegDistrict?: StringNullableListFilter<"DropdownLists">
    stateAssmblyDistrict?: StringNullableListFilter<"DropdownLists">
    stateSenateDistrict?: StringNullableListFilter<"DropdownLists">
    congressionalDistrict?: StringNullableListFilter<"DropdownLists">
    townCode?: StringNullableListFilter<"DropdownLists">
    electionDistrict?: StringNullableListFilter<"DropdownLists">
    party?: StringNullableListFilter<"DropdownLists">
  }

  export type DropdownListsOrderByWithRelationInput = {
    id?: SortOrder
    city?: SortOrder
    zipCode?: SortOrder
    street?: SortOrder
    countyLegDistrict?: SortOrder
    stateAssmblyDistrict?: SortOrder
    stateSenateDistrict?: SortOrder
    congressionalDistrict?: SortOrder
    townCode?: SortOrder
    electionDistrict?: SortOrder
    party?: SortOrder
  }

  export type DropdownListsWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: DropdownListsWhereInput | DropdownListsWhereInput[]
    OR?: DropdownListsWhereInput[]
    NOT?: DropdownListsWhereInput | DropdownListsWhereInput[]
    city?: StringNullableListFilter<"DropdownLists">
    zipCode?: StringNullableListFilter<"DropdownLists">
    street?: StringNullableListFilter<"DropdownLists">
    countyLegDistrict?: StringNullableListFilter<"DropdownLists">
    stateAssmblyDistrict?: StringNullableListFilter<"DropdownLists">
    stateSenateDistrict?: StringNullableListFilter<"DropdownLists">
    congressionalDistrict?: StringNullableListFilter<"DropdownLists">
    townCode?: StringNullableListFilter<"DropdownLists">
    electionDistrict?: StringNullableListFilter<"DropdownLists">
    party?: StringNullableListFilter<"DropdownLists">
  }, "id">

  export type DropdownListsOrderByWithAggregationInput = {
    id?: SortOrder
    city?: SortOrder
    zipCode?: SortOrder
    street?: SortOrder
    countyLegDistrict?: SortOrder
    stateAssmblyDistrict?: SortOrder
    stateSenateDistrict?: SortOrder
    congressionalDistrict?: SortOrder
    townCode?: SortOrder
    electionDistrict?: SortOrder
    party?: SortOrder
    _count?: DropdownListsCountOrderByAggregateInput
    _avg?: DropdownListsAvgOrderByAggregateInput
    _max?: DropdownListsMaxOrderByAggregateInput
    _min?: DropdownListsMinOrderByAggregateInput
    _sum?: DropdownListsSumOrderByAggregateInput
  }

  export type DropdownListsScalarWhereWithAggregatesInput = {
    AND?: DropdownListsScalarWhereWithAggregatesInput | DropdownListsScalarWhereWithAggregatesInput[]
    OR?: DropdownListsScalarWhereWithAggregatesInput[]
    NOT?: DropdownListsScalarWhereWithAggregatesInput | DropdownListsScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"DropdownLists"> | number
    city?: StringNullableListFilter<"DropdownLists">
    zipCode?: StringNullableListFilter<"DropdownLists">
    street?: StringNullableListFilter<"DropdownLists">
    countyLegDistrict?: StringNullableListFilter<"DropdownLists">
    stateAssmblyDistrict?: StringNullableListFilter<"DropdownLists">
    stateSenateDistrict?: StringNullableListFilter<"DropdownLists">
    congressionalDistrict?: StringNullableListFilter<"DropdownLists">
    townCode?: StringNullableListFilter<"DropdownLists">
    electionDistrict?: StringNullableListFilter<"DropdownLists">
    party?: StringNullableListFilter<"DropdownLists">
  }

  export type CommitteeUploadDiscrepancyWhereInput = {
    AND?: CommitteeUploadDiscrepancyWhereInput | CommitteeUploadDiscrepancyWhereInput[]
    OR?: CommitteeUploadDiscrepancyWhereInput[]
    NOT?: CommitteeUploadDiscrepancyWhereInput | CommitteeUploadDiscrepancyWhereInput[]
    id?: StringFilter<"CommitteeUploadDiscrepancy"> | string
    VRCNUM?: StringFilter<"CommitteeUploadDiscrepancy"> | string
    committeeId?: IntFilter<"CommitteeUploadDiscrepancy"> | number
    discrepancy?: JsonFilter<"CommitteeUploadDiscrepancy">
    committee?: XOR<CommitteeListRelationFilter, CommitteeListWhereInput>
  }

  export type CommitteeUploadDiscrepancyOrderByWithRelationInput = {
    id?: SortOrder
    VRCNUM?: SortOrder
    committeeId?: SortOrder
    discrepancy?: SortOrder
    committee?: CommitteeListOrderByWithRelationInput
  }

  export type CommitteeUploadDiscrepancyWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    VRCNUM?: string
    AND?: CommitteeUploadDiscrepancyWhereInput | CommitteeUploadDiscrepancyWhereInput[]
    OR?: CommitteeUploadDiscrepancyWhereInput[]
    NOT?: CommitteeUploadDiscrepancyWhereInput | CommitteeUploadDiscrepancyWhereInput[]
    committeeId?: IntFilter<"CommitteeUploadDiscrepancy"> | number
    discrepancy?: JsonFilter<"CommitteeUploadDiscrepancy">
    committee?: XOR<CommitteeListRelationFilter, CommitteeListWhereInput>
  }, "id" | "VRCNUM">

  export type CommitteeUploadDiscrepancyOrderByWithAggregationInput = {
    id?: SortOrder
    VRCNUM?: SortOrder
    committeeId?: SortOrder
    discrepancy?: SortOrder
    _count?: CommitteeUploadDiscrepancyCountOrderByAggregateInput
    _avg?: CommitteeUploadDiscrepancyAvgOrderByAggregateInput
    _max?: CommitteeUploadDiscrepancyMaxOrderByAggregateInput
    _min?: CommitteeUploadDiscrepancyMinOrderByAggregateInput
    _sum?: CommitteeUploadDiscrepancySumOrderByAggregateInput
  }

  export type CommitteeUploadDiscrepancyScalarWhereWithAggregatesInput = {
    AND?: CommitteeUploadDiscrepancyScalarWhereWithAggregatesInput | CommitteeUploadDiscrepancyScalarWhereWithAggregatesInput[]
    OR?: CommitteeUploadDiscrepancyScalarWhereWithAggregatesInput[]
    NOT?: CommitteeUploadDiscrepancyScalarWhereWithAggregatesInput | CommitteeUploadDiscrepancyScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"CommitteeUploadDiscrepancy"> | string
    VRCNUM?: StringWithAggregatesFilter<"CommitteeUploadDiscrepancy"> | string
    committeeId?: IntWithAggregatesFilter<"CommitteeUploadDiscrepancy"> | number
    discrepancy?: JsonWithAggregatesFilter<"CommitteeUploadDiscrepancy">
  }

  export type ElectionDateWhereInput = {
    AND?: ElectionDateWhereInput | ElectionDateWhereInput[]
    OR?: ElectionDateWhereInput[]
    NOT?: ElectionDateWhereInput | ElectionDateWhereInput[]
    id?: IntFilter<"ElectionDate"> | number
    date?: DateTimeFilter<"ElectionDate"> | Date | string
  }

  export type ElectionDateOrderByWithRelationInput = {
    id?: SortOrder
    date?: SortOrder
  }

  export type ElectionDateWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ElectionDateWhereInput | ElectionDateWhereInput[]
    OR?: ElectionDateWhereInput[]
    NOT?: ElectionDateWhereInput | ElectionDateWhereInput[]
    date?: DateTimeFilter<"ElectionDate"> | Date | string
  }, "id">

  export type ElectionDateOrderByWithAggregationInput = {
    id?: SortOrder
    date?: SortOrder
    _count?: ElectionDateCountOrderByAggregateInput
    _avg?: ElectionDateAvgOrderByAggregateInput
    _max?: ElectionDateMaxOrderByAggregateInput
    _min?: ElectionDateMinOrderByAggregateInput
    _sum?: ElectionDateSumOrderByAggregateInput
  }

  export type ElectionDateScalarWhereWithAggregatesInput = {
    AND?: ElectionDateScalarWhereWithAggregatesInput | ElectionDateScalarWhereWithAggregatesInput[]
    OR?: ElectionDateScalarWhereWithAggregatesInput[]
    NOT?: ElectionDateScalarWhereWithAggregatesInput | ElectionDateScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ElectionDate"> | number
    date?: DateTimeWithAggregatesFilter<"ElectionDate"> | Date | string
  }

  export type OfficeNameWhereInput = {
    AND?: OfficeNameWhereInput | OfficeNameWhereInput[]
    OR?: OfficeNameWhereInput[]
    NOT?: OfficeNameWhereInput | OfficeNameWhereInput[]
    id?: IntFilter<"OfficeName"> | number
    officeName?: StringFilter<"OfficeName"> | string
  }

  export type OfficeNameOrderByWithRelationInput = {
    id?: SortOrder
    officeName?: SortOrder
  }

  export type OfficeNameWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: OfficeNameWhereInput | OfficeNameWhereInput[]
    OR?: OfficeNameWhereInput[]
    NOT?: OfficeNameWhereInput | OfficeNameWhereInput[]
    officeName?: StringFilter<"OfficeName"> | string
  }, "id">

  export type OfficeNameOrderByWithAggregationInput = {
    id?: SortOrder
    officeName?: SortOrder
    _count?: OfficeNameCountOrderByAggregateInput
    _avg?: OfficeNameAvgOrderByAggregateInput
    _max?: OfficeNameMaxOrderByAggregateInput
    _min?: OfficeNameMinOrderByAggregateInput
    _sum?: OfficeNameSumOrderByAggregateInput
  }

  export type OfficeNameScalarWhereWithAggregatesInput = {
    AND?: OfficeNameScalarWhereWithAggregatesInput | OfficeNameScalarWhereWithAggregatesInput[]
    OR?: OfficeNameScalarWhereWithAggregatesInput[]
    NOT?: OfficeNameScalarWhereWithAggregatesInput | OfficeNameScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"OfficeName"> | number
    officeName?: StringWithAggregatesFilter<"OfficeName"> | string
  }

  export type UserCreateInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    image?: string | null
    privilegeLevel?: $Enums.PrivilegeLevel
    createdAt?: Date | string
    updatedAt?: Date | string
    accounts?: AccountCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    Authenticator?: AuthenticatorCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    image?: string | null
    privilegeLevel?: $Enums.PrivilegeLevel
    createdAt?: Date | string
    updatedAt?: Date | string
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    Authenticator?: AuthenticatorUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    privilegeLevel?: EnumPrivilegeLevelFieldUpdateOperationsInput | $Enums.PrivilegeLevel
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    accounts?: AccountUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    Authenticator?: AuthenticatorUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    privilegeLevel?: EnumPrivilegeLevelFieldUpdateOperationsInput | $Enums.PrivilegeLevel
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    Authenticator?: AuthenticatorUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    image?: string | null
    privilegeLevel?: $Enums.PrivilegeLevel
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    privilegeLevel?: EnumPrivilegeLevelFieldUpdateOperationsInput | $Enums.PrivilegeLevel
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    privilegeLevel?: EnumPrivilegeLevelFieldUpdateOperationsInput | $Enums.PrivilegeLevel
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AccountCreateInput = {
    type: string
    provider: string
    providerAccountId: string
    refresh_token?: string | null
    access_token?: string | null
    expires_at?: number | null
    token_type?: string | null
    scope?: string | null
    id_token?: string | null
    session_state?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutAccountsInput
  }

  export type AccountUncheckedCreateInput = {
    userId: string
    type: string
    provider: string
    providerAccountId: string
    refresh_token?: string | null
    access_token?: string | null
    expires_at?: number | null
    token_type?: string | null
    scope?: string | null
    id_token?: string | null
    session_state?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AccountUpdateInput = {
    type?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    access_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableIntFieldUpdateOperationsInput | number | null
    token_type?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    id_token?: NullableStringFieldUpdateOperationsInput | string | null
    session_state?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutAccountsNestedInput
  }

  export type AccountUncheckedUpdateInput = {
    userId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    access_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableIntFieldUpdateOperationsInput | number | null
    token_type?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    id_token?: NullableStringFieldUpdateOperationsInput | string | null
    session_state?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AccountCreateManyInput = {
    userId: string
    type: string
    provider: string
    providerAccountId: string
    refresh_token?: string | null
    access_token?: string | null
    expires_at?: number | null
    token_type?: string | null
    scope?: string | null
    id_token?: string | null
    session_state?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AccountUpdateManyMutationInput = {
    type?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    access_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableIntFieldUpdateOperationsInput | number | null
    token_type?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    id_token?: NullableStringFieldUpdateOperationsInput | string | null
    session_state?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AccountUncheckedUpdateManyInput = {
    userId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    access_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableIntFieldUpdateOperationsInput | number | null
    token_type?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    id_token?: NullableStringFieldUpdateOperationsInput | string | null
    session_state?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionCreateInput = {
    sessionToken: string
    expires: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutSessionsInput
  }

  export type SessionUncheckedCreateInput = {
    sessionToken: string
    userId: string
    expires: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SessionUpdateInput = {
    sessionToken?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutSessionsNestedInput
  }

  export type SessionUncheckedUpdateInput = {
    sessionToken?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionCreateManyInput = {
    sessionToken: string
    userId: string
    expires: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SessionUpdateManyMutationInput = {
    sessionToken?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateManyInput = {
    sessionToken?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PrivilegedUserCreateInput = {
    email: string
    privilegeLevel: $Enums.PrivilegeLevel
  }

  export type PrivilegedUserUncheckedCreateInput = {
    id?: number
    email: string
    privilegeLevel: $Enums.PrivilegeLevel
  }

  export type PrivilegedUserUpdateInput = {
    email?: StringFieldUpdateOperationsInput | string
    privilegeLevel?: EnumPrivilegeLevelFieldUpdateOperationsInput | $Enums.PrivilegeLevel
  }

  export type PrivilegedUserUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    email?: StringFieldUpdateOperationsInput | string
    privilegeLevel?: EnumPrivilegeLevelFieldUpdateOperationsInput | $Enums.PrivilegeLevel
  }

  export type PrivilegedUserCreateManyInput = {
    id?: number
    email: string
    privilegeLevel: $Enums.PrivilegeLevel
  }

  export type PrivilegedUserUpdateManyMutationInput = {
    email?: StringFieldUpdateOperationsInput | string
    privilegeLevel?: EnumPrivilegeLevelFieldUpdateOperationsInput | $Enums.PrivilegeLevel
  }

  export type PrivilegedUserUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    email?: StringFieldUpdateOperationsInput | string
    privilegeLevel?: EnumPrivilegeLevelFieldUpdateOperationsInput | $Enums.PrivilegeLevel
  }

  export type VerificationTokenCreateInput = {
    identifier: string
    token: string
    expires: Date | string
  }

  export type VerificationTokenUncheckedCreateInput = {
    identifier: string
    token: string
    expires: Date | string
  }

  export type VerificationTokenUpdateInput = {
    identifier?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerificationTokenUncheckedUpdateInput = {
    identifier?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerificationTokenCreateManyInput = {
    identifier: string
    token: string
    expires: Date | string
  }

  export type VerificationTokenUpdateManyMutationInput = {
    identifier?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerificationTokenUncheckedUpdateManyInput = {
    identifier?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuthenticatorCreateInput = {
    credentialID: string
    providerAccountId: string
    credentialPublicKey: string
    counter: number
    credentialDeviceType: string
    credentialBackedUp: boolean
    transports?: string | null
    user: UserCreateNestedOneWithoutAuthenticatorInput
  }

  export type AuthenticatorUncheckedCreateInput = {
    credentialID: string
    userId: string
    providerAccountId: string
    credentialPublicKey: string
    counter: number
    credentialDeviceType: string
    credentialBackedUp: boolean
    transports?: string | null
  }

  export type AuthenticatorUpdateInput = {
    credentialID?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    credentialPublicKey?: StringFieldUpdateOperationsInput | string
    counter?: IntFieldUpdateOperationsInput | number
    credentialDeviceType?: StringFieldUpdateOperationsInput | string
    credentialBackedUp?: BoolFieldUpdateOperationsInput | boolean
    transports?: NullableStringFieldUpdateOperationsInput | string | null
    user?: UserUpdateOneRequiredWithoutAuthenticatorNestedInput
  }

  export type AuthenticatorUncheckedUpdateInput = {
    credentialID?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    credentialPublicKey?: StringFieldUpdateOperationsInput | string
    counter?: IntFieldUpdateOperationsInput | number
    credentialDeviceType?: StringFieldUpdateOperationsInput | string
    credentialBackedUp?: BoolFieldUpdateOperationsInput | boolean
    transports?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AuthenticatorCreateManyInput = {
    credentialID: string
    userId: string
    providerAccountId: string
    credentialPublicKey: string
    counter: number
    credentialDeviceType: string
    credentialBackedUp: boolean
    transports?: string | null
  }

  export type AuthenticatorUpdateManyMutationInput = {
    credentialID?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    credentialPublicKey?: StringFieldUpdateOperationsInput | string
    counter?: IntFieldUpdateOperationsInput | number
    credentialDeviceType?: StringFieldUpdateOperationsInput | string
    credentialBackedUp?: BoolFieldUpdateOperationsInput | boolean
    transports?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AuthenticatorUncheckedUpdateManyInput = {
    credentialID?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    credentialPublicKey?: StringFieldUpdateOperationsInput | string
    counter?: IntFieldUpdateOperationsInput | number
    credentialDeviceType?: StringFieldUpdateOperationsInput | string
    credentialBackedUp?: BoolFieldUpdateOperationsInput | boolean
    transports?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type VoterRecordArchiveCreateInput = {
    VRCNUM: string
    recordEntryYear: number
    recordEntryNumber: number
    lastName?: string | null
    firstName?: string | null
    middleInitial?: string | null
    suffixName?: string | null
    houseNum?: number | null
    street?: string | null
    apartment?: string | null
    halfAddress?: string | null
    resAddrLine2?: string | null
    resAddrLine3?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    zipSuffix?: string | null
    telephone?: string | null
    email?: string | null
    mailingAddress1?: string | null
    mailingAddress2?: string | null
    mailingAddress3?: string | null
    mailingAddress4?: string | null
    mailingCity?: string | null
    mailingState?: string | null
    mailingZip?: string | null
    mailingZipSuffix?: string | null
    party?: string | null
    gender?: string | null
    DOB?: Date | string | null
    L_T?: string | null
    electionDistrict?: number | null
    countyLegDistrict?: string | null
    stateAssmblyDistrict?: string | null
    stateSenateDistrict?: string | null
    congressionalDistrict?: string | null
    CC_WD_Village?: string | null
    townCode?: string | null
    lastUpdate?: Date | string | null
    originalRegDate?: Date | string | null
    statevid?: string | null
  }

  export type VoterRecordArchiveUncheckedCreateInput = {
    id?: number
    VRCNUM: string
    recordEntryYear: number
    recordEntryNumber: number
    lastName?: string | null
    firstName?: string | null
    middleInitial?: string | null
    suffixName?: string | null
    houseNum?: number | null
    street?: string | null
    apartment?: string | null
    halfAddress?: string | null
    resAddrLine2?: string | null
    resAddrLine3?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    zipSuffix?: string | null
    telephone?: string | null
    email?: string | null
    mailingAddress1?: string | null
    mailingAddress2?: string | null
    mailingAddress3?: string | null
    mailingAddress4?: string | null
    mailingCity?: string | null
    mailingState?: string | null
    mailingZip?: string | null
    mailingZipSuffix?: string | null
    party?: string | null
    gender?: string | null
    DOB?: Date | string | null
    L_T?: string | null
    electionDistrict?: number | null
    countyLegDistrict?: string | null
    stateAssmblyDistrict?: string | null
    stateSenateDistrict?: string | null
    congressionalDistrict?: string | null
    CC_WD_Village?: string | null
    townCode?: string | null
    lastUpdate?: Date | string | null
    originalRegDate?: Date | string | null
    statevid?: string | null
  }

  export type VoterRecordArchiveUpdateInput = {
    VRCNUM?: StringFieldUpdateOperationsInput | string
    recordEntryYear?: IntFieldUpdateOperationsInput | number
    recordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type VoterRecordArchiveUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    VRCNUM?: StringFieldUpdateOperationsInput | string
    recordEntryYear?: IntFieldUpdateOperationsInput | number
    recordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type VoterRecordArchiveCreateManyInput = {
    id?: number
    VRCNUM: string
    recordEntryYear: number
    recordEntryNumber: number
    lastName?: string | null
    firstName?: string | null
    middleInitial?: string | null
    suffixName?: string | null
    houseNum?: number | null
    street?: string | null
    apartment?: string | null
    halfAddress?: string | null
    resAddrLine2?: string | null
    resAddrLine3?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    zipSuffix?: string | null
    telephone?: string | null
    email?: string | null
    mailingAddress1?: string | null
    mailingAddress2?: string | null
    mailingAddress3?: string | null
    mailingAddress4?: string | null
    mailingCity?: string | null
    mailingState?: string | null
    mailingZip?: string | null
    mailingZipSuffix?: string | null
    party?: string | null
    gender?: string | null
    DOB?: Date | string | null
    L_T?: string | null
    electionDistrict?: number | null
    countyLegDistrict?: string | null
    stateAssmblyDistrict?: string | null
    stateSenateDistrict?: string | null
    congressionalDistrict?: string | null
    CC_WD_Village?: string | null
    townCode?: string | null
    lastUpdate?: Date | string | null
    originalRegDate?: Date | string | null
    statevid?: string | null
  }

  export type VoterRecordArchiveUpdateManyMutationInput = {
    VRCNUM?: StringFieldUpdateOperationsInput | string
    recordEntryYear?: IntFieldUpdateOperationsInput | number
    recordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type VoterRecordArchiveUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    VRCNUM?: StringFieldUpdateOperationsInput | string
    recordEntryYear?: IntFieldUpdateOperationsInput | number
    recordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type VoterRecordCreateInput = {
    VRCNUM: string
    addressForCommittee?: string | null
    latestRecordEntryYear: number
    latestRecordEntryNumber: number
    lastName?: string | null
    firstName?: string | null
    middleInitial?: string | null
    suffixName?: string | null
    houseNum?: number | null
    street?: string | null
    apartment?: string | null
    halfAddress?: string | null
    resAddrLine2?: string | null
    resAddrLine3?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    zipSuffix?: string | null
    telephone?: string | null
    email?: string | null
    mailingAddress1?: string | null
    mailingAddress2?: string | null
    mailingAddress3?: string | null
    mailingAddress4?: string | null
    mailingCity?: string | null
    mailingState?: string | null
    mailingZip?: string | null
    mailingZipSuffix?: string | null
    party?: string | null
    gender?: string | null
    DOB?: Date | string | null
    L_T?: string | null
    electionDistrict?: number | null
    countyLegDistrict?: string | null
    stateAssmblyDistrict?: string | null
    stateSenateDistrict?: string | null
    congressionalDistrict?: string | null
    CC_WD_Village?: string | null
    townCode?: string | null
    lastUpdate?: Date | string | null
    originalRegDate?: Date | string | null
    statevid?: string | null
    hasDiscrepancy?: boolean | null
    votingRecords?: VotingHistoryRecordCreateNestedManyWithoutVoterRecordInput
    committee?: CommitteeListCreateNestedOneWithoutCommitteeMemberListInput
    addToCommitteeRequest?: CommitteeRequestCreateNestedManyWithoutAddVoterRecordInput
    removeFromCommitteeRequest?: CommitteeRequestCreateNestedManyWithoutRemoveVoterRecordInput
  }

  export type VoterRecordUncheckedCreateInput = {
    VRCNUM: string
    committeeId?: number | null
    addressForCommittee?: string | null
    latestRecordEntryYear: number
    latestRecordEntryNumber: number
    lastName?: string | null
    firstName?: string | null
    middleInitial?: string | null
    suffixName?: string | null
    houseNum?: number | null
    street?: string | null
    apartment?: string | null
    halfAddress?: string | null
    resAddrLine2?: string | null
    resAddrLine3?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    zipSuffix?: string | null
    telephone?: string | null
    email?: string | null
    mailingAddress1?: string | null
    mailingAddress2?: string | null
    mailingAddress3?: string | null
    mailingAddress4?: string | null
    mailingCity?: string | null
    mailingState?: string | null
    mailingZip?: string | null
    mailingZipSuffix?: string | null
    party?: string | null
    gender?: string | null
    DOB?: Date | string | null
    L_T?: string | null
    electionDistrict?: number | null
    countyLegDistrict?: string | null
    stateAssmblyDistrict?: string | null
    stateSenateDistrict?: string | null
    congressionalDistrict?: string | null
    CC_WD_Village?: string | null
    townCode?: string | null
    lastUpdate?: Date | string | null
    originalRegDate?: Date | string | null
    statevid?: string | null
    hasDiscrepancy?: boolean | null
    votingRecords?: VotingHistoryRecordUncheckedCreateNestedManyWithoutVoterRecordInput
    addToCommitteeRequest?: CommitteeRequestUncheckedCreateNestedManyWithoutAddVoterRecordInput
    removeFromCommitteeRequest?: CommitteeRequestUncheckedCreateNestedManyWithoutRemoveVoterRecordInput
  }

  export type VoterRecordUpdateInput = {
    VRCNUM?: StringFieldUpdateOperationsInput | string
    addressForCommittee?: NullableStringFieldUpdateOperationsInput | string | null
    latestRecordEntryYear?: IntFieldUpdateOperationsInput | number
    latestRecordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
    hasDiscrepancy?: NullableBoolFieldUpdateOperationsInput | boolean | null
    votingRecords?: VotingHistoryRecordUpdateManyWithoutVoterRecordNestedInput
    committee?: CommitteeListUpdateOneWithoutCommitteeMemberListNestedInput
    addToCommitteeRequest?: CommitteeRequestUpdateManyWithoutAddVoterRecordNestedInput
    removeFromCommitteeRequest?: CommitteeRequestUpdateManyWithoutRemoveVoterRecordNestedInput
  }

  export type VoterRecordUncheckedUpdateInput = {
    VRCNUM?: StringFieldUpdateOperationsInput | string
    committeeId?: NullableIntFieldUpdateOperationsInput | number | null
    addressForCommittee?: NullableStringFieldUpdateOperationsInput | string | null
    latestRecordEntryYear?: IntFieldUpdateOperationsInput | number
    latestRecordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
    hasDiscrepancy?: NullableBoolFieldUpdateOperationsInput | boolean | null
    votingRecords?: VotingHistoryRecordUncheckedUpdateManyWithoutVoterRecordNestedInput
    addToCommitteeRequest?: CommitteeRequestUncheckedUpdateManyWithoutAddVoterRecordNestedInput
    removeFromCommitteeRequest?: CommitteeRequestUncheckedUpdateManyWithoutRemoveVoterRecordNestedInput
  }

  export type VoterRecordCreateManyInput = {
    VRCNUM: string
    committeeId?: number | null
    addressForCommittee?: string | null
    latestRecordEntryYear: number
    latestRecordEntryNumber: number
    lastName?: string | null
    firstName?: string | null
    middleInitial?: string | null
    suffixName?: string | null
    houseNum?: number | null
    street?: string | null
    apartment?: string | null
    halfAddress?: string | null
    resAddrLine2?: string | null
    resAddrLine3?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    zipSuffix?: string | null
    telephone?: string | null
    email?: string | null
    mailingAddress1?: string | null
    mailingAddress2?: string | null
    mailingAddress3?: string | null
    mailingAddress4?: string | null
    mailingCity?: string | null
    mailingState?: string | null
    mailingZip?: string | null
    mailingZipSuffix?: string | null
    party?: string | null
    gender?: string | null
    DOB?: Date | string | null
    L_T?: string | null
    electionDistrict?: number | null
    countyLegDistrict?: string | null
    stateAssmblyDistrict?: string | null
    stateSenateDistrict?: string | null
    congressionalDistrict?: string | null
    CC_WD_Village?: string | null
    townCode?: string | null
    lastUpdate?: Date | string | null
    originalRegDate?: Date | string | null
    statevid?: string | null
    hasDiscrepancy?: boolean | null
  }

  export type VoterRecordUpdateManyMutationInput = {
    VRCNUM?: StringFieldUpdateOperationsInput | string
    addressForCommittee?: NullableStringFieldUpdateOperationsInput | string | null
    latestRecordEntryYear?: IntFieldUpdateOperationsInput | number
    latestRecordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
    hasDiscrepancy?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type VoterRecordUncheckedUpdateManyInput = {
    VRCNUM?: StringFieldUpdateOperationsInput | string
    committeeId?: NullableIntFieldUpdateOperationsInput | number | null
    addressForCommittee?: NullableStringFieldUpdateOperationsInput | string | null
    latestRecordEntryYear?: IntFieldUpdateOperationsInput | number
    latestRecordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
    hasDiscrepancy?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type VotingHistoryRecordCreateInput = {
    date: Date | string
    value: string
    voterRecord: VoterRecordCreateNestedOneWithoutVotingRecordsInput
  }

  export type VotingHistoryRecordUncheckedCreateInput = {
    id?: number
    voterRecordId: string
    date: Date | string
    value: string
  }

  export type VotingHistoryRecordUpdateInput = {
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    value?: StringFieldUpdateOperationsInput | string
    voterRecord?: VoterRecordUpdateOneRequiredWithoutVotingRecordsNestedInput
  }

  export type VotingHistoryRecordUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    voterRecordId?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    value?: StringFieldUpdateOperationsInput | string
  }

  export type VotingHistoryRecordCreateManyInput = {
    id?: number
    voterRecordId: string
    date: Date | string
    value: string
  }

  export type VotingHistoryRecordUpdateManyMutationInput = {
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    value?: StringFieldUpdateOperationsInput | string
  }

  export type VotingHistoryRecordUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    voterRecordId?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    value?: StringFieldUpdateOperationsInput | string
  }

  export type CommitteeListCreateInput = {
    cityTown: string
    legDistrict: number
    electionDistrict: number
    committeeMemberList?: VoterRecordCreateNestedManyWithoutCommitteeInput
    CommitteeRequest?: CommitteeRequestCreateNestedManyWithoutCommitteListInput
    CommitteeDiscrepancyRecords?: CommitteeUploadDiscrepancyCreateNestedManyWithoutCommitteeInput
  }

  export type CommitteeListUncheckedCreateInput = {
    id?: number
    cityTown: string
    legDistrict: number
    electionDistrict: number
    committeeMemberList?: VoterRecordUncheckedCreateNestedManyWithoutCommitteeInput
    CommitteeRequest?: CommitteeRequestUncheckedCreateNestedManyWithoutCommitteListInput
    CommitteeDiscrepancyRecords?: CommitteeUploadDiscrepancyUncheckedCreateNestedManyWithoutCommitteeInput
  }

  export type CommitteeListUpdateInput = {
    cityTown?: StringFieldUpdateOperationsInput | string
    legDistrict?: IntFieldUpdateOperationsInput | number
    electionDistrict?: IntFieldUpdateOperationsInput | number
    committeeMemberList?: VoterRecordUpdateManyWithoutCommitteeNestedInput
    CommitteeRequest?: CommitteeRequestUpdateManyWithoutCommitteListNestedInput
    CommitteeDiscrepancyRecords?: CommitteeUploadDiscrepancyUpdateManyWithoutCommitteeNestedInput
  }

  export type CommitteeListUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    cityTown?: StringFieldUpdateOperationsInput | string
    legDistrict?: IntFieldUpdateOperationsInput | number
    electionDistrict?: IntFieldUpdateOperationsInput | number
    committeeMemberList?: VoterRecordUncheckedUpdateManyWithoutCommitteeNestedInput
    CommitteeRequest?: CommitteeRequestUncheckedUpdateManyWithoutCommitteListNestedInput
    CommitteeDiscrepancyRecords?: CommitteeUploadDiscrepancyUncheckedUpdateManyWithoutCommitteeNestedInput
  }

  export type CommitteeListCreateManyInput = {
    id?: number
    cityTown: string
    legDistrict: number
    electionDistrict: number
  }

  export type CommitteeListUpdateManyMutationInput = {
    cityTown?: StringFieldUpdateOperationsInput | string
    legDistrict?: IntFieldUpdateOperationsInput | number
    electionDistrict?: IntFieldUpdateOperationsInput | number
  }

  export type CommitteeListUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    cityTown?: StringFieldUpdateOperationsInput | string
    legDistrict?: IntFieldUpdateOperationsInput | number
    electionDistrict?: IntFieldUpdateOperationsInput | number
  }

  export type CommitteeRequestCreateInput = {
    requestNotes?: string | null
    committeList: CommitteeListCreateNestedOneWithoutCommitteeRequestInput
    addVoterRecord?: VoterRecordCreateNestedOneWithoutAddToCommitteeRequestInput
    removeVoterRecord?: VoterRecordCreateNestedOneWithoutRemoveFromCommitteeRequestInput
  }

  export type CommitteeRequestUncheckedCreateInput = {
    id?: number
    committeeListId: number
    addVoterRecordId?: string | null
    removeVoterRecordId?: string | null
    requestNotes?: string | null
  }

  export type CommitteeRequestUpdateInput = {
    requestNotes?: NullableStringFieldUpdateOperationsInput | string | null
    committeList?: CommitteeListUpdateOneRequiredWithoutCommitteeRequestNestedInput
    addVoterRecord?: VoterRecordUpdateOneWithoutAddToCommitteeRequestNestedInput
    removeVoterRecord?: VoterRecordUpdateOneWithoutRemoveFromCommitteeRequestNestedInput
  }

  export type CommitteeRequestUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    committeeListId?: IntFieldUpdateOperationsInput | number
    addVoterRecordId?: NullableStringFieldUpdateOperationsInput | string | null
    removeVoterRecordId?: NullableStringFieldUpdateOperationsInput | string | null
    requestNotes?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type CommitteeRequestCreateManyInput = {
    id?: number
    committeeListId: number
    addVoterRecordId?: string | null
    removeVoterRecordId?: string | null
    requestNotes?: string | null
  }

  export type CommitteeRequestUpdateManyMutationInput = {
    requestNotes?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type CommitteeRequestUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    committeeListId?: IntFieldUpdateOperationsInput | number
    addVoterRecordId?: NullableStringFieldUpdateOperationsInput | string | null
    removeVoterRecordId?: NullableStringFieldUpdateOperationsInput | string | null
    requestNotes?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type DropdownListsCreateInput = {
    city?: DropdownListsCreatecityInput | string[]
    zipCode?: DropdownListsCreatezipCodeInput | string[]
    street?: DropdownListsCreatestreetInput | string[]
    countyLegDistrict?: DropdownListsCreatecountyLegDistrictInput | string[]
    stateAssmblyDistrict?: DropdownListsCreatestateAssmblyDistrictInput | string[]
    stateSenateDistrict?: DropdownListsCreatestateSenateDistrictInput | string[]
    congressionalDistrict?: DropdownListsCreatecongressionalDistrictInput | string[]
    townCode?: DropdownListsCreatetownCodeInput | string[]
    electionDistrict?: DropdownListsCreateelectionDistrictInput | string[]
    party?: DropdownListsCreatepartyInput | string[]
  }

  export type DropdownListsUncheckedCreateInput = {
    id?: number
    city?: DropdownListsCreatecityInput | string[]
    zipCode?: DropdownListsCreatezipCodeInput | string[]
    street?: DropdownListsCreatestreetInput | string[]
    countyLegDistrict?: DropdownListsCreatecountyLegDistrictInput | string[]
    stateAssmblyDistrict?: DropdownListsCreatestateAssmblyDistrictInput | string[]
    stateSenateDistrict?: DropdownListsCreatestateSenateDistrictInput | string[]
    congressionalDistrict?: DropdownListsCreatecongressionalDistrictInput | string[]
    townCode?: DropdownListsCreatetownCodeInput | string[]
    electionDistrict?: DropdownListsCreateelectionDistrictInput | string[]
    party?: DropdownListsCreatepartyInput | string[]
  }

  export type DropdownListsUpdateInput = {
    city?: DropdownListsUpdatecityInput | string[]
    zipCode?: DropdownListsUpdatezipCodeInput | string[]
    street?: DropdownListsUpdatestreetInput | string[]
    countyLegDistrict?: DropdownListsUpdatecountyLegDistrictInput | string[]
    stateAssmblyDistrict?: DropdownListsUpdatestateAssmblyDistrictInput | string[]
    stateSenateDistrict?: DropdownListsUpdatestateSenateDistrictInput | string[]
    congressionalDistrict?: DropdownListsUpdatecongressionalDistrictInput | string[]
    townCode?: DropdownListsUpdatetownCodeInput | string[]
    electionDistrict?: DropdownListsUpdateelectionDistrictInput | string[]
    party?: DropdownListsUpdatepartyInput | string[]
  }

  export type DropdownListsUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    city?: DropdownListsUpdatecityInput | string[]
    zipCode?: DropdownListsUpdatezipCodeInput | string[]
    street?: DropdownListsUpdatestreetInput | string[]
    countyLegDistrict?: DropdownListsUpdatecountyLegDistrictInput | string[]
    stateAssmblyDistrict?: DropdownListsUpdatestateAssmblyDistrictInput | string[]
    stateSenateDistrict?: DropdownListsUpdatestateSenateDistrictInput | string[]
    congressionalDistrict?: DropdownListsUpdatecongressionalDistrictInput | string[]
    townCode?: DropdownListsUpdatetownCodeInput | string[]
    electionDistrict?: DropdownListsUpdateelectionDistrictInput | string[]
    party?: DropdownListsUpdatepartyInput | string[]
  }

  export type DropdownListsCreateManyInput = {
    id?: number
    city?: DropdownListsCreatecityInput | string[]
    zipCode?: DropdownListsCreatezipCodeInput | string[]
    street?: DropdownListsCreatestreetInput | string[]
    countyLegDistrict?: DropdownListsCreatecountyLegDistrictInput | string[]
    stateAssmblyDistrict?: DropdownListsCreatestateAssmblyDistrictInput | string[]
    stateSenateDistrict?: DropdownListsCreatestateSenateDistrictInput | string[]
    congressionalDistrict?: DropdownListsCreatecongressionalDistrictInput | string[]
    townCode?: DropdownListsCreatetownCodeInput | string[]
    electionDistrict?: DropdownListsCreateelectionDistrictInput | string[]
    party?: DropdownListsCreatepartyInput | string[]
  }

  export type DropdownListsUpdateManyMutationInput = {
    city?: DropdownListsUpdatecityInput | string[]
    zipCode?: DropdownListsUpdatezipCodeInput | string[]
    street?: DropdownListsUpdatestreetInput | string[]
    countyLegDistrict?: DropdownListsUpdatecountyLegDistrictInput | string[]
    stateAssmblyDistrict?: DropdownListsUpdatestateAssmblyDistrictInput | string[]
    stateSenateDistrict?: DropdownListsUpdatestateSenateDistrictInput | string[]
    congressionalDistrict?: DropdownListsUpdatecongressionalDistrictInput | string[]
    townCode?: DropdownListsUpdatetownCodeInput | string[]
    electionDistrict?: DropdownListsUpdateelectionDistrictInput | string[]
    party?: DropdownListsUpdatepartyInput | string[]
  }

  export type DropdownListsUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    city?: DropdownListsUpdatecityInput | string[]
    zipCode?: DropdownListsUpdatezipCodeInput | string[]
    street?: DropdownListsUpdatestreetInput | string[]
    countyLegDistrict?: DropdownListsUpdatecountyLegDistrictInput | string[]
    stateAssmblyDistrict?: DropdownListsUpdatestateAssmblyDistrictInput | string[]
    stateSenateDistrict?: DropdownListsUpdatestateSenateDistrictInput | string[]
    congressionalDistrict?: DropdownListsUpdatecongressionalDistrictInput | string[]
    townCode?: DropdownListsUpdatetownCodeInput | string[]
    electionDistrict?: DropdownListsUpdateelectionDistrictInput | string[]
    party?: DropdownListsUpdatepartyInput | string[]
  }

  export type CommitteeUploadDiscrepancyCreateInput = {
    id?: string
    VRCNUM: string
    discrepancy: JsonNullValueInput | InputJsonValue
    committee: CommitteeListCreateNestedOneWithoutCommitteeDiscrepancyRecordsInput
  }

  export type CommitteeUploadDiscrepancyUncheckedCreateInput = {
    id?: string
    VRCNUM: string
    committeeId: number
    discrepancy: JsonNullValueInput | InputJsonValue
  }

  export type CommitteeUploadDiscrepancyUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    VRCNUM?: StringFieldUpdateOperationsInput | string
    discrepancy?: JsonNullValueInput | InputJsonValue
    committee?: CommitteeListUpdateOneRequiredWithoutCommitteeDiscrepancyRecordsNestedInput
  }

  export type CommitteeUploadDiscrepancyUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    VRCNUM?: StringFieldUpdateOperationsInput | string
    committeeId?: IntFieldUpdateOperationsInput | number
    discrepancy?: JsonNullValueInput | InputJsonValue
  }

  export type CommitteeUploadDiscrepancyCreateManyInput = {
    id?: string
    VRCNUM: string
    committeeId: number
    discrepancy: JsonNullValueInput | InputJsonValue
  }

  export type CommitteeUploadDiscrepancyUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    VRCNUM?: StringFieldUpdateOperationsInput | string
    discrepancy?: JsonNullValueInput | InputJsonValue
  }

  export type CommitteeUploadDiscrepancyUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    VRCNUM?: StringFieldUpdateOperationsInput | string
    committeeId?: IntFieldUpdateOperationsInput | number
    discrepancy?: JsonNullValueInput | InputJsonValue
  }

  export type ElectionDateCreateInput = {
    date: Date | string
  }

  export type ElectionDateUncheckedCreateInput = {
    id?: number
    date: Date | string
  }

  export type ElectionDateUpdateInput = {
    date?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ElectionDateUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ElectionDateCreateManyInput = {
    id?: number
    date: Date | string
  }

  export type ElectionDateUpdateManyMutationInput = {
    date?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ElectionDateUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OfficeNameCreateInput = {
    officeName: string
  }

  export type OfficeNameUncheckedCreateInput = {
    id?: number
    officeName: string
  }

  export type OfficeNameUpdateInput = {
    officeName?: StringFieldUpdateOperationsInput | string
  }

  export type OfficeNameUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    officeName?: StringFieldUpdateOperationsInput | string
  }

  export type OfficeNameCreateManyInput = {
    id?: number
    officeName: string
  }

  export type OfficeNameUpdateManyMutationInput = {
    officeName?: StringFieldUpdateOperationsInput | string
  }

  export type OfficeNameUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    officeName?: StringFieldUpdateOperationsInput | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type EnumPrivilegeLevelFilter<$PrismaModel = never> = {
    equals?: $Enums.PrivilegeLevel | EnumPrivilegeLevelFieldRefInput<$PrismaModel>
    in?: $Enums.PrivilegeLevel[] | ListEnumPrivilegeLevelFieldRefInput<$PrismaModel>
    notIn?: $Enums.PrivilegeLevel[] | ListEnumPrivilegeLevelFieldRefInput<$PrismaModel>
    not?: NestedEnumPrivilegeLevelFilter<$PrismaModel> | $Enums.PrivilegeLevel
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type AccountListRelationFilter = {
    every?: AccountWhereInput
    some?: AccountWhereInput
    none?: AccountWhereInput
  }

  export type SessionListRelationFilter = {
    every?: SessionWhereInput
    some?: SessionWhereInput
    none?: SessionWhereInput
  }

  export type AuthenticatorListRelationFilter = {
    every?: AuthenticatorWhereInput
    some?: AuthenticatorWhereInput
    none?: AuthenticatorWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type AccountOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AuthenticatorOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    emailVerified?: SortOrder
    image?: SortOrder
    privilegeLevel?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    emailVerified?: SortOrder
    image?: SortOrder
    privilegeLevel?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    emailVerified?: SortOrder
    image?: SortOrder
    privilegeLevel?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type EnumPrivilegeLevelWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PrivilegeLevel | EnumPrivilegeLevelFieldRefInput<$PrismaModel>
    in?: $Enums.PrivilegeLevel[] | ListEnumPrivilegeLevelFieldRefInput<$PrismaModel>
    notIn?: $Enums.PrivilegeLevel[] | ListEnumPrivilegeLevelFieldRefInput<$PrismaModel>
    not?: NestedEnumPrivilegeLevelWithAggregatesFilter<$PrismaModel> | $Enums.PrivilegeLevel
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPrivilegeLevelFilter<$PrismaModel>
    _max?: NestedEnumPrivilegeLevelFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type UserRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type AccountProviderProviderAccountIdCompoundUniqueInput = {
    provider: string
    providerAccountId: string
  }

  export type AccountCountOrderByAggregateInput = {
    userId?: SortOrder
    type?: SortOrder
    provider?: SortOrder
    providerAccountId?: SortOrder
    refresh_token?: SortOrder
    access_token?: SortOrder
    expires_at?: SortOrder
    token_type?: SortOrder
    scope?: SortOrder
    id_token?: SortOrder
    session_state?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AccountAvgOrderByAggregateInput = {
    expires_at?: SortOrder
  }

  export type AccountMaxOrderByAggregateInput = {
    userId?: SortOrder
    type?: SortOrder
    provider?: SortOrder
    providerAccountId?: SortOrder
    refresh_token?: SortOrder
    access_token?: SortOrder
    expires_at?: SortOrder
    token_type?: SortOrder
    scope?: SortOrder
    id_token?: SortOrder
    session_state?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AccountMinOrderByAggregateInput = {
    userId?: SortOrder
    type?: SortOrder
    provider?: SortOrder
    providerAccountId?: SortOrder
    refresh_token?: SortOrder
    access_token?: SortOrder
    expires_at?: SortOrder
    token_type?: SortOrder
    scope?: SortOrder
    id_token?: SortOrder
    session_state?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AccountSumOrderByAggregateInput = {
    expires_at?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type SessionCountOrderByAggregateInput = {
    sessionToken?: SortOrder
    userId?: SortOrder
    expires?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SessionMaxOrderByAggregateInput = {
    sessionToken?: SortOrder
    userId?: SortOrder
    expires?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SessionMinOrderByAggregateInput = {
    sessionToken?: SortOrder
    userId?: SortOrder
    expires?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type PrivilegedUserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    privilegeLevel?: SortOrder
  }

  export type PrivilegedUserAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type PrivilegedUserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    privilegeLevel?: SortOrder
  }

  export type PrivilegedUserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    privilegeLevel?: SortOrder
  }

  export type PrivilegedUserSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type VerificationTokenIdentifierTokenCompoundUniqueInput = {
    identifier: string
    token: string
  }

  export type VerificationTokenCountOrderByAggregateInput = {
    identifier?: SortOrder
    token?: SortOrder
    expires?: SortOrder
  }

  export type VerificationTokenMaxOrderByAggregateInput = {
    identifier?: SortOrder
    token?: SortOrder
    expires?: SortOrder
  }

  export type VerificationTokenMinOrderByAggregateInput = {
    identifier?: SortOrder
    token?: SortOrder
    expires?: SortOrder
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type AuthenticatorUserIdCredentialIDCompoundUniqueInput = {
    userId: string
    credentialID: string
  }

  export type AuthenticatorCountOrderByAggregateInput = {
    credentialID?: SortOrder
    userId?: SortOrder
    providerAccountId?: SortOrder
    credentialPublicKey?: SortOrder
    counter?: SortOrder
    credentialDeviceType?: SortOrder
    credentialBackedUp?: SortOrder
    transports?: SortOrder
  }

  export type AuthenticatorAvgOrderByAggregateInput = {
    counter?: SortOrder
  }

  export type AuthenticatorMaxOrderByAggregateInput = {
    credentialID?: SortOrder
    userId?: SortOrder
    providerAccountId?: SortOrder
    credentialPublicKey?: SortOrder
    counter?: SortOrder
    credentialDeviceType?: SortOrder
    credentialBackedUp?: SortOrder
    transports?: SortOrder
  }

  export type AuthenticatorMinOrderByAggregateInput = {
    credentialID?: SortOrder
    userId?: SortOrder
    providerAccountId?: SortOrder
    credentialPublicKey?: SortOrder
    counter?: SortOrder
    credentialDeviceType?: SortOrder
    credentialBackedUp?: SortOrder
    transports?: SortOrder
  }

  export type AuthenticatorSumOrderByAggregateInput = {
    counter?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type VoterRecordArchiveVRCNUMRecordEntryYearRecordEntryNumberCompoundUniqueInput = {
    VRCNUM: string
    recordEntryYear: number
    recordEntryNumber: number
  }

  export type VoterRecordArchiveCountOrderByAggregateInput = {
    id?: SortOrder
    VRCNUM?: SortOrder
    recordEntryYear?: SortOrder
    recordEntryNumber?: SortOrder
    lastName?: SortOrder
    firstName?: SortOrder
    middleInitial?: SortOrder
    suffixName?: SortOrder
    houseNum?: SortOrder
    street?: SortOrder
    apartment?: SortOrder
    halfAddress?: SortOrder
    resAddrLine2?: SortOrder
    resAddrLine3?: SortOrder
    city?: SortOrder
    state?: SortOrder
    zipCode?: SortOrder
    zipSuffix?: SortOrder
    telephone?: SortOrder
    email?: SortOrder
    mailingAddress1?: SortOrder
    mailingAddress2?: SortOrder
    mailingAddress3?: SortOrder
    mailingAddress4?: SortOrder
    mailingCity?: SortOrder
    mailingState?: SortOrder
    mailingZip?: SortOrder
    mailingZipSuffix?: SortOrder
    party?: SortOrder
    gender?: SortOrder
    DOB?: SortOrder
    L_T?: SortOrder
    electionDistrict?: SortOrder
    countyLegDistrict?: SortOrder
    stateAssmblyDistrict?: SortOrder
    stateSenateDistrict?: SortOrder
    congressionalDistrict?: SortOrder
    CC_WD_Village?: SortOrder
    townCode?: SortOrder
    lastUpdate?: SortOrder
    originalRegDate?: SortOrder
    statevid?: SortOrder
  }

  export type VoterRecordArchiveAvgOrderByAggregateInput = {
    id?: SortOrder
    recordEntryYear?: SortOrder
    recordEntryNumber?: SortOrder
    houseNum?: SortOrder
    electionDistrict?: SortOrder
  }

  export type VoterRecordArchiveMaxOrderByAggregateInput = {
    id?: SortOrder
    VRCNUM?: SortOrder
    recordEntryYear?: SortOrder
    recordEntryNumber?: SortOrder
    lastName?: SortOrder
    firstName?: SortOrder
    middleInitial?: SortOrder
    suffixName?: SortOrder
    houseNum?: SortOrder
    street?: SortOrder
    apartment?: SortOrder
    halfAddress?: SortOrder
    resAddrLine2?: SortOrder
    resAddrLine3?: SortOrder
    city?: SortOrder
    state?: SortOrder
    zipCode?: SortOrder
    zipSuffix?: SortOrder
    telephone?: SortOrder
    email?: SortOrder
    mailingAddress1?: SortOrder
    mailingAddress2?: SortOrder
    mailingAddress3?: SortOrder
    mailingAddress4?: SortOrder
    mailingCity?: SortOrder
    mailingState?: SortOrder
    mailingZip?: SortOrder
    mailingZipSuffix?: SortOrder
    party?: SortOrder
    gender?: SortOrder
    DOB?: SortOrder
    L_T?: SortOrder
    electionDistrict?: SortOrder
    countyLegDistrict?: SortOrder
    stateAssmblyDistrict?: SortOrder
    stateSenateDistrict?: SortOrder
    congressionalDistrict?: SortOrder
    CC_WD_Village?: SortOrder
    townCode?: SortOrder
    lastUpdate?: SortOrder
    originalRegDate?: SortOrder
    statevid?: SortOrder
  }

  export type VoterRecordArchiveMinOrderByAggregateInput = {
    id?: SortOrder
    VRCNUM?: SortOrder
    recordEntryYear?: SortOrder
    recordEntryNumber?: SortOrder
    lastName?: SortOrder
    firstName?: SortOrder
    middleInitial?: SortOrder
    suffixName?: SortOrder
    houseNum?: SortOrder
    street?: SortOrder
    apartment?: SortOrder
    halfAddress?: SortOrder
    resAddrLine2?: SortOrder
    resAddrLine3?: SortOrder
    city?: SortOrder
    state?: SortOrder
    zipCode?: SortOrder
    zipSuffix?: SortOrder
    telephone?: SortOrder
    email?: SortOrder
    mailingAddress1?: SortOrder
    mailingAddress2?: SortOrder
    mailingAddress3?: SortOrder
    mailingAddress4?: SortOrder
    mailingCity?: SortOrder
    mailingState?: SortOrder
    mailingZip?: SortOrder
    mailingZipSuffix?: SortOrder
    party?: SortOrder
    gender?: SortOrder
    DOB?: SortOrder
    L_T?: SortOrder
    electionDistrict?: SortOrder
    countyLegDistrict?: SortOrder
    stateAssmblyDistrict?: SortOrder
    stateSenateDistrict?: SortOrder
    congressionalDistrict?: SortOrder
    CC_WD_Village?: SortOrder
    townCode?: SortOrder
    lastUpdate?: SortOrder
    originalRegDate?: SortOrder
    statevid?: SortOrder
  }

  export type VoterRecordArchiveSumOrderByAggregateInput = {
    id?: SortOrder
    recordEntryYear?: SortOrder
    recordEntryNumber?: SortOrder
    houseNum?: SortOrder
    electionDistrict?: SortOrder
  }

  export type BoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type VotingHistoryRecordListRelationFilter = {
    every?: VotingHistoryRecordWhereInput
    some?: VotingHistoryRecordWhereInput
    none?: VotingHistoryRecordWhereInput
  }

  export type CommitteeListNullableRelationFilter = {
    is?: CommitteeListWhereInput | null
    isNot?: CommitteeListWhereInput | null
  }

  export type CommitteeRequestListRelationFilter = {
    every?: CommitteeRequestWhereInput
    some?: CommitteeRequestWhereInput
    none?: CommitteeRequestWhereInput
  }

  export type VotingHistoryRecordOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CommitteeRequestOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type VoterRecordCountOrderByAggregateInput = {
    VRCNUM?: SortOrder
    committeeId?: SortOrder
    addressForCommittee?: SortOrder
    latestRecordEntryYear?: SortOrder
    latestRecordEntryNumber?: SortOrder
    lastName?: SortOrder
    firstName?: SortOrder
    middleInitial?: SortOrder
    suffixName?: SortOrder
    houseNum?: SortOrder
    street?: SortOrder
    apartment?: SortOrder
    halfAddress?: SortOrder
    resAddrLine2?: SortOrder
    resAddrLine3?: SortOrder
    city?: SortOrder
    state?: SortOrder
    zipCode?: SortOrder
    zipSuffix?: SortOrder
    telephone?: SortOrder
    email?: SortOrder
    mailingAddress1?: SortOrder
    mailingAddress2?: SortOrder
    mailingAddress3?: SortOrder
    mailingAddress4?: SortOrder
    mailingCity?: SortOrder
    mailingState?: SortOrder
    mailingZip?: SortOrder
    mailingZipSuffix?: SortOrder
    party?: SortOrder
    gender?: SortOrder
    DOB?: SortOrder
    L_T?: SortOrder
    electionDistrict?: SortOrder
    countyLegDistrict?: SortOrder
    stateAssmblyDistrict?: SortOrder
    stateSenateDistrict?: SortOrder
    congressionalDistrict?: SortOrder
    CC_WD_Village?: SortOrder
    townCode?: SortOrder
    lastUpdate?: SortOrder
    originalRegDate?: SortOrder
    statevid?: SortOrder
    hasDiscrepancy?: SortOrder
  }

  export type VoterRecordAvgOrderByAggregateInput = {
    committeeId?: SortOrder
    latestRecordEntryYear?: SortOrder
    latestRecordEntryNumber?: SortOrder
    houseNum?: SortOrder
    electionDistrict?: SortOrder
  }

  export type VoterRecordMaxOrderByAggregateInput = {
    VRCNUM?: SortOrder
    committeeId?: SortOrder
    addressForCommittee?: SortOrder
    latestRecordEntryYear?: SortOrder
    latestRecordEntryNumber?: SortOrder
    lastName?: SortOrder
    firstName?: SortOrder
    middleInitial?: SortOrder
    suffixName?: SortOrder
    houseNum?: SortOrder
    street?: SortOrder
    apartment?: SortOrder
    halfAddress?: SortOrder
    resAddrLine2?: SortOrder
    resAddrLine3?: SortOrder
    city?: SortOrder
    state?: SortOrder
    zipCode?: SortOrder
    zipSuffix?: SortOrder
    telephone?: SortOrder
    email?: SortOrder
    mailingAddress1?: SortOrder
    mailingAddress2?: SortOrder
    mailingAddress3?: SortOrder
    mailingAddress4?: SortOrder
    mailingCity?: SortOrder
    mailingState?: SortOrder
    mailingZip?: SortOrder
    mailingZipSuffix?: SortOrder
    party?: SortOrder
    gender?: SortOrder
    DOB?: SortOrder
    L_T?: SortOrder
    electionDistrict?: SortOrder
    countyLegDistrict?: SortOrder
    stateAssmblyDistrict?: SortOrder
    stateSenateDistrict?: SortOrder
    congressionalDistrict?: SortOrder
    CC_WD_Village?: SortOrder
    townCode?: SortOrder
    lastUpdate?: SortOrder
    originalRegDate?: SortOrder
    statevid?: SortOrder
    hasDiscrepancy?: SortOrder
  }

  export type VoterRecordMinOrderByAggregateInput = {
    VRCNUM?: SortOrder
    committeeId?: SortOrder
    addressForCommittee?: SortOrder
    latestRecordEntryYear?: SortOrder
    latestRecordEntryNumber?: SortOrder
    lastName?: SortOrder
    firstName?: SortOrder
    middleInitial?: SortOrder
    suffixName?: SortOrder
    houseNum?: SortOrder
    street?: SortOrder
    apartment?: SortOrder
    halfAddress?: SortOrder
    resAddrLine2?: SortOrder
    resAddrLine3?: SortOrder
    city?: SortOrder
    state?: SortOrder
    zipCode?: SortOrder
    zipSuffix?: SortOrder
    telephone?: SortOrder
    email?: SortOrder
    mailingAddress1?: SortOrder
    mailingAddress2?: SortOrder
    mailingAddress3?: SortOrder
    mailingAddress4?: SortOrder
    mailingCity?: SortOrder
    mailingState?: SortOrder
    mailingZip?: SortOrder
    mailingZipSuffix?: SortOrder
    party?: SortOrder
    gender?: SortOrder
    DOB?: SortOrder
    L_T?: SortOrder
    electionDistrict?: SortOrder
    countyLegDistrict?: SortOrder
    stateAssmblyDistrict?: SortOrder
    stateSenateDistrict?: SortOrder
    congressionalDistrict?: SortOrder
    CC_WD_Village?: SortOrder
    townCode?: SortOrder
    lastUpdate?: SortOrder
    originalRegDate?: SortOrder
    statevid?: SortOrder
    hasDiscrepancy?: SortOrder
  }

  export type VoterRecordSumOrderByAggregateInput = {
    committeeId?: SortOrder
    latestRecordEntryYear?: SortOrder
    latestRecordEntryNumber?: SortOrder
    houseNum?: SortOrder
    electionDistrict?: SortOrder
  }

  export type BoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type VoterRecordRelationFilter = {
    is?: VoterRecordWhereInput
    isNot?: VoterRecordWhereInput
  }

  export type VotingHistoryRecordCountOrderByAggregateInput = {
    id?: SortOrder
    voterRecordId?: SortOrder
    date?: SortOrder
    value?: SortOrder
  }

  export type VotingHistoryRecordAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type VotingHistoryRecordMaxOrderByAggregateInput = {
    id?: SortOrder
    voterRecordId?: SortOrder
    date?: SortOrder
    value?: SortOrder
  }

  export type VotingHistoryRecordMinOrderByAggregateInput = {
    id?: SortOrder
    voterRecordId?: SortOrder
    date?: SortOrder
    value?: SortOrder
  }

  export type VotingHistoryRecordSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type VoterRecordListRelationFilter = {
    every?: VoterRecordWhereInput
    some?: VoterRecordWhereInput
    none?: VoterRecordWhereInput
  }

  export type CommitteeUploadDiscrepancyListRelationFilter = {
    every?: CommitteeUploadDiscrepancyWhereInput
    some?: CommitteeUploadDiscrepancyWhereInput
    none?: CommitteeUploadDiscrepancyWhereInput
  }

  export type VoterRecordOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CommitteeUploadDiscrepancyOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CommitteeListCityTownLegDistrictElectionDistrictCompoundUniqueInput = {
    cityTown: string
    legDistrict: number
    electionDistrict: number
  }

  export type CommitteeListCountOrderByAggregateInput = {
    id?: SortOrder
    cityTown?: SortOrder
    legDistrict?: SortOrder
    electionDistrict?: SortOrder
  }

  export type CommitteeListAvgOrderByAggregateInput = {
    id?: SortOrder
    legDistrict?: SortOrder
    electionDistrict?: SortOrder
  }

  export type CommitteeListMaxOrderByAggregateInput = {
    id?: SortOrder
    cityTown?: SortOrder
    legDistrict?: SortOrder
    electionDistrict?: SortOrder
  }

  export type CommitteeListMinOrderByAggregateInput = {
    id?: SortOrder
    cityTown?: SortOrder
    legDistrict?: SortOrder
    electionDistrict?: SortOrder
  }

  export type CommitteeListSumOrderByAggregateInput = {
    id?: SortOrder
    legDistrict?: SortOrder
    electionDistrict?: SortOrder
  }

  export type CommitteeListRelationFilter = {
    is?: CommitteeListWhereInput
    isNot?: CommitteeListWhereInput
  }

  export type VoterRecordNullableRelationFilter = {
    is?: VoterRecordWhereInput | null
    isNot?: VoterRecordWhereInput | null
  }

  export type CommitteeRequestCountOrderByAggregateInput = {
    id?: SortOrder
    committeeListId?: SortOrder
    addVoterRecordId?: SortOrder
    removeVoterRecordId?: SortOrder
    requestNotes?: SortOrder
  }

  export type CommitteeRequestAvgOrderByAggregateInput = {
    id?: SortOrder
    committeeListId?: SortOrder
  }

  export type CommitteeRequestMaxOrderByAggregateInput = {
    id?: SortOrder
    committeeListId?: SortOrder
    addVoterRecordId?: SortOrder
    removeVoterRecordId?: SortOrder
    requestNotes?: SortOrder
  }

  export type CommitteeRequestMinOrderByAggregateInput = {
    id?: SortOrder
    committeeListId?: SortOrder
    addVoterRecordId?: SortOrder
    removeVoterRecordId?: SortOrder
    requestNotes?: SortOrder
  }

  export type CommitteeRequestSumOrderByAggregateInput = {
    id?: SortOrder
    committeeListId?: SortOrder
  }

  export type StringNullableListFilter<$PrismaModel = never> = {
    equals?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    has?: string | StringFieldRefInput<$PrismaModel> | null
    hasEvery?: string[] | ListStringFieldRefInput<$PrismaModel>
    hasSome?: string[] | ListStringFieldRefInput<$PrismaModel>
    isEmpty?: boolean
  }

  export type DropdownListsCountOrderByAggregateInput = {
    id?: SortOrder
    city?: SortOrder
    zipCode?: SortOrder
    street?: SortOrder
    countyLegDistrict?: SortOrder
    stateAssmblyDistrict?: SortOrder
    stateSenateDistrict?: SortOrder
    congressionalDistrict?: SortOrder
    townCode?: SortOrder
    electionDistrict?: SortOrder
    party?: SortOrder
  }

  export type DropdownListsAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type DropdownListsMaxOrderByAggregateInput = {
    id?: SortOrder
  }

  export type DropdownListsMinOrderByAggregateInput = {
    id?: SortOrder
  }

  export type DropdownListsSumOrderByAggregateInput = {
    id?: SortOrder
  }
  export type JsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type CommitteeUploadDiscrepancyCountOrderByAggregateInput = {
    id?: SortOrder
    VRCNUM?: SortOrder
    committeeId?: SortOrder
    discrepancy?: SortOrder
  }

  export type CommitteeUploadDiscrepancyAvgOrderByAggregateInput = {
    committeeId?: SortOrder
  }

  export type CommitteeUploadDiscrepancyMaxOrderByAggregateInput = {
    id?: SortOrder
    VRCNUM?: SortOrder
    committeeId?: SortOrder
  }

  export type CommitteeUploadDiscrepancyMinOrderByAggregateInput = {
    id?: SortOrder
    VRCNUM?: SortOrder
    committeeId?: SortOrder
  }

  export type CommitteeUploadDiscrepancySumOrderByAggregateInput = {
    committeeId?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type ElectionDateCountOrderByAggregateInput = {
    id?: SortOrder
    date?: SortOrder
  }

  export type ElectionDateAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type ElectionDateMaxOrderByAggregateInput = {
    id?: SortOrder
    date?: SortOrder
  }

  export type ElectionDateMinOrderByAggregateInput = {
    id?: SortOrder
    date?: SortOrder
  }

  export type ElectionDateSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type OfficeNameCountOrderByAggregateInput = {
    id?: SortOrder
    officeName?: SortOrder
  }

  export type OfficeNameAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type OfficeNameMaxOrderByAggregateInput = {
    id?: SortOrder
    officeName?: SortOrder
  }

  export type OfficeNameMinOrderByAggregateInput = {
    id?: SortOrder
    officeName?: SortOrder
  }

  export type OfficeNameSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type AccountCreateNestedManyWithoutUserInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
  }

  export type SessionCreateNestedManyWithoutUserInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type AuthenticatorCreateNestedManyWithoutUserInput = {
    create?: XOR<AuthenticatorCreateWithoutUserInput, AuthenticatorUncheckedCreateWithoutUserInput> | AuthenticatorCreateWithoutUserInput[] | AuthenticatorUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuthenticatorCreateOrConnectWithoutUserInput | AuthenticatorCreateOrConnectWithoutUserInput[]
    createMany?: AuthenticatorCreateManyUserInputEnvelope
    connect?: AuthenticatorWhereUniqueInput | AuthenticatorWhereUniqueInput[]
  }

  export type AccountUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
  }

  export type SessionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type AuthenticatorUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<AuthenticatorCreateWithoutUserInput, AuthenticatorUncheckedCreateWithoutUserInput> | AuthenticatorCreateWithoutUserInput[] | AuthenticatorUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuthenticatorCreateOrConnectWithoutUserInput | AuthenticatorCreateOrConnectWithoutUserInput[]
    createMany?: AuthenticatorCreateManyUserInputEnvelope
    connect?: AuthenticatorWhereUniqueInput | AuthenticatorWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type EnumPrivilegeLevelFieldUpdateOperationsInput = {
    set?: $Enums.PrivilegeLevel
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type AccountUpdateManyWithoutUserNestedInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    upsert?: AccountUpsertWithWhereUniqueWithoutUserInput | AccountUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    set?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    disconnect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    delete?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    update?: AccountUpdateWithWhereUniqueWithoutUserInput | AccountUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AccountUpdateManyWithWhereWithoutUserInput | AccountUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AccountScalarWhereInput | AccountScalarWhereInput[]
  }

  export type SessionUpdateManyWithoutUserNestedInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutUserInput | SessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutUserInput | SessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutUserInput | SessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type AuthenticatorUpdateManyWithoutUserNestedInput = {
    create?: XOR<AuthenticatorCreateWithoutUserInput, AuthenticatorUncheckedCreateWithoutUserInput> | AuthenticatorCreateWithoutUserInput[] | AuthenticatorUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuthenticatorCreateOrConnectWithoutUserInput | AuthenticatorCreateOrConnectWithoutUserInput[]
    upsert?: AuthenticatorUpsertWithWhereUniqueWithoutUserInput | AuthenticatorUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AuthenticatorCreateManyUserInputEnvelope
    set?: AuthenticatorWhereUniqueInput | AuthenticatorWhereUniqueInput[]
    disconnect?: AuthenticatorWhereUniqueInput | AuthenticatorWhereUniqueInput[]
    delete?: AuthenticatorWhereUniqueInput | AuthenticatorWhereUniqueInput[]
    connect?: AuthenticatorWhereUniqueInput | AuthenticatorWhereUniqueInput[]
    update?: AuthenticatorUpdateWithWhereUniqueWithoutUserInput | AuthenticatorUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AuthenticatorUpdateManyWithWhereWithoutUserInput | AuthenticatorUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AuthenticatorScalarWhereInput | AuthenticatorScalarWhereInput[]
  }

  export type AccountUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    upsert?: AccountUpsertWithWhereUniqueWithoutUserInput | AccountUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    set?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    disconnect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    delete?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    update?: AccountUpdateWithWhereUniqueWithoutUserInput | AccountUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AccountUpdateManyWithWhereWithoutUserInput | AccountUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AccountScalarWhereInput | AccountScalarWhereInput[]
  }

  export type SessionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutUserInput | SessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutUserInput | SessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutUserInput | SessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type AuthenticatorUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<AuthenticatorCreateWithoutUserInput, AuthenticatorUncheckedCreateWithoutUserInput> | AuthenticatorCreateWithoutUserInput[] | AuthenticatorUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuthenticatorCreateOrConnectWithoutUserInput | AuthenticatorCreateOrConnectWithoutUserInput[]
    upsert?: AuthenticatorUpsertWithWhereUniqueWithoutUserInput | AuthenticatorUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AuthenticatorCreateManyUserInputEnvelope
    set?: AuthenticatorWhereUniqueInput | AuthenticatorWhereUniqueInput[]
    disconnect?: AuthenticatorWhereUniqueInput | AuthenticatorWhereUniqueInput[]
    delete?: AuthenticatorWhereUniqueInput | AuthenticatorWhereUniqueInput[]
    connect?: AuthenticatorWhereUniqueInput | AuthenticatorWhereUniqueInput[]
    update?: AuthenticatorUpdateWithWhereUniqueWithoutUserInput | AuthenticatorUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AuthenticatorUpdateManyWithWhereWithoutUserInput | AuthenticatorUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AuthenticatorScalarWhereInput | AuthenticatorScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutAccountsInput = {
    create?: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAccountsInput
    connect?: UserWhereUniqueInput
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type UserUpdateOneRequiredWithoutAccountsNestedInput = {
    create?: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAccountsInput
    upsert?: UserUpsertWithoutAccountsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAccountsInput, UserUpdateWithoutAccountsInput>, UserUncheckedUpdateWithoutAccountsInput>
  }

  export type UserCreateNestedOneWithoutSessionsInput = {
    create?: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSessionsInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutSessionsNestedInput = {
    create?: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSessionsInput
    upsert?: UserUpsertWithoutSessionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSessionsInput, UserUpdateWithoutSessionsInput>, UserUncheckedUpdateWithoutSessionsInput>
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type UserCreateNestedOneWithoutAuthenticatorInput = {
    create?: XOR<UserCreateWithoutAuthenticatorInput, UserUncheckedCreateWithoutAuthenticatorInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuthenticatorInput
    connect?: UserWhereUniqueInput
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type UserUpdateOneRequiredWithoutAuthenticatorNestedInput = {
    create?: XOR<UserCreateWithoutAuthenticatorInput, UserUncheckedCreateWithoutAuthenticatorInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuthenticatorInput
    upsert?: UserUpsertWithoutAuthenticatorInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAuthenticatorInput, UserUpdateWithoutAuthenticatorInput>, UserUncheckedUpdateWithoutAuthenticatorInput>
  }

  export type VotingHistoryRecordCreateNestedManyWithoutVoterRecordInput = {
    create?: XOR<VotingHistoryRecordCreateWithoutVoterRecordInput, VotingHistoryRecordUncheckedCreateWithoutVoterRecordInput> | VotingHistoryRecordCreateWithoutVoterRecordInput[] | VotingHistoryRecordUncheckedCreateWithoutVoterRecordInput[]
    connectOrCreate?: VotingHistoryRecordCreateOrConnectWithoutVoterRecordInput | VotingHistoryRecordCreateOrConnectWithoutVoterRecordInput[]
    createMany?: VotingHistoryRecordCreateManyVoterRecordInputEnvelope
    connect?: VotingHistoryRecordWhereUniqueInput | VotingHistoryRecordWhereUniqueInput[]
  }

  export type CommitteeListCreateNestedOneWithoutCommitteeMemberListInput = {
    create?: XOR<CommitteeListCreateWithoutCommitteeMemberListInput, CommitteeListUncheckedCreateWithoutCommitteeMemberListInput>
    connectOrCreate?: CommitteeListCreateOrConnectWithoutCommitteeMemberListInput
    connect?: CommitteeListWhereUniqueInput
  }

  export type CommitteeRequestCreateNestedManyWithoutAddVoterRecordInput = {
    create?: XOR<CommitteeRequestCreateWithoutAddVoterRecordInput, CommitteeRequestUncheckedCreateWithoutAddVoterRecordInput> | CommitteeRequestCreateWithoutAddVoterRecordInput[] | CommitteeRequestUncheckedCreateWithoutAddVoterRecordInput[]
    connectOrCreate?: CommitteeRequestCreateOrConnectWithoutAddVoterRecordInput | CommitteeRequestCreateOrConnectWithoutAddVoterRecordInput[]
    createMany?: CommitteeRequestCreateManyAddVoterRecordInputEnvelope
    connect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
  }

  export type CommitteeRequestCreateNestedManyWithoutRemoveVoterRecordInput = {
    create?: XOR<CommitteeRequestCreateWithoutRemoveVoterRecordInput, CommitteeRequestUncheckedCreateWithoutRemoveVoterRecordInput> | CommitteeRequestCreateWithoutRemoveVoterRecordInput[] | CommitteeRequestUncheckedCreateWithoutRemoveVoterRecordInput[]
    connectOrCreate?: CommitteeRequestCreateOrConnectWithoutRemoveVoterRecordInput | CommitteeRequestCreateOrConnectWithoutRemoveVoterRecordInput[]
    createMany?: CommitteeRequestCreateManyRemoveVoterRecordInputEnvelope
    connect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
  }

  export type VotingHistoryRecordUncheckedCreateNestedManyWithoutVoterRecordInput = {
    create?: XOR<VotingHistoryRecordCreateWithoutVoterRecordInput, VotingHistoryRecordUncheckedCreateWithoutVoterRecordInput> | VotingHistoryRecordCreateWithoutVoterRecordInput[] | VotingHistoryRecordUncheckedCreateWithoutVoterRecordInput[]
    connectOrCreate?: VotingHistoryRecordCreateOrConnectWithoutVoterRecordInput | VotingHistoryRecordCreateOrConnectWithoutVoterRecordInput[]
    createMany?: VotingHistoryRecordCreateManyVoterRecordInputEnvelope
    connect?: VotingHistoryRecordWhereUniqueInput | VotingHistoryRecordWhereUniqueInput[]
  }

  export type CommitteeRequestUncheckedCreateNestedManyWithoutAddVoterRecordInput = {
    create?: XOR<CommitteeRequestCreateWithoutAddVoterRecordInput, CommitteeRequestUncheckedCreateWithoutAddVoterRecordInput> | CommitteeRequestCreateWithoutAddVoterRecordInput[] | CommitteeRequestUncheckedCreateWithoutAddVoterRecordInput[]
    connectOrCreate?: CommitteeRequestCreateOrConnectWithoutAddVoterRecordInput | CommitteeRequestCreateOrConnectWithoutAddVoterRecordInput[]
    createMany?: CommitteeRequestCreateManyAddVoterRecordInputEnvelope
    connect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
  }

  export type CommitteeRequestUncheckedCreateNestedManyWithoutRemoveVoterRecordInput = {
    create?: XOR<CommitteeRequestCreateWithoutRemoveVoterRecordInput, CommitteeRequestUncheckedCreateWithoutRemoveVoterRecordInput> | CommitteeRequestCreateWithoutRemoveVoterRecordInput[] | CommitteeRequestUncheckedCreateWithoutRemoveVoterRecordInput[]
    connectOrCreate?: CommitteeRequestCreateOrConnectWithoutRemoveVoterRecordInput | CommitteeRequestCreateOrConnectWithoutRemoveVoterRecordInput[]
    createMany?: CommitteeRequestCreateManyRemoveVoterRecordInputEnvelope
    connect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
  }

  export type NullableBoolFieldUpdateOperationsInput = {
    set?: boolean | null
  }

  export type VotingHistoryRecordUpdateManyWithoutVoterRecordNestedInput = {
    create?: XOR<VotingHistoryRecordCreateWithoutVoterRecordInput, VotingHistoryRecordUncheckedCreateWithoutVoterRecordInput> | VotingHistoryRecordCreateWithoutVoterRecordInput[] | VotingHistoryRecordUncheckedCreateWithoutVoterRecordInput[]
    connectOrCreate?: VotingHistoryRecordCreateOrConnectWithoutVoterRecordInput | VotingHistoryRecordCreateOrConnectWithoutVoterRecordInput[]
    upsert?: VotingHistoryRecordUpsertWithWhereUniqueWithoutVoterRecordInput | VotingHistoryRecordUpsertWithWhereUniqueWithoutVoterRecordInput[]
    createMany?: VotingHistoryRecordCreateManyVoterRecordInputEnvelope
    set?: VotingHistoryRecordWhereUniqueInput | VotingHistoryRecordWhereUniqueInput[]
    disconnect?: VotingHistoryRecordWhereUniqueInput | VotingHistoryRecordWhereUniqueInput[]
    delete?: VotingHistoryRecordWhereUniqueInput | VotingHistoryRecordWhereUniqueInput[]
    connect?: VotingHistoryRecordWhereUniqueInput | VotingHistoryRecordWhereUniqueInput[]
    update?: VotingHistoryRecordUpdateWithWhereUniqueWithoutVoterRecordInput | VotingHistoryRecordUpdateWithWhereUniqueWithoutVoterRecordInput[]
    updateMany?: VotingHistoryRecordUpdateManyWithWhereWithoutVoterRecordInput | VotingHistoryRecordUpdateManyWithWhereWithoutVoterRecordInput[]
    deleteMany?: VotingHistoryRecordScalarWhereInput | VotingHistoryRecordScalarWhereInput[]
  }

  export type CommitteeListUpdateOneWithoutCommitteeMemberListNestedInput = {
    create?: XOR<CommitteeListCreateWithoutCommitteeMemberListInput, CommitteeListUncheckedCreateWithoutCommitteeMemberListInput>
    connectOrCreate?: CommitteeListCreateOrConnectWithoutCommitteeMemberListInput
    upsert?: CommitteeListUpsertWithoutCommitteeMemberListInput
    disconnect?: CommitteeListWhereInput | boolean
    delete?: CommitteeListWhereInput | boolean
    connect?: CommitteeListWhereUniqueInput
    update?: XOR<XOR<CommitteeListUpdateToOneWithWhereWithoutCommitteeMemberListInput, CommitteeListUpdateWithoutCommitteeMemberListInput>, CommitteeListUncheckedUpdateWithoutCommitteeMemberListInput>
  }

  export type CommitteeRequestUpdateManyWithoutAddVoterRecordNestedInput = {
    create?: XOR<CommitteeRequestCreateWithoutAddVoterRecordInput, CommitteeRequestUncheckedCreateWithoutAddVoterRecordInput> | CommitteeRequestCreateWithoutAddVoterRecordInput[] | CommitteeRequestUncheckedCreateWithoutAddVoterRecordInput[]
    connectOrCreate?: CommitteeRequestCreateOrConnectWithoutAddVoterRecordInput | CommitteeRequestCreateOrConnectWithoutAddVoterRecordInput[]
    upsert?: CommitteeRequestUpsertWithWhereUniqueWithoutAddVoterRecordInput | CommitteeRequestUpsertWithWhereUniqueWithoutAddVoterRecordInput[]
    createMany?: CommitteeRequestCreateManyAddVoterRecordInputEnvelope
    set?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    disconnect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    delete?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    connect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    update?: CommitteeRequestUpdateWithWhereUniqueWithoutAddVoterRecordInput | CommitteeRequestUpdateWithWhereUniqueWithoutAddVoterRecordInput[]
    updateMany?: CommitteeRequestUpdateManyWithWhereWithoutAddVoterRecordInput | CommitteeRequestUpdateManyWithWhereWithoutAddVoterRecordInput[]
    deleteMany?: CommitteeRequestScalarWhereInput | CommitteeRequestScalarWhereInput[]
  }

  export type CommitteeRequestUpdateManyWithoutRemoveVoterRecordNestedInput = {
    create?: XOR<CommitteeRequestCreateWithoutRemoveVoterRecordInput, CommitteeRequestUncheckedCreateWithoutRemoveVoterRecordInput> | CommitteeRequestCreateWithoutRemoveVoterRecordInput[] | CommitteeRequestUncheckedCreateWithoutRemoveVoterRecordInput[]
    connectOrCreate?: CommitteeRequestCreateOrConnectWithoutRemoveVoterRecordInput | CommitteeRequestCreateOrConnectWithoutRemoveVoterRecordInput[]
    upsert?: CommitteeRequestUpsertWithWhereUniqueWithoutRemoveVoterRecordInput | CommitteeRequestUpsertWithWhereUniqueWithoutRemoveVoterRecordInput[]
    createMany?: CommitteeRequestCreateManyRemoveVoterRecordInputEnvelope
    set?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    disconnect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    delete?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    connect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    update?: CommitteeRequestUpdateWithWhereUniqueWithoutRemoveVoterRecordInput | CommitteeRequestUpdateWithWhereUniqueWithoutRemoveVoterRecordInput[]
    updateMany?: CommitteeRequestUpdateManyWithWhereWithoutRemoveVoterRecordInput | CommitteeRequestUpdateManyWithWhereWithoutRemoveVoterRecordInput[]
    deleteMany?: CommitteeRequestScalarWhereInput | CommitteeRequestScalarWhereInput[]
  }

  export type VotingHistoryRecordUncheckedUpdateManyWithoutVoterRecordNestedInput = {
    create?: XOR<VotingHistoryRecordCreateWithoutVoterRecordInput, VotingHistoryRecordUncheckedCreateWithoutVoterRecordInput> | VotingHistoryRecordCreateWithoutVoterRecordInput[] | VotingHistoryRecordUncheckedCreateWithoutVoterRecordInput[]
    connectOrCreate?: VotingHistoryRecordCreateOrConnectWithoutVoterRecordInput | VotingHistoryRecordCreateOrConnectWithoutVoterRecordInput[]
    upsert?: VotingHistoryRecordUpsertWithWhereUniqueWithoutVoterRecordInput | VotingHistoryRecordUpsertWithWhereUniqueWithoutVoterRecordInput[]
    createMany?: VotingHistoryRecordCreateManyVoterRecordInputEnvelope
    set?: VotingHistoryRecordWhereUniqueInput | VotingHistoryRecordWhereUniqueInput[]
    disconnect?: VotingHistoryRecordWhereUniqueInput | VotingHistoryRecordWhereUniqueInput[]
    delete?: VotingHistoryRecordWhereUniqueInput | VotingHistoryRecordWhereUniqueInput[]
    connect?: VotingHistoryRecordWhereUniqueInput | VotingHistoryRecordWhereUniqueInput[]
    update?: VotingHistoryRecordUpdateWithWhereUniqueWithoutVoterRecordInput | VotingHistoryRecordUpdateWithWhereUniqueWithoutVoterRecordInput[]
    updateMany?: VotingHistoryRecordUpdateManyWithWhereWithoutVoterRecordInput | VotingHistoryRecordUpdateManyWithWhereWithoutVoterRecordInput[]
    deleteMany?: VotingHistoryRecordScalarWhereInput | VotingHistoryRecordScalarWhereInput[]
  }

  export type CommitteeRequestUncheckedUpdateManyWithoutAddVoterRecordNestedInput = {
    create?: XOR<CommitteeRequestCreateWithoutAddVoterRecordInput, CommitteeRequestUncheckedCreateWithoutAddVoterRecordInput> | CommitteeRequestCreateWithoutAddVoterRecordInput[] | CommitteeRequestUncheckedCreateWithoutAddVoterRecordInput[]
    connectOrCreate?: CommitteeRequestCreateOrConnectWithoutAddVoterRecordInput | CommitteeRequestCreateOrConnectWithoutAddVoterRecordInput[]
    upsert?: CommitteeRequestUpsertWithWhereUniqueWithoutAddVoterRecordInput | CommitteeRequestUpsertWithWhereUniqueWithoutAddVoterRecordInput[]
    createMany?: CommitteeRequestCreateManyAddVoterRecordInputEnvelope
    set?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    disconnect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    delete?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    connect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    update?: CommitteeRequestUpdateWithWhereUniqueWithoutAddVoterRecordInput | CommitteeRequestUpdateWithWhereUniqueWithoutAddVoterRecordInput[]
    updateMany?: CommitteeRequestUpdateManyWithWhereWithoutAddVoterRecordInput | CommitteeRequestUpdateManyWithWhereWithoutAddVoterRecordInput[]
    deleteMany?: CommitteeRequestScalarWhereInput | CommitteeRequestScalarWhereInput[]
  }

  export type CommitteeRequestUncheckedUpdateManyWithoutRemoveVoterRecordNestedInput = {
    create?: XOR<CommitteeRequestCreateWithoutRemoveVoterRecordInput, CommitteeRequestUncheckedCreateWithoutRemoveVoterRecordInput> | CommitteeRequestCreateWithoutRemoveVoterRecordInput[] | CommitteeRequestUncheckedCreateWithoutRemoveVoterRecordInput[]
    connectOrCreate?: CommitteeRequestCreateOrConnectWithoutRemoveVoterRecordInput | CommitteeRequestCreateOrConnectWithoutRemoveVoterRecordInput[]
    upsert?: CommitteeRequestUpsertWithWhereUniqueWithoutRemoveVoterRecordInput | CommitteeRequestUpsertWithWhereUniqueWithoutRemoveVoterRecordInput[]
    createMany?: CommitteeRequestCreateManyRemoveVoterRecordInputEnvelope
    set?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    disconnect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    delete?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    connect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    update?: CommitteeRequestUpdateWithWhereUniqueWithoutRemoveVoterRecordInput | CommitteeRequestUpdateWithWhereUniqueWithoutRemoveVoterRecordInput[]
    updateMany?: CommitteeRequestUpdateManyWithWhereWithoutRemoveVoterRecordInput | CommitteeRequestUpdateManyWithWhereWithoutRemoveVoterRecordInput[]
    deleteMany?: CommitteeRequestScalarWhereInput | CommitteeRequestScalarWhereInput[]
  }

  export type VoterRecordCreateNestedOneWithoutVotingRecordsInput = {
    create?: XOR<VoterRecordCreateWithoutVotingRecordsInput, VoterRecordUncheckedCreateWithoutVotingRecordsInput>
    connectOrCreate?: VoterRecordCreateOrConnectWithoutVotingRecordsInput
    connect?: VoterRecordWhereUniqueInput
  }

  export type VoterRecordUpdateOneRequiredWithoutVotingRecordsNestedInput = {
    create?: XOR<VoterRecordCreateWithoutVotingRecordsInput, VoterRecordUncheckedCreateWithoutVotingRecordsInput>
    connectOrCreate?: VoterRecordCreateOrConnectWithoutVotingRecordsInput
    upsert?: VoterRecordUpsertWithoutVotingRecordsInput
    connect?: VoterRecordWhereUniqueInput
    update?: XOR<XOR<VoterRecordUpdateToOneWithWhereWithoutVotingRecordsInput, VoterRecordUpdateWithoutVotingRecordsInput>, VoterRecordUncheckedUpdateWithoutVotingRecordsInput>
  }

  export type VoterRecordCreateNestedManyWithoutCommitteeInput = {
    create?: XOR<VoterRecordCreateWithoutCommitteeInput, VoterRecordUncheckedCreateWithoutCommitteeInput> | VoterRecordCreateWithoutCommitteeInput[] | VoterRecordUncheckedCreateWithoutCommitteeInput[]
    connectOrCreate?: VoterRecordCreateOrConnectWithoutCommitteeInput | VoterRecordCreateOrConnectWithoutCommitteeInput[]
    createMany?: VoterRecordCreateManyCommitteeInputEnvelope
    connect?: VoterRecordWhereUniqueInput | VoterRecordWhereUniqueInput[]
  }

  export type CommitteeRequestCreateNestedManyWithoutCommitteListInput = {
    create?: XOR<CommitteeRequestCreateWithoutCommitteListInput, CommitteeRequestUncheckedCreateWithoutCommitteListInput> | CommitteeRequestCreateWithoutCommitteListInput[] | CommitteeRequestUncheckedCreateWithoutCommitteListInput[]
    connectOrCreate?: CommitteeRequestCreateOrConnectWithoutCommitteListInput | CommitteeRequestCreateOrConnectWithoutCommitteListInput[]
    createMany?: CommitteeRequestCreateManyCommitteListInputEnvelope
    connect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
  }

  export type CommitteeUploadDiscrepancyCreateNestedManyWithoutCommitteeInput = {
    create?: XOR<CommitteeUploadDiscrepancyCreateWithoutCommitteeInput, CommitteeUploadDiscrepancyUncheckedCreateWithoutCommitteeInput> | CommitteeUploadDiscrepancyCreateWithoutCommitteeInput[] | CommitteeUploadDiscrepancyUncheckedCreateWithoutCommitteeInput[]
    connectOrCreate?: CommitteeUploadDiscrepancyCreateOrConnectWithoutCommitteeInput | CommitteeUploadDiscrepancyCreateOrConnectWithoutCommitteeInput[]
    createMany?: CommitteeUploadDiscrepancyCreateManyCommitteeInputEnvelope
    connect?: CommitteeUploadDiscrepancyWhereUniqueInput | CommitteeUploadDiscrepancyWhereUniqueInput[]
  }

  export type VoterRecordUncheckedCreateNestedManyWithoutCommitteeInput = {
    create?: XOR<VoterRecordCreateWithoutCommitteeInput, VoterRecordUncheckedCreateWithoutCommitteeInput> | VoterRecordCreateWithoutCommitteeInput[] | VoterRecordUncheckedCreateWithoutCommitteeInput[]
    connectOrCreate?: VoterRecordCreateOrConnectWithoutCommitteeInput | VoterRecordCreateOrConnectWithoutCommitteeInput[]
    createMany?: VoterRecordCreateManyCommitteeInputEnvelope
    connect?: VoterRecordWhereUniqueInput | VoterRecordWhereUniqueInput[]
  }

  export type CommitteeRequestUncheckedCreateNestedManyWithoutCommitteListInput = {
    create?: XOR<CommitteeRequestCreateWithoutCommitteListInput, CommitteeRequestUncheckedCreateWithoutCommitteListInput> | CommitteeRequestCreateWithoutCommitteListInput[] | CommitteeRequestUncheckedCreateWithoutCommitteListInput[]
    connectOrCreate?: CommitteeRequestCreateOrConnectWithoutCommitteListInput | CommitteeRequestCreateOrConnectWithoutCommitteListInput[]
    createMany?: CommitteeRequestCreateManyCommitteListInputEnvelope
    connect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
  }

  export type CommitteeUploadDiscrepancyUncheckedCreateNestedManyWithoutCommitteeInput = {
    create?: XOR<CommitteeUploadDiscrepancyCreateWithoutCommitteeInput, CommitteeUploadDiscrepancyUncheckedCreateWithoutCommitteeInput> | CommitteeUploadDiscrepancyCreateWithoutCommitteeInput[] | CommitteeUploadDiscrepancyUncheckedCreateWithoutCommitteeInput[]
    connectOrCreate?: CommitteeUploadDiscrepancyCreateOrConnectWithoutCommitteeInput | CommitteeUploadDiscrepancyCreateOrConnectWithoutCommitteeInput[]
    createMany?: CommitteeUploadDiscrepancyCreateManyCommitteeInputEnvelope
    connect?: CommitteeUploadDiscrepancyWhereUniqueInput | CommitteeUploadDiscrepancyWhereUniqueInput[]
  }

  export type VoterRecordUpdateManyWithoutCommitteeNestedInput = {
    create?: XOR<VoterRecordCreateWithoutCommitteeInput, VoterRecordUncheckedCreateWithoutCommitteeInput> | VoterRecordCreateWithoutCommitteeInput[] | VoterRecordUncheckedCreateWithoutCommitteeInput[]
    connectOrCreate?: VoterRecordCreateOrConnectWithoutCommitteeInput | VoterRecordCreateOrConnectWithoutCommitteeInput[]
    upsert?: VoterRecordUpsertWithWhereUniqueWithoutCommitteeInput | VoterRecordUpsertWithWhereUniqueWithoutCommitteeInput[]
    createMany?: VoterRecordCreateManyCommitteeInputEnvelope
    set?: VoterRecordWhereUniqueInput | VoterRecordWhereUniqueInput[]
    disconnect?: VoterRecordWhereUniqueInput | VoterRecordWhereUniqueInput[]
    delete?: VoterRecordWhereUniqueInput | VoterRecordWhereUniqueInput[]
    connect?: VoterRecordWhereUniqueInput | VoterRecordWhereUniqueInput[]
    update?: VoterRecordUpdateWithWhereUniqueWithoutCommitteeInput | VoterRecordUpdateWithWhereUniqueWithoutCommitteeInput[]
    updateMany?: VoterRecordUpdateManyWithWhereWithoutCommitteeInput | VoterRecordUpdateManyWithWhereWithoutCommitteeInput[]
    deleteMany?: VoterRecordScalarWhereInput | VoterRecordScalarWhereInput[]
  }

  export type CommitteeRequestUpdateManyWithoutCommitteListNestedInput = {
    create?: XOR<CommitteeRequestCreateWithoutCommitteListInput, CommitteeRequestUncheckedCreateWithoutCommitteListInput> | CommitteeRequestCreateWithoutCommitteListInput[] | CommitteeRequestUncheckedCreateWithoutCommitteListInput[]
    connectOrCreate?: CommitteeRequestCreateOrConnectWithoutCommitteListInput | CommitteeRequestCreateOrConnectWithoutCommitteListInput[]
    upsert?: CommitteeRequestUpsertWithWhereUniqueWithoutCommitteListInput | CommitteeRequestUpsertWithWhereUniqueWithoutCommitteListInput[]
    createMany?: CommitteeRequestCreateManyCommitteListInputEnvelope
    set?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    disconnect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    delete?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    connect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    update?: CommitteeRequestUpdateWithWhereUniqueWithoutCommitteListInput | CommitteeRequestUpdateWithWhereUniqueWithoutCommitteListInput[]
    updateMany?: CommitteeRequestUpdateManyWithWhereWithoutCommitteListInput | CommitteeRequestUpdateManyWithWhereWithoutCommitteListInput[]
    deleteMany?: CommitteeRequestScalarWhereInput | CommitteeRequestScalarWhereInput[]
  }

  export type CommitteeUploadDiscrepancyUpdateManyWithoutCommitteeNestedInput = {
    create?: XOR<CommitteeUploadDiscrepancyCreateWithoutCommitteeInput, CommitteeUploadDiscrepancyUncheckedCreateWithoutCommitteeInput> | CommitteeUploadDiscrepancyCreateWithoutCommitteeInput[] | CommitteeUploadDiscrepancyUncheckedCreateWithoutCommitteeInput[]
    connectOrCreate?: CommitteeUploadDiscrepancyCreateOrConnectWithoutCommitteeInput | CommitteeUploadDiscrepancyCreateOrConnectWithoutCommitteeInput[]
    upsert?: CommitteeUploadDiscrepancyUpsertWithWhereUniqueWithoutCommitteeInput | CommitteeUploadDiscrepancyUpsertWithWhereUniqueWithoutCommitteeInput[]
    createMany?: CommitteeUploadDiscrepancyCreateManyCommitteeInputEnvelope
    set?: CommitteeUploadDiscrepancyWhereUniqueInput | CommitteeUploadDiscrepancyWhereUniqueInput[]
    disconnect?: CommitteeUploadDiscrepancyWhereUniqueInput | CommitteeUploadDiscrepancyWhereUniqueInput[]
    delete?: CommitteeUploadDiscrepancyWhereUniqueInput | CommitteeUploadDiscrepancyWhereUniqueInput[]
    connect?: CommitteeUploadDiscrepancyWhereUniqueInput | CommitteeUploadDiscrepancyWhereUniqueInput[]
    update?: CommitteeUploadDiscrepancyUpdateWithWhereUniqueWithoutCommitteeInput | CommitteeUploadDiscrepancyUpdateWithWhereUniqueWithoutCommitteeInput[]
    updateMany?: CommitteeUploadDiscrepancyUpdateManyWithWhereWithoutCommitteeInput | CommitteeUploadDiscrepancyUpdateManyWithWhereWithoutCommitteeInput[]
    deleteMany?: CommitteeUploadDiscrepancyScalarWhereInput | CommitteeUploadDiscrepancyScalarWhereInput[]
  }

  export type VoterRecordUncheckedUpdateManyWithoutCommitteeNestedInput = {
    create?: XOR<VoterRecordCreateWithoutCommitteeInput, VoterRecordUncheckedCreateWithoutCommitteeInput> | VoterRecordCreateWithoutCommitteeInput[] | VoterRecordUncheckedCreateWithoutCommitteeInput[]
    connectOrCreate?: VoterRecordCreateOrConnectWithoutCommitteeInput | VoterRecordCreateOrConnectWithoutCommitteeInput[]
    upsert?: VoterRecordUpsertWithWhereUniqueWithoutCommitteeInput | VoterRecordUpsertWithWhereUniqueWithoutCommitteeInput[]
    createMany?: VoterRecordCreateManyCommitteeInputEnvelope
    set?: VoterRecordWhereUniqueInput | VoterRecordWhereUniqueInput[]
    disconnect?: VoterRecordWhereUniqueInput | VoterRecordWhereUniqueInput[]
    delete?: VoterRecordWhereUniqueInput | VoterRecordWhereUniqueInput[]
    connect?: VoterRecordWhereUniqueInput | VoterRecordWhereUniqueInput[]
    update?: VoterRecordUpdateWithWhereUniqueWithoutCommitteeInput | VoterRecordUpdateWithWhereUniqueWithoutCommitteeInput[]
    updateMany?: VoterRecordUpdateManyWithWhereWithoutCommitteeInput | VoterRecordUpdateManyWithWhereWithoutCommitteeInput[]
    deleteMany?: VoterRecordScalarWhereInput | VoterRecordScalarWhereInput[]
  }

  export type CommitteeRequestUncheckedUpdateManyWithoutCommitteListNestedInput = {
    create?: XOR<CommitteeRequestCreateWithoutCommitteListInput, CommitteeRequestUncheckedCreateWithoutCommitteListInput> | CommitteeRequestCreateWithoutCommitteListInput[] | CommitteeRequestUncheckedCreateWithoutCommitteListInput[]
    connectOrCreate?: CommitteeRequestCreateOrConnectWithoutCommitteListInput | CommitteeRequestCreateOrConnectWithoutCommitteListInput[]
    upsert?: CommitteeRequestUpsertWithWhereUniqueWithoutCommitteListInput | CommitteeRequestUpsertWithWhereUniqueWithoutCommitteListInput[]
    createMany?: CommitteeRequestCreateManyCommitteListInputEnvelope
    set?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    disconnect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    delete?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    connect?: CommitteeRequestWhereUniqueInput | CommitteeRequestWhereUniqueInput[]
    update?: CommitteeRequestUpdateWithWhereUniqueWithoutCommitteListInput | CommitteeRequestUpdateWithWhereUniqueWithoutCommitteListInput[]
    updateMany?: CommitteeRequestUpdateManyWithWhereWithoutCommitteListInput | CommitteeRequestUpdateManyWithWhereWithoutCommitteListInput[]
    deleteMany?: CommitteeRequestScalarWhereInput | CommitteeRequestScalarWhereInput[]
  }

  export type CommitteeUploadDiscrepancyUncheckedUpdateManyWithoutCommitteeNestedInput = {
    create?: XOR<CommitteeUploadDiscrepancyCreateWithoutCommitteeInput, CommitteeUploadDiscrepancyUncheckedCreateWithoutCommitteeInput> | CommitteeUploadDiscrepancyCreateWithoutCommitteeInput[] | CommitteeUploadDiscrepancyUncheckedCreateWithoutCommitteeInput[]
    connectOrCreate?: CommitteeUploadDiscrepancyCreateOrConnectWithoutCommitteeInput | CommitteeUploadDiscrepancyCreateOrConnectWithoutCommitteeInput[]
    upsert?: CommitteeUploadDiscrepancyUpsertWithWhereUniqueWithoutCommitteeInput | CommitteeUploadDiscrepancyUpsertWithWhereUniqueWithoutCommitteeInput[]
    createMany?: CommitteeUploadDiscrepancyCreateManyCommitteeInputEnvelope
    set?: CommitteeUploadDiscrepancyWhereUniqueInput | CommitteeUploadDiscrepancyWhereUniqueInput[]
    disconnect?: CommitteeUploadDiscrepancyWhereUniqueInput | CommitteeUploadDiscrepancyWhereUniqueInput[]
    delete?: CommitteeUploadDiscrepancyWhereUniqueInput | CommitteeUploadDiscrepancyWhereUniqueInput[]
    connect?: CommitteeUploadDiscrepancyWhereUniqueInput | CommitteeUploadDiscrepancyWhereUniqueInput[]
    update?: CommitteeUploadDiscrepancyUpdateWithWhereUniqueWithoutCommitteeInput | CommitteeUploadDiscrepancyUpdateWithWhereUniqueWithoutCommitteeInput[]
    updateMany?: CommitteeUploadDiscrepancyUpdateManyWithWhereWithoutCommitteeInput | CommitteeUploadDiscrepancyUpdateManyWithWhereWithoutCommitteeInput[]
    deleteMany?: CommitteeUploadDiscrepancyScalarWhereInput | CommitteeUploadDiscrepancyScalarWhereInput[]
  }

  export type CommitteeListCreateNestedOneWithoutCommitteeRequestInput = {
    create?: XOR<CommitteeListCreateWithoutCommitteeRequestInput, CommitteeListUncheckedCreateWithoutCommitteeRequestInput>
    connectOrCreate?: CommitteeListCreateOrConnectWithoutCommitteeRequestInput
    connect?: CommitteeListWhereUniqueInput
  }

  export type VoterRecordCreateNestedOneWithoutAddToCommitteeRequestInput = {
    create?: XOR<VoterRecordCreateWithoutAddToCommitteeRequestInput, VoterRecordUncheckedCreateWithoutAddToCommitteeRequestInput>
    connectOrCreate?: VoterRecordCreateOrConnectWithoutAddToCommitteeRequestInput
    connect?: VoterRecordWhereUniqueInput
  }

  export type VoterRecordCreateNestedOneWithoutRemoveFromCommitteeRequestInput = {
    create?: XOR<VoterRecordCreateWithoutRemoveFromCommitteeRequestInput, VoterRecordUncheckedCreateWithoutRemoveFromCommitteeRequestInput>
    connectOrCreate?: VoterRecordCreateOrConnectWithoutRemoveFromCommitteeRequestInput
    connect?: VoterRecordWhereUniqueInput
  }

  export type CommitteeListUpdateOneRequiredWithoutCommitteeRequestNestedInput = {
    create?: XOR<CommitteeListCreateWithoutCommitteeRequestInput, CommitteeListUncheckedCreateWithoutCommitteeRequestInput>
    connectOrCreate?: CommitteeListCreateOrConnectWithoutCommitteeRequestInput
    upsert?: CommitteeListUpsertWithoutCommitteeRequestInput
    connect?: CommitteeListWhereUniqueInput
    update?: XOR<XOR<CommitteeListUpdateToOneWithWhereWithoutCommitteeRequestInput, CommitteeListUpdateWithoutCommitteeRequestInput>, CommitteeListUncheckedUpdateWithoutCommitteeRequestInput>
  }

  export type VoterRecordUpdateOneWithoutAddToCommitteeRequestNestedInput = {
    create?: XOR<VoterRecordCreateWithoutAddToCommitteeRequestInput, VoterRecordUncheckedCreateWithoutAddToCommitteeRequestInput>
    connectOrCreate?: VoterRecordCreateOrConnectWithoutAddToCommitteeRequestInput
    upsert?: VoterRecordUpsertWithoutAddToCommitteeRequestInput
    disconnect?: VoterRecordWhereInput | boolean
    delete?: VoterRecordWhereInput | boolean
    connect?: VoterRecordWhereUniqueInput
    update?: XOR<XOR<VoterRecordUpdateToOneWithWhereWithoutAddToCommitteeRequestInput, VoterRecordUpdateWithoutAddToCommitteeRequestInput>, VoterRecordUncheckedUpdateWithoutAddToCommitteeRequestInput>
  }

  export type VoterRecordUpdateOneWithoutRemoveFromCommitteeRequestNestedInput = {
    create?: XOR<VoterRecordCreateWithoutRemoveFromCommitteeRequestInput, VoterRecordUncheckedCreateWithoutRemoveFromCommitteeRequestInput>
    connectOrCreate?: VoterRecordCreateOrConnectWithoutRemoveFromCommitteeRequestInput
    upsert?: VoterRecordUpsertWithoutRemoveFromCommitteeRequestInput
    disconnect?: VoterRecordWhereInput | boolean
    delete?: VoterRecordWhereInput | boolean
    connect?: VoterRecordWhereUniqueInput
    update?: XOR<XOR<VoterRecordUpdateToOneWithWhereWithoutRemoveFromCommitteeRequestInput, VoterRecordUpdateWithoutRemoveFromCommitteeRequestInput>, VoterRecordUncheckedUpdateWithoutRemoveFromCommitteeRequestInput>
  }

  export type DropdownListsCreatecityInput = {
    set: string[]
  }

  export type DropdownListsCreatezipCodeInput = {
    set: string[]
  }

  export type DropdownListsCreatestreetInput = {
    set: string[]
  }

  export type DropdownListsCreatecountyLegDistrictInput = {
    set: string[]
  }

  export type DropdownListsCreatestateAssmblyDistrictInput = {
    set: string[]
  }

  export type DropdownListsCreatestateSenateDistrictInput = {
    set: string[]
  }

  export type DropdownListsCreatecongressionalDistrictInput = {
    set: string[]
  }

  export type DropdownListsCreatetownCodeInput = {
    set: string[]
  }

  export type DropdownListsCreateelectionDistrictInput = {
    set: string[]
  }

  export type DropdownListsCreatepartyInput = {
    set: string[]
  }

  export type DropdownListsUpdatecityInput = {
    set?: string[]
    push?: string | string[]
  }

  export type DropdownListsUpdatezipCodeInput = {
    set?: string[]
    push?: string | string[]
  }

  export type DropdownListsUpdatestreetInput = {
    set?: string[]
    push?: string | string[]
  }

  export type DropdownListsUpdatecountyLegDistrictInput = {
    set?: string[]
    push?: string | string[]
  }

  export type DropdownListsUpdatestateAssmblyDistrictInput = {
    set?: string[]
    push?: string | string[]
  }

  export type DropdownListsUpdatestateSenateDistrictInput = {
    set?: string[]
    push?: string | string[]
  }

  export type DropdownListsUpdatecongressionalDistrictInput = {
    set?: string[]
    push?: string | string[]
  }

  export type DropdownListsUpdatetownCodeInput = {
    set?: string[]
    push?: string | string[]
  }

  export type DropdownListsUpdateelectionDistrictInput = {
    set?: string[]
    push?: string | string[]
  }

  export type DropdownListsUpdatepartyInput = {
    set?: string[]
    push?: string | string[]
  }

  export type CommitteeListCreateNestedOneWithoutCommitteeDiscrepancyRecordsInput = {
    create?: XOR<CommitteeListCreateWithoutCommitteeDiscrepancyRecordsInput, CommitteeListUncheckedCreateWithoutCommitteeDiscrepancyRecordsInput>
    connectOrCreate?: CommitteeListCreateOrConnectWithoutCommitteeDiscrepancyRecordsInput
    connect?: CommitteeListWhereUniqueInput
  }

  export type CommitteeListUpdateOneRequiredWithoutCommitteeDiscrepancyRecordsNestedInput = {
    create?: XOR<CommitteeListCreateWithoutCommitteeDiscrepancyRecordsInput, CommitteeListUncheckedCreateWithoutCommitteeDiscrepancyRecordsInput>
    connectOrCreate?: CommitteeListCreateOrConnectWithoutCommitteeDiscrepancyRecordsInput
    upsert?: CommitteeListUpsertWithoutCommitteeDiscrepancyRecordsInput
    connect?: CommitteeListWhereUniqueInput
    update?: XOR<XOR<CommitteeListUpdateToOneWithWhereWithoutCommitteeDiscrepancyRecordsInput, CommitteeListUpdateWithoutCommitteeDiscrepancyRecordsInput>, CommitteeListUncheckedUpdateWithoutCommitteeDiscrepancyRecordsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedEnumPrivilegeLevelFilter<$PrismaModel = never> = {
    equals?: $Enums.PrivilegeLevel | EnumPrivilegeLevelFieldRefInput<$PrismaModel>
    in?: $Enums.PrivilegeLevel[] | ListEnumPrivilegeLevelFieldRefInput<$PrismaModel>
    notIn?: $Enums.PrivilegeLevel[] | ListEnumPrivilegeLevelFieldRefInput<$PrismaModel>
    not?: NestedEnumPrivilegeLevelFilter<$PrismaModel> | $Enums.PrivilegeLevel
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedEnumPrivilegeLevelWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PrivilegeLevel | EnumPrivilegeLevelFieldRefInput<$PrismaModel>
    in?: $Enums.PrivilegeLevel[] | ListEnumPrivilegeLevelFieldRefInput<$PrismaModel>
    notIn?: $Enums.PrivilegeLevel[] | ListEnumPrivilegeLevelFieldRefInput<$PrismaModel>
    not?: NestedEnumPrivilegeLevelWithAggregatesFilter<$PrismaModel> | $Enums.PrivilegeLevel
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPrivilegeLevelFilter<$PrismaModel>
    _max?: NestedEnumPrivilegeLevelFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedBoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type NestedBoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type AccountCreateWithoutUserInput = {
    type: string
    provider: string
    providerAccountId: string
    refresh_token?: string | null
    access_token?: string | null
    expires_at?: number | null
    token_type?: string | null
    scope?: string | null
    id_token?: string | null
    session_state?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AccountUncheckedCreateWithoutUserInput = {
    type: string
    provider: string
    providerAccountId: string
    refresh_token?: string | null
    access_token?: string | null
    expires_at?: number | null
    token_type?: string | null
    scope?: string | null
    id_token?: string | null
    session_state?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AccountCreateOrConnectWithoutUserInput = {
    where: AccountWhereUniqueInput
    create: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput>
  }

  export type AccountCreateManyUserInputEnvelope = {
    data: AccountCreateManyUserInput | AccountCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type SessionCreateWithoutUserInput = {
    sessionToken: string
    expires: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SessionUncheckedCreateWithoutUserInput = {
    sessionToken: string
    expires: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SessionCreateOrConnectWithoutUserInput = {
    where: SessionWhereUniqueInput
    create: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput>
  }

  export type SessionCreateManyUserInputEnvelope = {
    data: SessionCreateManyUserInput | SessionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type AuthenticatorCreateWithoutUserInput = {
    credentialID: string
    providerAccountId: string
    credentialPublicKey: string
    counter: number
    credentialDeviceType: string
    credentialBackedUp: boolean
    transports?: string | null
  }

  export type AuthenticatorUncheckedCreateWithoutUserInput = {
    credentialID: string
    providerAccountId: string
    credentialPublicKey: string
    counter: number
    credentialDeviceType: string
    credentialBackedUp: boolean
    transports?: string | null
  }

  export type AuthenticatorCreateOrConnectWithoutUserInput = {
    where: AuthenticatorWhereUniqueInput
    create: XOR<AuthenticatorCreateWithoutUserInput, AuthenticatorUncheckedCreateWithoutUserInput>
  }

  export type AuthenticatorCreateManyUserInputEnvelope = {
    data: AuthenticatorCreateManyUserInput | AuthenticatorCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type AccountUpsertWithWhereUniqueWithoutUserInput = {
    where: AccountWhereUniqueInput
    update: XOR<AccountUpdateWithoutUserInput, AccountUncheckedUpdateWithoutUserInput>
    create: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput>
  }

  export type AccountUpdateWithWhereUniqueWithoutUserInput = {
    where: AccountWhereUniqueInput
    data: XOR<AccountUpdateWithoutUserInput, AccountUncheckedUpdateWithoutUserInput>
  }

  export type AccountUpdateManyWithWhereWithoutUserInput = {
    where: AccountScalarWhereInput
    data: XOR<AccountUpdateManyMutationInput, AccountUncheckedUpdateManyWithoutUserInput>
  }

  export type AccountScalarWhereInput = {
    AND?: AccountScalarWhereInput | AccountScalarWhereInput[]
    OR?: AccountScalarWhereInput[]
    NOT?: AccountScalarWhereInput | AccountScalarWhereInput[]
    userId?: StringFilter<"Account"> | string
    type?: StringFilter<"Account"> | string
    provider?: StringFilter<"Account"> | string
    providerAccountId?: StringFilter<"Account"> | string
    refresh_token?: StringNullableFilter<"Account"> | string | null
    access_token?: StringNullableFilter<"Account"> | string | null
    expires_at?: IntNullableFilter<"Account"> | number | null
    token_type?: StringNullableFilter<"Account"> | string | null
    scope?: StringNullableFilter<"Account"> | string | null
    id_token?: StringNullableFilter<"Account"> | string | null
    session_state?: StringNullableFilter<"Account"> | string | null
    createdAt?: DateTimeFilter<"Account"> | Date | string
    updatedAt?: DateTimeFilter<"Account"> | Date | string
  }

  export type SessionUpsertWithWhereUniqueWithoutUserInput = {
    where: SessionWhereUniqueInput
    update: XOR<SessionUpdateWithoutUserInput, SessionUncheckedUpdateWithoutUserInput>
    create: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput>
  }

  export type SessionUpdateWithWhereUniqueWithoutUserInput = {
    where: SessionWhereUniqueInput
    data: XOR<SessionUpdateWithoutUserInput, SessionUncheckedUpdateWithoutUserInput>
  }

  export type SessionUpdateManyWithWhereWithoutUserInput = {
    where: SessionScalarWhereInput
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyWithoutUserInput>
  }

  export type SessionScalarWhereInput = {
    AND?: SessionScalarWhereInput | SessionScalarWhereInput[]
    OR?: SessionScalarWhereInput[]
    NOT?: SessionScalarWhereInput | SessionScalarWhereInput[]
    sessionToken?: StringFilter<"Session"> | string
    userId?: StringFilter<"Session"> | string
    expires?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    updatedAt?: DateTimeFilter<"Session"> | Date | string
  }

  export type AuthenticatorUpsertWithWhereUniqueWithoutUserInput = {
    where: AuthenticatorWhereUniqueInput
    update: XOR<AuthenticatorUpdateWithoutUserInput, AuthenticatorUncheckedUpdateWithoutUserInput>
    create: XOR<AuthenticatorCreateWithoutUserInput, AuthenticatorUncheckedCreateWithoutUserInput>
  }

  export type AuthenticatorUpdateWithWhereUniqueWithoutUserInput = {
    where: AuthenticatorWhereUniqueInput
    data: XOR<AuthenticatorUpdateWithoutUserInput, AuthenticatorUncheckedUpdateWithoutUserInput>
  }

  export type AuthenticatorUpdateManyWithWhereWithoutUserInput = {
    where: AuthenticatorScalarWhereInput
    data: XOR<AuthenticatorUpdateManyMutationInput, AuthenticatorUncheckedUpdateManyWithoutUserInput>
  }

  export type AuthenticatorScalarWhereInput = {
    AND?: AuthenticatorScalarWhereInput | AuthenticatorScalarWhereInput[]
    OR?: AuthenticatorScalarWhereInput[]
    NOT?: AuthenticatorScalarWhereInput | AuthenticatorScalarWhereInput[]
    credentialID?: StringFilter<"Authenticator"> | string
    userId?: StringFilter<"Authenticator"> | string
    providerAccountId?: StringFilter<"Authenticator"> | string
    credentialPublicKey?: StringFilter<"Authenticator"> | string
    counter?: IntFilter<"Authenticator"> | number
    credentialDeviceType?: StringFilter<"Authenticator"> | string
    credentialBackedUp?: BoolFilter<"Authenticator"> | boolean
    transports?: StringNullableFilter<"Authenticator"> | string | null
  }

  export type UserCreateWithoutAccountsInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    image?: string | null
    privilegeLevel?: $Enums.PrivilegeLevel
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionCreateNestedManyWithoutUserInput
    Authenticator?: AuthenticatorCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutAccountsInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    image?: string | null
    privilegeLevel?: $Enums.PrivilegeLevel
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    Authenticator?: AuthenticatorUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutAccountsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
  }

  export type UserUpsertWithoutAccountsInput = {
    update: XOR<UserUpdateWithoutAccountsInput, UserUncheckedUpdateWithoutAccountsInput>
    create: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAccountsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAccountsInput, UserUncheckedUpdateWithoutAccountsInput>
  }

  export type UserUpdateWithoutAccountsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    privilegeLevel?: EnumPrivilegeLevelFieldUpdateOperationsInput | $Enums.PrivilegeLevel
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUpdateManyWithoutUserNestedInput
    Authenticator?: AuthenticatorUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutAccountsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    privilegeLevel?: EnumPrivilegeLevelFieldUpdateOperationsInput | $Enums.PrivilegeLevel
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    Authenticator?: AuthenticatorUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutSessionsInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    image?: string | null
    privilegeLevel?: $Enums.PrivilegeLevel
    createdAt?: Date | string
    updatedAt?: Date | string
    accounts?: AccountCreateNestedManyWithoutUserInput
    Authenticator?: AuthenticatorCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutSessionsInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    image?: string | null
    privilegeLevel?: $Enums.PrivilegeLevel
    createdAt?: Date | string
    updatedAt?: Date | string
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    Authenticator?: AuthenticatorUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutSessionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
  }

  export type UserUpsertWithoutSessionsInput = {
    update: XOR<UserUpdateWithoutSessionsInput, UserUncheckedUpdateWithoutSessionsInput>
    create: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSessionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSessionsInput, UserUncheckedUpdateWithoutSessionsInput>
  }

  export type UserUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    privilegeLevel?: EnumPrivilegeLevelFieldUpdateOperationsInput | $Enums.PrivilegeLevel
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    accounts?: AccountUpdateManyWithoutUserNestedInput
    Authenticator?: AuthenticatorUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    privilegeLevel?: EnumPrivilegeLevelFieldUpdateOperationsInput | $Enums.PrivilegeLevel
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    Authenticator?: AuthenticatorUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutAuthenticatorInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    image?: string | null
    privilegeLevel?: $Enums.PrivilegeLevel
    createdAt?: Date | string
    updatedAt?: Date | string
    accounts?: AccountCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutAuthenticatorInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    image?: string | null
    privilegeLevel?: $Enums.PrivilegeLevel
    createdAt?: Date | string
    updatedAt?: Date | string
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutAuthenticatorInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAuthenticatorInput, UserUncheckedCreateWithoutAuthenticatorInput>
  }

  export type UserUpsertWithoutAuthenticatorInput = {
    update: XOR<UserUpdateWithoutAuthenticatorInput, UserUncheckedUpdateWithoutAuthenticatorInput>
    create: XOR<UserCreateWithoutAuthenticatorInput, UserUncheckedCreateWithoutAuthenticatorInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAuthenticatorInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAuthenticatorInput, UserUncheckedUpdateWithoutAuthenticatorInput>
  }

  export type UserUpdateWithoutAuthenticatorInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    privilegeLevel?: EnumPrivilegeLevelFieldUpdateOperationsInput | $Enums.PrivilegeLevel
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    accounts?: AccountUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutAuthenticatorInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    privilegeLevel?: EnumPrivilegeLevelFieldUpdateOperationsInput | $Enums.PrivilegeLevel
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
  }

  export type VotingHistoryRecordCreateWithoutVoterRecordInput = {
    date: Date | string
    value: string
  }

  export type VotingHistoryRecordUncheckedCreateWithoutVoterRecordInput = {
    id?: number
    date: Date | string
    value: string
  }

  export type VotingHistoryRecordCreateOrConnectWithoutVoterRecordInput = {
    where: VotingHistoryRecordWhereUniqueInput
    create: XOR<VotingHistoryRecordCreateWithoutVoterRecordInput, VotingHistoryRecordUncheckedCreateWithoutVoterRecordInput>
  }

  export type VotingHistoryRecordCreateManyVoterRecordInputEnvelope = {
    data: VotingHistoryRecordCreateManyVoterRecordInput | VotingHistoryRecordCreateManyVoterRecordInput[]
    skipDuplicates?: boolean
  }

  export type CommitteeListCreateWithoutCommitteeMemberListInput = {
    cityTown: string
    legDistrict: number
    electionDistrict: number
    CommitteeRequest?: CommitteeRequestCreateNestedManyWithoutCommitteListInput
    CommitteeDiscrepancyRecords?: CommitteeUploadDiscrepancyCreateNestedManyWithoutCommitteeInput
  }

  export type CommitteeListUncheckedCreateWithoutCommitteeMemberListInput = {
    id?: number
    cityTown: string
    legDistrict: number
    electionDistrict: number
    CommitteeRequest?: CommitteeRequestUncheckedCreateNestedManyWithoutCommitteListInput
    CommitteeDiscrepancyRecords?: CommitteeUploadDiscrepancyUncheckedCreateNestedManyWithoutCommitteeInput
  }

  export type CommitteeListCreateOrConnectWithoutCommitteeMemberListInput = {
    where: CommitteeListWhereUniqueInput
    create: XOR<CommitteeListCreateWithoutCommitteeMemberListInput, CommitteeListUncheckedCreateWithoutCommitteeMemberListInput>
  }

  export type CommitteeRequestCreateWithoutAddVoterRecordInput = {
    requestNotes?: string | null
    committeList: CommitteeListCreateNestedOneWithoutCommitteeRequestInput
    removeVoterRecord?: VoterRecordCreateNestedOneWithoutRemoveFromCommitteeRequestInput
  }

  export type CommitteeRequestUncheckedCreateWithoutAddVoterRecordInput = {
    id?: number
    committeeListId: number
    removeVoterRecordId?: string | null
    requestNotes?: string | null
  }

  export type CommitteeRequestCreateOrConnectWithoutAddVoterRecordInput = {
    where: CommitteeRequestWhereUniqueInput
    create: XOR<CommitteeRequestCreateWithoutAddVoterRecordInput, CommitteeRequestUncheckedCreateWithoutAddVoterRecordInput>
  }

  export type CommitteeRequestCreateManyAddVoterRecordInputEnvelope = {
    data: CommitteeRequestCreateManyAddVoterRecordInput | CommitteeRequestCreateManyAddVoterRecordInput[]
    skipDuplicates?: boolean
  }

  export type CommitteeRequestCreateWithoutRemoveVoterRecordInput = {
    requestNotes?: string | null
    committeList: CommitteeListCreateNestedOneWithoutCommitteeRequestInput
    addVoterRecord?: VoterRecordCreateNestedOneWithoutAddToCommitteeRequestInput
  }

  export type CommitteeRequestUncheckedCreateWithoutRemoveVoterRecordInput = {
    id?: number
    committeeListId: number
    addVoterRecordId?: string | null
    requestNotes?: string | null
  }

  export type CommitteeRequestCreateOrConnectWithoutRemoveVoterRecordInput = {
    where: CommitteeRequestWhereUniqueInput
    create: XOR<CommitteeRequestCreateWithoutRemoveVoterRecordInput, CommitteeRequestUncheckedCreateWithoutRemoveVoterRecordInput>
  }

  export type CommitteeRequestCreateManyRemoveVoterRecordInputEnvelope = {
    data: CommitteeRequestCreateManyRemoveVoterRecordInput | CommitteeRequestCreateManyRemoveVoterRecordInput[]
    skipDuplicates?: boolean
  }

  export type VotingHistoryRecordUpsertWithWhereUniqueWithoutVoterRecordInput = {
    where: VotingHistoryRecordWhereUniqueInput
    update: XOR<VotingHistoryRecordUpdateWithoutVoterRecordInput, VotingHistoryRecordUncheckedUpdateWithoutVoterRecordInput>
    create: XOR<VotingHistoryRecordCreateWithoutVoterRecordInput, VotingHistoryRecordUncheckedCreateWithoutVoterRecordInput>
  }

  export type VotingHistoryRecordUpdateWithWhereUniqueWithoutVoterRecordInput = {
    where: VotingHistoryRecordWhereUniqueInput
    data: XOR<VotingHistoryRecordUpdateWithoutVoterRecordInput, VotingHistoryRecordUncheckedUpdateWithoutVoterRecordInput>
  }

  export type VotingHistoryRecordUpdateManyWithWhereWithoutVoterRecordInput = {
    where: VotingHistoryRecordScalarWhereInput
    data: XOR<VotingHistoryRecordUpdateManyMutationInput, VotingHistoryRecordUncheckedUpdateManyWithoutVoterRecordInput>
  }

  export type VotingHistoryRecordScalarWhereInput = {
    AND?: VotingHistoryRecordScalarWhereInput | VotingHistoryRecordScalarWhereInput[]
    OR?: VotingHistoryRecordScalarWhereInput[]
    NOT?: VotingHistoryRecordScalarWhereInput | VotingHistoryRecordScalarWhereInput[]
    id?: IntFilter<"VotingHistoryRecord"> | number
    voterRecordId?: StringFilter<"VotingHistoryRecord"> | string
    date?: DateTimeFilter<"VotingHistoryRecord"> | Date | string
    value?: StringFilter<"VotingHistoryRecord"> | string
  }

  export type CommitteeListUpsertWithoutCommitteeMemberListInput = {
    update: XOR<CommitteeListUpdateWithoutCommitteeMemberListInput, CommitteeListUncheckedUpdateWithoutCommitteeMemberListInput>
    create: XOR<CommitteeListCreateWithoutCommitteeMemberListInput, CommitteeListUncheckedCreateWithoutCommitteeMemberListInput>
    where?: CommitteeListWhereInput
  }

  export type CommitteeListUpdateToOneWithWhereWithoutCommitteeMemberListInput = {
    where?: CommitteeListWhereInput
    data: XOR<CommitteeListUpdateWithoutCommitteeMemberListInput, CommitteeListUncheckedUpdateWithoutCommitteeMemberListInput>
  }

  export type CommitteeListUpdateWithoutCommitteeMemberListInput = {
    cityTown?: StringFieldUpdateOperationsInput | string
    legDistrict?: IntFieldUpdateOperationsInput | number
    electionDistrict?: IntFieldUpdateOperationsInput | number
    CommitteeRequest?: CommitteeRequestUpdateManyWithoutCommitteListNestedInput
    CommitteeDiscrepancyRecords?: CommitteeUploadDiscrepancyUpdateManyWithoutCommitteeNestedInput
  }

  export type CommitteeListUncheckedUpdateWithoutCommitteeMemberListInput = {
    id?: IntFieldUpdateOperationsInput | number
    cityTown?: StringFieldUpdateOperationsInput | string
    legDistrict?: IntFieldUpdateOperationsInput | number
    electionDistrict?: IntFieldUpdateOperationsInput | number
    CommitteeRequest?: CommitteeRequestUncheckedUpdateManyWithoutCommitteListNestedInput
    CommitteeDiscrepancyRecords?: CommitteeUploadDiscrepancyUncheckedUpdateManyWithoutCommitteeNestedInput
  }

  export type CommitteeRequestUpsertWithWhereUniqueWithoutAddVoterRecordInput = {
    where: CommitteeRequestWhereUniqueInput
    update: XOR<CommitteeRequestUpdateWithoutAddVoterRecordInput, CommitteeRequestUncheckedUpdateWithoutAddVoterRecordInput>
    create: XOR<CommitteeRequestCreateWithoutAddVoterRecordInput, CommitteeRequestUncheckedCreateWithoutAddVoterRecordInput>
  }

  export type CommitteeRequestUpdateWithWhereUniqueWithoutAddVoterRecordInput = {
    where: CommitteeRequestWhereUniqueInput
    data: XOR<CommitteeRequestUpdateWithoutAddVoterRecordInput, CommitteeRequestUncheckedUpdateWithoutAddVoterRecordInput>
  }

  export type CommitteeRequestUpdateManyWithWhereWithoutAddVoterRecordInput = {
    where: CommitteeRequestScalarWhereInput
    data: XOR<CommitteeRequestUpdateManyMutationInput, CommitteeRequestUncheckedUpdateManyWithoutAddVoterRecordInput>
  }

  export type CommitteeRequestScalarWhereInput = {
    AND?: CommitteeRequestScalarWhereInput | CommitteeRequestScalarWhereInput[]
    OR?: CommitteeRequestScalarWhereInput[]
    NOT?: CommitteeRequestScalarWhereInput | CommitteeRequestScalarWhereInput[]
    id?: IntFilter<"CommitteeRequest"> | number
    committeeListId?: IntFilter<"CommitteeRequest"> | number
    addVoterRecordId?: StringNullableFilter<"CommitteeRequest"> | string | null
    removeVoterRecordId?: StringNullableFilter<"CommitteeRequest"> | string | null
    requestNotes?: StringNullableFilter<"CommitteeRequest"> | string | null
  }

  export type CommitteeRequestUpsertWithWhereUniqueWithoutRemoveVoterRecordInput = {
    where: CommitteeRequestWhereUniqueInput
    update: XOR<CommitteeRequestUpdateWithoutRemoveVoterRecordInput, CommitteeRequestUncheckedUpdateWithoutRemoveVoterRecordInput>
    create: XOR<CommitteeRequestCreateWithoutRemoveVoterRecordInput, CommitteeRequestUncheckedCreateWithoutRemoveVoterRecordInput>
  }

  export type CommitteeRequestUpdateWithWhereUniqueWithoutRemoveVoterRecordInput = {
    where: CommitteeRequestWhereUniqueInput
    data: XOR<CommitteeRequestUpdateWithoutRemoveVoterRecordInput, CommitteeRequestUncheckedUpdateWithoutRemoveVoterRecordInput>
  }

  export type CommitteeRequestUpdateManyWithWhereWithoutRemoveVoterRecordInput = {
    where: CommitteeRequestScalarWhereInput
    data: XOR<CommitteeRequestUpdateManyMutationInput, CommitteeRequestUncheckedUpdateManyWithoutRemoveVoterRecordInput>
  }

  export type VoterRecordCreateWithoutVotingRecordsInput = {
    VRCNUM: string
    addressForCommittee?: string | null
    latestRecordEntryYear: number
    latestRecordEntryNumber: number
    lastName?: string | null
    firstName?: string | null
    middleInitial?: string | null
    suffixName?: string | null
    houseNum?: number | null
    street?: string | null
    apartment?: string | null
    halfAddress?: string | null
    resAddrLine2?: string | null
    resAddrLine3?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    zipSuffix?: string | null
    telephone?: string | null
    email?: string | null
    mailingAddress1?: string | null
    mailingAddress2?: string | null
    mailingAddress3?: string | null
    mailingAddress4?: string | null
    mailingCity?: string | null
    mailingState?: string | null
    mailingZip?: string | null
    mailingZipSuffix?: string | null
    party?: string | null
    gender?: string | null
    DOB?: Date | string | null
    L_T?: string | null
    electionDistrict?: number | null
    countyLegDistrict?: string | null
    stateAssmblyDistrict?: string | null
    stateSenateDistrict?: string | null
    congressionalDistrict?: string | null
    CC_WD_Village?: string | null
    townCode?: string | null
    lastUpdate?: Date | string | null
    originalRegDate?: Date | string | null
    statevid?: string | null
    hasDiscrepancy?: boolean | null
    committee?: CommitteeListCreateNestedOneWithoutCommitteeMemberListInput
    addToCommitteeRequest?: CommitteeRequestCreateNestedManyWithoutAddVoterRecordInput
    removeFromCommitteeRequest?: CommitteeRequestCreateNestedManyWithoutRemoveVoterRecordInput
  }

  export type VoterRecordUncheckedCreateWithoutVotingRecordsInput = {
    VRCNUM: string
    committeeId?: number | null
    addressForCommittee?: string | null
    latestRecordEntryYear: number
    latestRecordEntryNumber: number
    lastName?: string | null
    firstName?: string | null
    middleInitial?: string | null
    suffixName?: string | null
    houseNum?: number | null
    street?: string | null
    apartment?: string | null
    halfAddress?: string | null
    resAddrLine2?: string | null
    resAddrLine3?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    zipSuffix?: string | null
    telephone?: string | null
    email?: string | null
    mailingAddress1?: string | null
    mailingAddress2?: string | null
    mailingAddress3?: string | null
    mailingAddress4?: string | null
    mailingCity?: string | null
    mailingState?: string | null
    mailingZip?: string | null
    mailingZipSuffix?: string | null
    party?: string | null
    gender?: string | null
    DOB?: Date | string | null
    L_T?: string | null
    electionDistrict?: number | null
    countyLegDistrict?: string | null
    stateAssmblyDistrict?: string | null
    stateSenateDistrict?: string | null
    congressionalDistrict?: string | null
    CC_WD_Village?: string | null
    townCode?: string | null
    lastUpdate?: Date | string | null
    originalRegDate?: Date | string | null
    statevid?: string | null
    hasDiscrepancy?: boolean | null
    addToCommitteeRequest?: CommitteeRequestUncheckedCreateNestedManyWithoutAddVoterRecordInput
    removeFromCommitteeRequest?: CommitteeRequestUncheckedCreateNestedManyWithoutRemoveVoterRecordInput
  }

  export type VoterRecordCreateOrConnectWithoutVotingRecordsInput = {
    where: VoterRecordWhereUniqueInput
    create: XOR<VoterRecordCreateWithoutVotingRecordsInput, VoterRecordUncheckedCreateWithoutVotingRecordsInput>
  }

  export type VoterRecordUpsertWithoutVotingRecordsInput = {
    update: XOR<VoterRecordUpdateWithoutVotingRecordsInput, VoterRecordUncheckedUpdateWithoutVotingRecordsInput>
    create: XOR<VoterRecordCreateWithoutVotingRecordsInput, VoterRecordUncheckedCreateWithoutVotingRecordsInput>
    where?: VoterRecordWhereInput
  }

  export type VoterRecordUpdateToOneWithWhereWithoutVotingRecordsInput = {
    where?: VoterRecordWhereInput
    data: XOR<VoterRecordUpdateWithoutVotingRecordsInput, VoterRecordUncheckedUpdateWithoutVotingRecordsInput>
  }

  export type VoterRecordUpdateWithoutVotingRecordsInput = {
    VRCNUM?: StringFieldUpdateOperationsInput | string
    addressForCommittee?: NullableStringFieldUpdateOperationsInput | string | null
    latestRecordEntryYear?: IntFieldUpdateOperationsInput | number
    latestRecordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
    hasDiscrepancy?: NullableBoolFieldUpdateOperationsInput | boolean | null
    committee?: CommitteeListUpdateOneWithoutCommitteeMemberListNestedInput
    addToCommitteeRequest?: CommitteeRequestUpdateManyWithoutAddVoterRecordNestedInput
    removeFromCommitteeRequest?: CommitteeRequestUpdateManyWithoutRemoveVoterRecordNestedInput
  }

  export type VoterRecordUncheckedUpdateWithoutVotingRecordsInput = {
    VRCNUM?: StringFieldUpdateOperationsInput | string
    committeeId?: NullableIntFieldUpdateOperationsInput | number | null
    addressForCommittee?: NullableStringFieldUpdateOperationsInput | string | null
    latestRecordEntryYear?: IntFieldUpdateOperationsInput | number
    latestRecordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
    hasDiscrepancy?: NullableBoolFieldUpdateOperationsInput | boolean | null
    addToCommitteeRequest?: CommitteeRequestUncheckedUpdateManyWithoutAddVoterRecordNestedInput
    removeFromCommitteeRequest?: CommitteeRequestUncheckedUpdateManyWithoutRemoveVoterRecordNestedInput
  }

  export type VoterRecordCreateWithoutCommitteeInput = {
    VRCNUM: string
    addressForCommittee?: string | null
    latestRecordEntryYear: number
    latestRecordEntryNumber: number
    lastName?: string | null
    firstName?: string | null
    middleInitial?: string | null
    suffixName?: string | null
    houseNum?: number | null
    street?: string | null
    apartment?: string | null
    halfAddress?: string | null
    resAddrLine2?: string | null
    resAddrLine3?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    zipSuffix?: string | null
    telephone?: string | null
    email?: string | null
    mailingAddress1?: string | null
    mailingAddress2?: string | null
    mailingAddress3?: string | null
    mailingAddress4?: string | null
    mailingCity?: string | null
    mailingState?: string | null
    mailingZip?: string | null
    mailingZipSuffix?: string | null
    party?: string | null
    gender?: string | null
    DOB?: Date | string | null
    L_T?: string | null
    electionDistrict?: number | null
    countyLegDistrict?: string | null
    stateAssmblyDistrict?: string | null
    stateSenateDistrict?: string | null
    congressionalDistrict?: string | null
    CC_WD_Village?: string | null
    townCode?: string | null
    lastUpdate?: Date | string | null
    originalRegDate?: Date | string | null
    statevid?: string | null
    hasDiscrepancy?: boolean | null
    votingRecords?: VotingHistoryRecordCreateNestedManyWithoutVoterRecordInput
    addToCommitteeRequest?: CommitteeRequestCreateNestedManyWithoutAddVoterRecordInput
    removeFromCommitteeRequest?: CommitteeRequestCreateNestedManyWithoutRemoveVoterRecordInput
  }

  export type VoterRecordUncheckedCreateWithoutCommitteeInput = {
    VRCNUM: string
    addressForCommittee?: string | null
    latestRecordEntryYear: number
    latestRecordEntryNumber: number
    lastName?: string | null
    firstName?: string | null
    middleInitial?: string | null
    suffixName?: string | null
    houseNum?: number | null
    street?: string | null
    apartment?: string | null
    halfAddress?: string | null
    resAddrLine2?: string | null
    resAddrLine3?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    zipSuffix?: string | null
    telephone?: string | null
    email?: string | null
    mailingAddress1?: string | null
    mailingAddress2?: string | null
    mailingAddress3?: string | null
    mailingAddress4?: string | null
    mailingCity?: string | null
    mailingState?: string | null
    mailingZip?: string | null
    mailingZipSuffix?: string | null
    party?: string | null
    gender?: string | null
    DOB?: Date | string | null
    L_T?: string | null
    electionDistrict?: number | null
    countyLegDistrict?: string | null
    stateAssmblyDistrict?: string | null
    stateSenateDistrict?: string | null
    congressionalDistrict?: string | null
    CC_WD_Village?: string | null
    townCode?: string | null
    lastUpdate?: Date | string | null
    originalRegDate?: Date | string | null
    statevid?: string | null
    hasDiscrepancy?: boolean | null
    votingRecords?: VotingHistoryRecordUncheckedCreateNestedManyWithoutVoterRecordInput
    addToCommitteeRequest?: CommitteeRequestUncheckedCreateNestedManyWithoutAddVoterRecordInput
    removeFromCommitteeRequest?: CommitteeRequestUncheckedCreateNestedManyWithoutRemoveVoterRecordInput
  }

  export type VoterRecordCreateOrConnectWithoutCommitteeInput = {
    where: VoterRecordWhereUniqueInput
    create: XOR<VoterRecordCreateWithoutCommitteeInput, VoterRecordUncheckedCreateWithoutCommitteeInput>
  }

  export type VoterRecordCreateManyCommitteeInputEnvelope = {
    data: VoterRecordCreateManyCommitteeInput | VoterRecordCreateManyCommitteeInput[]
    skipDuplicates?: boolean
  }

  export type CommitteeRequestCreateWithoutCommitteListInput = {
    requestNotes?: string | null
    addVoterRecord?: VoterRecordCreateNestedOneWithoutAddToCommitteeRequestInput
    removeVoterRecord?: VoterRecordCreateNestedOneWithoutRemoveFromCommitteeRequestInput
  }

  export type CommitteeRequestUncheckedCreateWithoutCommitteListInput = {
    id?: number
    addVoterRecordId?: string | null
    removeVoterRecordId?: string | null
    requestNotes?: string | null
  }

  export type CommitteeRequestCreateOrConnectWithoutCommitteListInput = {
    where: CommitteeRequestWhereUniqueInput
    create: XOR<CommitteeRequestCreateWithoutCommitteListInput, CommitteeRequestUncheckedCreateWithoutCommitteListInput>
  }

  export type CommitteeRequestCreateManyCommitteListInputEnvelope = {
    data: CommitteeRequestCreateManyCommitteListInput | CommitteeRequestCreateManyCommitteListInput[]
    skipDuplicates?: boolean
  }

  export type CommitteeUploadDiscrepancyCreateWithoutCommitteeInput = {
    id?: string
    VRCNUM: string
    discrepancy: JsonNullValueInput | InputJsonValue
  }

  export type CommitteeUploadDiscrepancyUncheckedCreateWithoutCommitteeInput = {
    id?: string
    VRCNUM: string
    discrepancy: JsonNullValueInput | InputJsonValue
  }

  export type CommitteeUploadDiscrepancyCreateOrConnectWithoutCommitteeInput = {
    where: CommitteeUploadDiscrepancyWhereUniqueInput
    create: XOR<CommitteeUploadDiscrepancyCreateWithoutCommitteeInput, CommitteeUploadDiscrepancyUncheckedCreateWithoutCommitteeInput>
  }

  export type CommitteeUploadDiscrepancyCreateManyCommitteeInputEnvelope = {
    data: CommitteeUploadDiscrepancyCreateManyCommitteeInput | CommitteeUploadDiscrepancyCreateManyCommitteeInput[]
    skipDuplicates?: boolean
  }

  export type VoterRecordUpsertWithWhereUniqueWithoutCommitteeInput = {
    where: VoterRecordWhereUniqueInput
    update: XOR<VoterRecordUpdateWithoutCommitteeInput, VoterRecordUncheckedUpdateWithoutCommitteeInput>
    create: XOR<VoterRecordCreateWithoutCommitteeInput, VoterRecordUncheckedCreateWithoutCommitteeInput>
  }

  export type VoterRecordUpdateWithWhereUniqueWithoutCommitteeInput = {
    where: VoterRecordWhereUniqueInput
    data: XOR<VoterRecordUpdateWithoutCommitteeInput, VoterRecordUncheckedUpdateWithoutCommitteeInput>
  }

  export type VoterRecordUpdateManyWithWhereWithoutCommitteeInput = {
    where: VoterRecordScalarWhereInput
    data: XOR<VoterRecordUpdateManyMutationInput, VoterRecordUncheckedUpdateManyWithoutCommitteeInput>
  }

  export type VoterRecordScalarWhereInput = {
    AND?: VoterRecordScalarWhereInput | VoterRecordScalarWhereInput[]
    OR?: VoterRecordScalarWhereInput[]
    NOT?: VoterRecordScalarWhereInput | VoterRecordScalarWhereInput[]
    VRCNUM?: StringFilter<"VoterRecord"> | string
    committeeId?: IntNullableFilter<"VoterRecord"> | number | null
    addressForCommittee?: StringNullableFilter<"VoterRecord"> | string | null
    latestRecordEntryYear?: IntFilter<"VoterRecord"> | number
    latestRecordEntryNumber?: IntFilter<"VoterRecord"> | number
    lastName?: StringNullableFilter<"VoterRecord"> | string | null
    firstName?: StringNullableFilter<"VoterRecord"> | string | null
    middleInitial?: StringNullableFilter<"VoterRecord"> | string | null
    suffixName?: StringNullableFilter<"VoterRecord"> | string | null
    houseNum?: IntNullableFilter<"VoterRecord"> | number | null
    street?: StringNullableFilter<"VoterRecord"> | string | null
    apartment?: StringNullableFilter<"VoterRecord"> | string | null
    halfAddress?: StringNullableFilter<"VoterRecord"> | string | null
    resAddrLine2?: StringNullableFilter<"VoterRecord"> | string | null
    resAddrLine3?: StringNullableFilter<"VoterRecord"> | string | null
    city?: StringNullableFilter<"VoterRecord"> | string | null
    state?: StringNullableFilter<"VoterRecord"> | string | null
    zipCode?: StringNullableFilter<"VoterRecord"> | string | null
    zipSuffix?: StringNullableFilter<"VoterRecord"> | string | null
    telephone?: StringNullableFilter<"VoterRecord"> | string | null
    email?: StringNullableFilter<"VoterRecord"> | string | null
    mailingAddress1?: StringNullableFilter<"VoterRecord"> | string | null
    mailingAddress2?: StringNullableFilter<"VoterRecord"> | string | null
    mailingAddress3?: StringNullableFilter<"VoterRecord"> | string | null
    mailingAddress4?: StringNullableFilter<"VoterRecord"> | string | null
    mailingCity?: StringNullableFilter<"VoterRecord"> | string | null
    mailingState?: StringNullableFilter<"VoterRecord"> | string | null
    mailingZip?: StringNullableFilter<"VoterRecord"> | string | null
    mailingZipSuffix?: StringNullableFilter<"VoterRecord"> | string | null
    party?: StringNullableFilter<"VoterRecord"> | string | null
    gender?: StringNullableFilter<"VoterRecord"> | string | null
    DOB?: DateTimeNullableFilter<"VoterRecord"> | Date | string | null
    L_T?: StringNullableFilter<"VoterRecord"> | string | null
    electionDistrict?: IntNullableFilter<"VoterRecord"> | number | null
    countyLegDistrict?: StringNullableFilter<"VoterRecord"> | string | null
    stateAssmblyDistrict?: StringNullableFilter<"VoterRecord"> | string | null
    stateSenateDistrict?: StringNullableFilter<"VoterRecord"> | string | null
    congressionalDistrict?: StringNullableFilter<"VoterRecord"> | string | null
    CC_WD_Village?: StringNullableFilter<"VoterRecord"> | string | null
    townCode?: StringNullableFilter<"VoterRecord"> | string | null
    lastUpdate?: DateTimeNullableFilter<"VoterRecord"> | Date | string | null
    originalRegDate?: DateTimeNullableFilter<"VoterRecord"> | Date | string | null
    statevid?: StringNullableFilter<"VoterRecord"> | string | null
    hasDiscrepancy?: BoolNullableFilter<"VoterRecord"> | boolean | null
  }

  export type CommitteeRequestUpsertWithWhereUniqueWithoutCommitteListInput = {
    where: CommitteeRequestWhereUniqueInput
    update: XOR<CommitteeRequestUpdateWithoutCommitteListInput, CommitteeRequestUncheckedUpdateWithoutCommitteListInput>
    create: XOR<CommitteeRequestCreateWithoutCommitteListInput, CommitteeRequestUncheckedCreateWithoutCommitteListInput>
  }

  export type CommitteeRequestUpdateWithWhereUniqueWithoutCommitteListInput = {
    where: CommitteeRequestWhereUniqueInput
    data: XOR<CommitteeRequestUpdateWithoutCommitteListInput, CommitteeRequestUncheckedUpdateWithoutCommitteListInput>
  }

  export type CommitteeRequestUpdateManyWithWhereWithoutCommitteListInput = {
    where: CommitteeRequestScalarWhereInput
    data: XOR<CommitteeRequestUpdateManyMutationInput, CommitteeRequestUncheckedUpdateManyWithoutCommitteListInput>
  }

  export type CommitteeUploadDiscrepancyUpsertWithWhereUniqueWithoutCommitteeInput = {
    where: CommitteeUploadDiscrepancyWhereUniqueInput
    update: XOR<CommitteeUploadDiscrepancyUpdateWithoutCommitteeInput, CommitteeUploadDiscrepancyUncheckedUpdateWithoutCommitteeInput>
    create: XOR<CommitteeUploadDiscrepancyCreateWithoutCommitteeInput, CommitteeUploadDiscrepancyUncheckedCreateWithoutCommitteeInput>
  }

  export type CommitteeUploadDiscrepancyUpdateWithWhereUniqueWithoutCommitteeInput = {
    where: CommitteeUploadDiscrepancyWhereUniqueInput
    data: XOR<CommitteeUploadDiscrepancyUpdateWithoutCommitteeInput, CommitteeUploadDiscrepancyUncheckedUpdateWithoutCommitteeInput>
  }

  export type CommitteeUploadDiscrepancyUpdateManyWithWhereWithoutCommitteeInput = {
    where: CommitteeUploadDiscrepancyScalarWhereInput
    data: XOR<CommitteeUploadDiscrepancyUpdateManyMutationInput, CommitteeUploadDiscrepancyUncheckedUpdateManyWithoutCommitteeInput>
  }

  export type CommitteeUploadDiscrepancyScalarWhereInput = {
    AND?: CommitteeUploadDiscrepancyScalarWhereInput | CommitteeUploadDiscrepancyScalarWhereInput[]
    OR?: CommitteeUploadDiscrepancyScalarWhereInput[]
    NOT?: CommitteeUploadDiscrepancyScalarWhereInput | CommitteeUploadDiscrepancyScalarWhereInput[]
    id?: StringFilter<"CommitteeUploadDiscrepancy"> | string
    VRCNUM?: StringFilter<"CommitteeUploadDiscrepancy"> | string
    committeeId?: IntFilter<"CommitteeUploadDiscrepancy"> | number
    discrepancy?: JsonFilter<"CommitteeUploadDiscrepancy">
  }

  export type CommitteeListCreateWithoutCommitteeRequestInput = {
    cityTown: string
    legDistrict: number
    electionDistrict: number
    committeeMemberList?: VoterRecordCreateNestedManyWithoutCommitteeInput
    CommitteeDiscrepancyRecords?: CommitteeUploadDiscrepancyCreateNestedManyWithoutCommitteeInput
  }

  export type CommitteeListUncheckedCreateWithoutCommitteeRequestInput = {
    id?: number
    cityTown: string
    legDistrict: number
    electionDistrict: number
    committeeMemberList?: VoterRecordUncheckedCreateNestedManyWithoutCommitteeInput
    CommitteeDiscrepancyRecords?: CommitteeUploadDiscrepancyUncheckedCreateNestedManyWithoutCommitteeInput
  }

  export type CommitteeListCreateOrConnectWithoutCommitteeRequestInput = {
    where: CommitteeListWhereUniqueInput
    create: XOR<CommitteeListCreateWithoutCommitteeRequestInput, CommitteeListUncheckedCreateWithoutCommitteeRequestInput>
  }

  export type VoterRecordCreateWithoutAddToCommitteeRequestInput = {
    VRCNUM: string
    addressForCommittee?: string | null
    latestRecordEntryYear: number
    latestRecordEntryNumber: number
    lastName?: string | null
    firstName?: string | null
    middleInitial?: string | null
    suffixName?: string | null
    houseNum?: number | null
    street?: string | null
    apartment?: string | null
    halfAddress?: string | null
    resAddrLine2?: string | null
    resAddrLine3?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    zipSuffix?: string | null
    telephone?: string | null
    email?: string | null
    mailingAddress1?: string | null
    mailingAddress2?: string | null
    mailingAddress3?: string | null
    mailingAddress4?: string | null
    mailingCity?: string | null
    mailingState?: string | null
    mailingZip?: string | null
    mailingZipSuffix?: string | null
    party?: string | null
    gender?: string | null
    DOB?: Date | string | null
    L_T?: string | null
    electionDistrict?: number | null
    countyLegDistrict?: string | null
    stateAssmblyDistrict?: string | null
    stateSenateDistrict?: string | null
    congressionalDistrict?: string | null
    CC_WD_Village?: string | null
    townCode?: string | null
    lastUpdate?: Date | string | null
    originalRegDate?: Date | string | null
    statevid?: string | null
    hasDiscrepancy?: boolean | null
    votingRecords?: VotingHistoryRecordCreateNestedManyWithoutVoterRecordInput
    committee?: CommitteeListCreateNestedOneWithoutCommitteeMemberListInput
    removeFromCommitteeRequest?: CommitteeRequestCreateNestedManyWithoutRemoveVoterRecordInput
  }

  export type VoterRecordUncheckedCreateWithoutAddToCommitteeRequestInput = {
    VRCNUM: string
    committeeId?: number | null
    addressForCommittee?: string | null
    latestRecordEntryYear: number
    latestRecordEntryNumber: number
    lastName?: string | null
    firstName?: string | null
    middleInitial?: string | null
    suffixName?: string | null
    houseNum?: number | null
    street?: string | null
    apartment?: string | null
    halfAddress?: string | null
    resAddrLine2?: string | null
    resAddrLine3?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    zipSuffix?: string | null
    telephone?: string | null
    email?: string | null
    mailingAddress1?: string | null
    mailingAddress2?: string | null
    mailingAddress3?: string | null
    mailingAddress4?: string | null
    mailingCity?: string | null
    mailingState?: string | null
    mailingZip?: string | null
    mailingZipSuffix?: string | null
    party?: string | null
    gender?: string | null
    DOB?: Date | string | null
    L_T?: string | null
    electionDistrict?: number | null
    countyLegDistrict?: string | null
    stateAssmblyDistrict?: string | null
    stateSenateDistrict?: string | null
    congressionalDistrict?: string | null
    CC_WD_Village?: string | null
    townCode?: string | null
    lastUpdate?: Date | string | null
    originalRegDate?: Date | string | null
    statevid?: string | null
    hasDiscrepancy?: boolean | null
    votingRecords?: VotingHistoryRecordUncheckedCreateNestedManyWithoutVoterRecordInput
    removeFromCommitteeRequest?: CommitteeRequestUncheckedCreateNestedManyWithoutRemoveVoterRecordInput
  }

  export type VoterRecordCreateOrConnectWithoutAddToCommitteeRequestInput = {
    where: VoterRecordWhereUniqueInput
    create: XOR<VoterRecordCreateWithoutAddToCommitteeRequestInput, VoterRecordUncheckedCreateWithoutAddToCommitteeRequestInput>
  }

  export type VoterRecordCreateWithoutRemoveFromCommitteeRequestInput = {
    VRCNUM: string
    addressForCommittee?: string | null
    latestRecordEntryYear: number
    latestRecordEntryNumber: number
    lastName?: string | null
    firstName?: string | null
    middleInitial?: string | null
    suffixName?: string | null
    houseNum?: number | null
    street?: string | null
    apartment?: string | null
    halfAddress?: string | null
    resAddrLine2?: string | null
    resAddrLine3?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    zipSuffix?: string | null
    telephone?: string | null
    email?: string | null
    mailingAddress1?: string | null
    mailingAddress2?: string | null
    mailingAddress3?: string | null
    mailingAddress4?: string | null
    mailingCity?: string | null
    mailingState?: string | null
    mailingZip?: string | null
    mailingZipSuffix?: string | null
    party?: string | null
    gender?: string | null
    DOB?: Date | string | null
    L_T?: string | null
    electionDistrict?: number | null
    countyLegDistrict?: string | null
    stateAssmblyDistrict?: string | null
    stateSenateDistrict?: string | null
    congressionalDistrict?: string | null
    CC_WD_Village?: string | null
    townCode?: string | null
    lastUpdate?: Date | string | null
    originalRegDate?: Date | string | null
    statevid?: string | null
    hasDiscrepancy?: boolean | null
    votingRecords?: VotingHistoryRecordCreateNestedManyWithoutVoterRecordInput
    committee?: CommitteeListCreateNestedOneWithoutCommitteeMemberListInput
    addToCommitteeRequest?: CommitteeRequestCreateNestedManyWithoutAddVoterRecordInput
  }

  export type VoterRecordUncheckedCreateWithoutRemoveFromCommitteeRequestInput = {
    VRCNUM: string
    committeeId?: number | null
    addressForCommittee?: string | null
    latestRecordEntryYear: number
    latestRecordEntryNumber: number
    lastName?: string | null
    firstName?: string | null
    middleInitial?: string | null
    suffixName?: string | null
    houseNum?: number | null
    street?: string | null
    apartment?: string | null
    halfAddress?: string | null
    resAddrLine2?: string | null
    resAddrLine3?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    zipSuffix?: string | null
    telephone?: string | null
    email?: string | null
    mailingAddress1?: string | null
    mailingAddress2?: string | null
    mailingAddress3?: string | null
    mailingAddress4?: string | null
    mailingCity?: string | null
    mailingState?: string | null
    mailingZip?: string | null
    mailingZipSuffix?: string | null
    party?: string | null
    gender?: string | null
    DOB?: Date | string | null
    L_T?: string | null
    electionDistrict?: number | null
    countyLegDistrict?: string | null
    stateAssmblyDistrict?: string | null
    stateSenateDistrict?: string | null
    congressionalDistrict?: string | null
    CC_WD_Village?: string | null
    townCode?: string | null
    lastUpdate?: Date | string | null
    originalRegDate?: Date | string | null
    statevid?: string | null
    hasDiscrepancy?: boolean | null
    votingRecords?: VotingHistoryRecordUncheckedCreateNestedManyWithoutVoterRecordInput
    addToCommitteeRequest?: CommitteeRequestUncheckedCreateNestedManyWithoutAddVoterRecordInput
  }

  export type VoterRecordCreateOrConnectWithoutRemoveFromCommitteeRequestInput = {
    where: VoterRecordWhereUniqueInput
    create: XOR<VoterRecordCreateWithoutRemoveFromCommitteeRequestInput, VoterRecordUncheckedCreateWithoutRemoveFromCommitteeRequestInput>
  }

  export type CommitteeListUpsertWithoutCommitteeRequestInput = {
    update: XOR<CommitteeListUpdateWithoutCommitteeRequestInput, CommitteeListUncheckedUpdateWithoutCommitteeRequestInput>
    create: XOR<CommitteeListCreateWithoutCommitteeRequestInput, CommitteeListUncheckedCreateWithoutCommitteeRequestInput>
    where?: CommitteeListWhereInput
  }

  export type CommitteeListUpdateToOneWithWhereWithoutCommitteeRequestInput = {
    where?: CommitteeListWhereInput
    data: XOR<CommitteeListUpdateWithoutCommitteeRequestInput, CommitteeListUncheckedUpdateWithoutCommitteeRequestInput>
  }

  export type CommitteeListUpdateWithoutCommitteeRequestInput = {
    cityTown?: StringFieldUpdateOperationsInput | string
    legDistrict?: IntFieldUpdateOperationsInput | number
    electionDistrict?: IntFieldUpdateOperationsInput | number
    committeeMemberList?: VoterRecordUpdateManyWithoutCommitteeNestedInput
    CommitteeDiscrepancyRecords?: CommitteeUploadDiscrepancyUpdateManyWithoutCommitteeNestedInput
  }

  export type CommitteeListUncheckedUpdateWithoutCommitteeRequestInput = {
    id?: IntFieldUpdateOperationsInput | number
    cityTown?: StringFieldUpdateOperationsInput | string
    legDistrict?: IntFieldUpdateOperationsInput | number
    electionDistrict?: IntFieldUpdateOperationsInput | number
    committeeMemberList?: VoterRecordUncheckedUpdateManyWithoutCommitteeNestedInput
    CommitteeDiscrepancyRecords?: CommitteeUploadDiscrepancyUncheckedUpdateManyWithoutCommitteeNestedInput
  }

  export type VoterRecordUpsertWithoutAddToCommitteeRequestInput = {
    update: XOR<VoterRecordUpdateWithoutAddToCommitteeRequestInput, VoterRecordUncheckedUpdateWithoutAddToCommitteeRequestInput>
    create: XOR<VoterRecordCreateWithoutAddToCommitteeRequestInput, VoterRecordUncheckedCreateWithoutAddToCommitteeRequestInput>
    where?: VoterRecordWhereInput
  }

  export type VoterRecordUpdateToOneWithWhereWithoutAddToCommitteeRequestInput = {
    where?: VoterRecordWhereInput
    data: XOR<VoterRecordUpdateWithoutAddToCommitteeRequestInput, VoterRecordUncheckedUpdateWithoutAddToCommitteeRequestInput>
  }

  export type VoterRecordUpdateWithoutAddToCommitteeRequestInput = {
    VRCNUM?: StringFieldUpdateOperationsInput | string
    addressForCommittee?: NullableStringFieldUpdateOperationsInput | string | null
    latestRecordEntryYear?: IntFieldUpdateOperationsInput | number
    latestRecordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
    hasDiscrepancy?: NullableBoolFieldUpdateOperationsInput | boolean | null
    votingRecords?: VotingHistoryRecordUpdateManyWithoutVoterRecordNestedInput
    committee?: CommitteeListUpdateOneWithoutCommitteeMemberListNestedInput
    removeFromCommitteeRequest?: CommitteeRequestUpdateManyWithoutRemoveVoterRecordNestedInput
  }

  export type VoterRecordUncheckedUpdateWithoutAddToCommitteeRequestInput = {
    VRCNUM?: StringFieldUpdateOperationsInput | string
    committeeId?: NullableIntFieldUpdateOperationsInput | number | null
    addressForCommittee?: NullableStringFieldUpdateOperationsInput | string | null
    latestRecordEntryYear?: IntFieldUpdateOperationsInput | number
    latestRecordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
    hasDiscrepancy?: NullableBoolFieldUpdateOperationsInput | boolean | null
    votingRecords?: VotingHistoryRecordUncheckedUpdateManyWithoutVoterRecordNestedInput
    removeFromCommitteeRequest?: CommitteeRequestUncheckedUpdateManyWithoutRemoveVoterRecordNestedInput
  }

  export type VoterRecordUpsertWithoutRemoveFromCommitteeRequestInput = {
    update: XOR<VoterRecordUpdateWithoutRemoveFromCommitteeRequestInput, VoterRecordUncheckedUpdateWithoutRemoveFromCommitteeRequestInput>
    create: XOR<VoterRecordCreateWithoutRemoveFromCommitteeRequestInput, VoterRecordUncheckedCreateWithoutRemoveFromCommitteeRequestInput>
    where?: VoterRecordWhereInput
  }

  export type VoterRecordUpdateToOneWithWhereWithoutRemoveFromCommitteeRequestInput = {
    where?: VoterRecordWhereInput
    data: XOR<VoterRecordUpdateWithoutRemoveFromCommitteeRequestInput, VoterRecordUncheckedUpdateWithoutRemoveFromCommitteeRequestInput>
  }

  export type VoterRecordUpdateWithoutRemoveFromCommitteeRequestInput = {
    VRCNUM?: StringFieldUpdateOperationsInput | string
    addressForCommittee?: NullableStringFieldUpdateOperationsInput | string | null
    latestRecordEntryYear?: IntFieldUpdateOperationsInput | number
    latestRecordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
    hasDiscrepancy?: NullableBoolFieldUpdateOperationsInput | boolean | null
    votingRecords?: VotingHistoryRecordUpdateManyWithoutVoterRecordNestedInput
    committee?: CommitteeListUpdateOneWithoutCommitteeMemberListNestedInput
    addToCommitteeRequest?: CommitteeRequestUpdateManyWithoutAddVoterRecordNestedInput
  }

  export type VoterRecordUncheckedUpdateWithoutRemoveFromCommitteeRequestInput = {
    VRCNUM?: StringFieldUpdateOperationsInput | string
    committeeId?: NullableIntFieldUpdateOperationsInput | number | null
    addressForCommittee?: NullableStringFieldUpdateOperationsInput | string | null
    latestRecordEntryYear?: IntFieldUpdateOperationsInput | number
    latestRecordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
    hasDiscrepancy?: NullableBoolFieldUpdateOperationsInput | boolean | null
    votingRecords?: VotingHistoryRecordUncheckedUpdateManyWithoutVoterRecordNestedInput
    addToCommitteeRequest?: CommitteeRequestUncheckedUpdateManyWithoutAddVoterRecordNestedInput
  }

  export type CommitteeListCreateWithoutCommitteeDiscrepancyRecordsInput = {
    cityTown: string
    legDistrict: number
    electionDistrict: number
    committeeMemberList?: VoterRecordCreateNestedManyWithoutCommitteeInput
    CommitteeRequest?: CommitteeRequestCreateNestedManyWithoutCommitteListInput
  }

  export type CommitteeListUncheckedCreateWithoutCommitteeDiscrepancyRecordsInput = {
    id?: number
    cityTown: string
    legDistrict: number
    electionDistrict: number
    committeeMemberList?: VoterRecordUncheckedCreateNestedManyWithoutCommitteeInput
    CommitteeRequest?: CommitteeRequestUncheckedCreateNestedManyWithoutCommitteListInput
  }

  export type CommitteeListCreateOrConnectWithoutCommitteeDiscrepancyRecordsInput = {
    where: CommitteeListWhereUniqueInput
    create: XOR<CommitteeListCreateWithoutCommitteeDiscrepancyRecordsInput, CommitteeListUncheckedCreateWithoutCommitteeDiscrepancyRecordsInput>
  }

  export type CommitteeListUpsertWithoutCommitteeDiscrepancyRecordsInput = {
    update: XOR<CommitteeListUpdateWithoutCommitteeDiscrepancyRecordsInput, CommitteeListUncheckedUpdateWithoutCommitteeDiscrepancyRecordsInput>
    create: XOR<CommitteeListCreateWithoutCommitteeDiscrepancyRecordsInput, CommitteeListUncheckedCreateWithoutCommitteeDiscrepancyRecordsInput>
    where?: CommitteeListWhereInput
  }

  export type CommitteeListUpdateToOneWithWhereWithoutCommitteeDiscrepancyRecordsInput = {
    where?: CommitteeListWhereInput
    data: XOR<CommitteeListUpdateWithoutCommitteeDiscrepancyRecordsInput, CommitteeListUncheckedUpdateWithoutCommitteeDiscrepancyRecordsInput>
  }

  export type CommitteeListUpdateWithoutCommitteeDiscrepancyRecordsInput = {
    cityTown?: StringFieldUpdateOperationsInput | string
    legDistrict?: IntFieldUpdateOperationsInput | number
    electionDistrict?: IntFieldUpdateOperationsInput | number
    committeeMemberList?: VoterRecordUpdateManyWithoutCommitteeNestedInput
    CommitteeRequest?: CommitteeRequestUpdateManyWithoutCommitteListNestedInput
  }

  export type CommitteeListUncheckedUpdateWithoutCommitteeDiscrepancyRecordsInput = {
    id?: IntFieldUpdateOperationsInput | number
    cityTown?: StringFieldUpdateOperationsInput | string
    legDistrict?: IntFieldUpdateOperationsInput | number
    electionDistrict?: IntFieldUpdateOperationsInput | number
    committeeMemberList?: VoterRecordUncheckedUpdateManyWithoutCommitteeNestedInput
    CommitteeRequest?: CommitteeRequestUncheckedUpdateManyWithoutCommitteListNestedInput
  }

  export type AccountCreateManyUserInput = {
    type: string
    provider: string
    providerAccountId: string
    refresh_token?: string | null
    access_token?: string | null
    expires_at?: number | null
    token_type?: string | null
    scope?: string | null
    id_token?: string | null
    session_state?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SessionCreateManyUserInput = {
    sessionToken: string
    expires: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AuthenticatorCreateManyUserInput = {
    credentialID: string
    providerAccountId: string
    credentialPublicKey: string
    counter: number
    credentialDeviceType: string
    credentialBackedUp: boolean
    transports?: string | null
  }

  export type AccountUpdateWithoutUserInput = {
    type?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    access_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableIntFieldUpdateOperationsInput | number | null
    token_type?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    id_token?: NullableStringFieldUpdateOperationsInput | string | null
    session_state?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AccountUncheckedUpdateWithoutUserInput = {
    type?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    access_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableIntFieldUpdateOperationsInput | number | null
    token_type?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    id_token?: NullableStringFieldUpdateOperationsInput | string | null
    session_state?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AccountUncheckedUpdateManyWithoutUserInput = {
    type?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    access_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableIntFieldUpdateOperationsInput | number | null
    token_type?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    id_token?: NullableStringFieldUpdateOperationsInput | string | null
    session_state?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUpdateWithoutUserInput = {
    sessionToken?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateWithoutUserInput = {
    sessionToken?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateManyWithoutUserInput = {
    sessionToken?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuthenticatorUpdateWithoutUserInput = {
    credentialID?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    credentialPublicKey?: StringFieldUpdateOperationsInput | string
    counter?: IntFieldUpdateOperationsInput | number
    credentialDeviceType?: StringFieldUpdateOperationsInput | string
    credentialBackedUp?: BoolFieldUpdateOperationsInput | boolean
    transports?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AuthenticatorUncheckedUpdateWithoutUserInput = {
    credentialID?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    credentialPublicKey?: StringFieldUpdateOperationsInput | string
    counter?: IntFieldUpdateOperationsInput | number
    credentialDeviceType?: StringFieldUpdateOperationsInput | string
    credentialBackedUp?: BoolFieldUpdateOperationsInput | boolean
    transports?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AuthenticatorUncheckedUpdateManyWithoutUserInput = {
    credentialID?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    credentialPublicKey?: StringFieldUpdateOperationsInput | string
    counter?: IntFieldUpdateOperationsInput | number
    credentialDeviceType?: StringFieldUpdateOperationsInput | string
    credentialBackedUp?: BoolFieldUpdateOperationsInput | boolean
    transports?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type VotingHistoryRecordCreateManyVoterRecordInput = {
    id?: number
    date: Date | string
    value: string
  }

  export type CommitteeRequestCreateManyAddVoterRecordInput = {
    id?: number
    committeeListId: number
    removeVoterRecordId?: string | null
    requestNotes?: string | null
  }

  export type CommitteeRequestCreateManyRemoveVoterRecordInput = {
    id?: number
    committeeListId: number
    addVoterRecordId?: string | null
    requestNotes?: string | null
  }

  export type VotingHistoryRecordUpdateWithoutVoterRecordInput = {
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    value?: StringFieldUpdateOperationsInput | string
  }

  export type VotingHistoryRecordUncheckedUpdateWithoutVoterRecordInput = {
    id?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    value?: StringFieldUpdateOperationsInput | string
  }

  export type VotingHistoryRecordUncheckedUpdateManyWithoutVoterRecordInput = {
    id?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    value?: StringFieldUpdateOperationsInput | string
  }

  export type CommitteeRequestUpdateWithoutAddVoterRecordInput = {
    requestNotes?: NullableStringFieldUpdateOperationsInput | string | null
    committeList?: CommitteeListUpdateOneRequiredWithoutCommitteeRequestNestedInput
    removeVoterRecord?: VoterRecordUpdateOneWithoutRemoveFromCommitteeRequestNestedInput
  }

  export type CommitteeRequestUncheckedUpdateWithoutAddVoterRecordInput = {
    id?: IntFieldUpdateOperationsInput | number
    committeeListId?: IntFieldUpdateOperationsInput | number
    removeVoterRecordId?: NullableStringFieldUpdateOperationsInput | string | null
    requestNotes?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type CommitteeRequestUncheckedUpdateManyWithoutAddVoterRecordInput = {
    id?: IntFieldUpdateOperationsInput | number
    committeeListId?: IntFieldUpdateOperationsInput | number
    removeVoterRecordId?: NullableStringFieldUpdateOperationsInput | string | null
    requestNotes?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type CommitteeRequestUpdateWithoutRemoveVoterRecordInput = {
    requestNotes?: NullableStringFieldUpdateOperationsInput | string | null
    committeList?: CommitteeListUpdateOneRequiredWithoutCommitteeRequestNestedInput
    addVoterRecord?: VoterRecordUpdateOneWithoutAddToCommitteeRequestNestedInput
  }

  export type CommitteeRequestUncheckedUpdateWithoutRemoveVoterRecordInput = {
    id?: IntFieldUpdateOperationsInput | number
    committeeListId?: IntFieldUpdateOperationsInput | number
    addVoterRecordId?: NullableStringFieldUpdateOperationsInput | string | null
    requestNotes?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type CommitteeRequestUncheckedUpdateManyWithoutRemoveVoterRecordInput = {
    id?: IntFieldUpdateOperationsInput | number
    committeeListId?: IntFieldUpdateOperationsInput | number
    addVoterRecordId?: NullableStringFieldUpdateOperationsInput | string | null
    requestNotes?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type VoterRecordCreateManyCommitteeInput = {
    VRCNUM: string
    addressForCommittee?: string | null
    latestRecordEntryYear: number
    latestRecordEntryNumber: number
    lastName?: string | null
    firstName?: string | null
    middleInitial?: string | null
    suffixName?: string | null
    houseNum?: number | null
    street?: string | null
    apartment?: string | null
    halfAddress?: string | null
    resAddrLine2?: string | null
    resAddrLine3?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    zipSuffix?: string | null
    telephone?: string | null
    email?: string | null
    mailingAddress1?: string | null
    mailingAddress2?: string | null
    mailingAddress3?: string | null
    mailingAddress4?: string | null
    mailingCity?: string | null
    mailingState?: string | null
    mailingZip?: string | null
    mailingZipSuffix?: string | null
    party?: string | null
    gender?: string | null
    DOB?: Date | string | null
    L_T?: string | null
    electionDistrict?: number | null
    countyLegDistrict?: string | null
    stateAssmblyDistrict?: string | null
    stateSenateDistrict?: string | null
    congressionalDistrict?: string | null
    CC_WD_Village?: string | null
    townCode?: string | null
    lastUpdate?: Date | string | null
    originalRegDate?: Date | string | null
    statevid?: string | null
    hasDiscrepancy?: boolean | null
  }

  export type CommitteeRequestCreateManyCommitteListInput = {
    id?: number
    addVoterRecordId?: string | null
    removeVoterRecordId?: string | null
    requestNotes?: string | null
  }

  export type CommitteeUploadDiscrepancyCreateManyCommitteeInput = {
    id?: string
    VRCNUM: string
    discrepancy: JsonNullValueInput | InputJsonValue
  }

  export type VoterRecordUpdateWithoutCommitteeInput = {
    VRCNUM?: StringFieldUpdateOperationsInput | string
    addressForCommittee?: NullableStringFieldUpdateOperationsInput | string | null
    latestRecordEntryYear?: IntFieldUpdateOperationsInput | number
    latestRecordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
    hasDiscrepancy?: NullableBoolFieldUpdateOperationsInput | boolean | null
    votingRecords?: VotingHistoryRecordUpdateManyWithoutVoterRecordNestedInput
    addToCommitteeRequest?: CommitteeRequestUpdateManyWithoutAddVoterRecordNestedInput
    removeFromCommitteeRequest?: CommitteeRequestUpdateManyWithoutRemoveVoterRecordNestedInput
  }

  export type VoterRecordUncheckedUpdateWithoutCommitteeInput = {
    VRCNUM?: StringFieldUpdateOperationsInput | string
    addressForCommittee?: NullableStringFieldUpdateOperationsInput | string | null
    latestRecordEntryYear?: IntFieldUpdateOperationsInput | number
    latestRecordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
    hasDiscrepancy?: NullableBoolFieldUpdateOperationsInput | boolean | null
    votingRecords?: VotingHistoryRecordUncheckedUpdateManyWithoutVoterRecordNestedInput
    addToCommitteeRequest?: CommitteeRequestUncheckedUpdateManyWithoutAddVoterRecordNestedInput
    removeFromCommitteeRequest?: CommitteeRequestUncheckedUpdateManyWithoutRemoveVoterRecordNestedInput
  }

  export type VoterRecordUncheckedUpdateManyWithoutCommitteeInput = {
    VRCNUM?: StringFieldUpdateOperationsInput | string
    addressForCommittee?: NullableStringFieldUpdateOperationsInput | string | null
    latestRecordEntryYear?: IntFieldUpdateOperationsInput | number
    latestRecordEntryNumber?: IntFieldUpdateOperationsInput | number
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    middleInitial?: NullableStringFieldUpdateOperationsInput | string | null
    suffixName?: NullableStringFieldUpdateOperationsInput | string | null
    houseNum?: NullableIntFieldUpdateOperationsInput | number | null
    street?: NullableStringFieldUpdateOperationsInput | string | null
    apartment?: NullableStringFieldUpdateOperationsInput | string | null
    halfAddress?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine2?: NullableStringFieldUpdateOperationsInput | string | null
    resAddrLine3?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    zipCode?: NullableStringFieldUpdateOperationsInput | string | null
    zipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    telephone?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress1?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress2?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress3?: NullableStringFieldUpdateOperationsInput | string | null
    mailingAddress4?: NullableStringFieldUpdateOperationsInput | string | null
    mailingCity?: NullableStringFieldUpdateOperationsInput | string | null
    mailingState?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZip?: NullableStringFieldUpdateOperationsInput | string | null
    mailingZipSuffix?: NullableStringFieldUpdateOperationsInput | string | null
    party?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    DOB?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    L_T?: NullableStringFieldUpdateOperationsInput | string | null
    electionDistrict?: NullableIntFieldUpdateOperationsInput | number | null
    countyLegDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateAssmblyDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    stateSenateDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    congressionalDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    CC_WD_Village?: NullableStringFieldUpdateOperationsInput | string | null
    townCode?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    originalRegDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statevid?: NullableStringFieldUpdateOperationsInput | string | null
    hasDiscrepancy?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type CommitteeRequestUpdateWithoutCommitteListInput = {
    requestNotes?: NullableStringFieldUpdateOperationsInput | string | null
    addVoterRecord?: VoterRecordUpdateOneWithoutAddToCommitteeRequestNestedInput
    removeVoterRecord?: VoterRecordUpdateOneWithoutRemoveFromCommitteeRequestNestedInput
  }

  export type CommitteeRequestUncheckedUpdateWithoutCommitteListInput = {
    id?: IntFieldUpdateOperationsInput | number
    addVoterRecordId?: NullableStringFieldUpdateOperationsInput | string | null
    removeVoterRecordId?: NullableStringFieldUpdateOperationsInput | string | null
    requestNotes?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type CommitteeRequestUncheckedUpdateManyWithoutCommitteListInput = {
    id?: IntFieldUpdateOperationsInput | number
    addVoterRecordId?: NullableStringFieldUpdateOperationsInput | string | null
    removeVoterRecordId?: NullableStringFieldUpdateOperationsInput | string | null
    requestNotes?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type CommitteeUploadDiscrepancyUpdateWithoutCommitteeInput = {
    id?: StringFieldUpdateOperationsInput | string
    VRCNUM?: StringFieldUpdateOperationsInput | string
    discrepancy?: JsonNullValueInput | InputJsonValue
  }

  export type CommitteeUploadDiscrepancyUncheckedUpdateWithoutCommitteeInput = {
    id?: StringFieldUpdateOperationsInput | string
    VRCNUM?: StringFieldUpdateOperationsInput | string
    discrepancy?: JsonNullValueInput | InputJsonValue
  }

  export type CommitteeUploadDiscrepancyUncheckedUpdateManyWithoutCommitteeInput = {
    id?: StringFieldUpdateOperationsInput | string
    VRCNUM?: StringFieldUpdateOperationsInput | string
    discrepancy?: JsonNullValueInput | InputJsonValue
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use UserCountOutputTypeDefaultArgs instead
     */
    export type UserCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use VoterRecordCountOutputTypeDefaultArgs instead
     */
    export type VoterRecordCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = VoterRecordCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use CommitteeListCountOutputTypeDefaultArgs instead
     */
    export type CommitteeListCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = CommitteeListCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UserDefaultArgs instead
     */
    export type UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AccountDefaultArgs instead
     */
    export type AccountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AccountDefaultArgs<ExtArgs>
    /**
     * @deprecated Use SessionDefaultArgs instead
     */
    export type SessionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SessionDefaultArgs<ExtArgs>
    /**
     * @deprecated Use PrivilegedUserDefaultArgs instead
     */
    export type PrivilegedUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = PrivilegedUserDefaultArgs<ExtArgs>
    /**
     * @deprecated Use VerificationTokenDefaultArgs instead
     */
    export type VerificationTokenArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = VerificationTokenDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AuthenticatorDefaultArgs instead
     */
    export type AuthenticatorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AuthenticatorDefaultArgs<ExtArgs>
    /**
     * @deprecated Use VoterRecordArchiveDefaultArgs instead
     */
    export type VoterRecordArchiveArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = VoterRecordArchiveDefaultArgs<ExtArgs>
    /**
     * @deprecated Use VoterRecordDefaultArgs instead
     */
    export type VoterRecordArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = VoterRecordDefaultArgs<ExtArgs>
    /**
     * @deprecated Use VotingHistoryRecordDefaultArgs instead
     */
    export type VotingHistoryRecordArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = VotingHistoryRecordDefaultArgs<ExtArgs>
    /**
     * @deprecated Use CommitteeListDefaultArgs instead
     */
    export type CommitteeListArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = CommitteeListDefaultArgs<ExtArgs>
    /**
     * @deprecated Use CommitteeRequestDefaultArgs instead
     */
    export type CommitteeRequestArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = CommitteeRequestDefaultArgs<ExtArgs>
    /**
     * @deprecated Use DropdownListsDefaultArgs instead
     */
    export type DropdownListsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = DropdownListsDefaultArgs<ExtArgs>
    /**
     * @deprecated Use CommitteeUploadDiscrepancyDefaultArgs instead
     */
    export type CommitteeUploadDiscrepancyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = CommitteeUploadDiscrepancyDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ElectionDateDefaultArgs instead
     */
    export type ElectionDateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ElectionDateDefaultArgs<ExtArgs>
    /**
     * @deprecated Use OfficeNameDefaultArgs instead
     */
    export type OfficeNameArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = OfficeNameDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}