/**
 * The transcript.
 *
 * Nothing here is clickable except the credential form. Cards carry the
 * options, counts and rows a question is about — dense data reads badly as
 * prose — but every one of them is answered by typing, and the actions on
 * the card exist so a typed answer can be matched against them.
 *
 * The credential form is the exception on purpose: a password typed into the
 * chat box would be a user message, and user messages are persisted and
 * exported. It submits through `onSubmitSecrets`, never as an action.
 */
import { List, ListItem, Stack } from '@mui/material';
import React from 'react';
import { UiSpec } from '../engine/connectors';
import { Message } from '../session/types';
import ApiErrorCard from './ApiErrorCard';
import ChoiceCard from './ChoiceCard';
import ConfirmCard from './ConfirmCard';
import ConflictCard from './ConflictCard';
import ExpressionResultCard from './ExpressionResultCard';
import FieldTableCard from './FieldTableCard';
import SamplePreviewCard from './SamplePreviewCard';
import SecretFormCard from './SecretFormCard';
import TextMessage from './TextMessage';
import { MessageCard } from './types';

export interface MessageListProps {
  messages: Message[];
  /**
   * Receives connector credentials from a `secret_form` card. Separate from
   * `onAction` on purpose: credentials must not travel as an action, because
   * actions are recorded in the transcript.
   */
  onSubmitSecrets?: (secrets: Record<string, unknown>) => void;
  /**
   * The chosen connector's schema, read live. Not carried by the card,
   * because the card is persisted and the scrubber would redact it.
   */
  connectorUiSpec?: UiSpec;
}

interface CardProps {
  card: MessageCard;
  onSubmitSecrets: MessageListProps['onSubmitSecrets'];
  connectorUiSpec: MessageListProps['connectorUiSpec'];
}

const Card: React.FC<CardProps> = ({
  card,
  onSubmitSecrets,
  connectorUiSpec,
}) => {
  switch (card.kind) {
    case 'choice':
      return <ChoiceCard prompt={card.prompt} options={card.options} />;

    case 'confirm':
      return <ConfirmCard title={card.title} summary={card.summary} />;

    case 'conflict':
      return (
        <ConflictCard
          path={card.path}
          candidates={card.candidates}
          valuesAtRisk={card.valuesAtRisk}
        />
      );

    case 'field_table':
      return <FieldTableCard caption={card.caption} fields={card.fields} />;

    case 'sample_preview':
      return <SamplePreviewCard rows={card.rows} totalRows={card.totalRows} />;

    case 'expression_result':
      return (
        <ExpressionResultCard
          expression={card.expression}
          dataType={card.dataType}
          results={card.results}
          error={card.error}
        />
      );

    case 'api_error':
      return <ApiErrorCard diagnosis={card.diagnosis} />;

    case 'secret_form':
      return (
        <SecretFormCard
          connectorId={card.connectorId}
          connectorName={card.connectorName}
          uiSpec={connectorUiSpec ?? {}}
          onSubmit={onSubmitSecrets ?? (() => undefined)}
        />
      );

    default:
      // The union is exhausted above; this keeps that true as kinds are added.
      return null;
  }
};

const MessageList: React.FC<MessageListProps> = ({
  messages,
  onSubmitSecrets,
  connectorUiSpec,
}) => {
  if (messages.length === 0) return null;

  return (
    <List dense disablePadding>
      {messages.map((message) => (
        <ListItem
          key={message.id}
          disableGutters
          data-role={message.role}
          data-failed={message.failureCode ? 'true' : undefined}
          sx={{ display: 'block' }}
        >
          <Stack spacing={0.5}>
            <TextMessage message={message} />
            {message.card && (
              <div data-testid={`card-${message.card.kind}`}>
                <Card
                  card={message.card}
                  onSubmitSecrets={onSubmitSecrets}
                  connectorUiSpec={connectorUiSpec}
                />
              </div>
            )}
          </Stack>
        </ListItem>
      ))}
    </List>
  );
};

export default MessageList;
