import Navbar from './components/Navbar'
import Footer from './components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            Welcome to Dera
          </h1>
          <p className="text-text-secondary text-lg">
            Your Web3 application dashboard
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}