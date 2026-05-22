"use client";

import React from "react";

type RecoverableError = Error & { digest?: string };
type ErrorFallback = React.ComponentType<{
  error: RecoverableError;
  reset: () => void;
}>;

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback: ErrorFallback;
};

type ErrorBoundaryState = {
  error: RecoverableError | null;
};

function isNotFoundOrRedirect(error: RecoverableError): boolean {
  const digest = typeof error.digest === "string" ? error.digest : "";
  return digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;") || digest.startsWith("NEXT_REDIRECT;");
}

export class ErrorBoundaryInner extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: RecoverableError): ErrorBoundaryState {
    if (isNotFoundOrRedirect(error)) {
      throw error;
    }

    return { error };
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const FallbackComponent = this.props.fallback;
      return <FallbackComponent error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ fallback, children }: ErrorBoundaryProps) {
  return <ErrorBoundaryInner fallback={fallback}>{children}</ErrorBoundaryInner>;
}

type NotFoundBoundaryProps = {
  children: React.ReactNode;
  fallback: React.ReactNode;
};

type NotFoundBoundaryState = {
  notFound: boolean;
};

class NotFoundBoundaryInner extends React.Component<NotFoundBoundaryProps, NotFoundBoundaryState> {
  state: NotFoundBoundaryState = { notFound: false };

  static getDerivedStateFromError(error: RecoverableError): NotFoundBoundaryState {
    const digest = typeof error.digest === "string" ? error.digest : "";
    if (digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")) {
      return { notFound: true };
    }

    throw error;
  }

  render() {
    return this.state.notFound ? this.props.fallback : this.props.children;
  }
}

export function NotFoundBoundary({ fallback, children }: NotFoundBoundaryProps) {
  return <NotFoundBoundaryInner fallback={fallback}>{children}</NotFoundBoundaryInner>;
}
