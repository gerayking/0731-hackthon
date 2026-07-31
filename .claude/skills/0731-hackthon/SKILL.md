```markdown
# 0731-hackthon Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `0731-hackthon` TypeScript repository. You'll learn about file naming, import/export styles, commit message conventions, and how to write and organize tests. This guide is designed to help contributors maintain consistency and quality across the codebase.

## Coding Conventions

### File Naming
- Use **PascalCase** for all file names.
  - Example: `UserProfile.ts`, `AuthService.ts`

### Import Style
- Use **relative imports** for modules within the repository.
  - Example:
    ```typescript
    import { AuthService } from './AuthService';
    ```

### Export Style
- Use **named exports** instead of default exports.
  - Example:
    ```typescript
    // In AuthService.ts
    export function login() { ... }
    export function logout() { ... }

    // In another file
    import { login, logout } from './AuthService';
    ```

### Commit Message Conventions
- Follow the **conventional commit** style.
- Use prefixes like `docs` to indicate documentation changes.
- Keep commit messages concise (average ~50 characters).
  - Example:
    ```
    docs: update README with setup instructions
    ```

## Workflows

### Adding Documentation
**Trigger:** When updating or adding documentation files.
**Command:** `/add-docs`

1. Make your documentation changes in the relevant files.
2. Use a commit message with the `docs` prefix.
   - Example: `docs: add API usage section`
3. Push your changes to the repository.

### Creating a New Module
**Trigger:** When adding a new feature or module.
**Command:** `/create-module`

1. Create a new file using PascalCase (e.g., `NewFeature.ts`).
2. Use named exports for all functions or classes.
3. Use relative imports for dependencies.
4. Write corresponding tests in a file matching `*.test.*`.
5. Commit your changes following the conventional commit style.

## Testing Patterns

- **Test files** should follow the `*.test.*` naming pattern.
  - Example: `UserProfile.test.ts`
- The specific testing framework is not detected, but standard TypeScript testing practices apply.
- Place test files alongside the modules they test or in a dedicated test directory.

  Example test file:
  ```typescript
  // UserProfile.test.ts
  import { getUserProfile } from './UserProfile';

  describe('getUserProfile', () => {
    it('should return user data', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command         | Purpose                                   |
|-----------------|-------------------------------------------|
| /add-docs       | Add or update documentation files         |
| /create-module  | Scaffold a new module with tests          |
```
