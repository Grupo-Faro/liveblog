/* eslint-disable camelcase, no-undef */
// Set webpack public path BEFORE any imports that might trigger dynamic chunk loading
__webpack_public_path__ = `${window.liveblog_settings.plugin_dir}build/`;

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import configureStore from './store';
import AppContainer from './containers/AppContainer';
import ErrorBoundary from './components/ErrorBoundary';

import '../styles/core.scss';

const store = configureStore();

const container = document.getElementById('wpcom-liveblog-container');
if (container) {
  const settings = window.liveblog_settings || {};
  const loadError = (
    <div className="liveblog-error" role="alert">
      {settings.load_error || 'The liveblog could not be loaded. Please reload the page.'}
    </div>
  );
  const root = createRoot(container);
  root.render(
    <ErrorBoundary fallback={loadError}>
      <Provider store={store}>
        <AppContainer />
      </Provider>
    </ErrorBoundary>,
  );
}
