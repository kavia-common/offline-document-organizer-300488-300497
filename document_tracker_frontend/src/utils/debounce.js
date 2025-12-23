let id = 0;

// PUBLIC_INTERFACE
export function debounce(fn, wait = 300) {
  let t = null;
  const wrapped = (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
  wrapped.cancel = () => { if (t) clearTimeout(t); t = null; };
  wrapped._id = ++id;
  return wrapped;
}
