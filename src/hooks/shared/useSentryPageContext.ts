import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { useLocation } from 'react-router-dom';

/**
 * Pushes the current pathname into Sentry's `page` context and drops a
 * navigation breadcrumb on every route change — so an event tells us not just
 * *who* (hashed user_id) but *where they were* before any error.
 */
export function useSentryPageContext() {
  const location = useLocation();
  useEffect(() => {
    Sentry.setContext('page', {
      pathname: location.pathname,
      search: location.search,
    });
    Sentry.addBreadcrumb({
      category: 'navigation',
      message: location.pathname,
    });
  }, [location.pathname, location.search]);
}
