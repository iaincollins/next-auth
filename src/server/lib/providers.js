/**
 * Adds `signinUrl` and `callbackUrl` to each provider.
 * @param {{
 *  providers: import("..").Provider[]
 *  baseUrl: string
 *  basePath: string
 * }} options
 * @returns {import("..").NextAuthInternalOptions["provider"][]}
 */
export default function parseProviders ({ providers = [], baseUrl, basePath }) {
  return providers.map((provider) => ({
    ...provider,
    signinUrl: `${baseUrl}${basePath}/signin/${provider.id}`,
    callbackUrl: `${baseUrl}${basePath}/callback/${provider.id}`,
    async profile (...args) {
      if (provider.profile) {
        return provider.profile?.(...args)
      }
      // Default to profile that has a single id property
      return { id: args[0].sub ?? args[0].id ?? 'id' }
    }
  }))
}
