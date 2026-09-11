import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { timeout, map } from 'rxjs/operators';

import { getPreview } from '../services/api';
import { triggerOembedLoad } from '../utils/utils';
import Loader from '../components/Loader';

class PreviewContainer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      error: false,
      entryContent: false,
    };
  }

  componentDidMount() {
    const { config, getEntryContent } = this.props;

    this.subscription = getPreview(getEntryContent(), config)
      .pipe(
        timeout(10000),
        map(res => res.response),
      )
      .subscribe({
        next: res => this.setState({
          entryContent: res.html,
          loading: false,
        }),
        error: () => this.setState({
          error: true,
          loading: false,
        }),
      });
  }

  componentDidUpdate(prevProps, prevState) {
    // The preview HTML carries embed markup (X/Twitter, Instagram, Facebook)
    // that only becomes a card once the provider SDK processes it, exactly as
    // EntryContainer does for published entries.
    if (this.node && this.state.entryContent && this.state.entryContent !== prevState.entryContent) {
      triggerOembedLoad(this.node);
    }
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  render() {
    const { entryContent, loading, error } = this.state;
    const { config } = this.props;

    if (loading) {
      return (
        <div className="liveblog-preview"><Loader /></div>
      );
    }

    if (error) {
      return (
        <div className="liveblog-preview liveblog-preview-error">
          {(config && config.load_error) || 'The preview could not be loaded.'}
        </div>
      );
    }

    if (!entryContent) {
      return false;
    }

    return (
      <div
        className="liveblog-preview"
        ref={(node) => { this.node = node; }}
        dangerouslySetInnerHTML={{ __html: entryContent }}
      />
    );
  }
}

PreviewContainer.propTypes = {
  getEntryContent: PropTypes.func,
  config: PropTypes.object,
};

export default PreviewContainer;
