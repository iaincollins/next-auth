import { h } from 'preact' // eslint-disable-line no-unused-vars

export default function signout ({ baseUrl, basePath, csrfToken, texts }) {
  return (
    <div className='signout'>
      <h1>{texts.heading}</h1>
      <form action={`${baseUrl}${basePath}/signout`} method='POST'>
        <input type='hidden' name='csrfToken' value={csrfToken} />
        <button type='submit'>{texts.submit}</button>
      </form>
    </div>
  )
}
