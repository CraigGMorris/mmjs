// @ts-check
/* global ReactDOM */

/**
 * Local vendor wrapper for ReactDOM client API in offline UMD/ESM environment.
 * @type {import('react-dom/client').createRoot}
 */
export const createRoot = ReactDOM.createRoot;

/**
 * @type {import('react-dom/client').hydrateRoot}
 */
export const hydrateRoot = ReactDOM.hydrateRoot;
