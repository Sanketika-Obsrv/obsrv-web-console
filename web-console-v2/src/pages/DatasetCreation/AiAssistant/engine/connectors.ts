/**
 * Splits a connector's `ui_spec` into what can be discussed and what cannot.
 *
 * The split is the whole point. A connector's `ui_spec` is a JSON Schema
 * describing its configuration, and most of it — host, port, topic, table,
 * batch size — is ordinary connection detail that is safe to fill in
 * conversation. A few properties are credentials, and those must reach the
 * API without ever passing through the model's context or local storage.
 *
 * So: `fillableProps` is what the assistant may set, `secretProps` is what
 * only the form may collect, and `validateProp` refuses a secret outright
 * even if something asks for one.
 */

export interface PropSpec extends Record<string, unknown> {
  type?: string;
  title?: string;
  description?: string;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  default?: unknown;
  enum?: unknown[];
  uiIndex?: number;
}

export interface UiSpec extends Record<string, unknown> {
  title?: string;
  type?: string;
  properties?: Record<string, PropSpec>;
  required?: string[];
}

export interface ConnectorProp {
  key: string;
  spec: PropSpec;
  required: boolean;
  enum?: unknown[];
  default?: unknown;
}

/**
 * Names whose values are credentials.
 *
 * The single source of truth for this judgement: the session store scrubs
 * with the same pattern, because when the two were written separately they
 * drifted and cert material was persisted in plain text.
 *
 * Deliberately broader than `format: 'password'`: Kafka's
 * `source_kafka_ssl_truststore_base64` and `..._keystore_base64` are cert
 * material and are *not* marked password in the live `ui_spec`. Missing them
 * would send private key material through the model.
 *
 * `user` is absent on purpose — a username is not a credential, and treating
 * it as one would push an ordinary field into the form for no benefit. So is
 * a bare `key`, which would match `dedup_key`, `data_key`, `partition_key`,
 * `timestamp_key` and `version_key`.
 */
export const SECRET_PROP_NAME =
  /pwd|password|secret|token|credential|truststore|keystore|private_?key|passphrase|api_?key/i;

export const isSecretProp = (key: string, spec: PropSpec): boolean =>
  spec.format === 'password' || SECRET_PROP_NAME.test(key);

/** Hidden properties are set by the connector, not chosen by anyone. */
const isHidden = (spec: PropSpec) => spec.format === 'hidden';

const orderedProps = (uiSpec: UiSpec | undefined): ConnectorProp[] => {
  const properties = uiSpec?.properties ?? {};
  const required = uiSpec?.required ?? [];

  return (
    Object.entries(properties)
      .map(([key, spec]) => ({
        key,
        spec,
        required: required.includes(key),
        ...(spec.enum ? { enum: spec.enum } : {}),
        ...(spec.default !== undefined ? { default: spec.default } : {}),
      }))
      // `uiIndex` is the order the form shows them in; following it means the
      // conversation asks in the order the connector's author intended.
      .sort(
        (left, right) => (left.spec.uiIndex ?? 0) - (right.spec.uiIndex ?? 0),
      )
  );
};

/** Properties the assistant may set through conversation. */
export const fillableProps = (uiSpec: UiSpec | undefined): ConnectorProp[] =>
  orderedProps(uiSpec).filter(
    (prop) => !isSecretProp(prop.key, prop.spec) && !isHidden(prop.spec),
  );

/** Properties only the form may collect. */
export const secretProps = (uiSpec: UiSpec | undefined): ConnectorProp[] =>
  orderedProps(uiSpec).filter((prop) => isSecretProp(prop.key, prop.spec));

/**
 * A JSON Schema holding only the secrets, for the form to render.
 *
 * Narrowing rather than reusing the whole spec means the form cannot collect
 * — and so cannot re-submit — anything the conversation already set.
 */
export const secretSchema = (
  uiSpec: UiSpec | undefined,
): {
  type: 'object';
  properties: Record<string, PropSpec>;
  required: string[];
} => {
  const secrets = secretProps(uiSpec);

  return {
    type: 'object',
    properties: Object.fromEntries(
      secrets.map((prop) => [prop.key, prop.spec]),
    ),
    required: secrets.filter((prop) => prop.required).map((prop) => prop.key),
  };
};

export type PropValidation =
  { ok: true; value: unknown } | { ok: false; error: string };

const asNumber = (raw: unknown): number | undefined => {
  const value = typeof raw === 'number' ? raw : Number(String(raw).trim());
  return Number.isFinite(value) ? value : undefined;
};

