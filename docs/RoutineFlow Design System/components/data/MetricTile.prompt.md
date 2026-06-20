Single KPI tile for analytics dashboards — completion rate, missed count, average delay.

```jsx
<MetricTile label="Completion rate" value="86" unit="%" delta="+4%" deltaDirection="up" />
<MetricTile label="Avg delay" value="6" unit="min" delta="2m" deltaDirection="down" tone="completed" />
<MetricTile label="Discipline" value="86" tone="signal" />
```

Value uses display font; label + unit + delta use mono. `deltaDirection` up = green, down = red — flip it when "down is good" (e.g. delay).
