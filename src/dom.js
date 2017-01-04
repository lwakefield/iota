// replace a with b
export const replaceNode = (a, b) => a && b && a !== b &&
  a.parentNode && a.parentNode.replaceChild(b, a)
// insserts b after a
export const insertAfter = (a, b) => a.parentNode
  && a.parentNode.insertBefore(b, a.nextSibling)
export const removeNode = (a) => a.parentNode
  && a.parentNode.removeChild(a)
