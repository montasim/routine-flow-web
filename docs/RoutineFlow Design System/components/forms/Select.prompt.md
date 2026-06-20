Dropdown for enumerated choices — recurrence type, reminder offset, timezone.

```jsx
<Select label="Reminder" defaultValue="15"
  options={[{value:'5',label:'5 min before'},{value:'15',label:'15 min before'}]} />
<Select label="Recurrence" options={['Daily','Weekly','Monthly','Custom']} />
```

Visually matches `Input` (same 42px height, focus ring). Options accept plain strings or `{value,label}`.
