import Header from 'components/header'
import Footer from 'components/footer'
import { useRouter } from 'next/router'

export default function Layout ({ children }) {
  const { locale, locales } = useRouter()

  return (
    <>
      <Header />
      <main>
        <p>Current locale: {locale || 'N/A'}</p>
        <p>Available locales: {locales?.join(', ') ?? 'N/A'}</p>
        {children}
      </main>
      <Footer />
    </>
  )
}
