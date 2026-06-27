import SongForm from '@/components/songs/SongForm'

export default function NewSongPage() {
  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-4">
        <div className="max-w-xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add song</h1>
        </div>
      </header>
      <SongForm />
    </div>
  )
}
