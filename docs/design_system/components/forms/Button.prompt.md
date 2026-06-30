Primary action control — use for the one main action per view (Complete, Save routine); reach for `secondary`/`ghost` for lower-priority actions.

```jsx
<Button variant="primary" size="md" onClick={complete}>Complete</Button>
<Button variant="secondary" iconLeft={<Icon name="skip-forward" />}>Skip</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button variant="danger">Delete routine</Button>
```

Variants: `primary` (signal fill, the default action), `secondary` (hairline outline on white), `ghost` (text-only), `danger` (missed red). Sizes `sm | md | lg`. Press shrinks to 0.97 — never grows. Use `fullWidth` for mobile sheets.
