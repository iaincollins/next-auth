import { h } from 'preact' // eslint-disable-line no-unused-vars

export default function verifyRequest ({ baseUrl, texts }) {
  return (
    <div className='verify-request'>
      <h1>{texts.heading}</h1>
      <p>{texts.message}</p>
      <p><a className='site' href={baseUrl}>{baseUrl.replace(/^https?:\/\//, '')}</a></p>
    </div>
  )
}
