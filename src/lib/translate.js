// Free machine translation (MyMemory) for menu names.
// The manager always checks the result before saving.

async function translateText(text, target) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=tr|${target}`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Translation failed')

  const json = await response.json()
  const result = json?.responseData?.translatedText
  if (json?.responseStatus !== 200 || !result || result.includes('MYMEMORY WARNING')) {
    throw new Error('Translation failed')
  }
  return result
}

// Turkish name in, English and Arabic out
export async function translateFromTurkish(text) {
  const [en, ar] = await Promise.all([translateText(text, 'en'), translateText(text, 'ar')])
  return { en, ar }
}
