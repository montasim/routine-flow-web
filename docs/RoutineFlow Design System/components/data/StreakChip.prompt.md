Per-routine streak indicator (flame + day count). Amber when active, muted gray at 0.

```jsx
<StreakChip days={28} best={28} />   {/* shows PB marker */}
<StreakChip days={0} />              {/* muted, "0d" */}
<StreakChip days={5} size="sm" />
```

Streaks are computed from logs (never stored). Pass `best` to flag a personal-record streak.
