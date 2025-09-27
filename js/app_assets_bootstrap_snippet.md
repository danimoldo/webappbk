### app.js additions to enable Asset add + metadata

```js
// add these imports near the top of js/app.js
import './asset_add_panel.js';        // floating "Adaugă asset" (add + place on map)
import './ui_asset_details_patch.js'; // show/edit dates in "Detalii Asset" panel
```
No other changes required. The modules self-initialize and use your existing `__rtls.ui` and `__rtls.sim` hooks.
