import {
  getPollingPages,
} from '../utils/utils';

export const initialState = {
  page: 1,
  pages: 1,
  total: 0,
  // Whether older entries exist below the ones on screen ("load more").
  hasMore: false,
};

export const pagination = (state = initialState, action) => {
  switch (action.type) {
    case 'GET_ENTRIES':
      return {
        ...state,
        page: action.page,
      };

    case 'GET_ENTRIES_SUCCESS':
      return {
        ...state,
        pages: Math.max(action.payload.pages, 1),
        page: action.payload.page,
        total: action.payload.total || 0,
        hasMore: (action.payload.page || 1) < Math.max(action.payload.pages, 1),
      };

    case 'LOAD_MORE_ENTRIES_SUCCESS':
      // The response is anchored on the oldest entry shown, so `pages` counts
      // from there: more than one page means something older is still left.
      // A response that added nothing (stale anchor) stops offering the button.
      return {
        ...state,
        hasMore: action.appended > 0 && Math.max(action.payload.pages, 1) > 1,
      };

    case 'MERGE_POLLING_INTO_ENTRIES':
      // Count new entries from payload (entries with type 'new')
      const newCount = action.payload.filter(e => e.type === 'new').length;
      return {
        ...state,
        pages: action.pages,
        total: state.total + newCount,
      };

    case 'CREATE_ENTRY_SUCCESS':
      return {
        ...state,
        total: state.total + 1,
      };

    case 'DELETE_ENTRY_SUCCESS':
      return {
        ...state,
        total: Math.max(0, state.total - 1),
      };

    case 'POLLING_SUCCESS':
      return {
        ...state,
        pages: action.renderNewEntries
          ? getPollingPages(state.pages, action.payload.pages)
          : state.pages,
        total: action.renderNewEntries
          ? state.total + (action.newCount || 0)
          : state.total,
      };

    default:
      return state;
  }
};
