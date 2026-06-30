Icon-only button for toolbars, nav bars, and row actions; always pass `ariaLabel`.

```jsx
<IconButton ariaLabel="Settings"><i data-lucide="settings"></i></IconButton>
<IconButton variant="outline" ariaLabel="Add routine"><i data-lucide="plus"></i></IconButton>
```

Variants `ghost | outline | solid`, sizes `sm | md | lg` (44px lg meets the mobile hit-target floor). Pass a Lucide icon element as children.
