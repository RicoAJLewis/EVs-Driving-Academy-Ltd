# EVs Driving Academy Mobile UX Guide

Use this guide before making mobile UI changes to the EVs Driving Academy Ltd website.

## Core Principles

- Design for mobile readability first, then preserve the existing desktop layout unless the task explicitly asks for a redesign.
- Keep navigation thumb-friendly: logo visible, primary actions easy to tap, no crowded multi-row desktop nav on small screens.
- Avoid horizontal overflow at all viewport widths, especially 390px, 430px, and 768px.
- Use generous tap targets. Interactive controls should generally be at least 44px tall.
- Keep copy readable with comfortable line-height and controlled max-widths.
- Prioritize the customer journey: Bookings, Academy, About, Reviews, Login/Profile, Location, and Chat should be easy to find.

## Header And Navigation

- Desktop should stay visually close to the approved header.
- Mobile should use a compact logo + menu button pattern when links would otherwise wrap.
- Mobile menus should include Bookings, Academy, About, Reviews, user dashboard/admin link when relevant, logout when logged in, and important location/login actions.
- Header content must never overlap page headings. Academy pages need enough top padding to start below the floating header.

## Cards And Sections

- Stack cards cleanly on mobile with consistent gaps.
- Keep card content scannable: title, badge/source/platform, short description, and one clear action.
- Avoid huge empty areas in review/video cards.
- Use brand accents sparingly: warm gold for primary actions and subtle blue for supporting highlights.

## Academy Video UX

- Use platform-aware layouts.
- YouTube and Vimeo should stay responsive 16:9.
- TikTok and Instagram should use centered vertical/reel-style layouts that fit within the viewport.
- If a platform blocks clean embedding, keep the fallback polished and provide a clear external-open action.
- Academy cards should use `thumbnail_url` when available. If no thumbnail exists, use a designed platform-specific placeholder rather than a blank card.

## Chat Widget

- The student chat button should be visible but not block important content.
- On mobile, the chat panel must fit inside the viewport and keep the input visible where possible.
- Use clear empty, loading, error, and unread states.
- Close controls must be easy to tap.

## Admin Dashboard

- Admin is desktop-primary but must remain usable on mobile.
- Tabs should horizontally scroll or collapse instead of wrapping into clutter.
- Forms should stack to one column on mobile and tablet.
- Buttons should be full-width where it improves tapping.
- Messages should feel like an inbox: clean conversation list, readable thread, and bounded scroll areas.

## Accessibility

- Preserve keyboard access and visible focus states.
- Do not rely on animation alone.
- Keep contrast strong on dark backgrounds.
- Respect reduced-motion preferences.

## Final Mobile Checks

- Test at 390px, 430px, 768px, and desktop.
- Confirm no horizontal scrolling.
- Confirm nav opens/closes and all links are reachable.
- Confirm academy cards, watch page, reviews, forms, admin tabs, and chat widget remain usable.
- Confirm desktop has not drifted away from the approved design.
