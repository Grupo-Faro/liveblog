import React from 'react';
import PropTypes from 'prop-types';

import EntryContainer from '../containers/EntryContainer';
import ErrorBoundary from './ErrorBoundary';

const Entries = ({ loading, entries, emptyMessage = 'There are no entries on this page.' }) => (
  <div className={loading ? 'liveblog-feed is-loading' : 'liveblog-feed'}>
    {
      entries.length === 0 && !loading
        ? <div className="liveblog-empty-message">{emptyMessage}</div>
        : entries.map(entry => (
          <ErrorBoundary key={entry.id}>
            <EntryContainer entry={entry} />
          </ErrorBoundary>
        ))
    }
  </div>
);

Entries.propTypes = {
  entries: PropTypes.array,
  loading: PropTypes.bool,
  emptyMessage: PropTypes.string,
};

export default Entries;
