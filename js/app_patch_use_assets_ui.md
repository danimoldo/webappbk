### app.js additions to enable the improved Asset flow

```js
// near the top of js/app.js (after window.__rtls is set or UI/Sim are created)
import './asset_add_drawer.js';       // toolbar-matching button + right drawer (no overlay)
import './ui_asset_details_patch.js'; // dates inside "Detalii Asset" area
```
No other changes required. The drawer does **not** block the map; picking works via a one‑shot click.
