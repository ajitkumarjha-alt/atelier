# Quick Reference: UI/UX Components
**For Developers** | Last Updated: Feb 3, 2026

---

## 🔔 Toast Notifications

### Import
```javascript
import { showSuccess, showError, showInfo, showWarning, showLoading, dismissToast } from '../utils/toast';
```

### Quick Examples

```javascript
// ✅ Success (green, 3s)
showSuccess('Project saved!');

// ❌ Error (red, 4s)
showError('Failed to save');

// ℹ️ Info (blue, 3s)
showInfo('Processing in background');

// ⚠️ Warning (orange, 3.5s)
showWarning('Unsaved changes');

// ⏳ Loading
const toastId = showLoading('Saving...');
// ... async work ...
dismissToast(toastId);
showSuccess('Done!');
```

### Real Example
```javascript
const handleSave = async () => {
  const toastId = showLoading('Saving project...');
  
  try {
    await fetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    dismissToast(toastId);
    showSuccess('Project created successfully!');
    navigate('/dashboard');
  } catch (error) {
    dismissToast(toastId);
    showError(error.message || 'Failed to save');
  }
};
```

---

## 💀 Skeleton Loaders

### Import
```javascript
import { 
  CardGridSkeleton,
  TableSkeleton,
  ListSkeleton,
  FormSkeleton,
  PageLoader 
} from '../components/SkeletonLoader';
```

### Quick Examples

```javascript
// Card Grid (Dashboard)
{loading && <CardGridSkeleton count={6} columns={3} />}

// Table
{loading && <TableSkeleton rows={10} columns={5} />}

// List
{loading && <ListSkeleton count={8} />}

// Form
{loading && <FormSkeleton fields={6} />}

// Full Page
{loading && <PageLoader message="Loading..." />}
```

### Real Example
```javascript
function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);

  if (loading) {
    return (
      <Layout>
        <div className="mb-8">
          <h1>Project Overview</h1>
          <p>Loading projects...</p>
        </div>
        <CardGridSkeleton count={6} columns={3} />
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Actual content */}
    </Layout>
  );
}
```

---

## 🍞 Breadcrumbs

### Import
```javascript
import Breadcrumbs from '../components/Breadcrumbs';
```

### Auto-Generated
```javascript
// Just add to Layout - breadcrumbs auto-generate from URL
<Breadcrumbs />

// URL: /project/1
// Shows: 🏠 > Project Details > 1
```

### Custom Breadcrumbs
```javascript
<Breadcrumbs customCrumbs={[
  { label: 'Projects', href: '/projects' },
  { label: 'Waterfront Tower', href: '/project/1' },
  { label: 'MAS Details' } // Current page (no href)
]} />
```

---

## ♿ ARIA Labels Checklist

### Buttons
```javascript
// ✅ Good
<button 
  onClick={handleClick}
  aria-label="Close modal"
  aria-pressed={isOpen}
>
  <X aria-hidden="true" />
</button>

// ❌ Bad
<button onClick={handleClick}>
  <X />
</button>
```

### Navigation
```javascript
// ✅ Good
<nav aria-label="Main navigation">
  <button 
    aria-current={isActive ? 'page' : undefined}
    aria-label={item.name}
  >
    <Icon aria-hidden="true" />
    <span>{item.name}</span>
  </button>
</nav>

// ❌ Bad
<div>
  <div onClick={navigate}>
    <Icon />
    <span>{item.name}</span>
  </div>
</div>
```

### Forms
```javascript
// ✅ Good
<input
  type="text"
  aria-label="Project name"
  aria-required="true"
  aria-invalid={!!errors.name}
  aria-describedby={errors.name ? 'name-error' : undefined}
/>
{errors.name && (
  <p id="name-error" role="alert">
    {errors.name}
  </p>
)}

// ❌ Bad
<input type="text" />
{errors.name && <p>{errors.name}</p>}
```

### Loading States
```javascript
// ✅ Good
<button 
  disabled={loading}
  aria-busy={loading}
  aria-label={loading ? 'Saving...' : 'Save'}
>
  {loading ? (
    <>
      <Loader aria-hidden="true" />
      <span>Saving...</span>
    </>
  ) : (
    'Save'
  )}
</button>

// ❌ Bad
<button disabled={loading}>
  {loading ? <Loader /> : 'Save'}
</button>
```

### Alerts
```javascript
// ✅ Good
{error && (
  <div 
    role="alert"
    aria-live="polite"
  >
    {error}
  </div>
)}

// ❌ Bad
{error && <div>{error}</div>}
```

---

## 🎯 Common Patterns

### Save Action with Toast
```javascript
const handleSave = async () => {
  const toastId = showLoading('Saving...');
  
  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Save failed');
    
    dismissToast(toastId);
    showSuccess('Saved successfully!');
    navigate('/success-page');
  } catch (error) {
    dismissToast(toastId);
    showError(error.message);
  }
};
```

