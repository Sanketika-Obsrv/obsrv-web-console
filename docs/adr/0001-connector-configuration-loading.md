# 1. Connector configuration loading

## Status

Accepted

## Context

The connector configuration page could render blank or show the wrong data. `useReadConnectors` used the constant query key `['connectorId']`, so every connector read shared one cache entry and could return another connector's config. `useFetchDatasetsById` left `datasetId` out of its key, so two datasets read with the same params shared one entry too. The page also fetched the dataset for the `<new>` placeholder id, which has no backend record and 404s, and it carried the selected connector only in router state, which is lost on refresh and back/forward navigation.

## Decision

- Both query keys in `services/dataset.ts` include their id. `datasetId` is appended last, so existing invalidations on the `['fetchDatasetsById', 'datasetId', 'status']` prefix still match. The dataset query is disabled for `<new>`.
- The selected connector id is passed as a `?connectorId=` URL param from all three entry points (`DynamicStepper`, `Ingestion`, `SelectConnector`), with router state as the first choice and the param as the fallback. Pre-filled form data (`connectorConfig`) still comes only from router state; losing it means the form loads blank rather than the page failing.
- The page resolves one connector id and fetches it once: the dataset's existing `connectors_config[0].connector_id` if there is one, otherwise the selected id. A second, duplicate fetch for the existing connector had no error handling and left the form silently empty.
- When nothing loads, the page shows an error instead of a blank form, in this order: the dataset read failed; no connector id at all; the connector read failed. Proceed is disabled while an error is shown.
- Saving an existing connector is blocked only when its definition failed to load, not when its saved config is empty. A connector with no configurable fields legitimately saves `{}`.

## Consequences

The existing connector always takes precedence over a newly selected one. Switching an existing dataset to a different connector is not supported: there is no UI path to it, and the dataset update API merges `connectors_config` by `connector_id`, so a switch would also need an explicit `remove` of the old entry and publish-time cleanup of the old connector instance. That is tracked in Sanketika-Obsrv/issue-tracker#273.
