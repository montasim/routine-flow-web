The Home screen's primary building block — one occurrence per row, sorted by time.

```jsx
<OccurrenceRow time="07:00" title="Morning Gym" category="Fitness"
  status="Pending" onComplete={complete} onSkip={skip} />
<OccurrenceRow time="08:30" title="Vitamins" category="Health"
  status="Completed" delay={4} />
<OccurrenceRow time="13:00" title="Deep work" category="Work" status="Missed" />
```

Left accent bar is colored by `category`. Pending → Complete (green) + Skip buttons; resolved → `StatusPill`. Missed/Skipped rows dim to 0.72. Composes `StatusPill`.
