export default {
  signIn: {
    title: 'Sign In',
    submit: 'Sign in with %s',
    email: 'Email',
    dividerText: 'or',
    errors: {
      Signin: 'Try signing with a different account.',
      OAuthSignin: 'Try signing with a different account.',
      OAuthCallback: 'Try signing with a different account.',
      OAuthCreateAccount: 'Try signing with a different account.',
      EmailCreateAccount: 'Try signing with a different account.',
      Callback: 'Try signing with a different account.',
      OAuthAccountNotLinked:
        'To confirm your identity, sign in with the same account you used originally.',
      EmailSignin: 'Check your email address.',
      CredentialsSignin:
        'Sign in failed. Check the details you provided are correct.',
      default: 'Unable to sign in.'
    }
  },
  signOut: {
    title: 'Sign Out',
    heading: 'Are you sure you want to sign out?',
    submit: 'Sign out'
  },
  verifyRequest: {
    title: 'Verify Request',
    heading: 'Check your email',
    message: 'A sign in link has been sent to your email address.'
  },
  error: {
    title: 'Error',
    signIn: 'Sign in',
    default: {
      heading: 'Error'
    },
    configuration: {
      heading: 'Server error',
      message: 'There is a problem with the server configuration.',
      serverLogHint: 'Check the server logs for more information.'
    },
    accessdenied: {
      heading: 'Access Denied',
      message: 'You do not have permission to sign in.'
    },
    verification: {
      heading: 'Unable to sign in',
      message: 'The sign in link is no longer valid.',
      expirationHint: 'It may have been used already or it may have expired.'
    }
  },
  email: {
    subject: 'Sign in to %s',
    text: 'Sign in to %s',
    html: {
      signInAs: 'Sign in as <strong>%s</strong>',
      signIn: 'Sign In',
      didNotRequestHint:
        'If you did not request this email you can safely ignore it.'
    }
  }
}
