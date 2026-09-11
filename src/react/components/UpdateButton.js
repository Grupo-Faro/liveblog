import React from 'react';
import PropTypes from 'prop-types';

const UpdateButton = ({ polling = [], click, config = {} }) => {
  const count = polling.length;
  if (!(count > 0)) return false;

  const template = count > 1
    ? (config.new_updates || '{number} new updates available')
    : (config.new_update || '{number} new update available');

  return (
    <div className="liveblog-update-btn-container">
      <button
        className="liveblog-btn liveblog-update-btn"
        onClick={click}
      >
        <span className="liveblog-update-btn-dot" aria-hidden="true" />
        {template.replace('{number}', count)}
      </button>
    </div>
  );
};

UpdateButton.propTypes = {
  polling: PropTypes.array,
  click: PropTypes.func,
  config: PropTypes.object,
};

export default UpdateButton;
