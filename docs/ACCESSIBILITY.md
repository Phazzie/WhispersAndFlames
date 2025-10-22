# Accessibility (A11y) Guidelines

This document outlines accessibility standards and implementations for the Whispers and Flames application.

## 🎯 Accessibility Goals

We aim for **WCAG 2.1 Level AA compliance** to ensure the application is usable by everyone, including:

- People with visual impairments
- People with motor disabilities
- People with cognitive disabilities
- Screen reader users
- Keyboard-only users

---

## ✅ Current Accessibility Features

### 1. **Skip to Content Link**

Location: `src/components/skip-to-content.tsx`

Allows keyboard users to bypass navigation:

```tsx
<SkipToContent />
```

### 2. **Semantic HTML**

- Using semantic HTML5 elements (`<nav>`, `<main>`, `<article>`, etc.)
- Proper heading hierarchy (h1 → h2 → h3)

### 3. **Keyboard Navigation**

- All interactive elements are keyboard accessible
- Focus indicators visible (using Tailwind's `focus:` utilities)

### 4. **Color Contrast**

- Using Tailwind's default color palette with good contrast ratios
- Primary text: meets WCAG AA standards

---

## 🚧 Accessibility Improvements Needed

### High Priority

#### 1. **ARIA Labels and Landmarks**

Add semantic landmarks to structure content:

```tsx
// Main navigation
<nav aria-label="Main navigation">
  <ul role="list">
    <li><a href="/">Home</a></li>
  </ul>
</nav>

// Main content area
<main id="main-content" role="main" aria-label="Main content">
  {children}
</main>

// Form fields
<label htmlFor="email">Email</label>
<input id="email" type="email" aria-required="true" />

// Buttons
<button aria-label="Close dialog">×</button>
<button aria-pressed={isActive}>Toggle</button>
```

#### 2. **Focus Management**

Manage focus in dialogs and modals:

```tsx
import { useEffect, useRef } from 'react';

function Dialog({ isOpen, onClose }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      dialogRef.current?.focus();
    } else {
      previousFocus.current?.focus();
    }
  }, [isOpen]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      tabIndex={-1}
    >
      {/* Dialog content */}
    </div>
  );
}
```

#### 3. **Loading States**

Add announcements for screen readers:

```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {isLoading && <span className="sr-only">Loading...</span>}
</div>

<div role="alert" aria-live="assertive">
  {error && <span>{error}</span>}
</div>
```

#### 4. **Form Validation**

Provide accessible error messages:

```tsx
<div>
  <label htmlFor="password">Password</label>
  <input
    id="password"
    type="password"
    aria-invalid={!!errors.password}
    aria-describedby={errors.password ? 'password-error' : undefined}
  />
  {errors.password && (
    <span id="password-error" role="alert">
      {errors.password.message}
    </span>
  )}
</div>
```

### Medium Priority

#### 5. **Image Alt Text**

All images should have descriptive alt text:

```tsx
<img src="/logo.png" alt="Whispers and Flames logo" />

// Decorative images
<img src="/decoration.png" alt="" role="presentation" />
```

#### 6. **Link Descriptions**

Make link purposes clear:

```tsx
// Bad
<a href="/game">Click here</a>

// Good
<a href="/game">Start a new game session</a>
```

#### 7. **Reduced Motion**

Respect user preferences:

```tsx
// In Tailwind config
module.exports = {
  theme: {
    extend: {
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  variants: {
    extend: {
      animation: ['motion-safe', 'motion-reduce'],
      transition: ['motion-safe', 'motion-reduce'],
    },
  },
}

// In components
<div className="transition-transform motion-reduce:transition-none">
  {/* Animated content */}
</div>
```

---

## 🎨 UI/UX Accessibility Checklist

### Interactive Elements

- [ ] All interactive elements have visible focus indicators
- [ ] Touch targets are at least 44×44 pixels
- [ ] Interactive elements have clear hover states
- [ ] Buttons have descriptive text or aria-label
- [ ] Links have clear, descriptive text

### Forms

- [ ] All form fields have associated labels
- [ ] Required fields are marked (visually and with aria-required)
- [ ] Error messages are announced to screen readers
- [ ] Form validation is accessible
- [ ] Autocomplete attributes set where appropriate

### Navigation

- [ ] Skip to content link is available
- [ ] Current page is indicated in navigation
- [ ] Breadcrumbs use appropriate ARIA
- [ ] Keyboard navigation works in all menus

### Content

- [ ] Heading hierarchy is logical (h1 → h2 → h3)
- [ ] Color is not the only way to convey information
- [ ] Text has sufficient contrast (4.5:1 for normal, 3:1 for large)
- [ ] Link text is descriptive
- [ ] Images have alt text

### Multimedia

- [ ] Videos have captions
- [ ] Audio content has transcripts
- [ ] Autoplay is disabled or user-controlled

### Dynamic Content

- [ ] Loading states are announced
- [ ] Errors are announced
- [ ] Success messages are announced
- [ ] Modal dialogs trap focus
- [ ] ARIA live regions for updates

---

## 🔧 Testing Accessibility

### Automated Testing

```bash
# Install axe-core for automated testing
npm install --save-dev @axe-core/react

# Add to your test setup
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

// Test component
test('should not have accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manual Testing

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Use Enter/Space to activate buttons
   - Use arrow keys in custom controls
   - Test Escape to close dialogs

2. **Screen Reader Testing**
   - macOS: VoiceOver (Cmd+F5)
   - Windows: NVDA (free) or JAWS
   - Test navigation, forms, and dynamic content

3. **Browser Extensions**
   - [axe DevTools](https://www.deque.com/axe/devtools/)
   - [WAVE](https://wave.webaim.org/extension/)
   - [Lighthouse](https://developers.google.com/web/tools/lighthouse)

4. **Color Contrast**
   - Use browser DevTools or online tools
   - Check all text against backgrounds
   - Verify focus indicators are visible

---

## 📱 Mobile Accessibility

### Touch Targets

```tsx
// Minimum 44x44 pixels
<button className="min-w-[44px] min-h-[44px] p-2">
  <Icon className="w-6 h-6" />
</button>
```

### Zoom and Scaling

```html
<!-- Allow pinch-to-zoom -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
```

### Orientation

- Support both portrait and landscape
- Don't lock orientation unless necessary

---

## 🎯 Component-Specific Guidelines

### Buttons

```tsx
// Icon button
<button aria-label="Delete item">
  <TrashIcon />
</button>

// Toggle button
<button aria-pressed={isToggled} onClick={handleToggle}>
  {isToggled ? 'On' : 'Off'}
</button>

// Disabled button
<button disabled aria-disabled="true">
  Submit
</button>
```

### Dialogs/Modals

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Confirm Action</h2>
  <p id="dialog-description">Are you sure you want to proceed?</p>
  <button onClick={onClose}>Cancel</button>
  <button onClick={onConfirm}>Confirm</button>
</div>
```

### Tabs

```tsx
<div role="tablist" aria-label="Game sections">
  <button
    role="tab"
    aria-selected={activeTab === 'summary'}
    aria-controls="summary-panel"
    id="summary-tab"
  >
    Summary
  </button>
  <div
    role="tabpanel"
    id="summary-panel"
    aria-labelledby="summary-tab"
    hidden={activeTab !== 'summary'}
  >
    {/* Content */}
  </div>
</div>
```

### Live Regions

```tsx
// Polite announcements (don't interrupt)
<div role="status" aria-live="polite" aria-atomic="true">
  {message}
</div>

// Urgent announcements (interrupt)
<div role="alert" aria-live="assertive" aria-atomic="true">
  {error}
</div>
```

---

## 📚 Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project](https://www.a11yproject.com/)
- [WebAIM](https://webaim.org/)
- [Inclusive Components](https://inclusive-components.design/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

---

## 🔄 Continuous Improvement

### Code Review Checklist

- [ ] All new components have proper ARIA attributes
- [ ] Keyboard navigation works
- [ ] Focus management is correct
- [ ] Color contrast is sufficient
- [ ] Loading/error states are announced
- [ ] Forms are accessible

### Regular Audits

- Run Lighthouse accessibility audit monthly
- Test with screen readers quarterly
- Review WCAG compliance semi-annually
- Update based on user feedback

---

**Last Updated**: Current
**Next Review**: When implementing new UI components