/**
 * Checks a value against its property before anything is sent.
 *
 * The connector would reject a bad value at save time with a message about
 * its own schema; catching it here means the user is told in the turn where
 * they can simply say a different one.
 */
export const validateProp = (
  prop: ConnectorProp,
  raw: unknown,
): PropValidation => {
  // The classifier is the last line of defence, not just a filter for the
  // property list: a secret must never travel this path.
  if (isSecretProp(prop.key, prop.spec)) {
    return {
      ok: false,
      error: `${
        prop.spec.title ?? prop.key
      } is a credential, so I will ask for it in a secure form rather than in chat.`,
    };
  }

  const { spec } = prop;
  const label = spec.title ?? prop.key;

  if (spec.enum) {
    const allowed = spec.enum.map(String);
    const value = String(raw).trim();

    return allowed.includes(value)
      ? { ok: true, value }
      : {
          ok: false,
          error: `${label} must be one of ${allowed.join(', ')}.`,
        };
  }

  if (spec.type === 'integer' || spec.type === 'number') {
    const value = asNumber(raw);

    if (value === undefined) {
      return { ok: false, error: `${label} must be a number.` };
    }
    if (spec.type === 'integer' && !Number.isInteger(value)) {
      return { ok: false, error: `${label} must be a whole number.` };
    }
    if (spec.minimum !== undefined && value < spec.minimum) {
      return {
        ok: false,
        error: `${label} must be at least ${spec.minimum}.`,
      };
    }
    if (spec.maximum !== undefined && value > spec.maximum) {
      return {
        ok: false,
        error: `${label} must be no more than ${spec.maximum}.`,
      };
    }

    return { ok: true, value };
  }

  if (spec.type === 'boolean') {
    const value = String(raw).trim().toLowerCase();

    if (['true', 'yes', 'on'].includes(value)) return { ok: true, value: true };
    if (['false', 'no', 'off'].includes(value)) {
      return { ok: true, value: false };
    }

    return { ok: false, error: `${label} must be true or false.` };
  }

  const value = String(raw).trim();

  if (spec.pattern && !new RegExp(spec.pattern).test(value)) {
    return {
      ok: false,
      error: `${label} is not in the format this connector expects.`,
    };
  }

  return { ok: true, value };
};

/**
 * One line describing a property, for the assistant to ask with.
 *
 * Reads `spec` rather than the convenience `enum`/`default` copies on the
 * prop, so it describes the schema itself and cannot disagree with it.
 */
export const summariseProp = (prop: ConnectorProp): string => {
  const { spec } = prop;
  const parts = [spec.title ?? prop.key];

  if (prop.required) parts.push('(required)');
  if (spec.enum) parts.push(`— one of ${spec.enum.map(String).join(', ')}`);
  if (spec.default !== undefined) {
    parts.push(`— defaults to ${String(spec.default)}`);
  }

  return parts.join(' ');
};

export interface ConnectorPayloadArgs {
  datasetId: string;
  connectorId: string;
  /** Non-secret values gathered in conversation. */
  values: Record<string, unknown>;
  /**
   * Credentials, merged in only here on the way to the API. They are never
   * part of the buffered values, so they cannot reach the session.
   */
  secrets?: Record<string, unknown>;
  operationsConfig?: Record<string, unknown>;
  /** `create` sends a plain array; `update` sends delta-wrapped entries. */
  mode: 'create' | 'update';
}

/**
 * Builds `connectors_config` in the shape the API expects.
 *
 * Both shapes are taken from the wizard's own code rather than guessed:
 * `ConnectorConfiguration.tsx` sends `[{ value, action: 'upsert' }]` on
 * update, and `Ingestion.tsx` sends a plain `[{ ... }]` on create. That is
 * the same asymmetry T9 found for `transformations_config` — array configs
 * are delta APIs on PATCH and plain arrays on POST.
 */
export const connectorConfigPayload = ({
  datasetId,
  connectorId,
  values,
  secrets,
  operationsConfig,
  mode,
}: ConnectorPayloadArgs): unknown[] => {
  const entry = {
    id: `${datasetId}-${connectorId}`,
    connector_id: connectorId,
    connector_config: { ...values, ...(secrets ?? {}) },
    operations_config: operationsConfig ?? {},
    version: 'v2',
  };

  return mode === 'update' ? [{ value: entry, action: 'upsert' }] : [entry];
};
