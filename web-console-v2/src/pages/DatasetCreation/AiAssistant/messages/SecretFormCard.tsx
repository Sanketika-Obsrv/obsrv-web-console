import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import ConnectorForm, { FormData } from 'components/Form/ConnectorForm';
import React, { useState } from 'react';
import {
  PropSpec,
  UiSpec,
  secretProps,
  secretSchema,
} from '../engine/connectors';

export interface SecretFormCardProps {
  connectorId: string;
  connectorName?: string;
  uiSpec: UiSpec;
  /**
   * Called with the credentials once. The caller is expected to send them
   * straight to the API and keep nothing.
   */
  onSubmit: (secrets: FormData) => void;
}

/**
 * Collects a connector's credentials.
 *
 * Everything about this card exists to keep secrets out of places they must
 * never reach:
 *
 * - The values live in local component state and are handed over once. They
 *   are never appended to the transcript, so they cannot be persisted with
 *   the session or read back into a model prompt.
 * - The schema is narrowed to the secret properties alone, so the form
 *   cannot collect — or re-submit — anything the conversation already set.
 * - `format: 'password'` becomes a password widget, so they are not rendered
 *   as readable text on screen.
 *
 * The form itself is the wizard's own `ConnectorForm`, so the fields, the
 * validation and the widgets are identical to the ones outside chat.
 */
const SecretFormCard: React.FC<SecretFormCardProps> = ({
  connectorId,
  connectorName,
  uiSpec,
  onSubmit,
}) => {
  // Deliberately local: this state is the only place the values exist, and it
  // goes away with the card.
  const [values, setValues] = useState<FormData>({});
  const [submitted, setSubmitted] = useState(false);

  const schema = secretSchema(uiSpec);
  const fields = secretProps(uiSpec);

  const uiSchema: UiSchema = Object.fromEntries(
    fields.map((prop) => [
      prop.key,
      {
        'ui:widget':
          (prop.spec as PropSpec).format === 'password'
            ? 'password'
            : undefined,
      },
    ]),
  );

  if (fields.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="body2">
          {`${connectorName ?? connectorId} needs no credentials.`}
        </Typography>
      </Paper>
    );
  }

  if (submitted) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Alert severity="success">
          {`Credentials for ${
            connectorName ?? connectorId
          } were sent to the server and not stored here.`}
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1}>
        <Typography variant="subtitle2">
          {`Credentials for ${connectorName ?? connectorId}`}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          These are sent straight to the server. They are not written to the
          conversation and not saved in this browser.
        </Typography>

        <ConnectorForm
          schema={{
            title: '',
            schema: schema as RJSFSchema,
            uiSchema,
          }}
          formData={values}
          setFormData={setValues}
          onChange={(formData) => setValues(formData)}
        />

        <Button
          size="small"
          variant="contained"
          sx={{ alignSelf: 'flex-start' }}
          onClick={() => {
            onSubmit(values);
            // Dropped as soon as they are handed over.
            setValues({});
            setSubmitted(true);
          }}
        >
          Save credentials
        </Button>
      </Stack>
    </Paper>
  );
};

export default SecretFormCard;
