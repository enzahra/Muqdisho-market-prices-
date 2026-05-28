require('dotenv').config()

async function main() {
  const email = `test-${Date.now()}@admin.com`
  const password = 'TestPass123!'
  const adminRole = 'water'

  const reg = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName: 'Test', adminRole }),
  })
  const regData = await reg.json()
  console.log('REGISTER', reg.status, regData)

  const login = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const loginData = await login.json()
  console.log('LOGIN', login.status, loginData)
}

main().catch(console.error)
