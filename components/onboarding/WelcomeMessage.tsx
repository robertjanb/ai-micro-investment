export function WelcomeMessage() {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 mb-4">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        I&apos;m your investment research companion. Each day, I surface a small
        number of ideas worth investigating — with transparent reasoning and
        honest confidence scores. Below are today&apos;s ideas. Tap one to learn
        more, or ask me anything about investing.
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        All ideas and prices are simulated for educational purposes.
      </p>
    </div>
  )
}
