### app.js additions to enable the improved Asset flow

```js
// near the top of app.js, after UI/Sim are created
window.__rtls = window.__rtls || { ui, sim };

// load AFTER UI + Sim exist
Promise.all([
  import('./js/asset_meta.js'),
  import('./js/asset_add_drawer.js'),
  import('./js/ui_asset_details_patch.js'),
]);
```
No other changes required. The drawer does **not** block the map; picking works via a one‑shot click.
