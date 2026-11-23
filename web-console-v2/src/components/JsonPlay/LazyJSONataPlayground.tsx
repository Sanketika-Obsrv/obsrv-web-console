import { Component, ComponentProps, ReactNode, Suspense, lazy } from 'react';
import { Box, Button, Typography } from '@mui/material';
import Loader from 'components/Loader';

// Lazy so Monaco is only downloaded when the playground opens; see docs/adr/0002-bundle-monaco.md.
const JSONataPlayground = lazy(() => import('./JSONataPlayground'));

class PlaygroundLoadBoundary extends Component<
  { children: ReactNode },
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
          <Typography>
            Couldn&apos;t load the JSONata editor. Check your connection and
            reload the page.
          </Typography>
          <Button
            sx={{ mt: 2 }}
            variant="outlined"
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

const LazyJSONataPlayground = (
  props: ComponentProps<typeof JSONataPlayground>,
) => (
  <PlaygroundLoadBoundary>
    <Suspense
      fallback={
        <Loader loading={true} descriptionText="Loading the JSONata editor." />
      }
    >
      <JSONataPlayground {...props} />
    </Suspense>
  </PlaygroundLoadBoundary>
);

export default LazyJSONataPlayground;
