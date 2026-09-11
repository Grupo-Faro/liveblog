import {
  applyUpdate,
  pollingApplyUpdate,
  getNewestEntry,
} from '../../utils/utils';

import apiData from '../../mockData/reducers/api';
import pollingData from '../../mockData/reducers/polling';
import { initialState, api } from '../api';
import {
  getEntries,
  getEntriesSuccess,
  getEntriesFailed,
  pollingSuccess,
  loadMoreEntries,
  loadMoreEntriesSuccess,
  loadMoreEntriesFailed,
} from '../../actions/apiActions';

describe('api reducer', () => {
  it('should return the initial state', () => {
    expect(api(undefined, {})).toEqual(initialState);
  });

  const stateAfterGetEntries = {
    ...initialState,
    error: false,
    loading: true,
  };

  it('should handle GET_ENTRIES', () => {
    expect(api(initialState, getEntries())).toEqual(stateAfterGetEntries);
  });

  it('should handle GET_ENTRIES_FAILED', () => {
    expect(api(stateAfterGetEntries, getEntriesFailed())).toEqual({
      ...stateAfterGetEntries,
      loading: false,
      error: true,
    });
  });

  const stateAfterGetEntriesSuccess = {
    ...stateAfterGetEntries,
    error: false,
    loading: false,
    entries: applyUpdate({}, apiData.entries),
    newestEntry: getNewestEntry(
      stateAfterGetEntries.newestEntry,
      apiData.entries[0],
    ),
  };

  it('should handle GET_ENTRIES_SUCCESS', () => {
    expect(
      api(stateAfterGetEntries, getEntriesSuccess(apiData, true)),
    ).toEqual(stateAfterGetEntriesSuccess);
  });

  const shouldRenderNewEntries = true;

  const stateAfterPollingSuccess = {
    ...stateAfterGetEntriesSuccess,
    error: false,
    entries: pollingApplyUpdate(
      stateAfterGetEntriesSuccess.entries,
      pollingData.entries,
      shouldRenderNewEntries,
    ),
    newestEntry: shouldRenderNewEntries
      ? getNewestEntry(stateAfterGetEntriesSuccess.newestEntry, pollingData.entries[0])
      : stateAfterGetEntriesSuccess.newestEntry,
  };

  it('should handle POLLING_SUCCESS', () => {
    expect(
      api(stateAfterGetEntriesSuccess, pollingSuccess(pollingData, shouldRenderNewEntries)),
    ).toEqual(stateAfterPollingSuccess);
  });

  describe('load more', () => {
    const loaded = api(initialState, getEntriesSuccess(apiData, true));

    it('flags the request and appends older entries below the existing ones', () => {
      const loading = api(loaded, loadMoreEntries());
      expect(loading.loadingMore).toBe(true);

      const existing = Object.values(loaded.entries);
      const anchor = existing[existing.length - 1];
      const response = {
        entries: [
          { ...anchor },
          { id: 'older-1', type: 'new', timestamp: 2 },
          { id: 'older-2', type: 'new', timestamp: 1 },
        ],
        page: 1,
        pages: 1,
        total: 3,
      };

      const next = api(loading, loadMoreEntriesSuccess(response, 2));
      const keys = Object.keys(next.entries);

      expect(next.loadingMore).toBe(false);
      expect(next.loadMoreError).toBe(false);
      expect(keys.slice(0, existing.length)).toEqual(Object.keys(loaded.entries));
      expect(keys.slice(-2)).toEqual(['id_older-1', 'id_older-2']);
    });

    it('records a failure and releases the button', () => {
      expect(api(api(loaded, loadMoreEntries()), loadMoreEntriesFailed())).toMatchObject({
        loadingMore: false,
        loadMoreError: true,
      });
    });
  });
});
