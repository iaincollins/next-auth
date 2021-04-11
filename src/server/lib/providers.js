import URLExtended from '../../lib/url-extended'

/** Adds `signinUrl` and `callbackUrl` to each provider. */
export default function parseProviders ({ providers = [], baseUrl, basePath, locale }) {
  return providers.map((provider) => ({
    ...provider,
    signinUrl: new URLExtended(`${basePath}/signin/${provider.id}`, { locale }, baseUrl).toString(),
    callbackUrl: new URLExtended(`${basePath}/callback/${provider.id}`, { locale }, baseUrl).toString()
  }))
}
