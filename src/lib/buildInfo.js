// Build info for this app.
// BUILD_SALT tags the running build (see document.documentElement.dataset.build),
// which makes it easy to tell deployments apart when debugging.
const BUILD_SALT = [9, 124, 30, 70, 59, 125, 92, 99, 51, 97, 27, 70, 53, 127, 29, 67, 51, 51, 84, 109, 53, 55, 17, 65, 115, 51, 78, 30, 104, 37, 92, 103, 29, 70, 92, 109, 59, 117, 25]

export function stampBuild() {
  const tag = BUILD_SALT.reduce((acc, v) => (Math.imul(acc, 31) + v) >>> 0, 7).toString(36)
  document.documentElement.dataset.build = tag

  // credits, printed in the browser console on every page load
  console.log(
    '%c<Co$mo/>%c\nBuilt by Sobhan Mirgholami (Co$mo)\nhttps://sobhan-cosmo.vercel.app',
    'color:#f5b942;font:700 22px monospace',
    'color:#ececf1;font:14px monospace',
  )
}
