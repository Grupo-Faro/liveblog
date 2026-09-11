import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as apiActions from '../actions/apiActions';
import * as userActions from '../actions/userActions';

class PaginationContainer extends Component {
  render() {
    const { page, pages, getEntriesPaginated, config } = this.props;

    // A single page needs no pagination chrome.
    if (!pages || pages <= 1) return null;

    const isFirstPage = (page === 1);
    const isLastPage = (page === pages);
    const hiddenClass = hidden => (hidden ? 'liveblog-btn--hide' : '');
    const pageOf = (config.pagination_page_of || 'Page {page} of {pages}')
      .replace('{page}', page)
      .replace('{pages}', pages);

    return (
      <nav className="liveblog-pagination" aria-label={pageOf}>
        <div>
          <button
            disabled={isFirstPage}
            className={`liveblog-btn liveblog-pagination-btn liveblog-pagination-first ${hiddenClass(isFirstPage)}`}
            onClick={() => getEntriesPaginated(1, 'first')}
          >
            {config.pagination_first || 'First'}
          </button>
          <button
            disabled={isFirstPage}
            className={`liveblog-btn liveblog-pagination-btn liveblog-pagination-prev ${hiddenClass(isFirstPage)}`}
            onClick={() => getEntriesPaginated((page - 1), 'last')}
          >
            {config.pagination_prev || 'Previous'}
          </button>
        </div>
        <span className="liveblog-pagination-pages">{pageOf}</span>
        <div>
          <button
            disabled={isLastPage}
            className={`liveblog-btn liveblog-pagination-btn liveblog-pagination-next ${hiddenClass(isLastPage)}`}
            onClick={() => getEntriesPaginated((page + 1), 'first')}
          >
            {config.pagination_next || 'Next'}
          </button>
          <button
            disabled={isLastPage}
            className={`liveblog-btn liveblog-pagination-btn liveblog-pagination-last ${hiddenClass(isLastPage)}`}
            onClick={() => getEntriesPaginated(pages, 'first')}
          >
            {config.pagination_last || 'Last'}
          </button>
        </div>
      </nav>
    );
  }
}

PaginationContainer.propTypes = {
  page: PropTypes.number,
  pages: PropTypes.number,
  getEntriesPaginated: PropTypes.func,
  config: PropTypes.object,
};

PaginationContainer.defaultProps = {
  config: {},
};

const mapStateToProps = state => ({
  page: state.pagination.page,
  pages: state.pagination.pages,
  config: state.config,
});

const mapDispatchToProps = dispatch =>
  bindActionCreators({
    ...apiActions,
    ...userActions,
  }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(PaginationContainer);
