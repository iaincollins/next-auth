/**
 * Same as the default `Error`, but it is JSON serializable.
 * @source https://iaincollins.medium.com/error-handling-in-javascript-a6172ccdf9af
 */
export class UnknownError extends Error {
  constructor(error) {
    // Support passing error or string
    super(error?.message ?? error)
    this.name = "UnknownError"
    if (error instanceof Error) {
      this.stack = error.stack
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
    }
  }
}

export class OAuthCallbackError extends UnknownError {
  name = "OAuthCallbackError"
}

/**
 * Thrown when an Email address is already associated with an account
 * but the user is trying an OAuth account that is not linked to it.
 */
export class AccountNotLinkedError extends UnknownError {
  name = "AccountNotLinkedError"
}

export function upperSnake(s) {
  return s.replace(/([A-Z])/g, "_$1").toUpperCase()
}

export function capitalize(s) {
  return `${s[0].toUpperCase()}${s.slice(1)}`
}

/**
 * Wraps an object of methods and adds error handling.
 * @param {import("types").EventCallbacks} methods
 * @param {import("types").LoggerInstance} logger
 * @return {import("types").EventCallbacks}
 */
export function eventsErrorHandler(methods, logger) {
  return Object.entries(methods).reduce((acc, [name, method]) => {
    acc[name] = async (...args) => {
      try {
        return await method(...args)
      } catch (e) {
        logger.error(`${upperSnake(name)}_EVENT_ERROR`, e)
      }
    }
    return acc
  }, {})
}

/**
 * Handles adapter induced errors.
 * @param {import("types/adapters").Adapter} [adapter]
 * @param {import("types").LoggerInstance} logger
 * @return {import("types/adapters").Adapter}
 */
export function adapterErrorHandler(adapter, logger) {
  if (!adapter) return

  return Object.keys(adapter).reduce((acc, method) => {
    const name = capitalize(method)
    const code = `${adapter.displayName ?? "ADAPTER"}_${upperSnake(name)}`

    const adapterMethod = adapter[method]
    acc[method] = async (...args) => {
      try {
        logger.debug(code, ...args)
        return await adapterMethod(...args)
      } catch (error) {
        logger.error(`${code}_ERROR`, error)
        const e = new UnknownError(error)
        e.name = `${name}Error`
        throw e
      }
    }
    return acc
  }, {})
}
