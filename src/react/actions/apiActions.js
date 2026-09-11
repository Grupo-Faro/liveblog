import types from './actionTypes';

export const getEntries = (page, hash = false) => ({
  type: types.GET_ENTRIES,
  page,
  hash,
});

export const getEntriesPaginated = (page, scrollTo) => ({
  type: types.GET_ENTRIES_PAGINATED,
  page,
  scrollTo,
});

export const getEntriesSuccess = (payload, renderNewEntries) => ({
  type: types.GET_ENTRIES_SUCCESS,
  payload,
  renderNewEntries,
});

export const getEntriesFailed = () => ({
  type: types.GET_ENTRIES_FAILED,
  error: true,
});

export const loadMoreEntries = () => ({
  type: types.LOAD_MORE_ENTRIES,
});

/**
 * @param {Object} payload  Paged response anchored on the oldest entry shown.
 * @param {number} appended How many entries of the response were not on screen yet.
 */
export const loadMoreEntriesSuccess = (payload, appended = 0) => ({
  type: types.LOAD_MORE_ENTRIES_SUCCESS,
  payload,
  appended,
});

export const loadMoreEntriesFailed = () => ({
  type: types.LOAD_MORE_ENTRIES_FAILED,
  error: true,
});

export const startPolling = payload => ({
  type: types.START_POLLING,
  payload,
});

/**
 * @param {Object}  payload          Polling response.
 * @param {boolean} renderNewEntries Whether new entries go straight into the feed.
 * @param {number}  newCount         New entries in the response not on screen yet.
 */
export const pollingSuccess = (payload, renderNewEntries, newCount = 0) => ({
  type: types.POLLING_SUCCESS,
  payload,
  renderNewEntries,
  newCount,
});

export const pollingFailed = () => ({
  type: types.POLLING_FAILED,
  error: true,
});

export const cancelPolling = () => ({
  type: types.CANCEL_POLLING,
});

export const createEntry = payload => ({
  type: types.CREATE_ENTRY,
  payload,
});

export const createEntrySuccess = payload => ({
  type: types.CREATE_ENTRY_SUCCESS,
  payload,
});

export const createEntryFailed = () => ({
  type: types.CREATE_ENTRY_FAILED,
  error: true,
});

export const deleteEntry = payload => ({
  type: types.DELETE_ENTRY,
  payload,
});

export const deleteEntrySuccess = payload => ({
  type: types.DELETE_ENTRY_SUCCESS,
  payload,
});

export const deleteEntryFailed = () => ({
  type: types.DELETE_ENTRY_FAILED,
  error: true,
});

export const updateEntry = payload => ({
  type: types.UPDATE_ENTRY,
  payload,
});

export const updateEntrySuccess = payload => ({
  type: types.UPDATE_ENTRY_SUCCESS,
  payload,
});

export const updateEntryFailed = () => ({
  type: types.UPDATE_ENTRY_FAILED,
  error: true,
});

export const mergePolling = () => ({
  type: types.MERGE_POLLING,
});

export const mergePollingIntoEntries = (payload, pages) => ({
  type: types.MERGE_POLLING_INTO_ENTRIES,
  payload,
  pages,
});

