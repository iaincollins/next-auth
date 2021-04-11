export default class URLExtended extends URL {
  /**
     *
     * @param {string} path Relative path
     * @param {*} params Query params that are to be included in the URL. Excludes falsey values
     * @param (string) base Base URL
     */
  constructor (path, params = {}, base = 'http://n') {
    super(path, base)

    for (const key in params) {
      // ignore falsey values from search params
      if (!params[key]) {
        delete params[key]
      } else {
        this.searchParams.append(key, params[key])
      }
    }
  }

  /**
     * Returns a relative representation of the URL.
     */
  toStringRelative () {
    return `/${this.path}${this.search}`
  }
}
