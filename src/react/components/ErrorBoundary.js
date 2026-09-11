import { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * Catches render errors so one broken entry (or an unsupported browser API)
 * does not unmount the whole liveblog and leave the container empty.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (window.console && window.console.error) {
      // eslint-disable-next-line no-console
      console.error('Liveblog render error:', error, info);
    }
  }

  render() {
    const { hasError } = this.state;
    const { fallback, children } = this.props;

    if (hasError) {
      return fallback || null;
    }

    return children;
  }
}

ErrorBoundary.propTypes = {
  fallback: PropTypes.node,
  children: PropTypes.node,
};

export default ErrorBoundary;
