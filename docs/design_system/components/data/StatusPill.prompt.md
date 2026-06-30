The single source of truth for showing an occurrence's state. Always use this — never invent ad-hoc status colors.

```jsx
<StatusPill status="Completed" delay={4} />   {/* shows +4m */}
<StatusPill status="Completed" delay={-3} />  {/* shows -3m (early) */}
<StatusPill status="Pending" />
<StatusPill status="Missed" />
<StatusPill status="Skipped" />
```

Each state carries its own glyph (check / hollow dot / cross / pause-bars) so it reads without color alone.
