import React from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import * as apiActions from '../actions/apiActions';

// "Load more" replaces page navigation: older entries are appended below the
// feed instead of swapping the page, so readers never lose what they were
// looking at.
const LoadMoreContainer = ({ hasMore, loading, error, shown, total, config, loadMoreEntries }) => {
  if (!hasMore && !error) {
    return null;
  }

  const label = loading
    ? (config.loading || 'Loading…')
    : (config.load_more || 'Load more updates');
  const showing = (config.showing_count || 'Showing {shown} of {total}')
    .replace('{shown}', shown)
    .replace('{total}', Math.max(total, shown));

  return (
    <div className="liveblog-load-more">
      <p className="liveblog-load-more-count">{showing}</p>
      {error && (
        <p className="liveblog-load-more-error" role="alert">
          {config.load_more_error || 'Could not load more updates. Please try again.'}
        </p>
      )}
      <button
        type="button"
        className="liveblog-btn liveblog-load-more-btn"
        disabled={loading}
        aria-busy={loading}
        onClick={() => loadMoreEntries()}
      >
        {label}
      </button>
    </div>
  );
};

LoadMoreContainer.propTypes = {
  hasMore: PropTypes.bool,
  loading: PropTypes.bool,
  error: PropTypes.bool,
  shown: PropTypes.number,
  total: PropTypes.number,
  config: PropTypes.object,
  loadMoreEntries: PropTypes.func,
};

const mapStateToProps = state => ({
  hasMore: state.pagination.hasMore,
  loading: state.api.loadingMore,
  error: state.api.loadMoreError,
  shown: Object.keys(state.api.entries).length,
  total: state.pagination.total,
  config: state.config,
});

const mapDispatchToProps = dispatch =>
  bindActionCreators({
    loadMoreEntries: apiActions.loadMoreEntries,
  }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(LoadMoreContainer);
