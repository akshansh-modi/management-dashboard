# Backward Compatibility Guidelines

This repository contains critical rules to preserve backwards compatibility for existing order records, product entities, and user sessions.

## 1. DTO (Data Transfer Object) Separation
* **Rule:** Never return database entities directly in controllers. Always map to and from DTOs.
* **Reason:** Allows modifying the internal MongoDB schema without breaking the REST API contract or frontend clients.

## 2. Additive Schema Updates (No Renames or Deletes)
* **Rule:** Never rename or delete existing fields in MongoDB document collections.
* **Reason:** Doing so instantly breaks historical records (e.g. older orders or products). Instead, deprecate old fields, add new ones, and implement fallback mapping in the code.

## 3. Dynamic UI Calculations for Splits and Percentages
* **Rule:** Do not hardcode splits or percentages in UI labels (e.g. "Advance (10%)"). Instead, compute the percentage dynamically per row: `Math.round(paymentAmount / orderTotal * 100)`.
* **Reason:** Ensures historical orders display correct percentages even after the global split settings are modified in configuration.

## 4. Null-Safe Mapping
* **Rule:** Use Java `Optional` or standard null-checks on the backend, and TypeScript optional chaining (`?.`) on the frontend when parsing attributes or properties.
* **Reason:** Prevents crashes and white-screens when rendering older records that lack newly introduced fields.
