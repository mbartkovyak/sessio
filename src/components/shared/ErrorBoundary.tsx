import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-8 text-center shadow-lg">
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              An unexpected error occurred. Please reload and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
