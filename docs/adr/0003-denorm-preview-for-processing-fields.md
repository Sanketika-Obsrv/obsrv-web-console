# 3. Denorm preview as the field source in the Processing step

## Status

Accepted

Issue: Sanketika-Obsrv/issue-tracker#253. Backend: Sanketika-Obsrv/obsrv-api-service#395.

## Context

PII suggestions in the Processing step ran only on the dataset's own sample event. Fields joined from a master dataset through Data Denormalization (for example `school.INSTITUTION_EMAIL`) exist only after the denormalizer has run, so they were never checked and could not be picked in Add Sensitive Field, Add Transformation or Add Derived Field. They are also absent from `data_schema`, which is where those dropdowns get their options.

## Decision

- The page calls `GET /v2/datasets/denorm-preview/:id?mode=edit` when the dataset has `denorm_config.denorm_fields`. The backend returns the base sample event merged with each master's sample data under its `denorm_out_field`, plus `unavailable_denorm_fields` for masters it could not read (missing, not live, or no sample data).
- The merged event is what PII detection runs on, because it is the event the transformer (where masking happens) sees at runtime. The backend returns it already flattened to dotted keys, because PII detection matches on field names and the base path already sends a flattened event.
- Only keys under a `denorm_out_field` prefix are added to the Sensitive Field, Transformation and Derived Field options. Base fields keep coming from `data_schema` alone, so the two sources can't put two spellings of one field in a dropdown.
- The Dedup Key options are left as they are. Dedup runs in the preprocessor, before the denormalizer, so a joined field doesn't exist yet when the dedup key is read.
- The JSONata playground needs real nesting, so the preview is un-flattened with `unflattenObject` (`services/json-schema.ts`). When a base field and a joined field share a name, the joined object wins, matching `event.put(outField, …)` in the denormalizer.
- The preview query is invalidated after every dataset save, because adding a second denorm field changes `denorm_config` without changing the query key.

## When the preview is unavailable

- Preview request fails: PII detection falls back to the base event and the Data Privacy section shows a warning that only the dataset's own fields are covered.
- Some masters unavailable: the rest of the event is used and the Data Privacy section names the uncovered `denorm_out_field`s in a warning. Their fields are not in the dropdowns, since there is no sample to read them from.
- Preview is the `$schema` placeholder or empty (no sample data yet): falls back to the base event with no warning, the same as a dataset with no denorm.

## Consequences

- The Processing step makes one more API call when denorm is configured and depends on obsrv-api-service#395 being deployed. Without it the request fails and the page degrades as described above.
- Fields inside arrays are unchanged here. They are tracked separately in #271.
- The same change is in obsrv-management-console-ext (#135), which shares this frontend code.
