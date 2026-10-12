const ERROR_KEYS = {
  'You must be logged in': 'errors.loginRequired',
  'Please sign in with your university email to order': 'errors.universityEmail',
  'You already have 2 active orders': 'errors.activeLimit',
  'Item is not available': 'errors.notAvailable',
  'This pickup time is full. Please choose another one.': 'errors.slotFull',
  'This pickup time is too soon. Please choose a later one.': 'errors.tooSoon',
  'The café is not taking online orders right now': 'errors.paused',
  'Please choose the required options': 'errors.chooseOptions',
  'Choose a pickup time': 'errors.chooseTime',
}

export function translateError(message, t) {
  const key = ERROR_KEYS[message]
  return key ? t(key) : message
}