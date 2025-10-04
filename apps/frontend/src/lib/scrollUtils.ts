/**
 * Utility functions for handling scroll behavior in the application.
 */

/**
 * Scrolls to a specific element with smooth behavior and proper offset.
 * @param elementId - The ID of the element to scroll to
 * @param offset - Optional offset from the top (defaults to 100px)
 */
export const scrollToElement = (elementId: string, offset = 100): void => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element with ID "${elementId}" not found`);
    return;
  }

  const topPos = element.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({
    top: topPos,
    behavior: "smooth",
  });
};
