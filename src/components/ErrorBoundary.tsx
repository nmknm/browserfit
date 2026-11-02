import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Empty } from './ui/Controls';

interface State {
  failed: boolean;
}

/**
 * Catches a page that fails to load or render, most often because the site was updated while this tab was open
 * and an old script file no longer exists. It offers a reload instead of a blank screen.
 */
class Boundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page failed to render', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="container page">
        <div className="panel">
          <Empty
            title="This page didn’t load"
            action={
              <button type="button" className="btn btn--primary" onClick={() => location.reload()}>
                Reload page
              </button>
            }
          >
            Browserfit may have been updated while this tab was open. Reload to get the latest version.
          </Empty>
        </div>
      </div>
    );
  }
}

/** One boundary per page, so moving to another page clears a failure. */
export function RouteBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary key={pathname}>{children}</Boundary>;
}
