# Frontend Style Guide & Analysis

## Overview

This document provides a comprehensive analysis of the frontend codebase patterns, identifies discrepancies, and establishes a style guide for the Voter File Tool application. The analysis covers 82+ TSX files across the frontend application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Patterns](#component-patterns)
3. [Tailwind CSS Usage Analysis](#tailwind-css-usage-analysis)
4. [Code Duplication & Centralization Opportunities](#code-duplication--centralization-opportunities)
5. [Inconsistencies & Discrepancies](#inconsistencies--discrepancies)
6. [Style Guide Recommendations](#style-guide-recommendations)
7. [Best Practices](#best-practices)

## Architecture Overview

### Component Structure

- **UI Components**: Located in `~/components/ui/` - Reusable shadcn/ui components
- **Feature Components**: Located in `~/app/` - Page-specific and feature-specific components
- **Shared Components**: Located in `~/components/` - Cross-feature reusable components
- **Context Providers**: Located in `~/components/providers/` and `~/contexts/`

### Key Patterns

- **Server Components**: Used for data fetching (e.g., `CommitteeLists`, `XLSXConfigPage`)
- **Client Components**: Used for interactivity (marked with `"use client"`)
- **Compound Components**: Complex components broken into smaller pieces (e.g., `VoterRecordTable`)

## Component Patterns

### 1. Form Components

#### Pattern: Controlled Forms with State Management

```tsx
// Consistent pattern across forms
const [formData, setFormData] = useState<FormDataType>(initialData);
const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
const [loading, setLoading] = useState(false);

const handleSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  setLoading(true);
  // Validation and submission logic
};
```

**Examples**: `VoterRecordSearch`, `GeneratePetitionForm`, `XLSXConfigForm`

#### Pattern: Form Validation

- **Consistent**: Using Zod schemas for validation (`generateReportSchema`)
- **Inconsistent**: Some forms use manual validation, others use custom hooks

### 2. Data Display Components

#### Pattern: Table Components

```tsx
// Consistent table structure
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column Name</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {records.map((record) => (
      <TableRow key={record.id}>
        <TableCell>{record.value}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Examples**: `VoterRecordTable`, `ReportCard` (for data display)

#### Pattern: Card Components

```tsx
// Consistent card structure
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>{/* Content */}</CardContent>
  <CardFooter>{/* Actions */}</CardFooter>
</Card>
```

### 3. Interactive Components

#### Pattern: Dropdown/Select Components

- **Primary**: `ComboboxDropdown` (custom component)
- **Secondary**: `Select` (shadcn/ui component)
- **Inconsistency**: Mixed usage across components

#### Pattern: Search Components

- **Consistent**: Debounced search with `useState` and `useEffect`
- **Examples**: `StreetSearch`, `CityTownSearch`

## Tailwind CSS Usage Analysis

### 1. Color System

#### Custom CSS Variables (globals.css)

```css
:root {
  --primary: 142.1 76.2% 36.3%;
  --primary-foreground: 355.7 100% 97.3%;
  --secondary: var(--light-gray);
  --muted: var(--light-gray);
  --accent: var(--light-gray);
  --destructive: 0 84.2% 60.2%;
}
```

#### Usage Patterns

- **Consistent**: Primary color used for headers and important elements
- **Inconsistent**: Mixed usage of custom colors vs. Tailwind defaults

### 2. Spacing & Layout

#### Common Patterns

```tsx
// Consistent spacing patterns
className = 'flex gap-2 items-center'; // Horizontal layout
className = 'space-y-4'; // Vertical spacing
className = 'p-4'; // Padding
className = 'w-full max-w-6xl mx-auto'; // Container width
```

#### Discrepancies

- **Inconsistent**: Mix of `gap-2`, `gap-4`, `space-x-2`, `space-y-4`
- **Inconsistent**: Padding/margin usage (`p-4`, `pt-2`, `py-2`)

### 3. Typography

#### Custom Classes

```css
.primary-header {
  @apply text-2xl text-primary font-bold;
}
```

#### Usage Patterns

- **Consistent**: `primary-header` class used for main headings
- **Inconsistent**: Mix of `text-xl`, `text-2xl`, `text-lg` for similar elements

### 4. Responsive Design

#### Patterns

```tsx
// Responsive patterns
className = 'lg:w-max w-[80vw]'; // Responsive width
className = 'hidden lg:block'; // Hide on small screens
className = 'flex flex-col lg:flex-row'; // Responsive flex direction
```

#### Discrepancies

- **Inconsistent**: Different breakpoint usage (`sm:`, `lg:`, custom widths)
- **Inconsistent**: Mobile-first vs. desktop-first approaches

## Code Duplication & Centralization Opportunities

### 1. Form Validation Logic

#### Duplicated Code

- **Location**: Multiple form components
- **Pattern**: Manual validation with `useState` for errors
- **Opportunity**: Create a custom hook `useFormValidation`

```tsx
// Current duplicated pattern
const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
const [hasUserSubmitted, setHasUserSubmitted] = useState(false);

// Recommended centralized hook
const { errors, validateForm, clearErrors } = useFormValidation(schema);
```

### 2. API Call Patterns

#### Duplicated Code

- **Location**: Multiple components making similar API calls
- **Pattern**: Fetch with error handling and loading states
- **Opportunity**: Create custom hooks for common API operations

```tsx
// Current duplicated pattern
const [loading, setLoading] = useState(false);
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

// Recommended centralized hook
const { data, loading, error, mutate } = useApiMutation('/api/endpoint');
```

### 3. Button Styling

#### Duplicated Code

- **Location**: Multiple components with similar button styles
- **Pattern**: Inline className overrides
- **Opportunity**: Create button variants or utility classes

```tsx
// Current duplicated pattern
<Button className="bg-green-600 hover:bg-green-700">
  Export Records
</Button>

// Recommended approach
<Button variant="success">Export Records</Button>
```

### 4. Table Configuration

#### Duplicated Code

- **Location**: `fieldsConfig.tsx` and table components
- **Pattern**: Field configuration objects
- **Opportunity**: Centralize field configurations

### 5. Error Display

#### Duplicated Code

- **Location**: Multiple form components
- **Pattern**: Error message display logic
- **Opportunity**: Create reusable `ErrorDisplay` component (partially exists)

## Inconsistencies & Discrepancies

### 1. Component Naming

#### Inconsistencies

- **File naming**: `VoterRecordSearch.tsx` vs `VoterRecordTable.tsx` (PascalCase)
- **Component naming**: `CommitteeSelector` vs `CommitteeRequestForm` (PascalCase)
- **Hook naming**: `useWindowSize` vs `useFormValidation` (camelCase)

#### Recommendation

- Use PascalCase for component files and components
- Use camelCase for hooks and utilities

### 2. Import Patterns

#### Inconsistencies

```tsx
// Mixed import styles
import { Button } from '~/components/ui/button'; // Preferred
import { VoterCard } from '~/app/recordsearch/RecordsList'; // Relative imports
import prisma from '~/lib/prisma'; // Default imports
```

#### Recommendation

- Use absolute imports with `~/` prefix consistently
- Group imports: React, third-party, internal

### 3. State Management

#### Inconsistencies

- **Some components**: Use `useState` for all state
- **Other components**: Use custom hooks or context
- **Pattern**: No consistent state management strategy

### 4. Error Handling

#### Inconsistencies

- **Some components**: Use toast notifications
- **Other components**: Use inline error messages
- **Pattern**: Mixed error handling approaches

### 5. Loading States

#### Inconsistencies

- **Some components**: Use loading spinners
- **Other components**: Use text-based loading states
- **Pattern**: No consistent loading UI

### 6. Responsive Design

#### Inconsistencies

- **Breakpoints**: Mix of `sm:`, `md:`, `lg:`, `xl:`
- **Mobile-first**: Some components use mobile-first, others desktop-first
- **Custom widths**: Mix of Tailwind classes and custom widths

## Style Guide Recommendations

### 1. Component Structure

```tsx
// Recommended component structure
interface ComponentProps {
  // Props with proper typing
}

export const ComponentName: React.FC<ComponentProps> = ({
  prop1,
  prop2,
  ...props
}) => {
  // Hooks at the top
  const [state, setState] = useState();

  // Event handlers
  const handleEvent = useCallback(() => {
    // Handler logic
  }, [dependencies]);

  // Render
  return <div className="component-container">{/* JSX */}</div>;
};
```

### 2. Styling Guidelines

#### Use Design System Colors

```tsx
// Preferred
className = 'bg-primary text-primary-foreground';
className = 'text-destructive';

// Avoid
className = 'bg-green-600 text-white';
className = 'text-red-500';
```

#### Consistent Spacing

```tsx
// Use consistent spacing scale
className = 'gap-2'; // 8px
className = 'gap-4'; // 16px
className = 'gap-6'; // 24px
className = 'gap-8'; // 32px
```

#### Responsive Design

```tsx
// Mobile-first approach
className = 'w-full sm:w-auto lg:w-max';
className = 'flex-col sm:flex-row';
className = 'text-sm sm:text-base lg:text-lg';
```

### 3. Form Patterns

```tsx
// Recommended form structure
const FormComponent: React.FC<Props> = ({ onSubmit }) => {
  const { errors, validateForm, clearErrors } = useFormValidation(schema);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <ErrorDisplay errors={errors} />
      <Button type="submit" disabled={loading}>
        {loading ? 'Loading...' : 'Submit'}
      </Button>
    </form>
  );
};
```

### 4. API Integration

```tsx
// Recommended API integration
const useApiMutation = (endpoint: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (data: any) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        return await response.json();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [endpoint]
  );

  return { mutate, loading, error };
};
```

## Best Practices

### 1. Component Design

- **Single Responsibility**: Each component should have one clear purpose
- **Composition over Inheritance**: Use compound components for complex UI
- **Props Interface**: Always define TypeScript interfaces for props
- **Default Props**: Use default parameters instead of defaultProps

### 2. State Management

- **Local State**: Use `useState` for component-specific state
- **Shared State**: Use context for state shared across components
- **Server State**: Consider using React Query or SWR for server state
- **Derived State**: Use `useMemo` for expensive calculations

### 3. Performance

- **Memoization**: Use `React.memo` for expensive components
- **Callback Optimization**: Use `useCallback` for event handlers passed to children
- **Effect Dependencies**: Always include all dependencies in `useEffect`
- **Lazy Loading**: Use dynamic imports for code splitting

### 4. Accessibility

- **Semantic HTML**: Use proper HTML elements
- **ARIA Labels**: Add ARIA labels for screen readers
- **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
- **Focus Management**: Manage focus for modals and dynamic content

### 5. Testing

- **Component Testing**: Test component behavior, not implementation
- **User Interactions**: Test user interactions and state changes
- **Error States**: Test error handling and edge cases
- **Accessibility Testing**: Include accessibility tests

## Implementation Priority

### High Priority

1. **Standardize form validation** - Create `useFormValidation` hook
2. **Centralize API calls** - Create custom hooks for common operations
3. **Fix responsive design inconsistencies** - Establish mobile-first approach
4. **Standardize error handling** - Use consistent error display patterns

### Medium Priority

1. **Create design system** - Establish consistent color and spacing system
2. **Standardize component structure** - Create component templates
3. **Improve TypeScript usage** - Add proper typing throughout
4. **Optimize performance** - Add memoization where needed

### Low Priority

1. **Refactor legacy components** - Update older components to new patterns
2. **Add comprehensive testing** - Implement testing strategy
3. **Documentation** - Add JSDoc comments and component documentation
4. **Code splitting** - Implement lazy loading for better performance

## Conclusion

The frontend codebase shows a mix of modern React patterns and some inconsistencies that can be addressed through systematic refactoring. The primary areas for improvement are:

1. **Standardization** of form handling, API calls, and error management
2. **Consistency** in styling, responsive design, and component structure
3. **Centralization** of common patterns and utilities
4. **Modernization** of state management and performance optimization

By following the recommendations in this guide, the codebase can become more maintainable, consistent, and scalable.