### Delete Action with Confirmation
```javascript
const handleDelete = async (id) => {
  if (!window.confirm('Are you sure?')) return;
  
  const toastId = showLoading('Deleting...');
  
  try {
    await fetch(`/api/items/${id}`, { method: 'DELETE' });
    dismissToast(toastId);
    showSuccess('Deleted successfully!');
    refreshList();
  } catch (error) {
    dismissToast(toastId);
    showError('Failed to delete');
  }
};
```

### Loading State Pattern
```javascript
function MyComponent() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CardGridSkeleton />;
  if (error) return <div role="alert">{error}</div>;
  
  return <DataDisplay data={data} />;
}
```

---

## 🚫 Anti-Patterns (Don't Do This!)

### ❌ Using alert()
```javascript
// ❌ BAD
alert('Saved successfully!');

// ✅ GOOD
showSuccess('Saved successfully!');
```

### ❌ Basic Spinner Only
```javascript
// ❌ BAD
{loading && <Loader className="animate-spin" />}

// ✅ GOOD
{loading && <CardGridSkeleton count={6} />}
```

### ❌ Missing ARIA Labels
```javascript
// ❌ BAD
<button onClick={close}>
  <X />
</button>

// ✅ GOOD
<button onClick={close} aria-label="Close">
  <X aria-hidden="true" />
</button>
```

### ❌ No Loading Feedback
```javascript
// ❌ BAD
const handleSave = async () => {
  await fetch('/api/save', { method: 'POST' });
  navigate('/success');
};

// ✅ GOOD
const handleSave = async () => {
  const toastId = showLoading('Saving...');
  try {
    await fetch('/api/save', { method: 'POST' });
    dismissToast(toastId);
    showSuccess('Saved!');
    navigate('/success');
  } catch (error) {
    dismissToast(toastId);
    showError('Failed');
  }
};
```

---

## 📱 Responsive Design Tips

### Touch Targets (Minimum 44x44px)
```javascript
// ✅ Mobile-friendly
<button className="min-h-[44px] min-w-[44px] p-3">
  <Icon className="w-5 h-5" />
</button>

// ❌ Too small
<button className="p-1">
  <Icon className="w-4 h-4" />
</button>
```

### Responsive Text
```javascript
// ✅ Scales with screen size
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  Title
</h1>

// ❌ Fixed size
<h1 className="text-4xl">Title</h1>
```

### Responsive Grid
```javascript
// ✅ Responsive columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// ❌ Fixed columns
<div className="grid grid-cols-3 gap-6">
```

---

## 🎨 Lodha Color Reference

```javascript
// Primary
'lodha-gold': '#9D7F1B'      // Primary actions, highlights
'lodha-grey': '#6D6E71'      // Text, backgrounds
'lodha-black': '#000000'     // Headings, strong text

// Backgrounds
'lodha-sand': '#F3F1E7'      // Page background
'lodha-cream': '#F0EADC'     // Card backgrounds
'lodha-steel': '#E8E9EA'     // Borders, dividers

// Use in Tailwind:
className="bg-lodha-gold text-white"
className="border border-lodha-steel"
className="text-lodha-grey"
```

---

## 🔍 Debug Tips

### Toast Not Showing?
1. Check `<Toaster />` in App.jsx
2. Import correct: `from '../utils/toast'` not `from 'react-hot-toast'`
3. Check browser console for errors

### Skeleton Not Animating?
1. Ensure Tailwind CSS loaded
2. Check `animate-pulse` class exists
3. Verify no CSS conflicts

### Breadcrumbs Wrong?
1. Check URL path
2. Add custom mapping in `Breadcrumbs.jsx` if needed
3. Use `customCrumbs` prop for complex routes

### ARIA Issues?
1. Test with screen reader (NVDA/JAWS/VoiceOver)
2. Use browser DevTools Accessibility Inspector
3. Run axe DevTools extension

---

## ✅ Pre-Commit Checklist

- [ ] Replaced all `alert()` with toast notifications
- [ ] Added skeleton loaders for loading states
- [ ] Added ARIA labels to interactive elements
- [ ] Icons have `aria-hidden="true"`
- [ ] Buttons have clear `aria-label`
- [ ] Forms have proper validation feedback
- [ ] Error messages use `role="alert"`
- [ ] Loading states show feedback
- [ ] Tested keyboard navigation
- [ ] Tested on mobile

---

## 📚 More Resources

- [Full UI/UX Audit](./UI_UX_AUDIT_RECOMMENDATIONS.md)
- [Implementation Summary](./UI_UX_IMPROVEMENTS_IMPLEMENTATION.md)
- [React Hot Toast Docs](https://react-hot-toast.com/)
- [ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)

---

**Questions?** Check the implementation docs or ask the team!
