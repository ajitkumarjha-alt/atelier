/**
 * Accessibility Utilities and ARIA Helper Functions
 * Ensures keyboard navigation and screen reader compatibility
 */

/**
 * Generate unique IDs for form elements and ARIA attributes
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
let idCounter = 0;
export function generateId(prefix = 'id') {
  return `${prefix}-${++idCounter}`;
}

/**
 * Trap focus within a modal or dialog
 * @param {HTMLElement} element - Container element
 */
export function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey && document.activeElement === firstElement) {
      lastElement.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      firstElement.focus();
      e.preventDefault();
    }
  };

  element.addEventListener('keydown', handleTabKey);

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' | 'assertive'
 */
export function announceToScreenReader(message, priority = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only'; // Visually hidden
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if element is keyboard focusable
 * @param {HTMLElement} element - Element to check
 * @returns {boolean}
 */
export function isFocusable(element) {
  if (!element) return false;

  const tabindex = element.getAttribute('tabindex');
  if (tabindex !== null && parseInt(tabindex) < 0) return false;

  if (element.disabled) return false;

  const focusableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
  if (focusableTags.includes(element.tagName)) return true;

  if (tabindex !== null && parseInt(tabindex) >= 0) return true;

  return false;
}

/**
 * Move focus to first error in form
 * @param {object} errors - Object with field errors
 * @param {HTMLElement} formElement - Form element
 */
export function focusFirstError(errors, formElement) {
  if (!errors || Object.keys(errors).length === 0) return;

  const firstErrorField = Object.keys(errors)[0];
  const inputElement = formElement.querySelector(`[name="${firstErrorField}"]`);

  if (inputElement) {
    inputElement.focus();
    inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Add keyboard navigation to list of items
 * @param {HTMLElement} container - Container element
 * @param {string} itemSelector - CSS selector for items
 */
export function enableListKeyboardNav(container, itemSelector) {
  const items = Array.from(container.querySelectorAll(itemSelector));
  let currentIndex = -1;

  const handleKeyDown = (e) => {
    const key = e.key;

    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) return;

    e.preventDefault();

    if (key === 'ArrowDown') {
      currentIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    } else if (key === 'ArrowUp') {
      currentIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    } else if (key === 'Home') {
      currentIndex = 0;
    } else if (key === 'End') {
      currentIndex = items.length - 1;
    }

    items[currentIndex].focus();
  };

  container.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Create visually hidden text for screen readers
 * @param {string} text - Text to hide visually
 * @returns {HTMLElement}
 */
export function createScreenReaderText(text) {
  const span = document.createElement('span');
  span.className = 'sr-only';
  span.textContent = text;
  return span;
}

/**
 * ARIA attributes helper
 */
export const aria = {
  /**
   * Set ARIA expanded state
   * @param {HTMLElement} element
   * @param {boolean} isExpanded
   */
  setExpanded(element, isExpanded) {
    element.setAttribute('aria-expanded', String(isExpanded));
  },

  /**
   * Set ARIA selected state
   * @param {HTMLElement} element
   * @param {boolean} isSelected
   */
  setSelected(element, isSelected) {
    element.setAttribute('aria-selected', String(isSelected));
  },

  /**
   * Set ARIA hidden state
   * @param {HTMLElement} element
   * @param {boolean} isHidden
   */
  setHidden(element, isHidden) {
    element.setAttribute('aria-hidden', String(isHidden));
  },

  /**
   * Set ARIA disabled state
   * @param {HTMLElement} element
   * @param {boolean} isDisabled
   */
  setDisabled(element, isDisabled) {
    element.setAttribute('aria-disabled', String(isDisabled));
    if (isDisabled) {
      element.setAttribute('tabindex', '-1');
    } else {
      element.removeAttribute('tabindex');
    }
  },

  /**
   * Set ARIA label
   * @param {HTMLElement} element
   * @param {string} label
   */
  setLabel(element, label) {
    element.setAttribute('aria-label', label);
  },

  /**
   * Set ARIA described by
   * @param {HTMLElement} element
   * @param {string} id
   */
  setDescribedBy(element, id) {
    element.setAttribute('aria-describedby', id);
  },

  /**
   * Set ARIA labelled by
   * @param {HTMLElement} element
   * @param {string} id
   */
  setLabelledBy(element, id) {
    element.setAttribute('aria-labelledby', id);
  }
};

/**
 * Keyboard navigation constants
 */
export const Keys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown'
};

/**
 * Check if keyboard event is an activation key (Enter or Space)
 * @param {KeyboardEvent} event
 * @returns {boolean}
 */
export function isActivationKey(event) {
  return event.key === Keys.ENTER || event.key === Keys.SPACE;
}

export default {
  generateId,
  trapFocus,
  announceToScreenReader,
  isFocusable,
  focusFirstError,
  enableListKeyboardNav,
  createScreenReaderText,
  aria,
  Keys,
  isActivationKey
};
