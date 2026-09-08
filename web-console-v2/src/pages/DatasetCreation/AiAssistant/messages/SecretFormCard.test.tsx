import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UiSpec } from '../engine/connectors';
import SecretFormCard from './SecretFormCard';

const POSTGRES: UiSpec = {
  title: 'Postgres',
  type: 'object',
  properties: {
    source_database_host: { type: 'string', title: 'Host', uiIndex: 1 },
    source_database_pwd: {
      type: 'string',
      title: 'Password',
      format: 'password',
      uiIndex: 2,
    },
  },
  required: ['source_database_host', 'source_database_pwd'],
};

const KAFKA: UiSpec = {
  type: 'object',
  properties: {
    source_kafka_topic: { type: 'string', title: 'Topic', uiIndex: 1 },
    source_kafka_ssl_truststore_base64: {
      type: 'string',
      title: 'Truststore',
      uiIndex: 2,
    },
    source_kafka_ssl_key_password: {
      type: 'string',
      title: 'Key password',
      format: 'password',
      uiIndex: 3,
    },
  },
  required: [],
};

const show = (uiSpec: UiSpec, onSubmit = jest.fn()) => {
  render(
    <SecretFormCard
      connectorId="postgres-connector-1.0.0"
      connectorName="Postgres"
      uiSpec={uiSpec}
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit };
};

describe('which fields it asks for', () => {
  it('asks for the credential', () => {
    show(POSTGRES);

    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  /**
   * Narrowing the schema to the secrets is what stops the form re-collecting
   * — and re-submitting — a value the conversation already set.
   */
  it('does not ask again for something already set in chat', () => {
    show(POSTGRES);

    expect(screen.queryByLabelText(/^host/i)).not.toBeInTheDocument();
  });

  it('asks for cert material that is not marked password', () => {
    show(KAFKA);

    expect(screen.getByLabelText(/truststore/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/key password/i)).toBeInTheDocument();
  });

  it('does not ask for the topic, which is not a secret', () => {
    show(KAFKA);

    expect(screen.queryByLabelText(/topic/i)).not.toBeInTheDocument();
  });

  it('says so when the connector needs no credentials', () => {
    show({ type: 'object', properties: { host: { type: 'string' } } });

    expect(screen.getByText(/no credentials/i)).toBeInTheDocument();
  });
});

/** A credential rendered as readable text is a credential on a shared screen. */
describe('how the values are rendered', () => {
  it('masks a password field', () => {
    show(POSTGRES);

    expect(screen.getByLabelText(/password/i)).toHaveAttribute(
      'type',
      'password',
    );
  });
});

describe('handing the values over', () => {
  it('submits what was typed', async () => {
    const { onSubmit } = show(POSTGRES);

    await userEvent.type(screen.getByLabelText(/password/i), 'hunter2');
    await userEvent.click(
      screen.getByRole('button', { name: /save credentials/i }),
    );

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ source_database_pwd: 'hunter2' }),
    );
  });

  it('confirms without repeating the value back', async () => {
    show(POSTGRES);

    await userEvent.type(screen.getByLabelText(/password/i), 'hunter2');
    await userEvent.click(
      screen.getByRole('button', { name: /save credentials/i }),
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('hunter2');
  });

  it('clears the field once handed over', async () => {
    show(POSTGRES);

    await userEvent.type(screen.getByLabelText(/password/i), 'hunter2');
    await userEvent.click(
      screen.getByRole('button', { name: /save credentials/i }),
    );

    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it('tells the user the value was not kept in the browser', () => {
    show(POSTGRES);

    expect(screen.getByText(/not saved in this browser/i)).toBeInTheDocument();
  });
});
