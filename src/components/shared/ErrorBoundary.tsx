import React from "react";
import i18n from "@/i18n";

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
              {i18n.t("errors.errorTitle", { ns: "common" })}
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              {i18n.t("errors.errorDesc", { ns: "common" })}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { window.location.href = '/'; }}
                className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                {i18n.t("errors.goHome", { ns: "common" })}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {i18n.t("errors.reload", { ns: "common" })}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
