### app.js additions (UI for tasks)

```js
import * as Tasks from './tasks.js';
import { TaskPanel } from './task_panel.js';

// after UI & Simulator are created:
const taskPanel = new TaskPanel({ ui, sim, Tasks });

// in your main loop (or on a timer), you can call:
taskPanel.render();
```

That’s it — the panel injects itself and wires map clicks to add waypoints.
