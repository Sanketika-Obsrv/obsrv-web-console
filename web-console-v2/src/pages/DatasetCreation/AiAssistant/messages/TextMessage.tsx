import { Typography } from '@mui/material';
import React from 'react';
import { Message } from '../session/types';

export interface TextMessageProps {
  message: Message;
}

/** What was said, and whether the action behind it was rejected. */
const TextMessage: React.FC<TextMessageProps> = ({ message }) => (
  <>
    <Typography variant="caption" color="text.secondary" component="div">
      {message.role}
    </Typography>
    <Typography
      variant="body2"
      color={message.failureCode ? 'error.main' : 'text.primary'}
    >
      {message.text}
    </Typography>
  </>
);

export default TextMessage;
