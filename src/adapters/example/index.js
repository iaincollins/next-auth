const Adapter = (config, options = {}) => {
  async function getAdapter (appOptions) {
    const { logger } = appOptions
    // Display debug output if debug option enabled
    function debug (debugCode, ...args) {
      logger.debug(`ADAPTER_${debugCode}`, ...args)
    }

    async function createUser (profile) {
      debug('createUser', profile)
      return null
    }

    async function getUser (id) {
      debug('getUser', id)
      return null
    }

    async function getUserByEmail (email) {
      debug('getUserByEmail', email)
      return null
    }

    async function getUserByProviderAccountId (providerId, providerAccountId) {
      debug('getUserByProviderAccountId', providerId, providerAccountId)
      return null
    }

    async function updateUser (user) {
      debug('updateUser', user)
      return null
    }

    async function deleteUser (userId) {
      debug('deleteUser', userId)
      return null
    }

    async function linkAccount (userId, providerId, providerType, providerAccountId, refreshToken, accessToken, accessTokenExpires) {
      debug('linkAccount', userId, providerId, providerType, providerAccountId, refreshToken, accessToken, accessTokenExpires)
      return null
    }

    async function unlinkAccount (userId, providerId, providerAccountId) {
      debug('unlinkAccount', userId, providerId, providerAccountId)
      return null
    }

    async function createSession (user) {
      debug('createSession', user)
      return null
    }

    async function getSession (sessionToken) {
      debug('getSession', sessionToken)
      return null
    }

    async function updateSession (session, force) {
      debug('updateSession', session)
      return null
    }

    async function deleteSession (sessionToken) {
      debug('deleteSession', sessionToken)
      return null
    }

    async function createVerificationRequest (identifier, url, token, secret, provider, options) {
      debug('createVerificationRequest', identifier)
      return null
    }

    async function getVerificationRequest (identifier, token, secret, provider) {
      debug('getVerificationRequest', identifier, token)
      return null
    }

    async function deleteVerificationRequest (identifier, token, secret, provider) {
      debug('deleteVerification', identifier, token)
      return null
    }

    return Promise.resolve({
      createUser,
      getUser,
      getUserByEmail,
      getUserByProviderAccountId,
      updateUser,
      deleteUser,
      linkAccount,
      unlinkAccount,
      createSession,
      getSession,
      updateSession,
      deleteSession,
      createVerificationRequest,
      getVerificationRequest,
      deleteVerificationRequest
    })
  }

  return {
    getAdapter
  }
}

export default {
  Adapter
}
