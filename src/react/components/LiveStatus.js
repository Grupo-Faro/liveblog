import React from 'react';
import PropTypes from 'prop-types';

// Status strip shown at the top of the feed: a pulsing dot while the liveblog
// is open, a neutral one once it has been archived.
const LiveStatus = ({ state = 'enable', config = {} }) => {
  const isArchived = state === 'archive';
  const label = isArchived
    ? (config.status_archived || 'This liveblog has ended')
    : (config.status_live || 'Live');

  return (
    <div className={`liveblog-status ${isArchived ? 'is-archive' : 'is-live'}`}>
      <span className="liveblog-status-dot" aria-hidden="true" />
      <span className="liveblog-status-label">{label}</span>
    </div>
  );
};

LiveStatus.propTypes = {
  state: PropTypes.string,
  config: PropTypes.object,
};

export default LiveStatus;
