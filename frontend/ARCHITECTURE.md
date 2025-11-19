# Frontend Architecture

## Project Structure

The frontend is built with React + Vite and follows a modular architecture with clear separation of concerns.

```
frontend/src/
├── components/          # Reusable UI components
├── pages/              # Page-level components (routes)
├── services/           # API clients and data services
├── hooks/              # Custom React hooks
├── App.jsx/css         # Root application component
├── main.jsx            # React entry point
└── index.css           # Global styles and CSS variables
```

## Component Organization

Each component has its own dedicated CSS file with the same name:

- `ComponentName.jsx` - React component logic
- `ComponentName.css` - Component-specific styles

### Example:

```
Map.jsx    # Map component
Map.css    # Map styles
```

## CSS Architecture

### Global Styles (`index.css`)

- CSS custom properties (variables) for theming
- Base typography and layout
- Common utility classes

### Component Styles

- Scoped to individual components
- Use CSS variables from global styles
- BEM-like naming conventions

### CSS Variables

```css
:root {
  --primary-color: #2196f3;
  --success-color: #4caf50;
  --warning-color: #ff9800;
  --danger-color: #f44336;
  /* ... more variables */
}
```

## Folder Structure Details

### `/components`

Reusable UI components used across multiple pages:

- **Map** - Leaflet map container with marker management
- **MapPin** - Custom map markers with status-based styling
- **RouteLine** - Route polyline visualization
- **SyncStatus** - Offline sync status indicator
- **VolunteerTaskList** - Task list with verification workflow

### `/pages`

Page-level components corresponding to routes:

- **DashboardPage** - Manager dashboard with map and optimization
- **VolunteerPage** - Volunteer portal for task verification

### `/services`

API clients and data management:

- **api.js** - Route optimization API calls
- **apiService.js** - Task and needs CRUD operations
- **verificationService.js** - Offline-first task verification
- **db.js** - IndexedDB setup using Dexie.js

### `/hooks`

Custom React hooks for shared logic:

- **useSyncManager** - Manages offline task synchronization

## Import Conventions

Use barrel exports (index.js) for cleaner imports:

```javascript
// Instead of:
import Map from "./components/Map.jsx";
import MapPin from "./components/MapPin.jsx";

// Use:
import { Map, MapPin } from "./components";
```

## State Management

- **React Query** - Server state and caching
- **React Hooks** - Local component state
- **IndexedDB (Dexie)** - Offline data persistence

## Styling Guidelines

1. **Use CSS Variables** - Reference global variables for consistency
2. **Component-Scoped** - Keep styles close to components
3. **Descriptive Classes** - Use clear, semantic class names
4. **Mobile-First** - Design for mobile, enhance for desktop
5. **Transitions** - Add smooth transitions for user interactions

## Best Practices

1. **Separation of Concerns**

   - Components: UI rendering
   - Services: API communication
   - Hooks: Reusable logic

2. **Code Organization**

   - Group related files together
   - Use index.js for exports
   - Keep components small and focused

3. **Performance**

   - React.memo for expensive components
   - Code splitting with lazy loading
   - Optimize images and assets

4. **Accessibility**
   - Semantic HTML
   - ARIA labels where needed
   - Keyboard navigation support

## Adding New Components

1. Create component file: `components/NewComponent.jsx`
2. Create styles file: `components/NewComponent.css`
3. Import styles in component: `import './NewComponent.css'`
4. Export from `components/index.js`
5. Use CSS variables from `index.css`

## Testing

Components should be testable in isolation:

- Mock API calls in services
- Test hooks independently
- Snapshot testing for UI components
