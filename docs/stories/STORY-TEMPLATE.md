# Story X.Y: [Feature Name]

**Epic**: [Epic number, e.g., Epic 3: Frontend Development]
**Priority**: [P0 Critical | P1 High | P2 Medium | P3 Low]
**Estimated Time**: [X hours naive, Y hours with buffer]
**Assigned To**: [@username or "unassigned"]
**Status**: [NOT STARTED | IN PROGRESS | BLOCKED | COMPLETED]

---

## Overview

[1-2 sentence description of what this story accomplishes and why it's needed]

---

## Acceptance Criteria

### Functional Requirements

1. **GIVEN** [context/precondition]
   **WHEN** [user action or system event]
   **THEN** [expected result/behavior]

2. **GIVEN** [context]
   **WHEN** [action]
   **THEN** [result]

3. **GIVEN** [context]
   **WHEN** [action]
   **THEN** [result]

### Non-Functional Requirements (if applicable)

□ Performance: [e.g., Page load <3s, API response <200ms]
□ Security: [e.g., RLS policies tested, input validation]
□ Accessibility: [e.g., Keyboard navigable, WCAG 2.1 A compliance]
□ Browser Support: [e.g., Chrome, Firefox, Safari]

---

## Technical Implementation

### Definition of Done Tier

**Selected Tier**: [Tier 1 | Tier 2 | Tier 3 | Tier 4] (see docs/DEFINITION_OF_DONE.md)

**Rationale**: [Why this tier? E.g., "Tier 3 because new feature with database changes"]

### Files to Create
- [ ] `path/to/new/file.ts` - [Purpose]
- [ ] `path/to/test/file.test.ts` - [Test coverage]

### Files to Modify
- [ ] `path/to/existing/file.ts` - [What changes]
- [ ] `path/to/schema.sql` - [Database changes]

### Dependencies
- **Must Complete First**: Story X.Z (reason: [why])
- **Blocks**: Story X.A (reason: [why])
- **Related**: Story X.B (optional, provides context)

### External Dependencies
- [ ] Supabase project setup complete
- [ ] Anchor programs deployed to devnet
- [ ] Design mockups approved (if UI work)

---

## Testing Strategy

### Unit Tests
- [ ] Test [function/component name] with valid inputs
- [ ] Test [function/component name] with edge cases (empty, null, max values)
- [ ] Test error handling for [specific error scenarios]

### Integration Tests (if applicable)
- [ ] Test full workflow: [describe end-to-end flow]
- [ ] Test interaction with [other component/service]

### E2E Tests (Tier 3-4 only)
- [ ] User can [primary action] successfully
- [ ] Error states display correctly
- [ ] Loading states work properly

### Manual Testing Checklist
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test on mobile viewport (if UI)
- [ ] Test with slow 3G network (if applicable)

---

## Design Notes (for UI stories)

### Wireframes/Mockups
[Link to Figma, screenshot, or description]

### Key UI Elements
- Component: [Name/Purpose]
- Interactions: [Hover, click, keyboard nav]
- States: [Loading, error, success, empty]

---

## Implementation Notes

### Approach
[High-level description of how you'll implement this - algorithms, libraries, patterns]

### Alternatives Considered
- **Option A**: [Approach] - Rejected because [reason]
- **Option B**: [Approach] - **SELECTED** because [reason]

### Risks & Mitigation
- **Risk**: [What could go wrong]
  **Mitigation**: [How to prevent/handle it]

---

## Completion Notes

**Completed**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Variance**: [+/- Y hours from estimate]

### What Went Well
- [Thing that worked as expected]
- [Thing that was easier than expected]

### What Didn't Go Well
- [Thing that took longer than expected]
- [Unexpected blocker or issue]

### Lessons Learned
- [Key takeaway for future stories]
- [Process improvement suggestion]

### Follow-Up Tasks (if any)
- [ ] Story X.Z - [Related work discovered during implementation]
- [ ] Technical debt: [Thing to clean up later, documented in TODO_CHECKLIST]

---

## References

- **Related Docs**: [Link to relevant documentation]
- **Related PRs**: [Link to GitHub PR]
- **Related Issues**: [Link to GitHub issue]
- **External Resources**: [Links to libraries, APIs, tutorials]
