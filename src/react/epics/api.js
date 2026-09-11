/* eslint-disable import/prefer-default-export */

import { combineEpics, ofType } from 'redux-observable';
import { of, concat } from 'rxjs';
import { switchMap, timeout, map, catchError, mergeMap, exhaustMap } from 'rxjs/operators';

import types from '../actions/actionTypes';

import {
  getEntriesSuccess,
  getEntriesFailed,
  loadMoreEntriesSuccess,
  loadMoreEntriesFailed,
  pollingSuccess,
  createEntrySuccess,
  createEntryFailed,
  updateEntrySuccess,
  updateEntryFailed,
  deleteEntrySuccess,
  deleteEntryFailed,
} from '../actions/apiActions';

import {
  jumpToEvent,
} from '../actions/eventsActions';

import {
  getEntries,
  getOlderEntries,
  createEntry,
  updateEntry,
  deleteEntry,
} from '../services/api';

import {
  shouldRenderNewEntries,
  getScrollToId,
  getLastOfObject,
} from '../utils/utils';

import {
  scrollToEntry,
} from '../actions/userActions';

const getEntriesEpic = (action$, state$) =>
  action$.pipe(
    ofType(types.GET_ENTRIES),
    switchMap(({ page, hash }) => {
      /**
       * If there is a has in the url, we check that it is a number
       * and then we jump to the that entry. If the number isn't a valid
       * id of an entry the jumpToEvent api will return the first page.
       */
      if (hash) {
        const id = hash.split('#')[1];
        if (!isNaN(id)) return of(jumpToEvent(id));
      }

      return getEntries(page, state$.value.config, state$.value.api.newestEntry).pipe(
        timeout(10000),
        map(res =>
          getEntriesSuccess(
            res.response,
            shouldRenderNewEntries(
              state$.value.pagination.page,
              state$.value.api.entries,
              state$.value.polling.entries,
            ),
          ),
        ),
        catchError(error => of(getEntriesFailed(error))),
      );
    }),
  );

const getPaginatedEntriesEpic = (action$, state$) =>
  action$.pipe(
    ofType(types.GET_ENTRIES_PAGINATED),
    switchMap(({ page, scrollTo }) =>
      getEntries(page, state$.value.config, state$.value.api.newestEntry).pipe(
        timeout(10000),
        mergeMap(res =>
          concat(
            of(getEntriesSuccess(
              res.response,
              shouldRenderNewEntries(
                state$.value.pagination.page,
                state$.value.api.entries,
                state$.value.polling.entries,
              ),
            )),
            of(scrollToEntry(getScrollToId(res.response.entries, scrollTo))),
          ),
        ),
        catchError(error => of(getEntriesFailed(error))),
      ),
    ),
  );

/**
 * "Load more": fetch the page that starts at the oldest entry on screen and
 * append whatever was not shown yet. exhaustMap ignores clicks while a request
 * is in flight.
 */
const loadMoreEntriesEpic = (action$, state$) =>
  action$.pipe(
    ofType(types.LOAD_MORE_ENTRIES),
    exhaustMap(() => {
      const { api: apiState, config } = state$.value;
      const oldest = getLastOfObject(apiState.entries);

      if (!oldest) {
        return of(loadMoreEntriesFailed());
      }

      return getOlderEntries(oldest, config).pipe(
        timeout(10000),
        map((res) => {
          const known = state$.value.api.entries;
          const appended = (res.response.entries || []).filter(
            entry => !Object.prototype.hasOwnProperty.call(known, `id_${entry.id}`),
          ).length;

          return loadMoreEntriesSuccess(res.response, appended);
        }),
        catchError(error => of(loadMoreEntriesFailed(error))),
      );
    }),
  );

const createEntryEpic = (action$, state$) =>
  action$.pipe(
    ofType(types.CREATE_ENTRY),
    switchMap(({ payload }) =>
      createEntry(payload, state$.value.config, state$.value.api.nonce).pipe(
        timeout(10000),
        map(res => createEntrySuccess(res.response)),
        catchError(error => of(createEntryFailed(error))),
      ),
    ),
  );

const updateEntryEpic = (action$, state$) =>
  action$.pipe(
    ofType(types.UPDATE_ENTRY),
    switchMap(({ payload }) =>
      updateEntry(payload, state$.value.config, state$.value.api.nonce).pipe(
        timeout(10000),
        map(res => updateEntrySuccess(res.response)),
        catchError(error => of(updateEntryFailed(error))),
      ),
    ),
  );

const deleteEntryEpic = (action$, state$) =>
  action$.pipe(
    ofType(types.DELETE_ENTRY),
    switchMap(({ payload }) =>
      deleteEntry(payload, state$.value.config, state$.value.api.nonce).pipe(
        timeout(10000),
        map(res => deleteEntrySuccess(res.response)),
        catchError(error => of(deleteEntryFailed(error))),
      ),
    ),
  );

const getEntriesAfterChangeEpic = action$ =>
  action$.pipe(
    ofType(types.CREATE_ENTRY_SUCCESS, types.UPDATE_ENTRY_SUCCESS, types.DELETE_ENTRY_SUCCESS),
    map(({ payload }) => pollingSuccess(payload, true)),
  );

export default combineEpics(
  getEntriesEpic,
  getPaginatedEntriesEpic,
  loadMoreEntriesEpic,
  createEntryEpic,
  updateEntryEpic,
  deleteEntryEpic,
  getEntriesAfterChangeEpic,
);
