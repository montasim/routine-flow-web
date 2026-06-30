Single-line text field; focus shows the signal ring, `error` turns the border + hint red.

```jsx
<Input label="Routine title" placeholder="Morning Gym" />
<Input label="Scheduled time" defaultValue="07:00" trailing={<span>local</span>} />
<Input label="Email" error="That address is already in use." />
```

Use `leading`/`trailing` for icons or unit labels. 42px tall to pair with `md` Button.
