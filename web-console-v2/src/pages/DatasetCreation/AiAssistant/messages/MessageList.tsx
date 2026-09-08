/**
 * The transcript.
 *
 * Every card routes its choices through one `onAction`, which is what makes
 * the whole workflow reachable by clicking — the rule-only tier is a
 * first-class mode, not a degraded one.
 */
import { List, ListItem, Stack } from '@mui/material';
import React from 'react';
import { Action } from '../engine/actions';
import { Message } from '../session/types';
import ApiErrorCard from './ApiErrorCard';
import ChoiceCard from './ChoiceCard';
import ConfirmCard from './ConfirmCard';
import ConflictCard from './ConflictCard';
import ExpressionResultCard from './ExpressionResultCard';
import FieldTableCard from './FieldTableCard';
import FileDropCard from './FileDropCard';
import SamplePreviewCard from './SamplePreviewCard';
import TextMessage from './TextMessage';
import { MessageCard } from './types';

export interface MessageListProps {
  messages: Message[];
  onAction: (action: Action) => void;
  /** Receives a sample the user supplied through a `file_drop` card. */
  onSampleRows: (rows: Record<string, unknown>[], file: File) => void;
}

interface CardProps {
  card: MessageCard;
  /** True once this turn has dispatched an action; controls are withdrawn. */
  answered: boolean;
  onAction: (action: Action) => void;
  onSampleRows: MessageListProps['onSampleRows'];
}

const Card: React.FC<CardProps> = ({
  card,
  answered,
  onAction,
  onSampleRows,
}) => {
  switch (card.kind) {
    case 'file_drop':
      return <FileDropCard prompt={card.prompt} onRows={onSampleRows} />;

    case 'choice':
      return (
        <ChoiceCard
          prompt={card.prompt}
          options={card.options}
          onAction={onAction}
          answered={answered}
        />
      );

    case 'confirm':
      return (
        <ConfirmCard
          title={card.title}
          summary={card.summary}
          confirmLabel={card.confirmLabel}
          confirmAction={card.confirmAction}
          onAction={onAction}
        />
      );

    case 'conflict':
      return (
        <ConflictCard
          path={card.path}
          candidates={card.candidates}
          valuesAtRisk={card.valuesAtRisk}
          onAction={onAction}
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
      return <ApiErrorCard diagnosis={card.diagnosis} onAction={onAction} />;

    default:
      // The union is exhausted above; this keeps that true as kinds are added.
      return null;
  }
};

const MessageList: React.FC<MessageListProps> = ({
  messages,
  onAction,
  onSampleRows,
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
                  answered={Boolean(message.action)}
                  onAction={onAction}
                  onSampleRows={onSampleRows}
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
