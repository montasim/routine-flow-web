Circular gauge for the discipline score (0–100) and completion percentages.

```jsx
<ProgressRing value={86} label="Discipline" />
<ProgressRing value={92} size={64} color="var(--completed-600)" centerLabel="92%" />
```

Defaults to a `/100` center readout. Override with `centerLabel` for percentages. Arc animates on mount via the slow ease-out.
