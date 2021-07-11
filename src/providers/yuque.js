export default function Yuque(options) {
  return {
    id: "yuque",
    name: "Yuque",
    type: "oauth",
    version: "2.0",
    scope: ["doc:read"],
    params: { grant_type: "authorization_code" },
    accessTokenUrl: "https://www.yuque.com/oauth2/token",
    requestTokenUrl: "https://www.yuque.com/oauth2/authorize",
    authorizationUrl: "https://www.yuque.com/oauth2/authorize?response_type=code",
    profileUrl: "https://www.yuque.com/api/v2/user",
    authHeaders({ accessToken }) {
      return {
        "X-Auth-Token": accessToken,
      };
    },
    profile(profile) {
      return {
        id: profile.data.id,
        name: profile.data.name,
        image: profile.data.avatar_url,
        // Yuque doesn't expose `email` in api
        email: profile.data.email,
      };
    },
    ...options,
  };
}
