import { initialState, pagination } from '../pagination';
import { getEntriesSuccess, pollingSuccess, loadMoreEntriesSuccess } from '../../actions/apiActions';
import apiData from '../../mockData/reducers/api';
import pollingData from '../../mockData/reducers/polling';
import { getPollingPages } from '../../utils/utils';

describe('pagination reducer', () => {
  it('should return the initial state', () => {
    expect(pagination(undefined, {})).toEqual(initialState);
  });

  const shouldRenderNewEntries = true;
  const stateAfterGetEntriesSuccess = {
    ...initialState,
    pages: Math.max(apiData.pages, 1),
    page: apiData.page,
    hasMore: apiData.page < Math.max(apiData.pages, 1),
  };

  it('should handle GET_ENTRIES_SUCCESS', () => {
    expect(
      pagination(initialState, getEntriesSuccess(apiData, shouldRenderNewEntries)),
    ).toEqual(stateAfterGetEntriesSuccess);
  });

  const stateAfterPollingSuccess = {
    ...stateAfterGetEntriesSuccess,
    pages: shouldRenderNewEntries
      ? getPollingPages(stateAfterGetEntriesSuccess.pages, pollingData.pages)
      : pollingData.pages,
  };

  it('should handle POLLING_SUCCESS', () => {
    expect(
      pagination(stateAfterGetEntriesSuccess, pollingSuccess(pollingData, shouldRenderNewEntries)),
    ).toEqual(stateAfterPollingSuccess);
  });

  it('should count newly rendered polling entries in the total', () => {
    const loaded = { ...initialState, total: 61 };
    expect(pagination(loaded, pollingSuccess({ entries: [], pages: 2 }, true, 3)).total).toBe(64);
    // Buffered behind the "new updates" button: counted when merged, not now.
    expect(pagination(loaded, pollingSuccess({ entries: [], pages: 2 }, false, 3)).total).toBe(61);
  });

  describe('LOAD_MORE_ENTRIES_SUCCESS', () => {
    const loaded = pagination(initialState, getEntriesSuccess(apiData, shouldRenderNewEntries));

    it('keeps offering more while pages remain below the anchor', () => {
      const response = { entries: [], page: 1, pages: 2, total: 60 };
      expect(pagination(loaded, loadMoreEntriesSuccess(response, 49)).hasMore).toBe(true);
    });

    it('stops when the anchored response fits in one page', () => {
      const response = { entries: [], page: 1, pages: 1, total: 12 };
      expect(pagination(loaded, loadMoreEntriesSuccess(response, 11)).hasMore).toBe(false);
    });

    it('stops when nothing new was appended', () => {
      const response = { entries: [], page: 1, pages: 2, total: 60 };
      expect(pagination(loaded, loadMoreEntriesSuccess(response, 0)).hasMore).toBe(false);
    });
  });
});
