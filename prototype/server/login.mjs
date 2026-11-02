import { Cursor } from '@cursor/sdk'

const existing = await Cursor.auth.status()
if (existing.status === 'logged-in') {
  console.log(`Already signed in${existing.email ? ` as ${existing.email}` : ''}.`)
  process.exit(0)
}

console.log('Opening a browser to sign this prototype in to Cursor…')
const result = await Cursor.auth.login({
  apiKeyName: 'wordsmith-prototype',
  onLoginUrl: (url) => console.log(url),
})
console.log(`Signed in${result.email ? ` as ${result.email}` : ''}. Free-text replies in the prototype can use Cursor now.`)
