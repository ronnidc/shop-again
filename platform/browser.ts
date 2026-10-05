// The one module outside entrypoints/ that knows about WXT. Everything else
// gets the standard extension API from here, so swapping the build framework
// later only touches this file and the entrypoints.
export { browser } from 'wxt/browser';
