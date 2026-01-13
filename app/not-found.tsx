export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white py-16 px-6">
      <div className="max-w-3xl w-full text-center">
        <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 to-rose-500 text-white mx-auto mb-8 shadow-lg">
          <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M11 7a4 4 0 100 8 4 4 0 000-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4">Page not found</h1>
        <p className="text-slate-600 mb-8 max-w-2xl mx-auto">We can't find the page you're looking for. It may have been moved or deleted, or you may have typed the URL incorrectly.</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="/" className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition"> 
            Home
          </a>

          <a href="/support" className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition">Contact support</a>
        </div>

        <div className="mt-10">
          <form action="/search" method="get" className="max-w-xl mx-auto">
            <label htmlFor="q" className="sr-only">Search site</label>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
              <input id="q" name="q" type="search" placeholder="Search the site..." className="flex-1 px-4 py-2 text-slate-700 outline-none" />
              <button type="submit" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700">Search</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
