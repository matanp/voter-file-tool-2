# Open Source Politics - Comprehensive Functionality Documentation

## Overview

Open Source Politics is a comprehensive web application designed for political campaigns, committees, and activists to manage voter data, organize committee structures, and generate political documents. Built with Next.js, TypeScript, and PostgreSQL, it provides secure access to voter records with role-based permissions.

## Core Architecture

### Technology Stack

- **Frontend**: Next.js 15.5.2 with React 19.1.1, TypeScript
- **Styling**: Tailwind CSS with Radix UI components
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Google OAuth
- **Report Generation**: Node.js service with Puppeteer for PDF generation
- **Deployment**: Vercel (frontend), AWS Lightsail (report server)

### Data Model

The application manages several key data entities:

- **VoterRecord**: Core voter information with 40+ fields including demographics, addresses, districts
- **CommitteeList**: Geographic committee structures organized by city, legislative district, and election district
- **User**: Authentication and role management with privilege levels
- **Report**: Generated documents (petitions, committee reports, voter lists)
- **VotingHistoryRecord**: Historical voting participation data

## Detailed Functionality

### 1. Voter Record Search & Management

#### Search Capabilities

- **Multi-field Search**: Search by voter ID, name, address, city/town, zip code, date of birth, districts
- **Advanced Filtering**:
  - Name fields (first, last, middle initial, suffix)
  - Address components (house number, street, apartment, city, zip)
  - Geographic districts (election, county legislative, state assembly, state senate, congressional)
  - Demographics (date of birth, gender, party affiliation)
  - Contact information (phone, email)
- **Search Types**:
  - Exact matches for voter ID
  - Partial matches for names and addresses
  - Date range queries for birth dates
  - Boolean queries (has email, has phone, has invalid email)
- **Pagination**: Handles large result sets with configurable page sizes

#### Voter Data Fields (40+ fields)

- **Identification**: VRCNUM, firstName, lastName, middleInitial, suffixName, DOB, gender
- **Address**: houseNum, street, apartment, halfAddress, resAddrLine2/3, city, state, zipCode, zipSuffix
- **Contact**: telephone, email
- **Mailing Address**: mailingAddress1-4, mailingCity, mailingState, mailingZip, mailingZipSuffix
- **Political**: party, L_T (Libertarian/Taxpayer)
- **Districts**: electionDistrict, countyLegDistrict, stateAssmblyDistrict, stateSenateDistrict, congressionalDistrict
- **Geographic**: CC_WD_Village, townCode
- **Metadata**: lastUpdate, originalRegDate, statevid, latestRecordEntryYear/Number

#### Search Interface Features

- **Dynamic Form Building**: Configurable search fields based on user permissions
- **Real-time Validation**: Input validation with error handling
- **Search History**: Context preservation across sessions
- **Export Capabilities**: Results can be exported to XLSX format (up to 20,000 records)

### 2. Committee Management System

#### Committee Structure

- **Geographic Organization**: Committees organized by city/town, legislative district, and election district
- **Member Management**: Add/remove committee members with approval workflows
- **Request System**: Non-admin users can request committee changes that require approval

#### Committee Operations

- **Member Addition**: Search for voters and add them to specific committees
- **Member Removal**: Remove existing members with confirmation
- **Bulk Operations**: Support for bulk committee member management
- **Discrepancy Handling**: Track and resolve data discrepancies in committee uploads

#### Committee Data Management

- **Upload Discrepancies**: Admin interface to review and resolve committee data conflicts
- **Address Verification**: Committee-specific address tracking for members
- **Request Tracking**: Monitor pending committee change requests

### 3. Document Generation & Reports

#### Designated Petitions

- **Candidate Management**: Add multiple candidates with office assignments
- **Vacancy Appointments**: Handle vacancy appointment candidates
- **Party Selection**: Support for major parties and custom party names
- **Election Configuration**: Link to specific election dates and office names
- **Multi-page Support**: Generate petitions with multiple pages
- **PDF Generation**: Professional PDF output with proper formatting

#### Committee Reports

- **Field Selection**: Choose specific voter record fields to include
- **XLSX Export**: Generate Excel-compatible committee member lists
- **Custom Formatting**: Configurable report layouts and field combinations
- **Bulk Generation**: Generate reports for multiple committees

#### Voter List Reports

- **Search-based Reports**: Generate reports from search results
- **Field Customization**: Select which voter fields to include
- **Size Limitations**: Reports limited to 20,000 records for performance
- **XLSX Format**: Excel-compatible output format

#### Report Management

- **Status Tracking**: Real-time report generation status
- **Job Queue**: Background processing for large reports
- **File Storage**: Secure storage and retrieval of generated documents
- **Access Control**: Role-based access to generated reports

### 4. User Authentication & Authorization

#### Authentication System

- **Google OAuth**: Primary authentication method
- **Invite-based Access**: New users require valid invitation links
- **Session Management**: Secure session handling with NextAuth.js
- **Access Denial**: Graceful handling of unauthorized access attempts

