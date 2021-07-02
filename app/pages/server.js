import { getServerSession, getServerProviders } from 'next-auth'
import Layout from '../components/layout'
import nextAuthConfig from '../next-auth.config'

export default function Page({ providers }) {
  // As this page uses Server Side Rendering, the `session` will be already
  // populated on render without needing to go through a loading stage.
  // This is possible because of the shared context configured in `_app.js` that
  // is used by `useSession()`.

  return (
    <Layout>
      <h1>Server Side Rendering</h1>
      <p>
        This page uses the universal <strong>getServerSession()</strong> method
        in <strong>getServerSideProps()</strong>.
      </p>
      <p>
        Using <strong>getServerSession()</strong> in{' '}
        <strong>getServerSideProps()</strong> is the recommended approach if you
        need to support Server Side Rendering with authentication.
      </p>
      <p>
        The advantage of Server Side Rendering is this page does not require
        client side JavaScript.
      </p>
      <p>
        The disadvantage of Server Side Rendering is that this page is slower to
        render.
      </p>

      <h2>Available providers</h2>
      <ul>
        {Object.values(providers).map((provider) => (
          <li key={provider.id}>{provider.name}</li>
        ))}
      </ul>
    </Layout>
  )
}

// Export the `session` prop to use sessions with Server Side Rendering
export async function getServerSideProps(context) {
  return {
    props: {
      session: await getServerSession(context, nextAuthConfig),
      providers: await getServerProviders(context, nextAuthConfig),
    },
  }
}
