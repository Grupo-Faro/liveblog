import {
  applyUpdate,
  pollingApplyUpdate,
  getNewestEntry,
} from '../utils/utils';

export const initialState = {
  loading: false,
  error: false,
  entries: {},
  newestEntry: false,
  nonce: false,
  loadingMore: false,
  loadMoreError: false,
};

export const api = (state = initialState, action) => {
  switch (action.type) {
    case 'JUMP_TO_EVENT':
    case 'GET_ENTRIES':
    case 'GET_ENTRIES_PAGINATED':
      return {
        ...state,
        error: false,
        loading: true,
      };

    case 'GET_ENTRIES_SUCCESS':
      return {
        ...state,
        error: false,
        loading: false,
        entries: applyUpdate({}, action.payload.entries),
        newestEntry: getNewestEntry(
          state.newestEntry,
          action.payload.entries[0],
        ),
      };

    case 'GET_ENTRIES_FAILED':
      return {
        ...state,
        loading: false,
        error: true,
      };

    case 'LOAD_MORE_ENTRIES':
      return {
        ...state,
        loadingMore: true,
        loadMoreError: false,
      };

    case 'LOAD_MORE_ENTRIES_SUCCESS':
      // applyUpdate keeps existing keys in place and appends unknown ones, so
      // the older entries land below everything already on screen.
      return {
        ...state,
        loadingMore: false,
        loadMoreError: false,
        entries: applyUpdate(state.entries, action.payload.entries || []),
      };

    case 'LOAD_MORE_ENTRIES_FAILED':
      return {
        ...state,
        loadingMore: false,
        loadMoreError: true,
      };

    case 'POLLING_SUCCESS':
      return {
        ...state,
        error: false,
        entries: pollingApplyUpdate(
          state.entries,
          action.payload.entries,
          action.renderNewEntries,
        ),
        newestEntry: action.renderNewEntries
          ? getNewestEntry(
            state.newestEntry,
            action.payload.entries[action.payload.entries.length - 1],
            state.entries,
          )
          : state.newestEntry,
      };

    case 'CREATE_ENTRY_SUCCESS':
      return {
        ...state,
        error: false,
        nonce: action.payload.nonce,
      };

    case 'CREATE_ENTRY_FAILED':
      return {
        ...state,
        error: true,
      };

    case 'DELETE_ENTRY_SUCCESS':
      return {
        ...state,
        error: false,
        nonce: action.payload.nonce,
      };

    case 'DELETE_ENTRY_FAILED':
      return {
        ...state,
        error: true,
      };

    case 'UPDATE_ENTRY_SUCCESS':
      return {
        ...state,
        error: false,
        nonce: action.payload.nonce,
      };

    case 'UPDATE_ENTRY_FAILED':
      return {
        ...state,
        error: true,
      };

    case 'MERGE_POLLING_INTO_ENTRIES':
      return {
        ...state,
        entries: pollingApplyUpdate(
          state.entries,
          action.payload,
          true,
        ),
        newestEntry: action.payload[action.payload.length - 1],
      };

    case 'SCROLL_TO_ENTRY':
      return {
        ...state,
        entries: {
          ...state.entries,
          [action.payload]: {
            ...state.entries[action.payload],
            activateScrolling: true,
          },
        },
      };

    case 'RESET_SCROLL_ON_ENTRY':
      return {
        ...state,
        entries: {
          ...state.entries,
          [action.payload]: {
            ...state.entries[action.payload],
            activateScrolling: false,
          },
        },
      };

    case 'LOAD_CONFIG':
      return {
        ...state,
        newestEntry: {
          id: action.payload.latest_entry_id,
          timestamp: parseInt(action.payload.latest_entry_timestamp, 10),
        },
      };

    default:
      return state;
  }
};
