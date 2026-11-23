import {
  Component,
  ComponentProps,
  ReactNode,
  Suspense,
  lazy,
  useState,
} from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import Loader from 'components/Loader';

// Lazy so Monaco is only downloaded when the playground opens; see docs/adr/0002-bundle-monaco.md.
const loadPlayground = () => lazy(() => import('./JSONataPlayground'));
// Shared so reopening doesn't re-suspend; replaced on retry because React caches a rejected lazy().
let sharedPlayground = loadPlayground();

interface BoundaryProps {
  children: ReactNode;
  onRetry: () => void;
  onClose?: () => void;
}

class PlaygroundLoadBoundary extends Component<
  BoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <Box p={4} textAlign="center">
          <Typography>Couldn&apos;t load the JSONata editor.</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            If it keeps failing, reload the page. Unsaved changes in this dialog
            will be lost.
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            sx={{ mt: 2 }}
          >
            <Button variant="contained" onClick={this.props.onRetry}>
              Try again
            </Button>
            {this.props.onClose && (
              <Button variant="outlined" onClick={this.props.onClose}>
                Close
              </Button>
            )}
          </Stack>
        </Box>
      );
    }
    return this.props.children;
  }
}

type PlaygroundProps = ComponentProps<ReturnType<typeof loadPlayground>>;

const LazyJSONataPlayground = (props: PlaygroundProps) => {
  const [Playground, setPlayground] = useState(() => sharedPlayground);
  const [attempt, setAttempt] = useState(0);

  const retry = () => {
    sharedPlayground = loadPlayground();
    setPlayground(() => sharedPlayground);
    setAttempt((n) => n + 1);
  };

  return (
    <PlaygroundLoadBoundary
      key={attempt}
      onRetry={retry}
      onClose={props.closeTransformations}
    >
      <Suspense
        fallback={
          <Loader
            loading={true}
            descriptionText="Loading the JSONata editor."
          />
        }
      >
        <Playground {...props} />
      </Suspense>
    </PlaygroundLoadBoundary>
  );
};

export default LazyJSONataPlayground;