#### Privilege Levels

- **Developer**: Full system access and development capabilities
- **Admin**: Complete data access, user management, system configuration
- **RequestAccess**: Can request committee changes, limited data access
- **ReadAccess**: Basic read-only access to voter data

#### User Management

- **Invite System**: Admins can create invitation links with custom privilege levels
- **Privilege Synchronization**: Automatic privilege level updates from PrivilegedUser table
- **Custom Messages**: Personalized invitation messages
- **Expiration Handling**: Time-limited invitation links

### 5. Administrative Functions

#### User Invitation Management

- **Create Invitations**: Generate invitation links with specific privilege levels
- **Custom Messages**: Add personalized messages to invitations
- **Expiration Control**: Set custom expiration periods (default 7 days)
- **Invitation Tracking**: Monitor invitation status and usage
- **Bulk Operations**: Manage multiple invitations

#### Data Management

- **Election Dates**: Manage election date configurations
- **Office Names**: Configure available office positions
- **Committee Discrepancies**: Review and resolve data conflicts
- **Bulk Data Loading**: Admin tools for large-scale data operations

#### System Configuration

- **Dropdown Lists**: Manage reference data (cities, zip codes, districts, parties)
- **Data Validation**: Ensure data integrity across the system
- **Backup Management**: Handle voter record archives

### 6. Search & Filtering Engine

#### Advanced Search Features

- **Compound Fields**: Support for complex field combinations (name, address)
- **Multiple Values**: Search with multiple values per field
- **Date Ranges**: Flexible date range queries
- **Boolean Logic**: Complex query combinations with AND/OR logic
- **Field Normalization**: Automatic data cleaning and standardization

#### Search Performance

- **Pagination**: Efficient handling of large result sets
- **Caching**: Optimized query performance
- **Indexing**: Database indexes for fast searches
- **Query Optimization**: Efficient Prisma query building

#### Search Context Management

- **State Preservation**: Maintain search context across page navigation
- **Field Tracking**: Track which fields are being searched
- **Query History**: Remember previous search parameters
- **Export Integration**: Direct export from search results

### 7. Data Security & Privacy

#### Access Control

- **Role-based Permissions**: Granular access control based on user roles
- **Data Filtering**: Different data access levels for different user types
- **PII Protection**: Sensitive data access restricted to authorized users

#### Data Validation

- **Input Sanitization**: Clean and validate all user inputs
- **Schema Validation**: Zod-based validation for all data operations
- **Type Safety**: Full TypeScript coverage for data operations
- **Error Handling**: Comprehensive error handling and user feedback

### 8. Real-time Features

#### Report Generation Tracking

- **Status Updates**: Real-time report generation progress
- **WebSocket Integration**: Live updates for long-running operations
- **Error Notifications**: Immediate feedback on generation failures
- **Completion Alerts**: Notifications when reports are ready

#### User Interface

- **Responsive Design**: Mobile-friendly interface
- **Progressive Enhancement**: Works across different devices and browsers
- **Loading States**: Clear feedback during operations
- **Error Recovery**: Graceful handling of network and system errors

### 9. Integration & APIs

#### External Services

- **Google OAuth**: Authentication provider integration
- **AWS S3**: File storage for generated reports
- **Vercel**: Frontend hosting and deployment
- **PostgreSQL**: Primary database with connection pooling

#### API Architecture

- **RESTful APIs**: Standard HTTP-based API endpoints
- **Type Safety**: Full TypeScript coverage for API operations
- **Validation**: Request/response validation with Zod schemas
- **Error Handling**: Consistent error responses and status codes

### 10. Performance & Scalability

#### Database Optimization

- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Optimized Prisma queries
- **Indexing Strategy**: Strategic database indexes for performance
- **Caching**: Application-level caching where appropriate

#### Frontend Performance

- **Code Splitting**: Lazy loading of components and pages
- **Bundle Optimization**: Efficient JavaScript bundling
- **Image Optimization**: Next.js image optimization
- **CDN Integration**: Global content delivery

## Technical Implementation Details

### Database Schema

- **Normalized Design**: Efficient relational database structure
- **Foreign Key Relationships**: Proper data integrity constraints
- **Indexes**: Strategic indexing for query performance
- **Migrations**: Version-controlled database schema changes

### Frontend Architecture

- **Component-based**: Modular React component architecture
- **State Management**: Context-based state management
- **Type Safety**: Full TypeScript implementation
- **Testing**: Comprehensive test coverage with Jest

### Backend Services

- **API Routes**: Next.js API route handlers
- **Middleware**: Authentication and validation middleware
- **Error Handling**: Centralized error handling and logging
- **Security**: Input validation and sanitization

This comprehensive functionality documentation covers all major aspects of the Open Source Politics application, providing detailed insights into its capabilities, architecture, and implementation.
